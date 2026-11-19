import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

vi.mock('../src/services/inventoryService.js', () => ({
  deductOrderInventory: vi.fn().mockResolvedValue(true),
  restoreOrderInventory: vi.fn().mockResolvedValue(true)
}));

import app from '../src/app.js';
import config from '../src/config/env.js';
import EmailOutbox from '../src/models/EmailOutbox.js';
import { claimJob, processJob, emailWorker } from '../src/services/email/emailWorker.js';
import { BrevoEmailAdapter } from '../src/services/email/adapters/brevoAdapter.js';
import mockAdapter from '../src/services/email/adapters/mockAdapter.js';
import * as emailOutboxService from '../src/services/email/emailOutboxService.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import Cart from '../src/models/Cart.js';
import Product from '../src/models/Product.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 9 Stage 3.5: Transactional Email Reliability & Outage Resilience Suite', () => {
  const sampleOrderId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const sampleProductId = new mongoose.Types.ObjectId();
  const customerToken = generateToken({ id: customerId, email: 'tara@domain.com', role: 'customer' });

  const csrfHeaders = {
    Origin: 'http://localhost:5173',
    'X-Requested-With': 'XMLHttpRequest'
  };

  const mockCustomer = {
    _id: customerId,
    name: 'Tara Patel',
    email: 'tara@domain.com',
    role: 'customer',
    isActive: true,
    savedAddresses: [
      {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Tara Patel',
        phone: '9876543210',
        streetAddress: '15 Marine Drive',
        apartment: 'Penthouse 10',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
        country: 'India'
      }
    ]
  };

  const createQueryMock = (val) => ({
    ...val,
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(val),
    then: (resolve, reject) => Promise.resolve(val).then(resolve, reject)
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAdapter.clearSentEmails();
    mockAdapter.setSimulateFailure(false);
    mockAdapter.setSimulateTimeout(false);

    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === customerId.toString()) {
        return createQueryMock({
          ...mockCustomer,
          savedAddresses: {
            id: () => mockCustomer.savedAddresses[0]
          }
        });
      }
      return createQueryMock(null);
    });

    vi.spyOn(Order.prototype, 'save').mockResolvedValue(true);
    vi.spyOn(EmailOutbox.prototype, 'save').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Temporary Provider Failures (HTTP 429, 500, 503, Network Errors, Timeouts)
  // ============================================================================
  describe('1. Temporary Provider Failures & Retry Scheduling', () => {
    const createSampleJob = (attempts = 1) => ({
      _id: 'job_temp_failure_1',
      eventKey: 'order_confirmed_cod:ORD-TEMP-1',
      eventType: 'order_confirmed_cod',
      recipient: 'tara@domain.com',
      templateData: {
        customerName: 'Tara Patel',
        orderNumber: 'ORD-TEMP-1',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        items: [{ title: 'Silk Blouse', size: 'M', color: 'Ivory', quantity: 1, price: 4500, lineTotal: 4500 }],
        shippingAddress: { fullName: 'Tara', streetAddress: 'Marine Drive', city: 'Mumbai', state: 'MH', postalCode: '400020', country: 'India' },
        subtotal: 4500,
        total: 4500
      },
      attempts,
      maxAttempts: 5
    });

    it('A1: HTTP 429 Rate Limiting should schedule exponential retry without crashing worker', async () => {
      const adapter = new BrevoEmailAdapter('mock_brevo_key_for_testing');
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit exceeded: Please back off' })
      });

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createSampleJob(1);
      const result = await processJob(job, adapter);

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(false);

      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: 'job_temp_failure_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            processingLeaseExpiresAt: null,
            nextAttemptAt: expect.any(Date),
            lastError: expect.objectContaining({
              statusCode: 429,
              message: expect.stringContaining('Rate limit exceeded')
            })
          })
        })
      );
    });

    it('A2: HTTP 500 Internal Server Error should schedule exponential retry', async () => {
      const adapter = new BrevoEmailAdapter('mock_brevo_key_for_testing');
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error in dispatch gateway' })
      });

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createSampleJob(2);
      const result = await processJob(job, adapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(false);

      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: 'job_temp_failure_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            processingLeaseExpiresAt: null,
            nextAttemptAt: expect.any(Date),
            lastError: expect.objectContaining({
              statusCode: 500
            })
          })
        })
      );
    });

    it('A3: HTTP 503 Service Unavailable should be marked retryable', async () => {
      const adapter = new BrevoEmailAdapter('mock_brevo_key_for_testing');
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: 'Service Temporarily Unavailable for Maintenance' })
      });

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createSampleJob(1);
      const result = await processJob(job, adapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(false);
      expect(updateOneSpy.mock.calls[0][1].$set.status).toBe('failed');
      expect(updateOneSpy.mock.calls[0][1].$set.nextAttemptAt).toBeDefined();
    });

    it('A4: Network error (ECONNRESET/fetch failure) should be caught and scheduled for retry', async () => {
      const adapter = new BrevoEmailAdapter('mock_brevo_key_for_testing');
      const networkError = new TypeError('fetch failed');
      networkError.cause = { code: 'ECONNRESET', message: 'connection reset by peer' };
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(networkError);

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createSampleJob(1);
      const result = await processJob(job, adapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(false);
      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: 'job_temp_failure_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            nextAttemptAt: expect.any(Date)
          })
        })
      );
    });

    it('A5: Request timeout and AbortController abort should be safely handled as retryable', async () => {
      const adapter = new BrevoEmailAdapter('mock_brevo_key_for_testing', 50); // 50ms short timeout
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(abortError);

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createSampleJob(1);
      const result = await processJob(job, adapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(false);
      expect(result.error).toContain('timed out');
      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: 'job_temp_failure_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            nextAttemptAt: expect.any(Date)
          })
        })
      );
    });
  });

  // ============================================================================
  // 2. Permanent Provider Failures (HTTP 400, 401, Invalid Configuration)
  // ============================================================================
  describe('2. Permanent Provider Failures & Non-Retry Capping', () => {
    const createPermanentJob = () => ({
      _id: 'job_perm_fail_1',
      eventKey: 'order_confirmed_cod:ORD-PERM-1',
      eventType: 'order_confirmed_cod',
      recipient: 'bad_address@domain.com',
      templateData: {
        customerName: 'Client',
        orderNumber: 'ORD-PERM-1',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        items: [{ title: 'Scarf', size: 'One Size', color: 'Gold', quantity: 1, price: 1000, lineTotal: 1000 }],
        shippingAddress: { fullName: 'Client', streetAddress: 'Street', city: 'City', state: 'ST', postalCode: '400001', country: 'India' },
        subtotal: 1000,
        total: 1000
      },
      attempts: 1,
      maxAttempts: 5
    });

    it('B1: HTTP 400 Bad Request should transition to permanently failed and cap attempts at maxAttempts', async () => {
      const adapter = new BrevoEmailAdapter('mock_brevo_key_for_testing');
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid recipient domain: Rejected by policy' })
      });

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createPermanentJob();
      const result = await processJob(job, adapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(true);

      const updateFields = updateOneSpy.mock.calls[0][1].$set;
      expect(updateFields.status).toBe('failed');
      expect(updateFields.attempts).toBe(5); // Capped to maxAttempts to prevent retry
      expect(updateFields.nextAttemptAt).toBeUndefined(); // No retry scheduled
    });

    it('B2: HTTP 401 Unauthorized should be treated as permanent configuration failure', async () => {
      const adapter = new BrevoEmailAdapter('mock_brevo_key_for_testing');
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid or inactive Brevo API key' })
      });

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createPermanentJob();
      const result = await processJob(job, adapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(true);
      expect(updateOneSpy.mock.calls[0][1].$set.status).toBe('failed');
      expect(updateOneSpy.mock.calls[0][1].$set.attempts).toBe(5);
    });

    it('B3: Missing or placeholder API key should throw non-retryable error and fail permanently', async () => {
      const adapter = new BrevoEmailAdapter(''); // Missing API key

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const job = createPermanentJob();
      const result = await processJob(job, adapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(true);
      expect(updateOneSpy.mock.calls[0][1].$set.status).toBe('failed');
      expect(updateOneSpy.mock.calls[0][1].$set.attempts).toBe(5);
    });
  });

  // ============================================================================
  // 3. Exponential Backoff Policy & Mathematical Boundary Verification
  // ============================================================================
  describe('3. Exponential Backoff Mathematical Verification', () => {
    it('C1: should calculate exponential delays matching baseDelayMs * 2^attempts', async () => {
      const baseDelay = config.EMAIL_RETRY_DELAY_MS || 1000;
      const adapter = mockAdapter;
      mockAdapter.setSimulateFailure(true);

      const testCases = [
        { currentAttempt: 1, expectedDelayMs: baseDelay * 2 },   // 1000 * 2^1 = 2000
        { currentAttempt: 2, expectedDelayMs: baseDelay * 4 },   // 1000 * 2^2 = 4000
        { currentAttempt: 3, expectedDelayMs: baseDelay * 8 },   // 1000 * 2^3 = 8000
        { currentAttempt: 4, expectedDelayMs: baseDelay * 16 },  // 1000 * 2^4 = 16000
      ];

      for (const tc of testCases) {
        const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

        const beforeTime = Date.now();
        const job = {
          _id: `job_backoff_${tc.currentAttempt}`,
          eventKey: `test:backoff_${tc.currentAttempt}`,
          eventType: 'welcome_customer',
          recipient: 'test@shopsphere.in',
          templateData: { customerName: 'Client', exploreUrl: 'https://shopsphere.in' },
          attempts: tc.currentAttempt,
          maxAttempts: 5
        };

        await processJob(job, adapter);

        const scheduledDate = updateOneSpy.mock.calls[0][1].$set.nextAttemptAt;
        expect(scheduledDate).toBeInstanceOf(Date);
        const actualDelay = scheduledDate.getTime() - beforeTime;

        // Verify delay is within a tight tolerance (+/- 150ms of expected)
        expect(actualDelay).toBeGreaterThanOrEqual(tc.expectedDelayMs - 150);
        expect(actualDelay).toBeLessThanOrEqual(tc.expectedDelayMs + 150);
      }
    });

    it('C2: should cap exponential backoff exponent at 6 for attempt counts >= 6', async () => {
      const baseDelay = config.EMAIL_RETRY_DELAY_MS || 1000;
      const expectedCapDelayMs = baseDelay * Math.pow(2, 6); // 1000 * 64 = 64000 ms

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const beforeTime = Date.now();
      const job = {
        _id: 'job_backoff_boundary_7',
        eventKey: 'test:boundary_7',
        eventType: 'welcome_customer',
        recipient: 'test@shopsphere.in',
        templateData: { customerName: 'Client', exploreUrl: 'https://shopsphere.in' },
        attempts: 7, // Exceeds exponent cap of 6
        maxAttempts: 10
      };

      mockAdapter.setSimulateFailure(true);
      await processJob(job, mockAdapter);

      const scheduledDate = updateOneSpy.mock.calls[0][1].$set.nextAttemptAt;
      const actualDelay = scheduledDate.getTime() - beforeTime;

      expect(actualDelay).toBeGreaterThanOrEqual(expectedCapDelayMs - 150);
      expect(actualDelay).toBeLessThanOrEqual(expectedCapDelayMs + 150);
    });
  });

  // ============================================================================
  // 4. Worker Crash, Processing Lease & Atomic Re-Claiming
  // ============================================================================
  describe('4. Worker Crash, Processing Lease & Atomic Reclamation', () => {
    it('D1: Unexpired processing lease must prevent another worker from claiming the job', async () => {
      // If a job is currently claimed and lease is valid for 4 more minutes
      vi.spyOn(EmailOutbox, 'findOneAndUpdate').mockImplementationOnce((query) => {
        // Evaluate query against simulated active job
        const simulatedActiveJob = {
          status: 'processing',
          processingLeaseExpiresAt: new Date(Date.now() + 240000), // In future!
          attempts: 1
        };

        // Query check: status === 'processing' requires processingLeaseExpiresAt <= now
        const now = new Date();
        const caseMatches = query.$or.some(branch => {
          if (branch.status === 'processing' && branch.processingLeaseExpiresAt?.$lte) {
            return simulatedActiveJob.processingLeaseExpiresAt <= now;
          }
          return false;
        });

        return Promise.resolve(caseMatches ? simulatedActiveJob : null);
      });

      const claimed = await claimJob(300000);
      expect(claimed).toBeNull(); // Cannot be claimed!
    });

    it('D2: Expired processing lease must allow next worker to reclaim abandoned job', async () => {
      const expiredTimestamp = new Date(Date.now() - 5000); // Expired 5 seconds ago
      const reclaimedJob = {
        _id: 'job_abandoned_after_crash',
        eventKey: 'welcome:crashed_client',
        status: 'processing',
        processingLeaseExpiresAt: new Date(Date.now() + 300000), // New lease granted
        attempts: 2
      };

      vi.spyOn(EmailOutbox, 'findOneAndUpdate').mockImplementationOnce((query) => {
        // Query check: expired lease satisfies processing branch
        const matches = query.$or.some(branch => branch.status === 'processing');
        expect(matches).toBe(true);
        return Promise.resolve(reclaimedJob);
      });

      const claimed = await claimJob(300000);
      expect(claimed).toBeDefined();
      expect(claimed._id).toBe('job_abandoned_after_crash');
      expect(claimed.attempts).toBe(2);
    });

    it('D3: Two concurrent workers executing atomic claim cannot claim the same document', async () => {
      let claimCount = 0;

      // Mock findOneAndUpdate to simulate atomic single-winner document locking
      vi.spyOn(EmailOutbox, 'findOneAndUpdate').mockImplementation(async () => {
        if (claimCount === 0) {
          claimCount++;
          return {
            _id: 'job_single_winner',
            status: 'processing',
            attempts: 1,
            processingLeaseExpiresAt: new Date(Date.now() + 300000)
          };
        }
        // Second concurrent worker finds no available document
        return null;
      });

      const [worker1Claim, worker2Claim] = await Promise.all([
        claimJob(300000),
        claimJob(300000)
      ]);

      const winners = [worker1Claim, worker2Claim].filter(Boolean);
      expect(winners).toHaveLength(1);
      expect(winners[0]._id).toBe('job_single_winner');
    });
  });

  // ============================================================================
  // 5. Maximum Retry Exhaustion & Permanent Dead-Lettering
  // ============================================================================
  describe('5. Maximum Retry Exhaustion (5 Attempts Cap)', () => {
    it('E1: When job reaches maxAttempts (5), it transitions to permanently failed and ceases retrying', async () => {
      const exhaustedJob = {
        _id: 'job_exhausted_5',
        eventKey: 'order_confirmed_paid:ORD-EXHAUST-5',
        eventType: 'order_confirmed_paid',
        recipient: 'exhausted@domain.com',
        templateData: {
          customerName: 'Client',
          orderNumber: 'ORD-EXHAUST-5',
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          items: [{ title: 'Coat', size: 'L', color: 'Camel', quantity: 1, price: 18000, lineTotal: 18000 }],
          shippingAddress: { fullName: 'Client', streetAddress: 'Bld', city: 'City', state: 'ST', postalCode: '400001', country: 'India' },
          subtotal: 18000,
          total: 18000
        },
        attempts: 5, // Reached 5!
        maxAttempts: 5
      };

      mockAdapter.setSimulateFailure(true);
      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const result = await processJob(exhaustedJob, mockAdapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(true);

      const updateCall = updateOneSpy.mock.calls[0][1].$set;
      expect(updateCall.status).toBe('failed');
      expect(updateCall.nextAttemptAt).toBeUndefined(); // No further retry scheduled
    });

    it('E2: claimJob query strictly filters out exhausted jobs with attempts >= 5', async () => {
      const findSpy = vi.spyOn(EmailOutbox, 'findOneAndUpdate').mockImplementationOnce((query) => {
        expect(query.attempts).toEqual({ $lt: 5 });
        return Promise.resolve(null);
      });

      await claimJob(300000);
      expect(findSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 6. Provider Acceptance & At-Least-Once Delivery Ambiguity
  // ============================================================================
  describe('6. At-Least-Once Delivery & Provider Ambiguity', () => {
    it('F1: Acknowledges at-least-once delivery if database write fails after provider acceptance', async () => {
      const realJobId = new mongoose.Types.ObjectId();
      const job = {
        _id: realJobId,
        eventKey: 'welcome:ambiguous',
        eventType: 'welcome_customer',
        recipient: 'client@domain.com',
        templateData: { customerName: 'Client', exploreUrl: 'https://shopsphere.in' },
        attempts: 1,
        maxAttempts: 5
      };

      // Adapter successfully sends the email!
      const sendSpy = vi.spyOn(mockAdapter, 'send').mockResolvedValueOnce({
        success: true,
        messageId: 'provider_msg_accepted_123'
      });

      // But the database update crashes due to transient database disconnection!
      vi.spyOn(EmailOutbox, 'updateOne')
        .mockRejectedValueOnce(new Error('MongoDB cluster connection lost while saving sent status'))
        .mockResolvedValueOnce({ acknowledged: true });

      const res = await processJob(job, mockAdapter);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(res.success).toBe(false);
      expect(res.error).toContain('MongoDB cluster connection lost');
    });
  });

  // ============================================================================
  // 7. Non-Blocking Business Operations Under Simulated Mailer Outages
  // ============================================================================
  describe('7. Non-Blocking Customer Business Operations Under Email Failure', () => {
    it('G1: Customer registration succeeds (HTTP 201) even if outbox queueing throws an error', async () => {
      vi.spyOn(emailOutboxService, 'queueEmail').mockRejectedValueOnce(
        new Error('Simulated outbox database connection timeout')
      );

      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      vi.spyOn(User, 'create').mockResolvedValue({
        _id: customerId,
        name: 'New User',
        email: 'newuser@domain.com',
        role: 'customer',
        isActive: true
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@domain.com',
          password: 'Password123!'
        });

      // Business registration must succeed despite outbox failure
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser@domain.com');
    });

    it('G2: Cash on Delivery checkout succeeds (HTTP 201) even if outbox queueing fails', async () => {
      vi.spyOn(emailOutboxService, 'queueEmail').mockRejectedValueOnce(
        new Error('Simulated outbox insert deadlock')
      );

      vi.spyOn(Cart, 'findOne').mockResolvedValue({
        userId: customerId,
        items: [{ productId: sampleProductId, variantSku: 'CT-CAM-M', quantity: 1 }]
      });

      vi.spyOn(Product, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: sampleProductId,
            name: 'Cashmere Trench',
            slug: 'cashmere-trench',
            isActive: true,
            images: [{ url: 'https://example.com/coat.jpg' }],
            variants: [
              {
                sku: 'CT-CAM-M',
                size: 'M',
                color: { name: 'Camel', hexCode: '#C19A6B' },
                price: 18500,
                stockQuantity: 10,
                isActive: true
              }
            ]
          }
        ])
      });

      vi.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          addressId: mockCustomer.savedAddresses[0]._id.toString(),
          paymentMethod: 'cod'
        });

      // Order checkout MUST complete successfully
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderNumber).toMatch(/^SPH-/);
    });

    it('G3: Razorpay payment verification succeeds (HTTP 200) even if outbox queueing fails', async () => {
      vi.spyOn(emailOutboxService, 'queueEmail').mockRejectedValueOnce(
        new Error('Simulated outbox write concern timeout')
      );

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-VERIFY-001',
        userId: customerId,
        orderStatus: 'pending_payment',
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        total: 10000,
        subtotal: 10000,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        items: [{ name: 'Silk Robe', variantSku: 'SR-BLK-S', size: 'S', quantity: 1, unitPrice: 10000, lineTotal: 10000 }],
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockImplementation((query) => {
        if (query?.razorpayOrderId) {
          return Promise.resolve({
            orderId: sampleOrderId,
            razorpayOrderId: 'order_rzp_nb_01'
          });
        }
        return Promise.resolve(null);
      });
      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });
      vi.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update('order_rzp_nb_01|pay_nb_01')
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: 'order_rzp_nb_01',
          razorpayPaymentId: 'pay_nb_01',
          razorpaySignature: expectedSignature
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.paymentStatus).toBe('paid');
      expect(mockOrder.orderStatus).toBe('confirmed');
    });

    it('G4: Password reset request returns generic 200 even if outbox queueing fails', async () => {
      vi.spyOn(emailOutboxService, 'queueEmail').mockRejectedValueOnce(
        new Error('Outbox write failure')
      );

      const mockTargetUser = {
        _id: customerId,
        email: 'tara@domain.com',
        isActive: true,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findOne').mockResolvedValue(mockTargetUser);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'tara@domain.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists');
    });

    it('G5: If business database persistence fails, request fails and NO email is queued', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      vi.spyOn(Cart, 'findOne').mockResolvedValue({
        userId: customerId,
        items: [{ productId: sampleProductId, variantSku: 'CT-CAM-M', quantity: 1 }]
      });

      vi.spyOn(Product, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: sampleProductId,
            name: 'Cashmere Trench',
            slug: 'cashmere-trench',
            isActive: true,
            variants: [{ sku: 'CT-CAM-M', size: 'M', color: { name: 'Camel' }, price: 18500, stockQuantity: 10, isActive: true }]
          }
        ])
      });

      // Simulate database write failure on business record (Order.save)
      vi.spyOn(Order.prototype, 'save').mockRejectedValueOnce(
        new Error('Database cluster primary replica failure')
      );

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          addressId: mockCustomer.savedAddresses[0]._id.toString(),
          paymentMethod: 'cod'
        });

      // Must fail with 500 error
      expect(res.status).toBe(500);
      // Zero emails must be queued because business transaction never persisted!
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });
  });
});

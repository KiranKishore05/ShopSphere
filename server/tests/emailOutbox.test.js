import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import EmailOutbox, { EMAIL_EVENT_TYPES } from '../src/models/EmailOutbox.js';
import {
  validateTemplateData,
  assertNoSensitiveKeys,
  welcomeTemplateDataSchema,
  orderConfirmedCodTemplateDataSchema,
  orderConfirmedPaidTemplateDataSchema,
  passwordResetTemplateDataSchema,
  paymentFailedTemplateDataSchema
} from '../src/validators/emailValidators.js';
import { queueEmail } from '../src/services/email/emailOutboxService.js';
import {
  claimJob,
  processJob,
  resolveAdapter,
  startEmailWorker,
  stopEmailWorker,
  emailWorker
} from '../src/services/email/emailWorker.js';
import mockAdapter from '../src/services/email/adapters/mockAdapter.js';
import brevoAdapter, { BrevoEmailAdapter } from '../src/services/email/adapters/brevoAdapter.js';
import { encryptToken, decryptToken, deriveEncryptionKey } from '../src/utils/emailTokenCrypto.js';
import renderEmailTemplate from '../src/services/email/templates/index.js';
import { escapeHtml } from '../src/services/email/templates/baseLayout.js';
import { validateEnv } from '../src/config/env.js';

describe('Phase 9 Stage 3.2: Transactional Email Infrastructure Suite', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAdapter.clearSentEmails();
    mockAdapter.setSimulateFailure(false);
    mockAdapter.setSimulateTimeout(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Mongoose Model Validation & Sanitization
  // ============================================================================
  describe('1. EmailOutbox Mongoose Model Constraints', () => {
    it('should validate a properly structured outbox document successfully', async () => {
      const doc = new EmailOutbox({
        eventKey: 'welcome:user_123',
        eventType: 'welcome_customer',
        recipient: 'Customer@Domain.COM',
        templateData: {
          customerName: 'Aditi Sharma',
          exploreUrl: 'https://shopsphere.in/shop'
        }
      });

      const err = doc.validateSync();
      expect(err).toBeUndefined();
      expect(doc.recipient).toBe('customer@domain.com'); // normalized
      expect(doc.status).toBe('pending');
      expect(doc.attempts).toBe(0);
      expect(doc.maxAttempts).toBe(5);
      expect(doc.nextAttemptAt).toBeDefined();
    });

    it('should reject invalid or unsupported event types', () => {
      const doc = new EmailOutbox({
        eventKey: 'invalid:key_1',
        eventType: 'unsupported_promotional_blast',
        recipient: 'test@shopsphere.in',
        templateData: { foo: 'bar' }
      });

      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.eventType).toBeDefined();
    });

    it('should reject malformed recipient email addresses', () => {
      const doc = new EmailOutbox({
        eventKey: 'welcome:user_bad_email',
        eventType: 'welcome_customer',
        recipient: 'invalid-email-address',
        templateData: { customerName: 'Test', exploreUrl: 'https://shopsphere.in' }
      });

      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.recipient).toBeDefined();
    });

    it('should require eventKey and templateData', () => {
      const doc = new EmailOutbox({
        eventType: 'welcome_customer',
        recipient: 'test@shopsphere.in'
      });

      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.eventKey).toBeDefined();
      expect(err.errors.templateData).toBeDefined();
    });
  });

  // ============================================================================
  // 2. Strict Zod Template Data Schemas & Security Validation
  // ============================================================================
  describe('2. Strict Email Event Validation (emailValidators.js)', () => {
    it('should validate valid template data for all registered event types', () => {
      const validWelcome = {
        customerName: 'Karan Mehta',
        exploreUrl: 'https://shopsphere.in/shop'
      };
      expect(() => validateTemplateData('welcome_customer', validWelcome)).not.toThrow();

      const validOrderCod = {
        customerName: 'Karan Mehta',
        orderNumber: 'ORD-1001',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        items: [
          { title: 'Linen Shirt', size: 'M', color: 'White', quantity: 1, price: 2499, lineTotal: 2499 }
        ],
        shippingAddress: {
          fullName: 'Karan Mehta',
          streetAddress: '10 Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
          country: 'India'
        },
        subtotal: 2499,
        discount: 0,
        shippingFee: 0,
        tax: 299,
        total: 2798
      };
      expect(() => validateTemplateData('order_confirmed_cod', validOrderCod)).not.toThrow();
    });

    it('should strictly reject unknown properties via .strict()', () => {
      const dataWithUnknownField = {
        customerName: 'Riya Sen',
        exploreUrl: 'https://shopsphere.in/shop',
        extraSneakyField: 'unauthorized_payload'
      };

      expect(() => validateTemplateData('welcome_customer', dataWithUnknownField)).toThrow();
    });

    it('should explicitly throw security violation if sensitive credentials are in payload', () => {
      const forbiddenPayloads = [
        { customerName: 'Alice', exploreUrl: 'https://shopsphere.in', password: 'plain_password' },
        { customerName: 'Alice', exploreUrl: 'https://shopsphere.in', passwordHash: 'bcrypt_hash_xyz' },
        { customerName: 'Alice', exploreUrl: 'https://shopsphere.in', rawToken: 'secret_reset_token' },
        { customerName: 'Alice', exploreUrl: 'https://shopsphere.in', razorpaySignature: 'hmac_signature_xyz' },
        { customerName: 'Alice', exploreUrl: 'https://shopsphere.in', cardDetails: { cardNumber: '411111111111' } }
      ];

      for (const payload of forbiddenPayloads) {
        expect(() => validateTemplateData('welcome_customer', payload)).toThrow(/Security violation/);
      }
    });

    it('should reject payment failed event with non-URL retry link', () => {
      const invalidData = {
        customerName: 'Vikram',
        orderNumber: 'ORD-999',
        razorpayOrderId: 'order_rzp_123',
        failureReason: 'Insufficient funds',
        retryPaymentUrl: 'not-a-valid-url'
      };

      expect(() => validateTemplateData('payment_failed', invalidData)).toThrow();
    });
  });

  // ============================================================================
  // 3. Email Outbox Service & Deduplication
  // ============================================================================
  describe('3. Email Outbox Service (emailOutboxService.js)', () => {
    it('should queue a valid email and return queued status', async () => {
      const mockSavedDoc = {
        _id: 'outbox_doc_123',
        eventKey: 'welcome:user_999',
        status: 'pending'
      };

      vi.spyOn(EmailOutbox.prototype, 'save').mockResolvedValueOnce(mockSavedDoc);

      const result = await queueEmail({
        eventKey: 'welcome:user_999',
        eventType: 'welcome_customer',
        recipient: 'VIP@ShopSphere.in',
        templateData: {
          customerName: 'Vikram Seth',
          exploreUrl: 'https://shopsphere.in/shop'
        }
      });

      expect(result.queued).toBe(true);
      expect(result.eventKey).toBe('welcome:user_999');
      expect(result.outboxId).toBe('outbox_doc_123');
    });

    it('should handle duplicate key error (11000) idempotently as a duplicate event', async () => {
      const duplicateError = new Error('E11000 duplicate key error collection: emailoutboxes index: eventKey_1');
      duplicateError.code = 11000;

      vi.spyOn(EmailOutbox.prototype, 'save').mockRejectedValueOnce(duplicateError);

      const result = await queueEmail({
        eventKey: 'order_confirmed_paid:ORD-8888',
        eventType: 'order_confirmed_paid',
        recipient: 'customer@shopsphere.in',
        templateData: {
          customerName: 'Customer',
          orderNumber: 'ORD-8888',
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          items: [{ title: 'Coat', size: 'L', color: 'Black', quantity: 1, price: 9999, lineTotal: 9999 }],
          shippingAddress: { fullName: 'A', streetAddress: 'B', city: 'C', state: 'D', postalCode: '400001', country: 'India' },
          subtotal: 9999,
          total: 9999
        }
      });

      expect(result.queued).toBe(false);
      expect(result.duplicate).toBe(true);
      expect(result.eventKey).toBe('order_confirmed_paid:ORD-8888');
    });

    it('should re-throw genuine database connection errors without swallowing', async () => {
      const dbErr = new Error('MongoServerSelectionError: connection timeout');
      vi.spyOn(EmailOutbox.prototype, 'save').mockRejectedValueOnce(dbErr);

      await expect(queueEmail({
        eventKey: 'welcome:test',
        eventType: 'welcome_customer',
        recipient: 'test@shopsphere.in',
        templateData: { customerName: 'A', exploreUrl: 'https://shopsphere.in' }
      })).rejects.toThrow('MongoServerSelectionError');
    });
  });

  // ============================================================================
  // 4. Token Encryption Safeguard (emailTokenCrypto.js)
  // ============================================================================
  describe('4. Token Encryption Safeguard (emailTokenCrypto.js)', () => {
    const validSecret = 'super_secure_32_byte_token_secret_for_shopsphere_auth';

    it('should successfully encrypt and decrypt a sensitive token with AES-256-GCM', () => {
      const plainToken = 'raw_crypto_random_reset_token_hex_1234567890abcdef';

      const encrypted = encryptToken(plainToken, validSecret);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(encrypted.authTag).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(encrypted.ciphertext).not.toContain(plainToken);

      const decrypted = decryptToken(encrypted, validSecret);
      expect(decrypted).toBe(plainToken);
    });

    it('should fail decryption when authentication tag or ciphertext is tampered with', () => {
      const plainToken = 'another_secret_token';
      const encrypted = encryptToken(plainToken, validSecret);

      // Tamper with ciphertext deterministically: always alter the final two characters
      const tamperedCiphertext = encrypted.ciphertext.endsWith('ff')
        ? encrypted.ciphertext.slice(0, -2) + '00'
        : encrypted.ciphertext.slice(0, -2) + 'ff';

      expect(() => {
        decryptToken({ ...encrypted, ciphertext: tamperedCiphertext }, validSecret);
      }).toThrow();

      // Tamper with auth tag deterministically: always alter the final two characters
      const tamperedTag = encrypted.authTag.endsWith('00')
        ? encrypted.authTag.slice(0, -2) + 'ff'
        : encrypted.authTag.slice(0, -2) + '00';

      expect(() => {
        decryptToken({ ...encrypted, authTag: tamperedTag }, validSecret);
      }).toThrow();
    });

    it('should fail encryption if secret has insufficient entropy / length (< 32 chars)', () => {
      expect(() => deriveEncryptionKey('short_secret')).toThrow(/at least 32 characters/);
    });
  });

  // ============================================================================
  // 5. Worker Atomic Claiming & Crash Recovery
  // ============================================================================
  describe('5. Worker Atomic Claiming & Crash Recovery (emailWorker.js)', () => {
    it('should atomically claim a pending job and assign a 5-minute lease', async () => {
      const mockClaimedJob = {
        _id: 'job_pending_1',
        eventKey: 'welcome:1',
        status: 'processing',
        attempts: 1,
        processingLeaseExpiresAt: new Date(Date.now() + 300000)
      };

      const findOneAndUpdateSpy = vi.spyOn(EmailOutbox, 'findOneAndUpdate').mockResolvedValueOnce(mockClaimedJob);

      const job = await claimJob(300000);

      expect(job).toBeDefined();
      expect(job._id).toBe('job_pending_1');
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: { $lt: 5 },
          $or: expect.arrayContaining([
            expect.objectContaining({ status: 'pending' }),
            expect.objectContaining({ status: 'failed' }),
            expect.objectContaining({ status: 'processing' })
          ])
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'processing' }),
          $inc: { attempts: 1 }
        }),
        expect.anything()
      );
    });

    it('should recover stale in-flight jobs whose processing lease expired after worker crash', async () => {
      const expiredJob = {
        _id: 'job_crashed_worker',
        status: 'processing',
        attempts: 2,
        processingLeaseExpiresAt: new Date(Date.now() - 1000) // Expired in past
      };

      vi.spyOn(EmailOutbox, 'findOneAndUpdate').mockResolvedValueOnce({
        ...expiredJob,
        attempts: 3,
        processingLeaseExpiresAt: new Date(Date.now() + 300000)
      });

      const recoveredJob = await claimJob(300000);
      expect(recoveredJob).toBeDefined();
      expect(recoveredJob._id).toBe('job_crashed_worker');
      expect(recoveredJob.attempts).toBe(3);
    });

    it('should successfully execute a job, call adapter, and mark status as sent', async () => {
      const mockJob = {
        _id: 'outbox_exec_1',
        eventKey: 'welcome:customer_55',
        eventType: 'welcome_customer',
        recipient: 'test@shopsphere.in',
        templateData: { customerName: 'Ananya', exploreUrl: 'https://shopsphere.in' },
        attempts: 1,
        maxAttempts: 5
      };

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const result = await processJob(mockJob, mockAdapter);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock_msg_/);
      expect(mockAdapter.getSentEmails()).toHaveLength(1);
      expect(mockAdapter.getLastEmail().to).toBe('test@shopsphere.in');

      // Verified status updated to sent and lease cleared
      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: 'outbox_exec_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'sent',
            processingLeaseExpiresAt: null
          })
        })
      );
    });

    it('should scrub encryptedTokenPayload from templateData upon successful send', async () => {
      const realEncrypted = encryptToken('test_reset_token_123');
      const mockResetJob = {
        _id: 'outbox_reset_job',
        eventKey: 'reset:user_1',
        eventType: 'password_reset_request',
        recipient: 'user@shopsphere.in',
        templateData: {
          customerName: 'User One',
          encryptedTokenPayload: realEncrypted,
          expiresIn: '1 hour'
        },
        attempts: 1,
        maxAttempts: 5
      };

      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      await processJob(mockResetJob, mockAdapter);

      // Verify $unset scrubbed the encrypted token payload
      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: 'outbox_reset_job' },
        expect.objectContaining({
          $unset: { 'templateData.encryptedTokenPayload': '' }
        })
      );
    });

    it('should record failure and apply exponential backoff when provider fails', async () => {
      const mockJob = {
        _id: 'outbox_fail_job',
        eventKey: 'order_confirmed_cod:ORD-FAIL',
        eventType: 'order_confirmed_cod',
        recipient: 'fail@shopsphere.in',
        templateData: {
          customerName: 'Fail Test',
          orderNumber: 'ORD-FAIL',
          paymentMethod: 'cod',
          items: [{ title: 'Shirt', size: 'M', color: 'Black', quantity: 1, price: 1000, lineTotal: 1000 }],
          shippingAddress: { fullName: 'A', streetAddress: 'B', city: 'C', state: 'D', postalCode: '400001', country: 'India' },
          subtotal: 1000,
          total: 1000
        },
        attempts: 2,
        maxAttempts: 5
      };

      mockAdapter.setSimulateFailure(true);
      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const result = await processJob(mockJob, mockAdapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(false);

      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: 'outbox_fail_job' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            nextAttemptAt: expect.any(Date),
            lastError: expect.objectContaining({
              message: expect.stringContaining('Simulated upstream email provider failure')
            })
          })
        })
      );
    });

    it('should permanently mark job as failed when attempts reach maxAttempts', async () => {
      const mockExhaustedJob = {
        _id: 'outbox_exhausted_job',
        eventKey: 'order_confirmed_cod:ORD-EXHAUST',
        eventType: 'order_confirmed_cod',
        recipient: 'exhaust@shopsphere.in',
        templateData: {
          customerName: 'Max Attempts',
          orderNumber: 'ORD-EXHAUST',
          paymentMethod: 'cod',
          items: [{ title: 'Item', size: 'S', color: 'White', quantity: 1, price: 500, lineTotal: 500 }],
          shippingAddress: { fullName: 'A', streetAddress: 'B', city: 'C', state: 'D', postalCode: '400001', country: 'India' },
          subtotal: 500,
          total: 500
        },
        attempts: 5,
        maxAttempts: 5
      };

      mockAdapter.setSimulateFailure(true);
      const updateOneSpy = vi.spyOn(EmailOutbox, 'updateOne').mockResolvedValueOnce({ acknowledged: true });

      const result = await processJob(mockExhaustedJob, mockAdapter);

      expect(result.success).toBe(false);
      expect(result.isPermanent).toBe(true);

      const updateCall = updateOneSpy.mock.calls[0][1].$set;
      expect(updateCall.status).toBe('failed');
      expect(updateCall.nextAttemptAt).toBeUndefined(); // no further retries scheduled
    });

    it('should support starting and stopping the worker engine gracefully', async () => {
      expect(emailWorker.isRunning).toBe(false);
      startEmailWorker({ intervalMs: 50000 });
      expect(emailWorker.isRunning).toBe(true);

      await stopEmailWorker({ timeoutMs: 1000 });
      expect(emailWorker.isRunning).toBe(false);
    });
  });

  // ============================================================================
  // 6. Provider Adapters (Mock & Brevo)
  // ============================================================================
  describe('6. Provider Adapters (adapters/)', () => {
    it('should resolve mockAdapter in development and test environments', () => {
      const adapter = resolveAdapter('mock');
      expect(adapter).toBe(mockAdapter);
    });

    it('should resolve brevoAdapter when providerName is brevo', () => {
      const adapter = resolveAdapter('brevo');
      expect(adapter).toBe(brevoAdapter);
    });

    it('should throw an error when resolving an unsupported provider adapter', () => {
      expect(() => resolveAdapter('resend')).toThrow(/Unsupported email provider adapter/);
      expect(() => resolveAdapter('smtp')).toThrow(/Unsupported email provider adapter/);
      expect(() => resolveAdapter('unknown_provider')).toThrow(/Unsupported email provider adapter/);
    });

    it('should format and post payload to Brevo API using native fetch', async () => {
      const brevo = new BrevoEmailAdapter('mock_brevo_api_key_valid_format_test', 5000);

      const mockFetchResponse = {
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<brevo-20261110-msg@brevo.com>' })
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse);

      const result = await brevo.send({
        to: 'customer@shopsphere.in',
        subject: 'Order Confirmation',
        html: '<p>Order details</p>',
        text: 'Order details'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<brevo-20261110-msg@brevo.com>');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'api-key': 'mock_brevo_api_key_valid_format_test',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should distinguish retryable Brevo 429 and 500 errors from permanent errors', async () => {
      const brevo = new BrevoEmailAdapter('valid_key', 5000);

      // Test 503 Service Unavailable (Retryable)
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: 'Service temporarily unavailable' })
      });

      await expect(brevo.send({ to: 'a@b.com', subject: 'test', html: 'test' }))
        .rejects.toMatchObject({ isRetryable: true, statusCode: 503 });

      // Test 401 Unauthorized (Permanent configuration error)
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Key not found' })
      });

      await expect(brevo.send({ to: 'a@b.com', subject: 'test', html: 'test' }))
        .rejects.toMatchObject({ isRetryable: false, statusCode: 401 });
    });
  });

  // ============================================================================
  // 7. Template Compilation & HTML Escaping
  // ============================================================================
  describe('7. Template Compilation & HTML Injection Protection', () => {
    it('should escape dangerous dynamic input characters to prevent HTML injection in emails', () => {
      const maliciousName = '<script>alert("xss")</script> & "special"';
      const escaped = escapeHtml(maliciousName);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
    });

    it('should render Welcome template with luxury layout and plain-text version', () => {
      const rendered = renderEmailTemplate('welcome_customer', {
        customerName: 'Pooja Hegde',
        exploreUrl: 'https://shopsphere.in/shop'
      });

      expect(rendered.subject).toContain('Welcome to ShopSphere, Pooja Hegde');
      expect(rendered.html).toContain('SHOPSPHERE');
      expect(rendered.html).toContain('Pooja Hegde');
      expect(rendered.text).toContain('Welcome to ShopSphere');
    });

    it('should compile password reset template with secure URL fragment (#token=) rather than query parameter', () => {
      const rawSecret = 'sample_raw_reset_token_secret_12345';
      const encryptedPayload = encryptToken(rawSecret);

      const rendered = renderEmailTemplate('password_reset_request', {
        customerName: 'Kiara Advani',
        encryptedTokenPayload: encryptedPayload,
        expiresIn: '1 hour'
      });

      expect(rendered.subject).toContain('Reset Your ShopSphere Password');
      expect(rendered.html).toContain('Kiara Advani');
      // Must contain URL fragment '#token=', NOT query parameter '?token='
      expect(rendered.html).toContain('/reset-password#token=sample_raw_reset_token_secret_12345');
      expect(rendered.html).not.toContain('/reset-password?token=');
      expect(rendered.text).toContain('/reset-password#token=sample_raw_reset_token_secret_12345');
    });

    it('should render Order Confirmed template with itemized table and total calculations', () => {
      const rendered = renderEmailTemplate('order_confirmed_cod', {
        customerName: 'Rohit Verma',
        orderNumber: 'ORD-98765',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        items: [
          { title: 'Cashmere Knit Sweater', size: 'L', color: 'Charcoal', quantity: 2, price: 4999, lineTotal: 9998 }
        ],
        shippingAddress: {
          fullName: 'Rohit Verma',
          streetAddress: '42 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          country: 'India'
        },
        subtotal: 9998,
        discount: 1000,
        shippingFee: 0,
        tax: 1619,
        total: 10617,
        estimatedDeliveryDays: '2-3 business days'
      });

      expect(rendered.subject).toBe('Order Confirmed: ORD-98765 | ShopSphere');
      expect(rendered.html).toContain('Cashmere Knit Sweater');
      expect(rendered.html).toContain('Cash on Delivery');
      expect(rendered.html).toContain('₹10,617');
      expect(rendered.text).toContain('ORD-98765');
    });
  });

  // ============================================================================
  // 8. Environment Validation Rules
  // ============================================================================
  describe('8. Environment Configuration Validation for Email', () => {
    it('should successfully validate environment defaults in development mode', () => {
      const res = validateEnv({ NODE_ENV: 'development' });
      expect(res.valid).toBe(true);
      expect(res.data.EMAIL_PROVIDER).toBe('mock');
      expect(res.data.EMAIL_FROM_ADDRESS).toBe('orders@shopsphere.in');
      expect(res.data.EMAIL_TOKEN_SECRET).toBeDefined();
    });

    it('should fail validation in production if EMAIL_PROVIDER=brevo but BREVO_API_KEY is missing', () => {
      const res = validateEnv({
        NODE_ENV: 'production',
        CLIENT_ORIGIN: 'https://shopsphere.vercel.app',
        MONGODB_URI: 'mongodb+srv://produser:StrongPassword987@cluster0.mongodb.net/shopsphere_prod',
        JWT_SECRET: 'd8f4c2e6b0a1f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4',
        COOKIE_SECRET: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        EMAIL_TOKEN_SECRET: 'e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2',
        EMAIL_PROVIDER: 'brevo',
        BREVO_API_KEY: ''
      });

      expect(res.valid).toBe(false);
      const brevoErr = res.errors.find(e => e.field === 'BREVO_API_KEY');
      expect(brevoErr).toBeDefined();
    });
  });
});

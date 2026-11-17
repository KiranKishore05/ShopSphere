import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

const mockRestoreOrderInventory = vi.fn().mockResolvedValue(true);
const mockDeductOrderInventory = vi.fn().mockResolvedValue(true);

vi.mock('../src/services/inventoryService.js', () => ({
  deductOrderInventory: (...args) => mockDeductOrderInventory(...args),
  restoreOrderInventory: (...args) => mockRestoreOrderInventory(...args)
}));

import app from '../src/app.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import Cart from '../src/models/Cart.js';
import Product from '../src/models/Product.js';
import EmailOutbox from '../src/models/EmailOutbox.js';
import * as emailOutboxService from '../src/services/email/emailOutboxService.js';
import * as orderEmailEvents from '../src/services/email/orderEmailEvents.js';
import { generateToken } from '../src/utils/token.js';
import config from '../src/config/env.js';
import { renderEmailTemplate } from '../src/services/email/templates/index.js';

describe('Phase 9 Stage 3.4: Order, Payment & Admin Operational Email Integration Suite', () => {
  const customerId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const sampleOrderId = new mongoose.Types.ObjectId();
  const sampleProductId = new mongoose.Types.ObjectId();

  const customerToken = generateToken({ id: customerId, email: 'ananya@domain.com', role: 'customer' });
  const adminToken = generateToken({ id: adminId, email: 'director@domain.com', role: 'admin' });

  const mockCustomer = {
    _id: customerId,
    name: 'Ananya Sharma',
    email: 'ananya@domain.com',
    role: 'customer',
    isActive: true,
    savedAddresses: [
      {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Ananya Sharma',
        phone: '9876543210',
        streetAddress: '42 Heritage Boulevard',
        apartment: 'Suite 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      }
    ]
  };

  const mockAdmin = {
    _id: adminId,
    name: 'Atelier Administrator',
    email: 'director@domain.com',
    role: 'admin',
    isActive: true
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
    mockRestoreOrderInventory.mockClear();
    mockDeductOrderInventory.mockClear();

    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      let foundUser = null;
      if (idStr === customerId.toString()) {
        foundUser = {
          ...mockCustomer,
          savedAddresses: {
            id: () => mockCustomer.savedAddresses[0]
          }
        };
      } else if (idStr === adminId.toString()) {
        foundUser = mockAdmin;
      }
      return createQueryMock(foundUser);
    });

    vi.spyOn(Order.prototype, 'save').mockResolvedValue(true);
    vi.spyOn(EmailOutbox.prototype, 'save').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Order Confirmation Flow (COD & Paid Online)
  // ============================================================================
  describe('1. Order Confirmation Notification Flow', () => {
    it('should queue order confirmation (COD) and admin alert after successful COD checkout', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_cod_1'
      });

      // Mock Cart and matching Product in catalog
      vi.spyOn(Cart, 'findOne').mockResolvedValue({
        userId: customerId,
        items: [
          {
            productId: sampleProductId,
            variantSku: 'CT-CAM-M',
            quantity: 1
          }
        ]
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
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          addressId: mockCustomer.savedAddresses[0]._id.toString(),
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify customer confirmation was queued
      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order_confirmed_cod',
          recipient: 'ananya@domain.com',
          eventKey: expect.stringMatching(/^order_confirmed_cod:[a-f0-9]{24}$/),
          templateData: expect.objectContaining({
            customerName: 'Ananya Sharma',
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            total: 18500,
            orderDetailsUrl: expect.stringContaining('/account/orders/SPH-')
          })
        })
      );
    });

    it('should not queue confirmation if checkout fails validation (e.g. empty cart)', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      vi.spyOn(Cart, 'findOne').mockResolvedValue({
        userId: customerId,
        items: [] // Empty shopping bag
      });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          addressId: mockCustomer.savedAddresses[0]._id.toString(),
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CART_EMPTY');
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });

    it('should queue order confirmation (Paid) after successful Razorpay verification', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_paid_1'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-ONLINE-101',
        userId: customerId,
        orderStatus: 'pending_payment',
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        total: 12000,
        subtotal: 12000,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        items: [
          {
            name: 'Silk Evening Blouse',
            variantSku: 'SEB-IVO-S',
            size: 'S',
            color: { name: 'Ivory', hexCode: '#FFFFF0' },
            unitPrice: 12000,
            quantity: 1,
            lineTotal: 12000
          }
        ],
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockImplementation((query) => {
        if (query && query.razorpayPaymentId) return Promise.resolve(null);
        return Promise.resolve({
          orderId: sampleOrderId,
          razorpayOrderId: 'order_test_123'
        });
      });
      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });
      vi.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      // Generate authentic HMAC SHA-256 signature for test
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update('order_test_123|pay_test_456')
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: 'order_test_123',
          razorpayPaymentId: 'pay_test_456',
          razorpaySignature: expectedSignature
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order_confirmed_paid',
          recipient: 'ananya@domain.com',
          eventKey: `order_confirmed_paid:${sampleOrderId.toString()}`,
          templateData: expect.objectContaining({
            customerName: 'Ananya Sharma',
            orderNumber: 'SPH-ONLINE-101',
            paymentMethod: 'razorpay',
            paymentStatus: 'paid',
            total: 12000
          })
        })
      );
    });
  });

  // ============================================================================
  // 2. Payment Failure Flow
  // ============================================================================
  describe('2. Payment Failure Notification Flow', () => {
    it('should queue payment failure email when signature verification fails', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_fail_1'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-FAIL-001',
        userId: customerId,
        paymentStatus: 'pending',
        orderStatus: 'pending_payment',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockResolvedValue({
        orderId: sampleOrderId,
        razorpayOrderId: 'order_rzp_fail'
      });
      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: 'order_rzp_fail',
          razorpayPaymentId: 'pay_fake_999',
          razorpaySignature: 'invalid_tampered_signature_hex'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYMENT_SIGNATURE');

      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment_failed',
          recipient: 'ananya@domain.com',
          eventKey: `payment_failed:${sampleOrderId.toString()}:order_rzp_fail`,
          templateData: expect.objectContaining({
            orderNumber: 'SPH-FAIL-001',
            failureReason: 'Invalid payment signature',
            retryPaymentUrl: expect.stringContaining('/checkout?retryOrder=SPH-FAIL-001')
          })
        })
      );
    });

    it('should queue payment failure email when client reports payment rejection', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_fail_2'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-FAIL-002',
        userId: customerId,
        paymentStatus: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .post('/api/v1/payments/razorpay/failed')
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: 'order_rzp_client_declined',
          errorDescription: 'Bank server timeout or card declined'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment_failed',
          recipient: 'ananya@domain.com',
          templateData: expect.objectContaining({
            orderNumber: 'SPH-FAIL-002',
            failureReason: 'Bank server timeout or card declined'
          })
        })
      );
    });

    it('should not queue payment failure email for pending or already paid orders', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      const mockPaidOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-PAID-001',
        userId: customerId,
        paymentStatus: 'paid', // Already paid
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockPaidOrder);

      const res = await request(app)
        .post('/api/v1/payments/razorpay/failed')
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: 'order_rzp_ignored'
        });

      expect(res.status).toBe(200);
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 3. Order Cancellation Flow
  // ============================================================================
  describe('3. Order Cancellation Notification Flow', () => {
    it('should queue cancellation email only after order is successfully cancelled', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_cancel_1'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-CNL-001',
        userId: customerId,
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/orders/me/${mockOrder.orderNumber}/cancel`)
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ reason: 'Found alternative size' });

      expect(res.status).toBe(200);
      expect(mockOrder.orderStatus).toBe('cancelled');

      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order_cancelled',
          recipient: 'ananya@domain.com',
          eventKey: `order_cancelled:${sampleOrderId.toString()}`,
          templateData: expect.objectContaining({
            orderNumber: 'SPH-CNL-001',
            cancellationReason: 'Found alternative size',
            refundSummary: expect.stringContaining('Cash on Delivery')
          })
        })
      );
    });

    it('should reject cancellation and not queue email if order has already shipped', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-SHP-001',
        userId: customerId,
        orderStatus: 'shipped', // Already shipped!
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/orders/me/${mockOrder.orderNumber}/cancel`)
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ reason: 'Cannot cancel shipped' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_CANCEL_ORDER');
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 4. Admin Order Fulfillment & Logistics Flow (Shipped & Delivered)
  // ============================================================================
  describe('4. Admin Fulfillment State Machine & Shipping Notifications', () => {
    it('should queue shipped email with tracking details when admin moves order to shipped', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_ship_1'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-DISP-001',
        userId: customerId,
        orderStatus: 'processing',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderStatus: 'shipped',
          carrierName: 'Delhivery Luxury Cargo',
          trackingNumber: 'DLV-IN-9812401'
        });

      expect(res.status).toBe(200);
      expect(mockOrder.orderStatus).toBe('shipped');

      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order_shipped',
          recipient: 'ananya@domain.com',
          eventKey: `order_shipped:${sampleOrderId.toString()}`,
          templateData: expect.objectContaining({
            orderNumber: 'SPH-DISP-001',
            carrierName: 'Delhivery Luxury Cargo',
            trackingNumber: 'DLV-IN-9812401'
          })
        })
      );
    });

    it('should queue delivered email when admin moves order to delivered', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_deliv_1'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-DELIV-001',
        userId: customerId,
        orderStatus: 'shipped',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderStatus: 'delivered',
          note: 'Delivered to client in person'
        });

      expect(res.status).toBe(200);
      expect(mockOrder.orderStatus).toBe('delivered');

      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order_delivered',
          recipient: 'ananya@domain.com',
          eventKey: `order_delivered:${sampleOrderId.toString()}`,
          templateData: expect.objectContaining({
            orderNumber: 'SPH-DELIV-001'
          })
        })
      );
    });

    it('should return early without queueing duplicate email if order is already in target status', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-REPEAT-001',
        userId: customerId,
        orderStatus: 'shipped', // Already shipped!
        carrierName: 'BlueDart',
        trackingNumber: 'BD-123'
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderStatus: 'shipped'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("already in 'shipped' state");
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 5. Idempotency & Deterministic Keys
  // ============================================================================
  describe('5. Deterministic Event Keys & Deduplication', () => {
    it('should handle duplicate queue attempts gracefully with duplicate: true', async () => {
      // Simulate MongoDB E11000 duplicate key collision on unique eventKey index
      const duplicateError = new Error('E11000 duplicate key error collection: emailoutboxes index: eventKey_1');
      duplicateError.code = 11000;
      vi.spyOn(EmailOutbox.prototype, 'save').mockRejectedValueOnce(duplicateError);

      const result = await emailOutboxService.queueEmail({
        eventKey: 'order_shipped:507f1f77bcf86cd799439099',
        eventType: 'order_shipped',
        recipient: 'ananya@domain.com',
        templateData: {
          customerName: 'Ananya Sharma',
          orderNumber: 'SPH-DUP-001',
          carrierName: 'BlueDart',
          trackingNumber: 'BD-991283'
        }
      });

      expect(result.queued).toBe(false);
      expect(result.duplicate).toBe(true);
      expect(result.eventKey).toBe('order_shipped:507f1f77bcf86cd799439099');
    });
  });

  // ============================================================================
  // 6. Non-Fatal Queuing Failure Resilience
  // ============================================================================
  describe('6. Outbox Failure Resilience', () => {
    it('should preserve business operation and log sanitized warning when outbox fails', async () => {
      const sensitiveDbError = new Error('Sensitive Atlas URI credentials leaked in raw exception');
      vi.spyOn(emailOutboxService, 'queueEmail').mockRejectedValueOnce(sensitiveDbError);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-FAILSAFE-001',
        userId: customerId,
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/orders/me/${mockOrder.orderNumber}/cancel`)
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ reason: 'Cancelled under outbox glitch' });

      // Cancellation MUST still succeed
      expect(res.status).toBe(200);
      expect(mockOrder.orderStatus).toBe('cancelled');

      // Check sanitized logging
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OrderEmail] Failed to queue cancellation email for order #SPH-FAILSAFE-001')
      );
      const loggedMsg = warnSpy.mock.calls[0][0];
      expect(loggedMsg).not.toContain('Sensitive Atlas URI');
      expect(loggedMsg).not.toContain('ananya@domain.com');

      warnSpy.mockRestore();
    });
  });

  // ============================================================================
  // 7. Admin Operational Notifications
  // ============================================================================
  describe('7. Admin Operational Notifications', () => {
    it('should queue admin notification to configured ADMIN_NOTIFICATION_EMAIL', async () => {
      const prevAdminEmail = config.ADMIN_NOTIFICATION_EMAIL;
      config.ADMIN_NOTIFICATION_EMAIL = 'admin.operations@shopsphere.in';

      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_admin_1'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-ADM-001',
        userId: customerId,
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        total: 24000,
        items: [{ name: 'Wool Coat', quantity: 1, unitPrice: 24000, lineTotal: 24000, size: 'L' }],
        shippingAddressSnapshot: mockCustomer.savedAddresses[0]
      };

      await orderEmailEvents.queueOrderConfirmationEmail({
        order: mockOrder,
        customerEmail: 'ananya@domain.com',
        customerName: 'Ananya Sharma'
      });

      // Verify admin alert was queued with admin_order_created event type
      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'admin_order_created',
          recipient: 'admin.operations@shopsphere.in',
          eventKey: `admin_order_created:${sampleOrderId.toString()}`,
          templateData: expect.objectContaining({
            orderNumber: 'SPH-ADM-001',
            customerName: 'Ananya Sharma',
            total: 24000,
            adminOrderUrl: expect.stringContaining('/admin/orders/')
          })
        })
      );

      config.ADMIN_NOTIFICATION_EMAIL = prevAdminEmail;
    });

    it('should safely skip admin notification if ADMIN_NOTIFICATION_EMAIL is empty or not configured', async () => {
      const prevAdminEmail = config.ADMIN_NOTIFICATION_EMAIL;
      config.ADMIN_NOTIFICATION_EMAIL = '';

      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_customer_only'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-ADM-002',
        userId: customerId,
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        total: 10000,
        items: [{ name: 'Linen Shirt', quantity: 1, unitPrice: 10000, lineTotal: 10000, size: 'M' }],
        shippingAddressSnapshot: mockCustomer.savedAddresses[0]
      };

      await orderEmailEvents.queueOrderConfirmationEmail({
        order: mockOrder,
        customerEmail: 'ananya@domain.com',
        customerName: 'Ananya Sharma'
      });

      // Should only call queueEmail once (for the customer), not for admin
      expect(queueEmailSpy).toHaveBeenCalledTimes(1);
      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'ananya@domain.com'
        })
      );

      config.ADMIN_NOTIFICATION_EMAIL = prevAdminEmail;
    });
  });

  // ============================================================================
  // 8. Template Rendering & HTML Sanitization
  // ============================================================================
  describe('8. Template Rendering & XSS Escaping', () => {
    it('should HTML-escape dynamic input in order confirmed template', () => {
      const rendered = renderEmailTemplate('order_confirmed_cod', {
        customerName: '<script>alert("XSS")</script>Tara',
        orderNumber: 'SPH-XSS-101',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        items: [
          {
            title: '<b>Malicious Garment</b>',
            size: '<script>M</script>',
            color: 'Gold',
            quantity: 1,
            price: 5000,
            lineTotal: 5000
          }
        ],
        shippingAddress: {
          fullName: '<img src=x onerror=alert(1)>',
          streetAddress: '10 Downing St',
          city: 'London',
          state: 'London',
          postalCode: 'SW1A 2AA',
          country: 'UK'
        },
        subtotal: 5000,
        total: 5000
      });

      expect(rendered.html).not.toContain('<script>alert("XSS")</script>');
      expect(rendered.html).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;Tara');
      expect(rendered.html).not.toContain('<b>Malicious Garment</b>');
      expect(rendered.html).toContain('&lt;b&gt;Malicious Garment&lt;/b&gt;');
      expect(rendered.html).not.toContain('<img src=x onerror=alert(1)>');
    });

    it('should HTML-escape dynamic input in admin operational alert template', () => {
      const rendered = renderEmailTemplate('admin_payment_failed', {
        orderNumber: 'SPH-ADM-XSS',
        customerName: '<script>hack()</script>',
        total: 50000,
        paymentMethod: 'razorpay',
        failureReason: '<svg/onload=alert(1)>Card Declined'
      });

      expect(rendered.html).not.toContain('<script>hack()</script>');
      expect(rendered.html).toContain('&lt;script&gt;hack()&lt;/script&gt;');
      expect(rendered.html).not.toContain('<svg/onload=alert(1)>');
      expect(rendered.html).toContain('&lt;svg/onload=alert(1)&gt;Card Declined');
    });
  });

  // ============================================================================
  // 9. Payment Lifecycle, Privacy & Reliability Audit Regressions
  // ============================================================================
  describe('9. Stage 3.4 Payment Lifecycle, Privacy & Reliability Audit Regressions', () => {
    it('1. Repeated payment-failure webhook: should not duplicate failure emails or re-fail order', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_wh_fail'
      });

      const orderSaveSpy = vi.fn().mockResolvedValue(true);
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-WH-FAIL-01',
        userId: customerId,
        paymentStatus: 'pending',
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        save: orderSaveSpy
      };

      const mockPaymentRecord = {
        _id: new mongoose.Types.ObjectId(),
        orderId: sampleOrderId,
        razorpayOrderId: 'order_rzp_dup_fail',
        paymentStatus: 'pending'
      };

      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue(mockPaymentRecord);
      vi.spyOn(Order, 'findById').mockImplementation(() => createQueryMock(mockOrder));

      const webhookPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_fail_001',
              order_id: 'order_rzp_dup_fail',
              error_description: 'Card expired or insufficient balance'
            }
          }
        }
      };

      const crypto = await import('crypto');
      const rawPayload = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      // First webhook delivery
      const res1 = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(res1.status).toBe(200);
      expect(orderSaveSpy).toHaveBeenCalledTimes(1);
      expect(mockOrder.paymentStatus).toBe('failed');
      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment_failed',
          eventKey: `payment_failed:${sampleOrderId.toString()}:order_rzp_dup_fail`
        })
      );

      const emailCallCountAfterFirst = queueEmailSpy.mock.calls.length;

      // Second webhook delivery (duplicate)
      const res2 = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(res2.status).toBe(200);
      // Order save should NOT have been called again because order is already failed
      expect(orderSaveSpy).toHaveBeenCalledTimes(1);
      // Outbox queueing should NOT have been called again
      expect(queueEmailSpy.mock.calls.length).toBe(emailCallCountAfterFirst);
    });

    it('2. Repeated payment-success webhook: should not re-deduct inventory or send duplicate emails', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_wh_success'
      });

      const orderSaveSpy = vi.fn().mockResolvedValue(true);
      const paymentSaveSpy = vi.fn().mockResolvedValue(true);

      const mockPaymentRecord = {
        _id: new mongoose.Types.ObjectId(),
        orderId: sampleOrderId,
        razorpayOrderId: 'order_rzp_dup_success',
        paymentStatus: 'pending',
        save: paymentSaveSpy
      };

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-WH-SUCC-01',
        userId: customerId,
        orderStatus: 'pending_payment',
        paymentStatus: 'pending',
        statusTimeline: [],
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        items: [{ name: 'Silk Scarf', quantity: 1, unitPrice: 5000, lineTotal: 5000 }],
        save: orderSaveSpy
      };

      vi.spyOn(Payment, 'findOne').mockImplementation(() => Promise.resolve(mockPaymentRecord));
      vi.spyOn(Order, 'findById').mockImplementation(() => createQueryMock(mockOrder));
      vi.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_succ_001',
              order_id: 'order_rzp_dup_success'
            }
          }
        }
      };

      const crypto = await import('crypto');
      const rawPayload = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      // First webhook delivery
      const res1 = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(res1.status).toBe(200);
      expect(mockDeductOrderInventory).toHaveBeenCalledTimes(1);
      expect(mockOrder.paymentStatus).toBe('paid');
      expect(mockOrder.orderStatus).toBe('confirmed');
      expect(mockPaymentRecord.paymentStatus).toBe('paid');

      const emailCallCountAfterFirst = queueEmailSpy.mock.calls.length;

      // Second webhook delivery (duplicate event)
      const res2 = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(res2.status).toBe(200);
      // Inventory should NOT be deducted a second time
      expect(mockDeductOrderInventory).toHaveBeenCalledTimes(1);
      // Emails should NOT be queued a second time
      expect(queueEmailSpy.mock.calls.length).toBe(emailCallCountAfterFirst);
    });

    it('3. Payment success after earlier failure: should confirm order and queue confirmation without contradictory alerts', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({
        queued: true,
        outboxId: 'outbox_recovered'
      });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-RECOVER-01',
        userId: customerId,
        orderStatus: 'pending_payment',
        paymentStatus: 'failed', // Previously failed!
        paymentMethod: 'razorpay',
        total: 15000,
        subtotal: 15000,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        items: [
          {
            name: 'Cashmere Cardigan',
            variantSku: 'CC-NAV-M',
            size: 'M',
            quantity: 1,
            unitPrice: 15000,
            lineTotal: 15000
          }
        ],
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockImplementation((query) => {
        if (query && query.razorpayPaymentId) return Promise.resolve(null);
        return Promise.resolve({
          orderId: sampleOrderId,
          razorpayOrderId: 'order_rzp_retry_ok'
        });
      });
      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });
      vi.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update('order_rzp_retry_ok|pay_retry_success_99')
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: 'order_rzp_retry_ok',
          razorpayPaymentId: 'pay_retry_success_99',
          razorpaySignature: expectedSignature
        });

      expect(res.status).toBe(200);
      expect(mockOrder.paymentStatus).toBe('paid');
      expect(mockOrder.orderStatus).toBe('confirmed');

      // Should queue confirmation email
      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order_confirmed_paid',
          eventKey: `order_confirmed_paid:${sampleOrderId.toString()}`
        })
      );

      // Should NOT queue any payment_failed email during successful verification
      const failedCalls = queueEmailSpy.mock.calls.filter(
        (call) => call[0].eventType === 'payment_failed'
      );
      expect(failedCalls.length).toBe(0);
    });

    it('4. No email after failed database persistence: outbox queueing is aborted if DB save rejects', async () => {
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      vi.spyOn(Cart, 'findOne').mockResolvedValue({
        userId: customerId,
        items: [
          {
            productId: sampleProductId,
            variantSku: 'CT-CAM-M',
            quantity: 1
          }
        ]
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

      // Simulate Database Write Failure on Order.save
      vi.spyOn(Order.prototype, 'save').mockRejectedValueOnce(
        new Error('MongoDB cluster write concern timeout')
      );

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          addressId: mockCustomer.savedAddresses[0]._id.toString(),
          paymentMethod: 'cod'
        });

      // Request must return an error status
      expect(res.status).toBe(500);
      // No email must have been queued because order persistence failed
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });

    it('5. Privacy: No customer email address or raw gateway error in admin email templates', () => {
      const adminOrderCreated = renderEmailTemplate('admin_order_created', {
        orderNumber: 'SPH-PRIV-001',
        customerName: 'Secret Client',
        total: 85000,
        itemCount: 3,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        adminOrderUrl: 'https://shopsphere.in/admin/orders/507f1f77bcf86cd799439011'
      });

      // Ensure no customer email appears (only brand concierge support email in footer is present)
      const emailsCreated = adminOrderCreated.html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      expect(emailsCreated.every((e) => e === 'support@shopsphere.in')).toBe(true);
      expect(adminOrderCreated.html).not.toContain('customer');
      expect(adminOrderCreated.html).toContain('SPH-PRIV-001');
      expect(adminOrderCreated.html).toContain('Secret Client');
      expect(adminOrderCreated.html).toContain('https://shopsphere.in/admin/orders/507f1f77bcf86cd799439011');

      const adminPaymentFailed = renderEmailTemplate('admin_payment_failed', {
        orderNumber: 'SPH-PRIV-002',
        customerName: 'Secret Client',
        total: 45000,
        paymentMethod: 'razorpay',
        failureReason: 'Payment authorization declined by issuing bank',
        adminOrderUrl: 'https://shopsphere.in/admin/orders/507f1f77bcf86cd799439022'
      });

      const emailsFailed = adminPaymentFailed.html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      expect(emailsFailed.every((e) => e === 'support@shopsphere.in')).toBe(true);
      expect(adminPaymentFailed.html).toContain('Payment authorization declined by issuing bank');
      expect(adminPaymentFailed.html).toContain('https://shopsphere.in/admin/orders/507f1f77bcf86cd799439022');

      const adminOrderCancelled = renderEmailTemplate('admin_order_cancelled', {
        orderNumber: 'SPH-PRIV-003',
        customerName: 'Secret Client',
        total: 30000,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        cancellationReason: 'Customer requested cancellation before dispatch',
        adminOrderUrl: 'https://shopsphere.in/admin/orders/507f1f77bcf86cd799439033'
      });

      const emailsCancelled = adminOrderCancelled.html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      expect(emailsCancelled.every((e) => e === 'support@shopsphere.in')).toBe(true);
      expect(adminOrderCancelled.html).toContain('https://shopsphere.in/admin/orders/507f1f77bcf86cd799439033');
    });

    it('6. Safe payment failure explanation: sanitizeFailureReason sanitizes stack traces, DB strings, and XSS', () => {
      // 1. Stack trace and code reference
      const stackTrace = 'Error: connect ECONNREFUSED at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)';
      expect(orderEmailEvents.sanitizeFailureReason(stackTrace)).toBe('Payment authorization declined by issuing bank');

      // 2. Sensitive database URI or secret token reference
      const mongoLeak = 'MongoServerError: authentication failed for user app secret=abc12345 in database production';
      expect(orderEmailEvents.sanitizeFailureReason(mongoLeak)).toBe('Payment authorization declined by issuing bank');

      // 3. Null / undefined / empty input
      expect(orderEmailEvents.sanitizeFailureReason(null)).toBe('Payment authorization declined');
      expect(orderEmailEvents.sanitizeFailureReason('')).toBe('Payment authorization declined');

      // 4. Clean user-facing text
      expect(orderEmailEvents.sanitizeFailureReason('Insufficient balance or daily limit exceeded'))
        .toBe('Insufficient balance or daily limit exceeded');

      // 5. Length bounding (max 150 chars)
      const longReason = 'A'.repeat(200);
      expect(orderEmailEvents.sanitizeFailureReason(longReason).length).toBe(150);
    });

    it('7. Admin alert deduplication: deterministic keys prevent duplicate outbox entries', async () => {
      const duplicateError = new Error('E11000 duplicate key error collection: emailoutboxes index: eventKey_1');
      duplicateError.code = 11000;

      // Mock save to simulate Mongo unique index collision
      vi.spyOn(EmailOutbox.prototype, 'save').mockRejectedValueOnce(duplicateError);

      const res = await emailOutboxService.queueEmail({
        eventKey: `admin_payment_failed:${sampleOrderId}:order_rzp_dup_admin`,
        eventType: 'admin_payment_failed',
        recipient: 'admin@shopsphere.in',
        templateData: {
          orderNumber: 'SPH-DUP-ADM',
          customerName: 'Client',
          total: 10000,
          paymentMethod: 'razorpay',
          failureReason: 'Card Declined',
          adminOrderUrl: 'https://shopsphere.in/admin/orders/1'
        }
      });

      expect(res.queued).toBe(false);
      expect(res.duplicate).toBe(true);
      expect(res.eventKey).toBe(`admin_payment_failed:${sampleOrderId}:order_rzp_dup_admin`);
    });

    it('8. Existing order and payment behaviour remains unchanged: cancellation restores inventory', async () => {
      vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValue({ queued: true, outboxId: 'outbox_restore' });

      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-RESTORE-01',
        userId: customerId,
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        shippingAddressSnapshot: mockCustomer.savedAddresses[0],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/orders/me/${mockOrder.orderNumber}/cancel`)
        .set('Cookie', `token=${customerToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ reason: 'Changed mind' });

      expect(res.status).toBe(200);
      expect(mockOrder.orderStatus).toBe('cancelled');
      // Existing inventory restoration service must be called
      expect(mockRestoreOrderInventory).toHaveBeenCalledTimes(1);
    });
  });
});

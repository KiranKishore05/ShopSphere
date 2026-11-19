import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import Cart from '../src/models/Cart.js';
import Coupon from '../src/models/Coupon.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import InventoryMovement from '../src/models/InventoryMovement.js';
import config from '../src/config/env.js';
import { generateToken } from '../src/utils/token.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shopsphere_test';

describe('Payment & Razorpay Backend API (/api/v1/payments)', () => {
  let customerUser;
  let customerCookie;

  let otherCustomerUser;
  let otherCustomerCookie;

  let testCategory;
  let testProduct;
  let testCoupon;
  let pendingOrder;

  beforeAll(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 2000 });
      }
    } catch {
      // If local test DB is not running, tests will skip gracefully
      return;
    }

    if (mongoose.connection.readyState !== 1) return;

    await User.deleteMany({ email: /@test-payment\.com$/ });
    await Product.deleteMany({ brand: 'Payment Test Atelier' });
    await Category.deleteMany({ slug: 'payment-test-category' });
    await Coupon.deleteMany({ code: /^PAY/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Payment/ });

    testCategory = await Category.create({
      name: 'Payment Category',
      slug: 'payment-test-category',
      description: 'Payment category',
      image: { url: 'https://example.com/category.jpg' }
    });

    customerUser = await User.create({
      name: 'Payment Customer',
      email: 'customer@test-payment.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const token = generateToken({ id: customerUser._id, email: customerUser.email, role: customerUser.role });
    customerCookie = `token=${token}`;

    otherCustomerUser = await User.create({
      name: 'Other Payment Customer',
      email: 'other@test-payment.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const otherToken = generateToken({ id: otherCustomerUser._id, email: otherCustomerUser.email, role: otherCustomerUser.role });
    otherCustomerCookie = `token=${otherToken}`;

    await Cart.deleteMany({ userId: { $in: [customerUser._id, otherCustomerUser._id] } });

    testProduct = await Product.create({
      name: 'Sartorial Wool Trousers',
      slug: 'sartorial-wool-trousers',
      description: 'Handcrafted wool trousers.',
      categoryId: testCategory._id,
      brand: 'Payment Test Atelier',
      gender: 'men',
      images: [{ url: 'https://example.com/trousers.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'SWT-CHR-32',
          size: '32',
          color: { name: 'Charcoal', hexCode: '#36454F' },
          price: 7500,
          stockQuantity: 10,
          isActive: true
        }
      ]
    });

    testCoupon = await Coupon.create({
      code: 'PAY10',
      description: '10% off',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 2000,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      usedCount: 0
    });

    // Populate user cart
    await Cart.create({
      userId: customerUser._id,
      items: [{
        productId: testProduct._id,
        variantSku: 'SWT-CHR-32',
        quantity: 1,
        addedAt: new Date()
      }]
    });

    // Seed pending order
    pendingOrder = await Order.create({
      orderNumber: 'SPH-PAY-TEST-001',
      userId: customerUser._id,
      items: [{
        productId: testProduct._id,
        variantSku: 'SWT-CHR-32',
        name: 'Sartorial Wool Trousers',
        size: '32',
        color: { name: 'Charcoal', hexCode: '#36454F' },
        image: 'https://example.com/trousers.jpg',
        unitPrice: 7500,
        quantity: 1,
        lineTotal: 7500
      }],
      shippingAddressSnapshot: {
        fullName: 'Payment Customer',
        phone: '+91 9876543210',
        streetAddress: '77 Heritage Boulevard',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India'
      },
      subtotal: 7500,
      discount: 750,
      shippingFee: 0,
      tax: 0,
      total: 6750,
      couponCode: 'PAY10',
      couponId: testCoupon._id,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment'
    });
  });

  beforeEach((ctx) => {
    if (mongoose.connection.readyState !== 1 || !pendingOrder) {
      ctx.skip();
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 1) return;
    await User.deleteMany({ email: /@test-payment\.com$/ });
    await Product.deleteMany({ brand: 'Payment Test Atelier' });
    await Category.deleteMany({ slug: 'payment-test-category' });
    if (customerUser && otherCustomerUser) {
      await Cart.deleteMany({ userId: { $in: [customerUser._id, otherCustomerUser._id] } });
    }
    await Coupon.deleteMany({ code: /^PAY/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Payment/ });
    if (pendingOrder) {
      await Payment.deleteMany({ orderId: pendingOrder._id });
      await InventoryMovement.deleteMany({ referenceId: pendingOrder._id });
    }
  });

  describe('POST /api/v1/payments/razorpay/create-order', () => {
    it('should create Razorpay order with server-calculated amount in paise', async () => {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/create-order')
        .set('Cookie', customerCookie)
        .send({ orderId: pendingOrder._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.razorpayOrderId).toBeTruthy();
      expect(res.body.data.amount).toBe(675000); // ₹6,750 * 100 paise
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.orderNumber).toBe(pendingOrder.orderNumber);

      // Verify payment document created in database
      const paymentDoc = await Payment.findOne({ orderId: pendingOrder._id });
      expect(paymentDoc).toBeTruthy();
      expect(paymentDoc.razorpayOrderId).toBe(res.body.data.razorpayOrderId);
      expect(paymentDoc.paymentStatus).toBe('pending');
    });

    it('should reject order creation if user does not own the order', async () => {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/create-order')
        .set('Cookie', otherCustomerCookie)
        .send({ orderId: pendingOrder._id.toString() });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/payments/razorpay/verify', () => {
    let razorpayOrderId;
    const razorpayPaymentId = 'pay_test_987654321';

    beforeAll(async () => {
      if (!pendingOrder) return;
      const paymentDoc = await Payment.findOne({ orderId: pendingOrder._id });
      if (paymentDoc) {
        razorpayOrderId = paymentDoc.razorpayOrderId;
      }
    });

    it('should reject invalid payment signatures with 400', async () => {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', customerCookie)
        .send({
          orderId: pendingOrder._id.toString(),
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: 'invalid_forged_signature_hex'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYMENT_SIGNATURE');

      // Verify payment doc was marked failed
      const paymentDoc = await Payment.findOne({ razorpayOrderId });
      expect(paymentDoc.paymentStatus).toBe('failed');
    });

    it('should successfully verify payment with valid HMAC SHA-256 signature', async () => {
      // Calculate valid signature using configured test secret
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const validSignature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', customerCookie)
        .send({
          orderId: pendingOrder._id.toString(),
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.paymentStatus).toBe('paid');
      expect(res.body.data.order.orderStatus).toBe('confirmed');

      // Verify stock was deducted (10 - 1 = 9)
      const updatedProduct = await Product.findById(testProduct._id);
      const variant = updatedProduct.variants.find(v => v.sku === 'SWT-CHR-32');
      expect(variant.stockQuantity).toBe(9);

      // Verify coupon usage incremented
      const updatedCoupon = await Coupon.findById(testCoupon._id);
      expect(updatedCoupon.usedCount).toBe(1);

      // Verify customer cart was cleared
      const userCart = await Cart.findOne({ userId: customerUser._id });
      expect(userCart.items).toHaveLength(0);
    });

    it('should be idempotent on duplicate verification', async () => {
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const validSignature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', customerCookie)
        .send({
          orderId: pendingOrder._id.toString(),
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toMatch(/already verified/i);

      // Stock should still be 9 (no double deduction)
      const updatedProduct = await Product.findById(testProduct._id);
      const variant = updatedProduct.variants.find(v => v.sku === 'SWT-CHR-32');
      expect(variant.stockQuantity).toBe(9);
    });
  });

  describe('POST /api/v1/payments/razorpay/webhook', () => {
    let webhookOrder;
    let webhookRzpOrderId;

    beforeAll(async () => {
      if (!customerUser || !testProduct) return;

      webhookRzpOrderId = `order_test_webhook_${Date.now()}`;

      webhookOrder = await Order.create({
        orderNumber: `SPH-WEBHOOK-${Date.now()}`,
        userId: customerUser._id,
        items: [{
          productId: testProduct._id,
          variantSku: 'SWT-CHR-32',
          name: 'Sartorial Wool Trousers',
          size: '32',
          color: { name: 'Charcoal', hexCode: '#36454F' },
          image: 'https://example.com/trousers.jpg',
          unitPrice: 7500,
          quantity: 1,
          lineTotal: 7500
        }],
        shippingAddressSnapshot: {
          fullName: 'Webhook Customer',
          phone: '+91 9876543210',
          streetAddress: '99 Fashion Way',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        subtotal: 7500,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        total: 7500,
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        orderStatus: 'pending_payment'
      });

      await Payment.create({
        orderId: webhookOrder._id,
        razorpayOrderId: webhookRzpOrderId,
        amount: 7500,
        currency: 'INR',
        paymentStatus: 'pending'
      });
    });

    it('should reject webhook request if x-razorpay-signature header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(400);
    });

    it('should reject webhook request with invalid signature', async () => {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', 'forged_webhook_signature')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(400);
    });

    it('should process payment.captured event with valid signature and confirm order', async () => {
      const eventPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_captured_123',
              order_id: webhookRzpOrderId,
              amount: 750000,
              currency: 'INR',
              status: 'captured'
            }
          }
        }
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      // Verify order updated
      const updatedOrder = await Order.findById(webhookOrder._id);
      expect(updatedOrder.paymentStatus).toBe('paid');
      expect(updatedOrder.orderStatus).toBe('confirmed');

      // Verify payment updated
      const updatedPayment = await Payment.findOne({ razorpayOrderId: webhookRzpOrderId });
      expect(updatedPayment.paymentStatus).toBe('paid');
    });

    it('should process payment.failed webhook event', async () => {
      const failedRzpOrderId = `order_failed_${Date.now()}`;
      await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        razorpayOrderId: failedRzpOrderId,
        amount: 2000,
        currency: 'INR',
        paymentStatus: 'pending'
      });

      const eventPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_123',
              order_id: failedRzpOrderId,
              error_description: 'Card declined by issuing bank'
            }
          }
        }
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);

      const failedPayment = await Payment.findOne({ razorpayOrderId: failedRzpOrderId });
      expect(failedPayment.paymentStatus).toBe('failed');
      expect(failedPayment.failureReason).toBe('Card declined by issuing bank');
    });

    it('should process order.paid webhook event via /api/v1/payments/webhook endpoint', async () => {
      const orderPaidRzpId = `order_paid_webhook_${Date.now()}`;
      const orderPaidDoc = await Order.create({
        orderNumber: `SPH-ORDPAID-${Date.now()}`,
        userId: customerUser._id,
        items: [{
          productId: testProduct._id,
          variantSku: 'SWT-CHR-32',
          name: 'Sartorial Wool Trousers',
          size: '32',
          color: { name: 'Charcoal', hexCode: '#36454F' },
          image: 'https://example.com/trousers.jpg',
          unitPrice: 7500,
          quantity: 1,
          lineTotal: 7500
        }],
        shippingAddressSnapshot: {
          fullName: 'OrderPaid Customer',
          phone: '+91 9876543210',
          streetAddress: '100 Webhook Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        subtotal: 7500,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        total: 7500,
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        orderStatus: 'pending_payment'
      });

      await Payment.create({
        orderId: orderPaidDoc._id,
        razorpayOrderId: orderPaidRzpId,
        amount: 7500,
        currency: 'INR',
        paymentStatus: 'pending'
      });

      const eventPayload = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: orderPaidRzpId,
              amount: 750000,
              currency: 'INR',
              status: 'paid'
            }
          },
          payment: {
            entity: {
              id: 'pay_order_paid_456',
              order_id: orderPaidRzpId,
              status: 'captured'
            }
          }
        }
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // Test standard /api/v1/payments/webhook route
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      const verifiedOrder = await Order.findById(orderPaidDoc._id);
      expect(verifiedOrder.paymentStatus).toBe('paid');
      expect(verifiedOrder.orderStatus).toBe('confirmed');

      const verifiedPayment = await Payment.findOne({ razorpayOrderId: orderPaidRzpId });
      expect(verifiedPayment.paymentStatus).toBe('paid');
      expect(verifiedPayment.razorpayPaymentId).toBe('pay_order_paid_456');
    });
  });

  describe('POST /api/v1/payments/razorpay/failed (Client Cancellation / Failure Audit)', () => {
    it('should record client-side payment failure for pending order', async () => {
      const failOrder = await Order.create({
        orderNumber: `SPH-FAIL-${Date.now()}`,
        userId: customerUser._id,
        items: [{
          productId: testProduct._id,
          variantSku: 'SWT-CHR-32',
          name: 'Sartorial Wool Trousers',
          size: '32',
          color: { name: 'Charcoal', hexCode: '#36454F' },
          image: 'https://example.com/trousers.jpg',
          unitPrice: 7500,
          quantity: 1,
          lineTotal: 7500
        }],
        shippingAddressSnapshot: {
          fullName: 'Fail Customer',
          phone: '+91 9876543210',
          streetAddress: '100 Cancel Court',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        subtotal: 7500,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        total: 7500,
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        orderStatus: 'pending_payment'
      });

      const failRzpOrderId = `order_fail_client_${Date.now()}`;
      await Payment.create({
        orderId: failOrder._id,
        razorpayOrderId: failRzpOrderId,
        amount: 7500,
        currency: 'INR',
        paymentStatus: 'pending'
      });

      const res = await request(app)
        .post('/api/v1/payments/razorpay/failed')
        .set('Cookie', customerCookie)
        .send({
          orderId: failOrder._id.toString(),
          razorpayOrderId: failRzpOrderId,
          errorDescription: 'User closed payment modal before entering OTP'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedOrder = await Order.findById(failOrder._id);
      expect(updatedOrder.paymentStatus).toBe('failed');

      const updatedPayment = await Payment.findOne({ razorpayOrderId: failRzpOrderId });
      expect(updatedPayment.paymentStatus).toBe('failed');
      expect(updatedPayment.failureReason).toContain('User closed payment modal');
    });

    it('should reject failure recording if user does not own order', async () => {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/failed')
        .set('Cookie', otherCustomerCookie)
        .send({
          orderId: pendingOrder._id.toString(),
          errorDescription: 'Unauthorized attempt'
        });

      expect(res.status).toBe(404);
    });
  });
});

describe('Phase 6.4C: SEC-05 Razorpay Webhook Raw-Body & Secret Security Suite', () => {
  const testSecret = 'secure_webhook_test_secret_for_sha256_verification_123';
  let origSecret;

  beforeEach(() => {
    origSecret = config.RAZORPAY_WEBHOOK_SECRET;
    config.RAZORPAY_WEBHOOK_SECRET = testSecret;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    config.RAZORPAY_WEBHOOK_SECRET = origSecret;
    vi.restoreAllMocks();
  });

  it('1. should succeed with HTTP 200 when signature is generated from exact original raw Buffer', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    vi.spyOn(Payment, 'findOne').mockResolvedValue(null);

    const payloadObj = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_raw_123', order_id: 'order_raw_123' } }
      }
    };
    const payloadStr = JSON.stringify(payloadObj);
    const rawBuffer = Buffer.from(payloadStr, 'utf8');
    const signature = crypto.createHmac('sha256', testSecret).update(rawBuffer).digest('hex');

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('2. should return HTTP 400 when req.rawBody is missing/undefined', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', 'valid_looking_hex_signature_0123456789abcdef0123456789abcdef01234567')
      .set('Content-Type', 'text/plain')
      .send('{"event":"payment.captured"}');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Missing or empty raw request body for webhook verification');
  });

  it('3. should return HTTP 400 when req.rawBody is not a Buffer', async () => {
    const { handleRazorpayWebhook } = await import('../src/controllers/paymentController.js');
    let statusCode = null;
    let responseBody = null;

    const mockReq = {
      headers: {
        'x-razorpay-signature': 'signature_123'
      },
      rawBody: 'string_not_a_buffer',
      body: { event: 'order.paid' }
    };
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => {
            responseBody = body;
          }
        };
      }
    };

    await handleRazorpayWebhook(mockReq, mockRes, () => {});

    expect(statusCode).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Missing or empty raw request body for webhook verification');
  });

  it('4. should return HTTP 400 when rawBody is an empty Buffer', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    // 4a: Integration test via Supertest sending empty JSON body (Express verify hook sets rawBody to Buffer.alloc(0))
    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', 'valid_looking_hex_signature_0123456789abcdef0123456789abcdef01234567')
      .set('Content-Type', 'application/json')
      .send('');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Missing or empty raw request body for webhook verification');

    // 4b: Direct unit verification with explicit Buffer.alloc(0)
    const { handleRazorpayWebhook } = await import('../src/controllers/paymentController.js');
    let unitStatus = null;
    let unitBody = null;
    await handleRazorpayWebhook(
      {
        headers: { 'x-razorpay-signature': 'sig_123' },
        rawBody: Buffer.alloc(0),
        body: {}
      },
      {
        status: (code) => {
          unitStatus = code;
          return { json: (b) => { unitBody = b; } };
        }
      },
      () => {}
    );
    expect(unitStatus).toBe(400);
    expect(unitBody.error).toBe('Missing or empty raw request body for webhook verification');
  });

  it('5. should return HTTP 400 when signature does not match computed HMAC', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const payload = JSON.stringify({ event: 'order.paid' });
    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid webhook signature');
  });

  it('6. should return HTTP 400 when x-razorpay-signature header is missing', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const payload = JSON.stringify({ event: 'payment.captured' });
    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Missing x-razorpay-signature header');
  });

  it('7. should fail safely with HTTP 500 when webhook secret is missing/empty', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    config.RAZORPAY_WEBHOOK_SECRET = '';

    const payloadStr = JSON.stringify({ event: 'payment.captured' });
    const signature = crypto.createHmac('sha256', 'any_key').update(Buffer.from(payloadStr)).digest('hex');

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Webhook service misconfigured');
  });

  it('8. should fail safely with HTTP 500 when webhook secret is the known placeholder value', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    config.RAZORPAY_WEBHOOK_SECRET = 'rzp_webhook_secret_placeholder';

    const payloadStr = JSON.stringify({ event: 'payment.captured' });
    const signature = crypto.createHmac('sha256', 'rzp_webhook_secret_placeholder').update(Buffer.from(payloadStr)).digest('hex');

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Webhook service misconfigured');
  });

  it('9. should reject with HTTP 400 when request body bytes are tampered after signature generation', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const originalPayload = JSON.stringify({ event: 'payment.captured', amount: 5000 });
    const originalSignature = crypto.createHmac('sha256', testSecret).update(Buffer.from(originalPayload)).digest('hex');

    const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 500 });

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', originalSignature)
      .set('Content-Type', 'application/json')
      .send(tamperedPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid webhook signature');
  });

  it('10. should verify successfully when payload contains pretty-printed formatting and signature matches raw bytes', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    vi.spyOn(Payment, 'findOne').mockResolvedValue(null);

    const payloadObj = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_pretty_print_789',
            order_id: 'order_pretty_print_789'
          }
        }
      }
    };
    const prettyPrintedRaw = JSON.stringify(payloadObj, null, 2);
    const rawBuffer = Buffer.from(prettyPrintedRaw, 'utf8');

    const signature = crypto.createHmac('sha256', testSecret).update(rawBuffer).digest('hex');

    const compactReconstructedHmac = crypto
      .createHmac('sha256', testSecret)
      .update(JSON.stringify(payloadObj))
      .digest('hex');
    expect(compactReconstructedHmac).not.toBe(signature);

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(prettyPrintedRaw);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Phase 2: Payment Security, Verification & Backend Mock Flow Suite', () => {
  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const sampleOrderId = new mongoose.Types.ObjectId();
  const sampleRzpOrderId = 'order_test_mock_123';
  const customerToken = generateToken({ id: userId, email: 'customer@shopsphere.test', role: 'customer' });
  const otherCustomerToken = generateToken({ id: otherUserId, email: 'attacker@shopsphere.test', role: 'customer' });

  const csrfHeaders = {
    Origin: 'http://localhost:5173',
    'X-Requested-With': 'XMLHttpRequest'
  };

  const mockUser = {
    _id: userId,
    name: 'Verified Customer',
    email: 'customer@shopsphere.test',
    role: 'customer',
    isActive: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    vi.spyOn(User, 'findById').mockImplementation(async (id) => {
      if (id?.toString() === userId.toString()) return mockUser;
      if (id?.toString() === otherUserId.toString()) {
        return { _id: otherUserId, name: 'Attacker', email: 'attacker@shopsphere.test', role: 'customer', isActive: true };
      }
      return null;
    });
  });

  describe('POST /api/v1/payments/razorpay/mock-complete (Backend-Only Development Flow)', () => {
    it('should complete mock payment successfully in development/test environment', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-MOCK-001',
        userId: userId,
        orderStatus: 'pending_payment',
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        total: 5000,
        items: [],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockImplementation((query) => {
        if (query?.razorpayOrderId === sampleRzpOrderId) {
          return Promise.resolve({ orderId: sampleOrderId, razorpayOrderId: sampleRzpOrderId });
        }
        return Promise.resolve(null);
      });
      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });
      vi.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .post('/api/v1/payments/razorpay/mock-complete')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: sampleRzpOrderId
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.paymentStatus).toBe('paid');
      expect(mockOrder.orderStatus).toBe('confirmed');
    });

    it('should strictly disallow mock payment in production environment with 403', async () => {
      const origEnv = config.NODE_ENV;
      config.NODE_ENV = 'production';

      const res = await request(app)
        .post('/api/v1/payments/razorpay/mock-complete')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: sampleRzpOrderId
        });

      config.NODE_ENV = origEnv;

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MOCK_PAYMENT_DISABLED');
    });

    it('should reject mock payment if order does not belong to user (unauthorized attempt)', async () => {
      vi.spyOn(Order, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/payments/razorpay/mock-complete')
        .set('Cookie', `token=${otherCustomerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: sampleRzpOrderId
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should reject mock payment if order is already cancelled', async () => {
      const cancelledOrder = {
        _id: sampleOrderId,
        userId: userId,
        orderStatus: 'cancelled'
      };
      vi.spyOn(Order, 'findOne').mockResolvedValue(cancelledOrder);

      const res = await request(app)
        .post('/api/v1/payments/razorpay/mock-complete')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: sampleRzpOrderId
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ORDER_CANCELLED');
    });
  });

  describe('POST /api/v1/payments/razorpay/verify (Signature & Idempotency)', () => {
    it('should reject invalid signature with 400 INVALID_PAYMENT_SIGNATURE', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        userId: userId,
        orderStatus: 'pending_payment',
        paymentStatus: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockResolvedValue({ orderId: sampleOrderId, razorpayOrderId: sampleRzpOrderId });
      vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: sampleRzpOrderId,
          razorpayPaymentId: 'pay_tampered_123',
          razorpaySignature: 'invalid_hex_signature_not_matching_hmac'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYMENT_SIGNATURE');
    });

    it('should reject duplicate payment ID associated with another order with 409', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        userId: userId,
        orderStatus: 'pending_payment',
        paymentStatus: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      const validSig = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update(`${sampleRzpOrderId}|pay_cross_order_123`)
        .digest('hex');

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockImplementation((query) => {
        if (query?.orderId) {
          return Promise.resolve({ orderId: sampleOrderId, razorpayOrderId: sampleRzpOrderId });
        }
        if (query?.razorpayPaymentId === 'pay_cross_order_123') {
          return Promise.resolve({
            orderId: new mongoose.Types.ObjectId(), // Belongs to ANOTHER order!
            razorpayPaymentId: 'pay_cross_order_123'
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: sampleRzpOrderId,
          razorpayPaymentId: 'pay_cross_order_123',
          razorpaySignature: validSig
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_PAYMENT_CROSS_ORDER');
    });

    it('should return 200 idempotent response when order is already confirmed and paid', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        userId: userId,
        orderStatus: 'confirmed',
        paymentStatus: 'paid'
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      vi.spyOn(Payment, 'findOne').mockResolvedValue({ orderId: sampleOrderId, razorpayOrderId: sampleRzpOrderId });

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', `token=${customerToken}`)
        .set(csrfHeaders)
        .send({
          orderId: sampleOrderId.toString(),
          razorpayOrderId: sampleRzpOrderId,
          razorpayPaymentId: 'pay_existing_123',
          razorpaySignature: 'any_signature'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('already verified');
    });
  });
});

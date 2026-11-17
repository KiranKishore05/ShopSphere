import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Cart from '../models/Cart.js';
import config from '../config/env.js';
import { generateToken } from '../utils/token.js';

import { connectDB, disconnectDB } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function verifyRazorpayIntegration() {
  console.log('========================================================');
  console.log('   SHOPSPHERE RAZORPAY & PAYMENT INTEGRATION AUDIT      ');
  console.log('========================================================');

  await connectDB();
  console.log('✅ Connected to MongoDB Atlas');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. ENVIRONMENT CONFIGURATION AUDIT
    // -----------------------------------------------------------------
    console.log('\n--- 1. Environment Configuration Audit ---');
    assert(Boolean(config.RAZORPAY_KEY_ID), 'RAZORPAY_KEY_ID is defined');
    assert(config.RAZORPAY_KEY_ID.startsWith('rzp_test_'), 'RAZORPAY_KEY_ID starts with rzp_test_ (Test Mode)');
    assert(Boolean(config.RAZORPAY_KEY_SECRET), 'RAZORPAY_KEY_SECRET is configured on backend');
    assert(Boolean(config.RAZORPAY_WEBHOOK_SECRET), 'RAZORPAY_WEBHOOK_SECRET is configured on backend');

    // -----------------------------------------------------------------
    // 2. SETUP TEST USER, PRODUCT & CART
    // -----------------------------------------------------------------
    console.log('\n--- 2. Setting Up Test Order & Customer Session ---');
    
    // Find or create customer
    const customer = await User.findOne({ email: 'customer@shopsphere.in' });
    assert(Boolean(customer), 'Customer account found: customer@shopsphere.in');

    const customerToken = generateToken({ id: customer._id, email: customer.email, role: customer.role });
    const customerCookie = `token=${customerToken}`;

    // Another customer for ownership testing
    let otherCustomer = await User.findOne({ email: 'other-test@shopsphere.in' });
    if (!otherCustomer) {
      otherCustomer = await User.create({
        name: 'Other Customer',
        email: 'other-test@shopsphere.in',
        passwordHash: await User.hashPassword('OtherPass123!'),
        role: 'customer'
      });
    }
    const otherToken = generateToken({ id: otherCustomer._id, email: otherCustomer.email, role: otherCustomer.role });
    const otherCookie = `token=${otherToken}`;

    const testProduct = await Product.findOne({ isActive: true });
    assert(Boolean(testProduct), `Using active product: ${testProduct.name}`);
    const variant = testProduct.variants[0];
    const initialStock = variant.stockQuantity;

    // -----------------------------------------------------------------
    // 3. CREATE RAZORPAY ORDER (BACKEND VALIDATION & INR TO PAISE)
    // -----------------------------------------------------------------
    console.log('\n--- 3. Testing Razorpay Order Creation Endpoint ---');

    // Create a pending order for testing
    const testOrder = await Order.create({
      orderNumber: `SPH-RZP-${Date.now()}`,
      userId: customer._id,
      items: [{
        productId: testProduct._id,
        variantSku: variant.sku,
        name: testProduct.name,
        size: variant.size,
        color: variant.color,
        image: testProduct.images[0]?.url || 'https://example.com/item.jpg',
        unitPrice: variant.price,
        quantity: 1,
        lineTotal: variant.price
      }],
      shippingAddressSnapshot: {
        fullName: 'Test Customer',
        phone: '+91 9876543210',
        streetAddress: '12 Fashion Boulevard',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        country: 'India'
      },
      subtotal: variant.price,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: variant.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment'
    });

    const createRes = await request(app)
      .post('/api/v1/payments/razorpay/create-order')
      .set('Cookie', customerCookie)
      .send({ orderId: testOrder._id.toString() });

    assert(createRes.status === 200, 'POST /api/v1/payments/razorpay/create-order returns HTTP 200');
    assert(Boolean(createRes.body.data.razorpayOrderId), `Razorpay Order ID created: ${createRes.body.data.razorpayOrderId}`);
    assert(createRes.body.data.currency === 'INR', 'Currency is INR');
    assert(createRes.body.data.amount === Math.round(testOrder.total * 100), `Amount converted to paise: ₹${testOrder.total} = ${createRes.body.data.amount} paise`);
    assert(createRes.body.data.keyId === config.RAZORPAY_KEY_ID, 'Public Key ID returned to client (secret never exposed)');

    // Verify Payment record in database
    const paymentDoc = await Payment.findOne({ orderId: testOrder._id });
    assert(Boolean(paymentDoc), 'Payment document created in MongoDB');
    assert(paymentDoc.razorpayOrderId === createRes.body.data.razorpayOrderId, 'Payment razorpayOrderId matches');
    assert(paymentDoc.paymentStatus === 'pending', 'Payment status initialized as pending');

    // -----------------------------------------------------------------
    // 4. CUSTOMER OWNERSHIP & TAMPERING GUARDS
    // -----------------------------------------------------------------
    console.log('\n--- 4. Testing Ownership & Security Validation ---');

    // Other customer trying to create Razorpay order for this order
    const stolenOrderRes = await request(app)
      .post('/api/v1/payments/razorpay/create-order')
      .set('Cookie', otherCookie)
      .send({ orderId: testOrder._id.toString() });
    assert(stolenOrderRes.status === 404, 'Other customer rejected with 404 (Ownership isolation)');

    // Other customer trying to verify payment for this order
    const stolenVerifyRes = await request(app)
      .post('/api/v1/payments/razorpay/verify')
      .set('Cookie', otherCookie)
      .send({
        orderId: testOrder._id.toString(),
        razorpayOrderId: createRes.body.data.razorpayOrderId,
        razorpayPaymentId: 'pay_stolen_123',
        razorpaySignature: 'stolen_sig'
      });
    assert(stolenVerifyRes.status === 404, 'Unauthorized verification rejected with 404 (Ownership isolation)');

    // -----------------------------------------------------------------
    // 5. SIGNATURE VERIFICATION (INVALID & VALID)
    // -----------------------------------------------------------------
    console.log('\n--- 5. Testing Payment Signature Verification & Stock Deduction ---');

    const fakePaymentId = `pay_test_${Date.now()}`;

    // Test forged signature rejection
    const forgedSigRes = await request(app)
      .post('/api/v1/payments/razorpay/verify')
      .set('Cookie', customerCookie)
      .send({
        orderId: testOrder._id.toString(),
        razorpayOrderId: createRes.body.data.razorpayOrderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: 'tampered_forged_signature_hex'
      });
    assert(forgedSigRes.status === 400, 'Forged signature rejected with HTTP 400');
    assert(forgedSigRes.body.error.code === 'INVALID_PAYMENT_SIGNATURE', 'Error code is INVALID_PAYMENT_SIGNATURE');

    // Verify payment and order marked failed on forged signature
    const failedOrderCheck = await Order.findById(testOrder._id);
    assert(failedOrderCheck.paymentStatus === 'failed', 'Order paymentStatus updated to failed on signature failure');
    const failedPaymentCheck = await Payment.findOne({ orderId: testOrder._id });
    assert(failedPaymentCheck.paymentStatus === 'failed', 'Payment document updated to failed on signature failure');

    // Test genuine HMAC SHA-256 signature
    const payload = `${createRes.body.data.razorpayOrderId}|${fakePaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    const validVerifyRes = await request(app)
      .post('/api/v1/payments/razorpay/verify')
      .set('Cookie', customerCookie)
      .send({
        orderId: testOrder._id.toString(),
        razorpayOrderId: createRes.body.data.razorpayOrderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: validSignature
      });

    assert(validVerifyRes.status === 200, 'Genuine HMAC SHA-256 signature accepted with HTTP 200');
    assert(validVerifyRes.body.data.order.paymentStatus === 'paid', 'Order paymentStatus updated to paid');
    assert(validVerifyRes.body.data.order.orderStatus === 'confirmed', 'Order orderStatus updated to confirmed');

    // Verify inventory deduction
    const productAfterPayment = await Product.findById(testProduct._id);
    const variantAfter = productAfterPayment.variants.find(v => v.sku === variant.sku);
    assert(variantAfter.stockQuantity === initialStock - 1, `Inventory atomically deducted: ${initialStock} -> ${variantAfter.stockQuantity}`);

    // Verify Payment document updated to paid
    const updatedPaymentDoc = await Payment.findOne({ orderId: testOrder._id });
    assert(updatedPaymentDoc.paymentStatus === 'paid', 'Payment document updated to paid');
    assert(updatedPaymentDoc.razorpayPaymentId === fakePaymentId, 'Payment document stores razorpayPaymentId');
    assert(Boolean(updatedPaymentDoc.verifiedAt), 'Payment verifiedAt timestamp recorded');

    // -----------------------------------------------------------------
    // 6. IDEMPOTENT VERIFICATION (DUPLICATE PAYMENT ATTEMPTS)
    // -----------------------------------------------------------------
    console.log('\n--- 6. Testing Idempotent Payment Verification ---');
    const duplicateVerifyRes = await request(app)
      .post('/api/v1/payments/razorpay/verify')
      .set('Cookie', customerCookie)
      .send({
        orderId: testOrder._id.toString(),
        razorpayOrderId: createRes.body.data.razorpayOrderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: validSignature
      });

    assert(duplicateVerifyRes.status === 200, 'Duplicate verification returns HTTP 200 immediately (Idempotent)');
    assert(duplicateVerifyRes.body.data.message.includes('already verified'), 'Idempotent response message returned');

    // Verify stock was NOT deducted a second time
    const productAfterDup = await Product.findById(testProduct._id);
    const variantAfterDup = productAfterDup.variants.find(v => v.sku === variant.sku);
    assert(variantAfterDup.stockQuantity === initialStock - 1, `Stock unchanged on duplicate verification (no double deduction): ${variantAfterDup.stockQuantity}`);

    // -----------------------------------------------------------------
    // 7. CLIENT-SIDE PAYMENT FAILURE & CANCELLATION RECORDING
    // -----------------------------------------------------------------
    console.log('\n--- 7. Testing Payment Failure & Cancellation Recording ---');
    const cancelledOrder = await Order.create({
      orderNumber: `SPH-CANCEL-${Date.now()}`,
      userId: customer._id,
      items: [{
        productId: testProduct._id,
        variantSku: variant.sku,
        name: testProduct.name,
        size: variant.size,
        color: variant.color,
        image: 'https://example.com/item.jpg',
        unitPrice: variant.price,
        quantity: 1,
        lineTotal: variant.price
      }],
      shippingAddressSnapshot: testOrder.shippingAddressSnapshot,
      subtotal: variant.price,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: variant.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment'
    });

    const clientFailRes = await request(app)
      .post('/api/v1/payments/razorpay/failed')
      .set('Cookie', customerCookie)
      .send({
        orderId: cancelledOrder._id.toString(),
        razorpayOrderId: 'order_cancelled_client_123',
        errorDescription: 'Payment dismissed by customer'
      });

    assert(clientFailRes.status === 200, 'POST /api/v1/payments/razorpay/failed returns HTTP 200');
    const updatedCancelledOrder = await Order.findById(cancelledOrder._id);
    assert(updatedCancelledOrder.paymentStatus === 'failed', 'Cancelled order marked paymentStatus = failed');

    // -----------------------------------------------------------------
    // 8. RAZORPAY WEBHOOK PROCESSING (RAW BODY, HMAC & IDEMPOTENCY)
    // -----------------------------------------------------------------
    console.log('\n--- 8. Testing Razorpay Webhooks (payment.captured, order.paid, payment.failed) ---');

    // 8a. Test webhook missing signature
    const noSigWebhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ event: 'payment.captured' });
    assert(noSigWebhookRes.status === 400, 'Webhook rejected if x-razorpay-signature missing (HTTP 400)');

    // 8b. Test webhook invalid signature
    const badSigWebhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', 'invalid_signature_hex')
      .send({ event: 'payment.captured' });
    assert(badSigWebhookRes.status === 400, 'Webhook rejected if signature invalid (HTTP 400)');

    // 8c. Test payment.captured webhook with valid HMAC
    const webhookRzpOrderId = `order_wh_${Date.now()}`;
    const webhookOrder = await Order.create({
      orderNumber: `SPH-WH-${Date.now()}`,
      userId: customer._id,
      items: [{
        productId: testProduct._id,
        variantSku: variant.sku,
        name: testProduct.name,
        size: variant.size,
        color: variant.color,
        image: 'https://example.com/item.jpg',
        unitPrice: variant.price,
        quantity: 1,
        lineTotal: variant.price
      }],
      shippingAddressSnapshot: testOrder.shippingAddressSnapshot,
      subtotal: variant.price,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: variant.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment'
    });

    await Payment.create({
      orderId: webhookOrder._id,
      razorpayOrderId: webhookRzpOrderId,
      amount: variant.price,
      currency: 'INR',
      paymentStatus: 'pending'
    });

    const capturedEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_wh_captured_${Date.now()}`,
            order_id: webhookRzpOrderId,
            amount: variant.price * 100,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    };

    const capturedRawBody = JSON.stringify(capturedEvent);
    const capturedSig = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(capturedRawBody)
      .digest('hex');

    const capturedWebhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', capturedSig)
      .set('Content-Type', 'application/json')
      .send(capturedRawBody);

    assert(capturedWebhookRes.status === 200, 'payment.captured webhook processed successfully (HTTP 200)');
    const whOrderAfter = await Order.findById(webhookOrder._id);
    assert(whOrderAfter.paymentStatus === 'paid', 'Webhook confirmed order paymentStatus = paid');
    assert(whOrderAfter.orderStatus === 'confirmed', 'Webhook confirmed order orderStatus = confirmed');

    // 8d. Test order.paid webhook with valid HMAC
    const orderPaidRzpId = `order_wh_paid_${Date.now()}`;
    const orderPaidOrder = await Order.create({
      orderNumber: `SPH-WH-ORDPAID-${Date.now()}`,
      userId: customer._id,
      items: [{
        productId: testProduct._id,
        variantSku: variant.sku,
        name: testProduct.name,
        size: variant.size,
        color: variant.color,
        image: 'https://example.com/item.jpg',
        unitPrice: variant.price,
        quantity: 1,
        lineTotal: variant.price
      }],
      shippingAddressSnapshot: testOrder.shippingAddressSnapshot,
      subtotal: variant.price,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: variant.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment'
    });

    await Payment.create({
      orderId: orderPaidOrder._id,
      razorpayOrderId: orderPaidRzpId,
      amount: variant.price,
      currency: 'INR',
      paymentStatus: 'pending'
    });

    const orderPaidEvent = {
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: orderPaidRzpId,
            amount: variant.price * 100,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_wh_order_paid_${Date.now()}`,
            order_id: orderPaidRzpId,
            status: 'captured'
          }
        }
      }
    };

    const orderPaidRawBody = JSON.stringify(orderPaidEvent);
    const orderPaidSig = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(orderPaidRawBody)
      .digest('hex');

    const orderPaidRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', orderPaidSig)
      .set('Content-Type', 'application/json')
      .send(orderPaidRawBody);

    assert(orderPaidRes.status === 200, 'order.paid webhook processed successfully (HTTP 200)');
    const orderPaidAfter = await Order.findById(orderPaidOrder._id);
    assert(orderPaidAfter.paymentStatus === 'paid', 'order.paid webhook marked order as paid');
    assert(orderPaidAfter.orderStatus === 'confirmed', 'order.paid webhook marked order as confirmed');

    // 8e. Test payment.failed webhook
    const failedWhRzpId = `order_wh_fail_${Date.now()}`;
    const failedWhOrder = await Order.create({
      orderNumber: `SPH-WH-FAIL-${Date.now()}`,
      userId: customer._id,
      items: [{
        productId: testProduct._id,
        variantSku: variant.sku,
        name: testProduct.name,
        size: variant.size,
        color: variant.color,
        image: 'https://example.com/item.jpg',
        unitPrice: variant.price,
        quantity: 1,
        lineTotal: variant.price
      }],
      shippingAddressSnapshot: testOrder.shippingAddressSnapshot,
      subtotal: variant.price,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: variant.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment'
    });

    await Payment.create({
      orderId: failedWhOrder._id,
      razorpayOrderId: failedWhRzpId,
      amount: variant.price,
      currency: 'INR',
      paymentStatus: 'pending'
    });

    const failedWhEvent = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_wh_failed_${Date.now()}`,
            order_id: failedWhRzpId,
            error_description: 'Issuer bank system unavailable'
          }
        }
      }
    };

    const failedWhRawBody = JSON.stringify(failedWhEvent);
    const failedWhSig = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(failedWhRawBody)
      .digest('hex');

    const failedWhRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', failedWhSig)
      .set('Content-Type', 'application/json')
      .send(failedWhRawBody);

    assert(failedWhRes.status === 200, 'payment.failed webhook processed (HTTP 200)');
    const failedWhPayment = await Payment.findOne({ razorpayOrderId: failedWhRzpId });
    assert(failedWhPayment.paymentStatus === 'failed', 'Payment document status updated to failed');
    assert(failedWhPayment.failureReason === 'Issuer bank system unavailable', 'Failure description recorded');

    // -----------------------------------------------------------------
    // 9. PRESERVE CASH ON DELIVERY (COD) FUNCTIONALITY
    // -----------------------------------------------------------------
    console.log('\n--- 9. Verifying Existing Cash on Delivery (COD) Flow ---');

    // Add item to cart for customer
    await Cart.findOneAndUpdate(
      { userId: customer._id },
      {
        userId: customer._id,
        items: [{
          productId: testProduct._id,
          variantSku: variant.sku,
          quantity: 1,
          addedAt: new Date()
        }]
      },
      { upsert: true }
    );

    const codCheckoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', customerCookie)
      .send({
        paymentMethod: 'cod',
        shippingAddress: testOrder.shippingAddressSnapshot
      });

    assert(codCheckoutRes.status === 201, 'Cash on Delivery checkout succeeds with HTTP 201');
    assert(codCheckoutRes.body.data.order.paymentMethod === 'cod', 'Payment method is cod');
    assert(codCheckoutRes.body.data.order.paymentStatus === 'pending', 'COD paymentStatus is pending (pay on delivery)');
    assert(codCheckoutRes.body.data.order.orderStatus === 'confirmed', 'COD orderStatus is confirmed immediately');

    // Cleanup test orders
    console.log('\n--- 10. Cleaning Up Verification Records ---');
    await Order.deleteMany({ _id: { $in: [testOrder._id, cancelledOrder._id, webhookOrder._id, orderPaidOrder._id, failedWhOrder._id, codCheckoutRes.body.data.order._id] } });
    await Payment.deleteMany({ orderId: { $in: [testOrder._id, cancelledOrder._id, webhookOrder._id, orderPaidOrder._id, failedWhOrder._id, codCheckoutRes.body.data.order._id] } });
    await Cart.deleteOne({ userId: customer._id });
    // Restore variant stock deducted during test
    await Product.updateOne(
      { _id: testProduct._id, 'variants.sku': variant.sku },
      { $set: { 'variants.$.stockQuantity': initialStock } }
    );
    console.log('  ✓ Cleaned up test orders, payments, and restored inventory');

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log('\n========================================================');
    console.log(`RAZORPAY INTEGRATION AUDIT: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Razorpay audit:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

verifyRazorpayIntegration();

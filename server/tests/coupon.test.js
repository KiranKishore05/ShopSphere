import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import Cart from '../src/models/Cart.js';
import Coupon from '../src/models/Coupon.js';
import Order from '../src/models/Order.js';
import { generateToken } from '../src/utils/token.js';
import { connectTestDB, disconnectTestDB } from './helpers/testDb.js';

describe('Coupon Backend API (/api/v1/coupons)', () => {
  let isDbConnected = false;
  let customerUser;
  let customerCookie;
  let otherCustomerUser;
  let otherCustomerCookie;

  let testCategory;
  let testProduct;

  let activePercentCoupon;
  let cappedCoupon;
  let fixedCoupon;
  let expiredCoupon;
  let limitCoupon;
  let perUserCoupon;

  beforeAll(async () => {
    const connResult = await connectTestDB();
    isDbConnected = connResult.connected;
    if (!isDbConnected) {
      return;
    }

    await User.deleteMany({ email: /@test-coupon\.com$/ });
    await Product.deleteMany({ brand: 'Coupon Test Atelier' });
    if (customerUser?._id) {
      await Cart.deleteMany({ userId: { $in: [customerUser._id, otherCustomerUser?._id].filter(Boolean) } });
    }
    await Coupon.deleteMany({ code: /^TEST/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Coupon/ });

    testCategory = await Category.create({
      name: 'Coupon Category',
      slug: 'coupon-test-category',
      description: 'Coupon test',
      image: { url: 'https://example.com/category.jpg' }
    });

    customerUser = await User.create({
      name: 'Coupon Customer',
      email: 'customer@test-coupon.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const token = generateToken({ id: customerUser._id, email: customerUser.email, role: customerUser.role });
    customerCookie = `token=${token}`;

    otherCustomerUser = await User.create({
      name: 'Other Coupon Customer',
      email: 'other@test-coupon.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const otherToken = generateToken({ id: otherCustomerUser._id, email: otherCustomerUser.email, role: otherCustomerUser.role });
    otherCustomerCookie = `token=${otherToken}`;

    await Cart.deleteMany({ userId: { $in: [customerUser._id, otherCustomerUser._id] } });

    testProduct = await Product.create({
      name: 'Cashmere Trench Coat',
      slug: 'cashmere-trench-coat',
      description: 'Hand-tailored cashmere coat.',
      categoryId: testCategory._id,
      brand: 'Coupon Test Atelier',
      gender: 'women',
      images: [{ url: 'https://example.com/coat.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'CTC-CAM-M',
          size: 'M',
          color: { name: 'Camel', hexCode: '#C19A6B' },
          price: 10000,
          stockQuantity: 10,
          isActive: true
        }
      ]
    });

    const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Seed coupons
    activePercentCoupon = await Coupon.create({
      code: 'TEST10',
      description: '10% off on luxury items',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 2000,
      expiryDate: futureExpiry,
      isActive: true
    });

    cappedCoupon = await Coupon.create({
      code: 'TEST50CAP',
      description: '50% off capped at ₹1,500',
      discountType: 'percentage',
      discountValue: 50,
      minOrderAmount: 2000,
      maxDiscountAmount: 1500,
      expiryDate: futureExpiry,
      isActive: true
    });

    fixedCoupon = await Coupon.create({
      code: 'TESTFLAT1000',
      description: '₹1,000 off flat',
      discountType: 'fixed',
      discountValue: 1000,
      minOrderAmount: 5000,
      expiryDate: futureExpiry,
      isActive: true
    });

    expiredCoupon = await Coupon.create({
      code: 'TESTEXPIRED',
      description: 'Expired coupon',
      discountType: 'percentage',
      discountValue: 20,
      minOrderAmount: 1000,
      expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      isActive: true
    });

    limitCoupon = await Coupon.create({
      code: 'TESTMAXED',
      description: 'Maxed out coupon',
      discountType: 'percentage',
      discountValue: 15,
      minOrderAmount: 1000,
      usageLimit: 5,
      usedCount: 5,
      expiryDate: futureExpiry,
      isActive: true
    });

    perUserCoupon = await Coupon.create({
      code: 'TESTONCE',
      description: '1 time per user',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 1000,
      perUserLimit: 1,
      expiryDate: futureExpiry,
      isActive: true
    });

    // Populate user's cart with 1 Trench Coat (₹10,000 subtotal)
    await Cart.create({
      userId: customerUser._id,
      items: [{
        productId: testProduct._id,
        variantSku: 'CTC-CAM-M',
        quantity: 1,
        addedAt: new Date()
      }]
    });
  });

  beforeEach((ctx) => {
    if (mongoose.connection.readyState !== 1 || !isDbConnected) {
      ctx.skip();
    }
  });

  afterAll(async () => {
    try {
      if (isDbConnected && mongoose.connection.readyState === 1) {
        await User.deleteMany({ email: /@test-coupon\.com$/ });
        await Product.deleteMany({ brand: 'Coupon Test Atelier' });
        await Category.deleteMany({ slug: 'coupon-test-category' });
        if (customerUser || otherCustomerUser) {
          await Cart.deleteMany({ userId: { $in: [customerUser?._id, otherCustomerUser?._id].filter(Boolean) } });
        }
        await Coupon.deleteMany({ code: /^TEST/ });
        await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Coupon/ });
      }
    } finally {
      await disconnectTestDB();
    }
  });

  describe('POST /api/v1/coupons/apply', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .send({ code: 'TEST10' });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent or inactive coupon with 404', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'DOESNOTEXIST' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COUPON_NOT_FOUND');
    });

    it('should successfully apply percentage discount against customer cart', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'test10' }); // lower-case should be upper-cased

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coupon.code).toBe('TEST10');
      expect(res.body.data.subtotal).toBe(10000);
      expect(res.body.data.discountAmount).toBe(1000); // 10% of 10,000
      expect(res.body.data.discountedSubtotal).toBe(9000);
    });

    it('should enforce maximum discount cap on percentage coupon', async () => {
      // 50% of 10,000 = 5,000, but capped at 1,500
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'TEST50CAP' });

      expect(res.status).toBe(200);
      expect(res.body.data.discountAmount).toBe(1500);
      expect(res.body.data.discountedSubtotal).toBe(8500);
    });

    it('should successfully calculate fixed discount', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'TESTFLAT1000' });

      expect(res.status).toBe(200);
      expect(res.body.data.discountAmount).toBe(1000);
      expect(res.body.data.discountedSubtotal).toBe(9000);
    });

    it('should reject expired coupon with 400', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'TESTEXPIRED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('COUPON_EXPIRED');
    });

    it('should reject coupon when usage limit is reached', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'TESTMAXED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('COUPON_USAGE_EXCEEDED');
    });

    it('should reject coupon if subtotal is below minOrderAmount', async () => {
      // Pass subtotal below 5000 for TESTFLAT1000
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'TESTFLAT1000', subtotal: 3000 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('COUPON_MIN_AMOUNT_NOT_MET');
    });

    it('should reject coupon if user has already used it up to perUserLimit', async () => {
      // Place an order using TESTONCE
      await Order.create({
        orderNumber: 'SPH-TEST-COUPON-1',
        userId: customerUser._id,
        items: [{
          productId: testProduct._id,
          variantSku: 'CTC-CAM-M',
          name: 'Cashmere Trench Coat',
          size: 'M',
          color: { name: 'Camel', hexCode: '#C19A6B' },
          image: 'https://example.com/coat.jpg',
          unitPrice: 10000,
          quantity: 1,
          lineTotal: 10000
        }],
        shippingAddressSnapshot: {
          fullName: 'Coupon User',
          phone: '+91 9876543210',
          streetAddress: '123 Heritage Way',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        subtotal: 10000,
        discount: 1000,
        shippingFee: 0,
        tax: 0,
        total: 9000,
        couponCode: 'TESTONCE',
        couponId: perUserCoupon._id,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'confirmed'
      });

      // Attempt to apply TESTONCE again
      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', customerCookie)
        .send({ code: 'TESTONCE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('COUPON_PER_USER_LIMIT_EXCEEDED');

      // However, another user who hasn't used it can apply it
      const resOther = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', otherCustomerCookie)
        .send({ code: 'TESTONCE', subtotal: 5000 });

      expect(resOther.status).toBe(200);
      expect(resOther.body.data.discountAmount).toBe(500);
    });
  });
});

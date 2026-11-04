import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import Cart from '../src/models/Cart.js';
import Coupon from '../src/models/Coupon.js';
import Order from '../src/models/Order.js';
import InventoryMovement from '../src/models/InventoryMovement.js';
import { generateToken } from '../src/utils/token.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shopsphere_test';

describe('Checkout & Orders Backend API (/api/v1/orders)', () => {
  let customerUser;
  let customerCookie;
  let savedAddressId;

  let otherCustomerUser;
  let otherCustomerCookie;

  let testCategory;
  let inStockProduct;
  let lowStockProduct;
  let expensiveProduct;
  let testCoupon;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    }

    // Cleanup
    await User.deleteMany({ email: /@test-checkout\.com$/ });
    await Product.deleteMany({ brand: 'Checkout Test Atelier' });
    await Category.deleteMany({ slug: 'checkout-test-category' });
    await Coupon.deleteMany({ code: /^CKOUT/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Checkout/ });
    await InventoryMovement.deleteMany({});

    testCategory = await Category.create({
      name: 'Checkout Category',
      slug: 'checkout-test-category',
      description: 'Checkout category',
      image: { url: 'https://example.com/category.jpg' }
    });

    // Customer with saved address
    customerUser = await User.create({
      name: 'Checkout Customer',
      email: 'customer@test-checkout.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer',
      savedAddresses: [
        {
          fullName: 'Checkout Customer',
          phone: '+91 9876543210',
          streetAddress: '42 Royal Avenue',
          apartment: 'Suite 401',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
          country: 'India',
          isDefault: true
        }
      ]
    });
    savedAddressId = customerUser.savedAddresses[0]._id.toString();

    const token = generateToken({ id: customerUser._id, email: customerUser.email, role: customerUser.role });
    customerCookie = `token=${token}`;

    otherCustomerUser = await User.create({
      name: 'Other Checkout Customer',
      email: 'other@test-checkout.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const otherToken = generateToken({ id: otherCustomerUser._id, email: otherCustomerUser.email, role: otherCustomerUser.role });
    otherCustomerCookie = `token=${otherToken}`;

    inStockProduct = await Product.create({
      name: 'Silk Georgette Blouse',
      slug: 'silk-georgette-blouse',
      description: 'Pure mulberry silk georgette blouse.',
      categoryId: testCategory._id,
      brand: 'Checkout Test Atelier',
      gender: 'women',
      images: [{ url: 'https://example.com/blouse.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'SGB-IVY-S',
          size: 'S',
          color: { name: 'Ivory', hexCode: '#FDFBF7' },
          price: 6000,
          stockQuantity: 10,
          isActive: true
        }
      ]
    });

    lowStockProduct = await Product.create({
      name: 'Structured Linen Blazer',
      slug: 'structured-linen-blazer',
      description: 'Tailored European linen blazer.',
      categoryId: testCategory._id,
      brand: 'Checkout Test Atelier',
      gender: 'men',
      images: [{ url: 'https://example.com/blazer.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'SLB-SND-38',
          size: '38',
          color: { name: 'Sand', hexCode: '#C8B293' },
          price: 8500,
          stockQuantity: 1, // Only 1 left
          isActive: true
        }
      ]
    });

    expensiveProduct = await Product.create({
      name: 'Hand-Embroidered Evening Gown',
      slug: 'hand-embroidered-evening-gown',
      description: 'Couture evening gown.',
      categoryId: testCategory._id,
      brand: 'Checkout Test Atelier',
      gender: 'women',
      images: [{ url: 'https://example.com/gown.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'HEG-NOI-M',
          size: 'M',
          color: { name: 'Noir', hexCode: '#161513' },
          price: 25000, // Exceeds COD ₹20,000 limit
          stockQuantity: 5,
          isActive: true
        }
      ]
    });

    testCoupon = await Coupon.create({
      code: 'CKOUT15',
      description: '15% off for checkout tests',
      discountType: 'percentage',
      discountValue: 15,
      minOrderAmount: 4000,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-checkout\.com$/ });
    await Product.deleteMany({ brand: 'Checkout Test Atelier' });
    await Category.deleteMany({ slug: 'checkout-test-category' });
    await Cart.deleteMany({ userId: { $in: [customerUser._id, otherCustomerUser._id] } });
    await Coupon.deleteMany({ code: /^CKOUT/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Checkout/ });
    await InventoryMovement.deleteMany({});
  });

  describe('POST /api/v1/orders/checkout', () => {
    it('should reject checkout if shopping bag is empty', async () => {
      await Cart.findOneAndUpdate({ userId: customerUser._id }, { $set: { items: [] } }, { upsert: true });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', customerCookie)
        .send({
          addressId: savedAddressId,
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CART_EMPTY');
    });

    it('should reject checkout if requested quantity exceeds available stock', async () => {
      // Put 2 items of lowStockProduct in cart (available is only 1)
      await Cart.findOneAndUpdate(
        { userId: customerUser._id },
        {
          $set: {
            items: [{
              productId: lowStockProduct._id,
              variantSku: 'SLB-SND-38',
              quantity: 2,
              addedAt: new Date()
            }]
          }
        },
        { upsert: true }
      );

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', customerCookie)
        .send({
          addressId: savedAddressId,
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should calculate prices authoritatively on server and ignore client price tampering', async () => {
      // Put 1 Silk Blouse in cart (Price: ₹6,000)
      await Cart.findOneAndUpdate(
        { userId: customerUser._id },
        {
          $set: {
            items: [{
              productId: inStockProduct._id,
              variantSku: 'SGB-IVY-S',
              quantity: 1,
              addedAt: new Date()
            }]
          }
        },
        { upsert: true }
      );

      // Attempt to tamper price/total in request body
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', customerCookie)
        .send({
          addressId: savedAddressId,
          paymentMethod: 'razorpay',
          couponCode: 'CKOUT15',
          price: 10,
          total: 10
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const order = res.body.data.order;
      expect(order.orderNumber).toMatch(/^SPH-/);
      expect(order.subtotal).toBe(6000); // Authoritative DB price
      expect(order.discount).toBe(900); // 15% of 6,000 = 900
      expect(order.shippingFee).toBe(0); // Subtotal >= 5000 is complimentary
      expect(order.total).toBe(5100); // 6000 - 900 = 5100, not 10!
      expect(order.orderStatus).toBe('pending_payment');
      expect(order.paymentStatus).toBe('pending');
      expect(order.shippingAddressSnapshot.streetAddress).toBe('42 Royal Avenue');
    });

    it('should prevent duplicate submissions via idempotencyKey', async () => {
      const idempotencyKey = 'idem-unique-key-12345';

      // First call
      const res1 = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', customerCookie)
        .send({
          addressId: savedAddressId,
          paymentMethod: 'razorpay',
          idempotencyKey
        });

      expect(res1.status).toBe(201);
      const originalOrderNumber = res1.body.data.order.orderNumber;

      // Duplicate call with same key
      const res2 = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', customerCookie)
        .send({
          addressId: savedAddressId,
          paymentMethod: 'razorpay',
          idempotencyKey
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.isDuplicate).toBe(true);
      expect(res2.body.data.order.orderNumber).toBe(originalOrderNumber);
    });

    it('should reject COD if order total exceeds ₹20,000', async () => {
      // Put expensive evening gown (₹25,000) in cart
      await Cart.findOneAndUpdate(
        { userId: customerUser._id },
        {
          $set: {
            items: [{
              productId: expensiveProduct._id,
              variantSku: 'HEG-NOI-M',
              quantity: 1,
              addedAt: new Date()
            }]
          }
        },
        { upsert: true }
      );

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', customerCookie)
        .send({
          addressId: savedAddressId,
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('COD_LIMIT_EXCEEDED');
    });

    it('should successfully place COD order, deduct stock immediately, and record InventoryMovement', async () => {
      // 1 item of lowStockProduct (quantity: 1, stock: 1)
      await Cart.findOneAndUpdate(
        { userId: customerUser._id },
        {
          $set: {
            items: [{
              productId: lowStockProduct._id,
              variantSku: 'SLB-SND-38',
              quantity: 1,
              addedAt: new Date()
            }]
          }
        },
        { upsert: true }
      );

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', customerCookie)
        .send({
          addressId: savedAddressId,
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      expect(order.orderStatus).toBe('confirmed');
      expect(order.paymentStatus).toBe('pending'); // COD payment is pending until delivery

      // Verify stock was deducted to 0
      const updatedProduct = await Product.findById(lowStockProduct._id);
      const variant = updatedProduct.variants.find(v => v.sku === 'SLB-SND-38');
      expect(variant.stockQuantity).toBe(0);

      // Verify InventoryMovement record created
      const movement = await InventoryMovement.findOne({
        orderId: order._id,
        variantSku: 'SLB-SND-38'
      });
      expect(movement).toBeTruthy();
      expect(movement.quantityChange).toBe(-1);
      expect(movement.reason).toBe('order_placed');

      // Verify user cart was cleared
      const userCart = await Cart.findOne({ userId: customerUser._id });
      expect(userCart.items).toHaveLength(0);
    });
  });

  describe('Order History & Customer Management', () => {
    let placedOrderNumber;

    beforeAll(async () => {
      // Create a confirmed order for customer
      const order = await Order.create({
        orderNumber: 'SPH-CUSTOMER-001',
        userId: customerUser._id,
        items: [{
          productId: inStockProduct._id,
          variantSku: 'SGB-IVY-S',
          name: 'Silk Georgette Blouse',
          size: 'S',
          color: { name: 'Ivory', hexCode: '#FDFBF7' },
          image: 'https://example.com/blouse.jpg',
          unitPrice: 6000,
          quantity: 1,
          lineTotal: 6000
        }],
        shippingAddressSnapshot: {
          fullName: 'Checkout Customer',
          phone: '+91 9876543210',
          streetAddress: '42 Royal Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
          country: 'India'
        },
        subtotal: 6000,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        total: 6000,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'confirmed',
        statusTimeline: [{ status: 'confirmed', timestamp: new Date(), note: 'Order placed' }]
      });
      placedOrderNumber = order.orderNumber;
    });

    it('should list customer order history with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/orders/me')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should fetch single order details by orderNumber', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/me/${placedOrderNumber}`)
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderNumber).toBe(placedOrderNumber);
      expect(res.body.data.order.items).toHaveLength(1);
    });

    it('should prevent other customers from accessing another customer order', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/me/${placedOrderNumber}`)
        .set('Cookie', otherCustomerCookie);

      expect(res.status).toBe(404); // Scoped to req.user._id, not found for other user
    });

    it('should allow customer to cancel confirmed order and restore inventory', async () => {
      // First get current product stock
      const prodBefore = await Product.findById(inStockProduct._id);
      const stockBefore = prodBefore.variants.find(v => v.sku === 'SGB-IVY-S').stockQuantity;

      const res = await request(app)
        .patch(`/api/v1/orders/me/${placedOrderNumber}/cancel`)
        .set('Cookie', customerCookie)
        .send({ reason: 'Changed my styling preference' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('cancelled');

      // Verify stock was restored (+1)
      const prodAfter = await Product.findById(inStockProduct._id);
      const stockAfter = prodAfter.variants.find(v => v.sku === 'SGB-IVY-S').stockQuantity;
      expect(stockAfter).toBe(stockBefore + 1);

      // Verify restoration InventoryMovement
      const movement = await InventoryMovement.findOne({
        orderId: res.body.data.order._id,
        reason: 'order_cancelled'
      });
      expect(movement).toBeTruthy();
      expect(movement.quantityChange).toBe(1);
    });
  });
});

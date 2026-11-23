import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import Order from '../src/models/Order.js';
import Coupon from '../src/models/Coupon.js';
import InventoryMovement from '../src/models/InventoryMovement.js';
import { generateToken } from '../src/utils/token.js';
import { connectTestDB, disconnectTestDB } from './helpers/testDb.js';

describe('Admin Backend API Suite (/api/v1/admin)', () => {
  let isDbConnected = false;
  let adminUser;
  let adminCookie;

  let customerUser;
  let customerCookie;

  let seededCategory;
  let seededProduct;
  let seededOrder;

  beforeAll(async () => {
    const connResult = await connectTestDB();
    isDbConnected = connResult.connected;
    if (!isDbConnected) return;

    // Clean up test data
    await User.deleteMany({ email: /@test-admin\.com$/ });
    await Product.deleteMany({ brand: 'Admin Atelier' });
    await Category.deleteMany({ slug: /^admin-cat/ });
    await Coupon.deleteMany({ code: /^ADM/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Admin/ });

    // 1. Create Admin User
    adminUser = await User.create({
      name: 'Atelier Director',
      email: 'director@test-admin.com',
      passwordHash: await User.hashPassword('AdminPass123!'),
      role: 'admin'
    });
    const adminToken = generateToken({ id: adminUser._id, email: adminUser.email, role: adminUser.role });
    adminCookie = `token=${adminToken}`;

    // 2. Create Regular Customer User
    customerUser = await User.create({
      name: 'Regular Patron',
      email: 'patron@test-admin.com',
      passwordHash: await User.hashPassword('PatronPass123!'),
      role: 'customer'
    });
    const customerToken = generateToken({ id: customerUser._id, email: customerUser.email, role: customerUser.role });
    customerCookie = `token=${customerToken}`;

    // 3. Seed Category
    seededCategory = await Category.create({
      name: 'Admin Test Category',
      slug: 'admin-cat-test',
      description: 'Category for admin tests',
      image: { url: 'https://example.com/cat.jpg' }
    });

    // 4. Seed Product with 2 variants
    seededProduct = await Product.create({
      name: 'Admin Tailored Coat',
      slug: 'admin-tailored-coat',
      description: 'Structured coat crafted for administration tests.',
      categoryId: seededCategory._id,
      brand: 'Admin Atelier',
      gender: 'women',
      images: [{ url: 'https://example.com/coat.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'ATC-BLK-S',
          size: 'S',
          color: { name: 'Noir', hexCode: '#161513' },
          price: 12000,
          stockQuantity: 10,
          isActive: true
        },
        {
          sku: 'ATC-BLK-M',
          size: 'M',
          color: { name: 'Noir', hexCode: '#161513' },
          price: 12000,
          stockQuantity: 3, // Low stock (<= 5)
          isActive: true
        }
      ]
    });

    // 5. Seed Order
    seededOrder = await Order.create({
      orderNumber: `SPH-ADM-${Date.now()}`,
      userId: customerUser._id,
      items: [
        {
          productId: seededProduct._id,
          variantSku: 'ATC-BLK-S',
          name: 'Admin Tailored Coat',
          size: 'S',
          color: { name: 'Noir', hexCode: '#161513' },
          image: 'https://example.com/coat.jpg',
          unitPrice: 12000,
          quantity: 1,
          lineTotal: 12000
        }
      ],
      shippingAddressSnapshot: {
        fullName: 'Admin Order Recipient',
        phone: '+91 9876543210',
        streetAddress: '12 Luxury Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      },
      subtotal: 12000,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: 12000,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      statusTimeline: [{ status: 'confirmed', timestamp: new Date(), note: 'Order confirmed' }]
    });
  });

  afterAll(async () => {
    try {
      if (isDbConnected && mongoose.connection.readyState === 1) {
        await User.deleteMany({ email: /@test-admin\.com$/ });
        await Product.deleteMany({ brand: 'Admin Atelier' });
        await Category.deleteMany({ slug: /^admin-cat/ });
        await Coupon.deleteMany({ code: /^ADM/ });
        await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /Admin/ });
      }
    } finally {
      await disconnectTestDB();
    }
  });

  beforeEach((ctx) => {
    if (mongoose.connection.readyState !== 1 || !isDbConnected || !adminUser) {
      ctx.skip();
    }
  });

  describe('Admin Authorization & Access Control', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/admin/ping');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin customer requests with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow authenticated admin user to access /api/v1/admin/ping', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.role).toBe('admin');
    });
  });

  describe('Product Management (/api/v1/admin/products)', () => {
    let createdProductId;

    it('should list paginated products for admin with stock status', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should create a new product and generate initial inventory movements', async () => {
      const payload = {
        name: 'Fine Silk Kimono',
        description: 'Hand-dyed mulberry silk kimono jacket.',
        categoryId: seededCategory._id.toString(),
        brand: 'Admin Atelier',
        gender: 'unisex',
        tags: ['silk', 'atelier'],
        images: [{ url: 'https://example.com/kimono.jpg', isPrimary: true }],
        variants: [
          {
            sku: 'FSK-GLD-M',
            size: 'M',
            color: { name: 'Gold', hexCode: '#FFD700' },
            price: 18000,
            stockQuantity: 6
          }
        ]
      };

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Cookie', adminCookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdProductId = res.body.data.product._id;
      expect(res.body.data.product.name).toBe('Fine Silk Kimono');

      // Check initial InventoryMovement record created
      const movement = await InventoryMovement.findOne({
        productId: createdProductId,
        variantSku: 'FSK-GLD-M'
      });
      expect(movement).toBeTruthy();
      expect(movement.reason).toBe('initial_creation');
      expect(movement.quantityChange).toBe(6);
    });

    it('should reject product creation if variant SKU is already in use elsewhere', async () => {
      const payload = {
        name: 'Conflicting Garment',
        description: 'Garment with duplicate SKU.',
        categoryId: seededCategory._id.toString(),
        brand: 'Admin Atelier',
        gender: 'women',
        images: [{ url: 'https://example.com/item.jpg', isPrimary: true }],
        variants: [
          {
            sku: 'ATC-BLK-S', // Already belongs to seededProduct!
            size: 'S',
            color: { name: 'Noir', hexCode: '#161513' },
            price: 9000,
            stockQuantity: 2
          }
        ]
      };

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Cookie', adminCookie)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_SKU');
    });

    it('should update product details', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${createdProductId}`)
        .set('Cookie', adminCookie)
        .send({ name: 'Fine Silk Kimono Robe', isFeatured: true });

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('Fine Silk Kimono Robe');
      expect(res.body.data.product.isFeatured).toBe(true);
    });

    it('should delete product permanently', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/products/${createdProductId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const check = await Product.findById(createdProductId);
      expect(check).toBeNull();
    });

    it('should upload image via /api/v1/admin/uploads/image', async () => {
      const res = await request(app)
        .post('/api/v1/admin/uploads/image')
        .set('Cookie', adminCookie)
        .send({ image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...' });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toBeTruthy();
    });
  });

  describe('Category Management (/api/v1/admin/categories)', () => {
    let newCategoryId;

    it('should list categories with product counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/categories')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      const testCat = res.body.data.categories.find((c) => c.slug === 'admin-cat-test');
      expect(testCat).toBeTruthy();
      expect(testCat.productCount).toBeGreaterThanOrEqual(1);
    });

    it('should create new category', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Cookie', adminCookie)
        .send({
          name: 'Admin Handbags',
          slug: 'admin-cat-handbags',
          description: 'Luxury handbags category',
          image: { url: 'https://example.com/bag.jpg' }
        });

      expect(res.status).toBe(201);
      newCategoryId = res.body.data.category._id;
      expect(res.body.data.category.name).toBe('Admin Handbags');
    });

    it('should prevent deletion of category with associated products', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${seededCategory._id}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');
    });

    it('should delete empty category successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${newCategoryId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const check = await Category.findById(newCategoryId);
      expect(check).toBeNull();
    });
  });

  describe('Inventory Management (/api/v1/admin/inventory)', () => {
    it('should fetch inventory overview with low stock alert flags', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.variants)).toBe(true);
      expect(res.body.data.summary.lowStockCount).toBeGreaterThanOrEqual(1);
    });

    it('should manually adjust stock and log immutable audit movement', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/inventory/adjust')
        .set('Cookie', adminCookie)
        .send({
          productId: seededProduct._id.toString(),
          variantSku: 'ATC-BLK-S',
          quantityChange: 5,
          reason: 'restock',
          note: 'Seasonal production batch arrived'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedStock).toBe(15); // 10 + 5 = 15

      // Check InventoryMovement
      const movement = await InventoryMovement.findOne({
        productId: seededProduct._id,
        variantSku: 'ATC-BLK-S',
        reason: 'restock'
      });
      expect(movement).toBeTruthy();
      expect(movement.previousStock).toBe(10);
      expect(movement.newStock).toBe(15);
      expect(movement.quantityChange).toBe(5);
    });

    it('should reject adjustments that would cause negative stock', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/inventory/adjust')
        .set('Cookie', adminCookie)
        .send({
          productId: seededProduct._id.toString(),
          variantSku: 'ATC-BLK-S',
          quantityChange: -100,
          reason: 'damaged_writeoff'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NEGATIVE_STOCK_DISALLOWED');
    });

    it('should list inventory audit movements', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory/movements')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.movements)).toBe(true);
      expect(res.body.data.movements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Order Fulfilment (/api/v1/admin/orders)', () => {
    it('should list all orders with filter options', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('should advance order from confirmed to processing', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${seededOrder._id}/status`)
        .set('Cookie', adminCookie)
        .send({
          orderStatus: 'processing',
          note: 'Allocated to master tailor'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('processing');
    });

    it('should advance order from processing to shipped with carrier and tracking info', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${seededOrder._id}/status`)
        .set('Cookie', adminCookie)
        .send({
          orderStatus: 'shipped',
          carrierName: 'DHL Express Atelier',
          trackingNumber: 'DHL-IN-987654321',
          note: 'Dispatched via climate-controlled courier'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('shipped');
      expect(res.body.data.order.trackingNumber).toBe('DHL-IN-987654321');
    });

    it('should advance order from shipped to delivered', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${seededOrder._id}/status`)
        .set('Cookie', adminCookie)
        .send({ orderStatus: 'delivered', note: 'Customer signed receipt' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('delivered');
    });

    it('should reject invalid backward transition (e.g. delivered to confirmed)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${seededOrder._id}/status`)
        .set('Cookie', adminCookie)
        .send({ orderStatus: 'confirmed' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Coupon Management (/api/v1/admin/coupons)', () => {
    let createdCouponId;

    it('should create a promotional coupon', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Cookie', adminCookie)
        .send({
          code: 'ADMVIP25',
          description: '25% VIP Discount',
          discountType: 'percentage',
          discountValue: 25,
          minOrderAmount: 5000,
          maxDiscountAmount: 3000,
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        });

      expect(res.status).toBe(201);
      createdCouponId = res.body.data.coupon._id;
      expect(res.body.data.coupon.code).toBe('ADMVIP25');
    });

    it('should update coupon details', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/coupons/${createdCouponId}`)
        .set('Cookie', adminCookie)
        .send({ discountValue: 30 });

      expect(res.status).toBe(200);
      expect(res.body.data.coupon.discountValue).toBe(30);
    });

    it('should delete coupon', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/coupons/${createdCouponId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const check = await Coupon.findById(createdCouponId);
      expect(check).toBeNull();
    });
  });

  describe('Analytics & Revenue Aggregations (/api/v1/admin/analytics/summary)', () => {
    it('should return real aggregated revenue, AOV, order totals, and low stock warnings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/summary')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary, lowStockAlerts, recentOrders } = res.body.data;
      expect(summary.totalRevenue).toBeGreaterThanOrEqual(12000);
      expect(summary.totalOrders).toBeGreaterThanOrEqual(1);
      expect(summary.totalCustomers).toBeGreaterThanOrEqual(1);
      expect(summary.totalProducts).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(lowStockAlerts)).toBe(true);
      expect(Array.isArray(recentOrders)).toBe(true);
    });

    it('should support date filters in analytics query', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .get(`/api/v1/admin/analytics/summary?startDate=${futureDate}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalRevenue).toBe(0);
      expect(res.body.data.summary.totalOrders).toBe(0);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import { generateToken } from '../src/utils/token.js';
import { connectTestDB, disconnectTestDB } from './helpers/testDb.js';

describe('Wishlist Backend API (/api/v1/wishlist)', () => {
  let isDbConnected = false;
  let customerUser;
  let customerCookie;
  let otherCustomerUser;
  let otherCustomerCookie;

  let testCategory;
  let testProduct1;
  let testProduct2;
  let inactiveProduct;

  beforeAll(async () => {
    const connResult = await connectTestDB();
    isDbConnected = connResult.connected;
    if (!isDbConnected) {
      return;
    }

    await User.deleteMany({ email: /@test-wishlist\.com$/ });
    await Product.deleteMany({ brand: 'Wishlist Test Atelier' });
    await Category.deleteMany({ slug: 'wishlist-test-category' });

    testCategory = await Category.create({
      name: 'Wishlist Test Category',
      slug: 'wishlist-test-category',
      image: { url: 'https://example.com/category.jpg' }
    });

    customerUser = await User.create({
      name: 'Wishlist Customer',
      email: 'customer@test-wishlist.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const token = generateToken({ id: customerUser._id, email: customerUser.email, role: customerUser.role });
    customerCookie = `token=${token}`;

    otherCustomerUser = await User.create({
      name: 'Other Wishlist Customer',
      email: 'other@test-wishlist.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const otherToken = generateToken({ id: otherCustomerUser._id, email: otherCustomerUser.email, role: otherCustomerUser.role });
    otherCustomerCookie = `token=${otherToken}`;

    testProduct1 = await Product.create({
      name: 'Cashmere Beanie',
      slug: 'cashmere-beanie',
      description: 'Ribbed cashmere beanie.',
      categoryId: testCategory._id,
      brand: 'Wishlist Test Atelier',
      gender: 'unisex',
      images: [{ url: 'https://example.com/beanie.jpg', isPrimary: true }],
      variants: [{
        sku: 'CB-BLK-ONE',
        size: 'One Size',
        color: { name: 'Black', hexCode: '#000000' },
        price: 3200,
        stockQuantity: 10
      }]
    });

    testProduct2 = await Product.create({
      name: 'Silk Twill Square',
      slug: 'silk-twill-square',
      description: 'Hand-screened silk scarf.',
      categoryId: testCategory._id,
      brand: 'Wishlist Test Atelier',
      gender: 'women',
      images: [{ url: 'https://example.com/twill.jpg', isPrimary: true }],
      variants: [{
        sku: 'STS-NAV-ONE',
        size: 'One Size',
        color: { name: 'Navy', hexCode: '#000080' },
        price: 4900,
        stockQuantity: 5
      }]
    });

    inactiveProduct = await Product.create({
      name: 'Archived Belt',
      slug: 'archived-belt',
      description: 'Archived collection.',
      categoryId: testCategory._id,
      brand: 'Wishlist Test Atelier',
      gender: 'men',
      isActive: false,
      variants: [{
        sku: 'AB-BRN-32',
        size: '32',
        color: { name: 'Brown', hexCode: '#8B4513' },
        price: 2500,
        stockQuantity: 2
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
        await User.deleteMany({ email: /@test-wishlist\.com$/ });
        await Product.deleteMany({ brand: 'Wishlist Test Atelier' });
        await Category.deleteMany({ slug: 'wishlist-test-category' });
      }
    } finally {
      await disconnectTestDB();
    }
  });

  describe('GET /api/v1/wishlist', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/wishlist');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return empty wishlist for fresh user', async () => {
      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.wishlist).toEqual([]);
      expect(res.body.data.totalItems).toBe(0);
    });
  });

  describe('POST /api/v1/wishlist/items', () => {
    it('should reject adding non-existent product ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Cookie', customerCookie)
        .send({ productId: fakeId });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should reject adding inactive product', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Cookie', customerCookie)
        .send({ productId: inactiveProduct._id.toString() });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should successfully add active product to wishlist and populate product details', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Cookie', customerCookie)
        .send({ productId: testProduct1._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.wishlist).toHaveLength(1);
      expect(res.body.data.wishlist[0].name).toBe('Cashmere Beanie');
      expect(res.body.data.wishlist[0].slug).toBe('cashmere-beanie');
      expect(res.body.data.totalItems).toBe(1);
    });

    it('should prevent duplicate wishlist entries idempotently ($addToSet)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Cookie', customerCookie)
        .send({ productId: testProduct1._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist).toHaveLength(1);
      expect(res.body.data.totalItems).toBe(1);
    });

    it('should add multiple distinct products', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Cookie', customerCookie)
        .send({ productId: testProduct2._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist).toHaveLength(2);
      expect(res.body.data.totalItems).toBe(2);
    });
  });

  describe('DELETE /api/v1/wishlist/items/:productId', () => {
    it('should remove product from customer wishlist', async () => {
      const res = await request(app)
        .delete(`/api/v1/wishlist/items/${testProduct1._id.toString()}`)
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist).toHaveLength(1);
      expect(res.body.data.wishlist[0]._id.toString()).toBe(testProduct2._id.toString());
    });
  });

  describe('Wishlist Ownership Isolation', () => {
    it('should not expose one user’s wishlist to another user', async () => {
      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Cookie', otherCustomerCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist).toHaveLength(0);
    });
  });
});

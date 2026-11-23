import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import { connectTestDB, disconnectTestDB } from './helpers/testDb.js';

describe('Product Catalogue & Taxonomy API (/api/v1/products & /api/v1/categories)', () => {
  let isDbConnected = false;
  let testCategory;
  let testProduct;

  beforeAll(async () => {
    const connResult = await connectTestDB();
    isDbConnected = connResult.connected;
    if (!isDbConnected) {
      return;
    }

    // Clean up test data
    await Product.deleteMany({ brand: 'Test Atelier Co' });
    await Category.deleteMany({ slug: 'test-catalogue-category' });

    // Seed test category
    testCategory = await Category.create({
      name: 'Test Catalogue Category',
      slug: 'test-catalogue-category',
      description: 'Category for catalog integration tests',
      image: { url: 'https://example.com/category.jpg' }
    });

    // Seed test product with variants
    testProduct = await Product.create({
      name: 'Double Cashmere Tailored Trench',
      slug: 'double-cashmere-tailored-trench',
      description: 'Superb cashmere trench with horn buttons.',
      categoryId: testCategory._id,
      brand: 'Test Atelier Co',
      gender: 'unisex',
      tags: ['cashmere', 'trench', 'luxury'],
      images: [{ url: 'https://example.com/coat.jpg', isPrimary: true }],
      variants: [
        { sku: 'TEST-CSH-CAM-S', size: 'S', color: { name: 'Camel', hexCode: '#C8B293' }, price: 15000, compareAtPrice: 19000, stockQuantity: 5 },
        { sku: 'TEST-CSH-CAM-M', size: 'M', color: { name: 'Camel', hexCode: '#C8B293' }, price: 15000, compareAtPrice: 19000, stockQuantity: 10 },
        { sku: 'TEST-CSH-BLK-M', size: 'M', color: { name: 'Black', hexCode: '#161513' }, price: 16000, compareAtPrice: null, stockQuantity: 0 } // Out of stock
      ],
      totalSalesCount: 15,
      averageRating: 4.8
    });

    // Seed secondary product for sorting and pagination
    await Product.create({
      name: 'Fine Wool Pleated Trousers',
      slug: 'fine-wool-pleated-trousers',
      description: 'Classic high-rise trousers.',
      categoryId: testCategory._id,
      brand: 'Test Atelier Co',
      gender: 'men',
      tags: ['wool', 'trousers'],
      images: [{ url: 'https://example.com/trousers.jpg', isPrimary: true }],
      variants: [
        { sku: 'TEST-TRS-32', size: '32', color: { name: 'Black', hexCode: '#161513' }, price: 6000, stockQuantity: 8 }
      ],
      totalSalesCount: 30,
      averageRating: 4.6
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
        await Product.deleteMany({ brand: 'Test Atelier Co' });
        await Category.deleteMany({ slug: 'test-catalogue-category' });
      }
    } finally {
      await disconnectTestDB();
    }
  });

  describe('GET /api/v1/categories', () => {
    it('should return list of active categories with accurate productCount', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);

      const found = res.body.data.categories.find(c => c.slug === testCategory.slug);
      expect(found).toBeDefined();
      expect(found.productCount).toBe(2);
    });
  });

  describe('GET /api/v1/products', () => {
    it('should list products with pagination metadata', async () => {
      const res = await request(app).get('/api/v1/products?limit=1&page=1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should search products by text query across title/brand/tags', async () => {
      const res = await request(app).get('/api/v1/products?search=cashmere');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.products[0].name).toContain('Cashmere');
    });

    it('should filter products by category slug', async () => {
      const res = await request(app).get(`/api/v1/products?category=${testCategory.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.every(p => p.category.slug === testCategory.slug)).toBe(true);
    });

    it('should filter by size', async () => {
      const res = await request(app).get(`/api/v1/products?category=${testCategory.slug}&size=S`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe(testProduct.name);
    });

    it('should filter by price range', async () => {
      const res = await request(app).get(`/api/v1/products?category=${testCategory.slug}&minPrice=10000&maxPrice=20000`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].priceRange.min).toBe(15000);
    });

    it('should sort products deterministically by price ascending', async () => {
      const res = await request(app).get(`/api/v1/products?category=${testCategory.slug}&sort=price_asc`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const prices = res.body.data.products.map(p => p.priceRange.min);
      expect(prices[0]).toBeLessThanOrEqual(prices[1]);
    });

    it('should sort products by popularity based on verified sales volume', async () => {
      const res = await request(app).get(`/api/v1/products?category=${testCategory.slug}&sort=popular`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Trousers has 30 sales, Trench has 15 sales -> Trousers should be first
      expect(res.body.data.products[0].slug).toBe('fine-wool-pleated-trousers');
    });

    it('should reject invalid query where maxPrice is lower than minPrice', async () => {
      const res = await request(app).get('/api/v1/products?minPrice=5000&maxPrice=2000');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/products/:slug', () => {
    it('should return complete product details and variant matrix for valid slug', async () => {
      const res = await request(app).get(`/api/v1/products/${testProduct.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const prod = res.body.data.product;
      expect(prod.slug).toBe(testProduct.slug);
      expect(prod.variants.length).toBe(3);
      expect(prod.availableSizes).toContain('S');
      expect(prod.availableColors.some(c => c.name === 'Camel')).toBe(true);
      expect(prod.inStock).toBe(true);
    });

    it('should return 404 for unknown product slug', async () => {
      const res = await request(app).get('/api/v1/products/non-existent-luxury-item');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('GET /api/v1/categories/:slug/products', () => {
    it('should return products filtered by the route category slug', async () => {
      const res = await request(app).get(`/api/v1/categories/${testCategory.slug}/products`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBe(2);
    });

    it('should return 404 for non-existent category slug', async () => {
      const res = await request(app).get('/api/v1/categories/unknown-category-slug/products');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });
});

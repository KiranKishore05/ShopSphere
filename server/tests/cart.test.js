import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import Cart from '../src/models/Cart.js';
import { generateToken } from '../src/utils/token.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shopsphere_test';

describe('Cart Backend API (/api/v1/cart)', () => {
  let customerUser;
  let customerToken;
  let customerCookie;

  let otherCustomerUser;
  let otherCustomerCookie;

  let testCategory;
  let inStockProduct;
  let outOfStockProduct;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    }

    // Clean up collections
    await User.deleteMany({ email: /@test-cart\.com$/ });
    await Product.deleteMany({ brand: 'Cart Test Atelier' });
    await Category.deleteMany({ slug: 'cart-test-category' });

    // Seed test category
    testCategory = await Category.create({
      name: 'Cart Test Category',
      slug: 'cart-test-category',
      description: 'Cart category',
      image: { url: 'https://example.com/category.jpg' }
    });

    // Seed customer 1
    customerUser = await User.create({
      name: 'Cart Customer',
      email: 'customer@test-cart.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    customerToken = generateToken({ id: customerUser._id, email: customerUser.email, role: customerUser.role });
    customerCookie = `token=${customerToken}`;

    // Seed customer 2 (for cart isolation tests)
    otherCustomerUser = await User.create({
      name: 'Other Customer',
      email: 'other@test-cart.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const otherToken = generateToken({ id: otherCustomerUser._id, email: otherCustomerUser.email, role: otherCustomerUser.role });
    otherCustomerCookie = `token=${otherToken}`;

    await Cart.deleteMany({ userId: { $in: [customerUser._id, otherCustomerUser._id] } });

    // Seed in-stock product with variants
    inStockProduct = await Product.create({
      name: 'Merino Wool Cardigan',
      slug: 'merino-wool-cardigan',
      description: 'Finest merino wool knit cardigan.',
      categoryId: testCategory._id,
      brand: 'Cart Test Atelier',
      gender: 'women',
      images: [{ url: 'https://example.com/cardigan.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'MWC-IVO-S',
          size: 'S',
          color: { name: 'Ivory', hexCode: '#FDFBF7' },
          price: 4500,
          compareAtPrice: 5500,
          stockQuantity: 4,
          isActive: true
        },
        {
          sku: 'MWC-IVO-M',
          size: 'M',
          color: { name: 'Ivory', hexCode: '#FDFBF7' },
          price: 4500,
          compareAtPrice: 5500,
          stockQuantity: 8,
          isActive: true
        }
      ]
    });

    // Seed out-of-stock product
    outOfStockProduct = await Product.create({
      name: 'Silk Georgette Scarf',
      slug: 'silk-georgette-scarf',
      description: 'Hand-rolled silk scarf.',
      categoryId: testCategory._id,
      brand: 'Cart Test Atelier',
      gender: 'unisex',
      images: [{ url: 'https://example.com/scarf.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'SGS-ONE-RED',
          size: 'One Size',
          color: { name: 'Crimson', hexCode: '#990000' },
          price: 2200,
          stockQuantity: 0,
          isActive: true
        }
      ]
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-cart\.com$/ });
    await Product.deleteMany({ brand: 'Cart Test Atelier' });
    await Category.deleteMany({ slug: 'cart-test-category' });
    await Cart.deleteMany({});
  });

  describe('GET /api/v1/cart', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/cart');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return empty cart data for newly authenticated customer', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.items).toEqual([]);
      expect(res.body.data.cart.subtotal).toBe(0);
      expect(res.body.data.cart.totalItems).toBe(0);
      expect(res.body.data.cart.isEligibleForFreeShipping).toBe(false);
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('should reject adding item with invalid or non-existent product ID', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: new mongoose.Types.ObjectId().toString(),
          variantSku: 'MWC-IVO-S',
          quantity: 1
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should reject adding item when SKU does not match product variants', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: inStockProduct._id.toString(),
          variantSku: 'NONEXISTENT-SKU',
          quantity: 1
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VARIANT_NOT_FOUND');
    });

    it('should reject adding item when requested quantity exceeds available stock', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: inStockProduct._id.toString(),
          variantSku: 'MWC-IVO-S', // Has 4 units in stock
          quantity: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should reject adding an item that is completely out of stock', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: outOfStockProduct._id.toString(),
          variantSku: 'SGS-ONE-RED',
          quantity: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should successfully add valid in-stock variant to cart and calculate server-side totals', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: inStockProduct._id.toString(),
          variantSku: 'MWC-IVO-S',
          quantity: 2,
          // Intentionally send tampered client prices to verify they are ignored
          price: 1,
          subtotal: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { cart } = res.body.data;
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].variantSku).toBe('MWC-IVO-S');
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].price).toBe(4500); // Live DB price, not 1!
      expect(cart.items[0].itemTotal).toBe(9000);
      expect(cart.subtotal).toBe(9000);
      expect(cart.totalItems).toBe(2);
      expect(cart.isEligibleForFreeShipping).toBe(true); // >= 5000
    });

    it('should increase quantity when adding same SKU again, guarding against stock limit', async () => {
      // Current cart has 2 units, max stock is 4
      // Adding 3 more would bring total to 5 > 4 (should fail)
      const failRes = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: inStockProduct._id.toString(),
          variantSku: 'MWC-IVO-S',
          quantity: 3
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Adding 1 more brings total to 3 <= 4 (should succeed)
      const successRes = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: inStockProduct._id.toString(),
          variantSku: 'MWC-IVO-S',
          quantity: 1
        });

      expect(successRes.status).toBe(200);
      expect(successRes.body.data.cart.items[0].quantity).toBe(3);
      expect(successRes.body.data.cart.subtotal).toBe(13500);
    });
  });

  describe('PATCH /api/v1/cart/items/:itemSku', () => {
    it('should update line item quantity within stock limits', async () => {
      const res = await request(app)
        .patch('/api/v1/cart/items/MWC-IVO-S')
        .set('Cookie', customerCookie)
        .send({ quantity: 4 }); // 4 is max available

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items[0].quantity).toBe(4);
      expect(res.body.data.cart.subtotal).toBe(18000);
    });

    it('should reject updating quantity beyond stock limit', async () => {
      const res = await request(app)
        .patch('/api/v1/cart/items/MWC-IVO-S')
        .set('Cookie', customerCookie)
        .send({ quantity: 5 }); // Stock is 4

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should remove item from cart if updated quantity is 0', async () => {
      const res = await request(app)
        .patch('/api/v1/cart/items/MWC-IVO-S')
        .set('Cookie', customerCookie)
        .send({ quantity: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items).toHaveLength(0);
      expect(res.body.data.cart.subtotal).toBe(0);
      expect(res.body.data.cart.totalItems).toBe(0);
    });
  });

  describe('DELETE /api/v1/cart/items/:itemSku', () => {
    it('should remove requested SKU from cart', async () => {
      // Re-add item first
      await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: inStockProduct._id.toString(),
          variantSku: 'MWC-IVO-M',
          quantity: 1
        });

      const deleteRes = await request(app)
        .delete('/api/v1/cart/items/MWC-IVO-M')
        .set('Cookie', customerCookie);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.cart.items).toHaveLength(0);
      expect(deleteRes.body.data.cart.subtotal).toBe(0);
    });
  });

  describe('Cart Ownership & Isolation', () => {
    it('should ensure Customer B cannot see Customer A items in their cart', async () => {
      // Customer A adds item
      await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', customerCookie)
        .send({
          productId: inStockProduct._id.toString(),
          variantSku: 'MWC-IVO-M',
          quantity: 2
        });

      // Customer B fetches cart
      const resOther = await request(app)
        .get('/api/v1/cart')
        .set('Cookie', otherCustomerCookie);

      expect(resOther.status).toBe(200);
      expect(resOther.body.data.cart.items).toHaveLength(0);
      expect(resOther.body.data.cart.subtotal).toBe(0);
    });
  });
});

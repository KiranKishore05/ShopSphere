import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import Order from '../src/models/Order.js';
import Review from '../src/models/Review.js';
import { generateToken } from '../src/utils/token.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shopsphere_test';

describe('Phase 8: Reviews, Ratings, Search & Suggestions Backend Suite', () => {
  let adminUser;
  let adminCookie;

  let verifiedCustomer;
  let verifiedCustomerCookie;

  let unverifiedCustomer;
  let unverifiedCustomerCookie;

  let testCategory;
  let testProduct;
  let deliveredOrder;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    }

    // Clean test collections
    await User.deleteMany({ email: /@test-review\.com$/ });
    await Product.deleteMany({ brand: 'Review Atelier' });
    await Category.deleteMany({ slug: /^review-cat/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /ReviewClient/ });
    await Review.deleteMany({});

    // 1. Admin User
    adminUser = await User.create({
      name: 'Review Overseer',
      email: 'overseer@test-review.com',
      passwordHash: await User.hashPassword('AdminPass123!'),
      role: 'admin'
    });
    const adminToken = generateToken({ id: adminUser._id, email: adminUser.email, role: adminUser.role });
    adminCookie = `token=${adminToken}`;

    // 2. Verified Customer (will have a delivered order)
    verifiedCustomer = await User.create({
      name: 'Delighted Patron',
      email: 'patron@test-review.com',
      passwordHash: await User.hashPassword('ClientPass123!'),
      role: 'customer'
    });
    const verifiedToken = generateToken({ id: verifiedCustomer._id, email: verifiedCustomer.email, role: verifiedCustomer.role });
    verifiedCustomerCookie = `token=${verifiedToken}`;

    // 3. Unverified Customer (has no delivered order)
    unverifiedCustomer = await User.create({
      name: 'Browsing Visitor',
      email: 'visitor@test-review.com',
      passwordHash: await User.hashPassword('ClientPass123!'),
      role: 'customer'
    });
    const unverifiedToken = generateToken({ id: unverifiedCustomer._id, email: unverifiedCustomer.email, role: unverifiedCustomer.role });
    unverifiedCustomerCookie = `token=${unverifiedToken}`;

    // 4. Test Category & Product
    testCategory = await Category.create({
      name: 'Couture Knitwear',
      slug: 'review-cat-knitwear',
      description: 'Finely spun silk and merino knits.',
      image: { url: 'https://images.example.com/cat-knit.jpg' },
      isActive: true
    });

    testProduct = await Product.create({
      name: 'Merino Ribbed Turtleneck',
      slug: 'merino-ribbed-turtleneck',
      description: 'Sculpted form turtleneck woven from extrafine merino wool fibers.',
      categoryId: testCategory._id,
      brand: 'Review Atelier',
      gender: 'women',
      tags: ['knitwear', 'merino', 'autumn', 'turtleneck'],
      images: [{ url: 'https://images.example.com/knit.jpg', isPrimary: true }],
      variants: [
        {
          sku: 'REV-KNT-OAT-S',
          size: 'S',
          color: { name: 'Oatmeal', hexCode: '#D8C7B5' },
          price: 8500,
          stockQuantity: 15,
          isActive: true
        }
      ],
      averageRating: 0,
      reviewCount: 0,
      isActive: true
    });

    // 5. Create Delivered Order for verifiedCustomer containing testProduct
    deliveredOrder = await Order.create({
      orderNumber: 'REV-ORD-DELIVERED-001',
      userId: verifiedCustomer._id,
      items: [
        {
          productId: testProduct._id,
          variantSku: 'REV-KNT-OAT-S',
          name: 'Merino Ribbed Turtleneck',
          size: 'S',
          color: { name: 'Oatmeal', hexCode: '#D8C7B5' },
          image: 'https://images.example.com/knit.jpg',
          unitPrice: 8500,
          quantity: 1,
          lineTotal: 8500
        }
      ],
      shippingAddressSnapshot: {
        fullName: 'ReviewClient Patron',
        phone: '9876543210',
        streetAddress: '12 Boulevard Saint-Germain',
        city: 'Paris',
        state: 'Île-de-France',
        postalCode: '75005',
        country: 'France'
      },
      subtotal: 8500,
      total: 8500,
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-review\.com$/ });
    await Product.deleteMany({ brand: 'Review Atelier' });
    await Category.deleteMany({ slug: /^review-cat/ });
    await Order.deleteMany({ 'shippingAddressSnapshot.fullName': /ReviewClient/ });
    await Review.deleteMany({});
  });

  // 1. Eligibility Check Endpoint
  describe('Review Eligibility Check (GET /api/v1/reviews/eligibility/:productId)', () => {
    it('returns isEligible: true for customer with a delivered order', async () => {
      const res = await request(app)
        .get(`/api/v1/reviews/eligibility/${testProduct._id}`)
        .set('Cookie', verifiedCustomerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isEligible).toBe(true);
      expect(res.body.data.canReview).toBe(true);
      expect(res.body.data.hasReviewed).toBe(false);
      expect(res.body.data.deliveredOrder.orderNumber).toBe('REV-ORD-DELIVERED-001');
    });

    it('returns isEligible: false for customer without a delivered order', async () => {
      const res = await request(app)
        .get(`/api/v1/reviews/eligibility/${testProduct._id}`)
        .set('Cookie', unverifiedCustomerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isEligible).toBe(false);
      expect(res.body.data.canReview).toBe(false);
      expect(res.body.data.hasReviewed).toBe(false);
    });

    it('denies unauthenticated visitors with 401', async () => {
      const res = await request(app)
        .get(`/api/v1/reviews/eligibility/${testProduct._id}`);

      expect(res.status).toBe(401);
    });
  });

  // 2. Review Submission and Purchase Verification
  describe('Customer Review Submission (POST /api/v1/products/:productId/reviews)', () => {
    it('rejects review submission from unverified customer with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/reviews`)
        .set('Cookie', unverifiedCustomerCookie)
        .send({
          rating: 5,
          title: 'Unverified Praise',
          comment: 'I did not buy this but it looks marvelous on models.'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('REVIEW_ELIGIBILITY_FAILED');
    });

    it('successfully creates verified review from eligible customer and recalculates product rating', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/reviews`)
        .set('Cookie', verifiedCustomerCookie)
        .send({
          rating: 5,
          title: 'Impeccable Silhouette & Softness',
          comment: 'The drape and hand-feel of this merino wool is unrivaled in winter layering.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.review.isVerifiedPurchase).toBe(true);
      expect(res.body.data.productStats.averageRating).toBe(5);
      expect(res.body.data.productStats.reviewCount).toBe(1);

      // Verify Product in database has updated stats
      const productInDb = await Product.findById(testProduct._id);
      expect(productInDb.averageRating).toBe(5);
      expect(productInDb.reviewCount).toBe(1);
    });

    it('rejects duplicate review from the same customer with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/reviews`)
        .set('Cookie', verifiedCustomerCookie)
        .send({
          rating: 4,
          title: 'Duplicate review attempt',
          comment: 'Attempting to publish a second review for the same item.'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_REVIEW');
    });

    it('validates rating bounds (rejects rating outside 1–5)', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/reviews`)
        .set('Cookie', verifiedCustomerCookie)
        .send({
          rating: 7,
          title: 'Invalid Rating',
          comment: 'This rating is out of allowed range.'
        });

      expect(res.status).toBe(400);
    });
  });

  // 3. Public Review Retrieval & Rating Distribution
  describe('Public Reviews Listing (GET /api/v1/products/:productId/reviews)', () => {
    it('returns published reviews with rating breakdown and verified purchase badges', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProduct._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviews.length).toBe(1);
      expect(res.body.data.reviews[0].userName).toBe('Delighted Patron');
      expect(res.body.data.reviews[0].isVerifiedPurchase).toBe(true);

      // Summary breakdown verification
      expect(res.body.data.summary.averageRating).toBe(5);
      expect(res.body.data.summary.totalReviews).toBe(1);
      expect(res.body.data.summary.breakdown['5'].count).toBe(1);
      expect(res.body.data.summary.breakdown['5'].percentage).toBe(100);
    });

    it('resolves product reviews by slug as well as by ObjectId', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProduct.slug}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBe(1);
    });
  });

  // 4. Customer Review Modification & Ownership Guard
  describe('Customer Review Edit (PATCH /api/v1/reviews/:id)', () => {
    let createdReview;

    beforeAll(async () => {
      createdReview = await Review.findOne({ productId: testProduct._id, userId: verifiedCustomer._id });
    });

    it('prevents another customer from editing this review with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/reviews/${createdReview._id}`)
        .set('Cookie', unverifiedCustomerCookie)
        .send({
          rating: 1,
          title: 'Unauthorized Tampering',
          comment: 'Trying to alter another client’s review.'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_REVIEW_MODIFICATION');
    });

    it('allows author to edit their own review and recalculates rating stats', async () => {
      const res = await request(app)
        .patch(`/api/v1/reviews/${createdReview._id}`)
        .set('Cookie', verifiedCustomerCookie)
        .send({
          rating: 4,
          title: 'Revised: Magnificent but hand-wash only',
          comment: 'Wears wonderfully, just requires delicate washing.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.rating).toBe(4);

      // Check recalculated product rating in DB
      const productInDb = await Product.findById(testProduct._id);
      expect(productInDb.averageRating).toBe(4);
      expect(productInDb.reviewCount).toBe(1);
    });
  });

  // 5. Admin Review Moderation
  describe('Admin Review Moderation (GET & PATCH & DELETE /api/v1/admin/reviews)', () => {
    let reviewToModerate;

    beforeAll(async () => {
      reviewToModerate = await Review.findOne({ productId: testProduct._id });
    });

    it('blocks regular customers from administrative review moderation with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reviews')
        .set('Cookie', verifiedCustomerCookie);

      expect(res.status).toBe(403);
    });

    it('allows admin to list reviews with status counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reviews')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.counts.approved).toBeGreaterThanOrEqual(1);
    });

    it('allows admin to feature a review', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reviews/${reviewToModerate._id}/moderation`)
        .set('Cookie', adminCookie)
        .send({ isFeatured: true });

      expect(res.status).toBe(200);
      expect(res.body.data.review.isFeatured).toBe(true);
    });

    it('allows admin to reject an abusive review and excludes it from public average', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reviews/${reviewToModerate._id}/moderation`)
        .set('Cookie', adminCookie)
        .send({ status: 'rejected' });

      expect(res.status).toBe(200);
      expect(res.body.data.review.status).toBe('rejected');

      // Verify product rating recalculates excluding rejected review
      const productInDb = await Product.findById(testProduct._id);
      expect(productInDb.reviewCount).toBe(0);
      expect(productInDb.averageRating).toBe(0);
    });

    it('allows admin to re-approve a review', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reviews/${reviewToModerate._id}/moderation`)
        .set('Cookie', adminCookie)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.data.review.status).toBe('approved');

      const productInDb = await Product.findById(testProduct._id);
      expect(productInDb.reviewCount).toBe(1);
    });
  });

  // 6. Search Suggestions & Full-Text Search
  describe('Full-Text Search & Search Suggestions (/api/v1/products/search/suggestions)', () => {
    it('returns empty suggestions for blank query', async () => {
      const res = await request(app)
        .get('/api/v1/products/search/suggestions?q=');

      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
      expect(res.body.data.categories).toEqual([]);
      expect(res.body.data.totalCount).toBe(0);
    });

    it('returns matching products and categories for search term "knit"', async () => {
      const res = await request(app)
        .get('/api/v1/products/search/suggestions?q=knit');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.products[0].name).toContain('Turtleneck');
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.categories[0].name).toBe('Couture Knitwear');
      expect(res.body.data.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('supports sorting by rating and relevance in product catalogue', async () => {
      const res = await request(app)
        .get('/api/v1/products?search=Merino&sort=rating');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 7. Customer Review Deletion & Recalculation
  describe('Review Deletion & Recalculation (DELETE /api/v1/reviews/:id)', () => {
    it('allows author to delete review and zeroes out product rating when empty', async () => {
      const review = await Review.findOne({ productId: testProduct._id });

      const res = await request(app)
        .delete(`/api/v1/reviews/${review._id}`)
        .set('Cookie', verifiedCustomerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const productInDb = await Product.findById(testProduct._id);
      expect(productInDb.reviewCount).toBe(0);
      expect(productInDb.averageRating).toBe(0);
    });
  });
});

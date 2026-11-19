import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Coupon from '../src/models/Coupon.js';
import Order from '../src/models/Order.js';
import EmailOutbox from '../src/models/EmailOutbox.js';
import { generateToken } from '../src/utils/token.js';
import { consumeOrderCoupon, releaseOrderCoupon } from '../src/services/couponService.js';

describe('Phase 5.7: Admin Coupon Management Suite (/api/v1/admin/coupons)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const sampleCouponId = new mongoose.Types.ObjectId();
  const sampleOrderId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  const csrfHeaders = {
    Origin: 'http://localhost:5173',
    'X-Requested-With': 'XMLHttpRequest'
  };

  const mockAdminUser = {
    _id: adminId,
    name: 'Atelier Director',
    email: 'admin@shopsphere.com',
    role: 'admin',
    isActive: true
  };

  const mockCustomer = {
    _id: customerId,
    name: 'Customer Patron',
    email: 'customer@shopsphere.com',
    role: 'customer',
    isActive: true
  };

  const sampleCoupon = {
    _id: sampleCouponId,
    code: 'FESTIVE25',
    discountType: 'percentage',
    discountValue: 25,
    minOrderValue: 2000,
    maxDiscountAmount: 1000,
    startDate: new Date('2026-11-01T00:00:00Z'),
    expiryDate: new Date('2026-12-31T23:59:59Z'),
    usageLimit: 100,
    usedCount: 0,
    perUserLimit: 1,
    isActive: true,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z')
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      let foundUser = null;
      if (idStr === adminId.toString()) foundUser = { ...mockAdminUser };
      else if (idStr === customerId.toString()) foundUser = { ...mockCustomer };

      return {
        ...foundUser,
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(foundUser)
      };
    });

    vi.spyOn(Coupon, 'updateOne').mockResolvedValue({ acknowledged: true });
    vi.spyOn(EmailOutbox.prototype, 'save').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Access Control & Authentication', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/admin/coupons');
      expect(res.status).toBe(401);
    });

    it('should reject non-admin customer with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/coupons')
        .set('Cookie', [`token=${customerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/coupons - Directory & KPIs', () => {
    it('should list coupons with summary KPIs and pagination metadata', async () => {
      const mockCoupons = [
        sampleCoupon,
        {
          _id: new mongoose.Types.ObjectId(),
          code: 'EXPIRED10',
          discountType: 'fixed',
          discountValue: 500,
          minOrderValue: 1500,
          startDate: new Date('2026-01-01T00:00:00Z'),
          expiryDate: new Date('2026-06-01T00:00:00Z'),
          usageLimit: 50,
          usedCount: 15,
          perUserLimit: 1,
          isActive: true
        }
      ];

      vi.spyOn(Coupon, 'find').mockImplementation((query) => {
        if (!query) {
          // All coupons call for summary
          return {
            select: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockCoupons)
            })
          };
        }
        return {
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue(mockCoupons)
              })
            })
          })
        };
      });

      vi.spyOn(Coupon, 'countDocuments').mockResolvedValue(2);

      const res = await request(app)
        .get('/api/v1/admin/coupons?page=1&limit=10')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coupons).toHaveLength(2);
      expect(res.body.data.summary.totalCoupons).toBe(2);
      expect(res.body.data.summary.totalRedemptions).toBe(15);
      expect(res.body.data.meta.totalPages).toBe(1);
    });

    it('should search coupons by uppercase code', async () => {
      vi.spyOn(Coupon, 'find').mockImplementation((query) => {
        if (!query) {
          return { select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([sampleCoupon]) }) };
        }
        expect(query.code).toBeDefined();
        return {
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([sampleCoupon])
              })
            })
          })
        };
      });
      vi.spyOn(Coupon, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/coupons?search=festive')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.coupons[0].code).toBe('FESTIVE25');
    });
  });

  describe('POST /api/v1/admin/coupons - Creation & Validation', () => {
    it('should create a valid coupon successfully', async () => {
      vi.spyOn(Coupon, 'findOne').mockResolvedValue(null);
      vi.spyOn(Coupon, 'create').mockResolvedValue({
        ...sampleCoupon,
        code: 'WELCOME50'
      });

      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders)
        .send({
          code: 'welcome50',
          discountType: 'percentage',
          discountValue: 50,
          minOrderValue: 1000,
          maxDiscountAmount: 500,
          startDate: '2026-11-10T00:00:00Z',
          expiryDate: '2026-12-31T23:59:59Z',
          usageLimit: 200,
          perUserLimit: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coupon.code).toBe('WELCOME50');
    });

    it('should reject coupon with percentage discount > 100%', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders)
        .send({
          code: 'OVER100',
          discountType: 'percentage',
          discountValue: 105,
          minOrderValue: 500,
          startDate: '2026-11-10T00:00:00Z',
          expiryDate: '2026-12-31T23:59:59Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject coupon where expiryDate <= startDate', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders)
        .send({
          code: 'BACKWARDTIME',
          discountType: 'fixed',
          discountValue: 200,
          minOrderValue: 1000,
          startDate: '2026-12-31T00:00:00Z',
          expiryDate: '2026-11-10T00:00:00Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate coupon code with 409 DUPLICATE_COUPON_CODE', async () => {
      vi.spyOn(Coupon, 'findOne').mockResolvedValue(sampleCoupon);

      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders)
        .send({
          code: 'FESTIVE25',
          discountType: 'percentage',
          discountValue: 20,
          minOrderValue: 1000,
          startDate: '2026-11-10T00:00:00Z',
          expiryDate: '2026-12-31T23:59:59Z'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_COUPON_CODE');
    });
  });

  describe('PATCH /api/v1/admin/coupons/:id - Updating', () => {
    it('should update coupon details successfully', async () => {
      const couponDoc = {
        ...sampleCoupon,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(Coupon, 'findById').mockResolvedValue(couponDoc);
      vi.spyOn(Coupon, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/v1/admin/coupons/${sampleCouponId}`)
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders)
        .send({
          discountValue: 30,
          maxDiscountAmount: 1200
        });

      expect(res.status).toBe(200);
      expect(couponDoc.save).toHaveBeenCalled();
    });

    it('should reject duplicate code when editing another coupon', async () => {
      const couponDoc = {
        ...sampleCoupon,
        code: 'OLDCODE',
        save: vi.fn()
      };
      vi.spyOn(Coupon, 'findById').mockResolvedValue(couponDoc);
      vi.spyOn(Coupon, 'findOne').mockResolvedValue({ _id: new mongoose.Types.ObjectId(), code: 'TAKENCODE' });

      const res = await request(app)
        .patch(`/api/v1/admin/coupons/${sampleCouponId}`)
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders)
        .send({
          code: 'TAKENCODE'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_COUPON_CODE');
    });
  });

  describe('DELETE /api/v1/admin/coupons/:id - Safe Deletion Guards', () => {
    it('should block deletion with 400 CANNOT_DELETE_REDEEMED_COUPON if linked to orders', async () => {
      vi.spyOn(Coupon, 'findById').mockResolvedValue(sampleCoupon);
      vi.spyOn(Order, 'countDocuments').mockResolvedValue(3); // 3 historical orders redeemed

      const res = await request(app)
        .delete(`/api/v1/admin/coupons/${sampleCouponId}`)
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DELETE_REDEEMED_COUPON');
      expect(res.body.error.message).toContain('historical order');
    });

    it('should allow deletion if coupon has 0 historical redemptions', async () => {
      vi.spyOn(Coupon, 'findById').mockResolvedValue(sampleCoupon);
      vi.spyOn(Order, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(Coupon, 'findByIdAndDelete').mockResolvedValue(sampleCoupon);

      const res = await request(app)
        .delete(`/api/v1/admin/coupons/${sampleCouponId}`)
        .set('Cookie', [`token=${adminToken}`])
        .set(csrfHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('deleted successfully');
    });
  });

  describe('Per-Customer Usage Limit Regression Suite (POST /api/v1/coupons/apply)', () => {
    it('should allow coupon application if past COD order was cancelled', async () => {
      vi.spyOn(Coupon, 'findOne').mockResolvedValue({
        ...sampleCoupon,
        perUserLimit: 1
      });

      let capturedOrderCountQuery = null;
      vi.spyOn(Order, 'countDocuments').mockImplementation((query) => {
        capturedOrderCountQuery = query;
        return Promise.resolve(0); // 0 eligible completed orders
      });

      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ code: 'FESTIVE25', subtotal: 3000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.discountAmount).toBe(750); // 25% of 3000

      // Verify query excludes cancelled orders and requires delivery for COD
      expect(capturedOrderCountQuery.orderStatus).toEqual({ $nin: ['cancelled'] });
      expect(capturedOrderCountQuery.$or).toEqual([
        { paymentMethod: 'cod', orderStatus: 'delivered', paymentStatus: 'paid' },
        { paymentMethod: 'razorpay', paymentStatus: 'paid' }
      ]);
    });

    it('should not count pending COD orders towards customer usage limit', async () => {
      vi.spyOn(Coupon, 'findOne').mockResolvedValue({
        ...sampleCoupon,
        perUserLimit: 1
      });

      // Pending COD order exists (orderStatus: 'confirmed', paymentStatus: 'pending')
      vi.spyOn(Order, 'countDocuments').mockImplementation((query) => {
        // Query requires orderStatus: 'delivered' AND paymentStatus: 'paid' for COD
        // So pending COD orders resolve to 0 matching docs
        return Promise.resolve(0);
      });

      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ code: 'FESTIVE25', subtotal: 3000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not count failed Razorpay orders towards customer usage limit', async () => {
      vi.spyOn(Coupon, 'findOne').mockResolvedValue({
        ...sampleCoupon,
        perUserLimit: 1
      });

      // Failed Razorpay order has paymentStatus: 'failed'
      vi.spyOn(Order, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ code: 'FESTIVE25', subtotal: 3000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject coupon if customer already has a settled paid Razorpay order', async () => {
      vi.spyOn(Coupon, 'findOne').mockResolvedValue({
        ...sampleCoupon,
        perUserLimit: 1
      });

      vi.spyOn(Order, 'countDocuments').mockResolvedValue(1); // 1 settled paid order

      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ code: 'FESTIVE25', subtotal: 3000 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('COUPON_PER_USER_LIMIT_EXCEEDED');
    });

    it('should reject coupon if customer already has a delivered paid COD order', async () => {
      vi.spyOn(Coupon, 'findOne').mockResolvedValue({
        ...sampleCoupon,
        perUserLimit: 1
      });

      vi.spyOn(Order, 'countDocuments').mockResolvedValue(1); // 1 delivered paid COD order

      const res = await request(app)
        .post('/api/v1/coupons/apply')
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ code: 'FESTIVE25', subtotal: 3000 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('COUPON_PER_USER_LIMIT_EXCEEDED');
    });
  });

  describe('Razorpay Coupon Usage & Reservation Safety Lifecycle', () => {
    it('should not decrement coupon usedCount when cancelling an unpaid/abandoned Razorpay order', async () => {
      const pendingOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'SPH-ABANDONED-001',
        userId: customerId,
        orderStatus: 'pending_payment',
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        couponId: sampleCouponId,
        couponCode: 'FESTIVE25',
        couponUsageApplied: false,
        couponUsageReleased: false,
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(pendingOrder);
      vi.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(null);
      const couponFindAndUpdateSpy = vi.spyOn(Coupon, 'findOneAndUpdate');

      const res = await request(app)
        .patch(`/api/v1/orders/me/${pendingOrder.orderNumber}/cancel`)
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ reason: 'Abandoned checkout before payment' });

      expect(res.status).toBe(200);
      expect(pendingOrder.orderStatus).toBe('cancelled');
      // couponFindAndUpdate should NOT be called to decrement because couponUsageApplied is false
      expect(couponFindAndUpdateSpy).not.toHaveBeenCalled();
    });

    it('should decrement coupon usedCount when cancelling a confirmed order and prevent duplicate releases', async () => {
      const confirmedOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'SPH-CONFIRMED-001',
        userId: customerId,
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        couponId: sampleCouponId,
        couponCode: 'FESTIVE25',
        couponUsageApplied: true,
        couponUsageReleased: false,
        items: [],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findOne').mockResolvedValue(confirmedOrder);
      vi.spyOn(Order, 'findOneAndUpdate').mockImplementation(() => {
        confirmedOrder.couponUsageReleased = true;
        confirmedOrder.couponUsageApplied = false;
        return Promise.resolve(confirmedOrder);
      });
      const couponFindAndUpdateSpy = vi.spyOn(Coupon, 'findOneAndUpdate').mockResolvedValue(true);

      const res = await request(app)
        .patch(`/api/v1/orders/me/${confirmedOrder.orderNumber}/cancel`)
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ reason: 'Customer changed mind' });

      expect(res.status).toBe(200);
      expect(confirmedOrder.orderStatus).toBe('cancelled');
      expect(confirmedOrder.couponUsageReleased).toBe(true);
      expect(couponFindAndUpdateSpy).toHaveBeenCalledTimes(1);
      expect(couponFindAndUpdateSpy).toHaveBeenCalledWith(
        { _id: sampleCouponId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
        expect.objectContaining({ new: true })
      );

      // Attempt second cancellation: couponUsageReleased is already true
      couponFindAndUpdateSpy.mockClear();
      confirmedOrder.orderStatus = 'cancelled';
      const secondRes = await request(app)
        .patch(`/api/v1/orders/me/${confirmedOrder.orderNumber}/cancel`)
        .set('Cookie', [`token=${customerToken}`])
        .set(csrfHeaders)
        .send({ reason: 'Duplicate cancel' });

      expect(secondRes.status).toBe(400);
      expect(couponFindAndUpdateSpy).not.toHaveBeenCalled();
    });

    it('should consume coupon exactly once when simultaneous verification and webhook delivery occur', async () => {
      const orderDoc = {
        _id: sampleOrderId,
        couponId: sampleCouponId,
        couponUsageApplied: false
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(orderDoc);
      vi.spyOn(Coupon, 'findById').mockResolvedValue({
        _id: sampleCouponId,
        isActive: true,
        expiryDate: new Date('2026-12-31')
      });

      let incrementCount = 0;
      vi.spyOn(Coupon, 'findOneAndUpdate').mockImplementation(() => {
        incrementCount++;
        return Promise.resolve({ _id: sampleCouponId, usedCount: incrementCount });
      });

      // Simulate atomic conditional lock on Order.findOneAndUpdate: only first worker succeeds in changing couponUsageApplied
      let orderApplied = false;
      vi.spyOn(Order, 'findOneAndUpdate').mockImplementation((query) => {
        if (!orderApplied) {
          orderApplied = true;
          return Promise.resolve({ ...orderDoc, couponUsageApplied: true });
        }
        return Promise.resolve(null); // Second concurrent worker matches 0 documents
      });

      // Fire simultaneous verification and webhook
      const [res1, res2] = await Promise.all([
        consumeOrderCoupon(sampleOrderId),
        consumeOrderCoupon(sampleOrderId)
      ]);

      // One worker must succeed in consuming, the other must safely detect alreadyApplied
      const consumedResults = [res1, res2];
      const successfulConsumption = consumedResults.filter(r => r.consumed === true);
      const redundantAttempt = consumedResults.filter(r => r.alreadyApplied === true);

      expect(successfulConsumption).toHaveLength(1);
      expect(redundantAttempt).toHaveLength(1);
    });

    it('should safely ignore duplicate webhook delivery without double incrementing', async () => {
      const orderDoc = {
        _id: sampleOrderId,
        couponId: sampleCouponId,
        couponUsageApplied: true // Already applied by previous verification
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(orderDoc);
      const couponFindAndUpdateSpy = vi.spyOn(Coupon, 'findOneAndUpdate');

      const result = await consumeOrderCoupon(sampleOrderId);
      expect(result.consumed).toBe(false);
      expect(result.alreadyApplied).toBe(true);
      expect(couponFindAndUpdateSpy).not.toHaveBeenCalled();
    });

    it('should release coupon exactly once when two simultaneous cancellation requests occur', async () => {
      // Simulate atomic conditional lock on Order.findOneAndUpdate: only first worker matches couponUsageReleased !== true
      let alreadyReleased = false;
      vi.spyOn(Order, 'findOneAndUpdate').mockImplementation((query) => {
        if (!alreadyReleased) {
          alreadyReleased = true;
          return Promise.resolve({
            _id: sampleOrderId,
            couponId: sampleCouponId,
            couponUsageApplied: false,
            couponUsageReleased: true
          });
        }
        return Promise.resolve(null); // Second worker matches 0 docs
      });

      const couponFindAndUpdateSpy = vi.spyOn(Coupon, 'findOneAndUpdate').mockResolvedValue(true);

      const [res1, res2] = await Promise.all([
        releaseOrderCoupon(sampleOrderId),
        releaseOrderCoupon(sampleOrderId)
      ]);

      const releaseResults = [res1, res2];
      const successfulReleases = releaseResults.filter(r => r.released === true);
      const redundantReleases = releaseResults.filter(r => r.released === false);

      expect(successfulReleases).toHaveLength(1);
      expect(redundantReleases).toHaveLength(1);
      expect(couponFindAndUpdateSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject coupon consumption if global limit was reached between checkout and payment completion', async () => {
      const orderDoc = {
        _id: sampleOrderId,
        couponId: sampleCouponId,
        couponUsageApplied: false
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(orderDoc);
      vi.spyOn(Coupon, 'findById').mockResolvedValue({
        _id: sampleCouponId,
        isActive: true,
        expiryDate: new Date('2026-12-31'),
        usageLimit: 10,
        usedCount: 10
      });

      // findOneAndUpdate with $expr: { $lt: ['$usedCount', '$usageLimit'] } returns null when limit reached
      vi.spyOn(Coupon, 'findOneAndUpdate').mockResolvedValue(null);

      await expect(consumeOrderCoupon(sampleOrderId)).rejects.toThrow(
        /maximum global usage limit/i
      );
    });

    it('should reject coupon consumption if coupon expired before payment completion', async () => {
      const orderDoc = {
        _id: sampleOrderId,
        couponId: sampleCouponId,
        couponUsageApplied: false
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(orderDoc);
      vi.spyOn(Coupon, 'findById').mockResolvedValue({
        _id: sampleCouponId,
        isActive: true,
        startDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-01-02') // Expired yesterday
      });

      await expect(consumeOrderCoupon(sampleOrderId)).rejects.toThrow(
        /expired/i
      );
    });
  });
});


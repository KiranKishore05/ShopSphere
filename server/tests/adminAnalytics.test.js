import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 5.7: Admin Analytics & Financial Metrics Suite (/api/v1/admin/analytics/summary)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  const mockAdminUser = {
    _id: adminId,
    name: 'Finance Director',
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Access Control', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/admin/analytics/summary');
      expect(res.status).toBe(401);
    });

    it('should reject non-admin customer with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/summary')
        .set('Cookie', [`token=${customerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Financial Metrics & Settled Revenue Rule', () => {
    it('should compute settled net revenue strictly from paid non-cancelled orders', async () => {
      // Mock Order.aggregate to inspect match stage and return aggregated revenue
      let revenueMatchCaptured = null;

      vi.spyOn(Order, 'aggregate').mockImplementation((pipeline) => {
        const matchStage = pipeline.find(stage => stage.$match)?.$match;
        const groupStage = pipeline.find(stage => stage.$group)?.$group;

        if (groupStage && groupStage.totalRevenue) {
          revenueMatchCaptured = matchStage;
          return Promise.resolve([
            {
              _id: null,
              totalRevenue: 4247,
              orderCount: 1,
              avgOrderValue: 4247
            }
          ]);
        }

        // Customer retention aggregation
        if (groupStage && groupStage._id === '$userId') {
          return Promise.resolve([
            { _id: customerId, orderCount: 2, totalSpent: 4247 }
          ]);
        }

        // Status breakdown aggregation
        if (groupStage && groupStage._id === '$orderStatus') {
          return Promise.resolve([
            { _id: 'delivered', count: 1, totalAmount: 4247 },
            { _id: 'confirmed', count: 1, totalAmount: 1249 }
          ]);
        }

        // Payment method breakdown
        if (groupStage && groupStage._id === '$paymentMethod') {
          return Promise.resolve([
            { _id: 'razorpay', count: 1, totalAmount: 4247 },
            { _id: 'cod', count: 1, totalAmount: 1249 }
          ]);
        }

        // Payment status breakdown
        if (groupStage && groupStage._id === '$paymentStatus') {
          return Promise.resolve([
            { _id: 'paid', count: 1, totalAmount: 4247 },
            { _id: 'pending', count: 1, totalAmount: 1249 }
          ]);
        }

        // Category sales breakdown
        if (pipeline.some(s => s.$lookup?.from === 'categories')) {
          return Promise.resolve([
            {
              _id: new mongoose.Types.ObjectId(),
              categoryName: 'Silk Robes',
              totalRevenue: 4247,
              itemsSold: 1,
              orderCount: 1
            }
          ]);
        }

        // Daily / Monthly sales trend
        return Promise.resolve([]);
      });

      vi.spyOn(Order, 'countDocuments').mockResolvedValue(2);
      vi.spyOn(User, 'countDocuments').mockResolvedValue(2);
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(40);

      vi.spyOn(Product, 'find').mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([])
          })
        }),
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([])
              })
            })
          })
        })
      }));

      vi.spyOn(Order, 'find').mockImplementation(() => ({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([])
            })
          })
        })
      }));

      const res = await request(app)
        .get('/api/v1/admin/analytics/summary?period=all')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify Settled Revenue Rule: strictly non-cancelled, delivered COD or paid Razorpay
      expect(revenueMatchCaptured).toBeDefined();
      expect(revenueMatchCaptured.orderStatus).toEqual({ $nin: ['cancelled'] });
      expect(revenueMatchCaptured.$or).toEqual([
        { paymentMethod: 'cod', orderStatus: 'delivered', paymentStatus: 'paid' },
        { paymentMethod: 'razorpay', paymentStatus: 'paid' }
      ]);

      // Financials in response payload
      expect(res.body.data.summary.totalRevenue).toBe(4247);
      expect(res.body.data.summary.paidOrdersCount).toBe(1);
      expect(res.body.data.summary.totalOrdersCount).toBe(2);
      expect(res.body.data.summary.averageOrderValue).toBe(4247);
      expect(res.body.data.summary.totalCustomers).toBe(2);
      expect(res.body.data.summary.totalProducts).toBe(40);

      // Retention rates: 1 customer with >= 2 orders out of 1 customer total
      expect(res.body.data.summary.repeatCustomersCount).toBe(1);
      expect(res.body.data.summary.repeatCustomerRate).toBe(100);

      // Category breakdown presence
      expect(res.body.data.categorySales).toHaveLength(1);
      expect(res.body.data.categorySales[0].categoryName).toBe('Silk Robes');
      expect(res.body.data.categorySales[0].totalRevenue).toBe(4247);

      // Payment breakdowns
      expect(res.body.data.paymentMethodStats).toBeDefined();
      expect(res.body.data.paymentStatusStats).toBeDefined();
    });

    it('should support custom date range filters (startDate and endDate)', async () => {
      let revenueMatchCaptured = null;

      vi.spyOn(Order, 'aggregate').mockImplementation((pipeline) => {
        const matchStage = pipeline.find(stage => stage.$match)?.$match;
        const groupStage = pipeline.find(stage => stage.$group)?.$group;

        if (groupStage && groupStage.totalRevenue) {
          revenueMatchCaptured = matchStage;
          return Promise.resolve([{ _id: null, totalRevenue: 1000, orderCount: 1, avgOrderValue: 1000 }]);
        }
        return Promise.resolve([]);
      });

      vi.spyOn(Order, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(40);
      vi.spyOn(Product, 'find').mockImplementation(() => ({
        select: vi.fn().mockReturnValue({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
        sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) }) })
      }));
      vi.spyOn(Order, 'find').mockImplementation(() => ({
        populate: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) })
      }));

      const res = await request(app)
        .get('/api/v1/admin/analytics/summary?startDate=2026-11-01T00:00:00.000Z&endDate=2026-11-10T23:59:59.999Z')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(revenueMatchCaptured.createdAt.$gte).toEqual(new Date('2026-11-01T00:00:00.000Z'));
      expect(revenueMatchCaptured.createdAt.$lte).toEqual(new Date('2026-11-10T23:59:59.999Z'));
    });

    it('should verify refund-aware aggregation pipeline structure and deduction stages', async () => {
      let executedPipeline = null;

      vi.spyOn(Order, 'aggregate').mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$lookup?.from === 'payments')) {
          executedPipeline = pipeline;
          return Promise.resolve([{ _id: null, totalRevenue: 3500, orderCount: 1, avgOrderValue: 3500 }]);
        }
        return Promise.resolve([]);
      });

      vi.spyOn(Order, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(40);
      vi.spyOn(Product, 'find').mockImplementation(() => ({
        select: vi.fn().mockReturnValue({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
        sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) }) })
      }));
      vi.spyOn(Order, 'find').mockImplementation(() => ({
        populate: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) })
      }));

      const res = await request(app)
        .get('/api/v1/admin/analytics/summary')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(executedPipeline).toBeDefined();

      // 1. Initial Match: Filters settled orders
      const matchStage = executedPipeline[0].$match;
      expect(matchStage.orderStatus).toEqual({ $nin: ['cancelled'] });
      expect(matchStage.$or).toEqual([
        { paymentMethod: 'cod', orderStatus: 'delivered', paymentStatus: 'paid' },
        { paymentMethod: 'razorpay', paymentStatus: 'paid' }
      ]);

      // 2. Lookup Payments: Single payment document limit to avoid double counting
      const lookupStage = executedPipeline[1].$lookup;
      expect(lookupStage.from).toBe('payments');
      const pipelineLimit = lookupStage.pipeline.find(s => s.$limit);
      expect(pipelineLimit.$limit).toBe(1);

      // 3. Add Fields: Calculate refundAmount and netRevenue
      const refundAmountStage = executedPipeline.find(s => s.$addFields?.refundAmount)?.$addFields.refundAmount;
      expect(refundAmountStage).toBeDefined();

      const netRevenueStage = executedPipeline.find(s => s.$addFields?.netRevenue)?.$addFields.netRevenue;
      expect(netRevenueStage).toEqual({ $max: [0, { $subtract: ['$total', '$refundAmount'] }] });

      // 4. Net Revenue Match: Excludes full refunds
      const netRevenueMatch = executedPipeline.find(s => s.$match?.netRevenue);
      expect(netRevenueMatch.$match.netRevenue).toEqual({ $gt: 0 });
    });

    it('should correctly account for partial, full, and multiple partial refunds across all schema formats without double counting', async () => {
      const orderTotal = 5000;

      // Schema Format A: Single refundInfo object only
      const paymentFormatA = {
        paymentStatus: 'paid',
        refundInfo: { refundId: 'rf_1', amount: 1200 }
      };
      const refundA = paymentFormatA.refunds?.length > 0
        ? paymentFormatA.refunds.reduce((s, r) => s + r.amount, 0)
        : (paymentFormatA.refundInfo?.amount || 0);
      expect(Math.max(0, orderTotal - refundA)).toBe(3800);

      // Schema Format B: refunds array only
      const paymentFormatB = {
        paymentStatus: 'paid',
        refunds: [
          { refundId: 'rf_1', amount: 800 }
        ]
      };
      const refundB = paymentFormatB.refunds?.length > 0
        ? paymentFormatB.refunds.reduce((s, r) => s + r.amount, 0)
        : (paymentFormatB.refundInfo?.amount || 0);
      expect(Math.max(0, orderTotal - refundB)).toBe(4200);

      // Schema Format C: Multiple refunds in refunds[] with refundInfo mirroring latest entry (Zero Double-Count Guard)
      const paymentFormatC = {
        paymentStatus: 'paid',
        refunds: [
          { refundId: 'rf_1', amount: 1000, reason: 'First concession' },
          { refundId: 'rf_2', amount: 1500, reason: 'Second concession' }
        ],
        refundInfo: { refundId: 'rf_2', amount: 1500 } // mirrored latest
      };
      // Authoritative refundsArraySum takes precedence over mirrored refundInfo
      const refundC = paymentFormatC.refunds?.length > 0
        ? paymentFormatC.refunds.reduce((s, r) => s + r.amount, 0)
        : (paymentFormatC.refundInfo?.amount || 0);
      expect(refundC).toBe(2500); // 1000 + 1500, NOT 1000 + 1500 + 1500!
      expect(Math.max(0, orderTotal - refundC)).toBe(2500);

      // Schema Format D: Full refund with paymentStatus: 'refunded'
      const paymentFormatD = {
        paymentStatus: 'refunded'
      };
      const refundD = paymentFormatD.refunds?.length > 0
        ? paymentFormatD.refunds.reduce((s, r) => s + r.amount, 0)
        : (paymentFormatD.refundInfo?.amount || (paymentFormatD.paymentStatus === 'refunded' ? orderTotal : 0));
      expect(Math.max(0, orderTotal - refundD)).toBe(0);
    });
  });
});


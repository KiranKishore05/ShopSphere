import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 5.1: Admin Dashboard & Sales Analytics Suite (/api/v1/admin/dashboard)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Admin Authentication & Authorization Enforcement', () => {
    it('should reject unauthenticated request to /api/v1/admin/dashboard with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject unauthenticated request to /api/v1/admin/analytics/summary with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/analytics/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject customer account access with 403 FORBIDDEN on /api/v1/admin/dashboard', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue({
        _id: customerId,
        email: 'customer@shopsphere.com',
        role: 'customer',
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Cookie', `token=${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject customer account access with 403 FORBIDDEN on /api/v1/admin/analytics/summary', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue({
        _id: customerId,
        email: 'customer@shopsphere.com',
        role: 'customer',
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/admin/analytics/summary')
        .set('Cookie', `token=${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Dashboard Overview & Aggregated Statistics', () => {
    it('should grant access to admin user and return all required Phase 5.1 metrics', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue({
        _id: adminId,
        name: 'Admin Director',
        email: 'admin@shopsphere.com',
        role: 'admin',
        isActive: true
      });

      vi.spyOn(User, 'countDocuments').mockResolvedValue(15);
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(40);

      // Mock Order.aggregate for revenue, status breakdown, daily & monthly sales
      vi.spyOn(Order, 'aggregate').mockImplementation(async (pipeline) => {
        const groupStage = pipeline.find((stage) => stage.$group);
        if (!groupStage) return [];

        const groupFields = Object.keys(groupStage.$group);

        // Revenue stats
        if (groupFields.includes('totalRevenue')) {
          return [{ totalRevenue: 15499, orderCount: 6, avgOrderValue: 2583 }];
        }

        // Status breakdown
        if (groupStage.$group._id === '$orderStatus') {
          return [
            { _id: 'confirmed', count: 4, totalAmount: 11250 },
            { _id: 'pending_payment', count: 1, totalAmount: 1249 },
            { _id: 'cancelled', count: 1, totalAmount: 3000 }
          ];
        }

        // Payment method breakdown
        if (groupStage.$group._id === '$paymentMethod') {
          return [
            { _id: 'razorpay', count: 4, totalAmount: 11250 },
            { _id: 'cod', count: 2, totalAmount: 4249 }
          ];
        }

        // Daily / Monthly sales
        return [
          { _id: '2026-11-07', date: '2026-11-07', revenue: 4247, orders: 1 },
          { _id: '2026-11-08', date: '2026-11-08', revenue: 11252, orders: 3 }
        ];
      });

      vi.spyOn(Order, 'countDocuments').mockResolvedValue(6);

      // Mock Product.find for low stock alerts
      vi.spyOn(Product, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Tailored Linen Kurta',
            brand: 'ShopSphere Atelier',
            variants: [
              { sku: 'TLK-WHT-M', size: 'M', stockQuantity: 3, color: { name: 'White' } }
            ],
            images: [{ url: 'https://example.com/kurta.jpg', isPrimary: true }]
          }
        ])
      });

      // Mock Order.find for recent orders
      vi.spyOn(Order, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            orderNumber: 'SPH-REC-001',
            total: 4247,
            paymentMethod: 'razorpay',
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            createdAt: new Date(),
            shippingAddressSnapshot: { fullName: 'Priyah Sharma' },
            userId: { name: 'Priyah Sharma', email: 'priyah@test.com' },
            items: [{ name: 'Silk Saree', quantity: 1 }]
          }
        ])
      });

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary, recentOrders, lowStockAlerts, dailySales, monthlySales } = res.body.data;

      // 1. Dashboard Overview Metrics Check (8 Metrics)
      expect(summary.totalRevenue).toBe(15499);
      expect(summary.totalOrders).toBe(6);
      expect(summary.totalCustomers).toBe(15);
      expect(summary.totalProducts).toBe(40);
      expect(summary.pendingOrders).toBe(1);
      expect(summary.confirmedOrders).toBe(4);
      expect(summary.cancelledOrders).toBe(1);
      expect(summary.lowStockProducts).toBe(1);

      // 2. Sales Analytics Checks
      expect(Array.isArray(dailySales)).toBe(true);
      expect(Array.isArray(monthlySales)).toBe(true);

      // 3. Recent Orders Checks
      expect(recentOrders.length).toBe(1);
      expect(recentOrders[0].orderNumber).toBe('SPH-REC-001');
      expect(recentOrders[0].customer).toBe('Priyah Sharma');
      expect(recentOrders[0].total).toBe(4247);
      expect(recentOrders[0].paymentMethod).toBe('razorpay');
      expect(recentOrders[0].paymentStatus).toBe('paid');
      expect(recentOrders[0].orderStatus).toBe('confirmed');

      // 4. Low Stock Alerts Checks
      expect(lowStockAlerts.length).toBe(1);
      expect(lowStockAlerts[0].sku).toBe('TLK-WHT-M');
      expect(lowStockAlerts[0].stockQuantity).toBe(3);
    });
  });
});

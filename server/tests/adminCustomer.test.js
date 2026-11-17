import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 5.6: Admin Customer Management Suite (/api/v1/admin/customers)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const otherAdminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const inactiveCustomerId = new mongoose.Types.ObjectId();
  const sampleOrderId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  const mockCustomer = {
    _id: customerId,
    name: 'Ananya Sharma',
    email: 'ananya@client.in',
    phone: '+919876543211',
    role: 'customer',
    isActive: true,
    savedAddresses: [
      {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Ananya Sharma',
        phone: '+919876543211',
        streetAddress: '42 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
        country: 'India',
        isDefault: true
      }
    ],
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z')
  };

  const mockAdminUser = {
    _id: adminId,
    name: 'Executive Director',
    email: 'admin@shopsphere.com',
    role: 'admin',
    isActive: true
  };

  const mockOtherAdmin = {
    _id: otherAdminId,
    name: 'Second Admin',
    email: 'admin2@shopsphere.com',
    role: 'admin',
    isActive: true
  };

  beforeEach(() => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      let foundUser = null;
      if (idStr === adminId.toString()) foundUser = { ...mockAdminUser };
      else if (idStr === otherAdminId.toString()) foundUser = { ...mockOtherAdmin };
      else if (idStr === customerId.toString()) foundUser = { ...mockCustomer };
      else if (idStr === inactiveCustomerId.toString()) foundUser = { ...mockCustomer, _id: inactiveCustomerId, isActive: false };

      return {
        ...foundUser,
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(foundUser),
        save: vi.fn().mockResolvedValue(true)
      };
    });
  });

  describe('Access Control & Authentication', () => {
    it('should reject unauthenticated request to /admin/customers with 401', async () => {
      const res = await request(app).get('/api/v1/admin/customers');
      expect(res.status).toBe(401);
    });

    it('should reject non-admin customer with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Cookie', [`token=${customerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow authenticated admin user to access customer directory', async () => {
      vi.spyOn(User, 'aggregate').mockResolvedValue([
        {
          metadata: [{ total: 1 }],
          items: [
            {
              _id: customerId,
              name: 'Ananya Sharma',
              email: 'ananya@client.in',
              phone: '+919876543211',
              role: 'customer',
              isActive: true,
              totalOrders: 1,
              lifetimeSpend: 4247,
              createdAt: new Date()
            }
          ]
        }
      ]);
      vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(Order, 'aggregate').mockResolvedValue([{ _id: null, totalRevenue: 4247 }]);

      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.customers)).toBe(true);
      expect(res.body.data.customers[0].name).toBe('Ananya Sharma');
      expect(res.body.data.customers[0].lifetimeSpend).toBe(4247);
      expect(res.body.data.summary.totalCustomerRevenue).toBe(4247);
    });
  });

  describe('Customer Directory Security & Data Integrity', () => {
    it('should never expose password hashes, reset tokens, or secrets', async () => {
      vi.spyOn(User, 'aggregate').mockResolvedValue([
        {
          metadata: [{ total: 1 }],
          items: [
            {
              _id: customerId,
              name: 'Ananya Sharma',
              email: 'ananya@client.in',
              role: 'customer',
              isActive: true,
              totalOrders: 0,
              lifetimeSpend: 0
            }
          ]
        }
      ]);
      vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(Order, 'aggregate').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      const customerRecord = res.body.data.customers[0];
      expect(customerRecord.passwordHash).toBeUndefined();
      expect(customerRecord.passwordResetToken).toBeUndefined();
      expect(customerRecord.passwordResetExpires).toBeUndefined();
    });

    it('should query only role: customer and filter out administrator identities', async () => {
      const aggregateSpy = vi.spyOn(User, 'aggregate').mockResolvedValue([
        { metadata: [{ total: 0 }], items: [] }
      ]);
      vi.spyOn(User, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(Order, 'aggregate').mockResolvedValue([]);

      await request(app)
        .get('/api/v1/admin/customers?search=admin')
        .set('Cookie', [`token=${adminToken}`]);

      const pipeline = aggregateSpy.mock.calls[0][0];
      const matchStage = pipeline.find(stage => stage.$match)?.$match;
      expect(matchStage.role).toBe('customer');
    });
  });

  describe('GET /api/v1/admin/customers/:id (Dossier & History)', () => {
    it('should retrieve full customer dossier with populated addresses, order history, and sanitized payments', async () => {
      vi.spyOn(Order, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: sampleOrderId,
            orderNumber: 'SPH-TEST-001',
            userId: customerId,
            total: 4247,
            orderStatus: 'delivered',
            paymentMethod: 'razorpay',
            paymentStatus: 'paid',
            createdAt: new Date()
          }
        ])
      });

      vi.spyOn(Payment, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            orderId: sampleOrderId,
            razorpayOrderId: 'order_rv123',
            razorpayPaymentId: 'pay_rv456',
            paymentStatus: 'paid',
            amount: 4247,
            currency: 'INR'
          }
        ])
      });

      const res = await request(app)
        .get(`/api/v1/admin/customers/${customerId}`)
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { customer, summary, orders } = res.body.data;
      expect(customer._id.toString()).toBe(customerId.toString());
      expect(customer.name).toBe('Ananya Sharma');
      expect(customer.savedAddresses.length).toBe(1);

      // Dossier summary checks
      expect(summary.totalOrders).toBe(1);
      expect(summary.completedOrders).toBe(1);
      expect(summary.lifetimeSpend).toBe(4247);
      expect(summary.averageOrderValue).toBe(4247);

      // Enriched order checks
      expect(orders.length).toBe(1);
      expect(orders[0].paymentRecord).toBeTruthy();
      expect(orders[0].paymentRecord.razorpayPaymentId).toBe('pay_rv456');
      expect(orders[0].paymentRecord.razorpaySignature).toBeUndefined(); // Signature never exposed
    });

    it('should reject dossier lookup for admin account IDs with 404', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/customers/${otherAdminId}`)
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/admin/customers/:id/status (Account Activation & Deactivation)', () => {
    it('should successfully toggle customer account status to deactivated', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/customers/${customerId}/status`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ isActive: false, reason: 'Suspicious checkout attempts' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.isActive).toBe(false);
      expect(res.body.data.message).toContain('deactivated');
    });

    it('should block administrator from deactivating their own account with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/customers/${adminId}/status`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_MODIFY_OWN_ACCOUNT');
    });

    it('should block administrator from modifying another admin account through customer API with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/customers/${otherAdminId}/status`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CANNOT_MODIFY_ADMIN_ACCOUNT');
    });
  });
});

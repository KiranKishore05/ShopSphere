import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

const mockRestoreOrderInventory = vi.fn().mockResolvedValue(true);
const mockDeductOrderInventory = vi.fn().mockResolvedValue(true);

vi.mock('../src/services/inventoryService.js', () => ({
  deductOrderInventory: (...args) => mockDeductOrderInventory(...args),
  restoreOrderInventory: (...args) => mockRestoreOrderInventory(...args)
}));

import app from '../src/app.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 5.4: Admin Order Management & Safety Suite (/api/v1/admin/orders)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const sampleOrderId = new mongoose.Types.ObjectId();
  const sampleProductId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  const csrfHeaders = {
    Origin: 'http://localhost:5173',
    'X-Requested-With': 'XMLHttpRequest'
  };

  beforeEach(() => {
    mockRestoreOrderInventory.mockClear();
    mockDeductOrderInventory.mockClear();

    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    // Default User lookup
    vi.spyOn(User, 'findById').mockImplementation(async (id) => {
      if (id.toString() === adminId.toString()) {
        return {
          _id: adminId,
          name: 'Admin Director',
          email: 'admin@shopsphere.com',
          role: 'admin',
          isActive: true
        };
      }
      if (id.toString() === customerId.toString()) {
        return {
          _id: customerId,
          name: 'Customer Patron',
          email: 'customer@shopsphere.com',
          role: 'customer',
          isActive: true
        };
      }
      return null;
    });

    // Default Order prototype save mock
    vi.spyOn(Order.prototype, 'save').mockResolvedValue(true);
  });

  describe('Authorization Checks', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/orders');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin customer access with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Cookie', `token=${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/orders (Listing, Search & Filtering)', () => {
    it('should return paginated list of orders with populated client details', async () => {
      const mockOrders = [
        {
          _id: sampleOrderId,
          orderNumber: 'SPH-TEST-001',
          total: 12500,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          orderStatus: 'confirmed',
          createdAt: new Date('2026-11-01T10:00:00Z'),
          userId: { _id: customerId, name: 'Customer Patron', email: 'customer@shopsphere.com' },
          shippingAddressSnapshot: { fullName: 'Customer Patron', phone: '+91 9876543210' }
        }
      ];

      const findQueryMock = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOrders)
      };

      vi.spyOn(Order, 'find').mockReturnValue(findQueryMock);
      vi.spyOn(Order, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/orders?orderStatus=confirmed&paymentMethod=cod')
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders).toHaveLength(1);
      expect(res.body.data.orders[0].orderNumber).toBe('SPH-TEST-001');
      expect(res.body.data.meta.total).toBe(1);
    });

    it('should search by customer email by pre-resolving matching users', async () => {
      // Mock User.find to return matching user IDs for email search
      const userFindMock = {
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ _id: customerId }])
      };
      vi.spyOn(User, 'find').mockReturnValue(userFindMock);

      const findQueryMock = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([])
      };
      const orderFindSpy = vi.spyOn(Order, 'find').mockReturnValue(findQueryMock);
      vi.spyOn(Order, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/admin/orders?search=customer@shopsphere.com')
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(orderFindSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ userId: { $in: [customerId] } })
          ])
        })
      );
    });
  });

  describe('GET /api/v1/admin/orders/:id (Order Dossier & Payment Attachment)', () => {
    it('should retrieve full order dossier and attach associated Payment record', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-RZP-999',
        total: 15000,
        subtotal: 15000,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        userId: { _id: customerId, name: 'Customer Patron', email: 'customer@shopsphere.com' },
        items: [
          {
            productId: sampleProductId,
            variantSku: 'TCH-BLK-M',
            name: 'Tailored Trench',
            size: 'M',
            color: { name: 'Noir', hexCode: '#161513' },
            unitPrice: 15000,
            quantity: 1,
            lineTotal: 15000
          }
        ],
        shippingAddressSnapshot: {
          fullName: 'Customer Patron',
          phone: '+91 9876543210',
          streetAddress: '42 Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        statusTimeline: [
          { status: 'confirmed', timestamp: new Date(), note: 'Order placed' }
        ]
      };

      const mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        orderId: sampleOrderId,
        razorpayOrderId: 'order_rzp_123',
        razorpayPaymentId: 'pay_rzp_456',
        paymentStatus: 'paid',
        amount: 15000,
        currency: 'INR',
        verifiedAt: new Date()
      };

      const findByIdMock = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOrder)
      };

      vi.spyOn(Order, 'findById').mockReturnValue(findByIdMock);
      vi.spyOn(Payment, 'findOne').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          ...mockPayment,
          razorpaySignature: 'super_confidential_sha256_signature_hex'
        })
      });

      const res = await request(app)
        .get(`/api/v1/admin/orders/${sampleOrderId}`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderNumber).toBe('SPH-RZP-999');
      expect(res.body.data.order.paymentRecord).toBeTruthy();
      expect(res.body.data.order.paymentRecord.razorpayPaymentId).toBe('pay_rzp_456');
      expect(res.body.data.order.paymentRecord.razorpaySignature).toBeUndefined();
    });

    it('should return 404 ORDER_NOT_FOUND when order does not exist', async () => {
      const findByIdMock = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null)
      };
      vi.spyOn(Order, 'findById').mockReturnValue(findByIdMock);

      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/admin/orders/${nonExistentId}`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/admin/orders/:id/status (State Machine & Transitions)', () => {
    it('should successfully advance order from confirmed to processing', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-FUL-001',
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'processing',
          note: 'Allocated to master tailor for packing'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.orderStatus).toBe('processing');
      expect(mockOrder.statusTimeline).toHaveLength(1);
      expect(mockOrder.statusTimeline[0].updatedBy).toEqual(adminId);
    });

    it('should require carrierName and trackingNumber before advancing to shipped', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-FUL-002',
        orderStatus: 'processing',
        paymentMethod: 'cod',
        statusTimeline: []
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'shipped'
          // Missing carrierName and trackingNumber!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_SHIPPING_DETAILS');
    });

    it('should advance order from processing to shipped when carrier details are provided', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-FUL-003',
        orderStatus: 'processing',
        paymentMethod: 'cod',
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'shipped',
          carrierName: 'BlueDart Express',
          trackingNumber: 'BD-9948210IN'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.orderStatus).toBe('shipped');
      expect(mockOrder.carrierName).toBe('BlueDart Express');
      expect(mockOrder.trackingNumber).toBe('BD-9948210IN');
    });

    it('should mark COD order paymentStatus as paid upon delivered', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-COD-004',
        orderStatus: 'shipped',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'delivered',
          note: 'Delivered and cash collected'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.orderStatus).toBe('delivered');
      expect(mockOrder.paymentStatus).toBe('paid');
    });

    it('should reject invalid backward transition (e.g. delivered to confirmed)', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-ORD-005',
        orderStatus: 'delivered',
        paymentMethod: 'cod',
        statusTimeline: []
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'confirmed'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject manual force-confirmation of unpaid Razorpay orders in pending_payment state', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-UNPAID-006',
        orderStatus: 'pending_payment',
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        statusTimeline: []
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'confirmed'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Cancellation, Refunds & Inventory Safety', () => {
    it('should block cancellation of paid Razorpay orders when automated refund workflow is absent', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-PAID-007',
        orderStatus: 'confirmed',
        paymentMethod: 'razorpay',
        paymentStatus: 'paid', // Real online payment received
        total: 4247,
        statusTimeline: []
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'cancelled',
          cancellationReason: 'Client request'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PAID_ORDER_REFUND_REQUIRED');
      expect(res.body.error.message).toContain('Razorpay Merchant Dashboard');
    });

    it('should restore inventory exactly once when cancelling confirmed COD order', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-COD-008',
        orderStatus: 'confirmed',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        items: [{ productId: sampleProductId, variantSku: 'SKU-01', quantity: 2 }],
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'cancelled',
          cancellationReason: 'Customer changed delivery address'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.orderStatus).toBe('cancelled');
      expect(mockOrder.cancellationReason).toBe('Customer changed delivery address');
      expect(mockRestoreOrderInventory).toHaveBeenCalledWith(mockOrder, 'order_cancelled');
    });

    it('should cancel pending_payment order WITHOUT restoring inventory (since stock was never deducted)', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-UNPAID-009',
        orderStatus: 'pending_payment',
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'cancelled',
          cancellationReason: 'Payment window expired'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.orderStatus).toBe('cancelled');
      // Stock was never deducted, so restoreOrderInventory MUST NOT be called!
      expect(mockRestoreOrderInventory).not.toHaveBeenCalled();
    });

    it('should allow return workflow from delivered -> return_requested -> returned', async () => {
      const mockOrder = {
        _id: sampleOrderId,
        orderNumber: 'SPH-RET-010',
        orderStatus: 'delivered',
        paymentMethod: 'cod',
        paymentStatus: 'paid',
        statusTimeline: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      // Transition to return_requested
      const res1 = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'return_requested',
          note: 'Customer initiated return request'
        });

      expect(res1.status).toBe(200);
      expect(mockOrder.orderStatus).toBe('return_requested');

      // Transition to returned
      const res2 = await request(app)
        .patch(`/api/v1/admin/orders/${sampleOrderId}/status`)
        .set('Cookie', `token=${adminToken}`)
        .set(csrfHeaders)
        .send({
          orderStatus: 'returned',
          note: 'Garment inspected and restocked in atelier'
        });

      expect(res2.status).toBe(200);
      expect(mockOrder.orderStatus).toBe('returned');
    });
  });
});

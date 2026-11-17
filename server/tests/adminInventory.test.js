import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import InventoryMovement from '../src/models/InventoryMovement.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 5.5: Admin Inventory Management Suite (/api/v1/admin/inventory)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const sampleProductId = new mongoose.Types.ObjectId();
  const sampleCategoryId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  const sampleProducts = [
    {
      _id: sampleProductId,
      name: 'Structured Silk Trench',
      brand: 'ShopSphere Atelier',
      categoryId: { _id: sampleCategoryId, name: 'Outerwear' },
      images: [{ url: 'https://example.com/trench.jpg', isPrimary: true }],
      variants: [
        {
          _id: new mongoose.Types.ObjectId(),
          sku: 'SPH-TRN-BLK-S',
          size: 'S',
          color: { name: 'Noir', hexCode: '#161513' },
          price: 18500,
          stockQuantity: 15,
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          sku: 'SPH-TRN-BLK-M',
          size: 'M',
          color: { name: 'Noir', hexCode: '#161513' },
          price: 18500,
          stockQuantity: 3, // low stock (<= 5)
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          sku: 'SPH-TRN-BLK-L',
          size: 'L',
          color: { name: 'Noir', hexCode: '#161513' },
          price: 18500,
          stockQuantity: 0, // out of stock
          isActive: true
        }
      ],
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    vi.spyOn(User, 'findById').mockImplementation(async (id) => {
      if (id.toString() === adminId.toString()) {
        return {
          _id: adminId,
          name: 'Executive Director',
          email: 'admin@shopsphere.com',
          role: 'admin',
          isActive: true
        };
      }
      if (id.toString() === customerId.toString()) {
        return {
          _id: customerId,
          name: 'Standard Shopper',
          email: 'customer@shopsphere.com',
          role: 'customer',
          isActive: true
        };
      }
      return null;
    });
  });

  describe('Access Control & Authentication', () => {
    it('should reject unauthenticated request to inventory overview', async () => {
      const res = await request(app).get('/api/v1/admin/inventory');
      expect(res.status).toBe(401);
    });

    it('should reject non-admin customer from accessing inventory overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory')
        .set('Cookie', [`token=${customerToken}`]);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/inventory (Overview & Variant Aggregations)', () => {
    it('should return variant-level inventory overview with accurate summary metrics', async () => {
      vi.spyOn(Product, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sampleProducts)
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { items, summary, meta } = res.body.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(3); // 3 variants for 1 product

      // Summary checks
      expect(summary.totalProducts).toBe(1);
      expect(summary.totalVariants).toBe(3);
      expect(summary.totalUnits).toBe(18); // 15 + 3 + 0
      expect(summary.inStockCount).toBe(1); // 15 > 5
      expect(summary.lowStockCount).toBe(1); // 3 <= 5
      expect(summary.outOfStockCount).toBe(1); // 0

      // Product level counts
      expect(summary.inStockProducts).toBe(1);

      // Meta checks
      expect(meta.total).toBe(3);
      expect(meta.page).toBe(1);
    });

    it('should filter variants by status (e.g. low_stock)', async () => {
      vi.spyOn(Product, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sampleProducts)
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory?status=low_stock')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].sku).toBe('SPH-TRN-BLK-M');
      expect(res.body.data.items[0].status).toBe('low_stock');
    });

    it('should filter variants by stock range (e.g. 1-10)', async () => {
      vi.spyOn(Product, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sampleProducts)
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory?stockRange=1-10')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].stockQuantity).toBe(3);
    });

    it('should filter variants by search term matching SKU', async () => {
      vi.spyOn(Product, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sampleProducts)
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory?search=SPH-TRN-BLK-S')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].sku).toBe('SPH-TRN-BLK-S');
    });
  });

  describe('PATCH /api/v1/admin/inventory/adjust (Atomic Stock Adjustments)', () => {
    it('should increase stock and record restock audit movement', async () => {
      const productMock = {
        _id: sampleProductId,
        variants: [
          { sku: 'SPH-TRN-BLK-S', stockQuantity: 15 }
        ]
      };

      vi.spyOn(Product, 'findOne').mockResolvedValue(productMock);
      vi.spyOn(Product, 'findOneAndUpdate').mockResolvedValue({
        ...productMock,
        variants: [{ sku: 'SPH-TRN-BLK-S', stockQuantity: 25 }]
      });
      vi.spyOn(InventoryMovement, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        productId: sampleProductId,
        variantSku: 'SPH-TRN-BLK-S',
        quantityChange: 10,
        previousStock: 15,
        newStock: 25,
        reason: 'restock',
        adminId
      });

      const res = await request(app)
        .patch('/api/v1/admin/inventory/adjust')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          productId: sampleProductId.toString(),
          variantSku: 'SPH-TRN-BLK-S',
          quantityChange: 10,
          reason: 'restock',
          note: 'Shipment batch PO-8891 arrived'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedStock).toBe(25);
      expect(res.body.data.movement).toBeTruthy();
    });

    it('should prevent adjustments that would cause negative stock balance', async () => {
      const productMock = {
        _id: sampleProductId,
        variants: [
          { sku: 'SPH-TRN-BLK-S', stockQuantity: 5 }
        ]
      };

      vi.spyOn(Product, 'findOne').mockResolvedValue(productMock);

      const res = await request(app)
        .patch('/api/v1/admin/inventory/adjust')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          productId: sampleProductId.toString(),
          variantSku: 'SPH-TRN-BLK-S',
          quantityChange: -10, // would result in -5
          reason: 'damaged_writeoff',
          note: 'Water damage writeoff'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NEGATIVE_STOCK_DISALLOWED');
    });

    it('should reject adjustments for non-existent product or SKU', async () => {
      vi.spyOn(Product, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/v1/admin/inventory/adjust')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          productId: new mongoose.Types.ObjectId().toString(),
          variantSku: 'NON-EXISTENT-SKU',
          quantityChange: 5,
          reason: 'restock',
          note: 'Non existent'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('VARIANT_NOT_FOUND');
    });
  });

  describe('GET /api/v1/admin/inventory/movements (Audit Trail)', () => {
    it('should list historical stock movements with pagination and sorting', async () => {
      const mockMovements = [
        {
          _id: new mongoose.Types.ObjectId(),
          productId: { _id: sampleProductId, name: 'Structured Silk Trench', brand: 'ShopSphere Atelier' },
          variantSku: 'SPH-TRN-BLK-S',
          quantityChange: 10,
          previousStock: 15,
          newStock: 25,
          reason: 'restock',
          adminId: { _id: adminId, name: 'Executive Director', email: 'admin@shopsphere.com' },
          createdAt: new Date()
        }
      ];

      vi.spyOn(InventoryMovement, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockMovements)
      });
      vi.spyOn(InventoryMovement, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/inventory/movements')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.movements)).toBe(true);
      expect(res.body.data.movements[0].variantSku).toBe('SPH-TRN-BLK-S');
      expect(res.body.data.meta.total).toBe(1);
    });
  });
});


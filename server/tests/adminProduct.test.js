import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

const mockDeleteImage = vi.fn().mockResolvedValue({ result: 'ok' });
const mockUploadImage = vi.fn().mockResolvedValue({ url: 'https://cloudinary.com/test.jpg', public_id: 'test_public_id' });

vi.mock('../src/services/cloudinaryService.js', () => ({
  uploadImage: (...args) => mockUploadImage(...args),
  deleteImage: (...args) => mockDeleteImage(...args)
}));

import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import InventoryMovement from '../src/models/InventoryMovement.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 5.2: Admin Product Management & Safety Suite (/api/v1/admin/products)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const sampleProductId = new mongoose.Types.ObjectId();
  const sampleCategoryId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  beforeEach(() => {
    mockDeleteImage.mockClear();
    mockUploadImage.mockClear();

    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    // Default User lookup for admin requests
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

    // Default save mock on Product prototype to prevent hanging without a live MongoDB connection
    vi.spyOn(Product.prototype, 'save').mockResolvedValue(true);
    // Mock InventoryMovement.create
    vi.spyOn(InventoryMovement, 'create').mockResolvedValue(true);
  });

  describe('Authorization Checks', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject regular customer access with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Cookie', `token=${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/products', () => {
    it('should return paginated list of products with calculated stockStatus and meta', async () => {
      const mockProducts = [
        {
          _id: sampleProductId,
          name: 'Merino Wool Trench',
          brand: 'ShopSphere Atelier',
          gender: 'women',
          variants: [
            { sku: 'MWT-BLK-S', stockQuantity: 8, price: 9500 },
            { sku: 'MWT-BLK-M', stockQuantity: 2, price: 9500 }
          ],
          isActive: true
        }
      ];

      const findQueryMock = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockProducts)
      };

      vi.spyOn(Product, 'find').mockReturnValue(findQueryMock);
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/products?status=active&stock=low_stock')
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(1);
      expect(res.body.data.products[0].totalStock).toBe(10);
      expect(res.body.data.products[0].stockStatus).toBe('low_stock');
      expect(res.body.data.meta.total).toBe(1);
    });
  });

  describe('POST /api/v1/admin/products (Product Creation)', () => {
    it('should create a product and record initial inventory movements', async () => {
      const newProductPayload = {
        name: 'Mulberry Silk Slip Dress',
        slug: 'mulberry-silk-slip-dress',
        categoryId: sampleCategoryId.toString(),
        brand: 'ShopSphere Atelier',
        gender: 'women',
        description: 'Fluid bias-cut slip dress crafted from 19mm mulberry silk.',
        images: [{ url: 'https://example.com/slip.jpg', isPrimary: true }],
        variants: [
          {
            sku: 'SLP-NOIR-S',
            size: 'S',
            color: { name: 'Noir', hexCode: '#161513' },
            price: 7800,
            stockQuantity: 12
          }
        ]
      };

      // Mock SKU uniqueness check and slug check (Product.findOne)
      vi.spyOn(Product, 'findOne').mockResolvedValue(null);
      const movementCreateSpy = vi.spyOn(InventoryMovement, 'create').mockResolvedValue(true);

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send(newProductPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toBe('Mulberry Silk Slip Dress');

      // Verify inventory movements recorded
      expect(movementCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variantSku: 'SLP-NOIR-S',
          quantityChange: 12,
          previousStock: 0,
          newStock: 12,
          reason: 'initial_creation',
          adminId: adminId
        })
      );
    });

    it('should reject creation if any variant SKU already exists in database', async () => {
      vi.spyOn(Product, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        name: 'Existing Garment',
        variants: [{ sku: 'CONFLICT-SKU' }]
      });

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          name: 'Garment With Conflict',
          brand: 'ShopSphere Atelier',
          gender: 'women',
          images: [{ url: 'https://example.com/conflict.jpg', isPrimary: true }],
          description: 'A test garment that collides with existing SKU.',
          categoryId: sampleCategoryId.toString(),
          variants: [
            {
              sku: 'CONFLICT-SKU',
              size: 'M',
              color: { name: 'Noir', hexCode: '#161513' },
              price: 4000,
              stockQuantity: 5
            }
          ]
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_SKU');
    });
  });

  describe('PATCH /api/v1/admin/products/:id (Variant Stock Update & Inventory Audit)', () => {
    it('should log inventory movements when variant stock is manually modified', async () => {
      const existingProduct = {
        _id: sampleProductId,
        name: 'Cashmere Crewneck',
        variants: [
          {
            sku: 'CSH-OAT-M',
            size: 'M',
            color: { name: 'Oatmeal', hexCode: '#DFD8CE' },
            price: 8500,
            stockQuantity: 5
          }
        ],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Product, 'findById').mockResolvedValue(existingProduct);
      vi.spyOn(Product, 'findOne').mockResolvedValue(null); // No SKU conflict
      const movementCreateSpy = vi.spyOn(InventoryMovement, 'create').mockResolvedValue(true);

      const res = await request(app)
        .patch(`/api/v1/admin/products/${sampleProductId}`)
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          variants: [
            {
              sku: 'CSH-OAT-M',
              size: 'M',
              color: { name: 'Oatmeal', hexCode: '#DFD8CE' },
              price: 8500,
              stockQuantity: 15 // Restocked from 5 to 15
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(existingProduct.save).toHaveBeenCalled();

      // Check InventoryMovement record
      expect(movementCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: sampleProductId,
          variantSku: 'CSH-OAT-M',
          previousStock: 5,
          newStock: 15,
          quantityChange: 10,
          reason: 'restock',
          adminId: adminId
        })
      );
    });
  });

  describe('DELETE /api/v1/admin/products/:id (Safe Deactivation & Preservation)', () => {
    it('should safely deactivate (isActive = false) without hard deleting when referenced in existing Orders', async () => {
      const productMock = {
        _id: sampleProductId,
        name: 'Ordered Linen Tunic',
        isActive: true,
        images: [{ public_id: 'shopsphere/img_1' }],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Product, 'findById').mockResolvedValue(productMock);
      // Order reference exists!
      vi.spyOn(Order, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      vi.spyOn(InventoryMovement, 'exists').mockResolvedValue(null);
      const deleteOneSpy = vi.spyOn(Product, 'findByIdAndDelete');

      const res = await request(app)
        .delete(`/api/v1/admin/products/${sampleProductId}`)
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deactivated).toBe(true);
      expect(productMock.isActive).toBe(false);
      expect(productMock.save).toHaveBeenCalled();
      // Hard delete and Cloudinary delete MUST NOT be called!
      expect(deleteOneSpy).not.toHaveBeenCalled();
      expect(mockDeleteImage).not.toHaveBeenCalled();
    });

    it('should safely deactivate (isActive = false) without hard deleting when referenced in Inventory Movements', async () => {
      const productMock = {
        _id: sampleProductId,
        name: 'Inventoried Silk Trouser',
        isActive: true,
        images: [{ public_id: 'shopsphere/img_2' }],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Product, 'findById').mockResolvedValue(productMock);
      vi.spyOn(Order, 'exists').mockResolvedValue(null);
      // Inventory Movement reference exists!
      vi.spyOn(InventoryMovement, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      const deleteOneSpy = vi.spyOn(Product, 'findByIdAndDelete');

      const res = await request(app)
        .delete(`/api/v1/admin/products/${sampleProductId}`)
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deactivated).toBe(true);
      expect(productMock.isActive).toBe(false);
      expect(deleteOneSpy).not.toHaveBeenCalled();
      expect(mockDeleteImage).not.toHaveBeenCalled();
    });

    it('should perform hard deletion only when product has zero references and force=true is explicitly passed', async () => {
      const productMock = {
        _id: sampleProductId,
        name: 'Ephemeral Prototype',
        isActive: true,
        images: [{ public_id: 'shopsphere/ephemeral_1' }]
      };

      vi.spyOn(Product, 'findById').mockResolvedValue(productMock);
      vi.spyOn(Order, 'exists').mockResolvedValue(null);
      vi.spyOn(InventoryMovement, 'exists').mockResolvedValue(null);
      vi.spyOn(Product, 'exists').mockResolvedValue(null); // No other product shares image
      const deleteOneSpy = vi.spyOn(Product, 'findByIdAndDelete').mockResolvedValue(productMock);

      const res = await request(app)
        .delete(`/api/v1/admin/products/${sampleProductId}?force=true`)
        .set('Cookie', `token=${adminToken}`)
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
      expect(deleteOneSpy).toHaveBeenCalledWith(sampleProductId);
      expect(mockDeleteImage).toHaveBeenCalledWith('shopsphere/ephemeral_1');
    });
  });
});

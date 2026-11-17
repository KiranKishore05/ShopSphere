import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 5.3: Admin Category Management Suite (/api/v1/admin/categories)', () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const sampleCategoryId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId, email: 'admin@shopsphere.com', role: 'admin' });
  const customerToken = generateToken({ id: customerId, email: 'customer@shopsphere.com', role: 'customer' });

  beforeEach(() => {
    vi.restoreAllMocks();
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

    // Default Category prototype save mock to avoid live MongoDB requirement
    vi.spyOn(Category.prototype, 'save').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authorization & Access Control', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/categories');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject customer access with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/categories')
        .set('Cookie', `token=${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/categories', () => {
    it('should return all categories enhanced with product counts', async () => {
      const mockCategories = [
        {
          _id: sampleCategoryId,
          name: 'Jackets & Hoodies',
          slug: 'outerwear',
          description: 'Tailored luxury outerwear',
          image: { url: 'https://example.com/jackets.jpg' },
          isActive: true
        }
      ];

      const findQueryMock = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockCategories)
      };

      vi.spyOn(Category, 'find').mockReturnValue(findQueryMock);
      vi.spyOn(Product, 'countDocuments').mockImplementation(async (query) => {
        if (query.isActive) return 4;
        return 4;
      });

      const res = await request(app)
        .get('/api/v1/admin/categories?status=active')
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toHaveLength(1);
      expect(res.body.data.categories[0].name).toBe('Jackets & Hoodies');
      expect(res.body.data.categories[0].productCount).toBe(4);
      expect(res.body.data.categories[0].activeProductCount).toBe(4);
    });
  });

  describe('GET /api/v1/admin/categories/:id', () => {
    it('should return a single category with product count', async () => {
      const mockCategory = {
        _id: sampleCategoryId,
        name: 'Shirts',
        slug: 'shirts',
        description: 'Bespoke shirting',
        isActive: true
      };

      vi.spyOn(Category, 'findById').mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCategory)
      });
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(6);

      const res = await request(app)
        .get(`/api/v1/admin/categories/${sampleCategoryId}`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Shirts');
      expect(res.body.data.category.productCount).toBe(6);
    });

    it('should return 404 CATEGORY_NOT_FOUND if category does not exist', async () => {
      vi.spyOn(Category, 'findById').mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      });

      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/admin/categories/${nonExistentId}`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('POST /api/v1/admin/categories (Category Creation)', () => {
    it('should create a category with auto-derived slug and default image', async () => {
      const createdCategory = {
        _id: sampleCategoryId,
        name: 'Resort & Swimwear',
        slug: 'resort-swimwear',
        description: 'Mediterranean beachside silhouettes',
        image: { url: 'https://example.com/resort.jpg', public_id: '', altText: 'Resort & Swimwear' },
        isActive: true
      };

      vi.spyOn(Category, 'findOne').mockResolvedValue(null); // No duplicate name or slug
      vi.spyOn(Category, 'create').mockResolvedValue(createdCategory);

      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Cookie', `token=${adminToken}`)
        .send({
          name: 'Resort & Swimwear',
          description: 'Mediterranean beachside silhouettes',
          image: { url: 'https://example.com/resort.jpg' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Resort & Swimwear');
      expect(res.body.data.category.slug).toBe('resort-swimwear');
    });

    it('should reject creation if category name already exists (case-insensitive duplicate check)', async () => {
      vi.spyOn(Category, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        name: 'Shirts',
        slug: 'shirts'
      });

      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Cookie', `token=${adminToken}`)
        .send({
          name: 'shirts', // lowercase collision with existing 'Shirts'
          description: 'Shirting collection'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_CATEGORY_NAME');
    });

    it('should reject creation if custom slug already exists', async () => {
      // First findOne (name check) returns null, second findOne (slug check) returns collision
      vi.spyOn(Category, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId(), slug: 'taken-slug' });

      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Cookie', `token=${adminToken}`)
        .send({
          name: 'Unique Department',
          slug: 'taken-slug'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_CATEGORY_SLUG');
    });
  });

  describe('PATCH /api/v1/admin/categories/:id (Category Modification & Safe Toggle)', () => {
    it('should update category fields and toggle active status safely', async () => {
      const existingCategory = {
        _id: sampleCategoryId,
        name: 'Kurtas & Ethnic Wear',
        slug: 'ethnic-wear',
        description: 'Heritage handloom attire',
        isActive: true,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Category, 'findById').mockResolvedValue(existingCategory);
      vi.spyOn(Category, 'findOne').mockResolvedValue(null); // No collision

      const res = await request(app)
        .patch(`/api/v1/admin/categories/${sampleCategoryId}`)
        .set('Cookie', `token=${adminToken}`)
        .send({
          description: 'Updated heritage profile',
          isActive: false // Deactivate category safely
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(existingCategory.description).toBe('Updated heritage profile');
      expect(existingCategory.isActive).toBe(false);
      expect(existingCategory.save).toHaveBeenCalled();
    });

    it('should reject update if renaming collides with an existing category name', async () => {
      const existingCategory = {
        _id: sampleCategoryId,
        name: 'Dresses & Tops',
        slug: 'dresses-tops'
      };

      vi.spyOn(Category, 'findById').mockResolvedValue(existingCategory);
      vi.spyOn(Category, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        name: 'Kids Clothing'
      });

      const res = await request(app)
        .patch(`/api/v1/admin/categories/${sampleCategoryId}`)
        .set('Cookie', `token=${adminToken}`)
        .send({
          name: 'Kids Clothing'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_CATEGORY_NAME');
    });
  });

  describe('DELETE /api/v1/admin/categories/:id (Protection of Linked Products)', () => {
    it('should BLOCK deletion when category has associated products (CATEGORY_HAS_PRODUCTS)', async () => {
      const existingCategory = {
        _id: sampleCategoryId,
        name: 'Jeans & Trousers'
      };

      vi.spyOn(Category, 'findById').mockResolvedValue(existingCategory);
      // Category has 9 active products!
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(9);
      const deleteSpy = vi.spyOn(Category, 'findByIdAndDelete');

      const res = await request(app)
        .delete(`/api/v1/admin/categories/${sampleCategoryId}`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');
      expect(res.body.error.message).toContain('9 garment(s) currently belong to it');
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should allow deletion when category has 0 associated products', async () => {
      const emptyCategory = {
        _id: sampleCategoryId,
        name: 'Temporary Department'
      };

      vi.spyOn(Category, 'findById').mockResolvedValue(emptyCategory);
      // Zero products!
      vi.spyOn(Product, 'countDocuments').mockResolvedValue(0);
      const deleteSpy = vi.spyOn(Category, 'findByIdAndDelete').mockResolvedValue(emptyCategory);

      const res = await request(app)
        .delete(`/api/v1/admin/categories/${sampleCategoryId}`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('deleted successfully');
      expect(deleteSpy).toHaveBeenCalledWith(sampleCategoryId);
    });
  });
});


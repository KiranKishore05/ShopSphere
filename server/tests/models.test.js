import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import Coupon from '../src/models/Coupon.js';

describe('Mongoose Models Validation & Constraints', () => {
  describe('User Model', () => {
    it('should fail validation if required fields are missing', () => {
      const user = new User({});
      const error = user.validateSync();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.passwordHash).toBeDefined();
    });

    it('should fail validation on invalid email syntax', () => {
      const user = new User({
        name: 'Aria',
        email: 'invalid-email-string',
        passwordHash: 'hashed123'
      });
      const error = user.validateSync();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.email.message).toContain('Invalid email address format');
    });

    it('should correctly hash and compare passwords', async () => {
      const plainPassword = 'SuperSecretPassword123!';
      const hash = await User.hashPassword(plainPassword);
      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith('$2')).toBe(true);

      const user = new User({
        name: 'Test Customer',
        email: 'customer@atelier.com',
        passwordHash: hash
      });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('WrongPassword123');
      expect(isNotMatch).toBe(false);
    });
  });

  describe('Product Model & Variant Subdocuments', () => {
    it('should fail validation if variant has invalid hex color code', () => {
      const product = new Product({
        name: 'Tailored Blazer',
        slug: 'tailored-blazer',
        description: 'Luxury wool blazer',
        categoryId: new mongoose.Types.ObjectId(),
        brand: 'Atelier Sphere',
        gender: 'women',
        variants: [
          {
            sku: 'BLZ-WLL-01',
            size: 'M',
            color: { name: 'Faulty', hexCode: 'not-a-hex' },
            price: 12999
          }
        ]
      });

      const error = product.validateSync();
      expect(error.errors['variants.0.color.hexCode']).toBeDefined();
    });

    it('should pass validation with properly formed fashion variant', () => {
      const product = new Product({
        name: 'Tailored Blazer',
        slug: 'tailored-blazer',
        description: 'Luxury wool blazer',
        categoryId: new mongoose.Types.ObjectId(),
        brand: 'Atelier Sphere',
        gender: 'women',
        variants: [
          {
            sku: 'BLZ-WLL-01',
            size: 'M',
            color: { name: 'Ink', hexCode: '#161513' },
            price: 12999,
            stockQuantity: 10
          }
        ]
      });

      const error = product.validateSync();
      expect(error).toBeUndefined();
      expect(product.variants[0].sku).toBe('BLZ-WLL-01');
    });
  });

  describe('Category Model', () => {
    it('should require name, slug, and image URL', () => {
      const category = new Category({});
      const error = category.validateSync();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.slug).toBeDefined();
      expect(error.errors['image.url']).toBeDefined();
    });
  });

  describe('Coupon Model', () => {
    it('should validate discount type enum and positive discount value', () => {
      const coupon = new Coupon({
        code: 'INVALID',
        discountType: 'unsupported_type',
        discountValue: -5,
        expiryDate: new Date(Date.now() + 86400000)
      });
      const error = coupon.validateSync();
      expect(error.errors.discountType).toBeDefined();
      expect(error.errors.discountValue).toBeDefined();
    });
  });
});

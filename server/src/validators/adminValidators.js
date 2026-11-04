import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const idParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid resource ID format')
});

const variantItemSchema = z.object({
  sku: z.string({ required_error: 'SKU is required' })
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .toUpperCase(),
  size: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', 'One Size'], {
    required_error: 'Valid size is required'
  }),
  color: z.object({
    name: z.string({ required_error: 'Color name is required' }).trim().min(1),
    hexCode: z.string({ required_error: 'Color hex code is required' })
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color code')
  }),
  price: z.number({ required_error: 'Price is required' }).min(0, 'Price must be non-negative'),
  compareAtPrice: z.number().min(0, 'Compare price must be non-negative').nullable().optional(),
  stockQuantity: z.number({ required_error: 'Stock quantity is required' })
    .int('Stock must be an integer')
    .min(0, 'Stock quantity cannot be negative'),
  isActive: z.boolean().optional().default(true)
});

const productImageSchema = z.object({
  url: z.string({ required_error: 'Image URL is required' }).url('Valid image URL required'),
  public_id: z.string().optional().default(''),
  altText: z.string().optional().default(''),
  isPrimary: z.boolean().optional().default(false)
});

const productBaseSchema = z.object({
  name: z.string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name cannot exceed 150 characters'),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters'),
  categoryId: z.string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Invalid category ID format'),
  brand: z.string({ required_error: 'Brand is required' }).trim().min(1),
  gender: z.enum(['men', 'women', 'unisex'], {
    required_error: 'Gender classification is required'
  }),
  tags: z.array(z.string().trim().toLowerCase()).optional().default([]),
  images: z.array(productImageSchema).min(1, 'At least one image is required'),
  variants: z.array(variantItemSchema).min(1, 'At least one variant is required'),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true)
});

export const createProductSchema = productBaseSchema.refine(data => {
  // Check for duplicate SKUs within payload
  const skus = data.variants.map(v => v.sku);
  return new Set(skus).size === skus.length;
}, {
  message: 'Variant SKUs within a product must be unique',
  path: ['variants']
});

export const updateProductSchema = productBaseSchema.partial().refine(data => {
  if (data.variants && data.variants.length > 0) {
    const skus = data.variants.map(v => v.sku);
    return new Set(skus).size === skus.length;
  }
  return true;
}, {
  message: 'Variant SKUs within a product must be unique',
  path: ['variants']
});

export const createCategorySchema = z.object({
  name: z.string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters'),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(500).optional().default(''),
  image: z.object({
    url: z.string({ required_error: 'Category image URL is required' }).url(),
    public_id: z.string().optional().default(''),
    altText: z.string().optional().default('')
  }),
  isActive: z.boolean().optional().default(true)
});

export const updateCategorySchema = createCategorySchema.partial();

export const adjustStockSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }).regex(objectIdRegex, 'Invalid product ID'),
  variantSku: z.string({ required_error: 'Variant SKU is required' }).trim().min(1).toUpperCase(),
  quantityChange: z.number({ required_error: 'Quantity change is required' })
    .int('Quantity change must be an integer')
    .refine(val => val !== 0, 'Quantity change cannot be zero'),
  reason: z.enum(['restock', 'damaged_writeoff', 'manual_adjustment'], {
    required_error: 'Valid adjustment reason is required'
  }),
  note: z.string().trim().optional().default('')
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], {
    required_error: 'Valid order status is required'
  }),
  trackingNumber: z.string().trim().optional(),
  carrierName: z.string().trim().optional(),
  note: z.string().trim().optional()
});

export const createCouponSchema = z.object({
  code: z.string({ required_error: 'Coupon code is required' })
    .trim()
    .min(2, 'Coupon code must be at least 2 characters')
    .toUpperCase(),
  description: z.string().trim().optional().default(''),
  discountType: z.enum(['percentage', 'fixed'], {
    required_error: 'Discount type is required'
  }),
  discountValue: z.number({ required_error: 'Discount value is required' })
    .min(1, 'Discount value must be at least 1'),
  minOrderAmount: z.number().min(0, 'Minimum order amount must be non-negative').optional().default(0),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  startDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date({ required_error: 'Expiry date is required' }),
  usageLimit: z.number().int().min(1).optional().default(100),
  perUserLimit: z.number().int().min(1).optional().default(1),
  isActive: z.boolean().optional().default(true)
});

export const updateCouponSchema = createCouponSchema.partial();

export const imageUploadSchema = z.object({
  image: z.string({ required_error: 'Image data or base64 string is required' }).min(1),
  folder: z.string().optional().default('shopsphere/products')
});

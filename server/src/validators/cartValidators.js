import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
  variantSku: z.string({ required_error: 'Variant SKU is required' })
    .trim()
    .min(1, 'Variant SKU cannot be empty')
    .toUpperCase(),
  quantity: z.number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(50, 'Cannot add more than 50 units in a single request')
});

export const updateItemQuantitySchema = z.object({
  quantity: z.number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(0, 'Quantity cannot be negative')
    .max(50, 'Cannot exceed 50 units per line item')
});

export const skuParamSchema = z.object({
  itemSku: z.string({ required_error: 'Item SKU parameter is required' })
    .trim()
    .min(1, 'Item SKU cannot be empty')
    .toUpperCase()
});

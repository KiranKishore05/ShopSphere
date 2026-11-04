import { z } from 'zod';

export const addWishlistItemSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format')
});

export const removeWishlistItemParamSchema = z.object({
  productId: z.string({ required_error: 'Product ID parameter is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format')
});

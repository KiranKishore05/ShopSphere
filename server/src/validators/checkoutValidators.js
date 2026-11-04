import { z } from 'zod';
import { addressBodySchema } from './addressValidators.js';

export const checkoutSchema = z.object({
  addressId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format').optional(),
  shippingAddress: addressBodySchema.optional(),
  paymentMethod: z.enum(['razorpay', 'cod'], {
    required_error: 'Payment method is required'
  }),
  couponCode: z.string().trim().toUpperCase().optional(),
  idempotencyKey: z.string().trim().optional()
}).refine(data => Boolean(data.addressId || data.shippingAddress), {
  message: 'Either an existing addressId or a new shippingAddress must be provided',
  path: ['addressId']
});

export const applyCouponSchema = z.object({
  code: z.string({ required_error: 'Coupon code is required' })
    .trim()
    .min(1, 'Coupon code cannot be empty')
    .toUpperCase(),
  subtotal: z.number().min(0, 'Subtotal must be non-negative').optional()
});

export const orderNumberParamSchema = z.object({
  orderNumber: z.string({ required_error: 'Order number parameter is required' })
    .trim()
    .min(1, 'Order number cannot be empty')
    .toUpperCase()
});

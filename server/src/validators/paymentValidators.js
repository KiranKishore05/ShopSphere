import { z } from 'zod';

export const createRazorpayOrderSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID format')
});

export const verifyRazorpayPaymentSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID format'),
  razorpayOrderId: z.string({ required_error: 'Razorpay order ID is required' }).trim().min(1),
  razorpayPaymentId: z.string({ required_error: 'Razorpay payment ID is required' }).trim().min(1),
  razorpaySignature: z.string({ required_error: 'Razorpay signature is required' }).trim().min(1)
});

export const recordPaymentFailureSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID format'),
  razorpayOrderId: z.string().optional(),
  errorDescription: z.string().optional()
});

export const mockCompletePaymentSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID format'),
  razorpayOrderId: z.string({ required_error: 'Razorpay order ID is required' }).trim().min(1)
});

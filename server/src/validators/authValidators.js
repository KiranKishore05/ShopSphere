import { z } from 'zod';

export const strongPasswordSchema = z.string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password cannot exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_\-.~+=])/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#^_-.~+=)'
  );

export const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters'),
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  password: strongPasswordSchema,
  phone: z.string().trim().nullish().default(''),
});

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  password: z.string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required').optional(),
  password: strongPasswordSchema
});

export const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

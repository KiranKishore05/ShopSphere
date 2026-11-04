import { z } from 'zod';

export const addressBodySchema = z.object({
  fullName: z.string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  phone: z.string({ required_error: 'Phone number is required' })
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number cannot exceed 20 characters'),
  streetAddress: z.string({ required_error: 'Street address is required' })
    .trim()
    .min(3, 'Street address must be at least 3 characters')
    .max(200, 'Street address cannot exceed 200 characters'),
  apartment: z.string().trim().max(100).optional().default(''),
  city: z.string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters'),
  state: z.string({ required_error: 'State/Province is required' })
    .trim()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State cannot exceed 100 characters'),
  postalCode: z.string({ required_error: 'Postal code is required' })
    .trim()
    .min(3, 'Postal code must be at least 3 characters')
    .max(12, 'Postal code cannot exceed 12 characters'),
  country: z.string().trim().min(2).max(60).optional().default('India'),
  isDefault: z.boolean().optional().default(false)
});

export const updateAddressBodySchema = addressBodySchema.partial();

export const addressIdParamSchema = z.object({
  addressId: z.string({ required_error: 'Address ID parameter is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format')
});

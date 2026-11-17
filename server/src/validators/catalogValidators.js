import { z } from 'zod';

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1).max(50, 'Limit cannot exceed 50').default(12),
  search: z.string().trim().max(100, 'Search query cannot exceed 100 characters').optional(),
  category: z.string().trim().optional(),
  gender: z.enum(['men', 'women', 'kids', 'unisex', 'all']).optional(),
  size: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42', '44', 'One Size']).optional(),
  color: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0, 'Minimum price must be non-negative').optional(),
  maxPrice: z.coerce.number().min(0, 'Maximum price must be non-negative').optional(),
  inStock: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating', 'relevance']).default('newest'),
}).refine(data => {
  if (data.minPrice !== undefined && data.maxPrice !== undefined) {
    return data.maxPrice >= data.minPrice;
  }
  return true;
}, {
  message: 'Maximum price cannot be lower than minimum price',
  path: ['maxPrice']
});

export const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
};

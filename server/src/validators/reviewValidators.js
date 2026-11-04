import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number({
    required_error: 'Rating is required'
  })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  title: z.string({
    required_error: 'Review title is required'
  })
    .trim()
    .min(2, 'Review title must have at least 2 characters')
    .max(100, 'Review title cannot exceed 100 characters'),
  comment: z.string({
    required_error: 'Review comment is required'
  })
    .trim()
    .min(5, 'Review comment must have at least 5 characters')
    .max(1000, 'Review comment cannot exceed 1000 characters')
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().min(2).max(100).optional(),
  comment: z.string().trim().min(5).max(1000).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field (rating, title, or comment) must be provided for update'
});

export const moderateReviewSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  isApproved: z.boolean().optional(),
  isFeatured: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one moderation parameter must be specified'
});

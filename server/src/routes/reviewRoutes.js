import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { idParamSchema } from '../validators/adminValidators.js';
import {
  createReviewSchema,
  updateReviewSchema
} from '../validators/reviewValidators.js';
import {
  getProductReviews,
  checkReviewEligibility,
  createProductReview,
  updateReview,
  deleteReview
} from '../controllers/reviewController.js';

const router = Router();

// Eligibility check (Customer must be authenticated)
router.get('/eligibility/:productId', protect, checkReviewEligibility);

// Direct review submission
router.post('/', protect, validateBody(createReviewSchema), createProductReview);

// Customer update and deletion
router.patch('/:id', protect, validateParams(idParamSchema), validateBody(updateReviewSchema), updateReview);
router.delete('/:id', protect, validateParams(idParamSchema), deleteReview);

// Public review retrieval by product ID / slug
router.get('/:productId', getProductReviews);

export default router;

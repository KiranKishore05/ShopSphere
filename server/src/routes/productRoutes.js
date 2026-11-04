import { Router } from 'express';
import { getProducts, getProductBySlug, getSearchSuggestions } from '../controllers/productController.js';
import { getProductReviews, createProductReview } from '../controllers/reviewController.js';
import { validateQuery, productQuerySchema } from '../validators/catalogValidators.js';
import { validateBody } from '../middleware/validate.js';
import { createReviewSchema } from '../validators/reviewValidators.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Catalog products query
router.get('/', validateQuery(productQuerySchema), getProducts);

// Search suggestions autocomplete (must precede :slug)
router.get('/search/suggestions', getSearchSuggestions);

// Nested reviews endpoints
router.get('/:productId/reviews', getProductReviews);
router.post('/:productId/reviews', protect, validateBody(createReviewSchema), createProductReview);

// Single product details
router.get('/:slug', getProductBySlug);

export default router;

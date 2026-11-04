import { Router } from 'express';
import { getCategories, getCategoryBySlug } from '../controllers/categoryController.js';
import { getCategoryProducts } from '../controllers/productController.js';
import { validateQuery, productQuerySchema } from '../validators/catalogValidators.js';

const router = Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);
router.get('/:slug/products', validateQuery(productQuerySchema), getCategoryProducts);

export default router;

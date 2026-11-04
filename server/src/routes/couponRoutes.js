import express from 'express';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { applyCouponSchema } from '../validators/checkoutValidators.js';
import { applyCoupon } from '../controllers/couponController.js';

const router = express.Router();

router.post('/apply', protect, validateBody(applyCouponSchema), applyCoupon);

export default router;

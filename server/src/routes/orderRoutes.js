import express from 'express';
import { protect } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  checkoutSchema,
  orderNumberParamSchema
} from '../validators/checkoutValidators.js';
import {
  checkout,
  getMyOrders,
  getMyOrderByNumber,
  cancelMyOrder
} from '../controllers/orderController.js';

const router = express.Router();

// Customer checkout route
router.post('/checkout', protect, validateBody(checkoutSchema), checkout);

// Customer order history & details
router.get('/me', protect, getMyOrders);
router.get('/me/:orderNumber', protect, validateParams(orderNumberParamSchema), getMyOrderByNumber);
router.patch('/me/:orderNumber/cancel', protect, validateParams(orderNumberParamSchema), cancelMyOrder);

export default router;

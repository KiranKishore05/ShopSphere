import express from 'express';
import {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem
} from '../controllers/cartController.js';
import { protect } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  addItemSchema,
  updateItemQuantitySchema,
  skuParamSchema
} from '../validators/cartValidators.js';

const router = express.Router();

// All cart endpoints require customer authentication
router.use(protect);

router.route('/')
  .get(getCart);

router.route('/items')
  .post(validateBody(addItemSchema), addItemToCart);

router.route('/items/:itemSku')
  .patch(validateParams(skuParamSchema), validateBody(updateItemQuantitySchema), updateCartItem)
  .delete(validateParams(skuParamSchema), removeCartItem);

export default router;

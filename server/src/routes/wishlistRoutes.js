import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  addWishlistItemSchema,
  removeWishlistItemParamSchema
} from '../validators/wishlistValidators.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWishlist);

router.route('/items')
  .post(validateBody(addWishlistItemSchema), addToWishlist);

router.route('/items/:productId')
  .delete(validateParams(removeWishlistItemParamSchema), removeFromWishlist);

export default router;

import express from 'express';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema
} from '../validators/paymentValidators.js';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/razorpay/create-order', protect, validateBody(createRazorpayOrderSchema), createRazorpayOrder);
router.post('/razorpay/verify', protect, validateBody(verifyRazorpayPaymentSchema), verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;

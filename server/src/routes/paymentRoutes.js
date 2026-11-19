import express from 'express';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  recordPaymentFailureSchema,
  mockCompletePaymentSchema
} from '../validators/paymentValidators.js';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  recordPaymentFailure,
  handleRazorpayWebhook,
  mockCompletePayment
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/razorpay/create-order', protect, validateBody(createRazorpayOrderSchema), createRazorpayOrder);
router.post('/razorpay/verify', protect, validateBody(verifyRazorpayPaymentSchema), verifyRazorpayPayment);
router.post('/razorpay/mock-complete', protect, validateBody(mockCompletePaymentSchema), mockCompletePayment);
router.post('/razorpay/failed', protect, validateBody(recordPaymentFailureSchema), recordPaymentFailure);

// Webhook endpoints (both standard /webhook and /razorpay/webhook supported)
router.post('/webhook', handleRazorpayWebhook);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;

import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  idParamSchema,
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  adjustStockSchema,
  updateOrderStatusSchema,
  createCouponSchema,
  updateCouponSchema,
  imageUploadSchema,
  updateCustomerStatusSchema
} from '../validators/adminValidators.js';
import { moderateReviewSchema } from '../validators/reviewValidators.js';
import {
  getAdminReviews,
  moderateReview,
  deleteAdminReview
} from '../controllers/adminReviewController.js';

import {
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  uploadProductImage
} from '../controllers/adminProductController.js';

import {
  getAdminCategories,
  getAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory
} from '../controllers/adminCategoryController.js';

import {
  getAdminInventoryOverview,
  adjustAdminStock,
  getAdminInventoryMovements
} from '../controllers/adminInventoryController.js';

import {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus
} from '../controllers/adminOrderController.js';

import {
  getAdminCustomers,
  getAdminCustomerById,
  updateAdminCustomerStatus
} from '../controllers/adminCustomerController.js';

import {
  getAdminCoupons,
  getAdminCouponById,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon
} from '../controllers/adminCouponController.js';

import {
  getAdminAnalyticsSummary
} from '../controllers/adminAnalyticsController.js';

const router = Router();

// Protect ALL admin routes: require authentication and role === 'admin'
router.use(protect);
router.use(restrictTo('admin'));

// Ping / Verification
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Administrative privileges verified.',
      admin: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    }
  });
});

// Analytics & Dashboard Overview
router.get('/dashboard', getAdminAnalyticsSummary);
router.get('/analytics/summary', getAdminAnalyticsSummary);

// Products
router.get('/products', getAdminProducts);
router.post('/products', validateBody(createProductSchema), createAdminProduct);
router.get('/products/:id', validateParams(idParamSchema), getAdminProductById);
router.patch('/products/:id', validateParams(idParamSchema), validateBody(updateProductSchema), updateAdminProduct);
router.delete('/products/:id', validateParams(idParamSchema), deleteAdminProduct);
router.post('/uploads/image', validateBody(imageUploadSchema), uploadProductImage);
router.post('/products/upload-image', validateBody(imageUploadSchema), uploadProductImage);

// Categories
router.get('/categories', getAdminCategories);
router.get('/categories/:id', validateParams(idParamSchema), getAdminCategoryById);
router.post('/categories', validateBody(createCategorySchema), createAdminCategory);
router.patch('/categories/:id', validateParams(idParamSchema), validateBody(updateCategorySchema), updateAdminCategory);
router.delete('/categories/:id', validateParams(idParamSchema), deleteAdminCategory);

// Inventory
router.get('/inventory', getAdminInventoryOverview);
router.route('/inventory/adjust')
  .patch(validateBody(adjustStockSchema), adjustAdminStock)
  .post(validateBody(adjustStockSchema), adjustAdminStock);
router.get('/inventory/movements', getAdminInventoryMovements);

// Orders
router.get('/orders', getAdminOrders);
router.get('/orders/:id', validateParams(idParamSchema), getAdminOrderById);
router.patch('/orders/:id/status', validateParams(idParamSchema), validateBody(updateOrderStatusSchema), updateAdminOrderStatus);

// Customers
router.get('/customers', getAdminCustomers);
router.get('/customers/:id', validateParams(idParamSchema), getAdminCustomerById);
router.patch('/customers/:id/status', validateParams(idParamSchema), validateBody(updateCustomerStatusSchema), updateAdminCustomerStatus);

// Coupons
router.get('/coupons', getAdminCoupons);
router.post('/coupons', validateBody(createCouponSchema), createAdminCoupon);
router.get('/coupons/:id', validateParams(idParamSchema), getAdminCouponById);
router.patch('/coupons/:id', validateParams(idParamSchema), validateBody(updateCouponSchema), updateAdminCoupon);
router.delete('/coupons/:id', validateParams(idParamSchema), deleteAdminCoupon);

// Reviews Moderation
router.get('/reviews', getAdminReviews);
router.patch('/reviews/:id/moderation', validateParams(idParamSchema), validateBody(moderateReviewSchema), moderateReview);
router.delete('/reviews/:id', validateParams(idParamSchema), deleteAdminReview);

export default router;

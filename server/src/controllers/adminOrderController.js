import Order from '../models/Order.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { restoreOrderInventory } from '../services/inventoryService.js';
import { releaseOrderCoupon } from '../services/couponService.js';
import { queueOrderShippedEmail, queueOrderDeliveredEmail, queueOrderCancelledEmail } from '../services/email/orderEmailEvents.js';
import { AppError } from '../middleware/errorHandler.js';

const escapeRegex = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/v1/admin/orders
 * Paginated order queue with multi-faceted search (orderNumber, name, email, phone)
 * and filtering (orderStatus, paymentStatus, paymentMethod, date range).
 */
export const getAdminOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    // 1. Order Status Filter
    if (req.query.orderStatus && req.query.orderStatus !== 'all') {
      query.orderStatus = req.query.orderStatus;
    }

    // 2. Payment Status Filter
    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
      query.paymentStatus = req.query.paymentStatus;
    }

    // 3. Payment Method Filter
    if (req.query.paymentMethod && req.query.paymentMethod !== 'all') {
      query.paymentMethod = req.query.paymentMethod;
    }

    // 4. Date Range Filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // 5. Search by Order Number, Customer Name, Email, or Phone
    if (req.query.search && req.query.search.trim()) {
      const term = req.query.search.trim();
      const searchRegex = { $regex: escapeRegex(term), $options: 'i' };

      // Pre-resolve matching users by email or name to include foreign user reference in search
      const matchingUsers = await User.find({
        $or: [{ email: searchRegex }, { name: searchRegex }]
      })
        .select('_id')
        .lean();
      const matchingUserIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { orderNumber: searchRegex },
        { 'shippingAddressSnapshot.fullName': searchRegex },
        { 'shippingAddressSnapshot.phone': searchRegex },
        { userId: { $in: matchingUserIds } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/orders/:id
 * Retrieve complete order dossier including customer snapshot, itemized products,
 * status timeline, and linked payment gateway record.
 */
export const getAdminOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('statusTimeline.updatedBy', 'name email role')
      .lean();

    if (!order) {
      return next(new AppError('Order dossier not found in atelier records.', 404, 'ORDER_NOT_FOUND'));
    }

    // Fetch linked payment gateway record (strictly excluding signatures and credentials)
    const rawPayment = await Payment.findOne({ orderId: order._id })
      .select('-razorpaySignature')
      .lean();

    let paymentRecord = null;
    if (rawPayment) {
      const { razorpaySignature, ...safePayment } = rawPayment;
      paymentRecord = safePayment;
    }

    res.status(200).json({
      success: true,
      data: {
        order: {
          ...order,
          paymentRecord: paymentRecord || null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/orders/:id/status
 * Authoritative fulfillment state machine with payment safety, courier validation,
 * and single-execution inventory restoration.
 */
export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const {
      orderStatus: targetStatus,
      trackingNumber,
      carrierName,
      note,
      cancellationReason
    } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(new AppError('Order not found.', 404, 'ORDER_NOT_FOUND'));
    }

    const currentStatus = order.orderStatus;

    if (currentStatus === targetStatus) {
      return res.status(200).json({
        success: true,
        data: {
          order,
          message: `Order is already in '${targetStatus}' state.`
        }
      });
    }

    // Define strict valid state machine transitions
    const validTransitions = {
      pending_payment: ['cancelled'], // Unpaid orders cannot be confirmed manually without gateway payment
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: ['return_requested'],
      return_requested: ['returned'],
      cancelled: [], // Terminal state
      returned: [] // Terminal state
    };

    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(targetStatus)) {
      return next(
        new AppError(
          `Invalid order transition from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowedNext.join(', ')}].`,
          400,
          'INVALID_STATUS_TRANSITION'
        )
      );
    }

    // Mandatory Rule: If an order was paid via Razorpay, block cancellation if no safe automated refund is present
    if (
      targetStatus === 'cancelled' &&
      order.paymentMethod === 'razorpay' &&
      order.paymentStatus === 'paid'
    ) {
      return next(
        new AppError(
          `Order '${order.orderNumber}' was paid online via Razorpay (₹${order.total}). Automated payment gateway refunds are not enabled in this environment. To protect customer funds and financial accounting, please process and verify the refund through the Razorpay Merchant Dashboard before cancelling.`,
          400,
          'PAID_ORDER_REFUND_REQUIRED'
        )
      );
    }

    // Cancellation & Inventory Restoration Safety
    if (targetStatus === 'cancelled') {
      // Restore inventory ONLY if stock was actually deducted (confirmed or processing states)
      if (['confirmed', 'processing'].includes(currentStatus)) {
        await restoreOrderInventory(order, 'order_cancelled');
      }

      // Atomically release coupon allocation if applied and not yet released
      if (order.couponId) {
        await releaseOrderCoupon(order._id);
      }
      // For pending_payment orders, stock was never deducted; do NOT restore inventory

      const reason = cancellationReason || note || 'Cancelled by Atelier Administrator';
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
    }

    // Shipping Validation: Dispatch requires carrier name and tracking number
    if (targetStatus === 'shipped') {
      if (!trackingNumber || !trackingNumber.trim() || !carrierName || !carrierName.trim()) {
        return next(
          new AppError(
            'Logistics Carrier Name and Tracking Number/AWB are required before dispatching an order to shipped status.',
            400,
            'MISSING_SHIPPING_DETAILS',
            [{ field: 'trackingNumber', issue: 'Required for courier dispatch' }]
          )
        );
      }
      order.trackingNumber = trackingNumber.trim();
      order.carrierName = carrierName.trim();
    }

    // COD Payment Status Rule: Mark as paid upon confirmed delivery
    if (targetStatus === 'delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }

    // Update status and append immutable audit timeline entry
    order.orderStatus = targetStatus;
    const timelineNote =
      note ||
      (targetStatus === 'cancelled'
        ? order.cancellationReason
        : `Status transitioned to ${targetStatus} by ${req.user?.name || 'Administrator'}`);

    order.statusTimeline.push({
      status: targetStatus,
      timestamp: new Date(),
      note: timelineNote,
      updatedBy: req.user?._id
    });

    await order.save();

    // Safely resolve customer details for email notifications without failing the order update
    try {
      let customer = null;
      if (order.userId) {
        if (typeof order.userId === 'object' && order.userId.email) {
          customer = order.userId;
        } else {
          customer = await User.findById(order.userId).select('name email').lean();
        }
      }

      const customerEmail = customer?.email || null;
      const customerName = customer?.name || order.shippingAddressSnapshot?.fullName || 'Valued Client';

      if (customerEmail) {
        if (targetStatus === 'shipped') {
          await queueOrderShippedEmail({
            order,
            customerEmail,
            customerName,
            carrierName: order.carrierName,
            trackingNumber: order.trackingNumber
          });
        } else if (targetStatus === 'delivered') {
          await queueOrderDeliveredEmail({
            order,
            customerEmail,
            customerName
          });
        } else if (targetStatus === 'cancelled') {
          await queueOrderCancelledEmail({
            order,
            customerEmail,
            customerName,
            cancellationReason: order.cancellationReason
          });
        }
      }
    } catch (emailErr) {
      const safeCode = emailErr.code ? ` [code: ${emailErr.code}]` : '';
      console.warn(`[AdminOrder] Non-fatal notification error for order #${order.orderNumber}${safeCode}`);
    }

    res.status(200).json({
      success: true,
      data: {
        order,
        message: `Order '${order.orderNumber}' successfully moved to '${targetStatus}'.`
      }
    });
  } catch (error) {
    next(error);
  }
};

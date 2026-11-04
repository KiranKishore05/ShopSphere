import Order from '../models/Order.js';
import User from '../models/User.js';
import { restoreOrderInventory } from '../services/inventoryService.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/admin/orders
 * List orders with search, filtering by orderStatus and paymentStatus.
 */
export const getAdminOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.orderStatus) {
      query.orderStatus = req.query.orderStatus;
    }

    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.paymentMethod) {
      query.paymentMethod = req.query.paymentMethod;
    }

    if (req.query.search) {
      query.$or = [
        { orderNumber: { $regex: req.query.search, $options: 'i' } },
        { 'shippingAddressSnapshot.fullName': { $regex: req.query.search, $options: 'i' } },
        { 'shippingAddressSnapshot.phone': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'name email')
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
 */
export const getAdminOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('statusTimeline.updatedBy', 'name email')
      .lean();

    if (!order) {
      return next(new AppError('Order not found.', 404, 'ORDER_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/orders/:id/status
 * Transition order through valid fulfillment lifecycle:
 * confirmed -> processing -> shipped -> delivered.
 * Or cancellation with automatic inventory restoration.
 */
export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus: targetStatus, trackingNumber, carrierName, note } = req.body;

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

    // Define valid status transitions
    const validTransitions = {
      pending_payment: ['cancelled', 'confirmed'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: ['return_requested', 'returned'],
      cancelled: []
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

    // If transitioning to cancelled: restore inventory
    if (targetStatus === 'cancelled') {
      if (['confirmed', 'processing'].includes(currentStatus)) {
        await restoreOrderInventory(order, 'order_cancelled');
      }
      order.cancellationReason = note || 'Cancelled by Atelier Administrator';
      order.cancelledAt = new Date();
    }

    // If transitioning to shipped: store carrier and tracking number
    if (targetStatus === 'shipped') {
      if (trackingNumber) order.trackingNumber = trackingNumber;
      if (carrierName) order.carrierName = carrierName;
    }

    // If COD order is delivered, mark paymentStatus as paid
    if (targetStatus === 'delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }

    order.orderStatus = targetStatus;
    order.statusTimeline.push({
      status: targetStatus,
      timestamp: new Date(),
      note: note || `Status updated to ${targetStatus} by ${req.user.name}`,
      updatedBy: req.user._id
    });

    await order.save();

    res.status(200).json({
      success: true,
      data: {
        order,
        message: `Order '${order.orderNumber}' moved to '${targetStatus}'.`
      }
    });
  } catch (error) {
    next(error);
  }
};

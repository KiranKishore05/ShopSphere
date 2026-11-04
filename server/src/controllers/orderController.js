import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import { buildEnrichedCart } from './cartController.js';
import { validateAndCalculateCoupon } from './couponController.js';
import { deductOrderInventory, restoreOrderInventory } from '../services/inventoryService.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Generate unique, high-end order tracking number:
 * Format: SPH-<timestamp-base36>-<random4> (e.g. SPH-L8B1Z9-A4F2)
 */
const generateOrderNumber = () => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SPH-${timePart}-${randPart}`;
};

/**
 * POST /api/v1/orders/checkout
 * Converts customer's active cart into a confirmed/pending Order.
 * Authoritative recalculation of all prices, stocks, and discounts.
 */
export const checkout = async (req, res, next) => {
  try {
    const { addressId, shippingAddress: customShippingAddress, paymentMethod, couponCode, idempotencyKey } = req.body;

    // Idempotency check: if an order with same idempotencyKey exists for this user in last 10 minutes
    if (idempotencyKey) {
      const recentOrder = await Order.findOne({
        userId: req.user._id,
        idempotencyKey,
        createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
      });
      if (recentOrder) {
        return res.status(200).json({
          success: true,
          data: {
            order: recentOrder,
            isDuplicate: true
          }
        });
      }
    }

    // 1. Fetch & Verify Cart from Database
    const enrichedCart = await buildEnrichedCart(req.user._id);
    if (!enrichedCart.items || enrichedCart.items.length === 0) {
      return next(new AppError('Your shopping bag is empty. Please select garments before checkout.', 400, 'CART_EMPTY'));
    }

    // Verify all items are active and stock is sufficient
    for (const item of enrichedCart.items) {
      if (!item.isAvailable || item.stockQuantity < item.quantity) {
        return next(new AppError(
          `Garment '${item.productName}' (${item.size}) has insufficient inventory. Available: ${item.stockQuantity}, in bag: ${item.quantity}.`,
          400,
          'INSUFFICIENT_STOCK',
          [{ field: item.variantSku, issue: 'Stock unavailable' }]
        ));
      }
    }

    // 2. Resolve Shipping Address Snapshot
    let resolvedAddress;
    if (addressId) {
      const user = await User.findById(req.user._id);
      const saved = user?.savedAddresses?.id(addressId);
      if (!saved) {
        return next(new AppError('Selected shipping address not found in your address book.', 404, 'ADDRESS_NOT_FOUND'));
      }
      resolvedAddress = {
        fullName: saved.fullName,
        phone: saved.phone,
        streetAddress: saved.streetAddress,
        apartment: saved.apartment || '',
        city: saved.city,
        state: saved.state,
        postalCode: saved.postalCode,
        country: saved.country || 'India'
      };
    } else if (customShippingAddress) {
      resolvedAddress = {
        fullName: customShippingAddress.fullName,
        phone: customShippingAddress.phone,
        streetAddress: customShippingAddress.streetAddress,
        apartment: customShippingAddress.apartment || '',
        city: customShippingAddress.city,
        state: customShippingAddress.state,
        postalCode: customShippingAddress.postalCode,
        country: customShippingAddress.country || 'India'
      };
    } else {
      return next(new AppError('A valid delivery address is required to place an order.', 400, 'ADDRESS_REQUIRED'));
    }

    // 3. Server-authoritative Pricing & Calculations
    const subtotal = enrichedCart.subtotal;
    const shippingFee = enrichedCart.isEligibleForFreeShipping ? 0 : 350;
    const tax = 0; // Inclusive for luxury atelier goods

    // 4. Coupon Calculation
    let coupon = null;
    let discount = 0;
    if (couponCode) {
      const couponResult = await validateAndCalculateCoupon(couponCode, subtotal, req.user._id);
      coupon = couponResult.coupon;
      discount = couponResult.discountAmount;
    }

    const total = Math.max(0, subtotal - discount + shippingFee + tax);

    // 5. COD Validation
    if (paymentMethod === 'cod') {
      if (total > 20000) {
        return next(new AppError(
          'Cash on Delivery is unavailable for orders exceeding ₹20,000. Please proceed with Razorpay digital payment.',
          400,
          'COD_LIMIT_EXCEEDED'
        ));
      }
    }

    // 6. Build Immutable Item Snapshots
    const itemsSnapshot = enrichedCart.items.map(item => ({
      productId: item.productId,
      variantSku: item.variantSku,
      name: item.productName,
      size: item.size,
      color: item.color,
      image: item.image,
      unitPrice: item.price,
      quantity: item.quantity,
      lineTotal: item.itemTotal
    }));

    // 7. Create Order Document
    const orderNumber = generateOrderNumber();
    const initialStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending_payment';
    const initialPaymentStatus = 'pending';

    const statusTimeline = [
      {
        status: initialStatus,
        timestamp: new Date(),
        note: idempotencyKey ? `Order initiated. Idempotency-Key: ${idempotencyKey}` : 'Order initiated via checkout.'
      }
    ];

    const order = new Order({
      orderNumber,
      userId: req.user._id,
      items: itemsSnapshot,
      shippingAddressSnapshot: resolvedAddress,
      subtotal,
      discount,
      shippingFee,
      tax,
      total,
      couponCode: coupon ? coupon.code : null,
      couponId: coupon ? coupon._id : null,
      paymentMethod,
      paymentStatus: initialPaymentStatus,
      orderStatus: initialStatus,
      idempotencyKey: idempotencyKey || null,
      statusTimeline
    });

    await order.save();

    // 8. If COD: immediately deduct inventory and clear cart
    if (paymentMethod === 'cod') {
      await deductOrderInventory(order);

      if (coupon) {
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
      }

      await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { items: [] } });
    }

    res.status(201).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          items: order.items,
          shippingAddressSnapshot: order.shippingAddressSnapshot,
          subtotal: order.subtotal,
          discount: order.discount,
          shippingFee: order.shippingFee,
          tax: order.tax,
          total: order.total,
          couponCode: order.couponCode,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          statusTimeline: order.statusTimeline,
          createdAt: order.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/me
 * List all orders placed by the authenticated customer.
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ userId: req.user._id })
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        meta: {
          page,
          limit,
          total: totalOrders,
          totalPages: Math.ceil(totalOrders / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/me/:orderNumber
 * Fetch details for a specific customer order.
 */
export const getMyOrderByNumber = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      userId: req.user._id,
      orderNumber: orderNumber.toUpperCase()
    }).lean();

    if (!order) {
      return next(new AppError(`Order '${orderNumber}' not found in your order history.`, 404, 'ORDER_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/orders/me/:orderNumber/cancel
 * Customer order cancellation if order is pending_payment or confirmed.
 */
export const cancelMyOrder = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { reason = 'Cancelled by customer' } = req.body;

    const order = await Order.findOne({
      userId: req.user._id,
      orderNumber: orderNumber.toUpperCase()
    });

    if (!order) {
      return next(new AppError(`Order '${orderNumber}' not found.`, 404, 'ORDER_NOT_FOUND'));
    }

    // Cancellation is only allowed before shipping
    if (!['pending_payment', 'confirmed'].includes(order.orderStatus)) {
      return next(new AppError(
        `Order '${orderNumber}' cannot be cancelled as it is currently '${order.orderStatus}'.`,
        400,
        'CANNOT_CANCEL_ORDER'
      ));
    }

    // If stock was already deducted (COD or confirmed payment), restore it
    if (order.orderStatus === 'confirmed') {
      await restoreOrderInventory(order, 'order_cancelled');
    }

    order.orderStatus = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    order.statusTimeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Cancelled: ${reason}`
    });

    await order.save();

    res.status(200).json({
      success: true,
      data: {
        order,
        message: `Order '${orderNumber}' successfully cancelled.`
      }
    });
  } catch (error) {
    next(error);
  }
};

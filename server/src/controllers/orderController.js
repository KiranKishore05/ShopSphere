import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import { buildEnrichedCart } from './cartController.js';
import { validateAndCalculateCoupon } from './couponController.js';
import { deductOrderInventory, restoreOrderInventory } from '../services/inventoryService.js';
import { consumeOrderCoupon, releaseOrderCoupon } from '../services/couponService.js';
import { queueOrderConfirmationEmail, queueOrderCancelledEmail } from '../services/email/orderEmailEvents.js';
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
 * Safely verify user ownership of an order supporting unpopulated or populated ObjectId/string.
 */
export const isOrderOwner = (order, user) => {
  if (!order || !user) return false;
  const orderUserId = order.userId?._id
    ? order.userId._id.toString()
    : order.userId?.toString();
  const currentUserId = user._id
    ? user._id.toString()
    : user.toString();

  return Boolean(orderUserId && currentUserId && orderUserId === currentUserId);
};

/**
 * Validates checkout request consistency against an existing idempotent order snapshot.
 * Verifies paymentMethod, coupon, delivery address, items/quantities, and server totals.
 */
export const verifyOrderConsistency = (existingOrder, { paymentMethod, coupon, couponCode, total, subtotal, resolvedAddress, itemsSnapshot }) => {
  if (!existingOrder) return false;

  // 1. Payment method match
  if (existingOrder.paymentMethod !== paymentMethod) return false;

  // 2. Coupon code match
  const requestedCouponCode = (typeof coupon === 'object' && coupon?.code)
    ? coupon.code
    : (couponCode || coupon || null);
  const existingCouponCode = existingOrder.couponCode || null;
  if (requestedCouponCode !== existingCouponCode) return false;

  // 3. Address match (street address and postal code)
  const existingAddr = existingOrder.shippingAddressSnapshot;
  if (!existingAddr || existingAddr.postalCode !== resolvedAddress?.postalCode || existingAddr.streetAddress !== resolvedAddress?.streetAddress) {
    return false;
  }

  // 4. Items and quantities match (when itemsSnapshot is provided)
  if (itemsSnapshot && itemsSnapshot.length > 0) {
    if (!existingOrder.items || existingOrder.items.length !== itemsSnapshot.length) return false;
    const existingItemsMap = new Map();
    for (const it of existingOrder.items) {
      const key = `${it.variantSku}:${it.quantity}`;
      existingItemsMap.set(key, (existingItemsMap.get(key) || 0) + 1);
    }
    for (const it of itemsSnapshot) {
      const key = `${it.variantSku}:${it.quantity}`;
      const count = existingItemsMap.get(key) || 0;
      if (count <= 0) return false;
      existingItemsMap.set(key, count - 1);
    }
  }

  // 5. Total and subtotal match (when provided)
  if (typeof total === 'number' && typeof existingOrder.total === 'number') {
    if (Math.abs(existingOrder.total - total) > 0.01) return false;
  }
  if (typeof subtotal === 'number' && typeof existingOrder.subtotal === 'number') {
    if (Math.abs(existingOrder.subtotal - subtotal) > 0.01) return false;
  }

  return true;
};

/**
 * POST /api/v1/orders/checkout
 * Converts customer's active cart into a confirmed/pending Order.
 * Authoritative recalculation of all prices, stocks, and discounts.
 */
export const checkout = async (req, res, next) => {
  try {
    const { addressId, shippingAddress: customShippingAddress, paymentMethod, couponCode, idempotencyKey } = req.body;

    // 1. Resolve Shipping Address Snapshot early
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

    // 2. Idempotency pre-check: resolve existing key BEFORE checking current shopping cart
    // This ensures retries after cart clearance return the original order instead of CART_EMPTY
    if (idempotencyKey) {
      const existingKeyOrder = await Order.findOne({ idempotencyKey });
      if (existingKeyOrder) {
        // Security check: Never expose or resolve an idempotency key belonging to another user
        if (!isOrderOwner(existingKeyOrder, req.user)) {
          return next(
            new AppError(
              'This idempotency key is already in use by another transaction.',
              409,
              'IDEMPOTENCY_KEY_IN_USE'
            )
          );
        }

        // Validate consistency against original request parameters
        const isConsistent = verifyOrderConsistency(existingKeyOrder, {
          paymentMethod,
          couponCode,
          resolvedAddress
        });

        if (!isConsistent) {
          return next(
            new AppError(
              'Idempotency key reused with mismatched order details.',
              409,
              'IDEMPOTENCY_PAYLOAD_MISMATCH'
            )
          );
        }

        return res.status(200).json({
          success: true,
          data: {
            order: existingKeyOrder,
            isDuplicate: true
          }
        });
      }
    }

    // 3. Fetch & Verify Cart from Database
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

    // 4. Server-authoritative Pricing & Calculations
    const subtotal = enrichedCart.subtotal;
    const shippingFee = enrichedCart.isEligibleForFreeShipping ? 0 : 350;
    const tax = 0; // Inclusive for luxury atelier goods

    // 5. Coupon Calculation
    let coupon = null;
    let discount = 0;
    if (couponCode) {
      const couponResult = await validateAndCalculateCoupon(couponCode, subtotal, req.user._id);
      coupon = couponResult.coupon;
      discount = couponResult.discountAmount;
    }

    const total = Math.max(0, subtotal - discount + shippingFee + tax);

    // 6. COD Validation
    if (paymentMethod === 'cod') {
      if (total > 20000) {
        return next(new AppError(
          'Cash on Delivery is unavailable for orders exceeding ₹20,000. Please proceed with Razorpay digital payment.',
          400,
          'COD_LIMIT_EXCEEDED'
        ));
      }
    }

    // 7. Build Immutable Item Snapshots
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

    // 8. Create Order Document
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

    try {
      await order.save();
    } catch (saveErr) {
      if (
        saveErr.code === 11000 &&
        (saveErr.keyPattern?.idempotencyKey || saveErr.message?.includes('idempotencyKey'))
      ) {
        const existingOrder = await Order.findOne({ idempotencyKey });
        if (!existingOrder) {
          return next(
            new AppError(
              'An order with this idempotency key is already being processed.',
              409,
              'IDEMPOTENCY_CONFLICT'
            )
          );
        }

        // Security check: Never expose another user's order
        if (!isOrderOwner(existingOrder, req.user)) {
          return next(
            new AppError(
              'This idempotency key is already in use by another transaction.',
              409,
              'IDEMPOTENCY_KEY_IN_USE'
            )
          );
        }

        // Full payload consistency check
        const isConsistent = verifyOrderConsistency(existingOrder, {
          paymentMethod,
          coupon,
          total,
          subtotal,
          resolvedAddress,
          itemsSnapshot
        });

        if (!isConsistent) {
          return next(
            new AppError(
              'Idempotency key reused with mismatched order details.',
              409,
              'IDEMPOTENCY_PAYLOAD_MISMATCH'
            )
          );
        }

        return res.status(200).json({
          success: true,
          data: {
            order: existingOrder,
            isDuplicate: true
          }
        });
      }
      throw saveErr;
    }

    // 9. If COD: immediately deduct inventory and clear cart
    if (paymentMethod === 'cod') {
      await deductOrderInventory(order);

      if (coupon) {
        try {
          await consumeOrderCoupon(order._id);
        } catch (consumeErr) {
          await restoreOrderInventory(order, 'coupon_limit_exceeded');
          order.orderStatus = 'cancelled';
          order.cancellationReason = consumeErr.message || 'Promotional voucher allocation exhausted.';
          await order.save();
          return next(consumeErr);
        }
      }

      await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { items: [] } });

      await queueOrderConfirmationEmail({
        order,
        customerEmail: req.user.email,
        customerName: req.user.name || order.shippingAddressSnapshot.fullName
      });
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

    // Atomically release coupon allocation if applied and not yet released
    if (order.couponId) {
      await releaseOrderCoupon(order._id);
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

    await queueOrderCancelledEmail({
      order,
      customerEmail: req.user.email,
      customerName: req.user.name || order.shippingAddressSnapshot.fullName,
      cancellationReason: reason
    });

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

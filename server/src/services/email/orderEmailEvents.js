import { queueEmail } from './emailOutboxService.js';
import config from '../../config/env.js';

/**
 * Maps raw Order items into sanitized, strictly-validated items matching email schema.
 */
const mapOrderItems = (items = []) => {
  return items.map((item) => {
    let colorName = 'Standard';
    if (item.color) {
      if (typeof item.color === 'string') {
        colorName = item.color;
      } else if (typeof item.color === 'object' && item.color.name) {
        colorName = item.color.name;
      }
    }

    const title = item.name || item.title || 'Atelier Garment';

    return {
      title,
      name: title,
      variantSku: item.variantSku || 'SKU-UNKNOWN',
      size: item.size || 'One Size',
      color: colorName,
      quantity: Number(item.quantity) || 1,
      price: Number(item.unitPrice || item.price || 0),
      lineTotal: Number(item.lineTotal || 0)
    };
  });
};

/**
 * Maps raw shipping address snapshot into sanitized address snapshot.
 */
const mapShippingAddress = (snapshot = {}) => {
  const address = {
    fullName: snapshot.fullName || 'Valued Client',
    streetAddress: snapshot.streetAddress || 'Address on file',
    city: snapshot.city || 'City',
    state: snapshot.state || 'State',
    postalCode: snapshot.postalCode || '000000',
    country: snapshot.country || 'India'
  };

  if (snapshot.apartment) {
    address.apartment = snapshot.apartment;
  }
  if (snapshot.phone) {
    address.phone = snapshot.phone;
  }

  return address;
};

/**
 * Resolves the primary URL for customer order details.
 */
const getOrderDetailsUrl = (orderNumber) => {
  const baseUrl = config.APP_BASE_URL || 'https://shopsphere.in';
  return `${baseUrl}/account/orders/${encodeURIComponent(orderNumber)}`;
};

/**
 * Resolves the URL for admin dashboard order inspection.
 */
const getAdminOrderUrl = (orderId) => {
  const baseUrl = config.APP_BASE_URL || 'https://shopsphere.in';
  return `${baseUrl}/admin/orders/${encodeURIComponent(orderId)}`;
};

/**
 * Sanitizes gateway error messages to ensure only user-appropriate explanations are recorded.
 * Never leaks raw gateway payloads, internal exception messages, stack traces, or credentials.
 */
export const sanitizeFailureReason = (reason) => {
  if (!reason || typeof reason !== 'string') {
    return 'Payment authorization declined';
  }
  const clean = reason.trim().replace(/[\r\n\t]+/g, ' ');
  const lower = clean.toLowerCase();

  // Guard against internal error message or credential leakage
  if (
    lower.includes('password') ||
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('mongo') ||
    lower.includes('database') ||
    lower.includes('connection') ||
    lower.includes('at ') ||
    lower.includes('error:')
  ) {
    return 'Payment authorization declined by issuing bank';
  }

  // Length constraint and safe formatting
  return clean.slice(0, 150);
};

/**
 * Dispatches Order Confirmation email (COD or Paid Online) and optional admin alert.
 * Guarantees outbox queuing failures do not disrupt the customer purchase workflow.
 */
export const queueOrderConfirmationEmail = async ({
  order,
  customerEmail,
  customerName,
  session = null
}) => {
  if (!order || !order.orderNumber) return;

  const resolvedName = customerName || order.shippingAddressSnapshot?.fullName || 'Valued Client';
  const resolvedEmail = customerEmail || (order.userId?.email ? order.userId.email : null);

  if (!resolvedEmail) {
    console.warn(`[OrderEmail] Skipped order confirmation for ${order.orderNumber}: No recipient email available.`);
    return;
  }

  const isCod = order.paymentMethod === 'cod';
  const eventType = isCod ? 'order_confirmed_cod' : 'order_confirmed_paid';
  const eventKey = `${eventType}:${order._id.toString()}`;

  const templateData = {
    customerName: resolvedName,
    orderNumber: order.orderNumber,
    paymentMethod: isCod ? 'cod' : 'razorpay',
    paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'pending',
    items: mapOrderItems(order.items),
    shippingAddress: mapShippingAddress(order.shippingAddressSnapshot),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    shippingFee: Number(order.shippingFee || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    estimatedDeliveryDays: '3-5 business days',
    orderDetailsUrl: getOrderDetailsUrl(order.orderNumber)
  };

  if (!isCod && order.paymentRecord?.razorpayPaymentId) {
    templateData.razorpayPaymentId = order.paymentRecord.razorpayPaymentId;
  }

  // 1. Queue Customer Confirmation
  try {
    await queueEmail({
      eventKey,
      eventType,
      recipient: resolvedEmail,
      templateData,
      session
    });
  } catch (err) {
    const safeCode = err.code ? ` [code: ${err.code}]` : '';
    console.warn(`[OrderEmail] Failed to queue customer confirmation for order #${order.orderNumber}${safeCode}`);
  }

  // 2. Queue Admin New Order Notification if configured
  if (config.ADMIN_NOTIFICATION_EMAIL && config.ADMIN_NOTIFICATION_EMAIL.trim()) {
    try {
      await queueEmail({
        eventKey: `admin_order_created:${order._id.toString()}`,
        eventType: 'admin_order_created',
        recipient: config.ADMIN_NOTIFICATION_EMAIL.trim(),
        templateData: {
          orderNumber: order.orderNumber,
          customerName: resolvedName,
          total: Number(order.total || 0),
          itemCount: order.items?.length || 1,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          adminOrderUrl: getAdminOrderUrl(order._id)
        },
        session
      });
    } catch (err) {
      const safeCode = err.code ? ` [code: ${err.code}]` : '';
      console.warn(`[OrderEmail] Failed to queue admin new order alert for order #${order.orderNumber}${safeCode}`);
    }
  }
};

/**
 * Dispatches Payment Failure notification to customer and admin.
 * Only invoked when payment status is conclusively failed.
 */
export const queuePaymentFailureEmail = async ({
  order,
  customerEmail,
  customerName,
  razorpayOrderId,
  failureReason,
  session = null
}) => {
  if (!order || !order.orderNumber) return;

  const resolvedName = customerName || order.shippingAddressSnapshot?.fullName || 'Valued Client';
  const resolvedEmail = customerEmail || (order.userId?.email ? order.userId.email : null);

  if (!resolvedEmail) {
    console.warn(`[OrderEmail] Skipped payment failure email for ${order.orderNumber}: No recipient email available.`);
    return;
  }

  const paymentKey = razorpayOrderId || order.orderNumber;
  const eventKey = `payment_failed:${order._id.toString()}:${paymentKey}`;
  const retryPaymentUrl = `${config.APP_BASE_URL || 'https://shopsphere.in'}/checkout?retryOrder=${encodeURIComponent(order.orderNumber)}`;
  const safeExplanation = sanitizeFailureReason(failureReason);

  // 1. Queue Customer Payment Failure Notification
  try {
    await queueEmail({
      eventKey,
      eventType: 'payment_failed',
      recipient: resolvedEmail,
      templateData: {
        customerName: resolvedName,
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpayOrderId || 'order_unknown',
        failureReason: safeExplanation,
        retryPaymentUrl,
        orderDetailsUrl: getOrderDetailsUrl(order.orderNumber)
      },
      session
    });
  } catch (err) {
    const safeCode = err.code ? ` [code: ${err.code}]` : '';
    console.warn(`[OrderEmail] Failed to queue payment failure notice for order #${order.orderNumber}${safeCode}`);
  }

  // 2. Queue Admin Alert if configured
  if (config.ADMIN_NOTIFICATION_EMAIL && config.ADMIN_NOTIFICATION_EMAIL.trim()) {
    try {
      await queueEmail({
        eventKey: `admin_payment_failed:${order._id.toString()}:${paymentKey}`,
        eventType: 'admin_payment_failed',
        recipient: config.ADMIN_NOTIFICATION_EMAIL.trim(),
        templateData: {
          orderNumber: order.orderNumber,
          customerName: resolvedName,
          total: Number(order.total || 0),
          paymentMethod: 'razorpay',
          failureReason: safeExplanation,
          adminOrderUrl: getAdminOrderUrl(order._id)
        },
        session
      });
    } catch (err) {
      const safeCode = err.code ? ` [code: ${err.code}]` : '';
      console.warn(`[OrderEmail] Failed to queue admin payment failure alert for order #${order.orderNumber}${safeCode}`);
    }
  }
};

/**
 * Dispatches Order Cancellation notification to customer and admin.
 * Only invoked after cancellation has successfully persisted.
 */
export const queueOrderCancelledEmail = async ({
  order,
  customerEmail,
  customerName,
  cancellationReason,
  refundSummary,
  session = null
}) => {
  if (!order || !order.orderNumber) return;

  const resolvedName = customerName || order.shippingAddressSnapshot?.fullName || 'Valued Client';
  const resolvedEmail = customerEmail || (order.userId?.email ? order.userId.email : null);

  if (!resolvedEmail) {
    console.warn(`[OrderEmail] Skipped cancellation notice for ${order.orderNumber}: No recipient email available.`);
    return;
  }

  const defaultRefundSummary =
    order.paymentMethod === 'cod'
      ? 'No payment was collected (Cash on Delivery).'
      : order.paymentStatus === 'paid'
      ? 'Payment was verified online. Refund processing will be initiated in accordance with our return policy.'
      : 'No funds were debited.';

  const reason = cancellationReason || order.cancellationReason || 'Order cancelled as requested.';

  // 1. Queue Customer Cancellation Notice
  try {
    await queueEmail({
      eventKey: `order_cancelled:${order._id.toString()}`,
      eventType: 'order_cancelled',
      recipient: resolvedEmail,
      templateData: {
        customerName: resolvedName,
        orderNumber: order.orderNumber,
        cancellationReason: reason,
        refundSummary: refundSummary || defaultRefundSummary,
        orderDetailsUrl: getOrderDetailsUrl(order.orderNumber)
      },
      session
    });
  } catch (err) {
    const safeCode = err.code ? ` [code: ${err.code}]` : '';
    console.warn(`[OrderEmail] Failed to queue cancellation email for order #${order.orderNumber}${safeCode}`);
  }

  // 2. Queue Admin Cancellation Notice if configured
  if (config.ADMIN_NOTIFICATION_EMAIL && config.ADMIN_NOTIFICATION_EMAIL.trim()) {
    try {
      await queueEmail({
        eventKey: `admin_order_cancelled:${order._id.toString()}`,
        eventType: 'admin_order_cancelled',
        recipient: config.ADMIN_NOTIFICATION_EMAIL.trim(),
        templateData: {
          orderNumber: order.orderNumber,
          customerName: resolvedName,
          total: Number(order.total || 0),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          cancellationReason: reason,
          adminOrderUrl: getAdminOrderUrl(order._id)
        },
        session
      });
    } catch (err) {
      const safeCode = err.code ? ` [code: ${err.code}]` : '';
      console.warn(`[OrderEmail] Failed to queue admin cancellation alert for order #${order.orderNumber}${safeCode}`);
    }
  }
};

/**
 * Dispatches Order Shipped notification to customer with logistics tracking details.
 */
export const queueOrderShippedEmail = async ({
  order,
  customerEmail,
  customerName,
  carrierName,
  trackingNumber,
  trackingUrl,
  session = null
}) => {
  if (!order || !order.orderNumber) return;

  const resolvedName = customerName || order.shippingAddressSnapshot?.fullName || 'Valued Client';
  const resolvedEmail = customerEmail || (order.userId?.email ? order.userId.email : null);

  if (!resolvedEmail) {
    console.warn(`[OrderEmail] Skipped shipping notice for ${order.orderNumber}: No recipient email available.`);
    return;
  }

  const templateData = {
    customerName: resolvedName,
    orderNumber: order.orderNumber,
    carrierName: carrierName || order.carrierName || 'Courier Partner',
    trackingNumber: trackingNumber || order.trackingNumber || 'Tracking on file',
    orderDetailsUrl: getOrderDetailsUrl(order.orderNumber)
  };

  if (trackingUrl) {
    templateData.trackingUrl = trackingUrl;
  }

  try {
    await queueEmail({
      eventKey: `order_shipped:${order._id.toString()}`,
      eventType: 'order_shipped',
      recipient: resolvedEmail,
      templateData,
      session
    });
  } catch (err) {
    const safeCode = err.code ? ` [code: ${err.code}]` : '';
    console.warn(`[OrderEmail] Failed to queue shipping notice for order #${order.orderNumber}${safeCode}`);
  }
};

/**
 * Dispatches Order Delivered notification to customer upon verified delivery.
 */
export const queueOrderDeliveredEmail = async ({
  order,
  customerEmail,
  customerName,
  deliveredAt,
  reviewUrl,
  session = null
}) => {
  if (!order || !order.orderNumber) return;

  const resolvedName = customerName || order.shippingAddressSnapshot?.fullName || 'Valued Client';
  const resolvedEmail = customerEmail || (order.userId?.email ? order.userId.email : null);

  if (!resolvedEmail) {
    console.warn(`[OrderEmail] Skipped delivery notice for ${order.orderNumber}: No recipient email available.`);
    return;
  }

  const templateData = {
    customerName: resolvedName,
    orderNumber: order.orderNumber,
    deliveredAt: deliveredAt || 'today',
    orderDetailsUrl: getOrderDetailsUrl(order.orderNumber)
  };

  if (reviewUrl) {
    templateData.reviewUrl = reviewUrl;
  }

  try {
    await queueEmail({
      eventKey: `order_delivered:${order._id.toString()}`,
      eventType: 'order_delivered',
      recipient: resolvedEmail,
      templateData,
      session
    });
  } catch (err) {
    const safeCode = err.code ? ` [code: ${err.code}]` : '';
    console.warn(`[OrderEmail] Failed to queue delivery notice for order #${order.orderNumber}${safeCode}`);
  }
};


import renderWelcomeTemplate from './welcomeTemplate.js';
import renderOrderConfirmedTemplate from './orderConfirmedTemplate.js';
import renderPasswordResetTemplate from './passwordResetTemplate.js';
import renderPaymentFailedTemplate from './paymentFailedTemplate.js';
import renderOrderShippedTemplate from './orderShippedTemplate.js';
import renderOrderDeliveredTemplate from './orderDeliveredTemplate.js';
import renderOrderCancelledTemplate from './orderCancelledTemplate.js';
import renderAdminOrderTemplate from './adminOrderTemplate.js';
import { decryptToken } from '../../../utils/emailTokenCrypto.js';
import config from '../../../config/env.js';

export const TEMPLATE_REGISTRY = {
  welcome_customer: renderWelcomeTemplate,
  password_reset_request: (data) => {
    // If encryptedTokenPayload is present, decrypt it in-memory to construct the reset URL
    let resetUrl = data.resetUrl;
    if (!resetUrl && data.encryptedTokenPayload) {
      const rawToken = decryptToken(data.encryptedTokenPayload);
      // Place token in URL fragment (#token=) so it is never transmitted to web servers or logged in Referer/proxy logs
      resetUrl = `${config.APP_BASE_URL || 'https://shopsphere.in'}/reset-password#token=${rawToken}`;
    }
    return renderPasswordResetTemplate({
      ...data,
      resetUrl
    });
  },
  order_confirmed_cod: renderOrderConfirmedTemplate,
  order_confirmed_paid: renderOrderConfirmedTemplate,
  payment_failed: renderPaymentFailedTemplate,
  order_shipped: renderOrderShippedTemplate,
  order_delivered: renderOrderDeliveredTemplate,
  order_cancelled: renderOrderCancelledTemplate,
  refund_processed: (data) => {
    return renderOrderCancelledTemplate({
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      cancellationReason: 'Refund Processed',
      refundSummary: `A refund of ₹${Number(data.refundAmount).toLocaleString('en-IN')} has been initiated via ${data.refundMethod || 'original payment method'}.`
    });
  },
  admin_order_created: (data) => renderAdminOrderTemplate(data, 'admin_order_created'),
  admin_payment_failed: (data) => renderAdminOrderTemplate(data, 'admin_payment_failed'),
  admin_order_cancelled: (data) => renderAdminOrderTemplate(data, 'admin_order_cancelled')
};

/**
 * Compiles an email event payload into subject, HTML, and plain text.
 */
export const renderEmailTemplate = (eventType, templateData) => {
  const renderer = TEMPLATE_REGISTRY[eventType];
  if (!renderer) {
    throw new Error(`No email template registered for event type '${eventType}'.`);
  }
  return renderer(templateData);
};

export default renderEmailTemplate;


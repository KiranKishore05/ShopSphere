import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderPaymentFailedTemplate = (data) => {
  const { customerName, orderNumber, failureReason = 'Payment authorization declined', retryPaymentUrl, orderDetailsUrl } = data;

  const subject = `Payment Pending for Order #${orderNumber} | ShopSphere`;
  const preheader = 'Your payment attempt could not be processed. Complete your order here.';

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #b91c1c;">
      Payment Authorization Issue
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      Dear ${escapeHtml(customerName)},
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      We were unable to complete payment verification for your order <strong>#${escapeHtml(orderNumber)}</strong>.
    </p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #991b1b;">
        <strong>Reason:</strong> ${escapeHtml(failureReason)}
      </p>
    </div>
    <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.6;">
      Your selected items remain temporarily reserved. You may retry your payment with an alternate card, UPI, or select Cash on Delivery:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(retryPaymentUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        Retry Payment
      </a>
      ${orderDetailsUrl ? `
      <div style="margin-top: 12px;">
        <a href="${escapeHtml(orderDetailsUrl)}" style="font-size: 13px; color: #64748b; text-decoration: underline;">
          View Order Summary
        </a>
      </div>` : ''}
    </div>
  `;

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml });
  const text = `Payment Issue on Order #${orderNumber}\n\nDear ${customerName},\nWe could not verify payment for order #${orderNumber}: ${failureReason}.\nRetry your payment: ${retryPaymentUrl}\n${orderDetailsUrl ? `Order details: ${orderDetailsUrl}\n` : ''}\nShopSphere Concierge: support@shopsphere.in`;

  return { subject, html, text };
};

export default renderPaymentFailedTemplate;


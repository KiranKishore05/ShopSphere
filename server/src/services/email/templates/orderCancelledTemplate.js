import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderOrderCancelledTemplate = (data) => {
  const { customerName, orderNumber, cancellationReason = 'Order cancelled', refundSummary, orderDetailsUrl } = data;

  const subject = `Order Cancellation Notice: #${orderNumber} | ShopSphere`;
  const preheader = `Confirmation of cancellation for order #${orderNumber}.`;

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;">
      Order Cancellation Confirmation
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      Dear ${escapeHtml(customerName)},
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      Your order <strong>#${escapeHtml(orderNumber)}</strong> has been cancelled as requested.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #334155;">
        <strong>Reason:</strong> ${escapeHtml(cancellationReason)}
      </p>
      ${refundSummary ? `
      <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
        <strong>Refund Status:</strong> ${escapeHtml(refundSummary)}
      </p>` : ''}
    </div>
    <p style="margin: 0 0 20px; font-size: 14px; color: #64748b; line-height: 1.6;">
      Any promotional vouchers applied to this purchase have been released and restored to your account eligibility.
    </p>
    ${orderDetailsUrl ? `
    <div style="text-align: center; margin: 24px 0 12px;">
      <a href="${escapeHtml(orderDetailsUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        View Order Status
      </a>
    </div>` : ''}
  `;

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml });
  const text = `Order #${orderNumber} Cancelled\n\nDear ${customerName},\nYour order #${orderNumber} has been cancelled: ${cancellationReason}.\n${refundSummary ? `Refund: ${refundSummary}\n` : ''}${orderDetailsUrl ? `Order details: ${orderDetailsUrl}\n` : ''}\nShopSphere Concierge: support@shopsphere.in`;

  return { subject, html, text };
};

export default renderOrderCancelledTemplate;


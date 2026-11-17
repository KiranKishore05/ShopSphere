import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderOrderDeliveredTemplate = (data) => {
  const { customerName, orderNumber, deliveredAt = 'today', reviewUrl, orderDetailsUrl } = data;

  const subject = `Delivered: Order #${orderNumber} | ShopSphere`;
  const preheader = 'Your order has been delivered. We hope you love your new pieces.';

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;">
      Your Order Has Arrived
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      Dear ${escapeHtml(customerName)},
    </p>
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.6;">
      Our carrier confirms that order <strong>#${escapeHtml(orderNumber)}</strong> was successfully delivered ${escapeHtml(deliveredAt)}.
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.6;">
      We hope your new garments bring you enduring confidence and comfort. If you have any fit questions or require styling guidance, our team is always at your service.
    </p>
    ${reviewUrl ? `
    <div style="text-align: center; margin: 24px 0 16px;">
      <a href="${escapeHtml(reviewUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        Share Your Review
      </a>
    </div>` : ''}
    ${orderDetailsUrl ? `
    <div style="text-align: center; margin: 12px 0;">
      <a href="${escapeHtml(orderDetailsUrl)}" style="font-size: 13px; color: #64748b; text-decoration: underline;">
        View Order Details
      </a>
    </div>` : ''}
  `;

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml });
  const text = `Order #${orderNumber} Delivered\n\nDear ${customerName},\nYour order has been delivered.\n${reviewUrl ? `Leave a review: ${reviewUrl}\n` : ''}${orderDetailsUrl ? `Order details: ${orderDetailsUrl}\n` : ''}\nShopSphere Concierge: support@shopsphere.in`;

  return { subject, html, text };
};

export default renderOrderDeliveredTemplate;


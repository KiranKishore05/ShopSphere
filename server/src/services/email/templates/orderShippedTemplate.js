import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderOrderShippedTemplate = (data) => {
  const { customerName, orderNumber, carrierName, trackingNumber, trackingUrl, orderDetailsUrl } = data;

  const subject = `Your Order #${orderNumber} Has Shipped | ShopSphere`;
  const preheader = `Dispatched with ${carrierName}. AWB: ${trackingNumber}`;

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;">
      Your Garments are on the Way
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      Dear ${escapeHtml(customerName)},
    </p>
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.6;">
      Your order <strong>#${escapeHtml(orderNumber)}</strong> has completed final atelier inspection and has been handed over to our logistics courier partner.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #334155;">
        <strong>Courier Partner:</strong> ${escapeHtml(carrierName)}
      </p>
      <p style="margin: 0; font-size: 14px; color: #334155;">
        <strong>Waybill / AWB Number:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 2px;">${escapeHtml(trackingNumber)}</code>
      </p>
    </div>
    ${trackingUrl ? `
    <div style="text-align: center; margin: 24px 0 16px;">
      <a href="${escapeHtml(trackingUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        Track Consignment
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
  const text = `Order #${orderNumber} Shipped\n\nDear ${customerName},\nYour order has been dispatched via ${carrierName} (AWB: ${trackingNumber}).\n${trackingUrl ? `Track package: ${trackingUrl}\n` : ''}${orderDetailsUrl ? `Order details: ${orderDetailsUrl}\n` : ''}\nShopSphere Concierge: support@shopsphere.in`;

  return { subject, html, text };
};

export default renderOrderShippedTemplate;


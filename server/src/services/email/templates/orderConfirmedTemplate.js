import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderOrderConfirmedTemplate = (data) => {
  const {
    customerName,
    orderNumber,
    paymentMethod,
    items = [],
    shippingAddress,
    subtotal = 0,
    discount = 0,
    shippingFee = 0,
    tax = 0,
    total = 0,
    estimatedDeliveryDays = '3-5 business days',
    orderDetailsUrl
  } = data;

  const isCod = paymentMethod === 'cod';
  const subject = `Order Confirmed: ${orderNumber} | ShopSphere`;
  const preheader = `Thank you for your order. Reference #${orderNumber}.`;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">${escapeHtml(item.title)}</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
          Size: ${escapeHtml(item.size)} &bull; Color: ${escapeHtml(item.color)} &bull; Qty: ${item.quantity}
        </p>
      </td>
      <td align="right" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600; color: #1e293b;">
        ₹${Number(item.lineTotal).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #0f172a;">
      Order Confirmed
    </h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #64748b;">
      Order Reference: <strong style="color: #0f172a;">#${escapeHtml(orderNumber)}</strong>
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.6;">
      Dear ${escapeHtml(customerName)}, we have received your order. Our atelier is now preparing your garments with the utmost care.
    </p>

    <!-- Payment Notice -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #334155;">
        <strong>Payment Method:</strong> ${isCod ? 'Cash on Delivery (₹' + Number(total).toLocaleString('en-IN') + ' to be collected upon delivery)' : 'Online Payment Verified via Razorpay'}
      </p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
        <strong>Estimated Delivery:</strong> ${escapeHtml(estimatedDeliveryDays)}
      </p>
    </div>

    <!-- Order Items -->
    <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">
      Itemized Summary
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${itemsHtml}
    </table>

    <!-- Financial Breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; font-size: 14px;">
      <tr>
        <td style="padding: 4px 0; color: #64748b;">Subtotal</td>
        <td align="right" style="padding: 4px 0; color: #1e293b;">₹${Number(subtotal).toLocaleString('en-IN')}</td>
      </tr>
      ${discount > 0 ? `
      <tr>
        <td style="padding: 4px 0; color: #16a34a;">Promotional Voucher</td>
        <td align="right" style="padding: 4px 0; color: #16a34a;">-₹${Number(discount).toLocaleString('en-IN')}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 4px 0; color: #64748b;">Shipping Fee</td>
        <td align="right" style="padding: 4px 0; color: #1e293b;">${shippingFee === 0 ? 'Complimentary' : '₹' + Number(shippingFee).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b;">Estimated Taxes (GST)</td>
        <td align="right" style="padding: 4px 0; color: #1e293b;">₹${Number(tax).toLocaleString('en-IN')}</td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0; font-weight: 700; font-size: 16px;">
        <td style="padding: 12px 0 0; color: #0f172a;">Total</td>
        <td align="right" style="padding: 12px 0 0; color: #0f172a;">₹${Number(total).toLocaleString('en-IN')}</td>
      </tr>
    </table>

    <!-- Shipping Address -->
    ${shippingAddress ? `
    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
      <h4 style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #0f172a; text-transform: uppercase;">
        Shipping Destination
      </h4>
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        ${escapeHtml(shippingAddress.fullName)}<br>
        ${escapeHtml(shippingAddress.streetAddress)}${shippingAddress.apartment ? `, ${escapeHtml(shippingAddress.apartment)}` : ''}<br>
        ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.state)} ${escapeHtml(shippingAddress.postalCode)}<br>
        ${escapeHtml(shippingAddress.country)}
      </p>
    </div>` : ''}

    ${orderDetailsUrl ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(orderDetailsUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        View Order Details
      </a>
    </div>` : ''}
  `;

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml });
  const text = `Order Confirmed: #${orderNumber}\n\nDear ${customerName},\nThank you for your order! Total: ₹${total}.\nPayment: ${isCod ? 'Cash on Delivery' : 'Online Paid'}\nEstimated Delivery: ${estimatedDeliveryDays}\n${orderDetailsUrl ? `Order Details: ${orderDetailsUrl}\n` : ''}\nShopSphere Atelier: support@shopsphere.in`;

  return { subject, html, text };
};

export default renderOrderConfirmedTemplate;


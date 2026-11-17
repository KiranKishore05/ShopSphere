import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderAdminOrderTemplate = (data, eventType) => {
  const {
    orderNumber,
    customerName,
    total = 0,
    itemCount,
    paymentMethod,
    paymentStatus,
    failureReason,
    cancellationReason,
    adminOrderUrl
  } = data;

  let subject = '';
  let headline = '';
  let detailsHtml = '';

  if (eventType === 'admin_payment_failed') {
    subject = `[Admin Alert] Payment Failed for Order #${orderNumber}`;
    headline = 'Payment Gateway Failure Alert';
    detailsHtml = `
      <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
        A payment attempt has failed for order <strong>#${escapeHtml(orderNumber)}</strong>.
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #991b1b;">
          <strong>Order Reference:</strong> #${escapeHtml(orderNumber)}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #991b1b;">
          <strong>Customer:</strong> ${escapeHtml(customerName)}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #991b1b;">
          <strong>Order Total:</strong> ₹${Number(total).toLocaleString('en-IN')}
        </p>
        <p style="margin: 0; font-size: 13px; color: #991b1b;">
          <strong>Failure Reason:</strong> ${escapeHtml(failureReason || 'Declined')}
        </p>
      </div>
    `;
  } else if (eventType === 'admin_order_cancelled') {
    subject = `[Admin Alert] Order #${orderNumber} Cancelled`;
    headline = 'Order Cancellation Notice';
    detailsHtml = `
      <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
        Order <strong>#${escapeHtml(orderNumber)}</strong> has been cancelled.
      </p>
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #92400e;">
          <strong>Order Reference:</strong> #${escapeHtml(orderNumber)}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #92400e;">
          <strong>Customer:</strong> ${escapeHtml(customerName)}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #92400e;">
          <strong>Order Total:</strong> ₹${Number(total).toLocaleString('en-IN')}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #92400e;">
          <strong>Payment Method:</strong> ${escapeHtml(paymentMethod || 'N/A')} (${escapeHtml(paymentStatus || 'cancelled')})
        </p>
        <p style="margin: 0; font-size: 13px; color: #92400e;">
          <strong>Cancellation Reason:</strong> ${escapeHtml(cancellationReason || 'Cancelled by customer or administrator')}
        </p>
      </div>
    `;
  } else {
    // Default: admin_order_created
    subject = `[Admin Notification] New Order #${orderNumber} Received`;
    headline = 'New Atelier Order Confirmed';
    detailsHtml = `
      <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
        A new order has been received and confirmed in the ShopSphere atelier.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #334155;">
          <strong>Order Reference:</strong> #${escapeHtml(orderNumber)}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #334155;">
          <strong>Customer:</strong> ${escapeHtml(customerName)}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #334155;">
          <strong>Order Total:</strong> ₹${Number(total).toLocaleString('en-IN')}
        </p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #334155;">
          <strong>Items Count:</strong> ${itemCount || 'N/A'}
        </p>
        <p style="margin: 0; font-size: 13px; color: #334155;">
          <strong>Payment:</strong> ${escapeHtml(paymentMethod || 'N/A')} (${escapeHtml(paymentStatus || 'pending')})
        </p>
      </div>
    `;
  }

  const preheader = subject;

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;">
      ${headline}
    </h2>
    ${detailsHtml}
    ${adminOrderUrl ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(adminOrderUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        View Order in Admin Dashboard
      </a>
    </div>` : ''}
  `;

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml });
  const text = `${headline}\n\nOrder: #${orderNumber}\nCustomer: ${customerName}\nTotal: ₹${total}\n${adminOrderUrl ? `Admin URL: ${adminOrderUrl}\n` : ''}`;

  return { subject, html, text };
};

export default renderAdminOrderTemplate;


import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderPasswordResetTemplate = (data) => {
  const { customerName, resetUrl, expiresIn = '1 hour' } = data;

  const subject = 'Reset Your ShopSphere Password';
  const preheader = 'Instructions to reset your account password.';

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;">
      Password Reset Request
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      Hello ${escapeHtml(customerName)},
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      We received a request to reset the password for your ShopSphere account. Click the button below to choose a new password:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(resetUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        Reset Password
      </a>
    </div>
    <p style="margin: 0 0 16px; font-size: 13px; color: #64748b; line-height: 1.6;">
      This link is strictly single-use and will expire in <strong>${escapeHtml(expiresIn)}</strong>.
    </p>
    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
      If you did not initiate this request, you can safely disregard this message. Your password will remain unchanged.
    </p>
  `;

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml });
  const text = `Reset Your ShopSphere Password\n\nHello ${customerName},\nReset your password using this link (valid for ${expiresIn}):\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

  return { subject, html, text };
};

export default renderPasswordResetTemplate;


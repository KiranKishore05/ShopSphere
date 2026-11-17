/**
 * Safely escapes user-controlled strings to prevent HTML injection in emails.
 */
export const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Responsive HTML Base Email Layout for ShopSphere.
 * Designed with a luxury fashion editorial aesthetic, inline CSS, and table-based compatibility.
 */
export const renderBaseLayout = ({ title, preheader = '', bodyHtml }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    table { border-collapse: collapse; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; }
    .header { padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #f1f5f9; }
    .brand-title { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.15em; color: #0f172a; text-transform: uppercase; }
    .brand-subtitle { margin: 4px 0 0; font-size: 11px; letter-spacing: 0.2em; color: #64748b; text-transform: uppercase; }
    .content { padding: 36px 32px; }
    .footer { padding: 28px 32px; background-color: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    .btn-primary { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <!-- Preheader text for inbox preview -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${escapeHtml(preheader)}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td class="header" style="padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <h1 class="brand-title" style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.15em; color: #0f172a; text-transform: uppercase;">
                SHOPSPHERE
              </h1>
              <p class="brand-subtitle" style="margin: 4px 0 0; font-size: 11px; letter-spacing: 0.2em; color: #64748b; text-transform: uppercase;">
                Atelier &bull; Pr&ecirc;t-&agrave;-Porter
              </p>
            </td>
          </tr>

          <!-- Dynamic Content Body -->
          <tr>
            <td class="content" style="padding: 36px 32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="padding: 28px 32px; background-color: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0 0 8px;">ShopSphere Luxury Apparel &bull; Mumbai, India</p>
              <p style="margin: 0 0 8px;">Questions or assistance? Contact our concierge at <a href="mailto:support@shopsphere.in" style="color: #64748b; text-decoration: underline;">support@shopsphere.in</a></p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">&copy; ${new Date().getFullYear()} ShopSphere. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};


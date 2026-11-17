import { renderBaseLayout, escapeHtml } from './baseLayout.js';

export const renderWelcomeTemplate = (data) => {
  const { customerName, exploreUrl = 'https://shopsphere.in/shop' } = data;

  const subject = `Welcome to ShopSphere, ${customerName}`;
  const preheader = 'Discover our curated pret-a-porter and artisan fashion collections.';

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;">
      Welcome to the Atelier, ${escapeHtml(customerName)}
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.6;">
      Thank you for creating an account with ShopSphere. We craft contemporary clothing designed with understated elegance, conscious materials, and meticulous tailoring.
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #475569; line-height: 1.6;">
      Your account gives you seamless access to curated seasonal capsules, saved addresses, instant order tracking, and exclusive previews.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(exploreUrl)}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 2px;">
        Explore Collections
      </a>
    </div>
  `;

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml });
  const text = `Welcome to ShopSphere, ${customerName}!\n\nThank you for creating an account with us. Explore our collections at: ${exploreUrl}\n\nShopSphere Concierge: support@shopsphere.in`;

  return { subject, html, text };
};

export default renderWelcomeTemplate;


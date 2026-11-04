import React, { useEffect } from 'react';

/**
 * Lightweight dynamic document head management for SEO metadata.
 * Sets document.title, meta tags, OpenGraph, and Twitter Card attributes.
 */
export default function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website'
}) {
  const siteTitle = 'ShopSphere Haute & Prêt-à-Porter';
  const fullTitle = title ? `${title} — ShopSphere` : siteTitle;
  const defaultDesc = 'ShopSphere is an artisanal luxury fashion house curating bespoke tailoring, outerwear, knitwear, and timeless silhouettes.';
  const metaDesc = description ? description.slice(0, 160) : defaultDesc;
  const canonicalUrl = url || window.location.href;
  const defaultImage = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200';
  const metaImage = image || defaultImage;

  useEffect(() => {
    // 1. Title
    document.title = fullTitle;

    // Helper to set or create a meta tag
    const setMetaTag = (attribute, attrValue, content) => {
      let element = document.querySelector(`meta[${attribute}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content || '');
    };

    // Helper to set canonical link
    const setCanonical = (href) => {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // 2. Standard Meta
    setMetaTag('name', 'description', metaDesc);
    if (keywords) {
      setMetaTag('name', 'keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
    }

    // 3. OpenGraph
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', metaDesc);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', metaImage);
    setMetaTag('property', 'og:site_name', 'ShopSphere');

    // 4. Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', metaDesc);
    setMetaTag('name', 'twitter:image', metaImage);

    // 5. Canonical link
    setCanonical(canonicalUrl);
  }, [fullTitle, metaDesc, keywords, metaImage, canonicalUrl, type]);

  return null;
}

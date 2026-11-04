import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, SlidersHorizontal, ChevronRight, Check } from 'lucide-react';
import HealthStatusBadge from '../components/common/HealthStatusBadge';
import SEO from '../components/common/SEO';

export default function HomePage() {
  const featuredCollections = [
    {
      title: 'Architectural Outerwear',
      tagline: 'Sculpted wool & cashmere double-breasted overcoats',
      image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=900&q=80',
      href: '/category/outerwear',
      count: 'Archive'
    },
    {
      title: 'Tactile Knitwear',
      tagline: '7-gauge Mongolian cashmere & brushed alpaca',
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=900&q=80',
      href: '/category/knitwear',
      count: 'Archive'
    },
    {
      title: 'Bespoke Tailoring',
      tagline: 'Fluid pleated trousers and unstructured blazers',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
      href: '/category/tailoring',
      count: 'Archive'
    },
    {
      title: 'Minimal Accessories',
      tagline: 'Full-grain Italian vegetable tanned leather goods',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
      href: '/category/accessories',
      count: 'Archive'
    }
  ];

  const showcaseProducts = [
    {
      id: 'prod-1',
      name: 'Double-Faced Cashmere Trench Coat',
      slug: 'double-faced-cashmere-trench-coat',
      category: 'Outerwear',
      price: 18999,
      comparePrice: 24999,
      image: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
      colors: ['#C8B293', '#161513', '#788A75'],
      sizes: ['S', 'M', 'L', 'XL'],
      badge: 'ARCHIVE EXCLUSIVE'
    },
    {
      id: 'prod-2',
      name: 'Ribbed Alpaca Mockneck Sweater',
      slug: 'ribbed-alpaca-mockneck-sweater',
      category: 'Knitwear',
      price: 8499,
      comparePrice: null,
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
      colors: ['#F7F4EC', '#4B4843'],
      sizes: ['XS', 'S', 'M', 'L'],
      badge: 'NEW ARRIVAL'
    },
    {
      id: 'prod-3',
      name: 'Relaxed Wide-Leg Wool Trousers',
      slug: 'relaxed-wide-leg-wool-trousers',
      category: 'Tailoring',
      price: 7999,
      comparePrice: 9999,
      image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
      colors: ['#161513', '#827E77'],
      sizes: ['28', '30', '32', '34'],
      badge: 'LIMITED RUN'
    },
    {
      id: 'prod-4',
      name: 'Unstructured Linen-Silk Over-Shirt',
      slug: 'unstructured-linen-silk-over-shirt',
      category: 'Shirting',
      price: 6499,
      comparePrice: null,
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
      colors: ['#C8B293', '#F7F4EC'],
      sizes: ['S', 'M', 'L'],
      badge: 'BESTSELLER'
    }
  ];

  return (
    <div>
      <SEO
        title="Haute & Prêt-à-Porter Atelier"
        description="ShopSphere — Artisanal luxury fashion atelier featuring architectural outerwear, tactile knitwear, bespoke tailoring, and leather accessories."
      />

      {/* Editorial Hero Banner */}
      <section className="relative overflow-hidden border-b border-sphere-border bg-sphere-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-sphere-ivory border border-sphere-border rounded-full text-[11px] font-medium tracking-[0.16em] uppercase text-sphere-sand-dark">
                <Sparkles className="w-3 h-3" />
                <span>AUTUMN / WINTER 2026 EDITORIAL</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-sphere-ink leading-[1.08]">
                The Architecture <br />
                <span className="italic font-light">of Pure Form.</span>
              </h1>

              <p className="text-sphere-charcoal text-base sm:text-lg max-w-xl font-light leading-relaxed">
                Sculptural silhouettes engineered in double-faced cashmere, unbleached Irish linen, and certified regenerative wool. An exploration of permanence in modern dress.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center px-8 py-4 bg-sphere-ink text-sphere-ivory text-xs font-semibold tracking-[0.14em] uppercase hover:bg-sphere-charcoal transition-all shadow-editorial-md group"
                >
                  <span>EXPLORE THE COLLECTION</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/shop?gender=women"
                  className="inline-flex items-center justify-center px-8 py-4 bg-transparent border border-sphere-ink/30 text-sphere-ink text-xs font-semibold tracking-[0.14em] uppercase hover:bg-sphere-ivory hover:border-sphere-ink transition-all"
                >
                  <span>WOMEN'S ATELIER</span>
                </Link>
              </div>

              {/* Subtext markers */}
              <div className="pt-8 border-t border-sphere-border/70 flex items-center gap-8 text-xs text-sphere-muted">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-sphere-sage-dark" />
                  <span>Conscious Sourcing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-sphere-sage-dark" />
                  <span>Complimentary Tailoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-sphere-sage-dark" />
                  <span>Insured Courier</span>
                </div>
              </div>
            </div>

            {/* Hero Image Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute inset-0 border border-sphere-sand/40 translate-x-3 translate-y-3 pointer-events-none rounded-sm hidden sm:block"></div>
                
                <div className="relative bg-sphere-surface p-2.5 shadow-editorial-lg rounded-sm border border-sphere-border overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85"
                    alt="ShopSphere Autumn Winter 2026 Editorial"
                    className="w-full h-[480px] sm:h-[560px] object-cover object-top hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  
                  {/* Floating Lookbook Card */}
                  <div className="absolute bottom-6 left-6 right-6 bg-sphere-ivory/95 backdrop-blur-md p-4 border border-sphere-border shadow-editorial-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-luxury text-sphere-muted block">Look 04 / 32</span>
                      <h4 className="font-editorial text-sm font-medium text-sphere-ink">Double-Breasted Wool Coat</h4>
                      <span className="text-xs font-semibold text-sphere-charcoal">₹18,999 INR</span>
                    </div>
                    <Link
                      to="/products/double-faced-cashmere-trench-coat"
                      className="w-9 h-9 rounded-full bg-sphere-ink text-sphere-ivory flex items-center justify-center hover:bg-sphere-charcoal transition-colors"
                      aria-label="View Product"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Collections Gallery */}
      <section className="py-20 lg:py-24 border-b border-sphere-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-sphere-sand-dark font-semibold block mb-2">
                CURATED ARCHIVES
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl text-sphere-ink">
                Seasonal Collections
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-xs font-semibold uppercase tracking-[0.15em] text-sphere-ink hover:text-sphere-sand transition-colors inline-flex items-center gap-1.5"
            >
              <span>VIEW ALL ARCHIVES</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCollections.map((col, idx) => (
              <Link
                key={idx}
                to={col.href}
                className="group relative bg-sphere-cream border border-sphere-border overflow-hidden rounded-sm flex flex-col transition-all hover:shadow-editorial-md"
              >
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img
                    src={col.image}
                    alt={col.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute top-3 left-3 bg-sphere-ivory/90 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase font-semibold tracking-wider text-sphere-ink border border-sphere-border/50">
                    {col.count}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between bg-sphere-surface">
                  <div>
                    <h3 className="font-editorial text-lg text-sphere-ink group-hover:text-sphere-sand-dark transition-colors">
                      {col.title}
                    </h3>
                    <p className="text-xs text-sphere-muted mt-1 leading-relaxed">
                      {col.tagline}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-sphere-border flex items-center justify-between text-xs text-sphere-charcoal font-medium">
                    <span>Explore Archive</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sphere-sand group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* Featured Products Matrix Showcase */}
      <section className="py-20 lg:py-24 bg-sphere-cream/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-sphere-sand-dark font-semibold block mb-2">
                ICONIC SILHOUETTES
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl text-sphere-ink">
                Selected Garments
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-sphere-charcoal">
              <SlidersHorizontal className="w-3.5 h-3.5 text-sphere-sand" />
              <span>Sizes XS through XL • Limited Edition Runs</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {showcaseProducts.map((product) => (
              <div
                key={product.id}
                className="bg-sphere-surface border border-sphere-border rounded-sm overflow-hidden flex flex-col group hover:shadow-editorial-md transition-shadow"
              >
                <div className="aspect-[3/4] overflow-hidden relative bg-sphere-cream">
                  <Link to={`/products/${product.slug}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </Link>
                  <div className="absolute top-3 left-3 bg-sphere-ink text-sphere-ivory text-[9px] font-bold tracking-luxury uppercase px-2 py-1">
                    {product.badge}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-sphere-muted block mb-1">
                      {product.category}
                    </span>
                    <h4 className="font-editorial text-base text-sphere-ink line-clamp-1 group-hover:text-sphere-sand-dark transition-colors">
                      <Link to={`/products/${product.slug}`}>{product.name}</Link>
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-sphere-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {product.colors.map((hex, i) => (
                        <span
                          key={i}
                          className="w-3 h-3 rounded-full border border-sphere-border"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-sphere-ink">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
}

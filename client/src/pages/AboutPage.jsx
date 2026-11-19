import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Leaf, HeartHandshake, ArrowRight, Award, Compass, RefreshCw } from 'lucide-react';
import SEO from '../components/common/SEO';

export default function AboutPage() {
  const pillars = [
    {
      icon: Sparkles,
      title: 'Artisanal Aesthetics',
      description: 'Curating modern apparel and heritage-inspired silhouettes across Men, Women, and Kids fashion with contemporary cuts and timeless tailoring.'
    },
    {
      icon: Leaf,
      title: 'Textile Integrity',
      description: 'Focusing on natural breathable cottons, fluid mulberry silks, and enduring fabrics designed for everyday sophistication.'
    },
    {
      icon: HeartHandshake,
      title: 'Customer-Centric Care',
      description: 'Ensuring seamless customer experiences through transparent pricing, clear order tracking, and prompt customer support.'
    },
    {
      icon: Award,
      title: 'Engineering Resilience',
      description: 'Built upon defense-in-depth security, atomic stock reservations, idempotent payment verification, and the Transactional Outbox pattern.'
    }
  ];

  const metrics = [
    { value: '100%', label: 'Server-Authoritative Pricing' },
    { value: '400+', label: 'Automated Regression Tests' },
    { value: 'Atomic', label: 'Concurrency Stock Deductions' },
    { value: 'MERN', label: 'Decoupled Monorepo Architecture' }
  ];

  return (
    <div className="bg-[#FDFBF7] text-[#161513] min-h-screen">
      <SEO
        title="Our Heritage & Philosophy"
        description="Learn about ShopSphere — an artisanal Indian fashion house blending bespoke craftsmanship, conscious fabrics, and modern silhouettes."
      />

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 border-b border-[#EAE5DA] overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#827E77] block mb-3">
            The ShopSphere Atelier
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#161513] mb-6 leading-tight">
            Where Heritage Craft Meets <br className="hidden sm:block" />
            Modern Refinement
          </h1>
          <p className="text-base sm:text-lg text-[#4B4843] max-w-2xl mx-auto leading-relaxed font-light">
            Founded with a passion for timeless elegance, ShopSphere bridges the gap between India’s rich textile legacy and contemporary, effortless silhouettes for men, women, and children.
          </p>
        </div>
      </section>

      {/* Brand Story Editorial Section */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-[#EAE5DA] shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80"
                alt="ShopSphere Atelier Craftsmanship"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-lg border border-[#EAE5DA] shadow-md hidden sm:block max-w-xs">
              <p className="text-xs font-serif italic text-[#4B4843]">
                "True luxury lies in the precision of the fit, the integrity of the textile, and the resilience of the commerce engine."
              </p>
              <span className="text-[10px] uppercase tracking-wider text-[#827E77] block mt-2 font-sans font-semibold">
                — ShopSphere Design & Architecture Philosophy
              </span>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <span className="text-xs uppercase tracking-widest font-semibold text-[#827E77]">
              Our Philosophy
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl text-[#161513] leading-snug">
              Fashion Designed to be Cherished, Not Discarded
            </h2>
            <p className="text-sm sm:text-base text-[#4B4843] leading-relaxed">
              In a world of fleeting micro-trends and synthetic disposability, ShopSphere stands as a sanctuary of thoughtful design. We believe that what touches your skin every day should be honest, breathable, and crafted to last.
            </p>
            <p className="text-sm sm:text-base text-[#4B4843] leading-relaxed">
              Every collection begins at the source: natural seed cottons, heritage handloom weaves from Maheshwar and Chanderi, and precision-engineered linen blends. From initial sketch to the final hand-finished hem, our pieces undergo strict quality verifications to ensure flawless drape and enduring comfort.
            </p>

            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-[#161513] text-[#FDFBF7] text-xs uppercase tracking-widest font-semibold px-6 py-3.5 rounded hover:bg-[#34302C] transition-colors"
              >
                <span>Explore the Collection</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 border border-[#EAE5DA] text-[#161513] text-xs uppercase tracking-widest font-semibold px-6 py-3.5 rounded hover:bg-[#F7F4EC] transition-colors"
              >
                <span>Contact Atelier Concierge</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="bg-[#F7F4EC] border-y border-[#EAE5DA] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {metrics.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="font-serif text-3xl sm:text-4xl font-normal text-[#161513]">
                  {item.value}
                </div>
                <div className="text-xs uppercase tracking-wider text-[#827E77] font-medium">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest font-semibold text-[#827E77]">
            Core Values
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl text-[#161513] mt-2 mb-4">
            The Pillars of ShopSphere
          </h2>
          <p className="text-sm text-[#4B4843]">
            Every decision we make is guided by four foundational commitments to our patrons, artisans, and planet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="bg-white p-6 sm:p-8 rounded-xl border border-[#EAE5DA] hover:border-[#161513]/30 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#F7F4EC] text-[#161513] flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-lg text-[#161513] mb-2 font-medium">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4B4843] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

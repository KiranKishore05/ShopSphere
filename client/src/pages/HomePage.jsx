import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  Headphones 
} from 'lucide-react';
import SEO from '../components/common/SEO';
import ProductCard from '../components/products/ProductCard';
import { fetchProducts } from '../services/catalogService';

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [promoImage, setPromoImage] = useState('/images/promo-banner.jpg');
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const handlePromoImageError = () => {
    if (promoImage !== 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85') {
      setPromoImage('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85');
    }
  };

  // High-resolution hero slides (Women, Men, Kids)
  const heroSlides = [
    {
      id: 'women',
      category: 'WOMEN',
      eyebrow: 'MODERN FASHION COLLECTION',
      heading: 'Timeless Elegance in Every Saree',
      subtitle: 'Discover sarees and graceful ethnic wear for every occasion.',
      ctaText: 'Shop Now',
      ctaLink: '/shop?gender=women',
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1200&q=85',
      alt: "ShopSphere Women's Fashion Campaign"
    },
    {
      id: 'men',
      category: 'MEN',
      eyebrow: 'MODERN FASHION COLLECTION',
      heading: 'Heritage Meets Modern Style',
      subtitle: 'Explore kurtas, sherwanis and refined traditional menswear.',
      ctaText: 'Shop Now',
      ctaLink: '/shop?gender=men',
      image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1200&q=85',
      alt: "ShopSphere Men's Fashion Campaign"
    },
    {
      id: 'kids',
      category: 'KIDS',
      eyebrow: 'MODERN FASHION COLLECTION',
      heading: 'Little Festive Traditions',
      subtitle: 'Celebrate every special moment with beautiful kids ethnic wear.',
      ctaText: 'Shop Now',
      ctaLink: '/shop?gender=kids',
      image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=1200&q=85',
      alt: "ShopSphere Kids' Fashion Campaign"
    }
  ];

  // 5-second autoplay timer with hover pause & resume
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, activeSlide, heroSlides.length]);

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev > 0 ? prev - 1 : heroSlides.length - 1));
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length);
  };

  // Mobile touch swipe handling
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (distance > 40) {
      handleNextSlide();
    } else if (distance < -40) {
      handlePrevSlide();
    }
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  // High-resolution fallback products matching backend catalogue
  const fallbackProducts = [
    {
      id: 'prod-1',
      _id: '674f00010000000000000001',
      name: "Men's Casual Shirt",
      slug: 'mens-linen-casual-shirt',
      price: 1299,
      comparePrice: 1899,
      rating: 4.5,
      reviewCount: 128,
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'prod-2',
      _id: '674f00010000000000000002',
      name: "Women's Floral Dress",
      slug: 'womens-floral-tiered-midi-dress',
      price: 1699,
      comparePrice: 2499,
      rating: 4.6,
      reviewCount: 97,
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'prod-3',
      _id: '674f00010000000000000003',
      name: "Kids Hoodie",
      slug: 'kids-denim-dungaree-set',
      price: 899,
      comparePrice: 1299,
      rating: 4.4,
      reviewCount: 64,
      image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'prod-4',
      _id: '674f00010000000000000004',
      name: "Men's Denim Jacket",
      slug: 'mens-vintage-denim-trucker-jacket',
      price: 2199,
      comparePrice: 3299,
      rating: 4.5,
      reviewCount: 72,
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80'
    }
  ];

  // Fetch real products from the backend API
  const { data: apiData } = useQuery({
    queryKey: ['homepage-new-arrivals'],
    queryFn: () => fetchProducts({ limit: 4, sort: 'newest' }),
    staleTime: 60 * 1000,
    retry: 1
  });

  const apiProducts = apiData?.products || apiData?.data?.products || [];
  const displayProducts = apiProducts.length >= 4 ? apiProducts.slice(0, 4) : fallbackProducts;

  return (
    <div className="bg-[#FFFFFF] text-[#161513]">
      <SEO
        title="ShopSphere — A Premium Fashion E-Commerce Brand"
        description="ShopSphere is India's premium fashion destination for Men, Women, and Kids. Contemporary styling, quality fabrics, and effortless shopping across India."
      />

      {/* 1. Hero Campaign Carousel Section (Men -> Women -> Kids) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4">
        <div 
          className="relative rounded-2xl border border-[#EAE5DA] bg-[#FBEBDC] overflow-hidden shadow-xs min-h-[460px] sm:min-h-[480px] lg:min-h-[500px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {heroSlides.map((slide, idx) => {
            const isActive = activeSlide === idx;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 grid grid-cols-1 lg:grid-cols-12 items-center transition-all duration-700 ease-in-out ${
                  isActive 
                    ? 'opacity-100 pointer-events-auto z-10 translate-x-0' 
                    : 'opacity-0 pointer-events-none -translate-x-4'
                }`}
                aria-hidden={!isActive}
              >
                {/* Left Column: Hero Text */}
                <div className="lg:col-span-5 p-7 sm:p-12 lg:p-16 flex flex-col justify-center items-start z-10">
                  <span className="text-xs sm:text-sm font-semibold tracking-wider text-[#827E77] uppercase mb-3 block">
                    {slide.eyebrow}
                  </span>

                  <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-[#161513] tracking-tight leading-[1.12] mb-3">
                    {slide.heading}
                  </h1>

                  <p className="text-sm sm:text-base font-medium text-[#4B4843] mb-8">
                    {slide.subtitle}
                  </p>

                  <div>
                    <Link
                      to={slide.ctaLink}
                      className="inline-flex items-center gap-2 bg-[#161513] text-[#FDFBF7] px-7 py-3 rounded-lg text-sm font-medium hover:bg-[#34302C] active:scale-95 transition-all shadow-md group"
                    >
                      <span>{slide.ctaText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Right Column: Hero Visual Photography */}
                <div className="lg:col-span-7 relative h-[280px] sm:h-[380px] lg:h-[500px] w-full overflow-hidden flex items-end justify-center lg:justify-end">
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="w-full h-full object-cover object-top transition-transform duration-700 ease-out hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#FBEBDC] via-transparent to-transparent opacity-60 pointer-events-none" />
                </div>
              </div>
            );
          })}

          {/* Three Clickable Slide Indicators */}
          <div className="absolute bottom-6 left-7 sm:left-12 lg:left-16 z-20 flex items-center gap-2">
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                aria-label={`Go to ${slide.category} slide`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeSlide === idx 
                    ? 'w-7 bg-[#161513]' 
                    : 'w-2.5 bg-[#161513]/25 hover:bg-[#161513]/50'
                }`}
              />
            ))}
          </div>

          {/* Previous / Next Arrow Controls */}
          <button
            onClick={handlePrevSlide}
            aria-label="Previous Slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-[#EAE5DA] flex items-center justify-center text-[#161513] shadow-xs hover:bg-white transition-all z-20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextSlide}
            aria-label="Next Slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-[#EAE5DA] flex items-center justify-center text-[#161513] shadow-xs hover:bg-white transition-all z-20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 2. Trust Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-[#EAE5DA]">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#EAE5DA] flex items-center justify-center shrink-0 text-[#161513]">
              <Truck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#161513]">Free Shipping</h4>
              <p className="text-[11px] sm:text-xs text-[#827E77]">on orders above ₹999</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#EAE5DA] flex items-center justify-center shrink-0 text-[#161513]">
              <RotateCcw className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#161513]">Easy Returns</h4>
              <p className="text-[11px] sm:text-xs text-[#827E77]">7-day return policy</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#EAE5DA] flex items-center justify-center shrink-0 text-[#161513]">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#161513]">Secure Payments</h4>
              <p className="text-[11px] sm:text-xs text-[#827E77]">Razorpay & COD</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#EAE5DA] flex items-center justify-center shrink-0 text-[#161513]">
              <Headphones className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#161513]">24×7 Support</h4>
              <p className="text-[11px] sm:text-xs text-[#827E77]">We're here to help</p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Shop by Category Section (Men, Women, Kids) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="font-sans text-xl sm:text-2xl font-bold text-[#161513] mb-6">
          Shop by Category
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 — Men */}
          <Link
            to="/shop?gender=men"
            className="group relative rounded-xl bg-[#F8F5EE] border border-[#EAE5DA] p-6 overflow-hidden flex items-center justify-between h-48 sm:h-52 hover:shadow-md transition-all"
          >
            <div className="z-10">
              <h3 className="font-serif text-2xl font-bold text-[#161513] group-hover:text-[#BA4343] transition-colors">
                Men
              </h3>
              <span className="text-xs font-semibold text-[#827E77] inline-flex items-center gap-1 mt-1 group-hover:text-[#161513] transition-colors">
                <span>Explore Collection</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
            <div className="h-full w-36 sm:w-44 shrink-0 flex items-end justify-end overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"
                alt="ShopSphere Men's Collection"
                className="h-full w-full object-cover object-top rounded-lg group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </Link>

          {/* Card 2 — Women */}
          <Link
            to="/shop?gender=women"
            className="group relative rounded-xl bg-[#F6E8DD] border border-[#EAE5DA] p-6 overflow-hidden flex items-center justify-between h-48 sm:h-52 hover:shadow-md transition-all"
          >
            <div className="z-10">
              <h3 className="font-serif text-2xl font-bold text-[#161513] group-hover:text-[#BA4343] transition-colors">
                Women
              </h3>
              <span className="text-xs font-semibold text-[#827E77] inline-flex items-center gap-1 mt-1 group-hover:text-[#161513] transition-colors">
                <span>Explore Collection</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
            <div className="h-full w-36 sm:w-44 shrink-0 flex items-end justify-end overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80"
                alt="ShopSphere Women's Collection"
                className="h-full w-full object-cover object-top rounded-lg group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </Link>

          {/* Card 3 — Kids */}
          <Link
            to="/shop?gender=kids"
            className="group relative rounded-xl bg-[#F8F5EE] border border-[#EAE5DA] p-6 overflow-hidden flex items-center justify-between h-48 sm:h-52 hover:shadow-md transition-all"
          >
            <div className="z-10">
              <h3 className="font-serif text-2xl font-bold text-[#161513] group-hover:text-[#BA4343] transition-colors">
                Kids
              </h3>
              <span className="text-xs font-semibold text-[#827E77] inline-flex items-center gap-1 mt-1 group-hover:text-[#161513] transition-colors">
                <span>Explore Collection</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
            <div className="h-full w-36 sm:w-44 shrink-0 flex items-end justify-end overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80"
                alt="ShopSphere Kids' Collection"
                className="h-full w-full object-cover object-top rounded-lg group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. New Arrivals Section (4 Products in One Row) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-sans text-xl sm:text-2xl font-bold text-[#161513]">
            New Arrivals
          </h2>
          <Link
            to="/shop?sort=newest"
            className="text-xs sm:text-sm font-semibold text-[#161513] hover:text-[#BA4343] inline-flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. Promotional Sale Banner (Flat 30% Off) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:pt-8 sm:pb-14">
        <div className="relative rounded-[22px] bg-[#F4EDE4] border border-[#E6DCCE] overflow-hidden shadow-xs flex flex-col md:flex-row items-stretch md:h-[380px] lg:h-[400px]">
          
          {/* Left Side (45% on desktop): Editorial Typography & Action */}
          <div className="w-full md:w-[45%] flex flex-col justify-center items-start text-left px-8 py-10 sm:px-12 sm:py-12 lg:px-16 lg:py-14 z-10 shrink-0">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#161513] tracking-tight leading-[1.15] mb-2 sm:mb-3">
              Flat 30% Off
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-[#5A554E] font-medium mb-6 sm:mb-8">
              On Selected Styles
            </p>
            <div>
              <Link
                to="/shop?sale=true"
                className="inline-flex items-center gap-2 bg-[#161513] text-[#FDFBF7] px-7 py-3.5 rounded-lg text-xs sm:text-sm font-semibold tracking-wider uppercase hover:bg-[#34302C] active:scale-95 transition-all shadow-sm group"
              >
                <span>SHOP THE SALE</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Side (55% on desktop): Large Fashion Campaign Image */}
          <div className="w-full md:w-[55%] relative overflow-hidden h-72 sm:h-84 md:h-full min-h-[280px] md:min-h-0">
            <img
              src={promoImage}
              onError={handlePromoImageError}
              alt="ShopSphere Fashion Campaign - Stylish Man and Woman"
              className="w-full h-full object-cover object-[center_20%] transition-transform duration-700 ease-out hover:scale-102"
            />
            <div className="hidden md:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F4EDE4] to-transparent pointer-events-none z-10" />
          </div>

        </div>
      </section>

    </div>
  );
}

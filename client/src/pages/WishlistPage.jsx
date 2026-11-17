import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../hooks/useAuth';
import SEO from '../components/common/SEO';

export default function WishlistPage() {
  const { wishlist, totalItems, removeFromWishlist, isLoading } = useWishlist();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center animate-fadeIn">
        <SEO title="Wishlist — Sign In Required" description="Sign in to access your saved fashion wishlist." />
        <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EDE4] text-[#161513] flex items-center justify-center mb-4">
          <Heart className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#161513] font-bold mb-3">
          Sign In to Access Your Wishlist
        </h1>
        <p className="text-xs sm:text-sm text-[#827E77] max-w-sm mx-auto mb-8">
          Save your favourite pieces and access them anytime across all your devices.
        </p>
        <Link
          to="/login"
          state={{ from: '/wishlist' }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C] transition-all shadow-xs"
        >
          <span>Sign In to Atelier</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-10 h-10 border-2 border-[#161513]/20 border-t-[#161513] rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-lg text-[#161513]">Retrieving your curated wishlist...</p>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center animate-fadeIn">
        <SEO title="My Wishlist — Empty" description="Your ShopSphere wishlist is currently empty." />
        <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EDE4] text-[#161513] flex items-center justify-center mb-4">
          <Heart className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#161513] font-bold mb-3">
          Your Wishlist is Empty
        </h1>
        <p className="text-xs sm:text-sm text-[#827E77] max-w-sm mx-auto mb-8">
          Save garments while exploring our collections by clicking the heart icon on any product.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C] transition-all shadow-xs"
        >
          <span>Discover Collection</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fadeIn">
      <SEO title={`Saved Pieces (${totalItems})`} description="Your curated ShopSphere wishlist." />

      {/* Back Link */}
      <div className="mb-4 sm:mb-6">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-[#EAE5DA] pb-5 mb-8 flex items-baseline justify-between">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#827E77] block mb-1">
            Curated Wardrobe
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#161513]">
            Saved Pieces
          </h1>
        </div>
        <span className="text-xs font-semibold text-[#827E77]">
          {totalItems} {totalItems === 1 ? 'Garment' : 'Garments'} Saved
        </span>
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {wishlist.map((product) => {
          const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';
          const lowestPrice = product.variants?.length
            ? Math.min(...product.variants.map((v) => v.price))
            : product.basePrice || 0;
          const comparePrice = product.variants?.length
            ? Math.max(...product.variants.map((v) => v.compareAtPrice || 0))
            : product.compareAtPrice;

          return (
            <div
              key={product._id}
              className="group bg-white border border-[#EAE5DA] rounded-2xl flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-all"
            >
              {/* Product Thumbnail Container */}
              <div className="relative aspect-[3/4] bg-[#FBF9F5] overflow-hidden flex items-center justify-center p-3">
                <Link to={`/products/${product.slug}`} className="w-full h-full flex items-center justify-center">
                  <img
                    src={primaryImage}
                    alt={product.name}
                    className="max-w-full max-h-full w-auto h-auto object-contain object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => removeFromWishlist(product._id)}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-[#161513] hover:text-rose-600 hover:bg-white shadow-xs transition-all flex items-center justify-center"
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card Meta & Action */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#827E77] block mb-1">
                    {product.brand || 'ShopSphere'}
                  </span>
                  <Link
                    to={`/products/${product.slug}`}
                    className="font-serif text-sm sm:text-base font-bold text-[#161513] hover:text-[#BA4343] transition-colors line-clamp-1"
                  >
                    {product.name}
                  </Link>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-sans text-sm sm:text-base font-bold text-[#161513]">
                      ₹{lowestPrice.toLocaleString('en-IN')}
                    </span>
                    {comparePrice && comparePrice > lowestPrice && (
                      <span className="text-xs text-[#827E77] line-through">
                        ₹{comparePrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F2ECE4]">
                  <Link
                    to={`/products/${product.slug}`}
                    className="w-full py-2.5 text-center text-xs uppercase font-semibold tracking-wider rounded-lg bg-[#FBF9F5] hover:bg-[#161513] hover:text-[#FDFBF7] border border-[#EAE5DA] text-[#161513] block transition-colors shadow-2xs"
                  >
                    Select Options →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

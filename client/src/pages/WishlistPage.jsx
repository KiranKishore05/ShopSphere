import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../hooks/useAuth';

export default function WishlistPage() {
  const { wishlist, totalItems, removeFromWishlist, isLoading } = useWishlist();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-sphere-sand-light text-sphere-sand flex items-center justify-center mb-4">
          <Heart className="w-8 h-8" />
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink font-normal mb-3">
          Sign In to Access Your Wishlist
        </h1>
        <p className="text-xs text-sphere-muted max-w-sm mx-auto mb-8">
          Save your favourite couture pieces and access them across all your devices.
        </p>
        <Link
          to="/login"
          state={{ from: '/wishlist' }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury"
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
        <div className="w-10 h-10 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mx-auto mb-4" />
        <span className="font-editorial text-lg text-sphere-ink tracking-wider">
          Retrieving your curated wishlist...
        </span>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-sphere-sand-light text-sphere-sand flex items-center justify-center mb-4">
          <Heart className="w-8 h-8" />
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink font-normal mb-3">
          Your Wishlist is Empty
        </h1>
        <p className="text-xs text-sphere-muted max-w-sm mx-auto mb-8">
          Save garments while exploring our collections by clicking the heart icon on any card.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury"
        >
          <span>Discover Collection</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-sphere-muted hover:text-sphere-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-sphere-border pb-6 mb-8 flex items-baseline justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-sphere-muted font-semibold block mb-1">
            Curated Wardrobe
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink">
            Saved Pieces
          </h1>
        </div>
        <span className="text-xs text-sphere-muted uppercase tracking-wider">
          {totalItems} {totalItems === 1 ? 'Garment' : 'Garments'} Saved
        </span>
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
        {wishlist.map((product) => {
          const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80';
          const lowestPrice = product.variants?.length
            ? Math.min(...product.variants.map((v) => v.price))
            : product.basePrice || 0;

          return (
            <div
              key={product._id}
              className="group bg-white border border-sphere-border flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-luxury transition-all"
            >
              {/* Image & Remove Action */}
              <div className="relative aspect-[3/4] bg-sphere-sand-light overflow-hidden">
                <Link to={`/products/${product.slug}`}>
                  <img
                    src={primaryImage}
                    alt={product.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                <button
                  onClick={() => removeFromWishlist(product._id)}
                  className="absolute top-2.5 right-2.5 p-2 bg-white/90 backdrop-blur-sm text-sphere-ink hover:text-sphere-status-error hover:bg-white shadow-sm transition-all"
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-luxury text-sphere-muted block mb-1">
                    {product.brand || 'Atelier Sphere'}
                  </span>
                  <Link
                    to={`/products/${product.slug}`}
                    className="font-editorial text-base text-sphere-ink hover:text-sphere-sand transition-colors line-clamp-1"
                  >
                    {product.name}
                  </Link>
                  <div className="mt-2 text-xs font-semibold text-sphere-ink">
                    ₹{lowestPrice.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-sphere-border">
                  <Link
                    to={`/products/${product.slug}`}
                    className="w-full py-2.5 text-center text-xs uppercase tracking-wider font-medium bg-sphere-ivory hover:bg-sphere-ink hover:text-sphere-ivory border border-sphere-border text-sphere-ink block transition-colors"
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

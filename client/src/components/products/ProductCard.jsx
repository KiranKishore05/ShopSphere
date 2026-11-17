import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80';

export default function ProductCard({ product }) {
  const primaryImage = product?.images?.[0]?.url || product?.image || FALLBACK_IMAGE;
  const [imgSrc, setImgSrc] = useState(primaryImage);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isSaved = isInWishlist(product?._id || product?.id);

  // Price calculations
  const price = product?.priceRange?.min ?? product?.price ?? 1299;
  const comparePrice = product?.compareAtPrice ?? product?.comparePrice;
  const hasDiscount = Boolean(comparePrice && comparePrice > price);
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : product?.discountPercent || null;

  // Real ratings & reviews check (do not fabricate if absent)
  const rawRating = product?.ratingAverage ?? product?.rating;
  const rawReviewCount = product?.ratingCount ?? product?.reviewsCount ?? product?.reviewCount;
  const hasRating = Boolean(rawRating && Number(rawRating) > 0);

  const handleQuickAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const defaultVariant = product?.variants?.[0];
    const variantSku = defaultVariant?.sku || product?.sku || `SKU-${product?._id || product?.id}`;
    const productId = product?._id || product?.id;

    addToCart({ productId, variantSku, quantity: 1 });
  };

  return (
    <div className="group bg-white border border-[#EAE5DA] rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md p-3">
      {/* Product Image Container: Fixed 4:5 aspect ratio without stretching */}
      <div className="aspect-[4/5] rounded-lg overflow-hidden relative bg-[#F7F4EC]">
        <Link to={`/products/${product.slug || product.id}`} className="block w-full h-full">
          <img
            src={imgSrc}
            alt={product.name}
            onError={() => setImgSrc(FALLBACK_IMAGE)}
            className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Top Right Wishlist Action */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product._id || product.id);
          }}
          aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#EAE5DA] flex items-center justify-center transition-all ${
            isSaved
              ? 'text-rose-600 bg-white shadow-xs'
              : 'text-[#161513] hover:text-rose-600'
          }`}
        >
          <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Product Meta & Details */}
      <div className="pt-3 pb-1 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="font-sans font-semibold text-sm text-[#161513] line-clamp-1 group-hover:text-[#BA4343] transition-colors">
            <Link to={`/products/${product.slug || product.id}`}>
              {product.name}
            </Link>
          </h3>

          {/* Star Rating & Review Count (Only when real rating data exists) */}
          {hasRating ? (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#827E77]">
              <div className="flex items-center text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </div>
              <span className="font-medium text-[#161513]">{Number(rawRating).toFixed(1)}</span>
              {rawReviewCount ? <span>({rawReviewCount})</span> : null}
            </div>
          ) : (
            <div className="h-4 mt-1" />
          )}
        </div>

        {/* Price & Add to Cart Action */}
        <div className="mt-3 pt-2 border-t border-[#F0EBE1] flex items-center justify-between">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-sm text-[#161513]">
              ₹{Number(price).toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#827E77] line-through">
                ₹{Number(comparePrice).toLocaleString('en-IN')}
              </span>
            )}
            {discountPercent && (
              <span className="text-[11px] font-semibold text-rose-600">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Quick Add To Cart Button */}
          <button
            type="button"
            onClick={handleQuickAddToCart}
            aria-label={`Add ${product.name} to cart`}
            className="w-8 h-8 rounded-lg bg-[#161513] text-[#FDFBF7] flex items-center justify-center hover:bg-[#34302C] active:scale-95 transition-all shadow-xs shrink-0 ml-2"
            title="Add to Cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

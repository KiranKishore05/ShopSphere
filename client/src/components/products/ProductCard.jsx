import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../hooks/useWishlist';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';

export default function ProductCard({ product }) {
  const [imgSrc, setImgSrc] = useState(product?.images?.[0]?.url || FALLBACK_IMAGE);
  const [isHovered, setIsHovered] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isSaved = isInWishlist(product?._id);

  const secondaryImage = product?.images?.[1]?.url;
  const currentImage = (isHovered && secondaryImage) ? secondaryImage : imgSrc;

  const minPrice = product?.priceRange?.min ?? 0;
  const comparePrice = product?.compareAtPrice;
  const inStock = product?.inStock ?? true;

  return (
    <div
      className="group bg-sphere-surface border border-sphere-border rounded-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-editorial-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3:4 Editorial Portrait Aspect Ratio */}
      <div className="aspect-[3/4] overflow-hidden relative bg-sphere-cream">
        <Link to={`/products/${product.slug}`} className="block w-full h-full">
          <img
            src={currentImage}
            alt={product.name}
            onError={() => setImgSrc(FALLBACK_IMAGE)}
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Top Left Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
          {!inStock ? (
            <span className="bg-sphere-charcoal text-sphere-ivory text-[9px] font-bold tracking-luxury uppercase px-2 py-0.5 shadow-sm">
              SOLD OUT
            </span>
          ) : product.isFeatured ? (
            <span className="bg-sphere-ink text-sphere-ivory text-[9px] font-bold tracking-luxury uppercase px-2 py-0.5 shadow-sm">
              EDITORIAL
            </span>
          ) : comparePrice && comparePrice > minPrice ? (
            <span className="bg-sphere-sand-dark text-sphere-ivory text-[9px] font-bold tracking-luxury uppercase px-2 py-0.5 shadow-sm">
              SALE
            </span>
          ) : null}
        </div>

        {/* Top Right Wishlist Action */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product._id);
          }}
          aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-sphere-ivory/80 backdrop-blur-sm border border-sphere-border/60 flex items-center justify-center transition-all ${
            isSaved
              ? 'opacity-100 text-rose-600 bg-white shadow-sm'
              : 'text-sphere-ink hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
        >
          <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        {/* Bottom Size Selection Rail on Desktop Hover */}
        {product.availableSizes && product.availableSizes.length > 0 && inStock && (
          <div className="absolute inset-x-0 bottom-0 bg-sphere-ivory/95 backdrop-blur-sm px-3 py-2 border-t border-sphere-border translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden sm:block">
            <div className="text-[10px] uppercase font-semibold text-sphere-muted mb-1 text-center">
              Available Sizes
            </div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {product.availableSizes.map((size) => (
                <span
                  key={size}
                  className="px-1.5 py-0.5 text-[10px] font-mono border border-sphere-border text-sphere-charcoal bg-sphere-surface"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Content & Meta */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Brand */}
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-sphere-muted mb-1">
            <span>{product.category?.name || product.brand || 'Atelier'}</span>
            <span className="capitalize">{product.gender}</span>
          </div>

          {/* Title */}
          <h3 className="font-editorial text-base text-sphere-ink line-clamp-1 group-hover:text-sphere-sand-dark transition-colors">
            <Link to={`/products/${product.slug}`}>
              {product.name}
            </Link>
          </h3>
        </div>

        <div className="mt-4 pt-3 border-t border-sphere-border flex items-center justify-between">
          {/* Color Swatches */}
          <div className="flex items-center gap-1.5">
            {product.availableColors && product.availableColors.map((color, idx) => (
              <span
                key={idx}
                className="w-3 h-3 rounded-full border border-sphere-border shrink-0"
                style={{ backgroundColor: color.hexCode }}
                title={color.name}
              />
            ))}
          </div>

          {/* Price display */}
          <div className="text-right">
            <span className="text-xs font-semibold text-sphere-ink">
              ₹{minPrice.toLocaleString('en-IN')}
            </span>
            {comparePrice && comparePrice > minPrice && (
              <span className="text-[11px] text-sphere-muted line-through ml-1.5">
                ₹{comparePrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

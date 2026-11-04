import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Heart, ShieldCheck, Truck, RotateCcw, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';
import { fetchProductBySlug } from '../services/catalogService';
import ProductGallery from '../components/products/ProductGallery';
import VariantSelector from '../components/products/VariantSelector';
import Breadcrumbs from '../components/common/Breadcrumbs';
import SEO from '../components/common/SEO';
import StarRating from '../components/reviews/StarRating';
import ReviewBreakdown from '../components/reviews/ReviewBreakdown';
import ReviewList from '../components/reviews/ReviewList';
import ReviewModal from '../components/reviews/ReviewModal';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../hooks/useAuth';
import {
  useProductReviews,
  useReviewEligibility,
  useCreateReview,
  useUpdateReview,
  useDeleteReview
} from '../hooks/useReviews';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToCart, isAddingToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Accordion state
  const [openSection, setOpenSection] = useState('details');

  // Reviews state
  const [reviewSort, setReviewSort] = useState('newest');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProductBySlug(slug)
  });

  // Review queries & mutations
  const { data: reviewsData, isLoading: isLoadingReviews } = useProductReviews(
    product?._id,
    { sort: reviewSort, rating: selectedRatingFilter || undefined }
  );

  const { data: eligibilityData } = useReviewEligibility(
    product?._id,
    isAuthenticated
  );

  const createReviewMutation = useCreateReview(product?._id);
  const updateReviewMutation = useUpdateReview(product?._id);
  const deleteReviewMutation = useDeleteReview(product?._id);

  // Default color selection when product loads
  useEffect(() => {
    if (product?.availableColors?.length > 0 && !selectedColor) {
      setSelectedColor(product.availableColors[0].name);
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
        <div className="h-4 bg-sphere-cream rounded w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 aspect-[3/4] bg-sphere-cream rounded-sm" />
          <div className="lg:col-span-5 space-y-6">
            <div className="h-4 bg-sphere-cream rounded w-24" />
            <div className="h-8 bg-sphere-cream rounded w-3/4" />
            <div className="h-6 bg-sphere-cream rounded w-32" />
            <div className="h-32 bg-sphere-cream rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl text-sphere-ink">Archival Piece Not Found</h2>
        <p className="text-xs text-sphere-muted mt-2 max-w-md mx-auto">
          The requested product piece with slug "{slug}" may have been retired or does not exist in our current collection.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block px-8 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase font-medium tracking-widest rounded-sm hover:bg-sphere-charcoal"
        >
          Return to All Collections
        </Link>
      </div>
    );
  }

  // Find active variant matching selected size and color
  const activeVariant = product.variants?.find(
    (v) => v.size === selectedSize && v.color?.name === selectedColor
  );

  const currentPrice = activeVariant ? activeVariant.price : product.priceRange?.min || 0;
  const comparePrice = activeVariant?.compareAtPrice || product.compareAtPrice;
  const isAvailable = activeVariant ? activeVariant.stockQuantity > 0 : product.inStock;

  const handleAddToCart = async () => {
    if (!selectedColor) {
      setValidationError('Please choose a colour option to continue.');
      return;
    }
    if (!selectedSize) {
      setValidationError('Please select a garment size before adding to your bag.');
      return;
    }
    if (!activeVariant || activeVariant.stockQuantity <= 0) {
      setValidationError('This specific size and colour variation is currently sold out.');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product.slug}` } });
      return;
    }

    try {
      setValidationError('');
      await addToCart({
        productId: product._id,
        variantSku: activeVariant.sku,
        quantity
      });
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3500);
    } catch (err) {
      setValidationError(err.message || 'Failed to add item to bag.');
    }
  };

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const handleReviewSubmit = async (formData) => {
    try {
      if (editingReview) {
        await updateReviewMutation.mutateAsync({
          reviewId: editingReview._id,
          data: formData
        });
      } else {
        await createReviewMutation.mutateAsync(formData);
      }
      setIsReviewModalOpen(false);
      setEditingReview(null);
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const handleOpenEditReview = (review) => {
    setEditingReview(review);
    setIsReviewModalOpen(true);
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Are you sure you wish to delete your review?')) {
      try {
        await deleteReviewMutation.mutateAsync(reviewId);
      } catch (err) {
        console.error('Failed to delete review:', err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Dynamic SEO Meta */}
      <SEO
        title={product.name}
        description={product.description}
        image={product.images?.[0]?.url}
        keywords={product.tags}
        type="product"
      />

      <Breadcrumbs
        items={[
          { label: 'Collections', href: '/shop' },
          product.category && { label: product.category.name, href: `/category/${product.category.slug}` },
          { label: product.name }
        ].filter(Boolean)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16 pt-4">
        {/* Left Column: Image Showcase Gallery */}
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        {/* Right Column: Garment Details & Variant Selection */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            {/* Category, Brand, Gender */}
            <div className="flex items-center gap-3 text-xs uppercase tracking-luxury text-sphere-muted mb-2">
              <span>{product.brand || 'Atelier Sphere'}</span>
              <span>•</span>
              <span className="capitalize">{product.gender} Collection</span>
            </div>

            {/* Product Title */}
            <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink leading-tight">
              {product.name}
            </h1>

            {/* Rating Stars & Scroll Anchor */}
            <div className="flex items-center gap-2.5 mt-2.5">
              <StarRating rating={product.averageRating || 0} size="sm" showScore={true} />
              <a
                href="#reviews"
                className="text-xs text-[#827E77] hover:text-sphere-ink underline decoration-[#D5CEC2] underline-offset-2 transition-colors"
              >
                ({product.reviewCount || 0} {product.reviewCount === 1 ? 'review' : 'reviews'})
              </a>
            </div>

            {/* Price Presentation */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="font-editorial text-2xl sm:text-3xl text-sphere-ink font-normal">
                ₹{currentPrice.toLocaleString('en-IN')}
              </span>
              {comparePrice && comparePrice > currentPrice && (
                <>
                  <span className="text-sm text-sphere-muted line-through">
                    ₹{comparePrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-semibold text-sphere-sand-dark uppercase tracking-wider bg-sphere-cream px-2 py-0.5 rounded-sm">
                    Save ₹{(comparePrice - currentPrice).toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-sphere-muted mt-1">Inclusive of all local luxury taxes and duties.</p>
          </div>

          {/* Variant Matrix Selector */}
          <div className="pt-6 border-t border-sphere-border">
            <VariantSelector
              variants={product.variants || []}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              onSelectSize={(size) => {
                setSelectedSize(size);
                setValidationError('');
              }}
              onSelectColor={(col) => {
                setSelectedColor(col);
                setValidationError('');
              }}
              validationError={validationError}
            />
          </div>

          {/* Quantity & Add to Bag Actions */}
          <div className="pt-6 border-t border-sphere-border space-y-4">
            <div className="flex items-center gap-4">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-sphere-border rounded-sm bg-sphere-surface">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-12 flex items-center justify-center text-sphere-charcoal hover:text-sphere-ink disabled:opacity-30"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-10 text-center font-mono text-xs font-semibold text-sphere-ink">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(activeVariant?.stockQuantity || 10, quantity + 1))}
                  disabled={quantity >= (activeVariant?.stockQuantity || 10)}
                  className="w-10 h-12 flex items-center justify-center text-sphere-charcoal hover:text-sphere-ink disabled:opacity-30"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Main Add Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isAvailable}
                className="flex-1 h-12 bg-sphere-ink text-sphere-ivory text-xs uppercase font-semibold tracking-luxury hover:bg-sphere-charcoal transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-editorial-md rounded-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isAvailable ? 'Add to Shopping Bag' : 'Sold Out'}</span>
              </button>

              {/* Wishlist Heart */}
              <button
                type="button"
                onClick={() => toggleWishlist(product._id)}
                className={`w-12 h-12 border border-sphere-border flex items-center justify-center transition-colors rounded-sm ${
                  isInWishlist(product._id)
                    ? 'text-rose-600 border-rose-300 bg-rose-50/50'
                    : 'text-sphere-charcoal hover:text-rose-600 hover:border-sphere-ink'
                }`}
                aria-label={isInWishlist(product._id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
              >
                <Heart className="w-5 h-5" fill={isInWishlist(product._id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Success notification */}
            {addedSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-sm animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Selected variant ({selectedColor} • {selectedSize}) added to your bag.</span>
              </div>
            )}
          </div>

          {/* Editorial Accordion */}
          <div className="pt-6 border-t border-sphere-border divide-y divide-sphere-border text-xs">
            {/* Garment Silhouette & Notes */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => toggleSection('details')}
                className="w-full flex items-center justify-between font-semibold uppercase tracking-wider text-sphere-ink text-left"
              >
                <span>Silhouette & Tailoring Notes</span>
                {openSection === 'details' ? <ChevronUp className="w-4 h-4 text-sphere-muted" /> : <ChevronDown className="w-4 h-4 text-sphere-muted" />}
              </button>
              {openSection === 'details' && (
                <div className="mt-3 text-sphere-charcoal leading-relaxed font-light space-y-2 animate-fadeIn">
                  <p>{product.description}</p>
                  <p className="text-sphere-muted">SKU Reference: {activeVariant?.sku || 'Select variation'}</p>
                </div>
              )}
            </div>

            {/* Fabric & Sustainability */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => toggleSection('materials')}
                className="w-full flex items-center justify-between font-semibold uppercase tracking-wider text-sphere-ink text-left"
              >
                <span>Materials & Sustainable Craft</span>
                {openSection === 'materials' ? <ChevronUp className="w-4 h-4 text-sphere-muted" /> : <ChevronDown className="w-4 h-4 text-sphere-muted" />}
              </button>
              {openSection === 'materials' && (
                <div className="mt-3 text-sphere-charcoal leading-relaxed font-light space-y-2 animate-fadeIn">
                  <p>Certified 100% natural fiber sourcing. Zero petroleum-derived synthetics. Sourced directly from regenerative smallholder farming collectives.</p>
                  <p className="text-sphere-muted">Care: Dry clean only by specialized luxury garment concierge.</p>
                </div>
              )}
            </div>

            {/* Delivery & Returns */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => toggleSection('shipping')}
                className="w-full flex items-center justify-between font-semibold uppercase tracking-wider text-sphere-ink text-left"
              >
                <span>Insured Transit & Exchanges</span>
                {openSection === 'shipping' ? <ChevronUp className="w-4 h-4 text-sphere-muted" /> : <ChevronDown className="w-4 h-4 text-sphere-muted" />}
              </button>
              {openSection === 'shipping' && (
                <div className="mt-3 text-sphere-charcoal leading-relaxed font-light space-y-2 animate-fadeIn">
                  <p>Complimentary insured domestic transit on orders over ₹1,999. Packaged in archival acid-free boxes with reusable cotton dust bags.</p>
                  <p>14-day return window from delivery date with complimentary size exchanges.</p>
                </div>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="pt-4 grid grid-cols-3 gap-4 text-center text-[10px] text-sphere-muted uppercase tracking-wider">
            <div className="flex flex-col items-center gap-1.5 p-2 bg-sphere-cream/50 rounded-sm">
              <Truck className="w-4 h-4 text-sphere-sand-dark" />
              <span>Insured Transit</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 bg-sphere-cream/50 rounded-sm">
              <RotateCcw className="w-4 h-4 text-sphere-sand-dark" />
              <span>14-Day Returns</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 bg-sphere-cream/50 rounded-sm">
              <ShieldCheck className="w-4 h-4 text-sphere-sand-dark" />
              <span>Authentic Atelier</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Reviews Section */}
      <section id="reviews" className="mt-16 pt-12 border-t border-[#EAE5DA] space-y-8">
        <div>
          <span className="text-xs uppercase tracking-luxury text-sphere-muted block mb-1">
            Verified Experiences
          </span>
          <h2 className="font-editorial text-3xl text-sphere-ink">
            Client Impressions & Reviews
          </h2>
        </div>

        {/* Rating Breakdown */}
        <ReviewBreakdown
          summary={reviewsData?.data?.summary || { averageRating: product.averageRating, totalReviews: product.reviewCount }}
          selectedRating={selectedRatingFilter}
          onSelectRating={setSelectedRatingFilter}
          eligibility={eligibilityData || {}}
          isAuthenticated={isAuthenticated}
          onOpenReviewModal={() => {
            setEditingReview(eligibilityData?.existingReview || null);
            setIsReviewModalOpen(true);
          }}
        />

        {/* Reviews List */}
        <ReviewList
          reviews={reviewsData?.data?.reviews || []}
          currentUserId={user?._id}
          sort={reviewSort}
          onSortChange={setReviewSort}
          selectedRating={selectedRatingFilter}
          onClearRatingFilter={() => setSelectedRatingFilter(null)}
          onEditReview={handleOpenEditReview}
          onDeleteReview={handleDeleteReview}
          isLoading={isLoadingReviews}
        />
      </section>

      {/* Write/Edit Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setEditingReview(null);
        }}
        onSubmit={handleReviewSubmit}
        isPending={createReviewMutation.isPending || updateReviewMutation.isPending}
        initialData={editingReview}
        productTitle={product.name}
      />
    </div>
  );
}

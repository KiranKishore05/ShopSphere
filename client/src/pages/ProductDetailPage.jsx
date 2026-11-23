import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Heart, ShieldCheck, Truck, RotateCcw, ChevronDown, ChevronUp, AlertCircle, Check, Star } from 'lucide-react';
import { fetchProductBySlug, fetchCategoryProducts } from '../services/catalogService';
import ProductGallery from '../components/products/ProductGallery';
import VariantSelector from '../components/products/VariantSelector';
import ProductCard from '../components/products/ProductCard';
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

  // Related products from the same category
  const { data: relatedData } = useQuery({
    queryKey: ['relatedProducts', product?.category?.slug, product?._id],
    queryFn: () => fetchCategoryProducts(product.category.slug, { limit: 8 }),
    enabled: Boolean(product?.category?.slug)
  });

  const relatedProducts = (Array.isArray(relatedData?.products)
    ? relatedData.products
    : Array.isArray(relatedData?.data?.products)
    ? relatedData.data.products
    : Array.isArray(relatedData)
    ? relatedData
    : []
  )
    .filter((p) => p._id !== product?._id)
    .slice(0, 4);

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
    if (!selectedColor) {
      const defaultColor = product?.availableColors?.[0]?.name || product?.variants?.[0]?.color?.name || '';
      if (defaultColor) {
        setSelectedColor(defaultColor);
      }
    }
  }, [product, selectedColor]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
        <div className="h-4 bg-[#EAE5DA] rounded w-48 mb-8" />
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="w-full lg:w-[48%] h-[480px] bg-[#F4EDE4] rounded-2xl" />
          <div className="w-full lg:w-[48%] space-y-5">
            <div className="h-4 bg-[#EAE5DA] rounded w-24" />
            <div className="h-8 bg-[#EAE5DA] rounded w-3/4" />
            <div className="h-6 bg-[#EAE5DA] rounded w-32" />
            <div className="h-28 bg-[#F4EDE4] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-4" />
        <h2 className="font-serif text-3xl text-[#161513]">Product Not Found</h2>
        <p className="text-xs text-[#827E77] mt-2 max-w-md mx-auto">
          The requested product piece "{slug}" is currently unavailable or does not exist.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block px-8 py-3 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C]"
        >
          Return to All Collections
        </Link>
      </div>
    );
  }

  // Find active variant matching selected size
  const activeVariant = selectedSize
    ? (product.variants?.find((v) => v.size === selectedSize && (!selectedColor || v.color?.name === selectedColor))
       || product.variants?.find((v) => v.size === selectedSize))
    : (product.variants?.[0] || null);

  const currentPrice = activeVariant ? activeVariant.price : product.priceRange?.min || 0;
  const comparePrice = activeVariant?.compareAtPrice || product.compareAtPrice;
  const isAvailable = selectedSize
    ? (activeVariant ? activeVariant.stockQuantity > 0 : false)
    : product.inStock;
  const discountPercent = comparePrice && comparePrice > currentPrice
    ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
    : null;

  const handleAddToCart = async () => {
    if (!selectedSize) {
      setValidationError('Please select a garment size before adding to your bag.');
      return;
    }
    const variantToAdd = product.variants?.find((v) => v.size === selectedSize && (!selectedColor || v.color?.name === selectedColor))
      || product.variants?.find((v) => v.size === selectedSize);

    if (!variantToAdd || variantToAdd.stockQuantity <= 0) {
      setValidationError('This specific size variation is currently sold out.');
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
        variantSku: variantToAdd.sku,
        quantity
      });
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3500);
    } catch (err) {
      setValidationError(err.message || 'Failed to add item to bag.');
    }
  };

  const handleBuyNow = async () => {
    if (!selectedSize) {
      setValidationError('Please select a garment size before adding to your bag.');
      return;
    }
    const variantToAdd = product.variants?.find((v) => v.size === selectedSize && (!selectedColor || v.color?.name === selectedColor))
      || product.variants?.find((v) => v.size === selectedSize);

    if (!variantToAdd || variantToAdd.stockQuantity <= 0) {
      setValidationError('This specific size variation is currently sold out.');
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
        variantSku: variantToAdd.sku,
        quantity
      });
      navigate('/checkout');
    } catch (err) {
      setValidationError(err.message || 'Failed to process checkout.');
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

  const hasRealRating = Boolean(product.averageRating && product.averageRating > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 animate-fadeIn">
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
          product.category
            ? { label: product.category.name, href: `/category/${product.category.slug}` }
            : { label: 'Collections', href: '/shop' },
          { label: product.name }
        ].filter(Boolean)}
      />

      {/* Main Two-Column Product Layout (~48% Left Gallery, ~48% Right Info) */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 lg:gap-12 xl:gap-14 pt-4">
        
        {/* Left Column: Fixed & Visually Balanced Product Gallery */}
        <div className="w-full lg:w-[48%] shrink-0 flex justify-center lg:justify-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        {/* Right Column: Clean, Structured Product Information */}
        <div className="w-full lg:w-[48%] space-y-5">
          <div>
            {/* 1. Collection/Category Label */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#827E77] mb-1.5">
              <span>{product.brand || 'ShopSphere'}</span>
              {product.category?.name && (
                <>
                  <span>•</span>
                  <span>{product.category.name}</span>
                </>
              )}
              {product.gender && product.gender.toLowerCase() !== 'unisex' && (
                <>
                  <span>•</span>
                  <span className="capitalize">{product.gender}</span>
                </>
              )}
            </div>

            {/* 2. Product Name with Elegant Typography */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-bold text-[#161513] leading-tight tracking-tight">
              {product.name}
            </h1>

            {/* 3. Pricing Display (Current, Original & Discount) */}
            <div className="flex items-baseline gap-3 mt-2.5">
              <span className="font-sans text-2xl sm:text-3xl font-bold text-[#161513]">
                ₹{currentPrice.toLocaleString('en-IN')}
              </span>
              {comparePrice && comparePrice > currentPrice && (
                <>
                  <span className="text-sm sm:text-base text-[#827E77] line-through font-normal">
                    ₹{comparePrice.toLocaleString('en-IN')}
                  </span>
                  {discountPercent && (
                    <span className="text-xs sm:text-sm font-semibold text-[#BA4343]">
                      ({discountPercent}% Off)
                    </span>
                  )}
                </>
              )}
            </div>

            {/* 4. Rating and Review Count (Shown only when real data exists) */}
            {hasRealRating && (
              <div className="flex items-center gap-2 mt-2">
                <div className="inline-flex items-center gap-1 bg-[#FEF9EE] border border-[#F2E5C9] px-2 py-0.5 rounded text-xs font-semibold text-[#B27B10]">
                  <Star className="w-3.5 h-3.5 fill-[#E5A012] text-[#E5A012]" />
                  <span>{Number(product.averageRating).toFixed(1)}</span>
                </div>
                {product.reviewCount > 0 && (
                  <a
                    href="#reviews"
                    className="text-xs text-[#827E77] hover:text-[#161513] transition-colors"
                  >
                    ({product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'})
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 5. Variant Selection: Size */}
          <div className="pt-4 border-t border-[#EAE5DA]">
            <VariantSelector
              variants={product.variants || []}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              onSelectSize={(size) => {
                setSelectedSize(size);
                const matched = product.variants?.find((v) => v.size === size && (!selectedColor || v.color?.name === selectedColor))
                  || product.variants?.find((v) => v.size === size);
                if (matched?.color?.name) {
                  setSelectedColor(matched.color.name);
                }
                setValidationError('');
              }}
              validationError={validationError}
            />
          </div>

          {/* 7, 8, 9 & 10. Quantity, Add to Cart, Buy Now & Wishlist Controls */}
          <div className="pt-5 border-t border-[#EAE5DA] space-y-3">
            <div className="flex items-center gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] h-11 sm:h-12 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-9 sm:w-10 h-full flex items-center justify-center text-[#161513] hover:text-black font-semibold disabled:opacity-30 transition-colors"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-8 sm:w-9 text-center font-mono text-xs sm:text-sm font-semibold text-[#161513]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(activeVariant?.stockQuantity || 10, quantity + 1))}
                  disabled={quantity >= (activeVariant?.stockQuantity || 10)}
                  className="w-9 sm:w-10 h-full flex items-center justify-center text-[#161513] hover:text-black font-semibold disabled:opacity-30 transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isAvailable || isAddingToCart}
                aria-label="Add to Shopping Bag"
                className="flex-1 h-11 sm:h-12 bg-[#161513] text-[#FDFBF7] text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#34302C] active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isAvailable ? (isAddingToCart ? 'Adding...' : 'Add to Cart') : 'Sold Out'}</span>
                <span className="sr-only">Add to Shopping Bag</span>
              </button>

              {/* Buy Now Button */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!isAvailable}
                className="hidden sm:flex h-11 sm:h-12 px-6 bg-[#3B3835] text-[#FDFBF7] text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#201D1A] active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed items-center justify-center shadow-xs"
              >
                <span>Buy Now</span>
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product._id)}
                className={`w-11 h-11 sm:w-12 sm:h-12 border rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                  isInWishlist(product._id)
                    ? 'text-rose-600 border-rose-300 bg-rose-50/60'
                    : 'text-[#161513] border-[#EAE5DA] bg-[#FDFBF7] hover:border-[#161513]'
                }`}
                aria-label={isInWishlist(product._id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
              >
                <Heart className="w-5 h-5" fill={isInWishlist(product._id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Mobile Buy Now Button */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!isAvailable}
              className="sm:hidden w-full h-11 bg-[#3B3835] text-[#FDFBF7] text-xs font-semibold rounded-lg hover:bg-[#201D1A] active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-xs"
            >
              <span>Buy Now</span>
            </button>

            {/* Success notification */}
            {addedSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Selected piece ({selectedSize}) added to your bag.</span>
              </div>
            )}
          </div>

          {/* 11. Product Description and Accordions */}
          <div className="pt-5 border-t border-[#EAE5DA] divide-y divide-[#EAE5DA] text-xs">
            {/* Product Details Accordion */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => toggleSection('details')}
                className="w-full flex items-center justify-between font-semibold uppercase tracking-wider text-[#161513] text-left"
              >
                <span>Product Description & Fit</span>
                {openSection === 'details' ? <ChevronUp className="w-4 h-4 text-[#827E77]" /> : <ChevronDown className="w-4 h-4 text-[#827E77]" />}
              </button>
              {openSection === 'details' && (
                <div className="mt-3 text-[#5A554E] leading-relaxed space-y-2 animate-fadeIn">
                  <p>{product.description}</p>
                  <p className="text-[#827E77]">SKU Reference: {activeVariant?.sku || 'Select variation'}</p>
                </div>
              )}
            </div>

            {/* Fabric & Care */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => toggleSection('materials')}
                className="w-full flex items-center justify-between font-semibold uppercase tracking-wider text-[#161513] text-left"
              >
                <span>Fabric, Materials & Care</span>
                {openSection === 'materials' ? <ChevronUp className="w-4 h-4 text-[#827E77]" /> : <ChevronDown className="w-4 h-4 text-[#827E77]" />}
              </button>
              {openSection === 'materials' && (
                <div className="mt-3 text-[#5A554E] leading-relaxed space-y-2 animate-fadeIn">
                  <p>Premium natural fabric blend. Carefully woven for breathable comfort and long-lasting durability.</p>
                  <p className="text-[#827E77]">Care: Machine wash cold gentle cycle. Do not bleach. Warm iron if needed.</p>
                </div>
              )}
            </div>

            {/* Delivery & Returns */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => toggleSection('shipping')}
                className="w-full flex items-center justify-between font-semibold uppercase tracking-wider text-[#161513] text-left"
              >
                <span>Shipping, Delivery & Returns</span>
                {openSection === 'shipping' ? <ChevronUp className="w-4 h-4 text-[#827E77]" /> : <ChevronDown className="w-4 h-4 text-[#827E77]" />}
              </button>
              {openSection === 'shipping' && (
                <div className="mt-3 text-[#5A554E] leading-relaxed space-y-2 animate-fadeIn">
                  <p>Free standard shipping on orders above ₹999. Fast delivery across India via premier courier partners.</p>
                  <p className="text-[#827E77]">Easy 7-day hassle-free returns and exchanges on all eligible garments.</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Trust Badges */}
          <div className="pt-2 grid grid-cols-3 gap-3 text-center text-[11px] text-[#5A554E]">
            <div className="flex flex-col items-center gap-1.5 p-2.5 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg">
              <Truck className="w-4 h-4 text-[#161513]" />
              <span className="font-medium">Free Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2.5 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg">
              <RotateCcw className="w-4 h-4 text-[#161513]" />
              <span className="font-medium">7-Day Returns</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2.5 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg">
              <ShieldCheck className="w-4 h-4 text-[#161513]" />
              <span className="font-medium">Secure Payments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#EAE5DA]">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#827E77] font-semibold block mb-1">
                You May Also Like
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#161513] font-bold">
                Related Pieces from {product.category?.name || 'this Collection'}
              </h2>
            </div>
            {product.category?.slug && (
              <Link
                to={`/category/${product.category.slug}`}
                className="text-xs font-semibold text-[#161513] hover:text-[#BA4343] underline underline-offset-4 transition-colors"
              >
                View Collection →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relProduct) => (
              <ProductCard key={relProduct._id} product={relProduct} />
            ))}
          </div>
        </section>
      )}

      {/* Client Reviews Section */}
      <section id="reviews" className="mt-16 pt-10 border-t border-[#EAE5DA] space-y-8">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#827E77] font-semibold block mb-1">
            Customer Feedback
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#161513]">
            Ratings & Customer Reviews
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

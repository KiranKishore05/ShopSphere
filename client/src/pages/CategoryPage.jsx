import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchCategoryProducts, fetchCategories } from '../services/catalogService';
import ProductGrid from '../components/products/ProductGrid';
import FilterSidebar from '../components/products/FilterSidebar';
import Breadcrumbs from '../components/common/Breadcrumbs';
import SEO from '../components/common/SEO';

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const gender = searchParams.get('gender') || '';
  const size = searchParams.get('size') || '';
  const color = searchParams.get('color') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') || '';
  const sort = searchParams.get('sort') || 'newest';

  const filterParams = {
    page,
    limit: 12,
    gender,
    size,
    color,
    minPrice,
    maxPrice,
    inStock,
    sort
  };

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['categoryProducts', slug, filterParams],
    queryFn: () => fetchCategoryProducts(slug, filterParams),
    keepPreviousData: true
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const products = response?.products || response?.data?.products || [];
  const meta = response?.meta || { page: 1, limit: 12, total: products.length, totalPages: 1 };
  const currentCategory = categories.find((c) => c.slug === slug) || response?.data?.category;

  const updateFilter = (key, value) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (value) {
        updated.set(key, value);
      } else {
        updated.delete(key);
      }
      if (key !== 'page') {
        updated.set('page', '1');
      }
      return updated;
    });
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams({ sort: 'newest', page: '1' }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <SEO
        title={currentCategory?.name || slug}
        description={currentCategory?.description || `Explore ${currentCategory?.name || 'curated luxury'} pieces at ShopSphere.`}
        image={currentCategory?.image?.url}
      />

      <Breadcrumbs
        items={[
          { label: 'Collections', href: '/shop' },
          { label: currentCategory?.name || slug }
        ]}
      />

      {/* Category Hero Banner */}
      <div className="relative overflow-hidden bg-sphere-cream border border-sphere-border rounded-sm p-8 sm:p-12 mb-10">
        <div className="max-w-2xl relative z-10 space-y-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-sphere-sand-dark font-semibold block">
            ATELIER TAXONOMY
          </span>
          <h1 className="font-editorial text-3xl sm:text-5xl text-sphere-ink capitalize">
            {currentCategory?.name || slug}
          </h1>
          <p className="text-xs sm:text-sm text-sphere-charcoal leading-relaxed font-light">
            {currentCategory?.description || 'Curated luxury fashion pieces crafted with sculptural tailoring and sustainable fibers.'}
          </p>
        </div>

        {/* Ambient background decoration */}
        {currentCategory?.image?.url && (
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none hidden md:block">
            <img
              src={currentCategory.image.url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-sphere-border mb-8">
        <div className="text-xs text-sphere-muted">
          Showing {products.length} {products.length === 1 ? 'piece' : 'pieces'}
        </div>

        <div className="flex items-center gap-3">
          {/* Sort selector */}
          <select
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="bg-sphere-surface border border-sphere-border text-xs px-3 py-2 rounded-sm focus:border-sphere-ink focus:outline-none text-sphere-ink font-medium cursor-pointer"
          >
            <option value="newest">Sort: New Arrivals</option>
            <option value="price_asc">Sort: Price (Low to High)</option>
            <option value="price_desc">Sort: Price (High to Low)</option>
            <option value="popular">Sort: Most Coveted</option>
          </select>

          {/* Mobile drawer toggle */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-sphere-ink text-sphere-ink text-xs uppercase font-medium tracking-wider rounded-sm hover:bg-sphere-cream"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Grid & Filters */}
      <div className="flex gap-8">
        <FilterSidebar
          categories={categories}
          filters={{ category: slug, gender, size, color, minPrice, maxPrice, inStock }}
          onFilterChange={updateFilter}
          onResetFilters={handleResetFilters}
          isOpenMobile={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        <div className="flex-1">
          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={error}
            onResetFilters={handleResetFilters}
            onRetry={refetch}
          />

          {meta.totalPages > 1 && (
            <div className="pt-12 mt-12 border-t border-sphere-border flex items-center justify-between">
              <div className="text-xs text-sphere-muted">
                Page {meta.page} of {meta.totalPages}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateFilter('page', String(meta.page - 1))}
                  disabled={meta.page <= 1}
                  className="p-2 border border-sphere-border rounded-sm hover:border-sphere-ink disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateFilter('page', String(meta.page + 1))}
                  disabled={meta.page >= meta.totalPages}
                  className="p-2 border border-sphere-border rounded-sm hover:border-sphere-ink disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

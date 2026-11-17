import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchProducts, fetchCategories } from '../services/catalogService';
import ProductGrid from '../components/products/ProductGrid';
import FilterSidebar from '../components/products/FilterSidebar';
import Breadcrumbs from '../components/common/Breadcrumbs';
import SEO from '../components/common/SEO';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // Extract query filters from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
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
    search,
    category,
    gender,
    size,
    color,
    minPrice,
    maxPrice,
    inStock,
    sort
  };

  // TanStack Query for Products
  const { data: productResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['products', filterParams],
    queryFn: () => fetchProducts(filterParams),
    keepPreviousData: true
  });

  // TanStack Query for Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const products = productResponse?.products || productResponse?.data?.products || [];
  const meta = productResponse?.meta || { page: 1, limit: 12, total: products.length, totalPages: 1 };

  // Sync search input with URL after 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== (searchParams.get('search') || '')) {
        updateFilter('search', searchInput);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const updateFilter = (key, value) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (value) {
        updated.set(key, value);
      } else {
        updated.delete(key);
      }
      // Always reset page to 1 when changing filters
      if (key !== 'page') {
        updated.set('page', '1');
      }
      return updated;
    });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams({ sort: 'newest', page: '1' }));
  };

  const activeChips = [
    search && { key: 'search', label: `Search: "${search}"` },
    category && { key: 'category', label: `Category: ${categories.find(c => c.slug === category)?.name || category}` },
    gender && { key: 'gender', label: `Gender: ${gender.charAt(0).toUpperCase() + gender.slice(1)}` },
    size && { key: 'size', label: `Size: ${size}` },
    color && { key: 'color', label: `Color: ${color}` },
    (minPrice || maxPrice) && {
      key: 'price',
      label: `Price: ₹${minPrice || '0'} - ₹${maxPrice || '∞'}`
    },
    inStock && { key: 'inStock', label: 'In-Stock Only' }
  ].filter(Boolean);

  const removeChip = (key) => {
    if (key === 'price') {
      updateFilter('minPrice', '');
      updateFilter('maxPrice', '');
    } else if (key === 'search') {
      setSearchInput('');
      updateFilter('search', '');
    } else {
      updateFilter(key, '');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <SEO
        title={search ? `Search: "${search}"` : 'All Collections & Pieces'}
        description="Browse ShopSphere luxury collections, outerwear, tailoring, and contemporary silhouettes."
      />

      <Breadcrumbs items={[{ label: 'All Collections' }]} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 pb-8 border-b border-sphere-border gap-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-sphere-sand-dark font-semibold block mb-1">
            ATELIER ARCHIVE
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink">
            All Collections
          </h1>
          <p className="text-xs text-sphere-muted mt-1.5 max-w-lg">
            Meticulously engineered seasonal garments cut from regenerative natural fibers and tactile luxury textiles.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-sphere-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search garments, fabrics..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-sphere-surface border border-sphere-border text-xs pl-9 pr-8 py-2 rounded-sm focus:border-sphere-ink focus:outline-none"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  updateFilter('search', '');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sphere-muted hover:text-sphere-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="bg-sphere-surface border border-sphere-border text-xs px-3 py-2 rounded-sm focus:border-sphere-ink focus:outline-none text-sphere-ink font-medium cursor-pointer"
            >
              <option value="newest">Sort: New Arrivals</option>
              <option value="relevance">Sort: Most Relevant</option>
              <option value="popular">Sort: Most Coveted</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-sphere-ink text-sphere-ink text-xs uppercase font-medium tracking-wider rounded-sm hover:bg-sphere-cream"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeChips.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-sphere-ink text-sphere-ivory text-[10px] flex items-center justify-center font-bold">
                {activeChips.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 py-4 flex-wrap border-b border-sphere-border/60">
          <span className="text-[11px] uppercase tracking-wider text-sphere-muted font-medium mr-1">
            Active Filters:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 bg-sphere-cream border border-sphere-border px-2.5 py-1 text-[11px] rounded-full text-sphere-charcoal"
            >
              <span>{chip.label}</span>
              <button
                onClick={() => removeChip(chip.key)}
                className="text-sphere-muted hover:text-sphere-ink"
                aria-label={`Remove ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={handleResetFilters}
            className="text-[11px] text-sphere-sand-dark underline hover:text-sphere-ink ml-2 font-medium"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Layout: Filter Sidebar + Product Grid */}
      <div className="flex gap-8 pt-8">
        <FilterSidebar
          categories={categories}
          filters={{ category, gender, size, color, minPrice, maxPrice, inStock }}
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

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="pt-12 mt-12 border-t border-sphere-border flex items-center justify-between">
              <div className="text-xs text-sphere-muted">
                Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} garments
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateFilter('page', String(meta.page - 1))}
                  disabled={meta.page <= 1}
                  className="p-2 border border-sphere-border rounded-sm hover:border-sphere-ink disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {[...Array(meta.totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  const isCurrent = pageNum === meta.page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => updateFilter('page', String(pageNum))}
                      className={`w-8 h-8 text-xs font-mono border rounded-sm transition-all ${
                        isCurrent
                          ? 'border-sphere-ink bg-sphere-ink text-sphere-ivory font-bold'
                          : 'border-sphere-border hover:border-sphere-ink text-sphere-charcoal bg-sphere-surface'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => updateFilter('page', String(meta.page + 1))}
                  disabled={meta.page >= meta.totalPages}
                  className="p-2 border border-sphere-border rounded-sm hover:border-sphere-ink disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  aria-label="Next Page"
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

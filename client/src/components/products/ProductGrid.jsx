import React from 'react';
import ProductCard from './ProductCard';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function ProductGrid({
  products = [],
  isLoading = false,
  error = null,
  onResetFilters,
  onRetry
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-sphere-surface border border-sphere-border rounded-sm overflow-hidden animate-pulse">
            <div className="aspect-[3/4] bg-sphere-cream relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]" />
            </div>
            <div className="p-4 space-y-3">
              <div className="h-3 bg-sphere-cream rounded w-1/3" />
              <div className="h-4 bg-sphere-cream rounded w-3/4" />
              <div className="h-3 bg-sphere-cream rounded w-1/2 pt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center bg-sphere-cream/60 border border-sphere-border rounded-sm p-8">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-3" />
        <h3 className="font-editorial text-xl text-sphere-ink">Catalogue Disruption</h3>
        <p className="text-xs text-sphere-muted mt-2 max-w-md mx-auto">
          {error.message || 'Unable to retrieve pieces from the atelier archive. Please try refreshing.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-sphere-ink text-sphere-ivory text-xs uppercase font-medium tracking-wider hover:bg-sphere-charcoal transition-colors rounded-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconnect to Atelier</span>
          </button>
        )}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center bg-sphere-surface border border-sphere-border rounded-sm p-8">
        <Sparkles className="w-8 h-8 text-sphere-sand mx-auto mb-3" />
        <h3 className="font-editorial text-2xl text-sphere-ink">No Matching Pieces Found</h3>
        <p className="text-xs text-sphere-muted mt-2 max-w-sm mx-auto leading-relaxed">
          We could not locate any garments matching your exact combination of search terms and filters.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="mt-6 px-6 py-2.5 border border-sphere-ink text-sphere-ink text-xs uppercase font-medium tracking-widest hover:bg-sphere-ink hover:text-sphere-ivory transition-all rounded-sm"
          >
            Clear All Active Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}

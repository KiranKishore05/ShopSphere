import React from 'react';
import { X, RotateCcw, Check } from 'lucide-react';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42', 'One Size'];

const COLORS = [
  { name: 'Camel', hexCode: '#C8B293' },
  { name: 'Ink Black', hexCode: '#161513' },
  { name: 'Ivory Cream', hexCode: '#F7F4EC' },
  { name: 'Botanic Sage', hexCode: '#788A75' },
  { name: 'Muted Sand', hexCode: '#C8B293' },
  { name: 'Saddle Tan', hexCode: '#9E8462' },
  { name: 'Midnight Navy', hexCode: '#1A2332' }
];

export default function FilterSidebar({
  categories = [],
  filters = {},
  onFilterChange,
  onResetFilters,
  isOpenMobile = false,
  onCloseMobile
}) {
  const handleCategoryToggle = (slug) => {
    onFilterChange('category', filters.category === slug ? '' : slug);
  };

  const handleGenderChange = (gender) => {
    onFilterChange('gender', filters.gender === gender ? '' : gender);
  };

  const handleSizeToggle = (size) => {
    onFilterChange('size', filters.size === size ? '' : size);
  };

  const handleColorToggle = (colorName) => {
    onFilterChange('color', filters.color === colorName ? '' : colorName);
  };

  const handlePriceChange = (field, value) => {
    onFilterChange(field, value);
  };

  const handleInStockToggle = (e) => {
    onFilterChange('inStock', e.target.checked ? 'true' : '');
  };

  const activeCount = [
    filters.category,
    filters.gender,
    filters.size,
    filters.color,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock
  ].filter(Boolean).length;

  const content = (
    <div className="space-y-8 text-xs text-sphere-charcoal">
      {/* Header with Clear Filter */}
      <div className="flex items-center justify-between pb-4 border-b border-sphere-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs tracking-wider uppercase text-sphere-ink">Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-sphere-ink text-sphere-ivory text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onResetFilters}
            className="text-[11px] text-sphere-sand-dark hover:text-sphere-ink transition-colors flex items-center gap-1 font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-[11px] uppercase tracking-wider text-sphere-ink">CATEGORIES</h4>
          <div className="space-y-1.5">
            {categories.map((cat) => {
              const isSelected = filters.category === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => handleCategoryToggle(cat.slug)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 rounded-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-sphere-cream font-semibold text-sphere-ink'
                      : 'hover:text-sphere-ink hover:bg-sphere-cream/50 text-sphere-charcoal'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.productCount !== undefined && (
                    <span className="text-[10px] text-sphere-muted font-mono">({cat.productCount})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Gender Classification */}
      <div className="space-y-3">
        <h4 className="font-semibold text-[11px] uppercase tracking-wider text-sphere-ink">GENDER</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Men', value: 'men' },
            { label: 'Women', value: 'women' },
            { label: 'Kids', value: 'kids' }
          ].map((item) => {
            const isSelected = filters.gender?.toLowerCase() === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleGenderChange(item.value)}
                className={`py-2 px-1 text-center border transition-all text-[11px] ${
                  isSelected
                    ? 'border-sphere-ink bg-sphere-ink text-sphere-ivory font-medium'
                    : 'border-sphere-border bg-sphere-surface text-sphere-charcoal hover:border-sphere-sand'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Selector */}
      <div className="space-y-3">
        <h4 className="font-semibold text-[11px] uppercase tracking-wider text-sphere-ink">Size</h4>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((size) => {
            const isSelected = filters.size === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeToggle(size)}
                className={`py-1.5 text-center font-mono text-[11px] border transition-all ${
                  isSelected
                    ? 'border-sphere-ink bg-sphere-ink text-sphere-ivory font-bold'
                    : 'border-sphere-border bg-sphere-surface text-sphere-charcoal hover:border-sphere-sand'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Swatches */}
      <div className="space-y-3">
        <h4 className="font-semibold text-[11px] uppercase tracking-wider text-sphere-ink">Color Palette</h4>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const isSelected = filters.color?.toLowerCase() === c.name.toLowerCase();
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => handleColorToggle(c.name)}
                title={c.name}
                className={`w-7 h-7 rounded-full border relative flex items-center justify-center transition-all ${
                  isSelected ? 'ring-2 ring-sphere-ink ring-offset-2 scale-110' : 'border-sphere-border hover:scale-105'
                }`}
                style={{ backgroundColor: c.hexCode }}
              >
                {isSelected && (
                  <Check className={`w-3.5 h-3.5 ${c.hexCode === '#161513' ? 'text-white' : 'text-sphere-ink'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h4 className="font-semibold text-[11px] uppercase tracking-wider text-sphere-ink">Price Range (₹)</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            value={filters.minPrice || ''}
            onChange={(e) => handlePriceChange('minPrice', e.target.value)}
            className="w-1/2 bg-sphere-surface border border-sphere-border px-2.5 py-1.5 text-xs rounded-sm focus:border-sphere-ink focus:outline-none"
          />
          <span className="text-sphere-muted">—</span>
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            value={filters.maxPrice || ''}
            onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
            className="w-1/2 bg-sphere-surface border border-sphere-border px-2.5 py-1.5 text-xs rounded-sm focus:border-sphere-ink focus:outline-none"
          />
        </div>
      </div>

      {/* Stock Availability */}
      <div className="pt-2 border-t border-sphere-border">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStock === 'true'}
            onChange={handleInStockToggle}
            className="w-4 h-4 rounded border-sphere-border text-sphere-ink focus:ring-sphere-sand"
          />
          <span className="text-xs text-sphere-charcoal font-medium">In-Stock Pieces Only</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 pr-6 border-r border-sphere-border">
        <div className="sticky top-28">{content}</div>
      </aside>

      {/* Mobile Drawer Modal Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-sphere-ink/40 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-sphere-ivory shadow-editorial-lg p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-sphere-border mb-6">
              <span className="font-editorial text-lg text-sphere-ink">Filter Catalog</span>
              <button
                onClick={onCloseMobile}
                className="p-1 text-sphere-charcoal hover:text-sphere-ink"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

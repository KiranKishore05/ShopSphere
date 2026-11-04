import React from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function VariantSelector({
  variants = [],
  selectedSize,
  selectedColor,
  onSelectSize,
  onSelectColor,
  validationError
}) {
  // Extract unique colors
  const colorMap = new Map();
  variants.forEach((v) => {
    if (v.color?.name && !colorMap.has(v.color.name)) {
      colorMap.set(v.color.name, v.color);
    }
  });
  const uniqueColors = Array.from(colorMap.values());

  // Extract unique sizes in standard fashion order
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', 'One Size'];
  const uniqueSizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => {
    const idxA = sizeOrder.indexOf(a);
    const idxB = sizeOrder.indexOf(b);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  // Current matched variant
  const activeVariant = variants.find(
    (v) => v.size === selectedSize && v.color?.name === selectedColor
  );

  return (
    <div className="space-y-6">
      {/* 1. Color Selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-sphere-ink">
            Colour Palette
          </label>
          <span className="text-xs text-sphere-muted capitalize font-medium">
            {selectedColor || 'Choose a colour'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {uniqueColors.map((col) => {
            const isSelected = selectedColor === col.name;
            return (
              <button
                key={col.name}
                type="button"
                onClick={() => onSelectColor(col.name)}
                title={col.name}
                className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center ${
                  isSelected
                    ? 'ring-2 ring-sphere-ink ring-offset-2 scale-110 shadow-sm'
                    : 'border-sphere-border hover:scale-105'
                }`}
                style={{ backgroundColor: col.hexCode }}
                aria-label={`Select ${col.name}`}
              />
            );
          })}
        </div>
      </div>

      {/* 2. Size Selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-sphere-ink">
            Size Selection
          </label>
          <span className="text-xs text-sphere-muted">
            {selectedSize ? `Selected: ${selectedSize}` : 'Choose a size'}
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {uniqueSizes.map((size) => {
            const isSelected = selectedSize === size;
            // Check if this size has stock in the selected color
            const variantForSize = variants.find(
              (v) => v.size === size && (!selectedColor || v.color?.name === selectedColor)
            );
            const isAvailable = variantForSize ? variantForSize.stockQuantity > 0 : false;

            return (
              <button
                key={size}
                type="button"
                onClick={() => onSelectSize(size)}
                disabled={!isAvailable && selectedColor}
                className={`py-3 text-center font-mono text-xs border transition-all relative ${
                  isSelected
                    ? 'border-sphere-ink bg-sphere-ink text-sphere-ivory font-bold'
                    : isAvailable || !selectedColor
                    ? 'border-sphere-border bg-sphere-surface text-sphere-ink hover:border-sphere-sand'
                    : 'border-sphere-border/40 bg-sphere-cream/50 text-sphere-muted/50 cursor-not-allowed'
                }`}
              >
                <span>{size}</span>
                {!isAvailable && selectedColor && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-full border-t border-sphere-muted/40 rotate-45 transform" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Real-time Inventory & Stock Feedback */}
      {selectedSize && selectedColor && activeVariant && (
        <div className="pt-2">
          {activeVariant.stockQuantity > 5 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 px-3 py-2 rounded-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>In Stock — Dispatched within 24 hours from Mumbai Atelier.</span>
            </div>
          ) : activeVariant.stockQuantity > 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/80 border border-amber-200/80 px-3 py-2 rounded-sm">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Low Stock Alert — Only {activeVariant.stockQuantity} pieces remaining in this size.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50/80 border border-rose-200/80 px-3 py-2 rounded-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Archival Run Sold Out — Available for bespoke commission request.</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Validation Alert */}
      {validationError && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}

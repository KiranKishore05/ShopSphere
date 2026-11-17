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
    <div className="space-y-5">
      {/* 1. Color Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#161513]">
            Colour Palette
          </label>
          <span className="text-xs text-[#827E77] capitalize font-medium">
            {selectedColor || 'Choose a colour'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {uniqueColors.map((col) => {
            const isSelected = selectedColor === col.name;
            return (
              <button
                key={col.name}
                type="button"
                onClick={() => onSelectColor(col.name)}
                title={col.name}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all flex items-center justify-center ${
                  isSelected
                    ? 'ring-2 ring-[#161513] ring-offset-2 scale-105 shadow-xs border-[#161513]'
                    : 'border-[#D5CEC2] hover:scale-105 hover:border-[#161513]'
                }`}
                style={{ backgroundColor: col.hexCode }}
                aria-label={`Select ${col.name}`}
              />
            );
          })}
        </div>
      </div>

      {/* 2. Size Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#161513]">
            Size Selection
          </label>
          <span className="text-xs text-[#827E77]">
            {selectedSize ? `Selected: ${selectedSize}` : 'Choose a size'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
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
                className={`w-12 h-10 sm:w-14 sm:h-11 rounded-lg text-center font-sans text-xs sm:text-sm font-semibold border transition-all relative flex items-center justify-center ${
                  isSelected
                    ? 'border-[#161513] bg-[#161513] text-[#FDFBF7] shadow-xs'
                    : isAvailable || !selectedColor
                    ? 'border-[#EAE5DA] bg-[#FDFBF7] text-[#161513] hover:border-[#161513]'
                    : 'border-[#EAE5DA]/60 bg-[#F4EDE4]/40 text-[#A8A29A] cursor-not-allowed'
                }`}
              >
                <span>{size}</span>
                {!isAvailable && selectedColor && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-full border-t border-[#A8A29A]/50 rotate-45 transform" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Real-time Inventory & Stock Feedback */}
      {selectedSize && selectedColor && activeVariant && (
        <div className="pt-1">
          {activeVariant.stockQuantity > 5 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/90 border border-emerald-200/90 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>In Stock — Dispatched within 24 hours from Mumbai Atelier.</span>
            </div>
          ) : activeVariant.stockQuantity > 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/90 border border-amber-200/90 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Low Stock Alert — Only {activeVariant.stockQuantity} pieces remaining in this size.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50/90 border border-rose-200/90 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Archival Run Sold Out — Available for bespoke commission request.</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Validation Alert */}
      {validationError && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}

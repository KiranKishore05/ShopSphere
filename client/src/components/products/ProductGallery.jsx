import React, { useState } from 'react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85';

export default function ProductGallery({ images = [], name = 'Product' }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const validImages = images.length > 0 ? images : [{ url: FALLBACK_IMAGE, altText: name }];
  const currentImage = validImages[selectedIndex] || validImages[0];
  const isFailed = failedImages[selectedIndex];

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3.5 lg:gap-4 items-start w-full">
      {/* 1. Left Vertical Thumbnails Strip (Desktop/Tablet) / Horizontal (Mobile) */}
      {validImages.length > 1 && (
        <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[460px] lg:max-h-[520px] shrink-0 w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
          {validImages.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`w-14 h-18 sm:w-16 sm:h-20 lg:w-[68px] lg:h-[84px] rounded-lg overflow-hidden border bg-[#FBF9F5] shrink-0 transition-all flex items-center justify-center p-1 ${
                  isSelected
                    ? 'border-[#161513] ring-1 ring-[#161513] shadow-xs'
                    : 'border-[#EAE5DA] opacity-75 hover:opacity-100 hover:border-[#161513]/40'
                }`}
                aria-label={`View image ${idx + 1} of ${validImages.length}`}
              >
                <img
                  src={failedImages[idx] ? FALLBACK_IMAGE : img.url}
                  alt={img.altText || `${name} view ${idx + 1}`}
                  onError={() => setFailedImages((prev) => ({ ...prev, [idx]: true }))}
                  className="w-full h-full object-contain object-center"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Main Focus Showcase Image Container (Fixed & Visually Balanced) */}
      <div className="flex-1 w-full max-w-[480px] h-[380px] sm:h-[440px] lg:h-[500px] bg-[#FBF9F5] border border-[#EAE5DA] rounded-2xl overflow-hidden relative flex items-center justify-center p-4 sm:p-6 lg:p-8 shadow-xs">
        <img
          src={isFailed ? FALLBACK_IMAGE : currentImage.url}
          alt={currentImage.altText || name}
          onError={() => setFailedImages((prev) => ({ ...prev, [selectedIndex]: true }))}
          className="max-w-full max-h-full w-auto h-auto object-contain object-center transition-transform duration-500 hover:scale-105 drop-shadow-xs"
        />
      </div>
    </div>
  );
}

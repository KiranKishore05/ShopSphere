import React, { useState } from 'react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85';

export default function ProductGallery({ images = [], name = 'Product' }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const validImages = images.length > 0 ? images : [{ url: FALLBACK_IMAGE, altText: name }];
  const currentImage = validImages[selectedIndex] || validImages[0];
  const isFailed = failedImages[selectedIndex];

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Thumbnails list */}
      {validImages.length > 1 && (
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[580px] shrink-0">
          {validImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`w-16 h-20 md:w-20 md:h-24 rounded-sm overflow-hidden border shrink-0 transition-all ${
                selectedIndex === idx
                  ? 'border-sphere-ink ring-1 ring-sphere-ink'
                  : 'border-sphere-border opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={failedImages[idx] ? FALLBACK_IMAGE : img.url}
                alt={img.altText || `${name} view ${idx + 1}`}
                onError={() => setFailedImages((prev) => ({ ...prev, [idx]: true }))}
                className="w-full h-full object-cover object-top"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Focus Showcase Image */}
      <div className="flex-1 bg-sphere-cream border border-sphere-border rounded-sm overflow-hidden aspect-[3/4] relative">
        <img
          src={isFailed ? FALLBACK_IMAGE : currentImage.url}
          alt={currentImage.altText || name}
          onError={() => setFailedImages((prev) => ({ ...prev, [selectedIndex]: true }))}
          className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
        />
      </div>
    </div>
  );
}

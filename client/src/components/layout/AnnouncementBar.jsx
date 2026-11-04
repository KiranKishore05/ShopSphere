import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-sphere-ink text-sphere-ivory text-[11px] font-medium tracking-[0.14em] uppercase py-2 px-4 transition-all duration-300 relative border-b border-sphere-charcoal/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="hidden md:flex items-center gap-2 text-sphere-sand">
          <Sparkles className="w-3 h-3" />
          <span>AUTUMN / WINTER 2026 ARCHIVE</span>
        </div>
        
        <div className="text-center flex-1 mx-auto">
          <span>Complimentary Express Shipping on Orders Above ₹1,999</span>
          <span className="hidden sm:inline text-sphere-sand mx-2">•</span>
          <span className="hidden sm:inline text-sphere-sand-light/80">Duty-Free Delivery Included</span>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss announcement"
          className="text-sphere-sand hover:text-white transition-colors p-0.5 ml-2"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

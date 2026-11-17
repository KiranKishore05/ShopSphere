import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-[#161513] text-[#FDFBF7] text-xs font-medium py-2 px-4 transition-all duration-300 relative border-b border-[#2C2925] tracking-wide">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="w-6 hidden md:block" />

        <div className="text-center flex-1 mx-auto flex items-center justify-center flex-wrap gap-x-2 text-[11px] sm:text-xs">
          <span>Free Shipping on orders above ₹999</span>
          <span className="text-[#827E77] hidden xs:inline">|</span>
          <span>Easy Returns</span>
          <span className="text-[#827E77] hidden xs:inline">|</span>
          <span>COD Available</span>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss announcement"
          className="text-[#827E77] hover:text-white transition-colors p-0.5 ml-2"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

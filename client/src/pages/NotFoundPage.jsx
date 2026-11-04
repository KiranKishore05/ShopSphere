import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center animate-fadeIn">
      <div className="max-w-md mx-auto space-y-4">
        <Compass className="w-12 h-12 text-sphere-sand-dark mx-auto stroke-1" />
        <span className="text-[11px] uppercase tracking-[0.25em] text-sphere-muted block">
          404 — PAGE NOT FOUND
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl text-sphere-ink">
          Lost in the Archive
        </h1>
        <p className="text-xs text-sphere-charcoal leading-relaxed font-light">
          The editorial piece, category, or runway showcase you are seeking does not exist or has been relocated to another collection.
        </p>
        <div className="pt-6">
          <Link
            to="/shop"
            className="inline-block px-8 py-3.5 bg-sphere-ink text-sphere-ivory text-xs uppercase font-medium tracking-luxury hover:bg-sphere-charcoal transition-all rounded-sm shadow-editorial-md"
          >
            Explore All Collections
          </Link>
        </div>
      </div>
    </div>
  );
}

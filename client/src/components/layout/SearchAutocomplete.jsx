import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X, ArrowRight, Package, Tag, Loader2 } from 'lucide-react';
import { useSearchSuggestions } from '../../hooks/useReviews';

export default function SearchAutocomplete({
  isOpen = false,
  onClose = () => {},
  isMobile = false
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Debounce input by 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Fetch live suggestions
  const { data: suggestions, isLoading } = useSearchSuggestions(debouncedQuery);

  const products = suggestions?.products || [];
  const categories = suggestions?.categories || [];
  const totalCount = suggestions?.totalCount || 0;

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      onClose();
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < products.length) {
        onClose();
        navigate(`/products/${products[selectedIndex].slug}`);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`${
        isMobile
          ? 'w-full my-3'
          : 'absolute top-full right-0 mt-2 w-[460px] max-w-[92vw] z-50'
      } bg-white border border-[#EAE5DA] rounded-xl shadow-2xl overflow-hidden animate-fadeIn`}
    >
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative p-3 border-b border-[#EAE5DA] bg-[#FAF8F5] flex items-center gap-2">
        <Search className="w-4 h-4 text-[#827E77] shrink-0 ml-1" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search garments, categories, fabrics..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full text-xs bg-transparent text-sphere-ink placeholder-[#9C988F] focus:outline-none"
        />
        {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#827E77] animate-spin shrink-0" />}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 text-[#827E77] hover:text-sphere-ink rounded-full hover:bg-black/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Autocomplete Suggestions Panel */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F2EFE9] text-xs">
        {/* Categories Match */}
        {categories.length > 0 && (
          <div className="p-3 bg-[#FCFAF7]">
            <span className="text-[10px] uppercase tracking-wider text-[#827E77] font-semibold block mb-2 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-[#C8B293]" />
              <span>Matching Categories</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/category/${cat.slug}`}
                  onClick={onClose}
                  className="px-2.5 py-1 text-[11px] bg-white border border-[#EAE5DA] rounded-full text-sphere-ink hover:border-sphere-ink hover:bg-[#FAF8F5] transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Match */}
        {products.length > 0 ? (
          <div className="p-2 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#827E77] font-semibold px-2 py-1 block">
              Suggested Pieces
            </span>
            {products.map((prod, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <Link
                  key={prod._id}
                  to={`/products/${prod.slug}`}
                  onClick={onClose}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isSelected ? 'bg-[#F2EFE9]' : 'hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="w-10 h-12 bg-[#F2EFE9] border border-[#EAE5DA] rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover object-top" loading="lazy" />
                    ) : (
                      <Package className="w-4 h-4 text-[#C8B293]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-xs text-sphere-ink block truncate">
                      {prod.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#827E77]">
                      <span>{prod.brand}</span>
                      <span>•</span>
                      <span className="font-mono text-sphere-ink font-semibold">
                        ₹{(prod.priceRange?.min || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#827E77] shrink-0 opacity-60" />
                </Link>
              );
            })}
          </div>
        ) : debouncedQuery && !isLoading ? (
          <div className="p-6 text-center text-[#827E77]">
            <Package className="w-8 h-8 text-[#C8B293] mx-auto mb-2 opacity-60" />
            <p className="font-editorial text-sm text-sphere-ink">No atelier pieces matched</p>
            <p className="text-[11px] mt-0.5">Press Enter to run a comprehensive catalog search.</p>
          </div>
        ) : null}

        {/* View all search results footer */}
        {debouncedQuery && (
          <div className="p-3 bg-[#FAF8F5] text-center">
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="w-full py-1.5 px-3 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#34302C] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View all {totalCount} results for "{debouncedQuery}"</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

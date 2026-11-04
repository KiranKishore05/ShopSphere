import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle } from 'lucide-react';
import StarRating from './StarRating';

export default function ReviewModal({
  isOpen,
  onClose,
  onSubmit,
  isPending = false,
  initialData = null,
  productTitle = 'Garment'
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setRating(initialData.rating || 5);
      setTitle(initialData.title || '');
      setComment(initialData.comment || '');
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    if (!title.trim() || title.trim().length < 2) {
      setError('Please provide a descriptive review title (at least 2 characters).');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please provide a thoughtful review comment (at least 5 characters).');
      return;
    }

    onSubmit({
      rating,
      title: title.trim(),
      comment: comment.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white max-w-lg w-full rounded-xl border border-[#EAE5DA] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#EAE5DA] flex items-center justify-between bg-[#FAF8F5]">
          <div>
            <h3 className="font-editorial text-xl text-sphere-ink">
              {initialData ? 'Edit Your Atelier Review' : 'Write a Garment Review'}
            </h3>
            <p className="text-xs text-[#827E77] truncate max-w-sm mt-0.5 font-sans">
              {productTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#827E77] hover:text-sphere-ink rounded-lg hover:bg-[#F2EFE9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Verified purchase notice */}
          <div className="p-3 bg-[#EAF7ED] border border-[#D5F5E3] rounded-lg flex items-center gap-2.5 text-xs text-[#145A32]">
            <ShieldCheck className="w-4 h-4 text-[#1E8449] shrink-0" />
            <span>
              <strong>Verified Atelier Purchase:</strong> Your order has been delivered and your feedback will be featured on the product page.
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Star selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-2">
              Overall Rating *
            </label>
            <div className="flex items-center gap-3">
              <StarRating
                rating={rating}
                interactive={true}
                size="lg"
                onChange={(newRating) => setRating(newRating)}
              />
              <span className="text-xs font-medium text-[#827E77]">
                {rating === 5 && 'Outstanding craftsmanship'}
                {rating === 4 && 'Very pleased'}
                {rating === 3 && 'Meets expectations'}
                {rating === 2 && 'Disappointed with fit/material'}
                {rating === 1 && 'Unsatisfactory'}
              </span>
            </div>
          </div>

          {/* Review title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1.5">
              Review Headline *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Magnificent drape and tailored finish"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#D5CEC2] rounded-lg text-sphere-ink placeholder-[#9C988F] focus:border-sphere-ink focus:outline-none"
            />
          </div>

          {/* Review comment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#635E56]">
                Detailed Review *
              </label>
              <span className="text-[11px] text-[#9C988F]">
                {comment.length} / 1000 characters
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={1000}
              placeholder="Share details about the silhouette, fabric weight, sizing accuracy, and styling versatility..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#D5CEC2] rounded-lg text-sphere-ink placeholder-[#9C988F] focus:border-sphere-ink focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#EAE5DA]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 border border-[#D5CEC2] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#34302C] transition-colors disabled:opacity-50"
            >
              {isPending ? 'Publishing...' : initialData ? 'Save Changes' : 'Publish Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

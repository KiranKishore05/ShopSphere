import React from 'react';
import {
  ShieldCheck,
  Award,
  Trash2,
  Edit3,
  Calendar,
  User as UserIcon,
  FilterX
} from 'lucide-react';
import StarRating from './StarRating';

export default function ReviewList({
  reviews = [],
  currentUserId = null,
  sort = 'newest',
  onSortChange = () => {},
  selectedRating = null,
  onClearRatingFilter = () => {},
  onEditReview = () => {},
  onDeleteReview = () => {},
  isLoading = false
}) {
  return (
    <div className="space-y-4">
      {/* Header bar: Filter indicator & sort controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE5DA]">
        <div className="flex items-center gap-2">
          <h4 className="font-editorial text-lg text-sphere-ink">
            Client Impressions
          </h4>
          {selectedRating && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FAF8F5] border border-[#EAE5DA] rounded-full text-xs text-[#635E56]">
              <span>Filtered by {selectedRating} ★</span>
              <button
                onClick={onClearRatingFilter}
                className="hover:text-sphere-ink"
                title="Clear rating filter"
              >
                <FilterX className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#827E77] uppercase tracking-wider font-semibold">
            Sort:
          </span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-xs bg-white border border-[#D5CEC2] rounded-lg px-2.5 py-1.5 text-sphere-ink focus:outline-none focus:border-sphere-ink"
          >
            <option value="newest">Newest First</option>
            <option value="highest_rating">Highest Rating</option>
            <option value="lowest_rating">Lowest Rating</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#827E77] uppercase font-semibold">Loading Client Reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center bg-white border border-[#EAE5DA] rounded-xl p-8">
          <p className="font-editorial text-lg text-sphere-ink mb-1">
            {selectedRating ? `No ${selectedRating}-star reviews yet.` : 'No customer reviews yet.'}
          </p>
          <p className="text-xs text-[#827E77] max-w-sm mx-auto">
            {selectedRating
              ? 'Try resetting your star filter to view all feedback.'
              : 'Be the first verified patron to share styling and fit impressions for this piece.'}
          </p>
          {selectedRating && (
            <button
              onClick={onClearRatingFilter}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-sphere-ink border border-[#D5CEC2] rounded-lg hover:bg-[#FAF8F5]"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Show All Reviews</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isAuthor = currentUserId && (
              rev.userId === currentUserId ||
              (rev.userId?._id && rev.userId._id === currentUserId)
            );

            return (
              <div
                key={rev._id}
                className={`bg-white border rounded-xl p-5 shadow-2xs space-y-3 transition-colors ${
                  rev.isFeatured ? 'border-[#C8B293] bg-[#FCFAF7]' : 'border-[#EAE5DA]'
                }`}
              >
                {/* Review Top meta: Stars, Badges, Date, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <StarRating rating={rev.rating} size="sm" />
                    {rev.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF7ED] text-[#1E8449]">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Purchase</span>
                      </span>
                    )}
                    {rev.isFeatured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF9E7] text-[#B7950B] border border-[#F9E79F]">
                        <Award className="w-3 h-3" />
                        <span>Featured Review</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#827E77] font-mono">
                      {new Date(rev.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>

                    {/* Author actions */}
                    {isAuthor && (
                      <div className="flex items-center gap-1 border-l border-[#EAE5DA] pl-2 ml-1">
                        <button
                          onClick={() => onEditReview(rev)}
                          className="p-1 text-[#635E56] hover:text-sphere-ink rounded hover:bg-[#FAF8F5] transition-colors"
                          title="Edit review"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteReview(rev._id)}
                          className="p-1 text-[#635E56] hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Title & Body */}
                <div>
                  <h5 className="font-editorial text-base font-medium text-sphere-ink mb-1">
                    {rev.title}
                  </h5>
                  <p className="text-xs text-[#4A4742] leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                {/* Author Name */}
                <div className="pt-2 border-t border-[#F2EFE9] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#F2EFE9] border border-[#EAE5DA] flex items-center justify-center text-[10px] font-bold text-[#635E56]">
                    {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <span className="text-xs font-medium text-[#635E56]">
                    {rev.userName} {isAuthor && <span className="text-[10px] text-[#827E77] font-normal">(You)</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

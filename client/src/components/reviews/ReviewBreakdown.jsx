import React from 'react';
import { Star, ShieldCheck, PenLine } from 'lucide-react';
import StarRating from './StarRating';

export default function ReviewBreakdown({
  summary = {},
  selectedRating = null,
  onSelectRating = () => {},
  eligibility = {},
  isAuthenticated = false,
  onOpenReviewModal = () => {}
}) {
  const averageRating = summary.averageRating || 0;
  const totalReviews = summary.totalReviews || 0;
  const breakdown = summary.breakdown || {
    5: { count: 0, percentage: 0 },
    4: { count: 0, percentage: 0 },
    3: { count: 0, percentage: 0 },
    2: { count: 0, percentage: 0 },
    1: { count: 0, percentage: 0 }
  };

  const isEligible = eligibility.isEligible;
  const hasReviewed = eligibility.hasReviewed;

  return (
    <div className="bg-white border border-[#EAE5DA] rounded-xl p-6 shadow-2xs space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#F2EFE9]">
        {/* Left: Overall rating big score */}
        <div className="flex items-center gap-5">
          <div className="text-center">
            <span className="font-editorial text-5xl font-normal text-sphere-ink tracking-tight block">
              {averageRating.toFixed(1)}
            </span>
            <div className="mt-1">
              <StarRating rating={averageRating} size="sm" />
            </div>
            <span className="text-[11px] text-[#827E77] block mt-1">
              Based on {totalReviews} {totalReviews === 1 ? 'verified review' : 'verified reviews'}
            </span>
          </div>

          <div className="h-14 w-px bg-[#EAE5DA] hidden sm:block" />

          {/* Center: Rating bars */}
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            {[5, 4, 3, 2, 1].map((star) => {
              const data = breakdown[star] || { count: 0, percentage: 0 };
              const isSelected = selectedRating === star;

              return (
                <button
                  key={star}
                  onClick={() => onSelectRating(isSelected ? null : star)}
                  className={`w-full flex items-center gap-2.5 text-xs text-left group hover:opacity-80 transition-opacity ${
                    isSelected ? 'font-bold' : ''
                  }`}
                >
                  <span className="w-8 text-[11px] text-[#635E56] font-mono shrink-0">
                    {star} ★
                  </span>
                  <div className="flex-1 h-2 bg-[#F2EFE9] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected ? 'bg-sphere-ink' : 'bg-[#C8B293]'
                      }`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-[#827E77] text-right font-mono shrink-0">
                    {data.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Write review trigger */}
        <div className="flex flex-col items-start md:items-end justify-center shrink-0">
          {!isAuthenticated ? (
            <div className="text-left md:text-right">
              <p className="text-xs text-[#827E77] mb-2">
                Have you purchased this garment?
              </p>
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#161513] text-xs font-semibold uppercase tracking-wider text-[#161513] hover:bg-[#161513] hover:text-[#FDFBF7] rounded-lg transition-colors"
              >
                <span>Sign In to Review</span>
              </a>
            </div>
          ) : hasReviewed ? (
            <div className="text-left md:text-right">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EAF7ED] text-[#1E8449] rounded-full text-xs font-medium mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>You reviewed this piece</span>
              </div>
              <button
                onClick={onOpenReviewModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#D5CEC2] text-xs font-semibold uppercase tracking-wider text-sphere-ink hover:bg-[#FAF8F5] rounded-lg transition-colors block"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Edit Your Review</span>
              </button>
            </div>
          ) : isEligible ? (
            <div className="text-left md:text-right">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EAF7ED] text-[#1E8449] rounded-full text-xs font-medium mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Delivered Purchase</span>
              </div>
              <button
                onClick={onOpenReviewModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider hover:bg-[#34302C] rounded-lg transition-colors shadow-2xs block"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Write a Review</span>
              </button>
            </div>
          ) : (
            <div className="text-left md:text-right max-w-xs">
              <p className="text-xs text-[#827E77]">
                Only verified patrons who have purchased and received this piece are eligible to publish feedback.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

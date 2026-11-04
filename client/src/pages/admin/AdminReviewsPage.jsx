import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Star,
  Package,
  AlertTriangle
} from 'lucide-react';
import {
  useAdminReviews,
  useModerateReview,
  useDeleteAdminReview
} from '../../hooks/useReviews';
import StarRating from '../../components/reviews/StarRating';

export default function AdminReviewsPage() {
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: reviewsData,
    isLoading,
    refetch
  } = useAdminReviews({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    rating: ratingFilter !== 'all' ? ratingFilter : undefined,
    search: search || undefined,
    page,
    limit: 15
  });

  const moderateMutation = useModerateReview();
  const deleteMutation = useDeleteAdminReview();

  const reviews = reviewsData?.data?.reviews || [];
  const counts = reviewsData?.data?.counts || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const meta = reviewsData?.meta || { page: 1, limit: 15, total: 0, totalPages: 1 };

  const handleStatusChange = async (reviewId, newStatus) => {
    try {
      await moderateMutation.mutateAsync({
        reviewId,
        data: { status: newStatus }
      });
    } catch (err) {
      console.error('Moderation error:', err);
    }
  };

  const handleToggleFeatured = async (reviewId, currentFeatured) => {
    try {
      await moderateMutation.mutateAsync({
        reviewId,
        data: { isFeatured: !currentFeatured }
      });
    } catch (err) {
      console.error('Feature toggle error:', err);
    }
  };

  const handleDelete = async (reviewId) => {
    if (window.confirm('Permanently remove this review from the atelier records? This cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync(reviewId);
      } catch (err) {
        console.error('Delete review error:', err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE5DA]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-editorial text-3xl font-medium text-sphere-ink tracking-tight">
              Reviews & Impressions
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#F0EBE1] text-[#635E56] rounded-xs border border-[#E2DBD0]">
              Curation & Moderation
            </span>
          </div>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Oversee verified client feedback, feature editorial testimonials, and moderate submissions.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 border border-[#E5DFD5] rounded-lg text-[#635E56] hover:text-sphere-ink hover:bg-[#FAF8F5] transition-colors self-start sm:self-auto bg-white"
          title="Refresh Reviews"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Status KPI Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-[#161513] text-[#FDFBF7] border-[#161513] shadow-xs'
              : 'bg-white border-[#EAE5DA] text-sphere-ink hover:bg-[#FAF8F5]'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider block opacity-75 font-semibold">
            All Reviews
          </span>
          <span className="font-editorial text-2xl font-bold mt-1 block">
            {counts.total}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('pending');
            setPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'pending'
              ? 'bg-[#B7950B] text-white border-[#B7950B] shadow-xs'
              : 'bg-white border-[#EAE5DA] text-sphere-ink hover:bg-[#FAF8F5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider block opacity-75 font-semibold">
              Pending
            </span>
            <Clock className="w-3.5 h-3.5 opacity-60" />
          </div>
          <span className="font-editorial text-2xl font-bold mt-1 block">
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('approved');
            setPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'approved'
              ? 'bg-[#1E8449] text-white border-[#1E8449] shadow-xs'
              : 'bg-white border-[#EAE5DA] text-sphere-ink hover:bg-[#FAF8F5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider block opacity-75 font-semibold">
              Approved
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 opacity-60" />
          </div>
          <span className="font-editorial text-2xl font-bold mt-1 block">
            {counts.approved}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('rejected');
            setPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'rejected'
              ? 'bg-[#C0392B] text-white border-[#C0392B] shadow-xs'
              : 'bg-white border-[#EAE5DA] text-sphere-ink hover:bg-[#FAF8F5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider block opacity-75 font-semibold">
              Rejected
            </span>
            <XCircle className="w-3.5 h-3.5 opacity-60" />
          </div>
          <span className="font-editorial text-2xl font-bold mt-1 block">
            {counts.rejected}
          </span>
        </button>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-white p-3.5 border border-[#EAE5DA] rounded-xl shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-[#827E77] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by review headline or client impressions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded-lg text-sphere-ink placeholder-[#9C988F] focus:bg-white focus:border-sphere-ink focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-[#E5DFD5] text-xs text-[#4A4742] py-2 px-3 rounded-lg focus:outline-none focus:border-sphere-ink cursor-pointer hover:bg-[#FAF8F5] transition-colors"
          >
            <option value="all">All Star Ratings ▾</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars Only</option>
            <option value="3">3 Stars Only</option>
            <option value="2">2 Stars Only</option>
            <option value="1">1 Star Only</option>
          </select>
        </div>
      </div>

      {/* Moderation Queue Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#827E77] uppercase font-semibold">Loading Feedback Dossiers...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center px-4">
            <MessageSquare className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Reviews Found</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto">
              No feedback matches the selected moderation filters or search terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[11px] font-semibold text-[#635E56]">
                  <th className="py-3.5 px-4">Garment</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-3">Rating</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Review Content</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-center">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {reviews.map((rev) => {
                  const isPending = rev.status === 'pending';
                  const isApproved = rev.status === 'approved';
                  const isRejected = rev.status === 'rejected';

                  return (
                    <tr key={rev._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-[160px]">
                          <div className="w-9 h-11 rounded-sm bg-[#F2EFE9] border border-[#EAE5DA] overflow-hidden shrink-0 flex items-center justify-center">
                            {rev.product?.image ? (
                              <img
                                src={rev.product.image}
                                alt={rev.product.name}
                                className="w-full h-full object-cover object-top"
                                loading="lazy"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-[#C8B293]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-xs text-sphere-ink block truncate max-w-[140px]">
                              {rev.product?.name}
                            </span>
                            <span className="text-[10px] text-[#827E77] block">
                              {rev.product?.brand}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <span className="font-medium text-xs text-sphere-ink block">
                            {rev.customer?.name}
                          </span>
                          <span className="text-[11px] text-[#827E77] font-mono block">
                            {rev.customer?.email}
                          </span>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#1E8449] font-medium mt-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Order #{rev.orderNumber}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StarRating rating={rev.rating} size="sm" showScore={true} />
                      </td>

                      {/* Content */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h5 className="font-semibold text-xs text-sphere-ink">
                              {rev.title}
                            </h5>
                            {rev.isFeatured && (
                              <span className="px-1.5 py-0.2 bg-[#FEF9E7] text-[#B7950B] border border-[#F9E79F] rounded-xs text-[9px] font-bold uppercase">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#635E56] line-clamp-2 leading-relaxed">
                            {rev.comment}
                          </p>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-[11px] text-[#827E77] font-mono whitespace-nowrap">
                        {new Date(rev.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Status badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isApproved && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF7ED] text-[#1E8449] border border-[#D5F5E3]">
                            Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF9E7] text-[#B7950B] border border-[#F9E79F]">
                            Pending
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDEDEC] text-[#C0392B] border border-[#F5B7B1]">
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Moderation Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Approve / Reject buttons */}
                          {!isApproved && (
                            <button
                              onClick={() => handleStatusChange(rev._id, 'approved')}
                              className="px-2.5 py-1 text-[11px] font-medium bg-[#1E8449] text-white rounded-md hover:bg-[#145A32] transition-colors"
                              title="Approve review"
                            >
                              Approve
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              onClick={() => handleStatusChange(rev._id, 'rejected')}
                              className="px-2.5 py-1 text-[11px] font-medium bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                              title="Reject review"
                            >
                              Reject
                            </button>
                          )}

                          {/* Feature toggle */}
                          <button
                            onClick={() => handleToggleFeatured(rev._id, rev.isFeatured)}
                            className={`p-1.5 rounded-md border transition-colors ${
                              rev.isFeatured
                                ? 'bg-[#FEF9E7] border-[#F9E79F] text-[#B7950B]'
                                : 'bg-white border-[#EAE5DA] text-[#827E77] hover:text-sphere-ink'
                            }`}
                            title={rev.isFeatured ? 'Unfeature testimonial' : 'Feature as prime testimonial'}
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>

                          {/* Purge button */}
                          <button
                            onClick={() => handleDelete(rev._id)}
                            className="p-1.5 rounded-md border border-[#EAE5DA] text-[#827E77] hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  TicketPercent,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  useAdminCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon
} from '../../hooks/useAdmin';

export default function AdminCouponsPage() {
  const { data: coupons = [], isLoading, isError, refetch } = useAdminCoupons();
  const createCouponMutation = useCreateCoupon();
  const updateCouponMutation = useUpdateCoupon();
  const deleteCouponMutation = useDeleteCoupon();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [modalError, setModalError] = useState('');

  const [formState, setFormState] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 2000,
    maxDiscountAmount: 3000,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: 100,
    perUserLimit: 1,
    isActive: true
  });

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormState({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 15,
      minOrderAmount: 2000,
      maxDiscountAmount: 3000,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 100,
      perUserLimit: 1,
      isActive: true
    });
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormState({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || 10,
      minOrderAmount: coupon.minOrderAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      expiryDate: coupon.expiryDate
        ? new Date(coupon.expiryDate).toISOString().split('T')[0]
        : '',
      usageLimit: coupon.usageLimit || 100,
      perUserLimit: coupon.perUserLimit || 1,
      isActive: coupon.isActive !== undefined ? coupon.isActive : true
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formState.code.trim()) {
      setModalError('Privilege code is required.');
      return;
    }

    if (!formState.expiryDate) {
      setModalError('Expiry date is required.');
      return;
    }

    const payload = {
      code: formState.code.trim().toUpperCase(),
      description: formState.description.trim(),
      discountType: formState.discountType,
      discountValue: Number(formState.discountValue),
      minOrderAmount: Number(formState.minOrderAmount) || 0,
      maxDiscountAmount: formState.maxDiscountAmount ? Number(formState.maxDiscountAmount) : null,
      expiryDate: new Date(formState.expiryDate),
      usageLimit: Number(formState.usageLimit) || 100,
      perUserLimit: Number(formState.perUserLimit) || 1,
      isActive: formState.isActive
    };

    try {
      if (editingCoupon) {
        await updateCouponMutation.mutateAsync({ id: editingCoupon._id, data: payload });
      } else {
        await createCouponMutation.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Save coupon error:', err);
      setModalError(err.message || 'Failed to register promotional voucher.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;
    try {
      await deleteCouponMutation.mutateAsync(couponToDelete._id);
      setCouponToDelete(null);
    } catch (err) {
      console.error('Delete coupon error:', err);
      alert(err.message || 'Failed to remove promotional privilege.');
      setCouponToDelete(null);
    }
  };

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Privilege Coupons & Concessions
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Configure boutique percentage discounts, fixed reductions, minimum order constraints, and caps.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Privilege Voucher</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#827E77] uppercase font-semibold">Loading Concessions...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 px-4">
            <TicketPercent className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Active Privilege Codes</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-6">
              Create customer incentive discount vouchers to encourage acquisitions.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Privilege Code</th>
                  <th className="py-3 px-4 font-semibold">Benefit Rate</th>
                  <th className="py-3 px-4 font-semibold">Min Spend / Cap</th>
                  <th className="py-3 px-4 font-semibold">Usage Tally</th>
                  <th className="py-3 px-4 font-semibold">Valid Thru</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.expiryDate) < new Date();
                  return (
                    <tr key={coupon._id} className="hover:bg-[#FCFAF7] transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs tracking-wider px-2 py-0.5 rounded-xs bg-[#F2EFE9] border border-[#EAE5DA] text-sphere-ink">
                          {coupon.code}
                        </span>
                        {coupon.description && (
                          <p className="text-[11px] text-[#827E77] mt-0.5 max-w-xs truncate">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      {/* Benefit */}
                      <td className="py-3 px-4 font-semibold text-xs text-sphere-ink">
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}% Off`
                          : `${formatPrice(coupon.discountValue)} Fixed`}
                      </td>

                      {/* Min Spend / Cap */}
                      <td className="py-3 px-4 text-[#635E56]">
                        <div>Min: {formatPrice(coupon.minOrderAmount)}</div>
                        {coupon.maxDiscountAmount && (
                          <div className="text-[10px] text-[#827E77]">
                            Cap: {formatPrice(coupon.maxDiscountAmount)}
                          </div>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="font-bold text-sphere-ink">{coupon.usedCount || 0}</span>
                        <span className="text-[#827E77]"> / {coupon.usageLimit} max</span>
                      </td>

                      {/* Expiry */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={isExpired ? 'text-red-700 font-semibold' : 'text-[#635E56]'}>
                          {new Date(coupon.expiryDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        {isExpired && (
                          <span className="block text-[9px] uppercase tracking-wider text-red-600 font-bold">
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {coupon.isActive && !isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                            <XCircle className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="p-1.5 text-[#827E77] hover:text-sphere-ink transition-colors"
                            title="Edit Coupon"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCouponToDelete(coupon)}
                            className="p-1.5 text-[#BA4343] hover:text-red-700 transition-colors"
                            title="Delete Coupon"
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

      {/* Modal: Create / Edit Coupon */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-lg w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn space-y-4">
            <h3 className="font-editorial text-xl text-sphere-ink border-b border-[#EAE5DA] pb-2">
              {editingCoupon ? 'Configure Privilege Voucher' : 'Issue New Concession Voucher'}
            </h3>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Voucher Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ATELIER20"
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm font-mono uppercase focus:border-sphere-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Discount Structure *
                  </label>
                  <select
                    value={formState.discountType}
                    onChange={(e) => setFormState({ ...formState, discountType: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
                  >
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="fixed">Fixed Deduction (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formState.discountValue}
                    onChange={(e) => setFormState({ ...formState, discountValue: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Optional ceiling"
                    value={formState.maxDiscountAmount}
                    onChange={(e) => setFormState({ ...formState, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Min Order Spend (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.minOrderAmount}
                    onChange={(e) => setFormState({ ...formState, minOrderAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Expiry Cut-off Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.expiryDate}
                    onChange={(e) => setFormState({ ...formState, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Global Usage Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formState.usageLimit}
                    onChange={(e) => setFormState({ ...formState, usageLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                    Per-Client Usage Cap
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formState.perUserLimit}
                    onChange={(e) => setFormState({ ...formState, perUserLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Editorial Description / Incentive Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive invitation for autumn collection launch"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  className="rounded border-[#EAE5DA] text-sphere-ink focus:ring-sphere-sand"
                />
                <span className="font-medium text-sphere-ink">
                  Promotional Voucher Active for Client Checkout
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCouponMutation.isPending || updateCouponMutation.isPending}
                  className="px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
                >
                  {editingCoupon ? 'Update Privilege' : 'Issue Privilege'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3 text-sphere-status-error mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-editorial text-lg text-sphere-ink">Revoke Privilege Voucher</h3>
            </div>
            <p className="text-xs text-sphere-charcoal leading-relaxed mb-6">
              Are you sure you want to delete privilege code <span className="font-semibold text-sphere-ink">"{couponToDelete.code}"</span>? Customers will no longer be able to redeem it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
                className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteCouponMutation.isPending}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-sphere-status-error text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteCouponMutation.isPending ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

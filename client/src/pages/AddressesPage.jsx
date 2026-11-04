import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, ArrowLeft, X } from 'lucide-react';
import { useAddresses } from '../hooks/useAddresses';

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 digits').max(20),
  streetAddress: z.string().trim().min(3, 'Street address is required').max(200),
  apartment: z.string().trim().max(100).optional().default(''),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State / Province is required').max(100),
  postalCode: z.string().trim().min(3, 'Postal code is required').max(12),
  country: z.string().trim().min(2).max(60).default('India'),
  isDefault: z.boolean().optional().default(false)
});

export default function AddressesPage() {
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    isLoading
  } = useAddresses();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      streetAddress: '',
      apartment: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      isDefault: false
    }
  });

  const openAddForm = () => {
    setEditingAddressId(null);
    reset({
      fullName: '',
      phone: '',
      streetAddress: '',
      apartment: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      isDefault: addresses.length === 0
    });
    setIsFormOpen(true);
  };

  const openEditForm = (addr) => {
    setEditingAddressId(addr._id);
    reset({
      fullName: addr.fullName,
      phone: addr.phone,
      streetAddress: addr.streetAddress,
      apartment: addr.apartment || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || 'India',
      isDefault: addr.isDefault
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAddressId(null);
    reset();
  };

  const onSubmit = async (data) => {
    try {
      setFeedbackMessage({ type: '', text: '' });
      if (editingAddressId) {
        await updateAddress(editingAddressId, data);
        setFeedbackMessage({ type: 'success', text: 'Address updated successfully.' });
      } else {
        await addAddress(data);
        setFeedbackMessage({ type: 'success', text: 'New address added to your address book.' });
      }
      closeForm();
      setTimeout(() => setFeedbackMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Operation failed. Please try again.' });
    }
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm('Are you certain you wish to delete this address?')) return;
    try {
      await deleteAddress(addressId);
      setFeedbackMessage({ type: 'success', text: 'Address removed successfully.' });
      setTimeout(() => setFeedbackMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to remove address.' });
    }
  };

  const handleMakeDefault = async (addressId) => {
    try {
      await updateAddress(addressId, { isDefault: true });
      setFeedbackMessage({ type: 'success', text: 'Default shipping address updated.' });
      setTimeout(() => setFeedbackMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Could not set default address.' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Breadcrumbs & Back link */}
      <div className="mb-6">
        <Link
          to="/account/profile"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-sphere-muted hover:text-sphere-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Account</span>
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-sphere-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-sphere-muted font-semibold block mb-1">
            Atelier Dispatch & Logistics
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink">
            Saved Addresses
          </h1>
        </div>

        {!isFormOpen && (
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Address</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {feedbackMessage.text && (
        <div
          className={`mb-6 p-4 flex items-start gap-3 border-l-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-sphere-sage-light/30 border-sphere-sage text-sphere-charcoal'
              : 'bg-sphere-status-error/10 border-sphere-status-error text-sphere-status-error'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-sphere-sage shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-sphere-status-error shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-medium">{feedbackMessage.text}</div>
        </div>
      )}

      {/* Add / Edit Form Modal / Inline Drawer */}
      {isFormOpen && (
        <div className="mb-10 bg-white border border-sphere-border p-6 sm:p-8 shadow-luxury animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-sphere-border">
            <h2 className="font-editorial text-2xl text-sphere-ink font-normal">
              {editingAddressId ? 'Edit Address' : 'Add New Shipping Address'}
            </h2>
            <button
              onClick={closeForm}
              className="p-1.5 text-sphere-muted hover:text-sphere-ink transition-colors"
              aria-label="Close address form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  {...register('fullName')}
                  className={`block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border ${
                    errors.fullName ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink`}
                  placeholder="Julian Vance"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-sphere-status-error">{errors.fullName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className={`block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border ${
                    errors.phone ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink`}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-sphere-status-error">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                Street Address & House / Building Name *
              </label>
              <input
                type="text"
                {...register('streetAddress')}
                className={`block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border ${
                  errors.streetAddress ? 'border-sphere-status-error' : 'border-sphere-border'
                } focus:outline-none focus:border-sphere-ink`}
                placeholder="Flat 402, Royal Palms Residencies, 5th Main"
              />
              {errors.streetAddress && (
                <p className="mt-1 text-xs text-sphere-status-error">{errors.streetAddress.message}</p>
              )}
            </div>

            {/* Apartment / Suite */}
            <div>
              <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                Apartment, Suite, Unit, Landmark (optional)
              </label>
              <input
                type="text"
                {...register('apartment')}
                className="block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border border-sphere-border focus:outline-none focus:border-sphere-ink"
                placeholder="Near Marine Drive Walkway"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* City */}
              <div>
                <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  {...register('city')}
                  className={`block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border ${
                    errors.city ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink`}
                  placeholder="Mumbai"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-sphere-status-error">{errors.city.message}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                  State / Province *
                </label>
                <input
                  type="text"
                  {...register('state')}
                  className={`block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border ${
                    errors.state ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink`}
                  placeholder="Maharashtra"
                />
                {errors.state && (
                  <p className="mt-1 text-xs text-sphere-status-error">{errors.state.message}</p>
                )}
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                  PIN / Postal Code *
                </label>
                <input
                  type="text"
                  {...register('postalCode')}
                  className={`block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border ${
                    errors.postalCode ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink`}
                  placeholder="400021"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-xs text-sphere-status-error">{errors.postalCode.message}</p>
                )}
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                Country
              </label>
              <input
                type="text"
                {...register('country')}
                className="block w-full px-3.5 py-2.5 text-sm bg-sphere-ivory border border-sphere-border focus:outline-none focus:border-sphere-ink"
                placeholder="India"
              />
            </div>

            {/* Set as Default Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isDefault')}
                  className="h-4 w-4 rounded-none border-sphere-border text-sphere-ink focus:ring-0"
                />
                <span className="text-xs text-sphere-charcoal font-medium">
                  Set as my primary default delivery address
                </span>
              </label>
            </div>

            {/* Buttons */}
            <div className="pt-4 border-t border-sphere-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 border border-sphere-border text-xs uppercase tracking-wider text-sphere-charcoal hover:bg-sphere-ivory transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Address...' : editingAddressId ? 'Save Address' : 'Add Address'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address Cards List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs uppercase tracking-widest text-sphere-muted">
          Loading Saved Addresses...
        </div>
      ) : addresses.length === 0 && !isFormOpen ? (
        <div className="bg-white border border-sphere-border p-12 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-sphere-sand-light text-sphere-sand flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="font-editorial text-2xl text-sphere-ink font-normal">
            No Addresses on Record
          </h2>
          <p className="mt-2 text-xs text-sphere-muted max-w-sm mx-auto">
            Add your primary shipping residence to expedite your atelier garment dispatches.
          </p>
          <button
            onClick={openAddForm}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Address Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={`bg-white border p-6 flex flex-col justify-between transition-all ${
                addr.isDefault
                  ? 'border-sphere-ink shadow-luxury'
                  : 'border-sphere-border hover:border-sphere-sand'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-editorial text-lg text-sphere-ink">
                    {addr.fullName}
                  </span>
                  {addr.isDefault && (
                    <span className="px-2 py-0.5 bg-sphere-sand-light text-sphere-ink text-[10px] uppercase tracking-wider font-semibold border border-sphere-sand/40">
                      Default Delivery
                    </span>
                  )}
                </div>

                <div className="text-xs text-sphere-charcoal space-y-1 leading-relaxed">
                  <p>{addr.streetAddress}</p>
                  {addr.apartment && <p>{addr.apartment}</p>}
                  <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                  <p className="uppercase text-sphere-muted font-medium">{addr.country}</p>
                  <p className="pt-2 text-sphere-muted">Phone: <span className="text-sphere-ink">{addr.phone}</span></p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-6 pt-4 border-t border-sphere-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditForm(addr)}
                    className="inline-flex items-center gap-1 text-sphere-charcoal hover:text-sphere-ink transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <span className="text-sphere-border">|</span>
                  <button
                    onClick={() => handleDelete(addr._id)}
                    className="inline-flex items-center gap-1 text-sphere-muted hover:text-sphere-status-error transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                {!addr.isDefault && (
                  <button
                    onClick={() => handleMakeDefault(addr._id)}
                    className="text-[11px] uppercase tracking-wider text-sphere-sand hover:text-sphere-ink transition-colors font-medium"
                  >
                    Make Default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

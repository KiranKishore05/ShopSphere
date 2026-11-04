import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Shield, MapPin, Heart, ShoppingBag, Package, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as userService from '../services/userService';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name cannot exceed 80 characters'),
  phone: z.string().trim().optional()
});

export default function ProfilePage() {
  const { user, logout, refetchUser } = useAuth();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || '',
      phone: user?.phone || ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setIsUpdating(true);
      setSuccessMessage('');
      setErrorMessage('');
      await userService.updateProfile(data);
      await refetchUser();
      setSuccessMessage('Profile details updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile details.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Active Patron';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Page Header */}
      <div className="border-b border-sphere-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-sphere-muted font-semibold block mb-1">
            Atelier Patron Dashboard
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink">
            My Account
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-luxury text-sphere-muted hover:text-sphere-status-error hover:bg-sphere-status-error/5 border border-sphere-border rounded-sm transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile Card & Quick Nav */}
        <div className="lg:col-span-4 space-y-6">
          {/* Patron Identification Card */}
          <div className="bg-white border border-sphere-border p-6 shadow-luxury text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-sphere-sand-light text-sphere-ink flex items-center justify-center font-editorial text-2xl font-medium tracking-wider mb-4 border border-sphere-sand">
              {initials}
            </div>
            <h2 className="font-editorial text-xl text-sphere-ink font-normal">{user.name}</h2>
            <p className="text-xs text-sphere-muted mt-0.5">{user.email}</p>

            <div className="mt-4 pt-4 border-t border-sphere-border/60 flex items-center justify-center gap-4 text-[11px] text-sphere-charcoal">
              <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-sphere-sage" />
                <span className="font-semibold capitalize">{user.role}</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 text-sphere-muted">
                <Calendar className="w-3.5 h-3.5" />
                <span>Since {memberSince}</span>
              </span>
            </div>
          </div>

          {/* Account Navigation Links */}
          <div className="bg-white border border-sphere-border divide-y divide-sphere-border shadow-sm">
            <Link
              to="/account/addresses"
              className="flex items-center justify-between p-4 text-xs tracking-wider uppercase font-medium text-sphere-charcoal hover:bg-sphere-ivory hover:text-sphere-ink transition-colors group"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-sphere-sand" />
                <span>Address Book</span>
              </div>
              <span className="text-[11px] text-sphere-muted group-hover:text-sphere-ink">
                {user.savedAddresses?.length || 0} Saved →
              </span>
            </Link>

            <Link
              to="/account/orders"
              className="flex items-center justify-between p-4 text-xs tracking-wider uppercase font-medium text-sphere-charcoal hover:bg-sphere-ivory hover:text-sphere-ink transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-sphere-sand" />
                <span>Order Archives</span>
              </div>
              <span className="text-[11px] text-sphere-muted group-hover:text-sphere-ink">
                View →
              </span>
            </Link>

            <Link
              to="/wishlist"
              className="flex items-center justify-between p-4 text-xs tracking-wider uppercase font-medium text-sphere-charcoal hover:bg-sphere-ivory hover:text-sphere-ink transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-sphere-sand" />
                <span>Wishlist</span>
              </div>
              <span className="text-[11px] text-sphere-muted group-hover:text-sphere-ink">
                {user.wishlist?.length || 0} Saved →
              </span>
            </Link>

            <Link
              to="/cart"
              className="flex items-center justify-between p-4 text-xs tracking-wider uppercase font-medium text-sphere-charcoal hover:bg-sphere-ivory hover:text-sphere-ink transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-sphere-sand" />
                <span>Shopping Bag</span>
              </div>
              <span className="text-[11px] text-sphere-muted group-hover:text-sphere-ink">
                View Bag →
              </span>
            </Link>
          </div>
        </div>

        {/* Right Column: Personal Information Form */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-sphere-border p-6 sm:p-8 shadow-luxury">
            <div className="border-b border-sphere-border pb-4 mb-6">
              <h3 className="font-editorial text-2xl text-sphere-ink font-normal">
                Personal Information
              </h3>
              <p className="text-xs text-sphere-muted mt-1">
                Manage your legal name and contact details for bespoke orders and delivery notifications.
              </p>
            </div>

            {successMessage && (
              <div className="mb-6 p-4 bg-sphere-sage-light/30 border-l-2 border-sphere-sage flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-sphere-sage shrink-0 mt-0.5" />
                <div className="text-xs text-sphere-charcoal font-medium">
                  {successMessage}
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 p-4 bg-sphere-status-error/10 border-l-2 border-sphere-status-error flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-sphere-status-error shrink-0 mt-0.5" />
                <div className="text-xs text-sphere-status-error font-medium">
                  {errorMessage}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className={`block w-full pl-10 pr-3.5 py-3 text-sm bg-sphere-ivory border ${
                      errors.name ? 'border-sphere-status-error' : 'border-sphere-border'
                    } focus:outline-none focus:border-sphere-ink transition-colors`}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-sphere-status-error">{errors.name.message}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="email" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink">
                    Email Address
                  </label>
                  <span className="text-[10px] uppercase tracking-wider text-sphere-muted font-medium">
                    Verified Account Email
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="block w-full pl-10 pr-3.5 py-3 text-sm bg-sphere-sand-light/50 border border-sphere-border text-sphere-muted cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    className="block w-full pl-10 pr-3.5 py-3 text-sm bg-sphere-ivory border border-sphere-border focus:outline-none focus:border-sphere-ink transition-colors"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-sphere-border flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

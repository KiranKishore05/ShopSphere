import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Phone, AlertCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import SEO from '../components/common/SEO';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_\-.~+=])/;

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name cannot exceed 80 characters'),
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  phone: z.string().trim().optional().default(''),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#^_-.~+=)'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Terms of Service & Privacy Policy'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register: registerUser, isRegistering } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false
    }
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone
      });
      navigate('/account/profile', { replace: true });
    } catch (err) {
      const detailedMessage = Array.isArray(err.details) && err.details.length > 0
        ? err.details.map(d => d.issue || d.message).join('. ')
        : (err.message || 'Registration failed. Please check your information and try again.');
      setServerError(detailedMessage);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FAF8F5] animate-fadeIn">
      <SEO title="Create Account — ShopSphere" description="Join ShopSphere for private sales, curated fashion, and express checkout." />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#161513] text-white flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-[#161513]">ShopSphere</span>
        </Link>
        <span className="text-[10px] tracking-[0.25em] uppercase text-[#827E77] font-bold block mb-1">
          New Customer
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#161513] font-bold tracking-tight">
          Create Account
        </h1>
        <p className="mt-2 text-xs text-[#827E77]">
          Join ShopSphere for curated collections, offers, and fast checkout.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border border-[#EAE5DA] rounded-2xl shadow-xs p-7 sm:p-9">
          {serverError && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 font-medium leading-relaxed">
                {serverError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#827E77]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  {...register('name')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-[#FDFBF7] border rounded-lg ${
                    errors.name ? 'border-rose-300' : 'border-[#EAE5DA]'
                  } focus:outline-hidden focus:border-[#161513] transition-colors`}
                  placeholder="Julian Vance"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#827E77]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-[#FDFBF7] border rounded-lg ${
                    errors.email ? 'border-rose-300' : 'border-[#EAE5DA]'
                  } focus:outline-hidden focus:border-[#161513] transition-colors`}
                  placeholder="julian@domain.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                Phone Number <span className="text-[10px] text-[#827E77] normal-case font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#827E77]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  {...register('phone')}
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-[#FDFBF7] border border-[#EAE5DA] rounded-lg focus:outline-hidden focus:border-[#161513] transition-colors"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#827E77]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-[#FDFBF7] border rounded-lg ${
                    errors.password ? 'border-rose-300' : 'border-[#EAE5DA]'
                  } focus:outline-hidden focus:border-[#161513] transition-colors`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#827E77] hover:text-[#161513]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password ? (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
              ) : (
                <p className="mt-1 text-[11px] text-[#827E77]">8+ characters with uppercase, lowercase, number, and symbol.</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#827E77]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-[#FDFBF7] border rounded-lg ${
                    errors.confirmPassword ? 'border-rose-300' : 'border-[#EAE5DA]'
                  } focus:outline-hidden focus:border-[#161513] transition-colors`}
                  placeholder="Re-enter your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('agreeTerms')}
                  className="mt-0.5 h-4 w-4 rounded border-[#EAE5DA] text-[#161513] focus:ring-[#161513]"
                />
                <span className="text-xs text-[#5A554E] leading-relaxed">
                  I agree to the <Link to="/terms" className="text-[#161513] font-semibold underline">Terms of Service</Link> & <Link to="/privacy" className="text-[#161513] font-semibold underline">Privacy Policy</Link>
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.agreeTerms.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full mt-2 py-3.5 px-4 bg-[#161513] text-[#FDFBF7] text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#34302C] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group shadow-xs"
            >
              {isRegistering ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-5 border-t border-[#F2ECE4] text-center">
            <p className="text-xs text-[#827E77]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#161513] font-bold hover:underline underline-offset-2"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

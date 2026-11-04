import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Phone, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name cannot exceed 80 characters'),
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  phone: z.string().trim().optional().default(''),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
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
      setServerError(err.message || 'Registration failed. Please check your information and try again.');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-sphere-ivory animate-fadeIn">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-[10px] tracking-[0.3em] uppercase text-sphere-muted font-semibold block mb-2">
          New Atelier Patron
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl text-sphere-ink font-normal tracking-tight">
          Create Account
        </h1>
        <p className="mt-3 text-xs tracking-wider text-sphere-charcoal">
          Join ShopSphere for bespoke recommendations, private sales, and seamless checkout.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border border-sphere-border shadow-luxury p-8 sm:p-10">
          {serverError && (
            <div className="mb-6 p-4 bg-sphere-status-error/10 border-l-2 border-sphere-status-error flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-sphere-status-error shrink-0 mt-0.5" />
              <div className="text-xs text-sphere-status-error font-medium leading-relaxed">
                {serverError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Full Name */}
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
                  autoComplete="name"
                  {...register('name')}
                  className={`block w-full pl-10 pr-3.5 py-3 text-sm bg-sphere-ivory border ${
                    errors.name ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink transition-colors`}
                  placeholder="Julian Vance"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-sphere-status-error">{errors.name.message}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3.5 py-3 text-sm bg-sphere-ivory border ${
                    errors.email ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink transition-colors`}
                  placeholder="julian@domain.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-sphere-status-error">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                Phone Number <span className="text-[10px] text-sphere-muted normal-case font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  {...register('phone')}
                  className="block w-full pl-10 pr-3.5 py-3 text-sm bg-sphere-ivory border border-sphere-border focus:outline-none focus:border-sphere-ink transition-colors"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-3 text-sm bg-sphere-ivory border ${
                    errors.password ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink transition-colors`}
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sphere-muted hover:text-sphere-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-sphere-status-error">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`block w-full pl-10 pr-3.5 py-3 text-sm bg-sphere-ivory border ${
                    errors.confirmPassword ? 'border-sphere-status-error' : 'border-sphere-border'
                  } focus:outline-none focus:border-sphere-ink transition-colors`}
                  placeholder="Repeat your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-sphere-status-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms of Service Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('agreeTerms')}
                  className="mt-1 h-4 w-4 rounded-none border-sphere-border text-sphere-ink focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-xs text-sphere-charcoal leading-relaxed">
                  I agree to ShopSphere’s{' '}
                  <span className="underline hover:text-sphere-ink">Terms of Service</span> and{' '}
                  <span className="underline hover:text-sphere-ink">Privacy Policy</span>.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="mt-1 text-xs text-sphere-status-error">{errors.agreeTerms.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3.5 px-4 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-2"
            >
              {isRegistering ? (
                <span>Creating Atelier Profile...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-sphere-border text-center">
            <p className="text-xs text-sphere-muted tracking-wider">
              Already have an atelier account?{' '}
              <Link to="/login" className="font-semibold text-sphere-ink hover:underline ml-1">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

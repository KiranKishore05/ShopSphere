import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { resetPassword } from '../services/authService';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_\-.~+=])/;

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#^_-.~+=)'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export default function ResetPasswordPage() {
  // Extract token securely from URL fragment (#token=) exclusively
  const [token] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashStr = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hashStr);
      return hashParams.get('token') || '';
    }
    return '';
  });

  // Immediately strip the sensitive token fragment from the browser address bar and history
  // to prevent leakage via shoulder surfing, browser history, or Referer headers.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (data) => {
    if (!token) {
      setServerError('Password reset link is missing a valid token. Please request a new link.');
      return;
    }

    try {
      setServerError('');
      setIsSubmitting(true);
      await resetPassword({
        token,
        password: data.password
      });
      setIsSuccess(true);
    } catch (err) {
      setServerError(err.message || 'Password reset link is invalid or has expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-sphere-ivory animate-fadeIn">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-[10px] tracking-[0.3em] uppercase text-sphere-muted font-semibold block mb-2">
          Security Concierge
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl text-sphere-ink font-normal tracking-tight">
          Reset Password
        </h1>
        <p className="mt-3 text-xs tracking-wider text-sphere-charcoal">
          Create a new secure password for your ShopSphere account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border border-sphere-border shadow-luxury p-8 sm:p-10">
          {isSuccess ? (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-sphere-sand-light mx-auto flex items-center justify-center text-sphere-ink">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-editorial text-xl text-sphere-ink font-normal">
                  Password Updated
                </h3>
                <p className="text-xs text-sphere-muted leading-relaxed">
                  Your password has been reset successfully. You may now sign in using your new credentials.
                </p>
              </div>
              <div className="pt-4 border-t border-sphere-border">
                <Link
                  to="/login"
                  className="w-full py-3.5 px-4 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {!token ? (
                <div className="space-y-6 text-center">
                  <div className="p-4 bg-sphere-status-error/10 border-l-2 border-sphere-status-error flex items-start gap-3 text-left">
                    <AlertCircle className="w-5 h-5 text-sphere-status-error shrink-0 mt-0.5" />
                    <div className="text-xs text-sphere-status-error font-medium leading-relaxed">
                      Invalid or missing reset link. Please verify the URL from your email or request a new password reset.
                    </div>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-sphere-ink hover:text-sphere-muted transition-colors"
                  >
                    <span>Request New Reset Link</span>
                  </Link>
                </div>
              ) : (
                <>
                  {serverError && (
                    <div className="mb-6 p-4 bg-sphere-status-error/10 border-l-2 border-sphere-status-error flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-sphere-status-error shrink-0 mt-0.5" />
                      <div className="text-xs text-sphere-status-error font-medium leading-relaxed">
                        {serverError}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                    {/* New Password */}
                    <div>
                      <label htmlFor="password" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                        New Password
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
                          placeholder="••••••••"
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
                        <p className="mt-1.5 text-xs text-sphere-status-error">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink mb-1.5">
                        Confirm New Password
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
                          placeholder="••••••••"
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1.5 text-xs text-sphere-status-error">{errors.confirmPassword.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                      {isSubmitting ? (
                        <span>Updating Password...</span>
                      ) : (
                        <>
                          <span>Update Password</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-8 pt-6 border-t border-sphere-border text-center">
                    <Link
                      to="/login"
                      className="text-xs uppercase tracking-widest font-semibold text-sphere-ink hover:text-sphere-muted transition-colors"
                    >
                      Back to Sign In
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


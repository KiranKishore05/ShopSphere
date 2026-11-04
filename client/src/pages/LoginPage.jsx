import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/account/profile';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Unable to sign in. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-sphere-ivory animate-fadeIn">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-[10px] tracking-[0.3em] uppercase text-sphere-muted font-semibold block mb-2">
          Customer Authentication
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl text-sphere-ink font-normal tracking-tight">
          Sign In to Atelier
        </h1>
        <p className="mt-3 text-xs tracking-wider text-sphere-charcoal">
          Access your curated wardrobe, saved addresses, and active orders.
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Email Field */}
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
                  placeholder="name@domain.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-sphere-status-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs uppercase tracking-widest font-medium text-sphere-ink">
                  Password
                </label>
                <span className="text-[11px] text-sphere-muted hover:text-sphere-ink transition-colors cursor-pointer">
                  Forgot?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sphere-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoggingIn ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Registration Prompt */}
          <div className="mt-8 pt-6 border-t border-sphere-border text-center">
            <p className="text-xs text-sphere-muted tracking-wider">
              Do not possess an atelier account yet?{' '}
              <Link to="/register" className="font-semibold text-sphere-ink hover:underline ml-1">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

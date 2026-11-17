import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import SEO from '../components/common/SEO';

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
      const loggedInUser = await login(data);
      const redirectTarget = location.state?.from?.pathname || (loggedInUser?.role === 'admin' ? '/admin' : '/account/profile');
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid email or password credentials.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FAF8F5] animate-fadeIn">
      <SEO title="Sign In — ShopSphere" description="Access your ShopSphere client account." />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#161513] text-white flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-[#161513]">ShopSphere</span>
        </Link>
        <span className="text-[10px] tracking-[0.25em] uppercase text-[#827E77] font-bold block mb-1">
          Welcome Back
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#161513] font-bold tracking-tight">
          Sign In to Atelier
        </h1>
        <p className="mt-2 text-xs text-[#827E77]">
          Access your wardrobe, saved delivery addresses, and orders.
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email Field */}
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
                  placeholder="name@domain.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs uppercase tracking-wider font-semibold text-[#161513]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#827E77] hover:text-[#161513] font-medium transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#827E77]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-[#FDFBF7] border rounded-lg ${
                    errors.password ? 'border-rose-300' : 'border-[#EAE5DA]'
                  } focus:outline-hidden focus:border-[#161513] transition-colors`}
                  placeholder="••••••••"
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
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 bg-[#161513] text-[#FDFBF7] text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#34302C] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group shadow-xs"
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

          {/* Register Link */}
          <div className="mt-6 pt-5 border-t border-[#F2ECE4] text-center">
            <p className="text-xs text-[#827E77]">
              New to ShopSphere?{' '}
              <Link
                to="/register"
                className="text-[#161513] font-bold hover:underline underline-offset-2"
              >
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

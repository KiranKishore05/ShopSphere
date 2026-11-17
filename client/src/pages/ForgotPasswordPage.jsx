import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../services/authService';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address')
});

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      setIsSubmitting(true);
      await forgotPassword(data.email);
      setIsSuccess(true);
    } catch (err) {
      setServerError(err.message || 'Unable to process request. Please try again.');
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
          Forgot Password
        </h1>
        <p className="mt-3 text-xs tracking-wider text-sphere-charcoal">
          Enter your registered email address to receive password reset instructions.
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
                  Instructions Sent
                </h3>
                <p className="text-xs text-sphere-muted leading-relaxed">
                  If an account exists with that email address, password reset instructions have been sent. Please check your inbox and follow the secure link.
                </p>
              </div>
              <div className="pt-4 border-t border-sphere-border">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-sphere-ink hover:text-sphere-muted transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
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
                      placeholder="client@atelier.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-sphere-status-error">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <span>Sending Instructions...</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-sphere-border text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-sphere-ink hover:text-sphere-muted transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


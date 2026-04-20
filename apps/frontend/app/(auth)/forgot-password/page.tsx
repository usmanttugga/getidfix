'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GetIdfixLogo } from '../../../components/brand/GetIdfixLogo';
import api from '../../../lib/api';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await api.post('/auth/forgot-password', data);
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D2137] via-[#0f2d4a] to-[#091929] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#C9A84C]/10" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#C9A84C]/5" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <GetIdfixLogo />
          </div>

          <h1 className="text-xl font-semibold text-white text-center mb-2">Reset your password</h1>
          <p className="text-sm text-slate-400 text-center mb-6">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {success ? (
            <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm text-center">
              If an account with that email exists, a password reset link has been sent. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]/50"
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#C9A84C] text-[#0D2137] rounded-lg text-sm font-semibold hover:bg-[#d4b55e] transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div className="text-center">
                <a href="/login" className="text-sm text-[#C9A84C] hover:underline">Back to Sign In</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

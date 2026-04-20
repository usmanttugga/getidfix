'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { GetIdfixLogo } from '../../../components/brand/GetIdfixLogo';
import api from '../../../lib/api';

const schema = z.object({
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token');
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    if (!token) { setError('Invalid reset link. Please request a new one.'); return; }
    try {
      await api.post('/auth/reset-password', { token, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to reset password. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
        Invalid reset link. Please <a href="/forgot-password" className="underline text-[#C9A84C]">request a new one</a>.
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-white text-center mb-2">Set new password</h1>
      <p className="text-sm text-slate-400 text-center mb-6">Enter your new password below.</p>

      {success ? (
        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm text-center">
          Password reset successfully! Redirecting to login...
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
            <div className="relative">
              <input
                {...register('newPassword')}
                type={showNewPwd ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
              />
              <button type="button" onClick={() => setShowNewPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-xs text-red-400">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPwd ? 'text' : 'password'}
                placeholder="Repeat password"
                className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
              />
              <button type="button" onClick={() => setShowConfirmPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#C9A84C] text-[#0D2137] rounded-lg text-sm font-semibold hover:bg-[#d4b55e] transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<div className="text-center text-slate-400">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

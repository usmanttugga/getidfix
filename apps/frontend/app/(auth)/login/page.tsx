'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { GetIdfixLogo } from '../../../components/brand/GetIdfixLogo';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  firstName:       z.string().min(1, 'First name is required'),
  lastName:        z.string().min(1, 'Last name is required'),
  email:           z.string().email('Invalid email address'),
  phone:           z.string()
    .min(11, 'Phone number must be 11 digits')
    .max(11, 'Phone number must be 11 digits')
    .regex(/^(070|080|081|090|091)\d{8}$/, 'Enter a valid Nigerian phone number (e.g. 08012345678)'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginForm    = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [tab, setTab]       = useState<'login' | 'register'>('login');
  const [error, setError]   = useState('');
  const [showLoginPwd, setShowLoginPwd]     = useState(false);
  const [showRegPwd, setShowRegPwd]         = useState(false);
  const [showRegConfirmPwd, setShowRegConfirmPwd] = useState(false);
  const { login, register } = useAuth();
  const router              = useRouter();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const regForm   = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const handleLogin = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.email, data.password);
      const user = JSON.parse(localStorage.getItem('getidfix_user') || '{}');
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Login failed. Please try again.');
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setError('');
    try {
      await register({ firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, password: data.password });
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D2137] via-[#0f2d4a] to-[#091929] px-4">
      {/* Geometric background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#C9A84C]/10 opacity-40" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#C9A84C]/5 opacity-30" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-white/5 opacity-50" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <GetIdfixLogo />
          </div>

          <p className="text-center text-slate-400 text-sm mb-6">
            Nigeria&apos;s trusted identity verification platform
          </p>

          {/* Tabs */}
          <div className="flex rounded-lg bg-white/10 p-1 mb-6">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'login' ? 'bg-white/20 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'register' ? 'bg-white/20 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Create Account
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  {...loginForm.register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]/50"
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-400">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    {...loginForm.register('password')}
                    type={showLoginPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]/50"
                  />
                  <button type="button" onClick={() => setShowLoginPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-400">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs text-[#C9A84C] hover:underline">Forgot password?</a>
              </div>
              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full py-2.5 bg-[#C9A84C] text-[#0D2137] rounded-lg text-sm font-semibold hover:bg-[#d4b55e] transition-colors disabled:opacity-60"
              >
                {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={regForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                  <input
                    {...regForm.register('firstName')}
                    type="text"
                    placeholder="John"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                  />
                  {regForm.formState.errors.firstName && (
                    <p className="mt-1 text-xs text-red-400">{regForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    {...regForm.register('lastName')}
                    type="text"
                    placeholder="Doe"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                  />
                  {regForm.formState.errors.lastName && (
                    <p className="mt-1 text-xs text-red-400">{regForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  {...regForm.register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                />
                {regForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-400">{regForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number <span className="text-[#C9A84C]">*</span></label>
                <input
                  {...regForm.register('phone')}
                  type="tel"
                  placeholder="08012345678"
                  maxLength={11}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    regForm.setValue('phone', digits, { shouldValidate: true });
                  }}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                />
                <p className="mt-1 text-xs text-slate-500">11-digit Nigerian number (070, 080, 081, 090, 091)</p>
                {regForm.formState.errors.phone && (
                  <p className="mt-1 text-xs text-red-400">{regForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    {...regForm.register('password')}
                    type={showRegPwd ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                  />
                  <button type="button" onClick={() => setShowRegPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {regForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-400">{regForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    {...regForm.register('confirmPassword')}
                    type={showRegConfirmPwd ? 'text' : 'password'}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                  />
                  <button type="button" onClick={() => setShowRegConfirmPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showRegConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {regForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">{regForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={regForm.formState.isSubmitting}
                className="w-full py-2.5 bg-[#C9A84C] text-[#0D2137] rounded-lg text-sm font-semibold hover:bg-[#d4b55e] transition-colors disabled:opacity-60"
              >
                {regForm.formState.isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

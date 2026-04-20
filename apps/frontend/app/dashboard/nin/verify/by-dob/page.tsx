'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, User, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { SlipTypeModal, type SlipType } from '../../../../../components/SlipTypeModal';

export default function VerifyByBioDataPage() {
  const [slipType, setSlipType] = useState<SlipType | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', gender: '', dob: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState<Record<string, unknown> | null>(null);

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const balance = walletData?.balance ? Number(walletData.balance) : 0;
  const service = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === `nin-verification-${slipType || 'basic'}` && s.isEnabled);
  const price   = service ? Number(service.price) : (servicesData?.services?.find((s: { slug: string }) => s.slug === 'nin-verification-basic') ? Number(servicesData.services.find((s: { slug: string }) => s.slug === 'nin-verification-basic').price) : 0);
  const serviceDisabled = servicesData !== undefined && slipType && !service;
  const queryClient = useQueryClient();

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    if (!form.lastName.trim())  { setError('Last name is required.'); return; }
    if (!form.gender)           { setError('Gender is required.'); return; }
    if (!form.dob)              { setError('Date of birth is required.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/nin/verify', { method: 'dob', ...form, slipType });
      setResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', 'nin-verification'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Verification failed. Please try again.');
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setForm({ firstName: '', lastName: '', gender: '', dob: '' }); setError(''); setSlipType(null); };

  if (serviceDisabled) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-slate-500 mb-4">NIN Verification is currently disabled. Please check back later.</p>
          <Link href="/dashboard" className="inline-block px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (result) {
    const r = (result.result as Record<string, string>) || result;
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-slate-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-green-500" />
            <h1 className="text-xl font-semibold text-slate-900">Verification Successful</h1>
          </div>
          <div className="flex items-center gap-4 mb-5 p-4 bg-slate-50 rounded-xl">
            <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
              <User size={24} className="text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{String(r.fullName || `${form.firstName} ${form.lastName}`)}</p>
              <p className="text-sm text-slate-500">Bio Data Verification</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Date of Birth</p>
              <p className="font-medium text-slate-800 text-sm">{String(r.dob || form.dob)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Gender</p>
              <p className="font-medium text-slate-800 text-sm">{String(r.gender || form.gender)}</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 space-y-1">
            <p className="text-xs text-slate-400">Reference: <span className="font-mono">{String(result.reference || '')}</span></p>
            <p className="text-xs text-slate-400">Amount charged: ₦{Number(result.amount || 0).toLocaleString()}</p>
          </div>
          <button onClick={reset} className="mt-4 w-full py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">
            Verify Another
          </button>
        </div>
      </div>
    );
  }

  /* ── Slip selection modal — shown only when service is enabled and slip not yet picked ── */
  if (!slipType && servicesData !== undefined && !serviceDisabled) {
    return (
      <SlipTypeModal
        onSelect={(s) => setSlipType(s)}
        onClose={() => window.history.back()}
      />
    );
  }

  if (!slipType) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  /* ── Form view ── */
  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Calendar size={18} className="text-orange-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Verify by Bio Data</h1>
        </div>
        <p className="text-sm text-slate-500 mb-1 ml-10">Verify identity using personal bio data.</p>
        <p className="text-xs text-slate-400 mb-5 ml-10">
          Slip type: <span className="font-medium text-[#C9A84C] capitalize">{slipType} Slip</span>
          <button onClick={() => setSlipType(null)} className="ml-2 text-slate-400 hover:text-slate-600 underline text-xs">Change</button>
        </p>

        <div className="py-3 border-b border-slate-200 mb-5">
          <p className="text-xs text-slate-500">Service Fee</p>
          <p className="text-lg font-bold text-slate-900">₦{price.toLocaleString()}</p>
        </div>

        {balance < price && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Insufficient balance</p>
              <a href="/dashboard/wallet" className="text-xs text-red-700 underline">Fund wallet →</a>
            </div>
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-[#0D2137]/50 uppercase tracking-wider">Verification Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="e.g. John"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="e.g. Doe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender <span className="text-red-500">*</span></label>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
              <input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          </div>
          <button type="submit" disabled={loading || balance < price || !form.firstName || !form.lastName || !form.gender || !form.dob}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Verifying...' : `Verify — ₦${price.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

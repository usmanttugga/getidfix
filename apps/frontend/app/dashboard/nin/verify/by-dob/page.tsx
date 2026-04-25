'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, User, AlertCircle, Calendar, Download } from 'lucide-react';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { SlipTypeModal, type SlipType } from '../../../../../components/SlipTypeModal';
import { BouncingLoader } from '../../../../../components/ui/BouncingLoader';

export default function VerifyByBioDataPage() {
  const [slipType, setSlipType] = useState<SlipType | null>(null);
  const [form, setForm] = useState({ nin: '', firstName: '', lastName: '', gender: '', dob: '' });
  const [loading, setLoading]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState<Record<string, unknown> | null>(null);

  const { data: walletData } = useQuery({ queryKey: ['wallet'], queryFn: () => api.get('/wallet').then((r) => r.data.data) });
  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => api.get('/services').then((r) => r.data.data) });

  const balance        = walletData?.balance ? Number(walletData.balance) : 0;
  const service        = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === `nin-verification-${slipType || 'basic'}` && s.isEnabled);
  const price          = service ? Number(service.price) : 0;
  const serviceDisabled = servicesData !== undefined && slipType && !service;
  const queryClient    = useQueryClient();

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{11}$/.test(form.nin))    { setError('NIN must be exactly 11 numeric digits.'); return; }
    if (!form.firstName.trim())         { setError('First name is required.'); return; }
    if (!form.lastName.trim())          { setError('Last name is required.'); return; }
    if (!form.dob)                      { setError('Date of birth is required.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/nin/verify', { method: 'dob', nin: form.nin, firstName: form.firstName, lastName: form.lastName, gender: form.gender, dob: form.dob, slipType });
      setResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', 'nin-verification'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Verification failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleDownload = async () => {
    if (!result) return;
    const r = (result.result as Record<string, string>) || result;
    const ninValue = String(r.nin || form.nin);
    setDownloading(true);
    try {
      const response = await api.post('/nin/slip/download', { nin: ninValue, slipType }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nin_${slipType}_slip_${ninValue}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      alert(msg || 'Failed to download slip. Please try again.');
    } finally { setDownloading(false); }
  };

  const reset = () => { setResult(null); setForm({ nin: '', firstName: '', lastName: '', gender: '', dob: '' }); setError(''); setSlipType(null); };

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
      <div className="max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle size={20} className="text-green-500" />
          <h1 className="text-xl font-semibold text-slate-900">Verification Successful</h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
          <div className="bg-[#0D2137] px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg">GetIDFix</p>
              <p className="text-white/60 text-xs capitalize">{slipType} NIN Verification Slip</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Reference</p>
              <p className="text-white font-mono text-xs">{String(result.reference || '').slice(0, 13)}...</p>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                {r.photo ? <img src={`data:image/jpeg;base64,${r.photo}`} alt="ID Photo" className="w-full h-full object-cover" /> : <User size={32} className="text-slate-400" />}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{String(r.fullName || '—')}</p>
                <p className="text-sm text-slate-500 font-mono">NIN: {String(r.nin || form.nin)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Date of Birth</p><p className="font-medium text-slate-800 text-sm">{String(r.dob || '—')}</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Gender</p><p className="font-medium text-slate-800 text-sm">{String(r.gender || '—')}</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Phone</p><p className="font-medium text-slate-800 text-sm">{String(r.phone || '—')}</p></div>
              {r.middleName && <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Middle Name</p><p className="font-medium text-slate-800 text-sm">{String(r.middleName)}</p></div>}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-mono">{String(result.reference || '')}</p>
              <p className="text-xs text-slate-400">₦{Number(result.amount || 0).toLocaleString()} charged</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.history.back()} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">← Back</button>
          <button onClick={handleDownload} disabled={downloading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#C9A84C] text-white rounded-lg text-sm font-medium hover:bg-[#b8963e] disabled:opacity-60">
            {downloading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Downloading...</> : <><Download size={16} />Download {slipType} Slip</>}
          </button>
          <button onClick={reset} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Verify Another</button>
        </div>
      </div>
    );
  }

  if (!slipType && servicesData !== undefined && !serviceDisabled) {
    return <SlipTypeModal onSelect={(s) => setSlipType(s)} onClose={() => window.history.back()} />;
  }
  if (!slipType) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-lg">
      {loading && <BouncingLoader message="Verifying..." />}
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-orange-50 rounded-lg"><Calendar size={18} className="text-orange-600" /></div>
          <h1 className="text-xl font-semibold text-slate-900">Verify by Bio Data</h1>
        </div>
        <p className="text-sm text-slate-500 mb-1 ml-10">Verify identity using NIN and personal bio data.</p>
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
            <div><p className="text-sm text-red-700 font-medium">Insufficient balance</p><a href="/dashboard/wallet" className="text-xs text-red-700 underline">Fund wallet →</a></div>
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-[#0D2137]/50 uppercase tracking-wider">Verification Details</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIN <span className="text-red-500">*</span></label>
              <input type="text" value={form.nin} onChange={(e) => set('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="Enter 11-digit NIN" maxLength={11}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono tracking-widest" />
              <p className="mt-1 text-xs text-slate-400">{form.nin.length}/11 digits</p>
            </div>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white">
                <option value="">Select gender (optional)</option>
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
          <button type="submit" disabled={loading || balance < price || form.nin.length !== 11 || !form.firstName || !form.lastName || !form.dob}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Verifying...' : `Verify — ₦${price.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../../../lib/api';

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';
const sectionCls = 'bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3';
const sectionTitleCls = 'text-xs font-bold text-[#0D2137]/50 uppercase tracking-wider mb-3';
const grid2 = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

export default function AddressModificationPage() {
  const [form, setForm] = useState({
    nin: '', address: '', townCity: '',
    stateOfOrigin: '', lgaOfOrigin: '',
    stateOfResidence: '', lgaOfResidence: '',
  });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState<{ reference: string } | null>(null);
  const queryClient  = useQueryClient();

  const { data: walletData }   = useQuery({ queryKey: ['wallet'],   queryFn: () => api.get('/wallet').then((r) => r.data.data) });
  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => api.get('/services').then((r) => r.data.data) });

  const balance   = walletData?.balance ? Number(walletData.balance) : 0;
  const service   = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === 'nin-modification-address' && s.isEnabled);
  const price     = service ? Number(service.price) : 0;
  const canAfford = balance >= price;
  const serviceDisabled = servicesData !== undefined && !service;
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!form.nin.trim())              { setError('NIN is required.'); return; }
    if (!/^\d{11}$/.test(form.nin))    { setError('NIN must be exactly 11 numeric digits.'); return; }
    if (!form.address.trim())          { setError('Address is required.'); return; }
    if (!form.townCity.trim())         { setError('Town/City is required.'); return; }
    if (!form.stateOfOrigin.trim())    { setError('State of Origin is required.'); return; }
    if (!form.lgaOfOrigin.trim())      { setError('LGA of Origin is required.'); return; }
    if (!form.stateOfResidence.trim()) { setError('State of Residence is required.'); return; }
    if (!form.lgaOfResidence.trim())   { setError('LGA of Residence is required.'); return; }
    setLoading(true);
    try {
      const formData = { ...form };
      const res = await api.post('/requests', { serviceSlug: 'nin-modification-address', formData });
      setSuccess({ reference: res.data.data.reference });
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', 'nin-modification'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to submit request. Please try again.');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setSuccess(null);
    setForm({ nin: '', address: '', townCity: '', stateOfOrigin: '', lgaOfOrigin: '', stateOfResidence: '', lgaOfResidence: '' });
  };

  if (serviceDisabled) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-slate-500 mb-4">Address Modification is currently disabled. Please check back later.</p>
          <a href="/dashboard" className="inline-block px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 mb-4">Your Address Modification request has been submitted successfully.</p>
          <div className="bg-slate-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-slate-500 mb-1">Reference Number</p>
            <p className="font-mono text-sm font-medium text-slate-800">{success.reference}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Submit Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">NIN Modification — Address</h1>
        <p className="text-sm text-slate-500 mb-5">Fill in your address details to submit a modification request.</p>

        <div className="py-3 border-b border-slate-200 mb-5">
          <p className="text-xs text-slate-500">Service Fee</p>
          <p className="text-lg font-bold text-slate-900">₦{price.toLocaleString()}</p>
        </div>

        {!canAfford && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div><p className="text-sm text-red-700 font-medium">Insufficient balance</p><a href="/dashboard/wallet" className="text-xs text-red-700 underline">Fund wallet →</a></div>
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* NIN NUMBER */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>NIN Number</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIN <span className="text-red-500">*</span></label>
              <input type="text" value={form.nin} onChange={(e) => set('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="11-digit NIN" maxLength={11} className={`${inputCls} font-mono tracking-widest`} />
              <p className="mt-1 text-xs text-slate-400">{form.nin.length}/11 digits</p>
            </div>
          </div>

          {/* ADDRESS DETAILS */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Address Details</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-red-500">*</span></label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)}
                placeholder="Enter full address" rows={2}
                className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Town / City <span className="text-red-500">*</span></label>
              <input type="text" value={form.townCity} onChange={(e) => set('townCity', e.target.value)}
                placeholder="Enter town or city" className={inputCls} />
            </div>
            <div className={grid2}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State of Origin <span className="text-red-500">*</span></label>
                <input type="text" value={form.stateOfOrigin} onChange={(e) => set('stateOfOrigin', e.target.value)} placeholder="e.g. Kano" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">LGA of Origin <span className="text-red-500">*</span></label>
                <input type="text" value={form.lgaOfOrigin} onChange={(e) => set('lgaOfOrigin', e.target.value)} placeholder="e.g. Kano Municipal" className={inputCls} />
              </div>
            </div>
            <div className={grid2}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State of Residence <span className="text-red-500">*</span></label>
                <input type="text" value={form.stateOfResidence} onChange={(e) => set('stateOfResidence', e.target.value)} placeholder="e.g. Lagos" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">LGA of Residence <span className="text-red-500">*</span></label>
                <input type="text" value={form.lgaOfResidence} onChange={(e) => set('lgaOfResidence', e.target.value)} placeholder="e.g. Ikeja" className={inputCls} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading || !canAfford}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Submitting...' : `Submit Request — ₦${price.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, User, AlertCircle, Hash, Download } from 'lucide-react';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { SlipTypeModal, type SlipType } from '../../../../../components/SlipTypeModal';
import { BouncingLoader } from '../../../../../components/ui/BouncingLoader';

export default function VerifyByNINPage() {
  const [slipType, setSlipType]     = useState<SlipType | null>(null);
  const [nin, setNin]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState<Record<string, unknown> | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{11}$/.test(nin)) { setError('NIN must be exactly 11 numeric digits.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/nin/verify', { method: 'nin', nin, slipType });
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
    const ninValue = String(r.nin || nin);
    setDownloading(true);
    try {
      const response = await api.post(
        '/nin/slip/download',
        { nin: ninValue, slipType },
        { responseType: 'text' }
      );
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      alert(msg || 'Failed to download slip. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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
          <div className="bg-[#0D2137] px-6 py-4 text-center">
            <p className="text-white font-bold text-lg">Search Details</p>
            <p className="text-white/60 text-xs capitalize">{slipType} NIN Verification Slip</p>
          </div>

          <div className="p-6">
            {/* Photo */}
            <div className="flex justify-center mb-6">
              <div className="w-32 h-36 rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                {r.photo ? (
                  <img src={`data:image/jpeg;base64,${r.photo}`} alt="ID Photo" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-slate-400" />
                )}
              </div>
            </div>

            {/* Details table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {[
                { label: 'NIN',               value: r.nin || nin },
                { label: 'FIRSTNAME',         value: r.firstName },
                { label: 'MIDDLENAME',        value: r.middleName },
                { label: 'SURNAME',           value: r.lastName },
                { label: 'BIRTHDATE',         value: r.dob },
                { label: 'TELEPHONENO',       value: r.phone },
                { label: 'GENDER',            value: r.gender },
                { label: 'RESIDENCE_ADDRESS', value: r.address },
                { label: 'RESIDENCE_TOWN',    value: r.residenceTown },
                { label: 'RESIDENCE_LGA',     value: r.residenceLga },
                { label: 'RESIDENCE_STATE',   value: r.residenceState },
              ].map((row, i) => (
                <div key={row.label} className={`flex border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <div className="w-44 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase border-r border-slate-200 shrink-0">{row.label}</div>
                  <div className="px-4 py-2.5 text-sm text-slate-800 font-medium">{row.value || ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={() => window.history.back()} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">← Back</button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#C9A84C] text-white rounded-lg text-sm font-medium hover:bg-[#b8963e] disabled:opacity-60"
          >
            {downloading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Downloading...</> : <><Download size={16} /> Download {slipType} Slip</>}
          </button>
          <button onClick={() => { setResult(null); setNin(''); setSlipType(null); }} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Verify Another</button>
        </div>
      </div>
    );
  }

  /* ── Slip selection modal ── */
  if (!slipType && servicesData !== undefined && !serviceDisabled) {
    return <SlipTypeModal onSelect={(s) => setSlipType(s)} onClose={() => window.history.back()} />;
  }

  if (!slipType) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  /* ── Form view ── */
  return (
    <div className="max-w-lg">
      {loading && <BouncingLoader message="Verifying..." />}
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-blue-50 rounded-lg"><Hash size={18} className="text-[#C9A84C]" /></div>
          <h1 className="text-xl font-semibold text-slate-900">Verify by NIN</h1>
        </div>
        <p className="text-sm text-slate-500 mb-1 ml-10">Enter an 11-digit National Identification Number.</p>
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
              <input type="text" value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="Enter 11-digit NIN" maxLength={11}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono tracking-widest" />
              <p className="mt-1 text-xs text-slate-400">{nin.length}/11 digits</p>
            </div>
          </div>
          <button type="submit" disabled={loading || balance < price || nin.length !== 11}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Verifying...' : `Verify — ₦${price.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

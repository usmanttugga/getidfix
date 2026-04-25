'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, User, AlertCircle, Hash } from 'lucide-react';
import Link from 'next/link';
import api from '../../../../lib/api';
import { BouncingLoader } from '../../../../components/ui/BouncingLoader';

interface BvnResult {
  firstName?: string;
  lastName?: string;
  dob?: string;
  phone?: string;
  reference?: string;
  amount?: number;
}

export default function BvnVerificationForm() {
  const [bvn, setBvn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BvnResult | null>(null);

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const balance = walletData?.balance ? Number(walletData.balance) : 0;
  const service = servicesData?.services?.find(
    (s: { slug: string; isEnabled: boolean }) => s.slug === 'bvn-verification' && s.isEnabled
  );
  const price = service ? Number(service.price) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{11}$/.test(bvn)) {
      setError('BVN must be exactly 11 numeric digits.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/bvn/verify', { bvn });
      setResult(res.data.data);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: { message?: string; code?: string } } } })?.response?.data?.error;
      if (errData?.code === 'INSUFFICIENT_BALANCE') {
        setError('INSUFFICIENT_BALANCE');
      } else {
        setError(errData?.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (result) {
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
              <p className="font-semibold text-slate-900">
                {[result.firstName, result.lastName].filter(Boolean).join(' ') || '—'}
              </p>
              <p className="text-sm text-slate-500">BVN: {bvn}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Date of Birth</p>
              <p className="font-medium text-slate-800 text-sm">{result.dob || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Phone</p>
              <p className="font-medium text-slate-800 text-sm">{result.phone || '—'}</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 space-y-1">
            <p className="text-xs text-slate-400">
              Reference: <span className="font-mono">{result.reference || ''}</span>
            </p>
            <p className="text-xs text-slate-400">
              Amount charged: ₦{Number(result.amount || 0).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => { setResult(null); setBvn(''); setError(''); }}
            className="mt-4 w-full py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
          >
            Verify Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      {loading && <BouncingLoader message="Verifying..." />}
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Hash size={18} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">BVN Verification</h1>
        </div>
        <p className="text-sm text-slate-500 mb-5 ml-10">Enter an 11-digit Bank Verification Number.</p>

        <div className="py-3 border-b border-slate-200 mb-5">
          <p className="text-xs text-slate-500">Service Fee</p>
          <p className="text-lg font-bold text-slate-900">₦{price.toLocaleString()}</p>
        </div>

        {balance < price && price > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Insufficient balance</p>
              <Link href="/dashboard/wallet" className="text-xs text-red-700 underline">Fund wallet →</Link>
            </div>
          </div>
        )}

        {error === 'INSUFFICIENT_BALANCE' ? (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Insufficient balance</p>
              <Link href="/dashboard/wallet" className="text-xs text-red-700 underline">Fund your wallet to continue →</Link>
            </div>
          </div>
        ) : error ? (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-[#0D2137]/50 uppercase tracking-wider">Verification Details</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                BVN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="Enter 11-digit BVN"
                maxLength={11}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono tracking-widest"
              />
              <p className="mt-1 text-xs text-slate-400">{bvn.length}/11 digits</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || balance < price || bvn.length !== 11}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : `Verify — ₦${price.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

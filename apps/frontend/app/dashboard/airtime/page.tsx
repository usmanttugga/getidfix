'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';
import { ServiceHistory } from '../../../components/services/ServiceHistory';
import { ServiceHistory } from '../../../components/services/ServiceHistory';

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'] as const;

export default function AirtimePage() {
  const [network, setNetwork] = useState<string>('');
  const [phone, setPhone]     = useState('');
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState<{ reference: string; network: string; phone: string; amount: number } | null>(null);

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const balance    = walletData?.balance ? Number(walletData.balance) : 0;
  const airtimeService = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === 'buy-airtime' && s.isEnabled);
  const serviceDisabled = servicesData !== undefined && !airtimeService;
  const numAmount  = parseFloat(amount) || 0;
  const canAfford  = balance >= numAmount && numAmount > 0;
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!network) { setError('Please select a network.'); return; }
    if (!/^(070|080|081|090|091)\d{8}$/.test(phone)) { setError('Enter a valid 11-digit Nigerian phone number.'); return; }
    if (numAmount < 50 || numAmount > 50000) { setError('Amount must be between ₦50 and ₦50,000.'); return; }
    if (!canAfford) { setError('Insufficient wallet balance.'); return; }

    setLoading(true);
    try {
      const res = await api.post('/airtime/purchase', { phone, network, amount: numAmount });
      setSuccess(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', 'buy-airtime'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (serviceDisabled) {
    return (
      <div className="max-w-lg mx-auto space-y-0">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-slate-500 mb-4">Airtime purchase is currently disabled. Please check back later.</p>
          <a href="/dashboard" className="inline-block px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-0">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Airtime Sent!</h2>
          <p className="text-slate-500 mb-4">
            ₦{success.amount.toLocaleString()} {success.network} airtime sent to {success.phone}
          </p>
          <p className="text-xs text-slate-400 font-mono mb-6">Ref: {success.reference}</p>
          <button onClick={() => { setSuccess(null); setPhone(''); setAmount(''); setNetwork(''); }}
            className="px-6 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">
            Buy More Airtime
          </button>
        </div>
        <ServiceHistory serviceSlug="buy-airtime" title="Airtime Purchase History" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Buy Airtime</h1>
        <p className="text-sm text-slate-500 mb-4">Top up any Nigerian mobile number instantly.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Network <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNetwork(n)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${network === n ? 'bg-[#0D2137] text-white border-[#0D2137]' : 'border-slate-300 text-slate-600 hover:border-slate-500'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₦) <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              min="50"
              max="50000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <p className="mt-1 text-xs text-slate-400">Min: ₦50 · Max: ₦50,000</p>
          </div>

          {numAmount > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <span className="text-slate-500">You will be charged: </span>
              <span className="font-semibold text-slate-900">₦{numAmount.toLocaleString()}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canAfford}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Buy Airtime'}
          </button>
        </form>
      </div>
      <ServiceHistory serviceSlug="buy-airtime" title="Airtime Purchase History" />
    </div>
  );
}

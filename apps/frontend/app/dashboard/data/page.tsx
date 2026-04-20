'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';
import { ServiceHistory } from '../../../components/services/ServiceHistory';
import { ServiceHistory } from '../../../components/services/ServiceHistory';

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'] as const;

interface DataPlan {
  id: string;
  name: string;
  price: number;
  validity: string;
}

export default function DataPage() {
  const [network, setNetwork]   = useState<string>('');
  const [phone, setPhone]       = useState('');
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState<{ reference: string; network: string; phone: string; plan: DataPlan } | null>(null);

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const { data: plansData } = useQuery({
    queryKey: ['data-plans'],
    queryFn: () => api.get('/data/plans').then((r) => r.data.data),
  });

  const balance   = walletData?.balance ? Number(walletData.balance) : 0;
  const dataService = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === 'buy-data' && s.isEnabled);
  const serviceDisabled = servicesData !== undefined && !dataService;
  const plans     = network && plansData ? (plansData[network] as DataPlan[] || []) : [];
  const canAfford = selectedPlan ? balance >= selectedPlan.price : false;
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!network) { setError('Please select a network.'); return; }
    if (!/^(070|080|081|090|091)\d{8}$/.test(phone)) { setError('Enter a valid 11-digit Nigerian phone number.'); return; }
    if (!selectedPlan) { setError('Please select a data plan.'); return; }
    if (!canAfford) { setError('Insufficient wallet balance.'); return; }

    setLoading(true);
    try {
      const res = await api.post('/data/purchase', { phone, network, planId: selectedPlan.id });
      setSuccess(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', 'buy-data'] });
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
          <p className="text-slate-500 mb-4">Data purchase is currently disabled. Please check back later.</p>
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
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Data Activated!</h2>
          <p className="text-slate-500 mb-4">
            {success.network} {success.plan.name} data sent to {success.phone}
          </p>
          <p className="text-xs text-slate-400 font-mono mb-6">Ref: {success.reference}</p>
          <button onClick={() => { setSuccess(null); setPhone(''); setNetwork(''); setSelectedPlan(null); }}
            className="px-6 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">
            Buy More Data
          </button>
        </div>
        <ServiceHistory serviceSlug="buy-data" title="Data Purchase History" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Buy Data</h1>
        <p className="text-sm text-slate-500 mb-4">Purchase data bundles for any Nigerian mobile number.</p>

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
                  onClick={() => { setNetwork(n); setSelectedPlan(null); }}
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

          {network && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Plan <span className="text-red-500">*</span></label>
              {plans.length === 0 ? (
                <p className="text-sm text-slate-400">No plans available for {network}.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-3 rounded-lg border text-left transition-colors ${selectedPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
                    >
                      <p className="font-semibold text-slate-900 text-sm">{plan.name}</p>
                      <p className="text-xs text-slate-500">{plan.validity}</p>
                      <p className="text-sm font-bold text-[#0F4C81] mt-1">₦{plan.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canAfford || !selectedPlan}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : selectedPlan ? `Buy ${selectedPlan.name} — ₦${selectedPlan.price.toLocaleString()}` : 'Select a Plan'}
          </button>
        </form>
      </div>
      <ServiceHistory serviceSlug="buy-data" title="Data Purchase History" />
    </div>
  );
}

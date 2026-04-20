'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Copy, Check, Building2, Wallet } from 'lucide-react';
import api from '../../lib/api';
import { ServiceGrid } from '../../components/services/ServiceGrid';

export default function DashboardPage() {
  const { data: walletData, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const [copied, setCopied] = useState(false);

  const balance        = walletData?.balance ? Number(walletData.balance) : 0;
  const virtualAccount = walletData?.virtualAccount;
  const services       = servicesData?.services || [];

  const copy = () => {
    if (virtualAccount?.accountNumber) {
      navigator.clipboard.writeText(virtualAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Top banner — balance left, account right */}
      <div className="bg-gradient-to-r from-[#0D2137] via-[#0f2d4a] to-[#1a3a2a] rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center gap-5">

        {/* Balance */}
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-white/10 rounded-xl">
            <Wallet size={22} className="text-[#C9A84C]" />
          </div>
          <div>
            <p className="text-xs opacity-60 uppercase tracking-wide mb-0.5">Wallet Balance</p>
            <p className="text-3xl font-bold tracking-tight">
              ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-14 bg-white/10" />

        {/* Virtual Account */}
        {virtualAccount?.accountNumber ? (
          <div className="flex items-center gap-4 flex-1">
            <div className="p-3 bg-white/10 rounded-xl">
              <Building2 size={22} className="text-[#C9A84C]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-0.5">Fund via Transfer</p>
              <p className="text-xs opacity-50 mb-0.5">{virtualAccount.bankName}</p>
              {virtualAccount.accountName && (
                <p className="text-xs font-semibold opacity-80 mb-0.5">{virtualAccount.accountName}</p>
              )}
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold font-mono tracking-widest">{virtualAccount.accountNumber}</p>
                <button onClick={copy} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Copy">
                  {copied ? <Check size={13} className="text-green-300" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-xs opacity-50">Setting up your dedicated account...</p>
          </div>
        )}
      </div>

      {/* Services */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Available Services</h2>
        {services.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D2137]" />
          </div>
        ) : (
          <ServiceGrid services={services} />
        )}
      </div>
    </div>
  );
}

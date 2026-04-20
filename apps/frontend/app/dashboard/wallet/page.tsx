'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowUpCircle, RefreshCw, Wallet, Building2, Copy, Check } from 'lucide-react';
import api from '../../../lib/api';

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    CREDIT: { icon: <ArrowUpCircle size={14} />, color: 'text-green-600', label: 'Funding' },
    REFUND: { icon: <RefreshCw size={14} />,     color: 'text-[#C9A84C]',  label: 'Refund'  },
  };
  const c = config[type] || { icon: null, color: 'text-slate-600', label: type };
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
}

export default function WalletPage() {
  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const [copied, setCopied] = useState(false);

  const balance        = walletData?.balance ? Number(walletData.balance) : 0;
  const virtualAccount = walletData?.virtualAccount;

  const copy = () => {
    if (virtualAccount?.accountNumber) {
      navigator.clipboard.writeText(virtualAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allTx: { id: string; type: string; description: string; amount: number; balanceAfter: number; createdAt: string }[] =
    walletData?.transactions || [];
  const walletTx = allTx.filter((tx) => tx.type === 'CREDIT' || tx.type === 'REFUND');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your balance and view funding history.</p>
      </div>

      {/* Same banner as dashboard */}
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

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Wallet Funding History</h2>

        {walletTx.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-300 p-8 text-center text-slate-400">
            <Wallet size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No funding history yet.</p>
            <p className="text-xs mt-1">Transfer to your dedicated account above to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden sm:table-cell">Balance After</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {walletTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><TypeBadge type={tx.type} /></td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{tx.description}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      +₦{Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                      ₦{Number(tx.balanceAfter).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 hidden md:table-cell">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

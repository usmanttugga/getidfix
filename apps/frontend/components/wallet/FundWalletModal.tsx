'use client';

import { X, Building2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface FundWalletModalProps {
  onClose: () => void;
  onSuccess: () => void;
  virtualAccount?: { accountNumber: string | null; bankName: string | null } | null;
}

export function FundWalletModal({ onClose, virtualAccount }: FundWalletModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (virtualAccount?.accountNumber) {
      navigator.clipboard.writeText(virtualAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Fund Wallet</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X size={20} />
          </button>
        </div>

        {virtualAccount?.accountNumber ? (
          <>
            <p className="text-sm text-slate-500 mb-4">
              Transfer any amount to your dedicated account below. Your wallet will be credited automatically.
            </p>

            <div className="bg-slate-50 rounded-xl border border-slate-300 p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 size={18} className="text-[#C9A84C]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Bank</p>
                  <p className="text-sm font-semibold text-slate-800">{virtualAccount.bankName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Account Number</p>
                  <p className="text-xl font-bold text-slate-900 font-mono tracking-widest">
                    {virtualAccount.accountNumber}
                  </p>
                </div>
                <button
                  onClick={copy}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Copy"
                >
                  {copied
                    ? <Check size={16} className="text-green-600" />
                    : <Copy size={16} className="text-slate-500" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This is your dedicated account. Any transfer made to it will reflect in your wallet balance.
            </p>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors"
            >
              Done
            </button>
          </>
        ) : (
          <div className="text-center py-6 text-slate-400">
            <Building2 size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Your dedicated account is being set up.</p>
            <p className="text-xs mt-1">Please check back shortly or contact support.</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

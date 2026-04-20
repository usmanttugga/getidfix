'use client';

import { useState } from 'react';
import { Wallet, Copy, Check, Building2 } from 'lucide-react';

interface WalletCardProps {
  balance: number;
  onFunded?: () => void;
  virtualAccount?: { accountNumber: string | null; bankName: string | null; accountName: string | null } | null;
}

export function WalletCard({ balance, virtualAccount }: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (virtualAccount?.accountNumber) {
      navigator.clipboard.writeText(virtualAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0D2137] via-[#0f2d4a] to-[#1a3a2a] rounded-2xl p-4 text-white shadow-lg border border-[#1a3550]">
      {/* Header + Balance */}
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={16} className="opacity-70" />
        <span className="text-xs font-medium opacity-70">Wallet Balance</span>
      </div>
      <p className="text-2xl font-bold mb-3">
        ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>

      {/* Dedicated Account */}
      {virtualAccount?.accountNumber ? (
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 size={12} className="opacity-60" />
            <span className="text-xs font-medium opacity-60 uppercase tracking-wide">Fund via Transfer</span>
          </div>
          <p className="text-xs opacity-50 mb-0.5">{virtualAccount.bankName}</p>
          {virtualAccount.accountName && (
            <p className="text-xs font-semibold opacity-80 mb-1">{virtualAccount.accountName}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold font-mono tracking-widest">
              {virtualAccount.accountNumber}
            </span>
            <button
              onClick={copy}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors shrink-0"
              title="Copy"
            >
              {copied
                ? <Check size={13} className="text-green-300" />
                : <Copy size={13} className="text-white" />}
            </button>
          </div>
          <p className="text-xs opacity-40 mt-1">Transfer to fund your wallet instantly</p>
        </div>
      ) : (
        <div className="bg-white/10 rounded-xl p-2.5 text-center">
          <p className="text-xs opacity-50">Setting up your dedicated account...</p>
        </div>
      )}
    </div>
  );
}

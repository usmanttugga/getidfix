'use client';

import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export type SlipType = 'basic' | 'premium' | 'regular' | 'standard' | 'vnin';

interface SlipOption {
  id: SlipType;
  name: string;
  image: string;
  slug: string;
}

const SLIP_OPTIONS: SlipOption[] = [
  { id: 'basic',    name: 'Basic Slip',    image: '/slips/basic-slip.png',    slug: 'nin-verification-basic'    },
  { id: 'premium',  name: 'Premium Slip',  image: '/slips/premium-slip.png',  slug: 'nin-verification-premium'  },
  { id: 'regular',  name: 'Regular Slip',  image: '/slips/regular-slip.png',  slug: 'nin-verification-regular'  },
  { id: 'standard', name: 'Standard Slip', image: '/slips/standard-slip.png', slug: 'nin-verification-standard' },
  { id: 'vnin',     name: 'VNIN Slip',     image: '/slips/vnin-slip.png',     slug: 'nin-verification-vnin'     },
];

interface SlipTypeModalProps {
  onSelect: (slipType: SlipType) => void;
  onClose: () => void;
}

export function SlipTypeModal({ onSelect, onClose }: SlipTypeModalProps) {
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const services: { slug: string; price: number; isEnabled: boolean }[] = servicesData?.services || [];

  const getPrice = (slug: string) => {
    const svc = services.find((s) => s.slug === slug);
    return svc ? Number(svc.price) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Select Slip Type</h2>
            <p className="text-sm text-slate-500 mt-0.5">Choose the format for your NIN verification slip</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Slip options grid */}
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SLIP_OPTIONS.map((opt) => {
              const price = getPrice(opt.slug);
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelect(opt.id)}
                  className="group text-left border border-slate-300 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {/* Sample image */}
                  <div className="bg-slate-50 border-b border-slate-200 group-hover:bg-blue-50 transition-colors overflow-hidden flex items-center justify-center" style={{ minHeight: '120px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={opt.image} alt={opt.name} className="w-full h-auto object-contain" style={{ maxHeight: '160px' }} />
                  </div>
                  {/* Label + Price */}
                  <div className="py-2 px-3 flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800 text-xs group-hover:text-[#0D2137] transition-colors leading-tight">
                      {opt.name}
                    </p>
                    {price !== null ? (
                      <span className="text-xs font-bold text-[#C9A84C] shrink-0">₦{price.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-slate-400 shrink-0">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

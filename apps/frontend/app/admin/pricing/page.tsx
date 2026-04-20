'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

interface Service {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  isEnabled: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  NIN:    'bg-slate-100 border-slate-300 text-[#0D2137]',
  BVN:    'bg-purple-50 border-purple-200 text-purple-800',
  AIRTIME:'bg-green-50 border-green-200 text-green-800',
  DATA:   'bg-teal-50 border-teal-200 text-teal-800',
};

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});
  const [saved, setSaved]           = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.get('/admin/services').then((r) => r.data.data as Service[]),
  });

  const updateService = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      api.patch(`/admin/services/${id}`, { price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const services: Service[] = data || [];

  // Group by category
  const grouped = services.reduce<Record<string, Service[]>>((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = [];
    acc[svc.category].push(svc);
    return acc;
  }, {});

  const categoryOrder = ['NIN', 'BVN', 'AIRTIME', 'DATA'];

  const handleSaveAll = async () => {
    const entries = Object.entries(priceEdits);
    if (entries.length === 0) return;

    const promises = entries
      .map(([id, raw]) => {
        const newPrice = parseFloat(raw);
        if (!isNaN(newPrice) && newPrice >= 0) {
          return updateService.mutateAsync({ id, price: newPrice });
        }
        return null;
      })
      .filter(Boolean);

    await Promise.all(promises);
    setPriceEdits({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const dirtyCount = Object.keys(priceEdits).filter((id) => {
    const raw = priceEdits[id];
    const svc = services.find((s) => s.id === id);
    return raw !== '' && !isNaN(parseFloat(raw)) && parseFloat(raw) !== Number(svc?.price);
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Pricing</h1>
          <p className="text-slate-500 text-sm mt-1">
            Update prices for all services. Click <strong>Save All Pricing</strong> when done.
          </p>
        </div>
        {dirtyCount > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={updateService.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] disabled:opacity-60 shadow-sm"
          >
            <Save size={16} />
            {updateService.isPending ? 'Saving...' : `Save All Pricing (${dirtyCount} change${dirtyCount > 1 ? 's' : ''})`}
          </button>
        )}
        {saved && dirtyCount === 0 && (
          <span className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
            ✓ All prices saved
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D2137]" />
        </div>
      ) : (
        <div className="space-y-4">
          {categoryOrder.filter((cat) => grouped[cat]).map((category) => {
            const catServices = grouped[category];
            const isOpen = expanded[category] !== false; // default open
            const colorClass = CATEGORY_COLORS[category] || 'bg-slate-50 border-slate-300 text-slate-800';

            return (
              <div key={category} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [category]: !isOpen }))}
                  className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                      {category}
                    </span>
                    <span className="font-semibold text-slate-700 text-sm">{catServices.length} services</span>
                  </div>
                  {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {isOpen && (
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">Service</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase w-48">Price (₦)</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {catServices.map((svc) => {
                        const currentEdit = priceEdits[svc.id];
                        const displayVal  = currentEdit ?? String(Number(svc.price));
                        const isDirty     = currentEdit !== undefined
                          && currentEdit !== ''
                          && !isNaN(parseFloat(currentEdit))
                          && parseFloat(currentEdit) !== Number(svc.price);

                        return (
                          <tr key={svc.id} className={`${!svc.isEnabled ? 'opacity-50' : ''} hover:bg-slate-50`}>
                            <td className="px-5 py-3 text-slate-700">{svc.name}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs">₦</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={displayVal}
                                  onChange={(e) => setPriceEdits((prev) => ({ ...prev, [svc.id]: e.target.value }))}
                                  className={`w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                                    isDirty ? 'border-slate-500 bg-slate-50' : 'border-slate-300'
                                  }`}
                                />
                                {isDirty && <span className="text-xs text-[#C9A84C] font-medium">●</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                svc.isEnabled
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-300'
                              }`}>
                                {svc.isEnabled ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Save button at bottom */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSaveAll}
            disabled={updateService.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-[#0D2137] text-white rounded-xl text-sm font-medium hover:bg-[#0f2d4a] disabled:opacity-60 shadow-lg"
          >
            <Save size={16} />
            {updateService.isPending ? 'Saving...' : `Save All Pricing (${dirtyCount} change${dirtyCount > 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { getAccessToken } from '../../../stores/authStore';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  isEnabled: boolean;
}

const BASE = 'http://localhost:3001/api/v1';

const CATEGORY_ORDER = ['NIN', 'BVN', 'AIRTIME', 'DATA'];
const CATEGORY_COLORS: Record<string, string> = {
  NIN:    'bg-slate-100 border-slate-300 text-[#0D2137]',
  BVN:    'bg-purple-50 border-purple-200 text-purple-800',
  AIRTIME:'bg-green-50 border-green-200 text-green-800',
  DATA:   'bg-teal-50 border-teal-200 text-teal-800',
};

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function AdminAvailabilityPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null); // id of service being saved

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/admin/services`, { headers: authHeaders() });
      const json = await res.json();
      const data: ServiceItem[] = (json.data || []).map((s: ServiceItem) => ({
        id: s.id, name: s.name, category: s.category, isEnabled: s.isEnabled,
      }));
      setServices(data);
    } catch (e) {
      console.error('Failed to load services', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServices(); }, []);

  // Toggle a single service — only sends isEnabled, nothing else
  const toggleService = async (id: string, newValue: boolean) => {
    // Optimistic update
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, isEnabled: newValue } : s));
    setSaving(id);
    try {
      const res = await fetch(`${BASE}/admin/services/${id}/availability`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isEnabled: newValue }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Failed:', err);
        throw new Error('Failed');
      }
    } catch (e) {
      console.error('Failed to update service', e);
      // Revert on error
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, isEnabled: !newValue } : s));
    } finally {
      setSaving(null);
    }
  };

  const toggleAll = async (category: string, newValue: boolean) => {
    const catServices = services.filter((s) => s.category === category);
    for (const svc of catServices) {
      if (svc.isEnabled !== newValue) {
        await toggleService(svc.id, newValue);
      }
    }
  };

  // Group by category
  const grouped = services.reduce<Record<string, ServiceItem[]>>((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = [];
    acc[svc.category].push(svc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Service Availability</h1>
        <p className="text-slate-500 text-sm mt-1">
          Click a service to enable or disable it. Changes save immediately.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D2137]" />
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((category) => {
            const catServices  = grouped[category] || [];
            const colorClass   = CATEGORY_COLORS[category] || 'bg-slate-50 border-slate-300 text-slate-800';
            const enabledCount = catServices.filter((s) => s.isEnabled).length;

            return (
              <div key={category} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                    {category}
                  </span>
                  <span className="font-semibold text-slate-700 text-sm">
                    {enabledCount} / {catServices.length} enabled
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAll(category, true)}
                      className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAll(category, false)}
                      className="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Service rows */}
                <div className="divide-y divide-slate-50">
                  {catServices.map((svc) => (
                    <div
                      key={svc.id}
                      onClick={() => saving !== svc.id && toggleService(svc.id, !svc.isEnabled)}
                      className={`flex items-center gap-4 px-5 py-3 cursor-pointer select-none transition-colors ${
                        svc.isEnabled ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-60 hover:opacity-80'
                      } ${saving === svc.id ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={svc.isEnabled}
                        readOnly
                        className="w-4 h-4 rounded border-slate-300 text-[#C9A84C] pointer-events-none"
                      />
                      <span className={`flex-1 text-sm ${svc.isEnabled ? 'text-slate-800' : 'text-slate-500'}`}>
                        {svc.name}
                      </span>
                      {saving === svc.id ? (
                        <span className="text-xs text-slate-400 italic">Saving...</span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          svc.isEnabled
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-500 border-slate-300'
                        }`}>
                          {svc.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

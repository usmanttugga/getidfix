'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Building2, Mail, Phone } from 'lucide-react';
import api from '../../../lib/api';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    companyName:  '',
    supportEmail: '',
    supportPhone: '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['settings-support'],
    queryFn: () => api.get('/settings/support').then((r) => r.data.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        companyName:  data.companyName  || '',
        supportEmail: data.supportEmail || '',
        supportPhone: data.supportPhone || '',
      });
    }
  }, [data]);

  const update = useMutation({
    mutationFn: (body: typeof form) => api.patch('/settings/support', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-support'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => setError('Failed to save settings. Please try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    update.mutate(form);
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage support contact details shown to users.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D2137]" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-300 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-5">Support Contact Details</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-slate-400" /> Company Name
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                placeholder="e.g. GetIDFix Verifications"
                className={inputCls}
              />
            </div>

            {/* Support Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> Email Address
              </label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm((p) => ({ ...p, supportEmail: e.target.value }))}
                placeholder="e.g. support@getidfix.com"
                className={inputCls}
              />
            </div>

            {/* Support Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone size={14} className="text-slate-400" /> Phone Number (Call / WhatsApp)
              </label>
              <input
                type="text"
                value={form.supportPhone}
                onChange={(e) => setForm((p) => ({ ...p, supportPhone: e.target.value }))}
                placeholder="e.g. +234 800 000 0000"
                className={inputCls}
              />
              <p className="text-xs text-slate-400 mt-1">This number will be shown for both calls and WhatsApp.</p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={update.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] disabled:opacity-60 transition-colors"
              >
                <Save size={15} />
                {update.isPending ? 'Saving...' : 'Save Settings'}
              </button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">✓ Settings saved</span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

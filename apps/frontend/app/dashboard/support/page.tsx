'use client';

import { useQuery } from '@tanstack/react-query';
import { Mail, Building2, MessageCircle } from 'lucide-react';
import api from '../../../lib/api';

export default function SupportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings-support'],
    queryFn: () => api.get('/settings/support').then((r) => r.data.data),
  });

  const companyName  = data?.companyName  || '';
  const supportEmail = data?.supportEmail || '';
  const supportPhone = data?.supportPhone || '';

  const hasAny = companyName || supportEmail || supportPhone;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support</h1>
        <p className="text-slate-500 text-sm mt-1">
          Need help? Reach out to us through any of the channels below.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !hasAny ? (
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center text-slate-400">
          <MessageCircle size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Support contact details are not available yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-300 divide-y divide-slate-100">
          {companyName && (
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
                <Building2 size={20} className="text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Company</p>
                <p className="font-semibold text-slate-900">{companyName}</p>
              </div>
            </div>
          )}

          {supportEmail && (
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="p-2.5 bg-green-50 rounded-xl shrink-0">
                <Mail size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email</p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-semibold text-[#C9A84C] hover:underline"
                >
                  {supportEmail}
                </a>
              </div>
            </div>
          )}

          {supportPhone && (
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl shrink-0">
                <MessageCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">WhatsApp</p>
                <a
                  href={`https://wa.me/${supportPhone.replace(/[\s+\-()]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#C9A84C] hover:underline"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

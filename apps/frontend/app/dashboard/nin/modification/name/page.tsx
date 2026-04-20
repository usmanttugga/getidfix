'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Upload, X, FileText } from 'lucide-react';
import api from '../../../../../lib/api';

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';
const sectionCls = 'bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3';
const sectionTitleCls = 'text-xs font-bold text-[#0D2137]/50 uppercase tracking-wider mb-3';
const grid3 = 'grid grid-cols-1 sm:grid-cols-3 gap-3';

export default function NameModificationPage() {
  const [form, setForm] = useState({ nin: '', surname: '', firstName: '', middleName: '', phoneNumber: '' });
  const [document, setDocument] = useState<File | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState<{ reference: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient  = useQueryClient();

  const { data: walletData }   = useQuery({ queryKey: ['wallet'],   queryFn: () => api.get('/wallet').then((r) => r.data.data) });
  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => api.get('/services').then((r) => r.data.data) });

  const balance   = walletData?.balance ? Number(walletData.balance) : 0;
  const service   = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === 'nin-modification-name' && s.isEnabled);
  const price     = service ? Number(service.price) : 0;
  const canAfford = balance >= price;
  const serviceDisabled = servicesData !== undefined && !service;
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setError('File size must not exceed 5MB.'); return; }
      setDocument(file); setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!form.nin.trim())           { setError('NIN is required.'); return; }
    if (!/^\d{11}$/.test(form.nin)) { setError('NIN must be exactly 11 numeric digits.'); return; }
    if (!form.surname.trim())       { setError('Surname is required.'); return; }
    if (!form.firstName.trim())     { setError('First Name is required.'); return; }
    if (!form.phoneNumber.trim())   { setError('Phone Number is required.'); return; }
    if (!document)                  { setError('Please upload a supporting document.'); return; }
    setLoading(true);
    try {
      const fileBase64 = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(document);
      });
      const formData = { ...form, documentName: document.name, documentType: document.type, documentData: fileBase64 };
      const res = await api.post('/requests', { serviceSlug: 'nin-modification-name', formData });
      setSuccess({ reference: res.data.data.reference });
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', 'nin-modification'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to submit request. Please try again.');
    } finally { setLoading(false); }
  };

  if (serviceDisabled) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-slate-500 mb-4">Name Modification is currently disabled. Please check back later.</p>
          <a href="/dashboard" className="inline-block px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 mb-4">Your Name Modification request has been submitted successfully.</p>
          <div className="bg-slate-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-slate-500 mb-1">Reference Number</p>
            <p className="font-mono text-sm font-medium text-slate-800">{success.reference}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSuccess(null); setForm({ nin: '', surname: '', firstName: '', middleName: '', phoneNumber: '' }); setDocument(null); }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Submit Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">NIN Modification — Name</h1>
        <p className="text-sm text-slate-500 mb-5">Fill in your details and upload a supporting document.</p>

        <div className="py-3 border-b border-slate-200 mb-5">
          <p className="text-xs text-slate-500">Service Fee</p>
          <p className="text-lg font-bold text-slate-900">₦{price.toLocaleString()}</p>
        </div>

        {!canAfford && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div><p className="text-sm text-red-700 font-medium">Insufficient balance</p><a href="/dashboard/wallet" className="text-xs text-red-700 underline">Fund wallet →</a></div>
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* NIN NUMBER */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>NIN Number</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIN <span className="text-red-500">*</span></label>
              <input type="text" value={form.nin} onChange={(e) => set('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="11-digit NIN" maxLength={11} className={`${inputCls} font-mono tracking-widest`} />
              <p className="mt-1 text-xs text-slate-400">{form.nin.length}/11 digits</p>
            </div>
          </div>

          {/* NAME DETAILS */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Name Details</p>
            <div className={grid3}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Surname <span className="text-red-500">*</span></label>
                <input type="text" value={form.surname} onChange={(e) => set('surname', e.target.value)} placeholder="Surname" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First Name" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                <input type="text" value={form.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Middle Name" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
              <input type="text" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="e.g. 08012345678" maxLength={11} className={inputCls} />
            </div>
          </div>

          {/* DOCUMENT UPLOAD */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Document Upload</p>
            <p className="text-xs text-slate-400 mb-2">Upload a supporting document (e.g. birth certificate, court affidavit). Max 5MB.</p>
            {document ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FileText size={18} className="text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{document.name}</p>
                  <p className="text-xs text-slate-500">{(document.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={() => { setDocument(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 hover:bg-green-100 rounded">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-500 hover:bg-blue-50 transition-colors">
                <Upload size={24} className="text-slate-400" />
                <span className="text-sm text-slate-500">Click to upload document</span>
                <span className="text-xs text-slate-400">PDF, JPG, PNG — Max 5MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
          </div>

          <button type="submit" disabled={loading || !canAfford}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Submitting...' : `Submit Request — ₦${price.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

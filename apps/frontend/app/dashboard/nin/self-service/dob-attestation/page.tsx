'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Upload, X, FileText } from 'lucide-react';
import api from '../../../../../lib/api';

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
const sectionCls = 'bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3';
const sectionTitleCls = 'text-xs font-bold text-[#0D2137]/50 uppercase tracking-wider mb-3';
const grid2 = 'grid grid-cols-1 sm:grid-cols-2 gap-3';
const grid3 = 'grid grid-cols-1 sm:grid-cols-3 gap-3';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {children}
    </div>
  );
}

export default function DOBAttestationPage() {
  const [form, setForm] = useState({
    nin: '',
    surname: '', firstName: '', middleName: '', phoneNumber: '', sex: '', maritalStatus: '',
    oldDob: '', newDob: '',
    stateOfOrigin: '', lgaOfOrigin: '', townVillageOfOrigin: '',
    placeOfBirth: '', stateOfBirth: '', lgaOfBirth: '',
    currentResidentialAddress: '', highestLevelOfEducation: '',
    occupation: '', addressOfPlaceOfWork: '', requestingBodyAddress: '',
    fatherSurname: '', fatherFirstName: '', fatherStateOfOrigin: '',
    fatherLgaOfOrigin: '', fatherVillageTown: '',
    motherSurname: '', motherFirstName: '', motherMaidenName: '',
    motherStateOfOrigin: '', motherLgaOfOrigin: '', motherVillageTown: '',
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState<{ reference: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient  = useQueryClient();

  const { data: walletData }   = useQuery({ queryKey: ['wallet'],   queryFn: () => api.get('/wallet').then((r) => r.data.data) });
  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => api.get('/services').then((r) => r.data.data) });

  const balance   = walletData?.balance ? Number(walletData.balance) : 0;
  const service   = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === 'nin-self-service-dob-attestation' && s.isEnabled);
  const price     = service ? Number(service.price) : 0;
  const canAfford = balance >= price;
  const serviceDisabled = servicesData !== undefined && !service;
  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.some((f) => f.size > 5 * 1024 * 1024)) { setError('Each file must not exceed 5MB.'); return; }
    setDocuments((prev) => { const ex = new Set(prev.map((f) => f.name)); return [...prev, ...files.filter((f) => !ex.has(f.name))]; });
    setError(''); if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => setDocuments((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!form.nin.trim())       { setError('NIN is required.'); return; }
    if (!/^\d{11}$/.test(form.nin)) { setError('NIN must be exactly 11 numeric digits.'); return; }
    if (!form.surname.trim())   { setError('Surname is required.'); return; }
    if (!form.firstName.trim()) { setError('First Name is required.'); return; }
    if (!form.oldDob)           { setError('Old Date of Birth is required.'); return; }
    if (!form.newDob)           { setError('New Date of Birth (Target) is required.'); return; }
    if (documents.length === 0) { setError('Please upload at least one supporting document.'); return; }
    setLoading(true);
    try {
      const docsBase64 = await Promise.all(documents.map((file) =>
        new Promise<{ name: string; type: string; data: string }>((res, rej) => {
          const r = new FileReader(); r.onload = () => res({ name: file.name, type: file.type, data: r.result as string }); r.onerror = rej; r.readAsDataURL(file);
        })
      ));
      const formData = { ...form, documents: docsBase64 };
      const res = await api.post('/requests', { serviceSlug: 'nin-self-service-dob-attestation', formData });
      setSuccess({ reference: res.data.data.reference });
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', 'nin-self-service'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to submit request. Please try again.');
    } finally { setLoading(false); }
  };

  const emptyForm = { nin: '', surname: '', firstName: '', middleName: '', phoneNumber: '', sex: '', maritalStatus: '', oldDob: '', newDob: '', stateOfOrigin: '', lgaOfOrigin: '', townVillageOfOrigin: '', placeOfBirth: '', stateOfBirth: '', lgaOfBirth: '', currentResidentialAddress: '', highestLevelOfEducation: '', occupation: '', addressOfPlaceOfWork: '', requestingBodyAddress: '', fatherSurname: '', fatherFirstName: '', fatherStateOfOrigin: '', fatherLgaOfOrigin: '', fatherVillageTown: '', motherSurname: '', motherFirstName: '', motherMaidenName: '', motherStateOfOrigin: '', motherLgaOfOrigin: '', motherVillageTown: '' };
  const reset = () => { setSuccess(null); setDocuments([]); setForm(emptyForm); };

  if (serviceDisabled) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-slate-500 mb-4">Date of Birth Attestation is currently disabled. Please check back later.</p>
          <a href="/dashboard" className="inline-block px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 mb-4">Your Date of Birth Attestation request has been submitted successfully.</p>
          <div className="bg-slate-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-slate-500 mb-1">Reference Number</p>
            <p className="font-mono text-sm font-medium text-slate-800">{success.reference}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Submit Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-300 p-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">NIN Self Service — Date of Birth Attestation</h1>
        <p className="text-sm text-slate-500 mb-5">Complete all sections and upload supporting documents.</p>

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

          <div className={sectionCls}>
            <p className={sectionTitleCls}>NIN Number</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIN <span className="text-red-500">*</span></label>
              <input type="text" value={form.nin} onChange={(e) => set('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="11-digit NIN" maxLength={11} className={`${inputCls} font-mono tracking-widest`} />
              <p className="mt-1 text-xs text-slate-400">{form.nin.length}/11 digits</p>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionTitleCls}>Personal Details</p>
            <div className={grid3}>
              <Field label="Surname" required><input type="text" value={form.surname} onChange={(e) => set('surname', e.target.value)} placeholder="Surname" className={inputCls} /></Field>
              <Field label="First Name" required><input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First Name" className={inputCls} /></Field>
              <Field label="Middle Name"><input type="text" value={form.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Middle Name" className={inputCls} /></Field>
            </div>
            <div className={grid3}>
              <Field label="Phone Number"><input type="text" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="08012345678" className={inputCls} /></Field>
              <Field label="Sex"><select value={form.sex} onChange={(e) => set('sex', e.target.value)} className={`${inputCls} bg-white`}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></Field>
              <Field label="Marital Status"><select value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)} className={`${inputCls} bg-white`}><option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option></select></Field>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionTitleCls}>Date of Birth Target</p>
            <div className={grid2}>
              <Field label="Old Date of Birth" required><input type="date" value={form.oldDob} onChange={(e) => set('oldDob', e.target.value)} className={inputCls} /></Field>
              <Field label="New Date of Birth (Target)" required><input type="date" value={form.newDob} onChange={(e) => set('newDob', e.target.value)} className={inputCls} /></Field>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionTitleCls}>Origin & Birth</p>
            <div className={grid3}>
              <Field label="State of Origin"><input type="text" value={form.stateOfOrigin} onChange={(e) => set('stateOfOrigin', e.target.value)} placeholder="e.g. Kano" className={inputCls} /></Field>
              <Field label="LGA of Origin"><input type="text" value={form.lgaOfOrigin} onChange={(e) => set('lgaOfOrigin', e.target.value)} placeholder="e.g. Kano Municipal" className={inputCls} /></Field>
              <Field label="Town/Village of Origin"><input type="text" value={form.townVillageOfOrigin} onChange={(e) => set('townVillageOfOrigin', e.target.value)} placeholder="Town or Village" className={inputCls} /></Field>
            </div>
            <div className={grid3}>
              <Field label="Place of Birth"><input type="text" value={form.placeOfBirth} onChange={(e) => set('placeOfBirth', e.target.value)} placeholder="Place of Birth" className={inputCls} /></Field>
              <Field label="State of Birth"><input type="text" value={form.stateOfBirth} onChange={(e) => set('stateOfBirth', e.target.value)} placeholder="e.g. Lagos" className={inputCls} /></Field>
              <Field label="LGA of Birth"><input type="text" value={form.lgaOfBirth} onChange={(e) => set('lgaOfBirth', e.target.value)} placeholder="e.g. Ikeja" className={inputCls} /></Field>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionTitleCls}>Contact & Work</p>
            <Field label="Current Residential Address"><textarea value={form.currentResidentialAddress} onChange={(e) => set('currentResidentialAddress', e.target.value)} placeholder="Enter current residential address" rows={2} className={`${inputCls} resize-none`} /></Field>
            <div className={grid2}>
              <Field label="Highest Level of Education"><select value={form.highestLevelOfEducation} onChange={(e) => set('highestLevelOfEducation', e.target.value)} className={`${inputCls} bg-white`}><option value="">Select</option><option value="No Formal Education">No Formal Education</option><option value="Primary">Primary</option><option value="Secondary">Secondary</option><option value="OND/NCE">OND/NCE</option><option value="HND/BSc">HND/BSc</option><option value="Postgraduate">Postgraduate</option></select></Field>
              <Field label="Occupation"><input type="text" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="e.g. Teacher" className={inputCls} /></Field>
            </div>
            <Field label="Address of Place of Work"><textarea value={form.addressOfPlaceOfWork} onChange={(e) => set('addressOfPlaceOfWork', e.target.value)} placeholder="Enter work address" rows={2} className={`${inputCls} resize-none`} /></Field>
            <Field label="Requesting Body Address (Company/School/Embassy)"><textarea value={form.requestingBodyAddress} onChange={(e) => set('requestingBodyAddress', e.target.value)} placeholder="Enter requesting body address" rows={2} className={`${inputCls} resize-none`} /></Field>
          </div>

          <div className={sectionCls}>
            <p className={sectionTitleCls}>Father&apos;s Details</p>
            <div className={grid2}>
              <Field label="Surname"><input type="text" value={form.fatherSurname} onChange={(e) => set('fatherSurname', e.target.value)} placeholder="Father's Surname" className={inputCls} /></Field>
              <Field label="First Name"><input type="text" value={form.fatherFirstName} onChange={(e) => set('fatherFirstName', e.target.value)} placeholder="Father's First Name" className={inputCls} /></Field>
            </div>
            <div className={grid3}>
              <Field label="State of Origin"><input type="text" value={form.fatherStateOfOrigin} onChange={(e) => set('fatherStateOfOrigin', e.target.value)} placeholder="State" className={inputCls} /></Field>
              <Field label="LGA of Origin"><input type="text" value={form.fatherLgaOfOrigin} onChange={(e) => set('fatherLgaOfOrigin', e.target.value)} placeholder="LGA" className={inputCls} /></Field>
              <Field label="Village/Town"><input type="text" value={form.fatherVillageTown} onChange={(e) => set('fatherVillageTown', e.target.value)} placeholder="Village or Town" className={inputCls} /></Field>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionTitleCls}>Mother&apos;s Details</p>
            <div className={grid3}>
              <Field label="Surname"><input type="text" value={form.motherSurname} onChange={(e) => set('motherSurname', e.target.value)} placeholder="Mother's Surname" className={inputCls} /></Field>
              <Field label="First Name"><input type="text" value={form.motherFirstName} onChange={(e) => set('motherFirstName', e.target.value)} placeholder="Mother's First Name" className={inputCls} /></Field>
              <Field label="Maiden Name"><input type="text" value={form.motherMaidenName} onChange={(e) => set('motherMaidenName', e.target.value)} placeholder="Maiden Name" className={inputCls} /></Field>
            </div>
            <div className={grid3}>
              <Field label="State of Origin"><input type="text" value={form.motherStateOfOrigin} onChange={(e) => set('motherStateOfOrigin', e.target.value)} placeholder="State" className={inputCls} /></Field>
              <Field label="LGA of Origin"><input type="text" value={form.motherLgaOfOrigin} onChange={(e) => set('motherLgaOfOrigin', e.target.value)} placeholder="LGA" className={inputCls} /></Field>
              <Field label="Village/Town"><input type="text" value={form.motherVillageTown} onChange={(e) => set('motherVillageTown', e.target.value)} placeholder="Village or Town" className={inputCls} /></Field>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionTitleCls}>Document Upload</p>
            <p className="text-xs text-slate-400 mb-3">Upload supporting documents (e.g. birth certificate, affidavit). PDF, JPG, PNG — Max 5MB each.</p>
            {documents.length > 0 && (
              <div className="space-y-2 mb-3">
                {documents.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                    <FileText size={16} className="text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p></div>
                    <button type="button" onClick={() => removeFile(index)} className="p-1 hover:bg-green-100 rounded"><X size={14} className="text-slate-500" /></button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-500 hover:bg-blue-50 transition-colors">
              <Upload size={22} className="text-slate-400" />
              <span className="text-sm text-slate-500">{documents.length > 0 ? 'Add more documents' : 'Click to upload documents'}</span>
              <span className="text-xs text-slate-400">PDF, JPG, PNG — Max 5MB each</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFiles} className="hidden" />
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

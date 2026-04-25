'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { ServiceHistory } from './ServiceHistory';
import { BouncingLoader } from '../ui/BouncingLoader';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'tel' | 'number' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  transform?: (value: string) => string;
}

interface ServiceRequestFormProps {
  serviceSlug: string;
  serviceName: string;
  fields: FieldConfig[];
  /** Set to true to hide the history section (e.g. on sub-service pages where history is shown on the parent page) */
  hideHistory?: boolean;
}

export function ServiceRequestForm({ serviceSlug, serviceName, fields, hideHistory = false }: ServiceRequestFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState<{ reference: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const balance = walletData?.balance ? Number(walletData.balance) : 0;
  const service = servicesData?.services?.find((s: { slug: string; isEnabled: boolean }) => s.slug === serviceSlug && s.isEnabled);
  const price   = service ? Number(service.price) : 0;
  const canAfford = balance >= price;

  // Services data has loaded but this service is not in the enabled list — it's disabled
  const serviceDisabled = servicesData !== undefined && !service;

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.name]) {
        setError(`${field.label} is required.`);
        return;
      }
      if (field.maxLength && formData[field.name] && formData[field.name].length !== field.maxLength) {
        setError(`${field.label} must be exactly ${field.maxLength} characters.`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.post('/requests', { serviceSlug, formData });
      setSuccess({ reference: res.data.data.reference });
      // Refresh history after successful submission
      queryClient.invalidateQueries({ queryKey: ['requests', 'by-service', serviceSlug] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (serviceDisabled) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-slate-500 mb-4">{serviceName} is currently disabled. Please check back later or contact support.</p>
          <Link href="/dashboard" className="inline-block px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm hover:bg-[#0f2d4a]">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 mb-4">Your {serviceName} request has been submitted successfully.</p>
          <div className="bg-slate-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-slate-500 mb-1">Reference Number</p>
            <p className="font-mono text-sm font-medium text-slate-800">{success.reference}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(null); setFormData({}); }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
            >
              Submit Another
            </button>
          </div>
        </div>
        {!hideHistory && <ServiceHistory serviceSlug={serviceSlug} title={`${serviceName} History`} />}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {loading && <BouncingLoader message="Submitting request..." />}
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-slate-300 p-6">
        <h1 className="text-xl font-semibold text-[#0D2137] mb-1">{serviceName}</h1>

        {/* Price only */}
        <div className="py-3 border-b border-slate-200 mb-4">
          <p className="text-xs text-slate-500">Service Fee</p>
          <p className="text-lg font-bold text-[#0D2137]">₦{price.toLocaleString()}</p>
        </div>

        {!canAfford && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Insufficient balance</p>
              <p className="text-xs text-red-600">Please fund your wallet to continue.</p>
              <a href="/dashboard/wallet" className="text-xs text-red-700 underline">Fund wallet →</a>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-[#0D2137]/60 uppercase tracking-wider">Request Details</p>
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                  />
                ) : (
                  <>
                    <input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (field.transform) {
                          val = field.transform(val);
                        } else if (field.name === 'nin' || field.name === 'phoneNumber' || field.name === 'phone') {
                          val = val.replace(/\D/g, '').slice(0, 11);
                        }
                        handleChange(field.name, val);
                      }}
                      placeholder={field.placeholder}
                      maxLength={
                        field.maxLength ??
                        (field.name === 'nin' || field.name === 'phoneNumber' || field.name === 'phone' ? 11 : undefined)
                      }
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                        field.maxLength && (formData[field.name] || '').length > 0 && (formData[field.name] || '').length < field.maxLength
                          ? 'border-orange-300'
                          : field.maxLength && (formData[field.name] || '').length === field.maxLength
                          ? 'border-green-400'
                          : 'border-slate-300'
                      } ${field.name === 'trackingId' ? 'font-mono tracking-widest uppercase' : ''}`}
                    />
                    {field.maxLength && (
                      <p className={`text-xs mt-1 ${
                        (formData[field.name] || '').length === field.maxLength ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {(formData[field.name] || '').length}/{field.maxLength} characters
                        {(formData[field.name] || '').length === field.maxLength ? ' ✓' : field.patternMessage ? ` (${field.patternMessage})` : ''}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !canAfford}
            className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : `Submit Request — ₦${price.toLocaleString()}`}
          </button>
        </form>
      </div>
      </div>
      {!hideHistory && <ServiceHistory serviceSlug={serviceSlug} title={`${serviceName} History`} />}
    </div>
  );
}

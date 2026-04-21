'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, User, Clock } from 'lucide-react';
import api from '../../../../lib/api';

function getAdminCompletedLabel(serviceName?: string): string {
  if (!serviceName) return 'Validated';
  if (['IPE Clearance - Normal','IPE Clearance - Modification','IPE Clearance - Other Error'].includes(serviceName)) return 'Cleared';
  if (['NIN Modification - Name','NIN Modification - Phone Number','NIN Modification - Address','NIN Modification - Date of Birth','BVN Modification','NIN Personalization'].includes(serviceName)) return 'Modified';
  if (serviceName === 'NIN Self Service - Delinking') return 'Delinked';
  if (serviceName === 'NIN Self Service - Email Retrieval') return 'Retrieved';
  if (serviceName === 'NIN Self Service - Email & Delinking') return 'Delinked & Retrieved';
  if (serviceName === 'NIN Self Service - DOB Attestation') return 'Completed';
  return 'Validated';
}

function StatusBadge({ status, serviceName }: { status: string; serviceName?: string }) {
  const completedLabel = getAdminCompletedLabel(serviceName);
  const config: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: 'Pending',      cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    COMPLETED: { label: completedLabel, cls: 'bg-green-100 text-green-700 border-green-200' },
    REJECTED:  { label: 'Rejected',     cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, cls } = config[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-300' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>
  );
}

export default function AdminRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [action, setAction]           = useState<'complete' | 'reject' | 'reject_no_refund' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [newTrackingId, setNewTrackingId] = useState('');
  const [error, setError]               = useState('');

  const isNINModification = (name?: string) =>
    ['NIN Modification - Name','NIN Modification - Phone Number','NIN Modification - Address','NIN Modification - Date of Birth'].includes(name || '');

  const isIPEClearance = (name?: string) =>
    ['IPE Clearance - Normal','IPE Clearance - Other Error'].includes(name || '');

  const requiresNewTrackingId = (name?: string) => isNINModification(name) || isIPEClearance(name);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-request', id],
    queryFn: () => api.get(`/admin/requests/${id}`).then((r) => r.data.data),
  });

  const respond = useMutation({
    mutationFn: (body: { action: string; responseText: string }) =>
      api.patch(`/admin/requests/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-request', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-requests-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-requests-filtered'] });
      setAction(null);
      setResponseText('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to process request.');
    },
  });

  const handleSubmit = () => {
    if (!action) return;
    // For NIN Modification complete — require new tracking ID
    if (action === 'complete' && requiresNewTrackingId(req?.service?.name)) {
      if (newTrackingId.length !== 15) { setError('Tracking ID must be exactly 15 alphanumeric characters.'); return; }
      setError('');
      respond.mutate({ action, responseText: `New Tracking ID: ${newTrackingId.trim()}${responseText.trim() ? `\n${responseText.trim()}` : ''}` });
      return;
    }
    if (!responseText.trim()) return;
    setError('');
    respond.mutate({ action, responseText });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D2137]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-slate-300 p-8 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600">Request not found.</p>
          <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const req = data;
  const isPending = req.status === 'PENDING';
  const completedLabel = getAdminCompletedLabel(req.service?.name);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Request Detail</h1>
          <p className="text-slate-500 text-sm font-mono">{req.reference}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={req.status} serviceName={req.service?.name} />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* User */}
        <div className="bg-white rounded-xl border border-slate-300 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">User</p>
          </div>
          <p className="font-semibold text-slate-900">{req.user?.firstName} {req.user?.lastName}</p>
          <p className="text-sm text-slate-500">{req.user?.email}</p>
          {req.user?.phone && <p className="text-sm text-slate-500">{req.user.phone}</p>}
        </div>

        {/* Service */}
        <div className="bg-white rounded-xl border border-slate-300 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Service</p>
          </div>
          <p className="font-semibold text-slate-900">{req.service?.name}</p>
          <p className="text-sm text-slate-500">₦{Number(req.amount).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{new Date(req.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Form Data */}
      <div className="bg-white rounded-xl border border-slate-300 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Submitted Details</p>
        <div className="space-y-2">
          {req.formData && Object.entries(req.formData as Record<string, unknown>)
            .filter(([key]) => key !== 'documents')
            .map(([key, value]) => (
              <div key={key} className="flex gap-3">
                <span className="text-xs text-slate-400 w-32 shrink-0 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="text-sm text-slate-800 font-medium break-all">{String(value)}</span>
              </div>
            ))}
        </div>

        {/* Documents */}
        {req.formData?.documents && Array.isArray(req.formData.documents) && req.formData.documents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documents</p>
            <div className="space-y-2">
              {(req.formData.documents as { name: string; data: string; type: string }[]).map((doc, i) => (
                <a
                  key={i}
                  href={doc.data}
                  download={doc.name}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-[#0D2137] hover:bg-slate-100"
                >
                  ↓ {doc.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admin Response (if already processed) */}
      {req.adminResponse && (
        <div className="bg-white rounded-xl border border-slate-300 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Admin Response</p>
          <p className="text-sm text-slate-800">{req.adminResponse.text}</p>
          <p className="text-xs text-slate-400 mt-2">{new Date(req.adminResponse.respondedAt).toLocaleString()}</p>
        </div>
      )}

      {/* Action Panel — only for pending */}
      {isPending && (
        <div className="bg-white rounded-xl border border-slate-300 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Respond to Request</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setAction('complete')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                action === 'complete'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
              }`}
            >
              <CheckCircle size={15} /> {completedLabel}
            </button>
            <button
              onClick={() => setAction('reject')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                action === 'reject'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
              }`}
            >
              <XCircle size={15} /> Reject + Refund
            </button>
            <button
              onClick={() => setAction('reject_no_refund')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                action === 'reject_no_refund'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
              }`}
            >
              <XCircle size={15} /> Reject (No Refund)
            </button>
          </div>

          {action && (
            <>
              {/* NIN Modification complete — show tracking ID input */}
              {action === 'complete' && requiresNewTrackingId(req.service?.name) ? (
                <div className="space-y-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      New Tracking ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTrackingId}
                      onChange={(e) => setNewTrackingId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15).toUpperCase())}
                      placeholder="15 alphanumeric characters"
                      maxLength={15}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                        newTrackingId.length > 0 && newTrackingId.length < 15
                          ? 'border-orange-300'
                          : newTrackingId.length === 15
                          ? 'border-green-400'
                          : 'border-slate-300'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${newTrackingId.length === 15 ? 'text-green-600' : 'text-slate-400'}`}>
                      {newTrackingId.length}/15 characters{newTrackingId.length === 15 ? ' ✓' : ' (alphanumeric only)'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Additional Note (optional)</label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Any additional message for the user..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={
                    action === 'complete'
                      ? `Enter response or result for the user...`
                      : 'Enter reason for rejection...'
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none mb-3"
                />
              )}
              <button
                onClick={handleSubmit}
                disabled={respond.isPending || (action === 'complete' && requiresNewTrackingId(req.service?.name) ? newTrackingId.length !== 15 : !responseText.trim())}
                className="w-full py-2.5 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] disabled:opacity-60 transition-colors"
              >
                {respond.isPending ? 'Processing...' : 'Submit Response'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

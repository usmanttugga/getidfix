'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ClipboardList, ChevronRight, ArrowLeft, Download } from 'lucide-react';
import api from '../../../lib/api';

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
    PENDING:   { label: 'Pending',       cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    COMPLETED: { label: completedLabel,  cls: 'bg-green-100 text-green-700 border-green-200' },
    REJECTED:  { label: 'Rejected',      cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, cls } = config[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-300' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

interface ServiceRequest {
  id: string;
  reference: string;
  status: string;
  amount: number;
  createdAt: string;
  formData?: Record<string, unknown>;
  adminResponse?: { text: string; respondedAt: string } | null;
  user?: { firstName: string; lastName: string; email: string };
  service?: { name: string; category: string };
}

// Service groups — each entry is a top-level card shown on the requests page
interface ServiceGroup {
  key: string;
  label: string;
  category: string;
  // slugs that belong to this group for filtering
  serviceNames: string[];
}

const SERVICE_GROUPS: ServiceGroup[] = [
  // NIN
  { key: 'nin-verification',    label: 'NIN Verification',    category: 'NIN', serviceNames: ['NIN Verification'] },
  { key: 'nin-validation',      label: 'NIN Validation',      category: 'NIN', serviceNames: ['NIN Validation - No Record Found','NIN Validation - Bank','NIN Validation - SIM','NIN Validation - Photograph Error','NIN Validation - Immigration','NIN Validation - Modification'] },
  { key: 'ipe-clearance',       label: 'IPE Clearance',       category: 'NIN', serviceNames: ['IPE Clearance - Normal','IPE Clearance - Modification','IPE Clearance - Other Error'] },
  { key: 'nin-modification',    label: 'NIN Modification',    category: 'NIN', serviceNames: ['NIN Modification - Name','NIN Modification - Phone Number','NIN Modification - Address','NIN Modification - Date of Birth'] },
  { key: 'nin-self-service',    label: 'NIN Self Service',    category: 'NIN', serviceNames: ['NIN Self Service - Delinking','NIN Self Service - Email Retrieval','NIN Self Service - Email & Delinking','NIN Self Service - DOB Attestation'] },
  { key: 'nin-personalization', label: 'NIN Personalization', category: 'NIN', serviceNames: ['NIN Personalization'] },
  // BVN
  { key: 'bvn-verification',    label: 'BVN Verification',    category: 'BVN', serviceNames: ['BVN Verification'] },
  { key: 'bvn-retrieval',       label: 'BVN Retrieval',       category: 'BVN', serviceNames: ['BVN Retrieval'] },
  { key: 'bvn-modification',    label: 'BVN Modification',    category: 'BVN', serviceNames: ['BVN Modification'] },
  { key: 'bvn-user',            label: 'BVN User',            category: 'BVN', serviceNames: ['BVN User'] },
  // Utility
  { key: 'buy-airtime',         label: 'Airtime Purchase',    category: 'AIRTIME', serviceNames: ['Buy Airtime'] },
  { key: 'buy-data',            label: 'Data Purchase',       category: 'DATA',    serviceNames: ['Buy Data'] },
];

const CATEGORY_TABS = [
  { key: 'ALL',    label: 'All' },
  { key: 'NIN',    label: 'NIN' },
  { key: 'BVN',    label: 'BVN' },
  { key: 'AIRTIME',label: 'Airtime & Data' },
];

const CATEGORY_COLORS: Record<string, string> = {
  NIN:    'bg-slate-100 border-slate-300 text-[#0D2137]',
  BVN:    'bg-purple-50 border-purple-200 text-purple-800',
  AIRTIME:'bg-green-50 border-green-200 text-green-800',
  DATA:   'bg-green-50 border-green-200 text-green-800',
};

export default function AdminRequestsPage() {
  const [categoryTab, setCategoryTab]     = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState<ServiceGroup | null>(null);
  const [page, setPage]                   = useState(1);
  const [status, setStatus]               = useState('');
  const [globalFilter, setGlobalFilter]   = useState('');  // filter on overview cards
  // Fetch counts per service group for the overview cards
  const { data: allData } = useQuery({
    queryKey: ['admin-requests-all'],
    queryFn: () => api.get('/admin/requests?limit=1000').then((r) => r.data.data),
  });

  // Fetch filtered requests when a group is selected
  const { data: filteredData, isLoading: filteredLoading } = useQuery({
    queryKey: ['admin-requests-filtered', selectedGroup?.key, page, status],
    queryFn: () => {
      if (!selectedGroup) return null;
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      return api.get(`/admin/requests?${params}`).then((r) => r.data.data);
    },
    enabled: !!selectedGroup,
  });

  const allRequests: ServiceRequest[] = allData?.requests || [];

  // Count requests per group — respects global filter
  const countForGroup = (group: ServiceGroup) =>
    allRequests.filter((r) =>
      group.serviceNames.includes(r.service?.name || '') &&
      (globalFilter === '' || r.status === globalFilter)
    ).length;

  const pendingForGroup = (group: ServiceGroup) =>
    allRequests.filter((r) => group.serviceNames.includes(r.service?.name || '') && r.status === 'PENDING').length;

  // Filter requests for selected group
  const groupRequests: ServiceRequest[] = (filteredData?.requests || []).filter(
    (r: ServiceRequest) => selectedGroup?.serviceNames.includes(r.service?.name || '')
  );
  const total = groupRequests.length;
  const pages = Math.ceil((filteredData?.total || 0) / 20);

  // Filter groups by category tab
  const visibleGroups = SERVICE_GROUPS.filter(
    (g) => categoryTab === 'ALL' || g.category === categoryTab || (categoryTab === 'AIRTIME' && (g.category === 'AIRTIME' || g.category === 'DATA'))
  );

  // ── Export to Excel ────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!selectedGroup) return;

    const XLSX = await import('xlsx');
    const isIPE = selectedGroup.key === 'ipe-clearance';

    const pendingRequests = groupRequests.filter((r) => r.status === 'PENDING');

    const rows = pendingRequests.map((req) => {
      const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim();
      const service  = req.service?.name || '—';

      if (isIPE) {
        return {
          'User Name':   userName,
          'Service':     service,
          'Tracking ID': String(req.formData?.trackingId || '—'),
        };
      }
      return {
        'User Name':  userName,
        'Service':    service,
        'NIN Number': String(req.formData?.nin || req.formData?.NIN || '—'),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedGroup.label);

    const filename = `${selectedGroup.label.replace(/\s+/g, '_')}_Pending_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // ── Request list view ──────────────────────────────────────────────────────
  if (selectedGroup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedGroup(null); setPage(1); setStatus(''); }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{selectedGroup.label}</h1>
              <p className="text-slate-500 text-sm">Requests for this service</p>
            </div>
          </div>

          {/* Export button — only for IPE Clearance and NIN Validation */}
          {(selectedGroup.key === 'ipe-clearance' || selectedGroup.key === 'nin-validation') && (
            <button
              onClick={handleExport}
              disabled={groupRequests.filter((r) => r.status === 'PENDING').length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              Export Pending ({groupRequests.filter((r) => r.status === 'PENDING').length})
            </button>
          )}
        </div>
        {/* Status filter */}
        <div className="flex gap-3">
          {['', 'PENDING', 'COMPLETED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                status === s
                  ? 'bg-[#0D2137] text-white border-[#0D2137]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {s === '' ? 'All' : s === 'COMPLETED' ? 'Validated' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {filteredLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D2137]" />
          </div>
        ) : groupRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-300 p-12 text-center text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No requests found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Service</th>
                  {(selectedGroup.key === 'nin-validation' || selectedGroup.key === 'nin-modification') && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">NIN Number</th>
                  )}
                  {selectedGroup.key === 'nin-self-service' && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                  )}
                  {selectedGroup.key === 'nin-self-service' && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">NIN</th>
                  )}
                  {(['nin-modification','ipe-clearance','nin-personalization'].includes(selectedGroup.key)) && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tracking ID</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{req.user?.firstName} {req.user?.lastName}</p>
                      <p className="text-xs text-slate-400">{req.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{req.service?.name || '—'}</td>
                    {(selectedGroup.key === 'nin-validation' || selectedGroup.key === 'nin-modification') && (
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {String(req.formData?.nin || req.formData?.NIN || '—')}
                      </td>
                    )}
                    {selectedGroup.key === 'nin-self-service' && (
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {(() => {
                          const dobMatch = req.adminResponse?.text?.match(/^DOB Attestation completed\. Document: (.+?)\|\|(.+)$/s);
                          if (dobMatch) {
                            return (
                              <a href={dobMatch[2]} download={dobMatch[1]}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-[#0D2137] border border-slate-300 rounded text-xs font-medium hover:bg-slate-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                {dobMatch[1]}
                              </a>
                            );
                          }
                          const emailMatch = req.adminResponse?.text?.match(/Retrieved Email:\s*(.+)/);
                          if (emailMatch) return <span className="font-bold text-green-700">{emailMatch[1]}</span>;
                          return String(req.formData?.emailAddress || req.formData?.email || '—');
                        })()}
                      </td>
                    )}
                    {selectedGroup.key === 'nin-self-service' && (
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {String(req.formData?.nin || req.formData?.NIN || '—')}
                      </td>
                    )}
                    {(['nin-modification','ipe-clearance','nin-personalization'].includes(selectedGroup.key)) && (
                      <td className="px-4 py-3 font-mono text-xs">
                        {(() => {
                          const userTrackingId = String(req.formData?.trackingId || '');
                          const adminMatch = req.adminResponse?.text?.match(/New Tracking ID:\s*(.+)/);
                          const isIPE = selectedGroup.key === 'ipe-clearance';

                          if (isIPE) {
                            return (
                              <div className="flex flex-col gap-1">
                                {userTrackingId && (
                                  <div>
                                    <span className="text-xs text-slate-400 block">Submitted:</span>
                                    <span className="text-slate-700">{userTrackingId}</span>
                                  </div>
                                )}
                                {adminMatch && (
                                  <div>
                                    <span className="text-xs text-slate-400 block">New:</span>
                                    <span className="font-bold text-green-700">{adminMatch[1]}</span>
                                  </div>
                                )}
                                {!adminMatch && !userTrackingId && <span className="text-slate-400 italic">—</span>}
                              </div>
                            );
                          }

                          return adminMatch
                            ? <span className="font-bold text-green-700">{adminMatch[1]}</span>
                            : <span className="text-slate-400 italic">Pending</span>;
                        })()}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={req.status}
                        serviceName={req.service?.name}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-600">₦{Number(req.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/requests/${req.id}`} className="text-[#C9A84C] hover:underline text-xs font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-300">
                <p className="text-sm text-slate-500">Page {page} of {pages} ({total} total)</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                    Previous
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Service group overview ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Select a service to view its requests.</p>
        </div>

        {/* Global status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">Filter:</span>
          {[
            { value: '',          label: 'All' },
            { value: 'PENDING',   label: 'Pending' },
            { value: 'COMPLETED', label: 'Validated' },
            { value: 'REJECTED',  label: 'Rejected' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setGlobalFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                globalFilter === f.value
                  ? f.value === 'PENDING'   ? 'bg-yellow-500 text-white border-yellow-500'
                  : f.value === 'COMPLETED' ? 'bg-green-600 text-white border-green-600'
                  : f.value === 'REJECTED'  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-[#0D2137] text-white border-[#0D2137]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
              {f.value !== '' && (
                <span className="ml-1.5 text-xs opacity-80">
                  ({allRequests.filter((r) => r.status === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 border-b border-slate-300 pb-0">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategoryTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              categoryTab === tab.key
                ? 'border-[#0D2137] text-[#C9A84C]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Service group cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleGroups.filter((group) => globalFilter === '' || countForGroup(group) > 0).length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl border border-slate-300 p-12 text-center text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No {globalFilter === 'PENDING' ? 'pending' : globalFilter === 'COMPLETED' ? 'validated' : 'rejected'} requests found</p>
          </div>
        ) : (
          visibleGroups
            .filter((group) => globalFilter === '' || countForGroup(group) > 0)
            .map((group) => {
          const total   = countForGroup(group);
          const pending = pendingForGroup(group);
          const colorClass = CATEGORY_COLORS[group.category] || 'bg-slate-50 border-slate-300 text-slate-800';

          return (
            <button
              key={group.key}
              onClick={() => { setSelectedGroup(group); setPage(1); setStatus(globalFilter); }}
              className="bg-white border border-slate-300 rounded-xl p-5 text-left hover:border-slate-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                  {group.category}
                </span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors mt-0.5" />
              </div>
              <p className="font-semibold text-slate-900 mb-1">{group.label}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-slate-500">{total} total</span>
                {pending > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full text-xs font-medium">
                    {pending} pending
                  </span>
                )}
                {total === 0 && (
                  <span className="text-xs text-slate-400">No requests yet</span>
                )}
              </div>
            </button>
          );
        }))}
      </div>
    </div>
  );
}

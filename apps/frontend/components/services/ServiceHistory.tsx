'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../lib/api';

interface ServiceRequest {
  id: string;
  reference: string;
  status: string;
  amount: number;
  createdAt: string;
  formData: Record<string, unknown>;
  adminResponse?: { text: string; fileUrl?: string; respondedAt: string } | null;
  service?: { name: string; slug: string };
}

// Modification service slugs
const MODIFICATION_SLUGS = [
  'nin-modification-name','nin-modification-phone','nin-modification-address','nin-modification-dob',
  'bvn-modification',
  'nin-personalization',
];

const IPE_SLUGS = [
  'ipe-clearance-normal','ipe-clearance-modification','ipe-clearance-other-error',
];

function isModification(slug?: string) { return MODIFICATION_SLUGS.includes(slug || ''); }
function isIPEClearance(slug?: string) { return IPE_SLUGS.includes(slug || ''); }

function getCompletedLabel(slug?: string) {
  if (isIPEClearance(slug)) return 'Cleared';
  if (isModification(slug)) return 'Modified';
  if (slug === 'nin-verification' || slug === 'nin-verification-vnin') return 'Verified';
  if (slug === 'nin-self-service-delinking') return 'Delinked';
  if (slug === 'nin-self-service-email-retrieval') return 'Retrieved';
  if (slug === 'nin-self-service-email-delinking') return 'Delinked & Retrieved';
  if (slug === 'nin-self-service-dob-attestation') return 'Completed';
  return 'Validated';
}

function StatusBadge({ status, slug }: { status: string; slug?: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: 'Submitted',              cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    COMPLETED: { label: getCompletedLabel(slug),  cls: 'bg-green-100 text-green-700 border-green-200' },
    REJECTED:  { label: 'Rejected',               cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const c = config[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-300' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${c.cls}`}>
      {c.label}
    </span>
  );
}

interface ServiceHistoryProps {
  /** Single slug or array of slugs to filter history by */
  serviceSlug: string | string[];
  /** Display title e.g. "NIN Validation History" */
  title?: string;
  /** Show NIN Number column — for NIN validation services */
  showNin?: boolean;
  /** Show Tracking ID in the NIN Number column — for modification services */
  showTracking?: boolean;
  /** Column header label override for the extra column */
  extraColLabel?: string;
  /** Show Email column — for Delinking service */
  showEmail?: boolean;
}

export function ServiceHistory({ serviceSlug, title, showNin = false, showTracking = false, extraColLabel, showEmail = false }: ServiceHistoryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const slugs = Array.isArray(serviceSlug) ? serviceSlug : [serviceSlug];
  const showExtraCol = showNin || showTracking;
  const colHeader = extraColLabel || (showTracking ? 'Tracking ID' : 'NIN Number');

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'by-service', slugs.join(',')],
    queryFn: () =>
      api.get(`/requests?limit=50`).then((r) => {
        const all: ServiceRequest[] = r.data.data?.requests || [];
        return all.filter((req) => req.service?.slug && slugs.some((s) => req.service!.slug.startsWith(s) || req.service!.slug === s));
      }),
  });

  const requests = data || [];

  if (isLoading) {
    return (
      <div className="mt-8 pt-6 border-t border-slate-300">
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-slate-300 max-w-none w-full">
      <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <ClipboardList size={16} className="text-slate-400" />
        {title || 'Request History'}
      </h2>

      {requests.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-300 p-6 text-center text-slate-400">
          <p className="text-sm">No history yet. Submit a request above to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-300 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[120px]">Reference</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[180px]">Service</th>
                {showEmail && (
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[160px]">Email</th>
                )}
                {showEmail && (
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[120px]">NIN</th>
                )}
                {showExtraCol && (
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[140px]">
                    {colHeader}
                  </th>
                )}
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[100px]">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[180px]">Reason</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[90px]">Amount</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-[90px] hidden md:table-cell">Date</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => (
                <>
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                  >
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs align-top w-[120px]">
                      {req.reference.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700 font-medium text-xs max-w-[180px]">
                      {req.service?.name || '—'}
                    </td>
                    {showEmail && (
                      <td className="px-4 py-3 align-top text-xs text-slate-700 w-[160px]">
                        {(() => {
                          // DOB Attestation — show download link
                          const dobMatch = req.adminResponse?.text?.match(/^DOB Attestation completed\. Document: (.+?)\|\|(.+)$/s);
                          if (dobMatch) {
                            return (
                              <a href={dobMatch[2]} download={dobMatch[1]}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium hover:bg-blue-100">
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                {dobMatch[1]}
                              </a>
                            );
                          }
                          // Email Retrieval — show retrieved email from admin response
                          const emailMatch = req.adminResponse?.text?.match(/Retrieved Email:\s*(.+)/);
                          if (emailMatch) return <span className="font-bold text-green-700">{emailMatch[1]}</span>;
                          // Delinking — show submitted email
                          return String(req.formData?.emailAddress || req.formData?.email || '—');
                        })()}
                      </td>
                    )}
                    {showEmail && (
                      <td className="px-4 py-3 align-top font-mono text-xs text-slate-700 w-[120px]">
                        {String(req.formData?.nin || req.formData?.NIN || '—')}
                      </td>
                    )}
                    {showExtraCol && (
                      <td className="px-4 py-3 align-top font-mono text-xs text-slate-700 w-[140px]">
                        {(() => {
                          if (showTracking) {
                            const userTrackingId = String(req.formData?.trackingId || '');
                            const trackingMatch = req.adminResponse?.text?.match(/New Tracking ID:\s*(.+)/);
                            const isIPE = req.service?.slug?.startsWith('ipe-clearance');

                            if (isIPE) {
                              return (
                                <div className="flex flex-col gap-1">
                                  {userTrackingId && (
                                    <div>
                                      <span className="text-xs text-slate-400 block">Submitted:</span>
                                      <span>{userTrackingId}</span>
                                    </div>
                                  )}
                                  {trackingMatch && (
                                    <div>
                                      <span className="text-xs text-slate-400 block">New:</span>
                                      <span className="font-bold text-green-700">{trackingMatch[1]}</span>
                                    </div>
                                  )}
                                  {!userTrackingId && !trackingMatch && <span className="text-slate-400">—</span>}
                                </div>
                              );
                            }

                            // For non-IPE modification: show new tracking ID from admin
                            if (trackingMatch) {
                              return <span className="font-bold text-green-700">{trackingMatch[1]}</span>;
                            }
                          }
                          // NIN validation: show NIN number
                          return String(req.formData?.nin || req.formData?.NIN || '—');
                        })()}
                      </td>
                    )}
                    <td className="px-4 py-3 align-top w-[100px]"><StatusBadge status={req.status} slug={req.service?.slug} /></td>
                    <td className="px-4 py-3 align-top w-[180px]">
                      {req.status === 'REJECTED' && req.adminResponse?.text ? (
                        <span className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                          {req.adminResponse.text}
                        </span>
                      ) : req.status === 'PENDING' ? (
                        <span className="text-xs text-slate-400 italic">Awaiting response</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-medium align-top w-[90px]">
                      ₦{Number(req.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 hidden md:table-cell align-top w-[90px]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400 align-top w-8">
                      {expanded === req.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                  </tr>

                  {expanded === req.id && (
                    <tr key={`${req.id}-detail`}>
                      <td colSpan={showExtraCol ? 8 : showEmail ? 9 : 7} className="px-4 py-4 bg-slate-50 border-t border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Submitted Data</p>
                            <div className="space-y-1">
                              {Object.entries(req.formData || {}).map(([k, v]) => {
                                const strVal = String(v);
                                const isFile = strVal.startsWith('data:');
                                return (
                                  <div key={k} className="flex gap-2 text-sm">
                                    <span className="text-slate-500 capitalize min-w-[80px]">{k}:</span>
                                    {isFile ? (
                                      <span className="text-[#C9A84C] text-xs italic">[Document attached]</span>
                                    ) : (
                                      <span className="text-slate-800 font-medium">{strVal}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {req.adminResponse ? (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Admin Response</p>
                              {(() => {
                                const dobMatch = req.adminResponse.text?.match(/^DOB Attestation completed\. Document: (.+?)\|\|(.+)$/s);
                                const trackingMatch = req.adminResponse.text.match(/New Tracking ID:\s*(.+)/);
                                if (dobMatch) {
                                  const fileName = dobMatch[1];
                                  const base64   = dobMatch[2];
                                  const isImage  = base64.startsWith('data:image/');
                                  return (
                                    <div className="space-y-2">
                                      <p className="text-sm text-slate-800">DOB Attestation completed.</p>
                                      {isImage && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={base64} alt="Attestation" className="max-w-[160px] rounded-lg border border-slate-300" />
                                      )}
                                      <a href={base64} download={fileName}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 w-fit">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                        Download {fileName}
                                      </a>
                                    </div>
                                  );
                                }
                                if (trackingMatch) {
                                  return (
                                    <div className="space-y-1">
                                      <p className="text-sm text-slate-800">Request modified successfully.</p>
                                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg mt-1">
                                        <span className="text-xs font-medium text-green-700">New Tracking ID:</span>
                                        <span className="text-sm font-bold text-green-800 font-mono">{trackingMatch[1]}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                return <p className="text-sm text-slate-800">{req.adminResponse.text}</p>;
                              })()}
                              <p className="text-xs text-slate-400 mt-1">
                                Responded: {new Date(req.adminResponse.respondedAt).toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Admin Response</p>
                              <p className="text-sm text-slate-400 italic">Awaiting admin response...</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

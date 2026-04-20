'use client';

import { CheckCircle, PenLine, AlertTriangle } from 'lucide-react';
import { ServiceHistory } from '../../../../components/services/ServiceHistory';
import { ServiceMethodGrid } from '../../../../components/services/ServiceMethodGrid';

const methods = [
  { label: 'Normal IPE Clearance',       desc: 'Standard IPE clearance for identity pre-enrollment',    href: '/dashboard/nin/ipe-clearance/normal',       slug: 'ipe-clearance-normal',       icon: <CheckCircle size={22} className="text-green-600" />,   iconBg: 'bg-green-50' },
  { label: 'Modification IPE Clearance', desc: 'IPE clearance following a NIN modification request',    href: '/dashboard/nin/ipe-clearance/modification',  slug: 'ipe-clearance-modification', icon: <PenLine size={22} className="text-[#C9A84C]" />,        iconBg: 'bg-blue-50' },
  { label: 'Other Error',                desc: 'IPE clearance for other error types',                   href: '/dashboard/nin/ipe-clearance/other-error',   slug: 'ipe-clearance-other-error',  icon: <AlertTriangle size={22} className="text-orange-600" />, iconBg: 'bg-orange-50' },
];

export default function IPEClearancePage() {
  return (
    <div>
      <div className="max-w-2xl mb-6">
        <h1 className="text-2xl font-bold text-slate-900">IPE Clearance</h1>
        <p className="text-slate-500 text-sm mt-1">Choose an IPE clearance type to proceed.</p>
      </div>

      <ServiceMethodGrid methods={methods} />

      <ServiceHistory
        serviceSlug={['ipe-clearance-normal','ipe-clearance-modification','ipe-clearance-other-error']}
        title="IPE Clearance History"
        showTracking
        extraColLabel="Tracking ID"
      />
    </div>
  );
}

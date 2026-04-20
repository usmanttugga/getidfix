'use client';

import { FileX, Building2, Camera, Smartphone, PenLine, Globe } from 'lucide-react';
import { ServiceHistory } from '../../../../components/services/ServiceHistory';
import { ServiceMethodGrid } from '../../../../components/services/ServiceMethodGrid';

const methods = [
  { label: 'No Record Found',       desc: 'Validate NIN when no record is found in the system', href: '/dashboard/nin/validation/no-record',    slug: 'nin-validation-no-record',    icon: <FileX size={22} className="text-red-600" />,      iconBg: 'bg-red-50' },
  { label: 'Bank Validation',       desc: 'Validate NIN against bank records',                  href: '/dashboard/nin/validation/bank',           slug: 'nin-validation-bank',         icon: <Building2 size={22} className="text-[#C9A84C]" />, iconBg: 'bg-blue-50' },
  { label: 'Photograph Error',      desc: 'Validate NIN with photograph discrepancy',           href: '/dashboard/nin/validation/photograph',      slug: 'nin-validation-photograph',   icon: <Camera size={22} className="text-orange-600" />, iconBg: 'bg-orange-50' },
  { label: 'SIM Validation',        desc: 'Validate NIN against SIM card registration',        href: '/dashboard/nin/validation/sim',             slug: 'nin-validation-sim',          icon: <Smartphone size={22} className="text-green-600" />, iconBg: 'bg-green-50' },
  { label: 'Modification Validation',desc: 'Validate NIN after a modification request',        href: '/dashboard/nin/validation/modification',    slug: 'nin-validation-modification', icon: <PenLine size={22} className="text-purple-600" />, iconBg: 'bg-purple-50' },
  { label: 'Immigration Validation', desc: 'Validate NIN against immigration records',         href: '/dashboard/nin/validation/immigration',     slug: 'nin-validation-immigration',  icon: <Globe size={22} className="text-teal-600" />,    iconBg: 'bg-teal-50' },
];

export default function NINValidationPage() {
  return (
    <div>
      <div className="max-w-2xl mb-6">
        <h1 className="text-2xl font-bold text-slate-900">NIN Validation</h1>
        <p className="text-slate-500 text-sm mt-1">Choose a validation type to validate a National Identification Number.</p>
      </div>

      <ServiceMethodGrid methods={methods} />

      <ServiceHistory
        serviceSlug={['nin-validation-no-record','nin-validation-bank','nin-validation-photograph','nin-validation-sim','nin-validation-modification','nin-validation-immigration']}
        title="NIN Validation History"
        showNin
      />
    </div>
  );
}

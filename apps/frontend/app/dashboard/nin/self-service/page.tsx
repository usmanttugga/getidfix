'use client';

import { Link2Off, Mail, MailCheck, Calendar } from 'lucide-react';
import { ServiceHistory } from '../../../../components/services/ServiceHistory';
import { ServiceMethodGrid } from '../../../../components/services/ServiceMethodGrid';

const methods = [
  { label: 'Delinking',                   desc: 'Request delinking of your NIN from a phone number or service', href: '/dashboard/nin/self-service/delinking',                slug: 'nin-self-service-delinking',       icon: <Link2Off size={22} className="text-red-600" />,    iconBg: 'bg-red-50' },
  { label: 'Email Retrieval Only',        desc: 'Retrieve the email address linked to your NIN record',        href: '/dashboard/nin/self-service/email-retrieval',          slug: 'nin-self-service-email-retrieval', icon: <Mail size={22} className="text-[#C9A84C]" />,      iconBg: 'bg-blue-50' },
  { label: 'Email Retrieval & Delinking', desc: 'Retrieve your email and delink it from your NIN record',     href: '/dashboard/nin/self-service/email-retrieval-delinking', slug: 'nin-self-service-email-delinking', icon: <MailCheck size={22} className="text-purple-600" />, iconBg: 'bg-purple-50' },
  { label: 'Date of Birth Attestation',   desc: 'Request attestation of your date of birth on NIN record',    href: '/dashboard/nin/self-service/dob-attestation',          slug: 'nin-self-service-dob-attestation', icon: <Calendar size={22} className="text-green-600" />, iconBg: 'bg-green-50' },
];

export default function NINSelfServicePage() {
  return (
    <div>
      <div className="max-w-2xl mb-6">
        <h1 className="text-2xl font-bold text-slate-900">NIN Self Service</h1>
        <p className="text-slate-500 text-sm mt-1">Choose a self-service action to proceed.</p>
      </div>

      <ServiceMethodGrid methods={methods} />

      <ServiceHistory
        serviceSlug={['nin-self-service-delinking','nin-self-service-email-retrieval','nin-self-service-email-delinking','nin-self-service-dob-attestation']}
        title="NIN Self Service History"
        showEmail
      />
    </div>
  );
}

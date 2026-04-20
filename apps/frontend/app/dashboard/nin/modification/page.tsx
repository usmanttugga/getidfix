'use client';

import { User, Phone, MapPin, Calendar } from 'lucide-react';
import { ServiceHistory } from '../../../../components/services/ServiceHistory';
import { ServiceMethodGrid } from '../../../../components/services/ServiceMethodGrid';

const methods = [
  { label: 'Name Modification',          desc: 'Correct or update your first name or last name on NIN record', href: '/dashboard/nin/modification/name',  slug: 'nin-modification-name',  icon: <User size={22} className="text-[#C9A84C]" />,     iconBg: 'bg-blue-50' },
  { label: 'Phone Number Modification',  desc: 'Update the phone number linked to your NIN record',           href: '/dashboard/nin/modification/phone', slug: 'nin-modification-phone', icon: <Phone size={22} className="text-green-600" />,   iconBg: 'bg-green-50' },
  { label: 'Address Modification',       desc: 'Update the address associated with your NIN record',          href: '/dashboard/nin/modification/address',slug: 'nin-modification-address',icon: <MapPin size={22} className="text-orange-600" />, iconBg: 'bg-orange-50' },
  { label: 'Date of Birth Modification', desc: 'Correct the date of birth on your NIN record',               href: '/dashboard/nin/modification/dob',   slug: 'nin-modification-dob',   icon: <Calendar size={22} className="text-purple-600" />, iconBg: 'bg-purple-50' },
];

export default function NINModificationPage() {
  return (
    <div>
      <div className="max-w-2xl mb-6">
        <h1 className="text-2xl font-bold text-slate-900">NIN Modification</h1>
        <p className="text-slate-500 text-sm mt-1">Choose the type of modification you want to request.</p>
      </div>

      <ServiceMethodGrid methods={methods} />

      <ServiceHistory
        serviceSlug={['nin-modification-name','nin-modification-phone','nin-modification-address','nin-modification-dob']}
        title="NIN Modification History"
        showTracking
      />
    </div>
  );
}

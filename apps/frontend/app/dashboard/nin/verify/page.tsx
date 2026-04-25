'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, Phone, Calendar, Fingerprint } from 'lucide-react';
import { ServiceHistory } from '../../../../components/services/ServiceHistory';
import { BouncingLoader } from '../../../../components/ui/BouncingLoader';

const methods = [
  {
    label: 'Verify by NIN',
    desc: 'Enter an 11-digit National Identification Number',
    href: '/dashboard/nin/verify/by-nin',
    icon: <Hash size={22} className="text-[#C9A84C]" />,
    iconBg: 'bg-blue-50',
  },
  {
    label: 'Verify by Phone Number',
    desc: 'Look up identity using a registered phone number',
    href: '/dashboard/nin/verify/by-phone',
    icon: <Phone size={22} className="text-green-600" />,
    iconBg: 'bg-green-50',
  },
  {
    label: 'Verify by Bio Data',
    desc: 'Verify identity using First Name, Last Name, Gender and Date of Birth',
    href: '/dashboard/nin/verify/by-dob',
    icon: <Calendar size={22} className="text-orange-600" />,
    iconBg: 'bg-orange-50',
  },
  {
    label: 'Verify by VNIN',
    desc: 'Use a Virtual NIN token for secure verification',
    href: '/dashboard/nin/verify/by-vnin',
    icon: <Fingerprint size={22} className="text-purple-600" />,
    iconBg: 'bg-purple-50',
  },
];

export default function NINVerifyPage() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const navigate = (href: string) => {
    setNavigating(true);
    router.push(href);
  };

  return (
    <div>
      {navigating && <BouncingLoader message="Loading service..." />}

      <div className="max-w-2xl mb-6">
        <h1 className="text-2xl font-bold text-slate-900">NIN Verification</h1>
        <p className="text-slate-500 text-sm mt-1">
          Choose a verification method to verify a National Identification Number.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {methods.map((m) => (
          <button
            key={m.href}
            onClick={() => navigate(m.href)}
            className="bg-gradient-to-br from-[#0D2137]/5 to-[#0D2137]/10 border border-slate-300 rounded-xl p-5 hover:from-[#0D2137]/10 hover:to-[#0D2137]/20 hover:border-slate-400 hover:shadow-md transition-all group flex items-start gap-4 text-left w-full"
          >
            <div className={`p-3 rounded-xl ${m.iconBg} shrink-0`}>{m.icon}</div>
            <div>
              <p className="font-semibold text-[#0D2137] group-hover:text-[#0f2d4a] transition-colors">
                {m.label}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <ServiceHistory
        serviceSlug={['nin-verification', 'nin-verification-vnin']}
        title="NIN Verification History"
        showNin
      />
    </div>
  );
}

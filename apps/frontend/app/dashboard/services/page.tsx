'use client';

import Link from 'next/link';
import { Shield, CreditCard, Smartphone, Wifi } from 'lucide-react';

const serviceGroups = [
  {
    category: 'NIN Services',
    icon: <Shield size={20} className="text-[#C9A84C]" />,
    color: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
    services: [
      { name: 'NIN Verification',  href: '/dashboard/nin/verify',          desc: 'Verify by NIN · Phone Number · Bio Data · VNIN' },
      { name: 'NIN Validation',    href: '/dashboard/nin/validation',       desc: 'Validate NIN against personal details' },
      { name: 'NIN Modification',  href: '/dashboard/nin/modification',     desc: 'Request correction of NIN record data' },
      { name: 'IPE Clearance',     href: '/dashboard/nin/ipe-clearance',    desc: 'Clear identity pre-enrollment flags' },
      { name: 'Self Service',      href: '/dashboard/nin/self-service',     desc: 'Perform NIN self-service actions' },
      { name: 'Personalization',   href: '/dashboard/nin/personalization',  desc: 'Update personal data on NIN record' },
    ],
  },
  {
    category: 'BVN Services',
    icon: <CreditCard size={20} className="text-purple-600" />,
    color: 'bg-purple-50 border-purple-100',
    iconBg: 'bg-purple-100',
    services: [
      { name: 'BVN Verification',  href: '/dashboard/bvn/verification',    desc: 'Verify a BVN against bank records' },
      { name: 'BVN Retrieval',     href: '/dashboard/bvn/retrieval',        desc: 'Retrieve a BVN using identity details' },
      { name: 'BVN Modification',  href: '/dashboard/bvn/modification',     desc: 'Request correction of BVN record data' },
      { name: 'BVN User',          href: '/dashboard/bvn/user',             desc: 'Link or query a BVN to a user profile' },
    ],
  },
  {
    category: 'Airtime & Data',
    icon: <Smartphone size={20} className="text-green-600" />,
    color: 'bg-green-50 border-green-100',
    iconBg: 'bg-green-100',
    services: [
      { name: 'Buy Airtime',  href: '/dashboard/airtime',  desc: 'Top up any Nigerian mobile number' },
      { name: 'Buy Data',     href: '/dashboard/data',      desc: 'Purchase data bundles for any network' },
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Services</h1>
        <p className="text-slate-500 text-sm mt-1">Select a service to get started.</p>
      </div>

      {serviceGroups.map((group) => (
        <div key={group.category}>
          {/* Category header */}
          <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border ${group.color} w-fit`}>
            <div className={`p-1.5 rounded-md ${group.iconBg}`}>{group.icon}</div>
            <h2 className="font-semibold text-slate-800 text-sm">{group.category}</h2>
          </div>

          {/* Service cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {group.services.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="bg-white border border-slate-300 rounded-xl p-4 hover:border-slate-400 hover:shadow-sm transition-all group"
              >
                <p className="font-medium text-slate-800 text-sm group-hover:text-[#0D2137] transition-colors">
                  {service.name}
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{service.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

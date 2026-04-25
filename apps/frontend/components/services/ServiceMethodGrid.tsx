'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { BouncingLoader } from '../ui/BouncingLoader';

interface Method {
  label: string;
  desc: string;
  href: string;
  slug: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface ServiceMethodGridProps {
  methods: Method[];
}

export function ServiceMethodGrid({ methods }: ServiceMethodGridProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const getPrice = (slug: string): string | null => {
    const svc = servicesData?.services?.find((s: { slug: string }) => s.slug === slug);
    return svc ? `₦${Number(svc.price).toLocaleString()}` : null;
  };

  const navigate = (href: string) => {
    setNavigating(true);
    router.push(href);
  };

  return (
    <>
      {navigating && <BouncingLoader message="Loading service..." />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {methods.map((m) => {
          const price = getPrice(m.slug);
          return (
            <button
              key={m.href}
              onClick={() => navigate(m.href)}
              className="bg-gradient-to-br from-[#0D2137]/5 to-[#0D2137]/10 border border-slate-300 rounded-xl p-5 hover:from-[#0D2137]/10 hover:to-[#0D2137]/20 hover:border-slate-400 hover:shadow-md transition-all group flex items-start gap-4 text-left w-full"
            >
              <div className={`p-3 rounded-xl ${m.iconBg} shrink-0`}>{m.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#0D2137] group-hover:text-[#0f2d4a] transition-colors">
                  {m.label}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                {price && (
                  <p className="text-xs font-bold text-[#0D2137] mt-2">{price}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { ServiceGrid } from '../../../../components/services/ServiceGrid';
import api from '../../../../lib/api';

export default function NinServicesPage() {
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const ninServices = (servicesData?.services || []).filter(
    (s: { category: string }) => s.category === 'NIN'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Shield size={22} className="text-[#C9A84C]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">NIN Services</h1>
          <p className="text-slate-500 text-sm">National Identification Number services</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <ServiceGrid services={ninServices} />
      )}
    </div>
  );
}

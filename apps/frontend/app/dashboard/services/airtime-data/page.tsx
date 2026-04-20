'use client';

import { useQuery } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { ServiceGrid } from '../../../../components/services/ServiceGrid';
import api from '../../../../lib/api';

export default function AirtimeDataPage() {
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then((r) => r.data.data),
  });

  const airtimeDataServices = (servicesData?.services || []).filter(
    (s: { category: string }) => s.category === 'AIRTIME' || s.category === 'DATA'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Smartphone size={22} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Airtime & Data</h1>
          <p className="text-slate-500 text-sm">Purchase airtime and data bundles</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
        </div>
      ) : (
        <ServiceGrid services={airtimeDataServices} />
      )}
    </div>
  );
}

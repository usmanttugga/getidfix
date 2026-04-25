'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import api from '../../lib/api';

export function WhatsAppFloatingButton() {
  const { data } = useQuery({
    queryKey: ['settings-support'],
    queryFn: () => api.get('/settings/support').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const link = data?.whatsappGroupLink || '';
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-full shadow-lg transition-all"
    >
      <MessageCircle size={20} />
      <span className="text-sm font-semibold hidden sm:inline">Join WhatsApp Group</span>
    </a>
  );
}

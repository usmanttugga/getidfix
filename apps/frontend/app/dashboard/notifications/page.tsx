'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../../../lib/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = async () => {
    const unread = (data?.notifications || []).filter((n: Notification) => !n.isRead);
    await Promise.all(unread.map((n: Notification) => api.patch(`/notifications/${n.id}/read`)));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-300 p-12 text-center text-slate-400">
          <Bell size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">You&apos;ll see updates about your requests and wallet here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.isRead && markRead.mutate(notif.id)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${
                notif.isRead
                  ? 'border-slate-300 opacity-70'
                  : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.isRead ? 'bg-slate-300' : 'bg-blue-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${notif.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                      {notif.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">{notif.body}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(notif.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

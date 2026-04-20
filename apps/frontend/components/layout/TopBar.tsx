'use client';

import { useEffect, useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

export function TopBar() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.get('/notifications')
      .then((res) => setUnreadCount(res.data.data.unreadCount))
      .catch(() => {});
  }, [user]);

  return (
    <header className="h-14 bg-[#0D2137] border-b border-[#1a3550] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-2 lg:hidden">
        {/* Space for mobile menu button */}
        <div className="w-8" />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <a href={user?.role === 'ADMIN' ? '#' : '/dashboard/notifications'} className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </a>

        {/* User name — clickable to profile */}
        {user && (
          <a
            href={user.role === 'ADMIN' ? '/admin' : '/dashboard/profile'}
            className="text-sm font-medium text-slate-200 hidden sm:block hover:text-[#C9A84C] transition-colors cursor-pointer"
          >
            {user.firstName} {user.lastName}
          </a>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
}

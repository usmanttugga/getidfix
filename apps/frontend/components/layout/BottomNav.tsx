'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Layers, Bell, HeadphonesIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Home',     href: '/dashboard',               icon: LayoutDashboard },
  { label: 'Wallet',   href: '/dashboard/wallet',         icon: Wallet },
  { label: 'Services', href: '/dashboard/services/nin',   icon: Layers },
  { label: 'Alerts',   href: '/dashboard/notifications',  icon: Bell },
  { label: 'Support',  href: '/dashboard/support',        icon: HeadphonesIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/services/nin') {
      return pathname.startsWith('/dashboard/nin') ||
             pathname.startsWith('/dashboard/bvn') ||
             pathname.startsWith('/dashboard/airtime') ||
             pathname.startsWith('/dashboard/data') ||
             pathname.startsWith('/dashboard/services');
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D2137] border-t border-[#1a3550] safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]',
                active ? 'text-[#C9A84C]' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-[#C9A84C] mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

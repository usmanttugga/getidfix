'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Users, DollarSign, CheckSquare, Settings } from 'lucide-react';
import { GetIdfixLogo } from '../brand/GetIdfixLogo';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Dashboard',    href: '/admin',              icon: <LayoutDashboard size={18} /> },
  { label: 'Requests',     href: '/admin/requests',     icon: <ClipboardList size={18} /> },
  { label: 'Users',        href: '/admin/users',        icon: <Users size={18} /> },
  { label: 'Pricing',      href: '/admin/pricing',      icon: <DollarSign size={18} /> },
  { label: 'Availability', href: '/admin/availability', icon: <CheckSquare size={18} /> },
  { label: 'Settings',     href: '/admin/settings',     icon: <Settings size={18} /> },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-[#0D2137] to-[#091929] border-r border-[#1a3550] h-screen sticky top-0">
      <div className="p-4 border-b border-[#1a3550]">
        <GetIdfixLogo />
        <span className="mt-1 block text-xs text-[#C9A84C] font-medium uppercase tracking-wider">Admin Panel</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            )}
          >
            {item.icon}{item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, Layers, Bell,
  X, Menu, ChevronDown, ChevronRight, Shield, CreditCard, Smartphone, HeadphonesIcon,
} from 'lucide-react';
import { GetIdfixLogo } from '../brand/GetIdfixLogo';
import { cn } from '../../lib/utils';

const navItems = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Wallet',
    href: '/dashboard/wallet',
    icon: <Wallet size={18} />,
  },
  {
    label: 'Services',
    icon: <Layers size={18} />,
    children: [
      {
        label: 'NIN Services',
        href: '/dashboard/services/nin',
        icon: <Shield size={16} />,
      },
      {
        label: 'BVN Services',
        href: '/dashboard/services/bvn',
        icon: <CreditCard size={16} />,
      },
      {
        label: 'Airtime & Data',
        href: '/dashboard/services/airtime-data',
        icon: <Smartphone size={16} />,
      },
    ],
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: <Bell size={18} />,
  },
  {
    label: 'Support',
    href: '/dashboard/support',
    icon: <HeadphonesIcon size={18} />,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [servicesOpen, setServicesOpen] = useState(
    pathname.startsWith('/dashboard/services') ||
    pathname.startsWith('/dashboard/nin') ||
    pathname.startsWith('/dashboard/bvn') ||
    pathname.startsWith('/dashboard/airtime') ||
    pathname.startsWith('/dashboard/data')
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const isServicesActive =
    pathname.startsWith('/dashboard/services') ||
    pathname.startsWith('/dashboard/nin') ||
    pathname.startsWith('/dashboard/bvn') ||
    pathname.startsWith('/dashboard/airtime') ||
    pathname.startsWith('/dashboard/data');

  const isChildActive = (href: string) => {
    if (href === '/dashboard/services/nin') {
      return pathname.startsWith('/dashboard/nin') || pathname === '/dashboard/services/nin';
    }
    if (href === '/dashboard/services/bvn') {
      return pathname.startsWith('/dashboard/bvn') || pathname === '/dashboard/services/bvn';
    }
    if (href === '/dashboard/services/airtime-data') {
      return (
        pathname.startsWith('/dashboard/airtime') ||
        pathname.startsWith('/dashboard/data') ||
        pathname === '/dashboard/services/airtime-data'
      );
    }
    return pathname === href;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#1a3550]">
        <GetIdfixLogo />
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setServicesOpen((o) => !o)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isServicesActive
                      ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                  {servicesOpen
                    ? <ChevronDown size={14} />
                    : <ChevronRight size={14} />}
                </button>

                {servicesOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isChildActive(child.href)
                            ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-[#0D2137] to-[#091929] shadow-xl z-40 transition-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-[#0D2137] to-[#091929] border-r border-[#1a3550] h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}

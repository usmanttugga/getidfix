'use client';

import { useAuth } from '../../../contexts/AuthContext';
import { User, Mail, Phone, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Your account information.</p>
      </div>

      {/* Avatar + name */}
      <div className="bg-gradient-to-r from-[#0D2137] via-[#0f2d4a] to-[#1a3a2a] rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-[#0D2137]">{initials}</span>
        </div>
        <div>
          <p className="text-xl font-bold">{user.firstName} {user.lastName}</p>
          <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.role === 'ADMIN'
              ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
              : 'bg-white/10 text-white/70'
          }`}>
            {user.role === 'ADMIN' ? 'Administrator' : 'User'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-slate-300 divide-y divide-slate-100">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
            <User size={18} className="text-[#C9A84C]" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Full Name</p>
            <p className="font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="p-2.5 bg-green-50 rounded-xl shrink-0">
            <Mail size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Email Address</p>
            <p className="font-semibold text-slate-900">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="p-2.5 bg-orange-50 rounded-xl shrink-0">
            <Phone size={18} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Phone Number</p>
            <p className="font-semibold text-slate-900">{(user as { phone?: string }).phone || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="p-2.5 bg-purple-50 rounded-xl shrink-0">
            <Shield size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Account Role</p>
            <p className="font-semibold text-slate-900">{user.role === 'ADMIN' ? 'Administrator' : 'User'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

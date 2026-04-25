'use client';

import { GetIdfixLogo } from '../brand/GetIdfixLogo';

interface BouncingLoaderProps {
  message?: string;
}

export function BouncingLoader({ message = 'Loading...' }: BouncingLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0D2137]/90 backdrop-blur-sm">
      <style>{`
        @keyframes bounce-logo {
          0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: translateY(-28px); animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .logo-bounce { animation: bounce-logo 0.9s infinite; }
        @keyframes shadow-pulse {
          0%, 100% { transform: scaleX(1); opacity: 0.4; }
          50% { transform: scaleX(0.5); opacity: 0.15; }
        }
        .logo-shadow { animation: shadow-pulse 0.9s infinite; }
      `}</style>
      <div className="logo-bounce">
        <GetIdfixLogo iconOnly />
      </div>
      <div className="logo-shadow mt-2 w-14 h-2 bg-[#C9A84C]/40 rounded-full blur-sm" />
      <p className="mt-6 text-slate-400 text-sm tracking-wide">{message}</p>
    </div>
  );
}

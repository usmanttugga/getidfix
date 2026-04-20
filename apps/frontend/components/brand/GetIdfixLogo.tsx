export function GetIdfixLogo({ iconOnly = false, className = '' }: { iconOnly?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon: larger circular badge with ID card + circuit nodes */}
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        {/* Outer circle */}
        <circle cx="28" cy="28" r="26" fill="#0D2137" />

        {/* Circuit arc top-left */}
        <path d="M11 14 Q8 20 8 28" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="11" cy="14" r="2.5" fill="#C9A84C" />
        <circle cx="8" cy="28" r="2" fill="#C9A84C" />

        {/* Circuit arc bottom-right */}
        <path d="M45 42 Q48 36 48 28" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="45" cy="42" r="2.5" fill="#C9A84C" />
        <circle cx="48" cy="28" r="2" fill="#C9A84C" />

        {/* ID card shape */}
        <rect x="13" y="18" width="30" height="20" rx="3" fill="none" stroke="white" strokeWidth="2" />

        {/* Person icon inside card */}
        <circle cx="22" cy="25" r="3.5" fill="#C9A84C" />
        <path d="M15 36 Q16 31 22 31 Q28 31 29 36" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Lines on right side of card */}
        <line x1="32" y1="24" x2="41" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="29" x2="39" y2="29" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <line x1="32" y1="34" x2="37" y2="34" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </svg>

      {!iconOnly && (
        <div className="flex flex-col leading-tight">
          <span className="font-extrabold text-2xl tracking-tight text-white">
            GET<span style={{ color: '#C9A84C' }}>[ID]</span>FIX
          </span>
          <span className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#C9A84C', opacity: 0.85 }}>
            Verify · Secure
          </span>
        </div>
      )}
    </div>
  );
}

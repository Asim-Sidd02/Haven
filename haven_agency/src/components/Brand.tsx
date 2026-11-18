/** Haven emblem in monochrome: a shield holding two guards linked by a velvet rope. */
export function HavenMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Haven">
      <path d="M50 4 L88 16 V48 C88 72 71 88 50 96 C29 88 12 72 12 48 V16 Z" fill="#0A0A0A" />
      <g transform="translate(50 50) scale(0.78) translate(-50 -52)">
        <circle cx="32" cy="27" r="6.5" fill="#fff" />
        <circle cx="68" cy="27" r="6.5" fill="#fff" />
        <rect x="26.5" y="38" width="11" height="40" rx="5.5" fill="#fff" />
        <rect x="62.5" y="38" width="11" height="40" rx="5.5" fill="#fff" />
        <path d="M37.5 50 Q50 66 62.5 50" fill="none" stroke="#A3A3A3" strokeWidth="6.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Brand({ sub = "Agency" }: { sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <HavenMark className="h-8 w-8 shrink-0" />
      <div className="leading-none">
        <p className="text-[15px] font-semibold tracking-tight text-ink">Haven</p>
        <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">{sub}</p>
      </div>
    </div>
  );
}

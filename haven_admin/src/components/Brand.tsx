/**
 * Haven emblem — a shield holding two figures linked by a velvet rope.
 * The figures are the guards at the door; together they form an "H";
 * the rope dips into a gentle smile: protection, given with care.
 */
export function HavenEmblem({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Haven">
      <path
        d="M50 4 L88 16 V48 C88 72 71 88 50 96 C29 88 12 72 12 48 V16 Z"
        fill="#5B7B6F"
      />
      <g transform="translate(50 50) scale(0.78) translate(-50 -52)">
        <circle cx="32" cy="27" r="6.5" fill="#F7F5F2" />
        <circle cx="68" cy="27" r="6.5" fill="#F7F5F2" />
        <rect x="26.5" y="38" width="11" height="40" rx="5.5" fill="#F7F5F2" />
        <rect x="62.5" y="38" width="11" height="40" rx="5.5" fill="#F7F5F2" />
        <path
          d="M37.5 50 Q50 66 62.5 50"
          fill="none"
          stroke="#D2B496"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <HavenEmblem className="h-10 w-10 shrink-0" />
      <div className="leading-tight">
        <p className="font-serif text-lg font-semibold tracking-tight text-ink">Haven</p>
        {!compact && (
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
            Safety, booked with care
          </p>
        )}
      </div>
    </div>
  );
}

import { ShieldHalf } from "lucide-react";

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage text-white">
        <ShieldHalf className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <p className="text-base font-semibold tracking-tight text-ink">Haven</p>
        {!compact && <p className="text-[11px] text-muted">Safety, booked with care</p>}
      </div>
    </div>
  );
}

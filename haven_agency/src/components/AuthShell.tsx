import { CheckCircle2 } from "lucide-react";
import { Brand } from "./Brand";

/** Split layout for sign-in and registration: the value on the left, the task on the right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-[.07]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative flex items-center gap-2.5">
          <div className="rounded-lg bg-white p-1"><svg viewBox="0 0 100 100" className="h-7 w-7"><path d="M50 4 L88 16 V48 C88 72 71 88 50 96 C29 88 12 72 12 48 V16 Z" fill="#0A0A0A" /></svg></div>
          <span className="text-lg font-semibold">Haven for Agencies</span>
        </div>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Run your whole security operation from one calm screen.</h2>
          <ul className="mt-8 space-y-3 text-[15px] text-white/80">
            {["Import hundreds of personnel from Excel in one go", "Assign teams without double-booking anyone", "Track attendance, payroll and payouts automatically"].map((t) => (
              <li key={t} className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-white" />{t}</li>
            ))}
          </ul>
          <p className="mt-12 text-xs uppercase tracking-[0.16em] text-white/40">Safety, booked with care</p>
        </div>
      </aside>
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden"><Brand /></div>
        <div className="anim-page mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}

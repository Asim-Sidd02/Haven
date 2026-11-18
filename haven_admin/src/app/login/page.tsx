"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { AlertCircle, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import { errMsg } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";
import { Brand, HavenEmblem } from "@/components/Brand";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/Toast";

function friendly(e: unknown): string {
  const m = errMsg(e);
  if (m.includes("invalid-credential") || m.includes("wrong-password") || m.includes("user-not-found"))
    return "That email and password don't match our records.";
  if (m.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network-request-failed")) return "We couldn't reach the server. Check your connection and try again.";
  return m;
}

const POINTS = [
  { icon: ShieldCheck, title: "Review with care", text: "Every agency and guard is checked by a person before customers can see them." },
  { icon: HeartHandshake, title: "Keep bookings honest", text: "Step in when something looks off, and keep the record straight." },
  { icon: Sparkles, title: "Make every event a safe place", text: "Ratings, settings and support, all in one calm workspace." },
];

export default function LoginPage() {
  const { state } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "admin") router.replace("/dashboard");
    if (state.status === "signedOut" && state.reason) {
      setError(state.reason);
      setBusy(false);
    }
  }, [state, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth(), email.trim(), password);
      // AuthProvider verifies the admin role and redirects / reports.
    } catch (e) {
      setError(friendly(e));
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) {
      setError("Enter your email first, and we'll send a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth(), email.trim());
      toast("Password reset link sent. Check your inbox.");
    } catch (e) {
      setError(friendly(e));
    }
  }

  const unconfigured = state.status === "unconfigured";

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sage-dark p-12 text-white lg:flex xl:p-16">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-60"
          style={{ background: "radial-gradient(closest-side, rgba(255,255,255,.08), transparent)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-56 -left-24 h-[480px] w-[480px] rounded-full opacity-70"
          style={{ background: "radial-gradient(closest-side, rgba(201,169,140,.18), transparent)" }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <HavenEmblem className="h-9 w-9" />
          <span className="text-sm font-medium tracking-wide text-white/80">Haven Admin</span>
        </div>

        <div className="relative">
          <HavenEmblem className="h-24 w-24 drop-shadow-[0_12px_24px_rgba(0,0,0,.18)]" />
          <h2 className="mt-8 max-w-md font-serif text-[34px] font-semibold leading-[1.2] tracking-tight">
            Every booking is someone trusting us with their safety.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">Safety, booked with care.</p>

          <ul className="mt-10 space-y-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex max-w-md gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sand">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Haven · Admin workspace</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>

          <div className="rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-9">
            <h1 className="font-serif text-[26px] font-semibold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted">Sign in with your admin account.</p>

            {unconfigured && (
              <div className="mt-6 rounded-xl border border-amber-soft bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-amber">
                Firebase isn&apos;t configured yet. Copy <code className="rounded bg-white/60 px-1">.env.local.example</code> to{" "}
                <code className="rounded bg-white/60 px-1">.env.local</code>, fill in your project keys and restart the dev server.
              </div>
            )}

            {error && (
              <div role="alert" className="animate-fade-in mt-6 flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft/60 px-4 py-3 text-[13px] leading-relaxed text-rose">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="mt-7 space-y-5">
              <Field label="Email address">
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@haven.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={unconfigured}
                />
              </Field>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-ink/80">
                    Password
                  </label>
                  <button type="button" onClick={reset} className="text-xs font-medium text-sage transition hover:text-sage-dark" disabled={unconfigured}>
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={unconfigured}
                />
              </div>
              <Button type="submit" className="h-11 w-full" loading={busy} disabled={unconfigured}>
                Sign in
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted">Admin access only. Need an account? Ask an existing admin to grant you access.</p>
        </div>
      </section>
    </div>
  );
}

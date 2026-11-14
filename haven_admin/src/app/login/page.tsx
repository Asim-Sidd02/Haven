"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { HeartHandshake } from "lucide-react";
import { auth } from "@/lib/firebase";
import { errMsg } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";
import { Brand } from "@/components/Brand";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/Toast";

function friendly(e: unknown): string {
  const m = errMsg(e);
  if (m.includes("invalid-credential") || m.includes("wrong-password") || m.includes("user-not-found"))
    return "That email and password don't match our records.";
  if (m.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
  return m;
}

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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sage-dark p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-white/90">
          <HeartHandshake className="h-5 w-5" />
          <span className="text-sm">Haven Admin</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-snug">
            Every booking is someone trusting us with their safety.
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            Review bouncers with care, keep bookings honest, and make every event feel like a safe place.
          </p>
        </div>
        <p className="text-xs text-white/50">Safety, booked with care.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Brand />
          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your admin account.</p>

          {state.status === "unconfigured" && (
            <div className="mt-6 rounded-xl border border-amber-soft bg-amber-soft/60 px-4 py-3 text-sm text-amber">
              Firebase isn&apos;t configured yet. Copy <code>.env.local.example</code> to <code>.env.local</code>, fill in your
              project keys and restart the dev server.
            </div>
          )}

          {error && <div className="mt-6 rounded-xl border border-rose-soft bg-rose-soft/60 px-4 py-3 text-sm text-rose">{error}</div>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full" loading={busy} disabled={state.status === "unconfigured"}>
              Sign in
            </Button>
          </form>
          <button onClick={reset} className="mt-4 text-sm text-sage hover:text-sage-dark">
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}

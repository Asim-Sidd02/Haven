"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";
import { friendlyAuthError } from "@/lib/authErrors";
import { useAuth } from "@/components/AuthProvider";
import { AuthShell } from "@/components/AuthShell";
import { Button, Callout, Field, Input } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const { state } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (state.status === "ready") router.replace("/overview");
    if (state.status === "onboarding") router.replace("/register");
  }, [state.status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await signInWithEmailAndPassword(auth(), email.trim(), password); }
    catch (err) { setError(friendlyAuthError(err)); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!email.includes("@")) { setError("Enter your email first, then choose “Forgot password”."); return; }
    try { await sendPasswordResetEmail(auth(), email.trim()); toast("Reset link sent. Check your inbox."); }
    catch (err) { setError(friendlyAuthError(err)); }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to manage your agency.</p>

      {state.status === "unconfigured" && <div className="mt-6"><Callout tone="warn" title="Firebase isn’t configured">Copy <code>.env.local.example</code> to <code>.env.local</code> and add your Firebase web keys.</Callout></div>}
      {state.status === "signedOut" && state.reason && <div className="mt-6"><Callout tone="warn">{state.reason}</Callout></div>}

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Work email">
          <Input type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" />
        </Field>
        <Field label="Password">
          <div className="relative">
            <Input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <Button type="submit" variant="primary" loading={busy} className="w-full">Sign in</Button>
        <button type="button" onClick={reset} className="w-full text-center text-sm text-muted hover:text-ink">Forgot password?</button>
      </form>

      <p className="mt-10 border-t border-line pt-6 text-center text-sm text-muted">
        New to Haven? <Link href="/register" className="font-medium text-ink underline-offset-4 hover:underline">Register your agency</Link>
      </p>
    </AuthShell>
  );
}

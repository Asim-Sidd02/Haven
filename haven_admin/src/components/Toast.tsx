"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 4000);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const success = t.kind === "success";
          return (
            <div
              key={t.id}
              role="status"
              className={`animate-slide-in-right pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl border border-line bg-white py-3 pl-4 pr-3 text-sm shadow-lift ${
                success ? "border-l-[3px] border-l-sage" : "border-l-[3px] border-l-rose"
              }`}
            >
              {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />}
              <span className="flex-1 leading-snug text-ink">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-muted transition hover:bg-cream hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

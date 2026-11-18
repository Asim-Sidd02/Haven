"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type Kind = "success" | "error";
interface Item { id: number; kind: Kind; message: string; action?: { label: string; run: () => void } }
type Push = (message: string, kind?: Kind, action?: Item["action"]) => void;

const Ctx = createContext<Push>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);
  const push = useCallback<Push>((message, kind = "success", action) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, kind, message, action }]);
    setTimeout(() => dismiss(id), kind === "error" ? 7000 : action ? 6000 : 3500);
  }, [dismiss]);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className="anim-pop pointer-events-auto flex w-full items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-pop">
            {t.kind === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />}
            <span className="flex-1 leading-snug">{t.message}</span>
            {t.action && (
              <button onClick={() => { t.action!.run(); dismiss(t.id); }} className="rounded-md px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline">
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded-md p-1 text-white/60 hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

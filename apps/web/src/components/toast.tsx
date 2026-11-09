"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const STYLES: Record<ToastKind, { wrap: string; icon: ReactNode }> = {
  success: {
    wrap: "border-emerald-200 bg-white text-aiq-ink",
    icon: <CheckCircle2 size={18} className="text-aiq-green" />,
  },
  error: {
    wrap: "border-red-200 bg-white text-aiq-ink",
    icon: <AlertTriangle size={18} className="text-aiq-danger" />,
  },
  info: {
    wrap: "border-sky-200 bg-white text-aiq-ink",
    icon: <Info size={18} className="text-aiq-blue" />,
  },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setItems((current) => [...current.slice(-2), { id, kind, message }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4800);
  }, []);

  const apiValue = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={apiValue}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`toast-item pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-[0_18px_45px_-22px_rgba(10,22,40,0.65)] ring-1 ring-black/5 ${STYLES[item.kind].wrap}`}
          >
            <span className="mt-0.5 shrink-0">{STYLES[item.kind].icon}</span>
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{item.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}
              className="grid size-6 shrink-0 place-items-center rounded-full text-aiq-muted transition hover:bg-aiq-bg hover:text-aiq-ink"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

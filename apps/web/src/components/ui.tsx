"use client";

import { Button } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const ICON_TONES = {
  blue: "from-aiq-blue to-aiq-cyan",
  cyan: "from-aiq-cyan to-aiq-blue",
  green: "from-aiq-green to-aiq-cyan",
  gold: "from-aiq-gold to-[#f0c85a]",
  navy: "from-aiq-navy to-aiq-blue",
  danger: "from-aiq-danger to-[#e06a6a]",
} as const;

export type IconTone = keyof typeof ICON_TONES;

function TonePlaque({
  children,
  tone = "blue",
  size = "md",
}: {
  children: ReactNode;
  tone?: IconTone;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${ICON_TONES[tone]} text-white shadow-[0_10px_20px_-12px_rgba(20,36,58,0.8)] ring-1 ring-white/40 ${
        size === "sm" ? "size-8 rounded-xl" : "size-11"
      }`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-aiq-blue">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-aiq-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-aiq-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "info";
  children: ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/90 text-emerald-800"
      : tone === "info"
        ? "border-sky-200 bg-sky-50/90 text-sky-900"
        : "border-red-200 bg-red-50/90 text-red-800";
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${styles}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0 opacity-80" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-aiq-muted">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-aiq-ink">
          {label}
          {required && <span className="ml-0.5 text-aiq-danger">*</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-aiq-muted">{hint}</span>}
      </span>
      <span className="mt-1.5 block font-normal">{children}</span>
      {error && <span className="mt-1 block text-xs text-aiq-danger">{error}</span>}
    </label>
  );
}

/**
 * A form field with a small "+ Add new" toggle that reveals an inline creator.
 * Lets staff create a model, category or customer without leaving the form.
 */
export function FieldWithAdd({
  label,
  addLabel = "Add new",
  children,
  panel,
}: {
  label: string;
  addLabel?: string;
  children: ReactNode;
  panel?: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="block">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-aiq-ink">{label}</span>
        {panel && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
              open
                ? "border-aiq-line bg-white text-aiq-muted hover:bg-aiq-bg"
                : "border-aiq-blue/25 bg-aiq-blue/8 text-aiq-blue hover:border-aiq-blue/50 hover:bg-aiq-blue/12"
            }`}
          >
            {open ? <X size={12} /> : <Plus size={12} />}
            {open ? "Close" : addLabel}
          </button>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
      {open && panel && (
        <div className="mt-2.5 animate-[content-in_220ms_ease-out] rounded-2xl border border-dashed border-aiq-blue/35 bg-gradient-to-b from-aiq-blue/5 to-transparent p-3">
          {panel(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field-control ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field-control min-h-24 ${props.className ?? ""}`} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field-control ${props.className ?? ""}`} />;
}

/**
 * Groups related fields inside a drawer or form with a titled card,
 * so long pop forms read as a sequence of short steps.
 */
export function FormSection({
  title,
  description,
  icon,
  tone = "blue",
  aside,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: IconTone;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-aiq-line bg-white/80 shadow-[0_1px_2px_rgba(20,36,58,0.04)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-aiq-line/70 bg-gradient-to-r from-aiq-bg/80 to-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <TonePlaque tone={tone} size="sm">
              {icon}
            </TonePlaque>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-aiq-ink">{title}</p>
            {description && <p className="truncate text-xs text-aiq-muted">{description}</p>}
          </div>
        </div>
        {aside}
      </header>
      <div className="grid gap-4 px-4 py-4">{children}</div>
    </section>
  );
}

export function Drawer({
  open,
  title,
  description,
  eyebrow,
  icon,
  tone = "blue",
  size = "md",
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  tone?: IconTone;
  size?: "sm" | "md" | "lg" | "xl";
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true });
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const width = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close panel"
        className="drawer-backdrop absolute inset-0 bg-aiq-navy/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`drawer-panel relative flex h-full w-full ${width} flex-col overflow-hidden rounded-l-3xl bg-white shadow-[0_30px_80px_-30px_rgba(10,22,40,0.7)] outline-none`}
      >
        <div className="brand-stripe h-1.5 w-full shrink-0" />
        <header className="flex items-start justify-between gap-4 border-b border-aiq-line/80 bg-gradient-to-b from-white to-aiq-bg/40 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && <TonePlaque tone={tone}>{icon}</TonePlaque>}
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-aiq-blue">
                  {eyebrow}
                </p>
              )}
              <h2
                id={titleId}
                className="truncate text-xl font-semibold tracking-tight text-aiq-ink"
              >
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 line-clamp-2 text-sm text-aiq-muted">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-aiq-muted transition hover:bg-aiq-bg hover:text-aiq-ink focus-visible:ring-3 focus-visible:ring-aiq-blue/30 focus-visible:outline-none"
          >
            <X size={18} />
          </button>
        </header>
        <div className="drawer-body flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-aiq-line/80 bg-white/95 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

export function FormActions({
  busy,
  submitLabel,
  onCancel,
  hint,
}: {
  busy?: boolean;
  submitLabel: string;
  onCancel: () => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      {hint ? <p className="min-w-0 text-xs text-aiq-muted">{hint}</p> : null}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" type="button" onPress={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isDisabled={busy} className="min-w-32 shadow-sm">
          {busy && <Loader2 size={15} className="animate-spin" />}
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function stop(event: FormEvent) {
  event.preventDefault();
}

export function pretty(value?: string | null) {
  if (!value) return "—";
  return value.replaceAll("_", " ").toLowerCase();
}

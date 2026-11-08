"use client";

import { Button } from "@heroui/react";
import { Plus, X } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  tone?: "danger" | "success";
  children: ReactNode;
}) {
  return (
    <p
      role="alert"
      className={`rounded-xl px-3 py-2 text-sm ${
        tone === "success" ? "bg-emerald-50 text-aiq-green" : "bg-red-50 text-aiq-danger"
      }`}
    >
      {children}
    </p>
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
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-aiq-ink">
      {label}
      <div className="mt-1.5 font-normal">{children}</div>
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
    <div className="block text-sm font-medium text-aiq-ink">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {panel && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-aiq-blue hover:bg-aiq-bg"
          >
            <Plus size={14} />
            {open ? "Close" : addLabel}
          </button>
        )}
      </div>
      <div className="mt-1.5 font-normal">{children}</div>
      {open && panel && (
        <div className="mt-2 rounded-2xl border border-dashed border-aiq-line bg-aiq-bg/60 p-3 font-normal">
          {panel(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field-control ${props.className ?? ""}`} />;
}export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field-control min-h-24 ${props.className ?? ""}`} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field-control ${props.className ?? ""}`} />;
}

export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close panel" className="absolute inset-0 bg-aiq-navy/40" onClick={onClose} />
      <aside className="drawer-panel relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-aiq-line px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-aiq-muted">{description}</p>}
          </div>
          <Button isIconOnly variant="ghost" aria-label="Close" onPress={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-aiq-line px-6 py-4">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}

export function FormActions({
  busy,
  submitLabel,
  onCancel,
}: {
  busy?: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" type="button" onPress={onCancel}>
        Cancel
      </Button>
      <Button type="submit" isDisabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
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

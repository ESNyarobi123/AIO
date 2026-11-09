"use client";

import { Button } from "@heroui/react";
import { AlertTriangle, Loader2, ShieldQuestion } from "lucide-react";
import { MouseEvent, ReactNode } from "react";
import { Modal, Notice, type IconTone } from "@/components/ui";

const ACTION_TONES = {
  neutral: "text-aiq-muted hover:bg-aiq-bg hover:text-aiq-ink",
  edit: "text-aiq-blue hover:bg-aiq-blue/10 hover:text-aiq-blue",
  delete: "text-aiq-danger hover:bg-aiq-danger/10",
  success: "text-aiq-green hover:bg-aiq-green/10",
  gold: "text-[#a97f16] hover:bg-aiq-gold/15",
} as const;

export type ActionTone = keyof typeof ACTION_TONES;

/**
 * Wraps the edit/delete icons in a table row. Stops the row click from opening
 * the detail drawer when the user is aiming for an action instead.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div
      className="row-actions flex items-center justify-end gap-1"
      onClick={(event: MouseEvent) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function RowActionButton({
  label,
  onPress,
  tone = "neutral",
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  tone?: ActionTone;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPress();
      }}
      className={`grid size-8 place-items-center rounded-lg transition focus-visible:ring-2 focus-visible:ring-aiq-blue/35 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_TONES[tone]}`}
    >
      {children}
    </button>
  );
}

export type ConfirmDetail = { label: string; value: string };

/**
 * Centred yes/no dialog used before any destructive action. When the server
 * refuses the action the reason stays visible in the same dialog — exactly like
 * "this customer still has hire cards".
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  tone = "danger",
  icon,
  eyebrow,
  title,
  description,
  details,
  note,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy,
  error,
  blocked,
  children,
  onBlockedClose,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  tone?: IconTone;
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  details?: ConfirmDetail[];
  note?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string;
  blocked?: string;
  children?: ReactNode;
  onBlockedClose?: () => void;
}) {
  const isBlocked = Boolean(blocked);

  return (
    <Modal
      open={open}
      onClose={isBlocked ? (onBlockedClose ?? onClose) : onClose}
      title={isBlocked ? "This record is still in use" : title}
      description={isBlocked ? undefined : description}
      eyebrow={isBlocked ? "Protected record" : eyebrow}
      icon={isBlocked ? <ShieldQuestion size={19} /> : icon ?? <AlertTriangle size={19} />}
      tone={isBlocked ? "gold" : tone}
      size="xs"
      footer={
        isBlocked ? (
          <Button className="w-full" onPress={onBlockedClose ?? onClose}>
            Got it
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              type="button"
              className="flex-1"
              isDisabled={busy}
              onPress={onClose}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              type="button"
              className="min-w-28 flex-1"
              isDisabled={busy}
              onPress={onConfirm}
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {busy ? "Working…" : confirmLabel}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        {details && details.length > 0 && (
          <dl className="overflow-hidden rounded-2xl border border-aiq-line bg-aiq-bg/60">
            {details.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 border-b border-aiq-line/60 px-3.5 py-2 last:border-b-0"
              >
                <dt className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-aiq-muted">
                  {row.label}
                </dt>
                <dd className="min-w-0 truncate text-right text-sm font-semibold text-aiq-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children}

        {note && !isBlocked && <div className="text-xs leading-relaxed text-aiq-muted">{note}</div>}

        {blocked && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-3.5 py-3 text-sm text-amber-900">
            <ShieldQuestion size={17} className="mt-0.5 shrink-0 opacity-80" />
            <span className="min-w-0">{blocked}</span>
          </div>
        )}

        {error && !isBlocked && <Notice>{error}</Notice>}
      </div>
    </Modal>
  );
}

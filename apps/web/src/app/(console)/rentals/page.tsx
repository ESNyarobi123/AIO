"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, FileText, HardHat, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog, RowActionButton, RowActions } from "@/components/actions";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import {
  Drawer,
  EmptyState,
  Field,
  FormActions,
  Notice,
  PageHeader,
  TextArea,
  TextInput,
  pretty,
  stop,
} from "@/components/ui";
import { api, money, when } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Rental = {
  id: string;
  rentalNumber: string;
  status: string;
  siteLocation?: string | null;
  startAt: string;
  expectedReturnAt: string;
  grandTotal: string;
  balanceCached: string;
  paidCached?: string;
  customer: { fullName: string; phone: string };
  items: Array<{ id: string; model: { name: string }; asset?: { assetCode: string } | null; unitPrice?: string; agreedDuration?: string }>;
  guarantors?: Array<{ fullName: string; phone?: string }>;
};

export default function RentalsPage() {
  const client = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canCancelRow = user?.roles.includes("ADMIN") ?? false;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmRow, setConfirmRow] = useState<Rental | null>(null);
  const list = useQuery({
    queryKey: ["rentals"],
    queryFn: () => api<Rental[]>("/rentals?limit=50"),
  });
  const detail = useQuery({
    queryKey: ["rental", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => api<Rental>(`/rentals/${selectedId}`),
  });

  const confirm = useMutation({
    mutationFn: () => api(`/rentals/${selectedId}/confirm`, { method: "POST" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["rentals"] });
      void client.invalidateQueries({ queryKey: ["rental", selectedId] });
    },
  });
  const cancel = useMutation({
    mutationFn: () =>
      api(`/rentals/${selectedId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setReason("");
      void client.invalidateQueries({ queryKey: ["rentals"] });
      void client.invalidateQueries({ queryKey: ["rental", selectedId] });
    },
  });

  const rental = detail.data;
  const canConfirm = rental && ["DRAFT", "PENDING_APPROVAL"].includes(rental.status);
  const canCancel = rental && ["DRAFT", "PENDING_APPROVAL", "CONFIRMED"].includes(rental.status);
  const rows = list.data ?? [];

  const cancelRow = useMutation({
    mutationFn: () =>
      api(`/rentals/${confirmRow?.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setConfirmRow(null);
      setReason("");
      toast.success("Hire card cancelled");
      void client.invalidateQueries({ queryKey: ["rentals"] });
      void client.invalidateQueries({ queryKey: ["rental", selectedId] });
    },
  });

  const cancelIssue = cancelRow.error as { status?: number; message?: string } | null;
  const cancelBlocked = cancelIssue?.status === 409 ? cancelIssue.message : undefined;
  const cancelError =
    cancelIssue && cancelIssue.status !== 409 ? cancelIssue.message : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Rentals"
        description="Digital machine hire cards. Open a row to view, confirm, or cancel."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/hires">
              <Button variant="secondary"><HardHat size={16} /> Staff hire</Button>
            </Link>
            <Link href="/rentals/new">
              <Button><Plus size={16} /> New rental</Button>
            </Link>
          </div>
        }
      />
      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>RN</th>
                <th>Customer</th>
                <th>Equipment</th>
                <th>Out</th>
                <th>Expected in</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
                <th className="w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} onClick={() => setSelectedId(row.id)}>
                  <td className="font-medium">{row.rentalNumber}</td>
                  <td>
                    {row.customer.fullName}
                    <div className="text-xs text-aiq-muted">{row.customer.phone}</div>
                  </td>
                  <td>
                    {row.items.map((item) => item.asset?.assetCode || item.model.name).join(", ")}
                    <div className="text-xs text-aiq-muted">{row.siteLocation || "—"}</div>
                  </td>
                  <td>{when(row.startAt)}</td>
                  <td>{when(row.expectedReturnAt)}</td>
                  <td className="tabular">{money(row.grandTotal)}</td>
                  <td className="tabular">{money(row.balanceCached)}</td>
                  <td><StatusChip status={row.status} /></td>
                  <td>
                    <RowActions>
                      {canCancelRow && ["DRAFT", "PENDING_APPROVAL", "CONFIRMED"].includes(row.status) && (
                        <RowActionButton
                          label={`Cancel ${row.rentalNumber}`}
                          tone="delete"
                          onPress={() => {
                            cancelRow.reset();
                            setReason("");
                            setConfirmRow(row);
                          }}
                        >
                          <Ban size={15} />
                        </RowActionButton>
                      )}
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.isLoading && rows.length === 0 && <EmptyState title="No hire cards yet" />}
        </div>
      </section>

      <Drawer
        open={Boolean(selectedId)}
        title={rental?.rentalNumber ?? "Hire card"}
        eyebrow="Rental hire card"
        icon={<FileText size={19} />}
        size="lg"
        description={rental ? `${rental.customer.fullName} · ${pretty(rental.status)}` : "Loading hire card"}
        onClose={() => setSelectedId(null)}
      >
        {detail.isError && <Notice>{(detail.error as Error).message}</Notice>}
        {rental && (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Customer" value={`${rental.customer.fullName} · ${rental.customer.phone}`} />
              <Info label="Site" value={rental.siteLocation || "—"} />
              <Info label="Out" value={when(rental.startAt)} />
              <Info label="Expected in" value={when(rental.expectedReturnAt)} />
              <Info label="Total" value={money(rental.grandTotal)} />
              <Info label="Balance" value={money(rental.balanceCached)} />
              <Info label="Guarantor" value={rental.guarantors?.[0]?.fullName || "—"} />
            </dl>
            <div className="space-y-2">
              {rental.items.map((item) => (
                <div key={item.id} className="rounded-2xl bg-aiq-bg px-4 py-3 text-sm">
                  <p className="font-medium">{item.asset?.assetCode || item.model.name}</p>
                  <p className="text-aiq-muted">{item.model.name}</p>
                </div>
              ))}
            </div>
            {canConfirm && (
              <Button onPress={() => confirm.mutate()} isDisabled={confirm.isPending}>
                {confirm.isPending ? "Confirming…" : "Confirm rental"}
              </Button>
            )}
            {confirm.isError && <Notice>{(confirm.error as Error).message}</Notice>}
            {canCancel && (
              <form
                className="space-y-3 rounded-2xl border border-aiq-line p-4"
                onSubmit={(event) => {
                  stop(event);
                  cancel.mutate();
                }}
              >
                <Field label="Cancel reason">
                  <TextArea required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                {cancel.isError && <Notice>{(cancel.error as Error).message}</Notice>}
                <FormActions busy={cancel.isPending} submitLabel="Cancel rental" onCancel={() => setReason("")} />
              </form>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Cancel this hire card?"
        description="Cancelling releases the reserved machines and keeps the card on record as cancelled."
        eyebrow="Operations"
        icon={<Ban size={19} />}
        tone="danger"
        details={
          confirmRow
            ? [
                { label: "Hire card", value: confirmRow.rentalNumber },
                { label: "Customer", value: confirmRow.customer.fullName },
                { label: "Total", value: money(confirmRow.grandTotal) },
              ]
            : undefined
        }
        confirmLabel="Cancel hire card"
        busy={cancelRow.isPending}
        blocked={cancelBlocked}
        error={cancelError}
        onClose={() => {
          setConfirmRow(null);
          setReason("");
          cancelRow.reset();
        }}
        onConfirm={() => cancelRow.mutate()}
      >
        <label className="block">
          <span className="text-[13px] font-semibold text-aiq-ink">
            Reason<span className="ml-0.5 text-aiq-danger">*</span>
          </span>
          <TextArea
            required
            minLength={3}
            className="mt-1.5 min-h-16"
            placeholder="Customer postponed the job"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-aiq-bg px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-aiq-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

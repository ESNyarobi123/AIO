"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Banknote, Plus, ReceiptText, UserRound } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog, RowActionButton, RowActions } from "@/components/actions";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import {
  Drawer,
  EmptyState,
  Field,
  FormActions,
  FormSection,
  Notice,
  PageHeader,
  SelectInput,
  TextArea,
  TextInput,
  pretty,
  stop,
} from "@/components/ui";
import { api, money, when } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Payment = {
  id: string;
  paymentNumber: string;
  amount: string;
  method: string;
  status: string;
  provider?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  receivedAt: string;
  customer: { fullName: string; phone?: string };
};
type Customer = { id: string; fullName: string; phone: string };

const blank = {
  customerId: "",
  amount: "",
  method: "CASH",
  provider: "",
  referenceNumber: "",
  notes: "",
};

export default function PaymentsPage() {
  const client = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canManage = user?.roles.includes("ADMIN") ?? false;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [form, setForm] = useState(blank);
  const [confirmRow, setConfirmRow] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const list = useQuery({
    queryKey: ["payments"],
    queryFn: () => api<Payment[]>("/payments?limit=50"),
  });
  const customers = useQuery({
    queryKey: ["customers", "picker"],
    queryFn: () => api<Customer[]>("/customers?limit=100"),
  });
  const create = useMutation({
    mutationFn: () =>
      api("/payments", {
        method: "POST",
        body: JSON.stringify({
          customerId: form.customerId,
          amount: Number(form.amount),
          method: form.method,
          provider: form.provider || undefined,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes || undefined,
          receivedAt: new Date().toISOString(),
        }),
      }),
    onSuccess: () => {
      setForm(blank);
      setOpen(false);
      void client.invalidateQueries({ queryKey: ["payments"] });
    },
  });
  const rows = list.data ?? [];

  const reverse = useMutation({
    mutationFn: () =>
      api(`/payments/${confirmRow?.id}/reverse`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setConfirmRow(null);
      setReason("");
      toast.success("Receipt reversed — the invoice balance is back to unpaid");
      void client.invalidateQueries({ queryKey: ["payments"] });
      void client.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const reverseIssue = reverse.error as { status?: number; message?: string } | null;
  const reverseBlocked = reverseIssue?.status === 409 ? reverseIssue.message : undefined;
  const reverseError =
    reverseIssue && reverseIssue.status !== 409 ? reverseIssue.message : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        description="Record cash, mobile money, bank transfer or other receipts."
        actions={
          <Button onPress={() => { setOpen(true); create.reset(); }}>
            <Plus size={16} /> Record payment
          </Button>
        }
      />
      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Received</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => (
                <tr key={payment.id} onClick={() => setSelected(payment)}>
                  <td className="font-medium">{payment.paymentNumber}</td>
                  <td>{payment.customer.fullName}</td>
                  <td className="capitalize">{pretty(payment.method)}</td>
                  <td>{payment.referenceNumber || "—"}</td>
                  <td>{when(payment.receivedAt)}</td>
                  <td className="tabular font-medium">{money(payment.amount)}</td>
                  <td><StatusChip status={payment.status} /></td>
                  <td>
                    <RowActions>
                      {canManage && payment.status !== "REVERSED" && (
                        <RowActionButton
                          label={`Reverse ${payment.paymentNumber}`}
                          tone="delete"
                          onPress={() => {
                            reverse.reset();
                            setReason("");
                            setConfirmRow(payment);
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
          {!list.isLoading && rows.length === 0 && <EmptyState title="No receipts yet" />}
        </div>
      </section>

      <Drawer
        open={open}
        title="Record payment"
        eyebrow="Money in"
        icon={<Banknote size={19} />}
        tone="green"
        description="The receipt number is assigned when you save."
        onClose={() => setOpen(false)}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            create.mutate();
          }}
        >
          <FormSection
            title="Who is paying"
            description="Link the money to the right hire card"
            icon={<UserRound size={15} />}
          >
            <Field label="Customer" required>
              <SelectInput required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select customer</option>
                {(customers.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.phone}</option>
                ))}
              </SelectInput>
            </Field>
          </FormSection>
          <FormSection
            title="Amount & method"
            description="How the money reached AIQ"
            icon={<Banknote size={15} />}
            tone="green"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (TZS)" required>
                <TextInput required inputMode="decimal" min={1} placeholder="50000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="Method">
                <SelectInput value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="OTHER">Other</option>
                </SelectInput>
              </Field>
            </div>
            <Field label="Provider" hint="M-Pesa, Airtel, CRDB…">
              <TextInput placeholder="Vodacom M-Pesa" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            </Field>
            <Field label="Reference">
              <TextInput placeholder="Transaction ID" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
            </Field>
          </FormSection>
          {create.isError && <Notice>{(create.error as Error).message}</Notice>}
          <FormActions busy={create.isPending} submitLabel="Save receipt" onCancel={() => setOpen(false)} />
        </form>
      </Drawer>

      <Drawer
        open={Boolean(selected)}
        title={selected?.paymentNumber ?? "Receipt"}
        eyebrow="Receipt"
        icon={<ReceiptText size={19} />}
        tone="navy"
        description={selected?.customer.fullName}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Info label="Amount" value={money(selected.amount)} />
            <Info label="Method" value={pretty(selected.method)} />
            <Info label="Provider" value={selected.provider || "—"} />
            <Info label="Reference" value={selected.referenceNumber || "—"} />
            <Info label="Received" value={when(selected.receivedAt)} />
            <Info label="Status" value={pretty(selected.status)} />
          </dl>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Reverse this receipt?"
        description="Money records are never deleted. Reversing frees the invoice balance again and keeps a full audit trail."
        eyebrow="Finance correction"
        icon={<Ban size={19} />}
        tone="danger"
        details={
          confirmRow
            ? [
                { label: "Receipt", value: confirmRow.paymentNumber },
                { label: "Customer", value: confirmRow.customer.fullName },
                { label: "Amount", value: money(confirmRow.amount) },
              ]
            : undefined
        }
        confirmLabel="Reverse receipt"
        busy={reverse.isPending}
        blocked={reverseBlocked}
        error={reverseError}
        onClose={() => {
          setConfirmRow(null);
          setReason("");
          reverse.reset();
        }}
        onConfirm={() => reverse.mutate()}
      >
        <label className="block">
          <span className="text-[13px] font-semibold text-aiq-ink">
            Reason<span className="ml-0.5 text-aiq-danger">*</span>
          </span>
          <TextArea
            required
            minLength={3}
            className="mt-1.5 min-h-16"
            placeholder="Wrong amount captured at the desk"
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
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}

"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { StatusChip } from "@/components/status-chip";
import {
  Drawer,
  EmptyState,
  Field,
  FormActions,
  Notice,
  PageHeader,
  SelectInput,
  TextInput,
  pretty,
  stop,
} from "@/components/ui";
import { api, money, when } from "@/lib/api";

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
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [form, setForm] = useState(blank);
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
                </tr>
              ))}
            </tbody>
          </table>
          {!list.isLoading && rows.length === 0 && <EmptyState title="No receipts yet" />}
        </div>
      </section>

      <Drawer open={open} title="Record payment" description="The receipt number is assigned when you save." onClose={() => setOpen(false)}>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            create.mutate();
          }}
        >
          <Field label="Customer">
            <SelectInput required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer</option>
              {(customers.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.phone}</option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (TZS)">
              <TextInput required inputMode="decimal" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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
          <Field label="Provider">
            <TextInput placeholder="M-Pesa, Airtel, CRDB" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </Field>
          <Field label="Reference">
            <TextInput value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
          </Field>
          {create.isError && <Notice>{(create.error as Error).message}</Notice>}
          <FormActions busy={create.isPending} submitLabel="Save receipt" onCancel={() => setOpen(false)} />
        </form>
      </Drawer>

      <Drawer
        open={Boolean(selected)}
        title={selected?.paymentNumber ?? "Receipt"}
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

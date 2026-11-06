"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Field, FormActions, Notice, PageHeader, TextInput, stop } from "@/components/ui";
import { api } from "@/lib/api";

type Settings = {
  displayName: string;
  legalName: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency: string;
  timezone: string;
  invoicePrefix: string;
  rentalPrefix: string;
};

export default function SettingsPage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings/company"),
  });
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const save = useMutation({
    mutationFn: () =>
      api("/settings/company", {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Control"
        title="Company profile"
        description="These details appear on invoices, receipts and the console."
      />
      {query.isError && <Notice>{(query.error as Error).message}</Notice>}
      {form && (
        <form
          className="grid max-w-3xl gap-4 rounded-3xl border border-aiq-line bg-white p-6 sm:grid-cols-2"
          onSubmit={(event) => {
            stop(event);
            save.mutate();
          }}
        >
          <Field label="Display name">
            <TextInput value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </Field>
          <Field label="Legal name">
            <TextInput value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          </Field>
          <Field label="Address">
            <TextInput value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Website">
            <TextInput value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </Field>
          <Field label="Currency">
            <TextInput value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </Field>
          <Field label="Timezone">
            <TextInput value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </Field>
          <Field label="Rental prefix">
            <TextInput value={form.rentalPrefix} onChange={(e) => setForm({ ...form, rentalPrefix: e.target.value })} />
          </Field>
          <Field label="Invoice prefix">
            <TextInput value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
          </Field>
          {save.isError && <div className="sm:col-span-2"><Notice>{(save.error as Error).message}</Notice></div>}
          {save.isSuccess && <div className="sm:col-span-2"><Notice tone="success">Company profile saved.</Notice></div>}
          <div className="sm:col-span-2">
            <FormActions busy={save.isPending} submitLabel="Save profile" onCancel={() => query.data && setForm(query.data)} />
          </div>
        </form>
      )}
    </div>
  );
}

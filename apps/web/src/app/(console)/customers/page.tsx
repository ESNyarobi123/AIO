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
  TextArea,
  TextInput,
  pretty,
  stop,
} from "@/components/ui";
import { api, money, when } from "@/lib/api";

type Guarantor = { fullName: string; phone?: string; relationship?: string };
type Customer = {
  id: string;
  customerCode: string;
  customerType: string;
  fullName: string;
  companyName?: string | null;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  siteAddress?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
  guarantors?: Guarantor[];
  rentals?: Array<{
    id: string;
    rentalNumber: string;
    status: string;
    grandTotal: string;
    expectedReturnAt: string;
  }>;
};

const blank = {
  customerType: "INDIVIDUAL",
  fullName: "",
  companyName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  siteAddress: "",
  billingAddress: "",
  notes: "",
  guarantorFullName: "",
  guarantorPhone: "",
  guarantorRelationship: "",
};

export default function CustomersPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"create" | "view" | "edit" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);

  const list = useQuery({
    queryKey: ["customers", search],
    queryFn: () => api<Customer[]>(`/customers?limit=50&search=${encodeURIComponent(search)}`),
  });
  const detail = useQuery({
    queryKey: ["customer", selectedId],
    enabled: Boolean(selectedId) && mode !== "create",
    queryFn: () => api<Customer>(`/customers/${selectedId}`),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = clean(form);
      if (mode === "edit" && selectedId) {
        return api(`/customers/${selectedId}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      return api("/customers", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      setMode(null);
      setForm(blank);
      void client.invalidateQueries({ queryKey: ["customers"] });
      void client.invalidateQueries({ queryKey: ["customer", selectedId] });
    },
  });

  function fill(customer: Customer) {
    const guarantor = customer.guarantors?.[0];
    setForm({
      customerType: customer.customerType,
      fullName: customer.fullName,
      companyName: customer.companyName ?? "",
      phone: customer.phone,
      alternatePhone: customer.alternatePhone ?? "",
      email: customer.email ?? "",
      siteAddress: customer.siteAddress ?? "",
      billingAddress: customer.billingAddress ?? "",
      notes: customer.notes ?? "",
      guarantorFullName: guarantor?.fullName ?? "",
      guarantorPhone: guarantor?.phone ?? "",
      guarantorRelationship: guarantor?.relationship ?? "",
    });
  }

  const customer = detail.data;
  const rows = list.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Customers"
        description="Hirers, sites and guarantors used on every machine hire card."
        actions={
          <Button
            onPress={() => {
              setForm(blank);
              setSelectedId(null);
              setMode("create");
              save.reset();
            }}
          >
            <Plus size={16} /> New customer
          </Button>
        }
      />
      <div className="max-w-sm">
        <TextInput
          aria-label="Search customers"
          placeholder="Name, phone or code"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Site</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    setSelectedId(row.id);
                    setMode("view");
                  }}
                >
                  <td className="font-medium">{row.customerCode}</td>
                  <td>{row.fullName}</td>
                  <td className="tabular">{row.phone}</td>
                  <td>{row.siteAddress || "—"}</td>
                  <td className="capitalize">{pretty(row.customerType)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.isError && <Notice>{(list.error as Error).message}</Notice>}
          {!list.isLoading && rows.length === 0 && (
            <EmptyState title="No customers yet" hint="Add the hirer before opening a rental." />
          )}
        </div>
      </section>

      <Drawer
        open={mode === "view"}
        title={customer?.fullName ?? "Customer"}
        description={customer?.customerCode}
        onClose={() => setMode(null)}
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onPress={() => {
                if (customer) fill(customer);
                setMode("edit");
                save.reset();
              }}
            >
              Update
            </Button>
          </div>
        }
      >
        {detail.isError && <Notice>{(detail.error as Error).message}</Notice>}
        {customer && (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Type" value={pretty(customer.customerType)} />
              <Info label="Phone" value={customer.phone} />
              <Info label="Alt phone" value={customer.alternatePhone || "—"} />
              <Info label="Email" value={customer.email || "—"} />
              <Info label="Site" value={customer.siteAddress || "—"} />
              <Info label="Billing" value={customer.billingAddress || "—"} />
              <Info label="Company" value={customer.companyName || "—"} />
              <Info label="Guarantor" value={customer.guarantors?.[0]?.fullName || "—"} />
            </dl>
            {customer.notes && <p className="text-sm text-aiq-muted">{customer.notes}</p>}
            <div>
              <p className="mb-2 text-sm font-semibold">Recent hire cards</p>
              {(customer.rentals ?? []).length === 0 && <p className="text-sm text-aiq-muted">No rentals yet.</p>}
              <div className="space-y-2">
                {customer.rentals?.map((rental) => (
                  <div key={rental.id} className="flex items-center justify-between rounded-2xl bg-aiq-bg px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{rental.rentalNumber}</p>
                      <p className="text-xs text-aiq-muted">{when(rental.expectedReturnAt)} · {money(rental.grandTotal)}</p>
                    </div>
                    <StatusChip status={rental.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        open={mode === "create" || mode === "edit"}
        title={mode === "edit" ? "Update customer" : "New customer"}
        description="These details print on the hire card."
        onClose={() => setMode(mode === "edit" ? "view" : null)}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            save.mutate();
          }}
        >
          <CustomerFields form={form} setForm={setForm} />
          {save.isError && <Notice>{(save.error as Error).message}</Notice>}
          <FormActions
            busy={save.isPending}
            submitLabel={mode === "edit" ? "Save changes" : "Create customer"}
            onCancel={() => setMode(mode === "edit" ? "view" : null)}
          />
        </form>
      </Drawer>
    </div>
  );
}

function CustomerFields({
  form,
  setForm,
}: {
  form: typeof blank;
  setForm: (value: typeof blank) => void;
}) {
  const set = (key: keyof typeof blank, value: string) => setForm({ ...form, [key]: value });
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <SelectInput value={form.customerType} onChange={(e) => set("customerType", e.target.value)}>
            <option value="INDIVIDUAL">Individual</option>
            <option value="COMPANY">Company</option>
          </SelectInput>
        </Field>
        <Field label="Phone">
          <TextInput required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
      <Field label="Full name">
        <TextInput required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
      </Field>
      <Field label="Company">
        <TextInput value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Alternate phone">
          <TextInput value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      <Field label="Site / location">
        <TextInput value={form.siteAddress} placeholder="Dangote" onChange={(e) => set("siteAddress", e.target.value)} />
      </Field>
      <Field label="Billing address">
        <TextInput value={form.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} />
      </Field>
      <Field label="Guarantor">
        <TextInput value={form.guarantorFullName} onChange={(e) => set("guarantorFullName", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Guarantor phone">
          <TextInput value={form.guarantorPhone} onChange={(e) => set("guarantorPhone", e.target.value)} />
        </Field>
        <Field label="Relationship">
          <TextInput value={form.guarantorRelationship} onChange={(e) => set("guarantorRelationship", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <TextArea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </>
  );
}

function clean(form: typeof blank) {
  const body: Record<string, string> = {
    customerType: form.customerType,
    fullName: form.fullName,
    phone: form.phone,
  };
  for (const key of [
    "companyName",
    "alternatePhone",
    "email",
    "siteAddress",
    "billingAddress",
    "notes",
    "guarantorFullName",
    "guarantorPhone",
    "guarantorRelationship",
  ] as const) {
    if (form[key].trim()) body[key] = form[key].trim();
  }
  return body;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-aiq-bg px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-aiq-muted">{label}</dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banknote, ClipboardList, PackageCheck, UserRound } from "lucide-react";
import { QuickCustomerForm } from "@/components/quick-create";
import {
  Field,
  FieldWithAdd,
  FormActions,
  FormSection,
  Notice,
  PageHeader,
  SelectInput,
  TextInput,
  stop,
} from "@/components/ui";
import { api, money } from "@/lib/api";

type Customer = { id: string; fullName: string; phone: string };
type Asset = { id: string; assetCode: string; modelId: string; status: string; model: { name: string } };

export default function NewRentalPage() {
  const router = useRouter();
  const client = useQueryClient();
  const customers = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => api<Customer[]>("/customers?limit=100"),
  });
  const assets = useQuery({
    queryKey: ["assets", "available"],
    queryFn: () => api<Asset[]>("/equipment/assets?limit=100&status=AVAILABLE"),
  });
  const [customerId, setCustomerId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [site, setSite] = useState("");
  const [days, setDays] = useState("1");
  const [price, setPrice] = useState("30000");

  const estimatedTotal = (() => {
    const d = Number(days);
    const p = Number(price);
    if (!Number.isFinite(d) || !Number.isFinite(p) || d <= 0 || p <= 0) return 0;
    return Math.round(d * p);
  })();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("customerId");
    if (id) setCustomerId(id);
  }, []);
  const create = useMutation({
    mutationFn: async () => {
      const asset = assets.data?.find((item) => item.id === assetId);
      if (!asset) throw new Error("Select an available asset");
      const start = new Date();
      const end = new Date(start.getTime() + Number(days) * 86400000);
      const rental = await api<{ id: string }>("/rentals", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          startAt: start.toISOString(),
          expectedReturnAt: end.toISOString(),
          siteLocation: site,
          items: [{
            modelId: asset.modelId,
            assetId: asset.id,
            quantity: 1,
            pricingUnit: "DAY",
            unitPrice: Number(price),
            standardPrice: 30000,
            agreedDuration: Number(days),
          }],
        }),
      });
      await api(`/rentals/${rental.id}/confirm`, { method: "POST" });
      return rental;
    },
    onSuccess: () => router.push("/rentals"),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        eyebrow="Hire card"
        title="New rental"
        description="Pick the customer and an available machine. Confirming reserves that asset."
      />
      <p className="rounded-2xl border border-dashed border-aiq-line bg-white px-4 py-3 text-sm text-aiq-muted">
        Taking company equipment to site yourself? That is a{" "}
        <Link className="font-medium text-aiq-blue" href="/hires">
          staff hire
        </Link>{" "}
        — it never asks for a price, invoice or payment.
      </p>
      <form
        className="grid gap-4 rounded-3xl border border-aiq-line bg-white p-4 shadow-[0_20px_50px_-40px_rgba(20,36,58,0.6)] sm:p-6"
        onSubmit={(event) => {
          stop(event);
          create.mutate();
        }}
      >
        <FormSection
          title="Who is hiring"
          description="Customer details print on the hire card"
          icon={<UserRound size={15} />}
        >
          <FieldWithAdd
            label="Customer"
            addLabel="New customer"
            panel={(close) => (
              <QuickCustomerForm
                onCreated={(customer) => {
                  setCustomerId(customer.id);
                  void client.invalidateQueries({ queryKey: ["customers"] });
                  close();
                }}
                onCancel={close}
              />
            )}
          >
            <SelectInput required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer</option>
              {(customers.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.phone}</option>
              ))}
            </SelectInput>
          </FieldWithAdd>
        </FormSection>

        <FormSection
          title="Machine & site"
          description="Only available assets can be reserved"
          icon={<PackageCheck size={15} />}
          tone="cyan"
        >
          <Field label="Available equipment" required>
            <SelectInput required value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Select asset</option>
              {(assets.data ?? []).map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.assetCode} · {asset.model.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Site location">
            <TextInput placeholder="Dangote" value={site} onChange={(e) => setSite(e.target.value)} />
          </Field>
        </FormSection>

        <FormSection
          title="Duration & price"
          description="Charged per day from today"
          icon={<Banknote size={15} />}
          tone="green"
          aside={
            <span className="tabular rounded-full bg-aiq-green/10 px-2.5 py-1 text-[11px] font-semibold text-aiq-green">
              {estimatedTotal > 0 ? money(estimatedTotal) : "—"}
            </span>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Days">
              <TextInput inputMode="decimal" value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
            <Field label="Daily price (TZS)">
              <TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          </div>
        </FormSection>

        {create.isError && <Notice>{(create.error as Error).message}</Notice>}
        <FormActions
          busy={create.isPending}
          submitLabel="Create and confirm"
          hint="Confirming reserves the asset immediately."
          onCancel={() => router.push("/rentals")}
        />
      </form>
    </div>
  );
}

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormActions, Notice, PageHeader, SelectInput, TextInput, stop } from "@/components/ui";
import { api } from "@/lib/api";

type Customer = { id: string; fullName: string; phone: string };
type Asset = { id: string; assetCode: string; modelId: string; status: string; model: { name: string } };

export default function NewRentalPage() {
  const router = useRouter();
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
      <form
        className="grid gap-4 rounded-3xl border border-aiq-line bg-white p-6"
        onSubmit={(event) => {
          stop(event);
          create.mutate();
        }}
      >
        <Field label="Customer">
          <SelectInput required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {(customers.data ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.phone}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Available equipment">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Days">
            <TextInput inputMode="decimal" value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <Field label="Daily price (TZS)">
            <TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>
        {create.isError && <Notice>{(create.error as Error).message}</Notice>}
        <FormActions busy={create.isPending} submitLabel="Create and confirm" onCancel={() => router.push("/rentals")} />
      </form>
    </div>
  );
}

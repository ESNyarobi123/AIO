"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Field, Notice, SelectInput, TextArea, TextInput, pretty } from "@/components/ui";
import { api } from "@/lib/api";

type Category = { id: string; name: string };
type Model = { id: string; name: string; brand?: string | null };
type Customer = { id: string; fullName: string; phone: string };

const PRICING_UNITS = ["HOUR", "DAY", "WEEK", "MONTH"] as const;

function categoryCode(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "CATEGORY").slice(0, 24);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not save";
}

export function QuickCategoryForm({
  initialName = "",
  onCreated,
  onCancel,
}: {
  initialName?: string;
  onCreated: (category: Category) => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [trackingMode, setTrackingMode] = useState<"INDIVIDUAL" | "QUANTITY">(
    "INDIVIDUAL",
  );

  const create = useMutation({
    mutationFn: () =>
      api<Category>("/equipment/categories", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          code: categoryCode(name),
          description: description || undefined,
          trackingMode,
        }),
      }),
    onSuccess: (category) => {
      void client.invalidateQueries({ queryKey: ["categories"] });
      void client.invalidateQueries({ queryKey: ["models"] });
      onCreated(category);
    },
  });

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-aiq-muted">
          New category
        </p>
        <Button size="sm" variant="ghost" type="button" onPress={onCancel}>
          Cancel
        </Button>
      </div>
      <Field label="Category name">
        <TextInput
          autoFocus
          placeholder="Power tools"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="Description (optional)">
        <TextInput
          placeholder="Generators, compactors…"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label="Stock tracking">
        <SelectInput
          value={trackingMode}
          onChange={(event) =>
            setTrackingMode(event.target.value as "INDIVIDUAL" | "QUANTITY")
          }
        >
          <option value="INDIVIDUAL">Individual machines (each asset coded)</option>
          <option value="QUANTITY">Quantity stock (consumables)</option>
        </SelectInput>
      </Field>
      <p className="text-xs text-aiq-muted">
        Code: {categoryCode(name) || "—"}
      </p>
      {create.isError && <Notice>{errorMessage(create.error)}</Notice>}
      <div className="flex justify-end">
        <Button
          size="sm"
          type="button"
          isDisabled={create.isPending || name.trim().length < 2}
          onPress={() => create.mutate()}
        >
          {create.isPending ? "Saving…" : "Add category"}
        </Button>
      </div>
    </div>
  );
}

export function QuickModelForm({
  defaultCategoryId,
  onCreated,
  onCancel,
}: {
  defaultCategoryId?: string;
  onCreated: (model: Model) => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/equipment/categories?limit=100"),
  });

  const [showCategory, setShowCategory] = useState(false);
  const [form, setForm] = useState({
    categoryId: defaultCategoryId ?? "",
    name: "",
    brand: "",
    modelNumber: "",
    description: "",
    deposit: "",
    hour: "",
    day: "",
    week: "",
    month: "",
    accessories: "",
  });
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const create = useMutation({
    mutationFn: () => {
      const prices = PRICING_UNITS.flatMap((unit) => {
        const raw = form[unit.toLowerCase() as "hour" | "day" | "week" | "month"];
        if (!raw.trim()) return [];
        return [{ pricingUnit: unit, amount: Number(raw), minimumDuration: 1 }];
      });
      const accessories = form.accessories
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

      return api<Model>("/equipment/models", {
        method: "POST",
        body: JSON.stringify({
          categoryId: form.categoryId,
          name: form.name.trim(),
          brand: form.brand.trim() || undefined,
          modelNumber: form.modelNumber.trim() || undefined,
          description: form.description.trim() || undefined,
          defaultDeposit: form.deposit ? Number(form.deposit) : undefined,
          prices: prices.length ? prices : undefined,
          accessories: accessories.length ? accessories : undefined,
        }),
      });
    },
    onSuccess: (model) => {
      void client.invalidateQueries({ queryKey: ["models"] });
      onCreated(model);
    },
  });

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-aiq-muted">
          New equipment model
        </p>
        <Button size="sm" variant="ghost" type="button" onPress={onCancel}>
          Cancel
        </Button>
      </div>

      <Field label="Category">
        <div className="flex gap-2">
          <SelectInput
            value={form.categoryId}
            onChange={(event) => set("categoryId", event.target.value)}
          >
            <option value="">Select category</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
          <Button
            isIconOnly
            type="button"
            variant="secondary"
            aria-label="Add a category"
            onPress={() => setShowCategory((value) => !value)}
          >
            <Plus size={16} />
          </Button>
        </div>
      </Field>

      {showCategory && (
        <div className="rounded-2xl border border-dashed border-aiq-line bg-white p-3">
          <QuickCategoryForm
            onCreated={(category) => {
              set("categoryId", category.id);
              setShowCategory(false);
            }}
            onCancel={() => setShowCategory(false)}
          />
        </div>
      )}

      <Field label="Model name">
        <TextInput
          placeholder="Poker Vibrator 38mm"
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Brand">
          <TextInput
            placeholder="Honda"
            value={form.brand}
            onChange={(event) => set("brand", event.target.value)}
          />
        </Field>
        <Field label="Model number">
          <TextInput
            placeholder="GX160"
            value={form.modelNumber}
            onChange={(event) => set("modelNumber", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Description">
        <TextArea
          className="min-h-16"
          placeholder="What it is used for"
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
        />
      </Field>
      <Field label="Default deposit (TZS)">
        <TextInput
          inputMode="numeric"
          placeholder="50000"
          value={form.deposit}
          onChange={(event) => set("deposit", event.target.value)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        {PRICING_UNITS.map((unit) => (
          <Field key={unit} label={`${pretty(unit)} rate (TZS)`}>
            <TextInput
              inputMode="decimal"
              placeholder={unit === "DAY" ? "30000" : "optional"}
              value={form[unit.toLowerCase() as "hour" | "day" | "week" | "month"]}
              onChange={(event) =>
                set(unit.toLowerCase() as "hour" | "day" | "week" | "month", event.target.value)
              }
            />
          </Field>
        ))}
      </div>

      <Field label="Accessories (comma separated)">
        <TextInput
          placeholder="Poker, hose, wheel kit"
          value={form.accessories}
          onChange={(event) => set("accessories", event.target.value)}
        />
      </Field>

      {create.isError && <Notice>{errorMessage(create.error)}</Notice>}
      <div className="flex justify-end">
        <Button
          size="sm"
          type="button"
          isDisabled={
            create.isPending || !form.categoryId || form.name.trim().length < 2
          }
          onPress={() => create.mutate()}
        >
          {create.isPending ? "Saving…" : "Add model"}
        </Button>
      </div>
    </div>
  );
}

export function QuickCustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (customer: Customer) => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const [form, setForm] = useState({
    customerType: "INDIVIDUAL",
    fullName: "",
    companyName: "",
    phone: "",
    alternatePhone: "",
    siteAddress: "",
  });
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const create = useMutation({
    mutationFn: () =>
      api<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify({
          customerType: form.customerType,
          fullName: form.fullName.trim(),
          companyName:
            form.customerType === "COMPANY" ? form.companyName.trim() || undefined : undefined,
          phone: form.phone.trim(),
          alternatePhone: form.alternatePhone.trim() || undefined,
          siteAddress: form.siteAddress.trim() || undefined,
        }),
      }),
    onSuccess: (customer) => {
      void client.invalidateQueries({ queryKey: ["customers"] });
      onCreated(customer);
    },
  });

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-aiq-muted">
          New customer
        </p>
        <Button size="sm" variant="ghost" type="button" onPress={onCancel}>
          Cancel
        </Button>
      </div>
      <Field label="Customer type">
        <SelectInput
          value={form.customerType}
          onChange={(event) => set("customerType", event.target.value)}
        >
          <option value="INDIVIDUAL">Individual</option>
          <option value="COMPANY">Company</option>
        </SelectInput>
      </Field>
      {form.customerType === "COMPANY" && (
        <Field label="Company name">
          <TextInput
            value={form.companyName}
            onChange={(event) => set("companyName", event.target.value)}
          />
        </Field>
      )}
      <Field label="Full name">
        <TextInput
          value={form.fullName}
          onChange={(event) => set("fullName", event.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone">
          <TextInput
            placeholder="07XXXXXXXX"
            value={form.phone}
            onChange={(event) => set("phone", event.target.value)}
          />
        </Field>
        <Field label="Alternate phone">
          <TextInput
            value={form.alternatePhone}
            onChange={(event) => set("alternatePhone", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Site address">
        <TextInput
          value={form.siteAddress}
          onChange={(event) => set("siteAddress", event.target.value)}
        />
      </Field>
      {create.isError && <Notice>{errorMessage(create.error)}</Notice>}
      <div className="flex justify-end">
        <Button
          size="sm"
          type="button"
          isDisabled={
            create.isPending || !form.fullName.trim() || !form.phone.trim()
          }
          onPress={() => create.mutate()}
        >
          {create.isPending ? "Saving…" : "Add customer"}
        </Button>
      </div>
    </div>
  );
}

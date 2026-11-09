"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Layers,
  PackageCheck,
  Pencil,
  PencilLine,
  Plus,
  Tag,
  Tags,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog, RowActionButton, RowActions } from "@/components/actions";
import { QuickCategoryForm } from "@/components/quick-create";
import { useToast } from "@/components/toast";
import {
  Drawer,
  EmptyState,
  Field,
  FieldWithAdd,
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
import { api, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Category = {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  _count?: { models: number };
};
type Price = { pricingUnit: string; amount: string | number };
type Accessory = { id?: string; name: string; description?: string | null; isRequired?: boolean };
type Model = {
  id: string;
  name: string;
  brand?: string | null;
  modelNumber?: string | null;
  description?: string | null;
  defaultDeposit?: string | null;
  category: Category;
  prices?: Price[];
  accessories?: Accessory[];
  assets?: Array<{ id: string; assetCode: string; status: string }>;
  _count?: { assets: number };
};

const UNITS = ["HOUR", "DAY", "WEEK", "MONTH"] as const;

type FormState = {
  categoryId: string;
  name: string;
  brand: string;
  modelNumber: string;
  description: string;
  deposit: string;
  hour: string;
  day: string;
  week: string;
  month: string;
  accessories: string;
};

const blank: FormState = {
  categoryId: "",
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
};

function fromModel(model: Model): FormState {
  const price = (unit: string) =>
    model.prices?.find((row) => row.pricingUnit === unit)?.amount?.toString() ?? "";
  return {
    categoryId: model.category.id,
    name: model.name,
    brand: model.brand ?? "",
    modelNumber: model.modelNumber ?? "",
    description: model.description ?? "",
    deposit: model.defaultDeposit ?? "",
    hour: price("HOUR"),
    day: price("DAY"),
    week: price("WEEK"),
    month: price("MONTH"),
    accessories: (model.accessories ?? []).map((item) => item.name).join(", "),
  };
}

function buildBody(form: FormState) {
  const prices = UNITS.flatMap((unit) => {
    const raw = form[unit.toLowerCase() as "hour" | "day" | "week" | "month"];
    if (!raw.trim()) return [];
    return [{ pricingUnit: unit, amount: Number(raw), minimumDuration: 1 }];
  });
  const accessories = form.accessories
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  return {
    categoryId: form.categoryId,
    name: form.name.trim(),
    brand: form.brand.trim() || undefined,
    modelNumber: form.modelNumber.trim() || undefined,
    description: form.description.trim() || undefined,
    defaultDeposit: form.deposit ? Number(form.deposit) : undefined,
    prices,
    accessories,
  };
}

export default function EquipmentModelsPage() {
  const client = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const canManage = user?.permissions.includes("equipment.create") ?? false;
  const canDelete = user?.roles.includes("ADMIN") ?? false;

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mode, setMode] = useState<"create" | "view" | "edit" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [showCategory, setShowCategory] = useState(false);
  const [confirmRow, setConfirmRow] = useState<Model | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [catEdit, setCatEdit] = useState<{
    id: string;
    name: string;
    code: string;
    description: string;
  } | null>(null);
  const [catConfirm, setCatConfirm] = useState<Category | null>(null);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/equipment/categories?limit=100"),
  });
  const list = useQuery({
    queryKey: ["models", search, categoryId],
    queryFn: () =>
      api<Model[]>(
        `/equipment/models?limit=100&search=${encodeURIComponent(search)}${
          categoryId ? `&categoryId=${categoryId}` : ""
        }`,
      ),
  });
  const detail = useQuery({
    queryKey: ["model", selectedId],
    enabled: Boolean(selectedId) && mode !== "create",
    queryFn: () => api<Model>(`/equipment/models/${selectedId}`),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = buildBody(form);
      if (mode === "edit" && selectedId) {
        return api(`/equipment/models/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      return api<Model>("/equipment/models", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["models"] });
      void client.invalidateQueries({ queryKey: ["model"] });
      if (mode === "create" && result && typeof result === "object" && "id" in result) {
        setSelectedId((result as Model).id);
        setMode("view");
      } else {
        setMode("view");
      }
    },
  });

  const shown = detail.data;
  const rows = list.data ?? [];
  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const remove = useMutation({
    mutationFn: (id: string) => api(`/equipment/models/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirmRow(null);
      setMode(null);
      toast.success("Model deleted");
      void client.invalidateQueries({ queryKey: ["models"] });
      void client.invalidateQueries({ queryKey: ["model"] });
    },
  });

  const saveCategory = useMutation({
    mutationFn: (payload: { id: string; name: string; code: string; description: string }) =>
      api(`/equipment/categories/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.name.trim(),
          code: payload.code.trim(),
          description: payload.description.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setCatEdit(null);
      toast.success("Category updated");
      void client.invalidateQueries({ queryKey: ["categories"] });
      void client.invalidateQueries({ queryKey: ["models"] });
    },
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => api(`/equipment/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setCatConfirm(null);
      toast.success("Category deleted");
      void client.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteIssue = remove.error as { status?: number; message?: string } | null;
  const deleteBlocked = deleteIssue?.status === 409 ? deleteIssue.message : undefined;
  const deleteError =
    deleteIssue && deleteIssue.status !== 409 ? deleteIssue.message : undefined;
  const catIssue = removeCategory.error as { status?: number; message?: string } | null;
  const catBlocked = catIssue?.status === 409 ? catIssue.message : undefined;
  const catError = catIssue && catIssue.status !== 409 ? catIssue.message : undefined;

  async function editRow(row: Model) {
    try {
      const full = await client.fetchQuery({
        queryKey: ["model", row.id],
        queryFn: () => api<Model>(`/equipment/models/${row.id}`),
      });
      setSelectedId(row.id);
      setForm(fromModel(full));
      save.reset();
      setMode("edit");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the model");
    }
  }

  function openCreate() {
    setForm({ ...blank, categoryId: categories.data?.[0]?.id ?? "" });
    setShowCategory(false);
    save.reset();
    setMode("create");
  }

  function openEdit() {
    if (!shown) return;
    setForm(fromModel(shown));
    setShowCategory(false);
    save.reset();
    setMode("edit");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Equipment"
        title="Models & pricing"
        description="A model is the product you hire out — its category, brand, deposit and rate card. Assets are the individual machines of each model."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onPress={() => setCategoriesOpen(true)}>
                <Tags size={16} /> Categories
              </Button>
              <Button onPress={openCreate}>
                <Plus size={16} /> New model
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onPress={() => router.push("/equipment")}>
              Back to assets
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="w-full max-w-sm">
          <TextInput
            aria-label="Search models"
            placeholder="Search model, brand or number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="w-full max-w-56">
          <SelectInput
            aria-label="Filter by category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">All categories</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Category</th>
                <th>Units</th>
                <th>Day rate</th>
                <th>Week rate</th>
                <th>Deposit</th>
                <th className="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((model) => {
                const day = model.prices?.find((price) => price.pricingUnit === "DAY");
                const week = model.prices?.find((price) => price.pricingUnit === "WEEK");
                return (
                  <tr
                    key={model.id}
                    onClick={() => {
                      setSelectedId(model.id);
                      setMode("view");
                      save.reset();
                    }}
                  >
                    <td>
                      <p className="font-medium">{model.name}</p>
                      <p className="text-xs text-aiq-muted">
                        {[model.brand, model.modelNumber].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                    <td>{model.category?.name ?? "—"}</td>
                    <td className="tabular">{model._count?.assets ?? 0}</td>
                    <td className="tabular">{day ? money(day.amount) : "—"}</td>
                    <td className="tabular">{week ? money(week.amount) : "—"}</td>
                    <td className="tabular">
                      {model.defaultDeposit ? money(model.defaultDeposit) : "—"}
                    </td>
                    <td>
                      <RowActions>
                        <RowActionButton
                          label={`Edit ${model.name}`}
                          tone="edit"
                          onPress={() => void editRow(model)}
                        >
                          <Pencil size={15} />
                        </RowActionButton>
                        {canDelete && (
                          <RowActionButton
                            label={`Delete ${model.name}`}
                            tone="delete"
                            onPress={() => {
                              remove.reset();
                              setConfirmRow(model);
                            }}
                          >
                            <Trash2 size={15} />
                          </RowActionButton>
                        )}
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.isError && <Notice>{(list.error as Error).message}</Notice>}
          {!list.isLoading && !list.isError && rows.length === 0 && (
            <EmptyState
              title="No models yet"
              hint="Press “New model” to add the first product you hire out."
            />
          )}
        </div>
      </section>

      <Drawer
        open={mode === "view" && Boolean(selectedId)}
        title={shown?.name ?? "Model"}
        eyebrow="Product & rate card"
        icon={<Layers size={19} />}
        size="lg"
        description={shown ? `${shown.category.name}${shown.brand ? ` · ${shown.brand}` : ""}` : undefined}
        onClose={() => setMode(null)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onPress={() =>
                router.push(`/equipment?modelId=${selectedId}`)
              }
            >
              Add an asset of this model
            </Button>
            {canManage && (
              <Button onPress={openEdit}>Update model</Button>
            )}
          </div>
        }
      >
        {shown && (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Model number" value={shown.modelNumber || "—"} />
              <Info label="Brand" value={shown.brand || "—"} />
              <Info label="Category" value={shown.category.name} />
              <Info
                label="Default deposit"
                value={shown.defaultDeposit ? money(shown.defaultDeposit) : "—"}
              />
            </dl>

            <div>
              <p className="text-sm font-semibold">Rate card</p>
              <div className="mt-2 overflow-hidden rounded-2xl border border-aiq-line">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(shown.prices ?? []).length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-aiq-muted">
                          No rates captured yet.
                        </td>
                      </tr>
                    )}
                    {(shown.prices ?? []).map((price) => (
                      <tr key={price.pricingUnit}>
                        <td className="capitalize">{pretty(price.pricingUnit)}</td>
                        <td className="tabular">{money(price.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">Accessories</p>
              <p className="mt-1 text-sm text-aiq-muted">
                {(shown.accessories ?? []).map((item) => item.name).join(", ") || "None listed"}
              </p>
            </div>

            {shown.description && (
              <div>
                <p className="text-sm font-semibold">Description</p>
                <p className="mt-1 text-sm text-aiq-muted">{shown.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold">
                Assets ({shown.assets?.length ?? shown._count?.assets ?? 0})
              </p>
              <p className="mt-1 text-sm text-aiq-muted">
                {(shown.assets ?? []).map((asset) => asset.assetCode).join(", ") ||
                  "No units registered yet."}
              </p>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        open={mode === "create" || mode === "edit"}
        title={mode === "edit" ? "Update model" : "New model"}
        eyebrow="Models & pricing"
        icon={mode === "edit" ? <PencilLine size={19} /> : <Layers size={19} />}
        size="lg"
        description="Models group identical machines and hold the rate card."
        onClose={() => setMode(mode === "edit" ? "view" : null)}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            save.mutate();
          }}
        >
          <FormSection
            title="What you are hiring out"
            description="Category, name and maker"
            icon={<Tag size={15} />}
          >
            <FieldWithAdd
              label="Category"
              addLabel="New category"
              panel={(close) => (
                <QuickCategoryForm
                  onCreated={(category) => {
                    set("categoryId", category.id);
                    void client.invalidateQueries({ queryKey: ["categories"] });
                    close();
                  }}
                  onCancel={close}
                />
              )}
            >
              <SelectInput
                required
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
            </FieldWithAdd>

            <Field label="Model name" required>
              <TextInput
                required
                minLength={2}
                placeholder="Poker Vibrator 38mm"
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
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
                placeholder="What it is used for on site"
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </FormSection>

          <FormSection
            title="Rate card & deposit"
            description="Daily, weekly and monthly pricing in TZS"
            icon={<Banknote size={15} />}
            tone="green"
          >
            <Field label="Default deposit (TZS)" hint="refundable">
              <TextInput
                inputMode="numeric"
                placeholder="50000"
                value={form.deposit}
                onChange={(event) => set("deposit", event.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              {UNITS.map((unit) => (
                <Field key={unit} label={`${pretty(unit)} rate (TZS)`}>
                  <TextInput
                    inputMode="decimal"
                    placeholder={unit === "DAY" ? "30000" : "optional"}
                    value={form[unit.toLowerCase() as "hour" | "day" | "week" | "month"]}
                    onChange={(event) =>
                      set(
                        unit.toLowerCase() as "hour" | "day" | "week" | "month",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-aiq-muted">
              Leave a unit blank if you do not hire it out that way.
            </p>
          </FormSection>

          <FormSection
            title="Accessories"
            description="What should travel with the machine"
            icon={<PackageCheck size={15} />}
            tone="gold"
          >
            <Field label="Accessories" hint="comma separated">
              <TextInput
                placeholder="Poker, hose, wheel kit"
                value={form.accessories}
                onChange={(event) => set("accessories", event.target.value)}
              />
            </Field>
          </FormSection>

          {save.isError && <Notice>{(save.error as Error).message}</Notice>}
          <FormActions
            busy={save.isPending}
            submitLabel={mode === "edit" ? "Save model" : "Create model"}
            onCancel={() => setMode(mode === "edit" ? "view" : null)}
          />
        </form>
      </Drawer>

      <Drawer
        open={categoriesOpen}
        title="Categories"
        eyebrow="Catalogue"
        icon={<Tags size={19} />}
        description="Categories group models. Rename one or remove an empty category."
        onClose={() => {
          setCategoriesOpen(false);
          setCatEdit(null);
        }}
        footer={
          <div className="flex justify-end">
            <Button variant="ghost" onPress={() => setCategoriesOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {(categories.data ?? []).length === 0 && (
            <p className="text-sm text-aiq-muted">No categories yet.</p>
          )}
          {(categories.data ?? []).map((category) => (
            <div
              key={category.id}
              className="rounded-2xl border border-aiq-line bg-white px-3.5 py-3"
            >
              {catEdit?.id === category.id ? (
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    stop(event);
                    saveCategory.mutate(catEdit);
                  }}
                >
                  <TextInput
                    required
                    aria-label="Category name"
                    value={catEdit.name}
                    onChange={(event) =>
                      setCatEdit({ ...catEdit, name: event.target.value })
                    }
                  />
                  <TextInput
                    required
                    aria-label="Category code"
                    value={catEdit.code}
                    onChange={(event) =>
                      setCatEdit({ ...catEdit, code: event.target.value })
                    }
                  />
                  {saveCategory.isError && (
                    <Notice>{(saveCategory.error as Error).message}</Notice>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onPress={() => {
                        setCatEdit(null);
                        saveCategory.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" type="submit" isDisabled={saveCategory.isPending}>
                      {saveCategory.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-aiq-ink">{category.name}</p>
                    <p className="truncate text-xs text-aiq-muted">
                      {category.code ?? "—"} · {category._count?.models ?? 0}{" "}
                      {(category._count?.models ?? 0) === 1 ? "model" : "models"}
                    </p>
                  </div>
                  <RowActions>
                    <RowActionButton
                      label={`Edit ${category.name}`}
                      tone="edit"
                      onPress={() => {
                        saveCategory.reset();
                        setCatEdit({
                          id: category.id,
                          name: category.name,
                          code: category.code ?? "",
                          description: category.description ?? "",
                        });
                      }}
                    >
                      <Pencil size={15} />
                    </RowActionButton>
                    {canDelete && (
                      <RowActionButton
                        label={`Delete ${category.name}`}
                        tone="delete"
                        onPress={() => {
                          removeCategory.reset();
                          setCatConfirm(category);
                        }}
                      >
                        <Trash2 size={15} />
                      </RowActionButton>
                    )}
                  </RowActions>
                </div>
              )}
            </div>
          ))}
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Delete this model?"
        description="Models that still have machines or hire history cannot be deleted, so past rate cards stay accurate."
        eyebrow="Permanent action"
        icon={<Trash2 size={19} />}
        tone="danger"
        details={
          confirmRow
            ? [
                { label: "Model", value: confirmRow.name },
                { label: "Category", value: confirmRow.category?.name ?? "—" },
                {
                  label: "Machines",
                  value: String(confirmRow._count?.assets ?? 0),
                },
              ]
            : undefined
        }
        confirmLabel="Delete model"
        busy={remove.isPending}
        blocked={deleteBlocked}
        error={deleteError}
        onClose={() => {
          setConfirmRow(null);
          remove.reset();
        }}
        onConfirm={() => {
          if (confirmRow) remove.mutate(confirmRow.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(catConfirm)}
        title="Delete this category?"
        description="Only an empty category can be removed."
        eyebrow="Permanent action"
        icon={<Trash2 size={19} />}
        tone="danger"
        details={
          catConfirm
            ? [
                { label: "Category", value: catConfirm.name },
                { label: "Code", value: catConfirm.code ?? "—" },
                {
                  label: "Models",
                  value: String(catConfirm._count?.models ?? 0),
                },
              ]
            : undefined
        }
        confirmLabel="Delete category"
        busy={removeCategory.isPending}
        blocked={catBlocked}
        error={catError}
        onClose={() => {
          setCatConfirm(null);
          removeCategory.reset();
        }}
        onConfirm={() => {
          if (catConfirm) removeCategory.mutate(catConfirm.id);
        }}
      />
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

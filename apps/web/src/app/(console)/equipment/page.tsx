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
import { api, API_URL, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Model = { id: string; name: string; brand?: string | null; category?: { name: string } };
type AssetImage = { id: string; fileKey: string };
type Asset = {
  id: string;
  assetCode: string;
  modelId: string;
  status: string;
  condition: string;
  serialNumber?: string | null;
  currentLocation?: string | null;
  notes?: string | null;
  images?: AssetImage[];
  model: { name: string; brand?: string | null; category: { name: string } };
};

const blank = {
  assetCode: "",
  modelId: "",
  serialNumber: "",
  currentLocation: "Goba Store",
  condition: "GOOD",
  status: "AVAILABLE",
  notes: "",
};

export default function EquipmentPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.permissions.includes("equipment.update") ?? false;
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"create" | "view" | "edit" | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [form, setForm] = useState(blank);

  const list = useQuery({
    queryKey: ["assets", search],
    queryFn: () => api<Asset[]>(`/equipment/assets?limit=50&search=${encodeURIComponent(search)}`),
  });
  const models = useQuery({
    queryKey: ["models"],
    queryFn: () => api<Model[]>("/equipment/models?limit=100"),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        assetCode: form.assetCode.trim(),
        modelId: form.modelId,
        serialNumber: form.serialNumber || undefined,
        currentLocation: form.currentLocation || undefined,
        condition: form.condition,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (mode === "edit" && selected) {
        return api(`/equipment/assets/${selected.id}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      return api("/equipment/assets", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      setMode(null);
      void client.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const rows = list.data ?? [];
  const detail = useQuery({
    queryKey: ["asset", selected?.id],
    enabled: Boolean(selected?.id) && mode === "view",
    queryFn: () => api<Asset>(`/equipment/assets/${selected?.id}`),
  });
  const shown = detail.data ?? selected;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Equipment"
        description="Each machine has its own asset code, condition and live status."
        actions={
          <Button
            onPress={() => {
              setForm({ ...blank, modelId: models.data?.[0]?.id ?? "" });
              setMode("create");
              save.reset();
            }}
          >
            <Plus size={16} /> New asset
          </Button>
        }
      />
      <div className="max-w-sm">
        <TextInput
          aria-label="Search assets"
          placeholder="AIQ-PK-001"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Asset</th>
                <th>Equipment</th>
                <th>Category</th>
                <th>Location</th>
                <th>Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => {
                    setSelected(asset);
                    setMode("view");
                  }}
                >
                  <td>
                    {asset.images?.[0] ? (
                      <img src={mediaUrl(asset.images[0].fileKey)} alt="" className="size-12 rounded-xl object-cover" />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-xl bg-aiq-bg text-[10px] text-aiq-muted">None</span>
                    )}
                  </td>
                  <td className="font-medium">{asset.assetCode}</td>
                  <td>{asset.model.name}{asset.model.brand ? ` · ${asset.model.brand}` : ""}</td>
                  <td>{asset.model.category.name}</td>
                  <td>{asset.currentLocation || "—"}</td>
                  <td className="capitalize">{pretty(asset.condition)}</td>
                  <td><StatusChip status={asset.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.isError && <Notice>{(list.error as Error).message}</Notice>}
          {!list.isLoading && rows.length === 0 && <EmptyState title="No assets found" />}
        </div>
      </section>

      <Drawer
        open={mode === "view" && Boolean(selected)}
        title={shown?.assetCode ?? "Asset"}
        description={shown ? `${shown.model.name} · ${shown.model.category.name}` : undefined}
        onClose={() => setMode(null)}
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onPress={() => {
                if (!selected) return;
                setForm({
                  assetCode: selected.assetCode,
                  modelId: selected.modelId,
                  serialNumber: selected.serialNumber ?? "",
                  currentLocation: selected.currentLocation ?? "",
                  condition: selected.condition,
                  status: selected.status,
                  notes: selected.notes ?? "",
                });
                setMode("edit");
                save.reset();
              }}
            >
              Update
            </Button>
          </div>
        }
      >
        {shown && (
          <div className="space-y-5">
            <AssetPhotos assetId={shown.id} images={shown.images ?? []} canManage={canManage} />
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Serial" value={shown.serialNumber || "—"} />
              <Info label="Location" value={shown.currentLocation || "—"} />
              <Info label="Condition" value={pretty(shown.condition)} />
              <Info label="Status" value={pretty(shown.status)} />
              <Info label="Notes" value={shown.notes || "—"} />
            </dl>
          </div>
        )}
      </Drawer>

      <Drawer
        open={mode === "create" || mode === "edit"}
        title={mode === "edit" ? "Update asset" : "New asset"}
        description="Asset codes stay unique across the yard."
        onClose={() => setMode(mode === "edit" ? "view" : null)}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            save.mutate();
          }}
        >
          <Field label="Asset code">
            <TextInput required minLength={3} value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value })} />
          </Field>
          <Field label="Model">
            <SelectInput required value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
              <option value="">Select model</option>
              {(models.data ?? []).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}{model.brand ? ` · ${model.brand}` : ""}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Condition">
              <SelectInput value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {["EXCELLENT", "GOOD", "FAIR", "DAMAGED", "MISSING"].map((value) => (
                  <option key={value} value={value}>{pretty(value)}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {["AVAILABLE", "RESERVED", "RENTED", "INSPECTION", "MAINTENANCE", "RETIRED", "LOST"].map((value) => (
                  <option key={value} value={value}>{pretty(value)}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Serial number">
            <TextInput value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          </Field>
          <Field label="Location">
            <TextInput value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} />
          </Field>
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {save.isError && <Notice>{(save.error as Error).message}</Notice>}
          <FormActions
            busy={save.isPending}
            submitLabel={mode === "edit" ? "Save asset" : "Create asset"}
            onCancel={() => setMode(mode === "edit" ? "view" : null)}
          />
        </form>
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

function AssetPhotos({
  assetId,
  images,
  canManage,
}: {
  assetId: string;
  images: AssetImage[];
  canManage: boolean;
}) {
  const client = useQueryClient();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function attachUrl(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/files/from-url", {
        method: "POST",
        body: JSON.stringify({ url, assetId }),
      });
      setUrl("");
      await client.invalidateQueries({ queryKey: ["assets"] });
      await client.invalidateQueries({ queryKey: ["asset", assetId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the image URL");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("assetId", assetId);
      const token = localStorage.getItem("aiq_token");
      const response = await fetch(`${API_URL}/files/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const payload = (await response.json()) as { error?: { message?: string | string[] } };
      if (!response.ok) {
        const message = payload.error?.message;
        throw new Error(Array.isArray(message) ? message.join(", ") : message || "Upload failed");
      }
      await client.invalidateQueries({ queryKey: ["assets"] });
      await client.invalidateQueries({ queryKey: ["asset", assetId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Photos</p>
      <div className="flex gap-2 overflow-x-auto">
        {images.length === 0 && <p className="text-sm text-aiq-muted">No photo yet.</p>}
        {images.map((image) => (
          <img key={image.id} src={mediaUrl(image.fileKey)} alt="" className="h-28 w-36 rounded-2xl object-cover" />
        ))}
      </div>
      {canManage && (
        <div className="grid gap-3 rounded-2xl border border-aiq-line p-3">
          <form className="flex gap-2" onSubmit={attachUrl}>
            <TextInput
              required
              type="url"
              placeholder="https://… image URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <Button type="submit" variant="secondary" isDisabled={busy}>URL</Button>
          </form>
          <label className="text-sm font-medium text-aiq-blue">
            {busy ? "Saving photo…" : "Or upload a file"}
            <input
              className="mt-1 block w-full text-sm text-aiq-ink"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {error && <Notice>{error}</Notice>}
    </div>
  );
}

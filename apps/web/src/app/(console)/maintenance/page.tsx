"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
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

type Job = {
  id: string;
  maintenanceNumber: string;
  issueDescription: string;
  status: string;
  priority: string;
  laborCost: string;
  partsCost: string;
  otherCost: string;
  totalCost: string;
  createdAt: string;
  completedAt?: string | null;
  asset: { id: string; assetCode: string; model: { name: string } };
};

type Asset = {
  id: string;
  assetCode: string;
  status: string;
  model: { name: string };
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const blank = {
  assetId: "",
  issueDescription: "",
  priority: "MEDIUM",
  status: "OPEN",
  laborCost: "",
  partsCost: "",
  otherCost: "",
};

export default function MaintenancePage() {
  const client = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canManage = user?.roles.includes("ADMIN") || (user?.permissions.includes("equipment.update") ?? false);
  const canDelete = user?.roles.includes("ADMIN") ?? false;

  const [mode, setMode] = useState<"create" | "view" | "edit" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [confirmRow, setConfirmRow] = useState<Job | null>(null);

  const query = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => api<Job[]>("/maintenance?limit=50"),
  });
  const assets = useQuery({
    queryKey: ["assets", "maintenance-picker"],
    enabled: mode === "create",
    queryFn: () => api<Asset[]>("/equipment/assets?limit=100"),
  });
  const detail = useQuery({
    queryKey: ["maintenance", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => api<Job>(`/maintenance/${selectedId}`),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        issueDescription: form.issueDescription.trim(),
        priority: form.priority,
        ...(Number(form.laborCost) ? { laborCost: Number(form.laborCost) } : {}),
        ...(Number(form.partsCost) ? { partsCost: Number(form.partsCost) } : {}),
        ...(Number(form.otherCost) ? { otherCost: Number(form.otherCost) } : {}),
      };
      if (mode === "edit" && selectedId) {
        return api(`/maintenance/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...body, status: form.status }),
        });
      }
      return api("/maintenance", {
        method: "POST",
        body: JSON.stringify({ ...body, assetId: form.assetId }),
      });
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Maintenance job updated" : "Maintenance job opened");
      setMode(null);
      void client.invalidateQueries({ queryKey: ["maintenance"] });
      void client.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const complete = useMutation({
    mutationFn: (id: string) => api(`/maintenance/${id}/complete`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Marked complete — return the asset to service when it is ready");
      void client.invalidateQueries({ queryKey: ["maintenance"] });
      void client.invalidateQueries({ queryKey: ["maintenance", selectedId] });
    },
  });

  const restore = useMutation({
    mutationFn: (id: string) => api(`/maintenance/${id}/return-to-service`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Asset is back in service");
      void client.invalidateQueries({ queryKey: ["maintenance"] });
      void client.invalidateQueries({ queryKey: ["maintenance", selectedId] });
      void client.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/maintenance/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirmRow(null);
      setMed(null);
      toast.success("Maintenance job removed");
      void client.invalidateQueries({ queryKey: ["maintenance"] });
      void client.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  // Small helper so the delete callback can also close the detail drawer.
  function setMed(value: "create" | "view" | "edit" | null) {
    setMode(value);
    if (!value) setSelectedId(null);
  }

  const job = detail.data;
  const rows = query.data ?? [];

  const deleteIssue = remove.error as { status?: number; message?: string } | null;
  const deleteBlocked = deleteIssue?.status === 409 ? deleteIssue.message : undefined;
  const deleteError =
    deleteIssue && deleteIssue.status !== 409 ? deleteIssue.message : undefined;

  function openCreate() {
    setForm({ ...blank, assetId: "" });
    save.reset();
    setMode("create");
  }

  function openEdit(row: Job) {
    setSelectedId(row.id);
    setForm({
      assetId: row.asset.id,
      issueDescription: row.issueDescription,
      priority: row.priority,
      status: row.status,
      laborCost: String(Number(row.laborCost) || ""),
      partsCost: String(Number(row.partsCost) || ""),
      otherCost: String(Number(row.otherCost) || ""),
    });
    save.reset();
    setMode("edit");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Maintenance"
        description="Assets held for repair before they can be hired again."
        actions={
          canManage ? (
            <Button onPress={openCreate}>
              <Plus size={16} /> New job
            </Button>
          ) : undefined
        }
      />

      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Asset</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Cost</th>
                <th>Opened</th>
                <th>Status</th>
                <th className="w-24 text-right">Actions</th>
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
                  <td className="font-medium">{row.maintenanceNumber}</td>
                  <td>
                    {row.asset.assetCode}
                    <div className="text-xs text-aiq-muted">{row.asset.model.name}</div>
                  </td>
                  <td className="max-w-64 truncate">{row.issueDescription}</td>
                  <td className="capitalize">{pretty(row.priority)}</td>
                  <td className="tabular">{money(row.totalCost)}</td>
                  <td>{when(row.createdAt)}</td>
                  <td><StatusChip status={row.status} /></td>
                  <td>
                    <RowActions>
                      <RowActionButton
                        label={`Edit ${row.maintenanceNumber}`}
                        tone="edit"
                        onPress={() => openEdit(row)}
                      >
                        <Pencil size={15} />
                      </RowActionButton>
                      {canDelete && (
                        <RowActionButton
                          label={`Delete ${row.maintenanceNumber}`}
                          tone="delete"
                          onPress={() => {
                            remove.reset();
                            setConfirmRow(row);
                          }}
                        >
                          <Trash2 size={15} />
                        </RowActionButton>
                      )}
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.isError && <Notice>{(query.error as Error).message}</Notice>}
          {!query.isLoading && rows.length === 0 && (
            <EmptyState
              title="No maintenance jobs"
              hint="Open a job when a machine needs repair and it locks itself out of hire."
            />
          )}
        </div>
      </section>

      <Drawer
        open={mode === "view" && Boolean(job)}
        title={job?.maintenanceNumber ?? "Maintenance job"}
        eyebrow="Repair record"
        icon={<Wrench size={19} />}
        description={job ? `${job.asset.assetCode} · ${job.asset.model.name}` : undefined}
        onClose={() => setMed(null)}
        footer={
          job ? (
            <div className="flex flex-wrap justify-end gap-2">
              {job.status !== "COMPLETED" && (
                <Button
                  variant="secondary"
                  isDisabled={complete.isPending}
                  onPress={() => complete.mutate(job.id)}
                >
                  <CheckCircle2 size={16} /> Mark complete
                </Button>
              )}
              {job.status === "COMPLETED" && (
                <Button
                  isDisabled={restore.isPending}
                  onPress={() => restore.mutate(job.id)}
                >
                  <Wrench size={16} /> Return to service
                </Button>
              )}
              <Button variant="ghost" onPress={() => openEdit(job)}>
                <Pencil size={15} /> Edit
              </Button>
            </div>
          ) : undefined
        }
      >
        {job && (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Asset" value={job.asset.assetCode} />
              <Info label="Model" value={job.asset.model.name} />
              <Info label="Priority" value={pretty(job.priority)} />
              <Info label="Status" value={pretty(job.status)} />
              <Info label="Opened" value={when(job.createdAt)} />
              <Info label="Completed" value={when(job.completedAt)} />
              <Info label="Labour" value={money(job.laborCost)} />
              <Info label="Parts" value={money(job.partsCost)} />
              <Info label="Other" value={money(job.otherCost)} />
              <Info label="Total" value={money(job.totalCost)} />
            </dl>
            <div>
              <p className="text-sm font-semibold">Issue</p>
              <p className="mt-1 text-sm text-aiq-muted">{job.issueDescription}</p>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        open={mode === "create" || mode === "edit"}
        title={mode === "edit" ? "Update job" : "New maintenance job"}
        eyebrow="Maintenance"
        icon={mode === "edit" ? <Pencil size={19} /> : <Plus size={19} />}
        description="Opening a job locks the machine out of hire until it returns to service."
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
            title="What needs fixing"
            description="Pick the machine and describe the fault"
            icon={<ClipboardList size={15} />}
          >
            <Field label="Asset" required>
              <SelectInput
                required
                disabled={mode === "edit"}
                value={form.assetId}
                onChange={(event) => setForm({ ...form, assetId: event.target.value })}
              >
                <option value="">Select machine</option>
                {(assets.data ?? []).map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetCode} · {asset.model.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Issue" required>
              <TextArea
                required
                minLength={3}
                placeholder="Hydraulic leak under the pump"
                value={form.issueDescription}
                onChange={(event) =>
                  setForm({ ...form, issueDescription: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Priority">
                <SelectInput
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>{pretty(value)}</option>
                  ))}
                </SelectInput>
              </Field>
              {mode === "edit" && (
                <Field label="Status">
                  <SelectInput
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>{pretty(value)}</option>
                    ))}
                  </SelectInput>
                </Field>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Repair cost"
            description="Optional spend tracking"
            icon={<Wrench size={15} />}
            tone="gold"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Labour">
                <TextInput
                  inputMode="decimal"
                  placeholder="0"
                  value={form.laborCost}
                  onChange={(event) => setForm({ ...form, laborCost: event.target.value })}
                />
              </Field>
              <Field label="Parts">
                <TextInput
                  inputMode="decimal"
                  placeholder="0"
                  value={form.partsCost}
                  onChange={(event) => setForm({ ...form, partsCost: event.target.value })}
                />
              </Field>
              <Field label="Other">
                <TextInput
                  inputMode="decimal"
                  placeholder="0"
                  value={form.otherCost}
                  onChange={(event) => setForm({ ...form, otherCost: event.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          {save.isError && <Notice>{(save.error as Error).message}</Notice>}
          <FormActions
            busy={save.isPending}
            submitLabel={mode === "edit" ? "Save job" : "Open job"}
            onCancel={() => setMode(mode === "edit" ? "view" : null)}
          />
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Delete this maintenance job?"
        description="The repair record is removed and the machine goes back to Available if this was its only open job."
        eyebrow="Permanent action"
        icon={<Trash2 size={19} />}
        tone="danger"
        details={
          confirmRow
            ? [
                { label: "Job", value: confirmRow.maintenanceNumber },
                { label: "Asset", value: confirmRow.asset.assetCode },
                { label: "Status", value: pretty(confirmRow.status) },
              ]
            : undefined
        }
        confirmLabel="Delete job"
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

"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardHat, Plus, Undo2 } from "lucide-react";
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
import { api, when } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type StaffUser = { id: string; fullName: string; username: string; roles: string[] };
type Asset = {
  id: string;
  assetCode: string;
  status: string;
  condition: string;
  currentLocation?: string | null;
  model: { name: string; brand?: string | null; category: { name: string } };
};
type HireItem = {
  id: string;
  conditionOut: string;
  conditionIn?: string | null;
  returnedAt?: string | null;
  accessories?: string | null;
  notes?: string | null;
  asset: { id: string; assetCode: string };
  model: { name: string; brand?: string | null };
};
type Hire = {
  id: string;
  hireNumber: string;
  status: string;
  issuedAt: string;
  expectedReturnAt?: string | null;
  returnedAt?: string | null;
  purpose?: string | null;
  siteLocation?: string | null;
  notes?: string | null;
  user: StaffUser;
  issuedBy?: StaffUser | null;
  receivedBy?: StaffUser | null;
  items: HireItem[];
};

type Summary = {
  outNow: number;
  overdue: number;
  returnedToday: number;
  mineOpen: number;
};

const CONDITIONS = ["EXCELLENT", "GOOD", "FAIR", "DAMAGED", "MISSING"] as const;

function isoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export default function StaffHiresPage() {
  const client = useQueryClient();
  const { user } = useAuth();

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [mode, setMode] = useState<"create" | "view" | "return" | "cancel" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    userId: "",
    purpose: "",
    siteLocation: "",
    expectedReturnAt: "",
    notes: "",
  });
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [returnForm, setReturnForm] = useState<Record<string, string>>({});
  const [receivedById, setReceivedById] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const query = useQuery({
    queryKey: ["staff-hires", status, search, mine],
    queryFn: () =>
      api<Hire[]>(
        `/staff-hires?limit=50${status ? `&status=${status}` : ""}${mine ? "&mine=true" : ""}&search=${encodeURIComponent(search)}`,
      ),
  });
  const summary = useQuery({
    queryKey: ["staff-hires", "summary"],
    queryFn: () => api<Summary>("/staff-hires/summary"),
  });
  const detail = useQuery({
    queryKey: ["staff-hire", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => api<Hire>(`/staff-hires/${selectedId}`),
  });
  const staff = useQuery({
    queryKey: ["users", "hire-picker"],
    queryFn: () => api<StaffUser[]>("/users?limit=100"),
  });
  const available = useQuery({
    queryKey: ["assets", "available-for-hire"],
    enabled: mode === "create",
    queryFn: () => api<Asset[]>("/equipment/assets?limit=100&status=AVAILABLE"),
  });

  const issue = useMutation({
    mutationFn: () =>
      api<Hire>("/staff-hires", {
        method: "POST",
        body: JSON.stringify({
          userId: createForm.userId || undefined,
          purpose: createForm.purpose || undefined,
          siteLocation: createForm.siteLocation || undefined,
          expectedReturnAt: isoFromLocal(createForm.expectedReturnAt),
          notes: createForm.notes || undefined,
          items: Object.keys(picked).map((assetId) => ({
            assetId,
            conditionOut: picked[assetId] || "GOOD",
          })),
        }),
      }),
    onSuccess: () => {
      setCreateForm({ userId: "", purpose: "", siteLocation: "", expectedReturnAt: "", notes: "" });
      setPicked({});
      setMode(null);
      void client.invalidateQueries({ queryKey: ["staff-hires"] });
      void client.invalidateQueries({ queryKey: ["assets"] });
      void client.invalidateQueries({ queryKey: ["asset"] });
    },
  });

  const returned = useMutation({
    mutationFn: () =>
      api<Hire>(`/staff-hires/${selectedId}/return`, {
        method: "POST",
        body: JSON.stringify({
          receivedById: receivedById || undefined,
          notes: returnNote || undefined,
          items: Object.entries(returnForm)
            .filter(([, condition]) => Boolean(condition))
            .map(([itemId, conditionIn]) => ({ itemId, conditionIn })),
        }),
      }),
    onSuccess: () => {
      setReturnForm({});
      setReturnNote("");
      setReceivedById("");
      setMode("view");
      void client.invalidateQueries({ queryKey: ["staff-hires"] });
      void client.invalidateQueries({ queryKey: ["staff-hire", selectedId] });
      void client.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const cancelled = useMutation({
    mutationFn: () =>
      api<Hire>(`/staff-hires/${selectedId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason }),
      }),
    onSuccess: () => {
      setCancelReason("");
      setMode("view");
      void client.invalidateQueries({ queryKey: ["staff-hires"] });
      void client.invalidateQueries({ queryKey: ["staff-hire", selectedId] });
      void client.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const hire = detail.data;
  const rows = query.data ?? [];
  const open = hire && ["ISSUED", "PARTIAL"].includes(hire.status);
  const outstanding = (hire?.items ?? []).filter((item) => !item.returnedAt);

  function openCreate() {
    issue.reset();
    setCreateForm((current) => ({ ...current, userId: user?.id ?? "" }));
    setPicked({});
    setMode("create");
  }

  function openReturn() {
    returned.reset();
    const initial: Record<string, string> = {};
    for (const item of outstanding) initial[item.id] = "GOOD";
    setReturnForm(initial);
    setReceivedById(user?.id ?? "");
    setReturnNote("");
    setMode("return");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Staff hires"
        description="Internal equipment use. Staff take company machines to site and punch them back in at the office — no rental fee, no invoice, no payment."
        actions={
          <Button onPress={openCreate}>
            <Plus size={16} /> New staff hire
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Out now" value={summary.data?.outNow ?? 0} hint="Machines with staff on site" />
        <Stat label="Overdue" value={summary.data?.overdue ?? 0} hint="Past their expected return" tone="danger" />
        <Stat label="Returned today" value={summary.data?.returnedToday ?? 0} hint="Punched back in today" tone="success" />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-sm">
          <TextInput
            aria-label="Search staff hires"
            placeholder="SH number, staff or site"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="w-full max-w-44">
          <SelectInput
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIAL">Part returned</option>
            <option value="RETURNED">Returned</option>
            <option value="CANCELLED">Cancelled</option>
          </SelectInput>
        </div>
        <Button
          variant={mine ? "primary" : "secondary"}
          onPress={() => setMine((value) => !value)}
        >
          <HardHat size={16} /> {mine ? "Showing mine" : "Only mine"}
        </Button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>SH</th>
                <th>Staff</th>
                <th>Equipment</th>
                <th>Site</th>
                <th>Out</th>
                <th>Expected back</th>
                <th>Status</th>
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
                  <td className="font-medium">{row.hireNumber}</td>
                  <td>
                    {row.user.fullName}
                    <div className="text-xs text-aiq-muted">{row.user.username}</div>
                  </td>
                  <td>{row.items.map((item) => item.asset.assetCode).join(", ")}</td>
                  <td>{row.siteLocation || "—"}</td>
                  <td>{when(row.issuedAt)}</td>
                  <td>{when(row.expectedReturnAt)}</td>
                  <td><StatusChip status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.isError && <Notice>{(query.error as Error).message}</Notice>}
          {!query.isLoading && !query.isError && rows.length === 0 && (
            <EmptyState
              title="No staff hires yet"
              hint="Issue equipment to a staff member going to site."
            />
          )}
        </div>
      </section>

      {/* ── Detail ─────────────────────────────────────────────── */}
      <Drawer
        open={mode === "view" && Boolean(hire)}
        title={hire?.hireNumber ?? "Staff hire"}
        description={hire ? `${hire.user.fullName}${hire.siteLocation ? ` · ${hire.siteLocation}` : ""}` : undefined}
        onClose={() => setMode(null)}
        footer={
          open ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onPress={() => setMode("cancel")}>
                Cancel hire
              </Button>
              <Button onPress={openReturn}>
                <Undo2 size={16} /> Punch in return
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="secondary" onPress={() => setMode(null)}>Close</Button>
            </div>
          )
        }
      >
        {hire && (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Staff" value={`${hire.user.fullName} (${hire.user.username})`} />
              <Info label="Status" value={pretty(hire.status)} />
              <Info label="Issued by" value={hire.issuedBy?.fullName ?? "—"} />
              <Info label="Issued at" value={when(hire.issuedAt)} />
              <Info label="Expected back" value={when(hire.expectedReturnAt)} />
              <Info label="Returned" value={when(hire.returnedAt)} />
              <Info label="Purpose" value={hire.purpose || "—"} />
              <Info label="Received by" value={hire.receivedBy?.fullName ?? "—"} />
            </dl>

            <div>
              <p className="text-sm font-semibold">Equipment ({hire.items.length})</p>
              <div className="mt-2 space-y-2">
                {hire.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-aiq-line px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.asset.assetCode}</p>
                        <p className="text-xs text-aiq-muted">
                          {item.model.name}
                          {item.model.brand ? ` · ${item.model.brand}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.returnedAt
                            ? "bg-emerald-50 text-aiq-green"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.returnedAt ? "Back in" : "Out"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-aiq-muted">
                      Out: {pretty(item.conditionOut)}
                      {item.conditionIn ? ` · In: ${pretty(item.conditionIn)}` : ""}
                      {item.returnedAt ? ` · ${when(item.returnedAt)}` : ""}
                      {item.accessories ? ` · Accessories: ${item.accessories}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {hire.notes && (
              <div>
                <p className="text-sm font-semibold">Notes</p>
                <p className="mt-1 text-sm text-aiq-muted">{hire.notes}</p>
              </div>
            )}

            <p className="rounded-2xl bg-aiq-bg px-4 py-3 text-xs text-aiq-muted">
              Internal use only — this record never creates a rental charge, invoice or payment.
            </p>
          </div>
        )}
      </Drawer>

      {/* ── New hire ───────────────────────────────────────────── */}
      <Drawer
        open={mode === "create"}
        title="New staff hire"
        description="Equipment leaves the store with a staff member and comes back to the office."
        onClose={() => setMode(null)}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            issue.mutate();
          }}
        >
          <Field label="Staff taking the equipment">
            <SelectInput
              required
              value={createForm.userId}
              onChange={(event) => setCreateForm({ ...createForm, userId: event.target.value })}
            >
              <option value="">Select staff</option>
              {(staff.data ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName} · {person.username}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site / job">
              <TextInput
                placeholder="Goba site"
                value={createForm.siteLocation}
                onChange={(event) => setCreateForm({ ...createForm, siteLocation: event.target.value })}
              />
            </Field>
            <Field label="Expected back">
              <TextInput
                type="datetime-local"
                value={createForm.expectedReturnAt}
                onChange={(event) =>
                  setCreateForm({ ...createForm, expectedReturnAt: event.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Purpose">
            <TextInput
              placeholder="Slab works — level 2"
              value={createForm.purpose}
              onChange={(event) => setCreateForm({ ...createForm, purpose: event.target.value })}
            />
          </Field>

          <div>
            <p className="text-sm font-medium text-aiq-ink">Available equipment</p>
            <p className="text-xs text-aiq-muted">
              {Object.keys(picked).length} selected · no charge is applied
            </p>
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-aiq-line p-3">
              {(available.data ?? []).length === 0 && (
                <p className="text-sm text-aiq-muted">No assets are available right now.</p>
              )}
              {(available.data ?? []).map((asset) => {
                const selected = asset.id in picked;
                return (
                  <div
                    key={asset.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                      selected ? "bg-aiq-bg ring-1 ring-aiq-blue/40" : ""
                    }`}
                  >
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-aiq-blue"
                        checked={selected}
                        onChange={(event) => {
                          setPicked((current) => {
                            const next = { ...current };
                            if (event.target.checked) next[asset.id] = "GOOD";
                            else delete next[asset.id];
                            return next;
                          });
                        }}
                      />
                      <span>
                        <span className="font-medium">{asset.assetCode}</span>
                        <span className="text-aiq-muted">
                          {" "}
                          · {asset.model.name}
                          {asset.currentLocation ? ` · ${asset.currentLocation}` : ""}
                        </span>
                      </span>
                    </label>
                    {selected && (
                      <SelectInput
                        aria-label={`Condition out for ${asset.assetCode}`}
                        className="max-w-36"
                        value={picked[asset.id]}
                        onChange={(event) =>
                          setPicked((current) => ({ ...current, [asset.id]: event.target.value }))
                        }
                      >
                        {CONDITIONS.map((condition) => (
                          <option key={condition} value={condition}>
                            {pretty(condition)}
                          </option>
                        ))}
                      </SelectInput>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Field label="Notes">
            <TextArea
              className="min-h-16"
              value={createForm.notes}
              onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })}
            />
          </Field>

          {issue.isError && <Notice>{(issue.error as Error).message}</Notice>}
          <FormActions
            busy={issue.isPending}
            submitLabel="Issue equipment"
            onCancel={() => setMode(null)}
          />
        </form>
      </Drawer>

      {/* ── Return / punch in ─────────────────────────────────── */}
      <Drawer
        open={mode === "return" && Boolean(hire)}
        title="Punch in return"
        description={hire ? `${hire.user.fullName} is bringing equipment back` : undefined}
        onClose={() => setMode("view")}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            returned.mutate();
          }}
        >
          <div className="space-y-2">
            {outstanding.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-aiq-line px-3 py-2"
              >
                <div className="text-sm">
                  <p className="font-medium">{item.asset.assetCode}</p>
                  <p className="text-xs text-aiq-muted">{item.model.name}</p>
                </div>
                <SelectInput
                  aria-label={`Condition in for ${item.asset.assetCode}`}
                  className="max-w-40"
                  value={returnForm[item.id] ?? "GOOD"}
                  onChange={(event) =>
                    setReturnForm((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                >
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {pretty(condition)}
                    </option>
                  ))}
                </SelectInput>
              </div>
            ))}
            {outstanding.length === 0 && (
              <p className="text-sm text-aiq-muted">Everything is already back.</p>
            )}
          </div>

          <Field label="Received by">
            <SelectInput
              value={receivedById}
              onChange={(event) => setReceivedById(event.target.value)}
            >
              <option value="">Me (signed in)</option>
              {(staff.data ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName} · {person.username}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Return notes">
            <TextArea
              className="min-h-16"
              placeholder="Clean, complete, no damage"
              value={returnNote}
              onChange={(event) => setReturnNote(event.target.value)}
            />
          </Field>

          {returned.isError && <Notice>{(returned.error as Error).message}</Notice>}
          <FormActions
            busy={returned.isPending}
            submitLabel="Record return"
            onCancel={() => setMode("view")}
          />
        </form>
      </Drawer>

      {/* ── Cancel ────────────────────────────────────────────── */}
      <Drawer
        open={mode === "cancel" && Boolean(hire)}
        title="Cancel staff hire"
        description="The assets go back to Available. This is for issue mistakes only."
        onClose={() => setMode("view")}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            cancelled.mutate();
          }}
        >
          <Field label="Reason">
            <TextArea
              required
              minLength={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </Field>
          {cancelled.isError && <Notice>{(cancelled.error as Error).message}</Notice>}
          <FormActions
            busy={cancelled.isPending}
            submitLabel="Cancel hire"
            onCancel={() => setMode("view")}
          />
        </form>
      </Drawer>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "danger" | "success";
}) {
  const colour =
    tone === "danger" ? "text-aiq-danger" : tone === "success" ? "text-aiq-green" : "text-aiq-ink";
  return (
    <div className="rounded-3xl border border-aiq-line bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-aiq-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${colour}`}>{value}</p>
      <p className="mt-1 text-xs text-aiq-muted">{hint}</p>
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

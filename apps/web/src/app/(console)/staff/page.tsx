"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  UserPlus,
  UserRound,
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
  TextInput,
  pretty,
  stop,
} from "@/components/ui";
import { api, when } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type StaffUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string | null;
  status: string;
  roles: string[];
  lastLoginAt?: string | null;
  createdAt: string;
};

const blank = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  role: "STAFF",
};

export default function StaffPage() {
  const client = useQueryClient();
  const toast = useToast();
  const { user: me } = useAuth();
  const canDelete = me?.roles.includes("ADMIN") ?? false;
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"create" | "view" | "edit" | null>(null);
  const [selected, setSelected] = useState<StaffUser | null>(null);
  const [form, setForm] = useState(blank);
  const [edit, setEdit] = useState({ fullName: "", phone: "", status: "ACTIVE", password: "" });
  const [confirmRow, setConfirmRow] = useState<StaffUser | null>(null);

  const query = useQuery({
    queryKey: ["users", search],
    queryFn: () => api<StaffUser[]>(`/users?limit=50&search=${encodeURIComponent(search)}`),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          phone: form.phone || undefined,
          username: form.username.trim().toLowerCase(),
          email: form.email.trim().toLowerCase(),
        }),
      }),
    onSuccess: () => {
      setForm(blank);
      setMode(null);
      void client.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const update = useMutation({
    mutationFn: () =>
      api(`/users/${selected?.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: edit.fullName,
          phone: edit.phone || undefined,
          status: edit.status,
          ...(edit.password ? { password: edit.password } : {}),
        }),
      }),
    onSuccess: () => {
      setMode(null);
      void client.invalidateQueries({ queryKey: ["users"] });
    },
  });

  function openView(user: StaffUser) {
    setSelected(user);
    setMode("view");
    create.reset();
    update.reset();
  }

  function openEdit() {
    if (!selected) return;
    setEdit({
      fullName: selected.fullName,
      phone: selected.phone ?? "",
      status: selected.status,
      password: "",
    });
    setMode("edit");
  }

  const remove = useMutation({
    mutationFn: (id: string) => api(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirmRow(null);
      setMode(null);
      toast.success("Staff account deleted");
      void client.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteIssue = remove.error as { status?: number; message?: string } | null;
  const deleteBlocked = deleteIssue?.status === 409 ? deleteIssue.message : undefined;
  const deleteError =
    deleteIssue && deleteIssue.status !== 409 ? deleteIssue.message : undefined;

  const rows = query.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Control"
        title="Staff"
        description="Create accounts, review access, and suspend people without deleting their history."
        actions={
          <Button
            onPress={() => {
              setForm(blank);
              setMode("create");
              create.reset();
            }}
          >
            <Plus size={16} /> New staff
          </Button>
        }
      />

      <div className="max-w-sm">
        <TextInput
          aria-label="Search staff"
          placeholder="Search name, email or username"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Username</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th className="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} onClick={() => openView(user)}>
                  <td>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs text-aiq-muted">{user.email}</p>
                  </td>
                  <td>{user.username}</td>
                  <td className="tabular">{user.phone || "—"}</td>
                  <td className="capitalize">{user.roles.map((role) => role.toLowerCase()).join(", ")}</td>
                  <td><StatusChip status={user.status} /></td>
                  <td>{when(user.lastLoginAt)}</td>
                  <td>
                    <RowActions>
                      <RowActionButton
                        label={`Edit ${user.fullName}`}
                        tone="edit"
                        onPress={() => {
                          setSelected(user);
                          setEdit({
                            fullName: user.fullName,
                            phone: user.phone ?? "",
                            status: user.status,
                            password: "",
                          });
                          update.reset();
                          setMode("edit");
                        }}
                      >
                        <Pencil size={15} />
                      </RowActionButton>
                      {canDelete && user.id !== me?.id && (
                        <RowActionButton
                          label={`Delete ${user.fullName}`}
                          tone="delete"
                          onPress={() => {
                            remove.reset();
                            setConfirmRow(user);
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
            <EmptyState title="No staff match this search" hint="Create a staff account to open the yard desk." />
          )}
        </div>
      </section>

      <Drawer
        open={mode === "create"}
        title="New staff"
        eyebrow="Team"
        icon={<UserPlus size={19} />}
        description="They can sign in immediately with this password."
        onClose={() => setMode(null)}
      >
        <form
          id="create-staff"
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            create.mutate();
          }}
        >
          <FormSection
            title="Who is joining"
            description="Name shown on hire cards and internal issues"
            icon={<UserRound size={15} />}
          >
            <Field label="Full name" required>
              <TextInput required placeholder="e.g. Tony Mwangosi" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username" required hint="used to sign in">
                <TextInput required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </Field>
              <Field label="Role" hint="admin sees money">
                <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="STAFF">Staff — yard only</option>
                  <option value="ADMIN">Admin — full console</option>
                </SelectInput>
              </Field>
            </div>
          </FormSection>
          <FormSection
            title="Contact & sign-in"
            description="The password works right after saving"
            icon={<KeyRound size={15} />}
            tone="green"
          >
            <Field label="Email" required>
              <TextInput required type="email" placeholder="name@aiqltd.co.tz" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} placeholder="07XXXXXXXX" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Password" required hint="at least 8 characters">
              <TextInput required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          </FormSection>
          {create.isError && <Notice>{(create.error as Error).message}</Notice>}
          <FormActions busy={create.isPending} submitLabel="Create staff" onCancel={() => setMode(null)} />
        </form>
      </Drawer>

      <Drawer
        open={mode === "view" && Boolean(selected)}
        title={selected?.fullName ?? "Staff"}
        eyebrow="Staff profile"
        icon={<UserRound size={19} />}
        description={selected?.email}
        onClose={() => setMode(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onPress={openEdit}>Update</Button>
          </div>
        }
      >
        {selected && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Username" value={selected.username} />
            <Info label="Phone" value={selected.phone || "—"} />
            <Info label="Role" value={selected.roles.join(", ")} />
            <Info label="Status" value={pretty(selected.status)} />
            <Info label="Last login" value={when(selected.lastLoginAt)} />
            <Info label="Created" value={when(selected.createdAt)} />
          </dl>
        )}
      </Drawer>

      <Drawer
        open={mode === "edit" && Boolean(selected)}
        title="Update staff"
        eyebrow="Team"
        icon={<UserCog size={19} />}
        description={selected?.email}
        onClose={() => setMode("view")}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            stop(event);
            update.mutate();
          }}
        >
          <FormSection
            title="Profile"
            description="How this person appears across HireFlow"
            icon={<UserRound size={15} />}
          >
            <Field label="Full name" required>
              <TextInput required value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </SelectInput>
            </Field>
          </FormSection>
          <FormSection
            title="Password"
            description="Only fill this to reset the sign-in password"
            icon={<KeyRound size={15} />}
            tone="gold"
          >
            <Field label="New password" hint="optional">
              <TextInput
                type="password"
                minLength={8}
                placeholder="Leave blank to keep the current password"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
            </Field>
          </FormSection>
          {update.isError && <Notice>{(update.error as Error).message}</Notice>}
          <FormActions busy={update.isPending} submitLabel="Save changes" onCancel={() => setMode("view")} />
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Delete this staff account?"
        description="Accounts that already touched hire cards, money or stock are kept for the audit trail — suspend them instead."
        eyebrow="Permanent action"
        icon={<Trash2 size={19} />}
        tone="danger"
        details={
          confirmRow
            ? [
                { label: "Name", value: confirmRow.fullName },
                { label: "Username", value: confirmRow.username },
                { label: "Role", value: confirmRow.roles.join(", ") },
              ]
            : undefined
        }
        note="If there is activity, HireFlow blocks the delete and asks you to set the account to Suspended or Inactive."
        confirmLabel="Delete account"
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
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}

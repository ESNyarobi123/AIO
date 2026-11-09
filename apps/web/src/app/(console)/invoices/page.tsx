"use client";

import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, FileDown } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog, RowActionButton, RowActions } from "@/components/actions";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import { Notice, PageHeader, TextArea } from "@/components/ui";
import { API_URL, api, money, when } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  grandTotal: string;
  issuedAt?: string;
  customer: { fullName: string };
  rental: { rentalNumber: string };
};

export default function InvoicesPage() {
  const client = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canManage = user?.roles.includes("ADMIN") ?? false;
  const [confirmRow, setConfirmRow] = useState<Invoice | null>(null);
  const [reason, setReason] = useState("");

  const query = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api<Invoice[]>("/invoices?limit=50"),
  });

  const voidInvoice = useMutation({
    mutationFn: () =>
      api(`/invoices/${confirmRow?.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setConfirmRow(null);
      setReason("");
      toast.success("Invoice voided — it stays on record as cancelled");
      void client.invalidateQueries({ queryKey: ["invoices"] });
      void client.invalidateQueries({ queryKey: ["rentals"] });
    },
  });

  const issue = voidInvoice.error as { status?: number; message?: string } | null;
  const blocked = issue?.status === 409 ? issue.message : undefined;
  const error = issue && issue.status !== 409 ? issue.message : undefined;

  async function download(id: string, number: string) {
    const token = localStorage.getItem("aiq_token");
    const response = await fetch(`${API_URL}/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finance"
        title="Invoices"
        description="Issued rental invoices. Download the PDF for the customer."
      />
      <section className="overflow-hidden rounded-3xl border border-aiq-line bg-white">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Rental</th>
                <th>Issued</th>
                <th>Total</th>
                <th>Status</th>
                <th className="w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((invoice) => (
                <tr key={invoice.id} className="border-t border-aiq-line">
                  <td className="py-3 font-medium">{invoice.invoiceNumber}</td>
                  <td>{invoice.customer.fullName}</td>
                  <td>{invoice.rental.rentalNumber}</td>
                  <td>{when(invoice.issuedAt)}</td>
                  <td className="tabular">{money(invoice.grandTotal)}</td>
                  <td><StatusChip status={invoice.status} /></td>
                  <td>
                    <RowActions>
                      <RowActionButton
                        label={`Download ${invoice.invoiceNumber}`}
                        tone="edit"
                        onPress={() => void download(invoice.id, invoice.invoiceNumber)}
                      >
                        <FileDown size={15} />
                      </RowActionButton>
                      {canManage && invoice.status !== "VOID" && (
                        <RowActionButton
                          label={`Void ${invoice.invoiceNumber}`}
                          tone="delete"
                          onPress={() => {
                            voidInvoice.reset();
                            setReason("");
                            setConfirmRow(invoice);
                          }}
                        >
                          <Ban size={15} />
                        </RowActionButton>
                      )}
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.isError && <Notice>{(query.error as Error).message}</Notice>}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Void this invoice?"
        description="Invoices are never deleted. Voiding cancels the bill, releases the rental balance and keeps the paper trail."
        eyebrow="Finance correction"
        icon={<Ban size={19} />}
        tone="danger"
        details={
          confirmRow
            ? [
                { label: "Invoice", value: confirmRow.invoiceNumber },
                { label: "Customer", value: confirmRow.customer.fullName },
                { label: "Total", value: money(confirmRow.grandTotal) },
              ]
            : undefined
        }
        confirmLabel="Void invoice"
        busy={voidInvoice.isPending}
        blocked={blocked}
        error={error}
        onClose={() => {
          setConfirmRow(null);
          setReason("");
          voidInvoice.reset();
        }}
        onConfirm={() => voidInvoice.mutate()}
      >
        <label className="block">
          <span className="text-[13px] font-semibold text-aiq-ink">
            Reason<span className="ml-0.5 text-aiq-danger">*</span>
          </span>
          <TextArea
            required
            minLength={3}
            className="mt-1.5 min-h-16"
            placeholder="Wrong rate captured — reissued"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}

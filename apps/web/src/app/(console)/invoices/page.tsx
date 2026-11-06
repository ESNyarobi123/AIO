"use client";

import { Button } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { StatusChip } from "@/components/status-chip";
import { PageHeader } from "@/components/ui";
import { API_URL, api, money, when } from "@/lib/api";

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
  const query = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api<Invoice[]>("/invoices?limit=50"),
  });

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
                <th></th>
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
                    <Button size="sm" variant="secondary" onPress={() => download(invoice.id, invoice.invoiceNumber)}>
                      PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

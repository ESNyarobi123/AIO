"use client";

import { Card } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { StatusChip } from "@/components/status-chip";
import { PageHeader } from "@/components/ui";
import { api, when } from "@/lib/api";

type Row = {
  id: string;
  dispatchNumber?: string;
  returnNumber?: string;
  status: string;
  dispatchedAt?: string;
  receivedAt?: string;
  rental: { rentalNumber: string; customer: { fullName: string } };
};

export function QueuePage({
  title,
  description,
  path,
  kind,
}: {
  title: string;
  description: string;
  path: string;
  kind: "dispatch" | "return";
}) {
  const query = useQuery({
    queryKey: [kind],
    queryFn: () => api<Row[]>(path),
  });

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Operations" title={title} description={description} />
      <Card>
        <Card.Content className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-aiq-muted">
              <tr>
                <th className="py-2">Number</th>
                <th>Rental</th>
                <th>Customer</th>
                <th>When</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((row) => (
                <tr key={row.id} className="border-t border-aiq-line">
                  <td className="py-3 font-medium">{row.dispatchNumber || row.returnNumber}</td>
                  <td>{row.rental.rentalNumber}</td>
                  <td>{row.rental.customer.fullName}</td>
                  <td>{when(row.dispatchedAt || row.receivedAt)}</td>
                  <td><StatusChip status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(query.data ?? []).length === 0 && <p className="py-6 text-sm text-aiq-muted">Nothing in this queue yet.</p>}
        </Card.Content>
      </Card>
    </div>
  );
}

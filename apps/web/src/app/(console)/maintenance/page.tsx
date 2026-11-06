"use client";

import { Card } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { StatusChip } from "@/components/status-chip";
import { api, money } from "@/lib/api";

type Job = {
  id: string;
  maintenanceNumber: string;
  issueDescription: string;
  status: string;
  priority: string;
  totalCost: string;
  asset: { assetCode: string; model: { name: string } };
};

export default function MaintenancePage() {
  const query = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => api<Job[]>("/maintenance?limit=50"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Maintenance</h1>
        <p className="text-sm text-aiq-muted">Assets held for repair before they can be hired again.</p>
      </div>
      <div className="grid gap-3">
        {(query.data ?? []).map((job) => (
          <Card key={job.id}>
            <Card.Header>
              <Card.Title>{job.maintenanceNumber}</Card.Title>
              <Card.Description>
                {job.asset.assetCode} · {job.asset.model.name}
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-wrap items-center justify-between gap-3">
              <p>{job.issueDescription}</p>
              <div className="flex items-center gap-3">
                <span className="tabular text-sm">{money(job.totalCost)}</span>
                <StatusChip status={job.status} />
              </div>
            </Card.Content>
          </Card>
        ))}
        {(query.data ?? []).length === 0 && <p className="text-sm text-aiq-muted">No open maintenance jobs.</p>}
      </div>
    </div>
  );
}

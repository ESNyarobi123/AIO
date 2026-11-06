"use client";

import { Button, Card } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusChip } from "@/components/status-chip";
import { PageHeader } from "@/components/ui";
import { api, money, when } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Overview = {
  inventory: {
    totalEquipment: number;
    available: number;
    currentlyRented: number;
    maintenance: number;
  };
  operations: { activeRentals: number; overdueReturns: number; openInvoices: number };
  finance: { rentalRevenue: number; paymentsReceived: number; outstanding: number };
  recentRentals: Array<{
    id: string;
    rentalNumber: string;
    status: string;
    siteLocation?: string;
    grandTotal: string;
    expectedReturnAt: string;
    customer: { fullName: string };
  }>;
  recentPayments: Array<{
    id: string;
    paymentNumber: string;
    amount: string;
    method: string;
    receivedAt: string;
    customer: { fullName: string };
  }>;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () => api<Overview>("/dashboard/overview"),
  });

  const data = overview.data;
  const chart = data
    ? [
        { name: "Available", value: data.inventory.available },
        { name: "Rented", value: data.inventory.currentlyRented },
        { name: "Maintenance", value: data.inventory.maintenance },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={user?.roles.includes("ADMIN") ? "Admin overview" : "Staff operations"}
        title={`Good day, ${user?.fullName.split(" ")[0] ?? "there"}`}
        description="Live stock, hire cards and money collected today."
        actions={
          <>
            <Link href="/rentals/new">
              <Button>
                <Plus size={16} /> New rental
              </Button>
            </Link>
            <Link href="/customers">
              <Button variant="secondary">Add customer</Button>
            </Link>
          </>
        }
      />

      {overview.isError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-aiq-danger">
          {(overview.error as Error).message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric tone="blue" title="Equipment" value={data?.inventory.totalEquipment ?? "—"} hint={data ? `${data.inventory.available} available` : "Loading…"} icon={<Boxes size={20} />} />
        <Metric tone="gold" title="Active rentals" value={data?.operations.activeRentals ?? "—"} hint={data ? `${data.operations.overdueReturns} overdue` : "Loading…"} icon={<TriangleAlert size={20} />} />
        <Metric tone="green" title="Collected" value={overview.isError ? "—" : money(data?.finance.paymentsReceived)} hint="Payments received" icon={<Wallet size={20} />} />
        <Metric tone="cyan" title="Outstanding" value={overview.isError ? "—" : money(data?.finance.outstanding)} hint={data ? `${data.operations.openInvoices} open invoices` : "Loading…"} icon={<Wallet size={20} />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <Card.Header>
            <Card.Title>Stock position</Card.Title>
            <Card.Description>Available, rented and maintenance units.</Card.Description>
          </Card.Header>
          <Card.Content className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2457A6" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>Recent payments</Card.Title>
            <Card.Description>Cash, mobile money and bank receipts.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3">
            {(data?.recentPayments ?? []).length === 0 && (
              <p className="text-sm text-aiq-muted">
                {overview.isLoading ? "Loading receipts…" : "No payments recorded yet."}
              </p>
            )}
            {data?.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-aiq-line pb-3 last:border-0">
                <div>
                  <p className="font-medium">{payment.customer.fullName}</p>
                  <p className="text-xs text-aiq-muted">
                    {payment.paymentNumber} · {payment.method.replaceAll("_", " ")} · {when(payment.receivedAt)}
                  </p>
                </div>
                <p className="tabular font-semibold">{money(payment.amount)}</p>
              </div>
            ))}
          </Card.Content>
        </Card>
      </section>

      <Card>
        <Card.Header>
          <Card.Title>Live rentals</Card.Title>
          <Card.Description>Latest hire contracts and expected returns.</Card.Description>
        </Card.Header>
        <Card.Content className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-aiq-muted">
              <tr>
                <th className="py-2 font-medium">Rental</th>
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium">Site</th>
                <th className="py-2 font-medium">Due</th>
                <th className="py-2 font-medium">Total</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentRentals ?? []).map((rental) => (
                <tr key={rental.id} className="border-t border-aiq-line">
                  <td className="py-3 font-medium">{rental.rentalNumber}</td>
                  <td>{rental.customer.fullName}</td>
                  <td>{rental.siteLocation || "—"}</td>
                  <td>{when(rental.expectedReturnAt)}</td>
                  <td className="tabular">{money(rental.grandTotal)}</td>
                  <td><StatusChip status={rental.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}

function Metric({
  title,
  value,
  hint,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone: "blue" | "cyan" | "green" | "gold";
}) {
  const iconTone = {
    blue: "bg-aiq-blue/10 text-aiq-blue",
    cyan: "bg-aiq-cyan/15 text-aiq-cyan",
    green: "bg-aiq-green/10 text-aiq-green",
    gold: "bg-aiq-gold/25 text-aiq-navy",
  }[tone];
  return (
    <Card className={`tone-${tone}`}>
      <Card.Content className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-aiq-muted">{title}</p>
          <p className="tabular mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-aiq-muted">{hint}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-xl ${iconTone}`}>{icon}</span>
      </Card.Content>
    </Card>
  );
}

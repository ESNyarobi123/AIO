"use client";

import { Card } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { api, money } from "@/lib/api";

type Revenue = {
  rentalCount: number;
  grossRevenue: number;
  collected: number;
  outstanding: number;
  discounts: number;
};

type Profit = {
  collectedRevenue: number;
  expenses: number;
  maintenanceCosts: number;
  estimatedNetProfit: number;
};

export default function ReportsPage() {
  const revenue = useQuery({
    queryKey: ["revenue"],
    queryFn: () => api<Revenue>("/reports/revenue"),
  });
  const profit = useQuery({
    queryKey: ["profit"],
    queryFn: () => api<Profit>("/reports/profitability"),
  });

  const rows = [
    ["Hire contracts", revenue.data?.rentalCount ?? "—"],
    ["Gross rental value", money(revenue.data?.grossRevenue)],
    ["Collected", money(revenue.data?.collected)],
    ["Outstanding", money(revenue.data?.outstanding)],
    ["Discounts", money(revenue.data?.discounts)],
    ["Expenses", money(profit.data?.expenses)],
    ["Maintenance", money(profit.data?.maintenanceCosts)],
    ["Estimated net", money(profit.data?.estimatedNetProfit)],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="text-sm text-aiq-muted">Revenue is not profit. Costs sit on their own lines.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map(([label, value]) => (
          <Card key={label}>
            <Card.Content>
              <p className="text-sm text-aiq-muted">{label}</p>
              <p className="tabular mt-2 text-2xl font-semibold">{value}</p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Chip } from "@heroui/react";

const tones: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  INACTIVE: "Inactive",
  RECORDED: "Recorded",
  ALLOCATED: "Allocated",
  AVAILABLE: "Available",
  PAID: "Paid",
  CLOSED: "Closed",
  COMPLETED: "Completed",
  RENTED: "Rented",
  CONFIRMED: "Confirmed",
  DISPATCHED: "Dispatched",
  ISSUED: "Issued",
  PENDING: "Pending",
  PENDING_APPROVAL: "Awaiting approval",
  PARTIALLY_PAID: "Partially paid",
  DRAFT: "Draft",
  OVERDUE: "Overdue",
  DAMAGED: "Damaged",
  CANCELLED: "Cancelled",
  VOID: "Void",
  MAINTENANCE: "Maintenance",
  INSPECTION: "Inspection",
  HELD: "Deposit held",
  APPROVED: "Approved",
  RETURNED: "Returned",
  PARTIAL: "Part returned",
};

export function StatusChip({ status }: { status?: string | null }) {
  const key = status ?? "UNKNOWN";
  const label = tones[key] ?? key.replaceAll("_", " ").toLowerCase();
  const tone =
    ["AVAILABLE", "PAID", "CLOSED", "COMPLETED", "APPROVED", "ACTIVE", "RECORDED", "ALLOCATED", "RETURNED"].includes(key)
      ? "success"
      : ["OVERDUE", "DAMAGED", "CANCELLED", "VOID", "SUSPENDED"].includes(key)
        ? "danger"
        : ["PENDING", "PENDING_APPROVAL", "PARTIALLY_PAID", "HELD", "PARTIAL"].includes(key)
          ? "warning"
          : ["MAINTENANCE", "INSPECTION"].includes(key)
            ? "accent"
            : "default";

  return (
    <Chip color={tone} size="sm" variant="soft">
      <span className="capitalize">{label}</span>
    </Chip>
  );
}

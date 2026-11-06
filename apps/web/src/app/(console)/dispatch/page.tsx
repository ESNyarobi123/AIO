"use client";

import { QueuePage } from "@/components/queue-page";

export default function DispatchPage() {
  return (
    <QueuePage
      kind="dispatch"
      path="/dispatches?limit=50"
      title="Dispatch"
      description="Equipment checked out to customers."
    />
  );
}

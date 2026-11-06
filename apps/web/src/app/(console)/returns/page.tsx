"use client";

import { QueuePage } from "@/components/queue-page";

export default function ReturnsPage() {
  return (
    <QueuePage
      kind="return"
      path="/returns?limit=50"
      title="Returns"
      description="Equipment checked back in and waiting on inspection."
    />
  );
}

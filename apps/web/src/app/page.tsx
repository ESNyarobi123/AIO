"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-aiq-bg">
      <p className="text-sm text-aiq-muted">Loading AIQ HireFlow…</p>
    </main>
  );
}

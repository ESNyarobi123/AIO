"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { Eye, EyeOff, ShieldCheck, Truck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Notice } from "@/components/ui";
import { useAuth } from "@/lib/auth";

const demos = [
  { label: "Admin", identifier: "admin@aiqltd.co.tz", password: "Admin@HireFlow1" },
  { label: "Staff", identifier: "staff@aiqltd.co.tz", password: "Staff@HireFlow1" },
];

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.login(identifier.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="login-hero relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-aiq-cyan/20 blur-3xl" />
        <div className="absolute bottom-10 left-10 size-56 rounded-full bg-aiq-blue/30 blur-3xl" />
        <div className="relative">
          <div className="inline-flex rounded-2xl bg-white p-3">
            <img src="/aiq-logo.png" alt="AIQ Unlimited Solutions" className="h-12 w-auto" />
          </div>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
            AIQ Limited · HireFlow
          </p>
          <h1 className="mt-3 max-w-lg text-5xl font-semibold leading-[1.05]">
            Every machine, hire card, and payment in one desk.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Stock, customers, dispatch, returns, invoices and staff — built for Goba operations.
          </p>
        </div>
        <div className="relative grid max-w-lg gap-3">
          <Feature icon={<Truck size={18} />} title="Hire cards" text="RN, site, dates out and in, guarantor." />
          <Feature icon={<Wallet size={18} />} title="Money" text="Cash, mobile money, bank, deposits and balance." />
          <Feature icon={<ShieldCheck size={18} />} title="Roles" text="Admin controls staff. Staff runs the yard." />
        </div>
      </section>

      <section className="grid place-items-center bg-aiq-bg px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="inline-flex rounded-2xl bg-aiq-navy p-3">
              <img src="/aiq-logo.png" alt="" className="h-10 w-auto" />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-aiq-blue">Welcome back</p>
          <h2 className="mt-2 text-3xl font-semibold">Sign in to HireFlow</h2>
          <p className="mt-2 text-sm text-aiq-muted">Use your AIQ email or username.</p>

          <form className="mt-8 space-y-4 rounded-3xl border border-aiq-line bg-white p-6 shadow-sm" onSubmit={onSubmit}>
            <TextField name="identifier" isRequired value={identifier} onChange={setIdentifier}>
              <Label>Email or username</Label>
              <Input placeholder="admin@aiqltd.co.tz" autoComplete="username" />
            </TextField>
            <TextField name="password" isRequired value={password} onChange={setPassword}>
              <Label>Password</Label>
              <div className="relative w-full">
                <Input className="w-full pr-10" type={show ? "text" : "password"} autoComplete="current-password" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-aiq-muted"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((value) => !value)}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </TextField>
            {error && <Notice>{error}</Notice>}
            <Button className="w-full" type="submit" isDisabled={busy || !identifier || !password}>
              {busy ? "Signing in…" : "Enter console"}
            </Button>
          </form>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {demos.map((demo) => (
              <button
                key={demo.label}
                type="button"
                className="rounded-2xl border border-aiq-line bg-white px-3 py-3 text-left hover:border-aiq-blue"
                onClick={() => {
                  setIdentifier(demo.identifier);
                  setPassword(demo.password);
                }}
              >
                <span className="block text-sm font-semibold">{demo.label} demo</span>
                <span className="mt-1 block truncate text-xs text-aiq-muted">{demo.identifier}</span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-aiq-muted">aiqltd.co.tz · Goba, Dar es Salaam</p>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="mt-0.5 text-aiq-gold">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-white/65">{text}</p>
      </div>
    </div>
  );
}

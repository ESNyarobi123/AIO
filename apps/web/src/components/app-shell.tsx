"use client";

import { Button, SearchField } from "@heroui/react";
import {
  Boxes,
  ClipboardList,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Truck,
  UserCog,
  Users,
  Wallet,
  Wrench,
  ChartNoAxesCombined,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useRequireAuth } from "@/lib/auth";

const groups: Array<{
  label: string;
  admin: boolean;
  links: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
    exact?: boolean;
  }>;
}> = [
  {
    label: "Operations",
    admin: false,
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/equipment", label: "Equipment", icon: Package, exact: true },
      { href: "/equipment/models", label: "Models & pricing", icon: Boxes },
      { href: "/hires", label: "Staff hires", icon: HardHat },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/rentals", label: "Rentals", icon: ClipboardList },
      { href: "/dispatch", label: "Dispatch", icon: Truck },
      { href: "/returns", label: "Returns", icon: Boxes },
    ],
  },
  {
    label: "Finance",
    admin: false,
    links: [
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/payments", label: "Payments", icon: Wallet },
    ],
  },
  {
    label: "Control",
    admin: true,
    links: [
      { href: "/staff", label: "Staff", icon: UserCog },
      { href: "/maintenance", label: "Maintenance", icon: Wrench },
      { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isAdmin = auth.user?.roles.includes("ADMIN") ?? false;

  const visibleGroups = groups.filter((group) => isAdmin || !group.admin);
  const links = visibleGroups.flatMap((group) => group.links);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return links.filter((link) => link.label.toLowerCase().includes(q));
  }, [links, query]);

  if (!auth.ready || !auth.user) {
    return (
      <div className="grid min-h-screen place-items-center text-aiq-muted">
        Opening HireFlow…
      </div>
    );
  }

  const initials = auth.user.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 z-30 flex w-[280px] flex-col bg-aiq-navy text-white transition lg:static lg:translate-x-0`}
      >
        <div className="px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1">
              <img
                src="/aiq-wordmark.png"
                alt="AIQ Unlimited Solutions"
                className="max-h-full w-full object-contain"
              />
            </span>
            <div>
              <p className="text-sm font-semibold">AIQ HireFlow</p>
              <p className="text-xs text-white/55">Yard operations</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const active =
                    pathname === link.href ||
                    (!link.exact && pathname.startsWith(`${link.href}/`));
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                        active
                          ? "bg-white text-aiq-navy shadow-sm ring-2 ring-aiq-gold/80"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <Icon size={18} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="m-3 rounded-2xl bg-white/8 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-aiq-gold text-sm font-semibold text-aiq-navy">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{auth.user.fullName}</p>
              <p className="text-xs text-white/55">{isAdmin ? "Administrator" : "Staff"}</p>
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onPress={() => {
              auth.logout();
              router.replace("/login");
            }}
          >
            <LogOut size={16} />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-aiq-line bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <Button
            isIconOnly
            variant="ghost"
            className="lg:hidden"
            aria-label="Open navigation"
            onPress={() => setOpen((value) => !value)}
          >
            <Menu size={18} />
          </Button>
          <img
            src="/aiq-wordmark.png"
            alt="AIQ Unlimited Solutions"
            className="h-6 w-auto shrink-0 lg:hidden"
          />
          <div className="relative max-w-lg flex-1">
            <SearchField aria-label="Search modules" value={query} onChange={setQuery}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Jump to a module" />
              </SearchField.Group>
            </SearchField>
            {filtered.length > 0 && (
              <div className="absolute z-20 mt-2 w-full rounded-2xl border border-aiq-line bg-white p-2 shadow-xl">
                {filtered.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-xl px-3 py-2 text-sm hover:bg-aiq-bg"
                    onClick={() => setQuery("")}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

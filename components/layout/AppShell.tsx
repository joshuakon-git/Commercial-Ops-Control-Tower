"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  DatabaseZap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: Activity,
  },
  {
    href: "/forecasts-risks",
    label: "Forecasts & Risks",
    icon: AlertTriangle,
  },
  {
    href: "/actions",
    label: "Actions",
    icon: ClipboardList,
  },
  {
    href: "/data-health",
    label: "Data Health",
    icon: DatabaseZap,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="page-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <h1 className="brand-title">AI Commercial Ops Control Tower</h1>
          <p className="brand-meta">Small-business operating loop for demo commercial data.</p>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className="nav-link"
                data-active={isActive}
                href={item.href}
                key={item.href}
                title={item.label}
              >
                <Icon aria-hidden className="nav-icon" strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          MVP scope: seeded data, Supabase, n8n workflows, explainable forecasts, and operator actions.
        </div>
      </aside>

      <main className="main-area">
        <div className="topbar">
          <div>
            <p className="topbar-title">Commercial Ops Workspace</p>
            <p className="topbar-meta">Supabase demo project connected through environment configuration.</p>
          </div>
          <span className="status-pill">Demo data loaded</span>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

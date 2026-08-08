"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/payroll", label: "Overview", exact: true },
  { href: "/admin/payroll/rules", label: "Commission Rules" },
  { href: "/admin/payroll/invoices", label: "Invoices" },
  { href: "/admin/payroll/commissions", label: "Commissions" },
  { href: "/admin/payroll/emails", label: "Email Queue" },
  { href: "/admin/payroll/compensation", label: "Compensation" },
  { href: "/admin/payroll/settings", label: "Settings" },
  { href: "/admin/payroll/assistant", label: "AI Assistant" },
];

export function PayrollNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5 mb-6">
      {LINKS.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

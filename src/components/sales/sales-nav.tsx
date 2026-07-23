"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  FileBarChart,
  Settings2,
  Target,
  History,
  UserCheck,
  CalendarDays,
  BarChart3,
  Shield,
  Filter,
} from "lucide-react";

const repLinks = [
  { href: "/sales/my-day", label: "Daily Log", icon: ClipboardList },
  { href: "/sales/my-progress", label: "My Progress", icon: TrendingUp },
  { href: "/sales/icp-filters", label: "ICP Filters", icon: Filter },
  { href: "/sales/leads", label: "My Leads", icon: UserCheck },
  { href: "/sales/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/sales/history", label: "Log History", icon: History },
];

const ownerLinks = [
  { href: "/sales/command", label: "Command Center", icon: LayoutDashboard },
  { href: "/sales/icp-filters", label: "ICP Filters", icon: Filter },
  { href: "/sales/leads", label: "Leads", icon: UserCheck },
  { href: "/sales/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/sales/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/sales/admin/profiles", label: "Profiles", icon: Shield },
  { href: "/sales/admin/targets", label: "Targets", icon: Target },
  { href: "/sales/weekly", label: "Weekly Report", icon: FileBarChart },
  { href: "/sales/history", label: "Log History", icon: History },
  { href: "/sales/my-day", label: "Daily Log", icon: ClipboardList },
];

export function SalesNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const links = isOwner ? ownerLinks : repLinks;

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300",
              active
                ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30 hover:bg-card/80 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-primary")} />
            {link.label}
          </Link>
        );
      })}
      {isOwner && (
        <span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Settings2 className="h-3.5 w-3.5" />
          Owner view
        </span>
      )}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, UserSearch } from "lucide-react";
import { useEffect, useState } from "react";

const tabs = [
  {
    href: "/sales/linkedin",
    label: "Outreach",
    description: "Invites, connections, messaging",
    icon: BarChart3,
    match: (path: string) =>
      path === "/sales/linkedin" || path.startsWith("/sales/linkedin?"),
  },
  {
    href: "/sales/linkedin/intelligence",
    label: "Profile Intelligence",
    description: "Export analytics & recommendations",
    icon: UserSearch,
    match: (path: string) => path.startsWith("/sales/linkedin/intelligence"),
  },
];

export function LinkedInSubnav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = mounted && tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex min-w-[200px] flex-1 flex-col gap-0.5 rounded-xl border px-4 py-3 transition-all duration-200 sm:max-w-xs",
              active
                ? "border-amber-500/50 bg-amber-500/10 text-slate-900 shadow-sm shadow-amber-500/10 dark:border-amber-500/30 dark:text-white"
                : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.06] dark:hover:text-white"
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold dark:font-semibold">
              <Icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-amber-600 dark:text-amber-400" : "text-slate-500"
                )}
              />
              {tab.label}
            </span>
            <span className="text-xs text-slate-600 dark:text-inherit dark:opacity-70">{tab.description}</span>
          </Link>
        );
      })}
    </div>
  );
}

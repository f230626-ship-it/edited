"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

export function LinkedInSubnav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = mounted && pathname.startsWith("/sales/linkedin");

  return (
    <div className="flex flex-wrap gap-2 px-4 pt-4 sm:px-6 lg:px-8">
      <Link
        href="/sales/linkedin"
        className={cn(
          "flex min-w-[200px] flex-col gap-0.5 rounded-xl border px-4 py-3 transition-all sm:max-w-xs",
          active
            ? "border-amber-500/50 bg-amber-500/10 text-foreground shadow-sm"
            : "border-border/60 bg-card/40 text-muted-foreground hover:border-amber-500/30"
        )}
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <BarChart3 className={cn("h-4 w-4", active && "text-amber-500")} />
          Profile Stats
        </span>
        <span className="text-xs opacity-70">Invites, acceptance, messaging & history</span>
      </Link>
    </div>
  );
}

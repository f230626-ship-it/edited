import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Target,
  FileBarChart,
  ArrowRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/sales/command",
    label: "Command Center",
    description: "Team KPIs, scorecards, and pipeline health",
    icon: LayoutDashboard,
  },
  {
    href: "/sales/icp-filters",
    label: "ICP Filters",
    description: "Sync Sales Navigator filters from Google Sheet",
    icon: Filter,
  },
  {
    href: "/sales/admin/profiles",
    label: "Manage Profiles",
    description: "Create LinkedIn profiles and assign reps",
    icon: Users,
  },
  {
    href: "/sales/admin/targets",
    label: "Set Targets",
    description: "Daily and weekly goals per rep",
    icon: Target,
  },
  {
    href: "/sales/weekly",
    label: "Weekly Report",
    description: "CEO summary and team performance",
    icon: FileBarChart,
  },
];

export function AdminSalesQuickLinks() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/80 to-amber-500/5 p-5 shadow-lg shadow-primary/5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Owner access</p>
        <h2 className="mt-1 text-lg font-bold">You&apos;re viewing the rep daily log</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          As admin, use Command Center and Profiles to set up the team. Personal profiles below are only
          ones assigned directly to you.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="group h-full border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{link.label}</p>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Link
          href="/sales/command"
          className={cn(buttonVariants({ size: "lg" }), "shadow-lg shadow-primary/20")}
        >
          Open Command Center
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

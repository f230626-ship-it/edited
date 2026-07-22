import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { POLICY_CATEGORY_LABELS } from "@/lib/constants";
import { asPolicies } from "@/lib/supabase/cast";
import type { Policy } from "@/types/database";
import { formatDate } from "@/lib/utils/date";
import { FileText, Download, ShieldCheck, FolderTree, Clock, Sparkles } from "lucide-react";

export default async function PoliciesPage() {
  await requireAuth();
  const supabase = createAdminClient();

  const { data: policiesData } = await supabase
    .from("policies")
    .select("*")
    .order("created_at", { ascending: false });

  const policies = asPolicies(policiesData);

  const grouped = policies.reduce<Record<string, Policy[]>>((acc, policy) => {
    const cat = policy.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(policy);
    return acc;
  }, {});

  const totalCategories = Object.keys(grouped).length;

  const kpis = [
    {
      label: "Total Policies",
      value: String(policies.length),
      sub: "Active documents",
      icon: FileText,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
    {
      label: "Categories",
      value: String(totalCategories),
      sub: "Document sections",
      icon: FolderTree,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Compliance Status",
      value: "100%",
      sub: "All up to date",
      icon: ShieldCheck,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <FileText className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Company Policies</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Official employee handbooks, guidelines, and compliance documentation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Official Portal Guidelines
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="group relative flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-border/80"
            >
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent to-transparent opacity-80",
                  kpi.grad
                )}
              />
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center shrink-0">
                    <Icon className={cn("h-5 w-5 drop-shadow-sm", kpi.iconText)} strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {kpi.label}
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-black tabular-nums tracking-tight leading-none">
                    {kpi.value}
                  </span>
                  <p className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">{kpi.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Policies Grid */}
      {policies.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <FolderTree className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold tracking-tight">
                  {POLICY_CATEGORY_LABELS[category as keyof typeof POLICY_CATEGORY_LABELS] ?? category}
                </h3>
              </div>

              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
                {items.map((policy) => (
                  <div
                    key={policy.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-muted border border-border/40 text-muted-foreground">
                          {POLICY_CATEGORY_LABELS[policy.category] ?? policy.category}
                        </span>
                      </div>

                      <h4 className="text-base font-bold tracking-tight group-hover:text-primary transition-colors">
                        {policy.title}
                      </h4>
                      {policy.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {policy.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/30 text-xs">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Updated {formatDate(policy.updated_at)}
                      </span>
                      {policy.file_url && (
                        <a
                          href={policy.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "rounded-lg font-bold text-xs shadow-none border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                          )}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-16 text-center shadow-sm">
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
            <div className="flex items-center justify-center text-muted-foreground">
              <FileText className="h-12 w-12 opacity-50" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold">No Policies Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Company handbooks and policies will appear here once uploaded by management.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

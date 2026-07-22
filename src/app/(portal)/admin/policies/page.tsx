import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { PolicyForm } from "@/components/admin/policy-form";
import { DeletePolicyButton } from "@/components/admin/delete-policy-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POLICY_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/date";
import { FileText, Download, FolderTree, ShieldCheck, Clock } from "lucide-react";

export default async function AdminPoliciesPage() {
  await requireRole("admin");
  const supabase = createAdminClient();

  const { data: policiesData } = await supabase
    .from("policies")
    .select("*")
    .order("created_at", { ascending: false });

  const policies = policiesData ?? [];

  const categoriesCount = new Set(policies.map((p) => p.category)).size;

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
      value: String(categoriesCount),
      sub: "Organized sections",
      icon: FolderTree,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Status",
      value: "Published",
      sub: "Accessible to staff",
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
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Policy Management</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Upload and maintain official company handbooks, compliance guidelines, and documents
                </p>
              </div>
            </div>

            <PolicyForm />
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

      {/* Policies Master Table */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Policy Registry ({policies.length})</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Published documents</p>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {policies.length > 0 ? (
            <Table style={{ tableLayout: "fixed" }}>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/40 bg-muted/20">
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-4 w-[30%]">Title</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-3 w-[20%]">Category</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-3 w-[20%]">Updated</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-3 w-[20%]">Document</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-4 w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4 font-bold text-xs truncate">{policy.title}</TableCell>
                    <TableCell className="py-3 px-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                        {POLICY_CATEGORY_LABELS[policy.category] ?? policy.category}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(policy.updated_at)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-3">
                      {policy.file_url ? (
                        <a
                          href={policy.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-8 rounded-lg font-bold text-xs shadow-none border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                          )}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          {policy.file_name ?? "Download"}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <DeletePolicyButton policyId={policy.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm font-semibold">No company policies uploaded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

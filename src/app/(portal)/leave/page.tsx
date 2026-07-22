import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isAdmin } from "@/lib/auth";
import { LeaveForm } from "@/components/leave/leave-form";
import { PendingLeaveApprovals } from "@/components/leave/pending-approvals";
import { LeaveHistoryTable } from "@/components/leave/leave-history-table";
import { HolidayPlanner } from "@/components/leave/holiday-planner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPendingLeavesForLead } from "@/actions/leaves";
import { LeaveQuotaEditor } from "@/components/admin/leave-quota-editor";
import { CalendarCheck, Clock } from "lucide-react";

export default async function LeavePage() {
  const employee = await requireAuth();
  const supabase = createAdminClient();

  const [{ data: leaves }, { data: balance }, { data: holidays }, pendingForLead, admin] = await Promise.all([
    supabase
      .from("leaves")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false }),
    supabase.from("leave_balances").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("holidays").select("*").order("date", { ascending: true }),
    getPendingLeavesForLead(),
    isAdmin(employee.role),
  ]);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">

      {/* ── Premium Hero Header ── */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <CalendarCheck className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Leave Management</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Plan holidays, apply for leave, and track your requests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {pendingForLead.length > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                  {pendingForLead.length} pending approval{pendingForLead.length !== 1 ? "s" : ""}
                </div>
              )}
              <LeaveForm />
            </div>
          </div>
        </div>
      </div>

      {/* Holiday Planner Section */}
      <HolidayPlanner holidays={holidays ?? []} leaves={leaves ?? []} />

      {pendingForLead.length > 0 && (
        <Card className="glass-card-glow-amber border-none">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-bold">Team Leave Approvals</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <PendingLeaveApprovals leaves={pendingForLead} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">Leave Balance</h2>
          {admin && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Editing quotas applies to all employees</p>
          )}
        </div>
        {admin && (
          <LeaveQuotaEditor
            annualQuota={balance?.annual_quota ?? 5}
            sickQuota={balance?.sick_quota ?? 5}
            casualQuota={balance?.casual_quota ?? 3}
          />
        )}
      </div>
      
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Annual",
            remaining: (balance?.annual_quota ?? 0) - (balance?.annual_used ?? 0),
            total: balance?.annual_quota ?? 0,
            glowClass: "glass-card-glow-blue",
          },
          {
            label: "Sick",
            remaining: (balance?.sick_quota ?? 0) - (balance?.sick_used ?? 0),
            total: balance?.sick_quota ?? 0,
            glowClass: "glass-card-glow-amber",
          },
          {
            label: "Casual",
            remaining: (balance?.casual_quota ?? 0) - (balance?.casual_used ?? 0),
            total: balance?.casual_quota ?? 0,
            glowClass: "glass-card-glow-green",
          },
        ].map((item) => (
          <Card key={item.label} className={`${item.glowClass} border-none`}>
            <CardHeader className="pb-2 sm:pb-3 border-b border-border/20">
              <CardTitle className="text-xs sm:text-sm font-semibold">{item.label} Leave</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-2xl sm:text-3xl font-extrabold">{item.remaining}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">of {item.total} days remaining</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card-glow-primary border-none mt-4 sm:mt-5 md:mt-6">
        <CardHeader className="border-b border-border/30">
          <CardTitle className="text-sm sm:text-base font-bold">Leave Requests History</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <LeaveHistoryTable leaves={leaves ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

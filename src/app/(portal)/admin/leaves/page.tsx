import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, isAdmin } from "@/lib/auth";
import { LeaveActions } from "@/components/admin/leave-actions";
import { LeaveQuotaAdjuster } from "@/components/admin/leave-quota-adjuster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/date";
import { getPendingLeavesForLead } from "@/actions/leaves";
import { ClipboardCheck, Clock } from "lucide-react";

export default async function AdminLeavesPage() {
  const employee = await requireRole("admin");
  const supabase = createAdminClient();

  const pendingForLead = await getPendingLeavesForLead();

  const { data: allLeaves } = isAdmin(employee.role)
    ? await supabase
        .from("leaves")
        .select("*, employee:employees!leaves_employee_id_fkey(id, full_name, email, designation, employee_code)")
        .order("created_at", { ascending: false })
    : { data: null };

  const pending = isAdmin(employee.role)
    ? (allLeaves?.filter((l) => l.status === "pending") ?? [])
    : pendingForLead;

  const processed = isAdmin(employee.role)
    ? (allLeaves?.filter((l) => l.status !== "pending") ?? [])
    : [];

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingLeaves = processed.filter(l => l.end_date >= todayStr || l.start_date >= todayStr);
  const pastLeaves = processed.filter(l => l.end_date < todayStr);

  // Fetch all leave balances with employee info (admin only)
  let leaveBalances: any[] = [];
  if (isAdmin(employee.role)) {
    const { data } = await supabase
      .from("leave_balances")
      .select(`
        *,
        employee:employees!leave_balances_employee_id_fkey(id, full_name, email, employee_code, designation, status)
      `)
      .order("created_at", { ascending: false });
    leaveBalances = (data ?? []).filter((b: any) => b.employee?.status === "active");
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">

      {/* ── Premium Hero Header ── */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Leave Approvals</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Review and approve employee leave requests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {pending.length > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                  {pending.length} pending approval{pending.length !== 1 ? "s" : ""}
                </div>
              )}
              {pending.length === 0 && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={2} />
                  All caught up
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          {isAdmin(employee.role) && (
            <>
              <TabsTrigger value="upcoming">Upcoming & Future ({upcomingLeaves.length})</TabsTrigger>
              <TabsTrigger value="history">History ({pastLeaves.length})</TabsTrigger>
              <TabsTrigger value="quotas">Leave Quotas ({leaveBalances.length})</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="pending">
          <Card className="glass-card-glow-amber border-none">
            <CardHeader className="border-b border-border/30">
              <CardTitle>Pending Requests</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {pending.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table style={{ tableLayout: 'fixed' }}>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 pl-4 pr-2 w-[20%]">Employee</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[12%]">Type</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[26%]">Dates</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[9%] text-right">Days</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[20%]">Reason</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 pr-4 pl-2 w-[13%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pending.map((leave) => (
                        <TableRow key={leave.id} className="border-b border-border/30 hover:bg-card/40 transition-colors">
                          <TableCell className="py-2.5 pl-4 pr-2 overflow-hidden">
                            <div className="truncate">
                              <p className="font-medium text-sm truncate">{leave.employee?.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {leave.employee?.employee_code ?? leave.employee?.designation}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 px-2 text-sm truncate overflow-hidden">{LEAVE_TYPE_LABELS[leave.leave_type]}</TableCell>
                          <TableCell className="py-2.5 px-2 text-sm overflow-hidden">
                            <div className="truncate">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</div>
                          </TableCell>
                          <TableCell className="py-2.5 px-2 text-right tabular-nums font-semibold overflow-hidden">{leave.days_count}</TableCell>
                          <TableCell className="py-2.5 px-2 truncate text-sm text-muted-foreground overflow-hidden max-w-0">{leave.reason}</TableCell>
                          <TableCell className="py-2.5 pr-4 pl-2 overflow-hidden">
                            <LeaveActions leaveId={leave.id} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No pending leave requests</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin(employee.role) && (
          <TabsContent value="upcoming">
            <Card className="glass-card-glow-primary border-none">
              <CardHeader className="border-b border-border/30">
                <CardTitle>Upcoming & Future Team Leaves</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table style={{ tableLayout: 'fixed' }}>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 pl-4 pr-2 w-[24%]">Employee</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[13%]">Type</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[26%]">Dates</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[11%] text-right">Days</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 pr-4 pl-2 w-[26%]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingLeaves.map((leave) => (
                        <React.Fragment key={leave.id}>
                          <TableRow className="border-b border-border/30 hover:bg-card/40 transition-colors">
                            <TableCell className="py-2.5 pl-4 pr-2 font-medium text-sm truncate">{leave.employee?.full_name}</TableCell>
                            <TableCell className="py-2.5 px-2 text-sm truncate">{LEAVE_TYPE_LABELS[leave.leave_type]}</TableCell>
                            <TableCell className="py-2.5 px-2 text-sm">
                              <div className="truncate">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</div>
                            </TableCell>
                            <TableCell className="py-2.5 px-2 text-right tabular-nums font-semibold">{leave.days_count}</TableCell>
                            <TableCell className="py-2.5 pr-4 pl-2">
                              <Badge className={STATUS_COLORS[leave.status]} variant="secondary">
                                {LEAVE_STATUS_LABELS[leave.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                      {upcomingLeaves.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                            No upcoming leaves planned
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin(employee.role) && (
          <TabsContent value="history">
            <Card className="glass-card-glow-violet border-none">
              <CardHeader className="border-b border-border/30">
                <CardTitle>Past Processed Requests</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table style={{ tableLayout: 'fixed' }}>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 pl-4 pr-2 w-[24%]">Employee</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[13%]">Type</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[26%]">Dates</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-2 w-[11%] text-right">Days</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 pr-4 pl-2 w-[26%]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastLeaves.map((leave) => (
                        <React.Fragment key={leave.id}>
                          <TableRow className="border-b border-border/30 hover:bg-card/40 transition-colors">
                            <TableCell className="py-2.5 pl-4 pr-2 font-medium text-sm truncate">{leave.employee?.full_name}</TableCell>
                            <TableCell className="py-2.5 px-2 text-sm truncate">{LEAVE_TYPE_LABELS[leave.leave_type]}</TableCell>
                            <TableCell className="py-2.5 px-2 text-sm">
                              <div className="truncate">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</div>
                            </TableCell>
                            <TableCell className="py-2.5 px-2 text-right tabular-nums font-semibold">{leave.days_count}</TableCell>
                            <TableCell className="py-2.5 pr-4 pl-2">
                              <Badge className={STATUS_COLORS[leave.status]} variant="secondary">
                                {LEAVE_STATUS_LABELS[leave.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {leave.status === 'rejected' && leave.rejection_reason && (
                            <TableRow className="border-b border-border/30">
                              <TableCell colSpan={5} className="pt-0 pb-3 pl-4 pr-4">
                                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-1">
                                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                                  <p className="text-sm text-red-600 dark:text-red-300">{leave.rejection_reason}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                      {pastLeaves.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                            No past leaves found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin(employee.role) && (
          <TabsContent value="quotas">
            <Card className="glass-card-glow-blue border-none">
              <CardHeader className="border-b border-border/30">
                <CardTitle>Leave Quotas Management</CardTitle>
              </CardHeader>
              <CardContent>
                {leaveBalances.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table style={{ tableLayout: 'fixed' }}>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border/50">
                          <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[28%]">Employee</TableHead>
                          <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[18%] text-right">Annual</TableHead>
                          <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[18%] text-right">Sick</TableHead>
                          <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[18%] text-right">Casual</TableHead>
                          <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[18%]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveBalances.map((balance: any) => (
                          <TableRow key={balance.id} className="border-b border-border/30">
                            <TableCell className="py-2.5 px-3">
                              <div>
                                <p className="font-medium text-sm">{balance.employee?.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {balance.employee?.employee_code ?? balance.employee?.designation}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right">
                              <span className="font-mono text-sm font-semibold">{balance.annual_quota}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({balance.annual_used} used)
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right">
                              <span className="font-mono text-sm font-semibold">{balance.sick_quota}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({balance.sick_used} used)
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right">
                              <span className="font-mono text-sm font-semibold">{balance.casual_quota}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({balance.casual_used} used)
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <LeaveQuotaAdjuster balance={balance} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No employees found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

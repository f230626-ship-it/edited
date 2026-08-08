"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  runPayrollCalculation,
  approvePayrollPeriod,
  rejectPayrollPeriod,
  generateSalarySlips,
  resolvePayrollAnomaly,
  getPayrollRecordCalculation,
} from "@/actions/payroll";
import type { PayrollAnomaly, PayrollPeriod, PayrollRecord } from "@/types/database";

export function PayrollPeriodClient({
  period,
  records,
  anomalies,
  isApprover,
}: {
  period: PayrollPeriod;
  records: PayrollRecord[];
  anomalies: PayrollAnomaly[];
  isApprover: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [calcId, setCalcId] = useState<string | null>(null);

  const openCritical = anomalies.filter(
    (a) => a.severity === "CRITICAL" && !a.resolved_at
  ).length;
  const openWarnings = anomalies.filter(
    (a) => a.severity === "WARNING" && !a.resolved_at
  ).length;

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/payroll" className="text-xs text-muted-foreground hover:underline">
            ← All periods
          </Link>
          <h2 className="text-xl font-bold mt-1">{period.label}</h2>
          <p className="text-sm text-muted-foreground">
            {period.start_date} → {period.end_date} · Pay date {period.pay_date}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {period.status}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Employees", value: records.length },
          { label: "Base payroll", value: `$${Number(period.total_gross).toLocaleString()}` },
          { label: "Commissions", value: `$${Number(period.total_commissions).toLocaleString()}` },
          { label: "Deductions", value: `$${Number(period.total_deductions).toLocaleString()}` },
          { label: "Net payroll", value: `$${Number(period.total_net).toLocaleString()}` },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            disabled={pending || ["APPROVED", "PROCESSING", "COMPLETED"].includes(period.status)}
            onClick={() =>
              start(async () => {
                const res = await runPayrollCalculation(period.id);
                if (!res.ok) toast.error(res.error || "Calculation failed");
                else
                  toast.success(
                    `Calculated ${res.employeesProcessed} employees · Net $${res.totalNet.toLocaleString()}`
                  );
                refresh();
              })
            }
          >
            Calculate Payroll
          </Button>

          {isApprover && (
            <Button
              variant="default"
              disabled={
                pending ||
                !["READY_FOR_APPROVAL", "REVIEW_REQUIRED"].includes(period.status) ||
                openCritical > 0
              }
              onClick={() => {
                const ok = window.confirm(
                  "I confirm that I have reviewed and approved this payroll."
                );
                if (!ok) return;
                start(async () => {
                  const res = await approvePayrollPeriod(period.id, true);
                  if (res.error) toast.error(res.error);
                  else toast.success("Payroll approved");
                  refresh();
                });
              }}
            >
              Approve Payroll
            </Button>
          )}

          {isApprover && (
            <Button
              variant="outline"
              disabled={pending || ["COMPLETED", "CANCELLED"].includes(period.status)}
              onClick={() => {
                const reason = window.prompt("Rejection reason") || "";
                if (!reason) return;
                start(async () => {
                  const res = await rejectPayrollPeriod(period.id, reason);
                  if (res.error) toast.error(res.error);
                  else toast.success("Payroll rejected");
                  refresh();
                });
              }}
            >
              Reject
            </Button>
          )}

          {isApprover && (
            <Button
              variant="secondary"
              disabled={pending || !["APPROVED", "PROCESSING", "COMPLETED"].includes(period.status)}
              onClick={() =>
                start(async () => {
                  const res = await generateSalarySlips(period.id);
                  if (res.error) toast.error(res.error);
                  else toast.success(`Generated ${res.generated} salary slips + email drafts`);
                  refresh();
                })
              }
            >
              Generate Salary Slips
            </Button>
          )}

          <Link href={`/admin/payroll/emails?period=${period.id}`}>
            <Button variant="outline">Email Queue</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Exceptions ({openCritical} critical · {openWarnings} warnings)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {anomalies.length === 0 && (
            <p className="text-sm text-muted-foreground">No anomalies.</p>
          )}
          {anomalies.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/40 px-3 py-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      a.severity === "CRITICAL"
                        ? "bg-red-500/10 text-red-600"
                        : a.severity === "WARNING"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-blue-500/10 text-blue-600"
                    }
                  >
                    {a.severity}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{a.code}</span>
                  {a.resolved_at && (
                    <Badge variant="outline" className="text-[10px]">
                      Resolved
                    </Badge>
                  )}
                </div>
                <p className="text-sm mt-1">{a.message}</p>
              </div>
              {!a.resolved_at && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await resolvePayrollAnomaly(a.id);
                      if (res.error) toast.error(res.error);
                      else toast.success("Resolved");
                      refresh();
                    })
                  }
                >
                  Dismiss
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employees</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.employee?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.employee?.designation}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(r.base_salary + r.allowances).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(r.commission_total).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(r.deductions).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {Number(r.net_pay).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCalcId(calcId === r.id ? null : r.id)}
                    >
                      View Calculation
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {calcId && (
            <CalculationPanel recordId={calcId} onClose={() => setCalcId(null)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CalculationPanel({
  recordId,
  onClose,
}: {
  recordId: string;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<
    { line_type: string; description: string; amount: number }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLines(null);
    setError(null);
    getPayrollRecordCalculation(recordId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.error) setError(res.error);
      else
        setLines(
          (res.record?.line_items as {
            line_type: string;
            description: string;
            amount: number;
          }[]) || []
        );
    });
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  return (
    <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">Calculation breakdown</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {lines && (
        <ul className="space-y-1 text-sm">
          {lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span>
                <span className="text-xs uppercase text-muted-foreground mr-2">
                  {l.line_type}
                </span>
                {l.description}
              </span>
              <span className="font-mono">{Number(l.amount).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

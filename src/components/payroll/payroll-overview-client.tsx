"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPayrollPeriod } from "@/actions/payroll";
import type { PayrollPeriod } from "@/types/database";

export function PayrollOverviewClient({
  periods,
}: {
  periods: PayrollPeriod[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  function create() {
    start(async () => {
      const res = await createPayrollPeriod({ year, month });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Payroll period created");
      router.push(`/admin/payroll/${res.period!.id}`);
      router.refresh();
    });
  }

  const latest = periods[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Periods", value: periods.length },
          { label: "Latest status", value: latest?.status || "—" },
          { label: "Base payroll", value: latest ? `$${Number(latest.total_gross).toLocaleString()}` : "—" },
          { label: "Commissions", value: latest ? `$${Number(latest.total_commissions).toLocaleString()}` : "—" },
          { label: "Net payroll", value: latest ? `$${Number(latest.total_net).toLocaleString()}` : "—" },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create payroll</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Year</span>
            <input
              type="number"
              className="flex h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Month</span>
            <input
              type="number"
              min={1}
              max={12}
              className="flex h-9 w-20 rounded-md border border-input bg-background px-3 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </label>
          <Button onClick={create} disabled={pending}>
            Create Payroll
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {periods.length === 0 && (
            <p className="text-sm text-muted-foreground">No payroll periods yet.</p>
          )}
          {periods.map((p) => (
            <Link
              key={p.id}
              href={`/admin/payroll/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="text-xs text-muted-foreground">
                  {p.start_date} → {p.end_date} · Pay {p.pay_date}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono">
                  ${Number(p.total_net).toLocaleString()}
                </span>
                <Badge variant="secondary">{p.status}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

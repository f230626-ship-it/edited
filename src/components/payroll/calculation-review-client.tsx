"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableRow, TableCell, TableHeader } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { use } from "react";
import { updatePayrollRecordCalculation } from "@/actions/payroll";
import type { PayrollRecord } from "@/types/database";

export function CalculationReviewClient({
  record,
  periodId,
}: {
  record: PayrollRecord;
  periodId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showOverride, setShowOverride] = useState(false);
  const [overrides, setOverrides] = useState<{
    base_salary?: number;
    allowances?: number;
    commission_total?: number;
    bonus?: number;
    deductions?: number;
  }>({});

  const employee = record.employee as {
    full_name: string;
    designation: string;
    employee_code: string | null;
    email: string | null;
  };

  const lines = (record.line_items || []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );

  const baseSalary = Number(record.base_salary || 0);
  const allowances = Number(record.allowances || 0);
  const commissionTotal = Number(record.commission_total || 0);
  const bonus = Number(record.bonus || 0);
  const deductions = Number(record.deductions || 0);
  const gross = parseFloat((baseSalary + allowances + commissionTotal + bonus).toFixed(2));
  const net = Math.max(0, parseFloat((gross - deductions).toFixed(2)));

  const fmt = (n: number) =>
    `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salary Review — {employee?.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Base Salary</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overrides.base_salary ?? baseSalary}
                onChange={(e) =>
                  setOverrides((prev) => ({ ...prev, base_salary: Math.max(0, Number(e.target.value) || 0) }))
                }
                disabled={!showOverride}
              />
            </div>
            <div>
              <Label>Allowances</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overrides.allowances ?? allowances}
                onChange={(e) =>
                  setOverrides((prev) => ({ ...prev, allowances: Math.max(0, Number(e.target.value) || 0) }))
                }
                disabled={!showOverride}
              />
            </div>
            <div>
              <Label>Commission</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overrides.commission_total ?? commissionTotal}
                onChange={(e) =>
                  setOverrides((prev) => ({ ...prev, commission_total: Math.max(0, Number(e.target.value) || 0) }))
                }
                disabled={!showOverride}
              />
            </div>
            <div>
              <Label>Bonus</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overrides.bonus ?? bonus}
                onChange={(e) =>
                  setOverrides((prev) => ({ ...prev, bonus: Math.max(0, Number(e.target.value) || 0) }))
                }
                disabled={!showOverride}
              />
            </div>
          </div>
          <div>
            <Label>Deductions</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={overrides.deductions ?? deductions}
              onChange={(e) =>
                setOverrides((prev) => ({ ...prev, deductions: Math.max(0, Number(e.target.value) || 0) }))
              }
              disabled={!showOverride}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={l.id} className="border-b">
                  <TableCell>
                    <div className="font-medium">{l.description}</div>
                    <div className="text-xs text-muted-foreground">{l.line_type}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(l.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Final Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span>Base Salary</span>
            <span className="font-mono font-bold">{fmt(baseSalary)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Allowances</span>
            <span className="font-mono font-bold">{fmt(allowances)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Commission</span>
            <span className="font-mono font-bold">{fmt(commissionTotal)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Bonus</span>
            <span className="font-mono font-bold">{fmt(bonus)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-4">
            <span>Deductions</span>
            <span className="font-mono font-bold text-destructive">{fmt(deductions)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-4">
            <span>Net Salary</span>
            <span className="font-mono font-bold text-xl">
              {fmt(net)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {showOverride ? (
            <>
              <Button
                size="sm"
                onClick={() => start(async () => {
                  const res = await updatePayrollRecordCalculation(record.id, overrides);
                  if (res.error) {
                    toast.error(res.error);
                  } else {
                    toast.success("Record updated successfully");
                    router.refresh();
                  }
                })}
              >
                Save Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowOverride(false);
                  setOverrides({});
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOverride(true)}
            >
              Edit Calculation
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
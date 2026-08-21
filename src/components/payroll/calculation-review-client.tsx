"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableRow, TableCell, TableHeader } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    base_salary: number;
    allowances: number;
    commission_total: number;
    bonus: number;
    deductions: number;
  }>({
    base_salary: Number(record.base_salary || 0),
    allowances: Number(record.allowances || 0),
    commission_total: Number(record.commission_total || 0),
    bonus: Number(record.bonus || 0),
    deductions: Number(record.deductions || 0),
  });

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

  const base = Math.max(0, overrides.base_salary);
  const allowances = Math.max(0, overrides.allowances);
  const commission = Math.max(0, overrides.commission_total);
  const bonus = Math.max(0, overrides.bonus);
  const deductions = Math.max(0, overrides.deductions);
  const gross = parseFloat((base + allowances + commission + bonus).toFixed(2));
  const net = Math.max(0, parseFloat((gross - deductions).toFixed(2)));

  const hasChanges =
    base !== Number(record.base_salary || 0) ||
    allowances !== Number(record.allowances || 0) ||
    commission !== Number(record.commission_total || 0) ||
    bonus !== Number(record.bonus || 0) ||
    deductions !== Number(record.deductions || 0);

  const fmt = (n: number) =>
    `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function handleFieldChange(field: keyof typeof overrides, value: string) {
    const num = Number(value) || 0;
    setOverrides((prev) => ({ ...prev, [field]: Math.max(0, num) }));
  }

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
                value={overrides.base_salary}
                onChange={(e) => handleFieldChange("base_salary", e.target.value)}
                disabled={!showOverride}
              />
            </div>
            <div>
              <Label>Allowances</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overrides.allowances}
                onChange={(e) => handleFieldChange("allowances", e.target.value)}
                disabled={!showOverride}
              />
            </div>
            <div>
              <Label>Commission</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overrides.commission_total}
                onChange={(e) => handleFieldChange("commission_total", e.target.value)}
                disabled={!showOverride}
              />
            </div>
            <div>
              <Label>Bonus</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overrides.bonus}
                onChange={(e) => handleFieldChange("bonus", e.target.value)}
                disabled={!showOverride}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label>Deductions</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={overrides.deductions}
              onChange={(e) => handleFieldChange("deductions", e.target.value)}
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
          <CardTitle className="text-base">
            Final Totals
            {showOverride && hasChanges && (
              <Badge variant="secondary" className="ml-2 text-xs">Live Preview</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span>Base Salary</span>
            <span className="font-mono font-bold">{fmt(base)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Allowances</span>
            <span className="font-mono font-bold">{fmt(allowances)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Commission</span>
            <span className="font-mono font-bold">{fmt(commission)}</span>
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
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pending || !hasChanges}
                onClick={() => start(async () => {
                  const res = await updatePayrollRecordCalculation(record.id, overrides);
                  if (res.error) {
                    toast.error(res.error);
                  } else {
                    toast.success("Record updated successfully");
                    setShowOverride(false);
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
                  setOverrides({
                    base_salary: Number(record.base_salary || 0),
                    allowances: Number(record.allowances || 0),
                    commission_total: Number(record.commission_total || 0),
                    bonus: Number(record.bonus || 0),
                    deductions: Number(record.deductions || 0),
                  });
                }}
              >
                Cancel
              </Button>
            </div>
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

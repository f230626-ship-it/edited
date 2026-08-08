"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompensationVersion } from "@/actions/payroll";
import type { EmployeeCompensation } from "@/types/database";

export function CompensationClient({
  employees,
  historyByEmployee,
}: {
  employees: { id: string; full_name: string; basic_salary: number | null }[];
  historyByEmployee: Record<string, EmployeeCompensation[]>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New compensation version</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const res = await createCompensationVersion({
                  employeeId: String(fd.get("employee_id")),
                  basicSalary: Number(fd.get("basic_salary") || 0),
                  allowances: Number(fd.get("allowances") || 0),
                  currency: String(fd.get("currency") || "USD"),
                  salaryFrequency: String(fd.get("salary_frequency") || "monthly"),
                  commissionEligible: fd.get("commission_eligible") === "on",
                  commissionRole: (fd.get("commission_role") as string) || null,
                  effectiveFrom: String(fd.get("effective_from")),
                  notes: (fd.get("notes") as string) || undefined,
                });
                if (res.error) toast.error(res.error);
                else {
                  toast.success("Compensation version created (history preserved)");
                  router.refresh();
                }
              });
            }}
          >
            <div>
              <Label>Employee</Label>
              <select
                name="employee_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Basic salary</Label>
              <Input name="basic_salary" type="number" step="0.01" required />
            </div>
            <div>
              <Label>Allowances</Label>
              <Input name="allowances" type="number" step="0.01" defaultValue={0} />
            </div>
            <div>
              <Label>Currency</Label>
              <Input name="currency" defaultValue="USD" />
            </div>
            <div>
              <Label>Frequency</Label>
              <select
                name="salary_frequency"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="monthly"
              >
                <option value="monthly">monthly</option>
                <option value="bi_weekly">bi_weekly</option>
                <option value="weekly">weekly</option>
              </select>
            </div>
            <div>
              <Label>Effective from</Label>
              <Input
                name="effective_from"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <Label>Commission role</Label>
              <Input name="commission_role" placeholder="bd / closer / upsell" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="commission_eligible" />
                Commission eligible
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={pending}>
                Save version
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History by employee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {employees.map((e) => {
            const hist = historyByEmployee[e.id] || [];
            if (!hist.length) return null;
            return (
              <div key={e.id}>
                <p className="text-sm font-semibold mb-1">{e.full_name}</p>
                <ul className="space-y-1">
                  {hist.map((h) => (
                    <li
                      key={h.id}
                      className="text-xs text-muted-foreground flex justify-between gap-2 border-b border-border/30 py-1"
                    >
                      <span>
                        {h.currency} {Number(h.basic_salary).toLocaleString()}
                        {h.allowances ? ` + ${h.allowances} allow.` : ""}
                        {h.commission_eligible ? ` · ${h.commission_role || "commission"}` : ""}
                      </span>
                      <span>
                        {h.effective_from}
                        {h.effective_until ? ` → ${h.effective_until}` : " → current"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

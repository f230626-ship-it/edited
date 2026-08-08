"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertCommissionRule } from "@/actions/payroll";
import type { CommissionRule } from "@/types/database";

export function CommissionRulesClient({ rules }: { rules: CommissionRule[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add / update rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("is_active", "true");
              start(async () => {
                const res = await upsertCommissionRule(fd);
                if (res.error) toast.error(res.error);
                else {
                  toast.success("Rule saved");
                  (e.target as HTMLFormElement).reset();
                  router.refresh();
                }
              });
            }}
          >
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="BD — 2% collected" />
            </div>
            <div>
              <Label>Role</Label>
              <Input name="role" required placeholder="bd | closer | upsell" />
            </div>
            <div>
              <Label>Percentage</Label>
              <Input name="commission_percentage" type="number" step="0.01" defaultValue={2} />
            </div>
            <div>
              <Label>Fixed amount</Label>
              <Input name="fixed_commission" type="number" step="0.01" defaultValue={0} />
            </div>
            <div>
              <Label>Basis</Label>
              <select
                name="commission_basis"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="PAID"
              >
                <option value="PAID">PAID</option>
                <option value="INVOICED">INVOICED</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                <option value="PROJECT_VALUE">PROJECT_VALUE</option>
              </select>
            </div>
            <div>
              <Label>Effective from</Label>
              <Input
                name="effective_from"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={pending}>
                Save rule
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.role} · {r.commission_percentage}% + {r.fixed_commission} fixed · {r.commission_basis}
                  {!r.is_active && " · inactive"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {r.effective_from}
                {r.effective_until ? ` → ${r.effective_until}` : " → open"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

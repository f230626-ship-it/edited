"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePayrollSettings } from "@/actions/payroll";
import type { PayrollSettings } from "@/types/database";

export function PayrollSettingsClient({
  settings,
  canEdit,
}: {
  settings: PayrollSettings | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payroll settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2 max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canEdit) return;
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await updatePayrollSettings(fd);
              if (res.error) toast.error(res.error);
              else {
                toast.success("Settings saved");
                router.refresh();
              }
            });
          }}
        >
          <div>
            <Label>Company name</Label>
            <Input
              name="company_name"
              defaultValue={settings?.company_name || "MindVista"}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Default currency</Label>
            <Input
              name="default_currency"
              defaultValue={settings?.default_currency || "USD"}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Pay day of month</Label>
            <Input
              name="pay_day_of_month"
              type="number"
              min={1}
              max={31}
              defaultValue={settings?.pay_day_of_month ?? 31}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Reminder days before (comma-separated)</Label>
            <Input
              name="reminder_days_before"
              defaultValue={(settings?.reminder_days_before || [7, 3, 1, 0]).join(",")}
              disabled={!canEdit}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Company address</Label>
            <Input
              name="company_address"
              defaultValue={settings?.company_address || ""}
              disabled={!canEdit}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Slip footer</Label>
            <Input
              name="slip_footer"
              defaultValue={settings?.slip_footer || ""}
              disabled={!canEdit}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Admin notify email</Label>
            <Input
              name="admin_notify_email"
              type="email"
              defaultValue={settings?.admin_notify_email || ""}
              disabled={!canEdit}
            />
          </div>
          {canEdit && (
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                Save settings
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

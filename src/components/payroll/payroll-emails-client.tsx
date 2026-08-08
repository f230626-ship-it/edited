"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  approveAllPayrollEmails,
  approvePayrollEmails,
  sendApprovedPayrollEmails,
  retryPayrollEmail,
} from "@/actions/payroll";
import type { PayrollEmailQueueItem } from "@/types/database";

export function PayrollEmailsClient({
  rows,
  periodId,
  isApprover,
}: {
  rows: PayrollEmailQueueItem[];
  periodId: string | null;
  isApprover: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {isApprover && periodId && (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await approveAllPayrollEmails(periodId);
                if ("error" in res && res.error) toast.error(res.error);
                else if ("count" in res) toast.success(`Approved ${res.count} emails`);
                else toast.success("Approved");
                router.refresh();
              })
            }
          >
            Approve All Emails
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              const ok = window.confirm(
                "Send all APPROVED salary emails now? This cannot be undone."
              );
              if (!ok) return;
              start(async () => {
                const res = await sendApprovedPayrollEmails(periodId);
                if (res.error) toast.error(res.error);
                else toast.success(`Sent ${res.sent}, failed ${res.failed}`);
                router.refresh();
              });
            }}
          >
            Send Approved Emails
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Email queue ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {r.employee?.full_name || "—"} · {r.to_email}
                </p>
                <p className="text-xs text-muted-foreground">{r.subject}</p>
                {r.error && (
                  <p className="text-xs text-destructive mt-1">{r.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{r.status}</Badge>
                {isApprover && r.status === "READY" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await approvePayrollEmails([r.id]);
                        if (res.error) toast.error(res.error);
                        else toast.success("Approved");
                        router.refresh();
                      })
                    }
                  >
                    Approve
                  </Button>
                )}
                {isApprover && r.status === "FAILED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await retryPayrollEmail(r.id);
                        if (res.error) toast.error(res.error);
                        else toast.success(`Retry: sent ${res.sent}`);
                        router.refresh();
                      })
                    }
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No email drafts. Approve a payroll and generate salary slips first.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

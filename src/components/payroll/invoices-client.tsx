"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvoice, recordInvoicePayment } from "@/actions/payroll";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  client_name: string | null;
  amount: number;
  currency: string;
  status: string;
  project?: { id: string; name: string } | null;
  payments?: { id: string; amount: number; paid_at: string }[];
};

export function InvoicesClient({
  invoices,
  projects,
}: {
  invoices: InvoiceRow[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const res = await createInvoice(fd);
                if (res.error) toast.error(res.error);
                else {
                  toast.success("Invoice created");
                  (e.target as HTMLFormElement).reset();
                  router.refresh();
                }
              });
            }}
          >
            <div>
              <Label>Invoice #</Label>
              <Input name="invoice_number" required />
            </div>
            <div>
              <Label>Project</Label>
              <select
                name="project_id"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Client</Label>
              <Input name="client_name" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input name="amount" type="number" step="0.01" required />
            </div>
            <div>
              <Label>Currency</Label>
              <Input name="currency" defaultValue="USD" />
            </div>
            <div>
              <Label>Invoice date</Label>
              <Input name="invoice_date" type="date" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={pending}>
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const res = await recordInvoicePayment(fd);
                if (res.error) toast.error(res.error);
                else {
                  toast.success("Payment recorded");
                  (e.target as HTMLFormElement).reset();
                  router.refresh();
                }
              });
            }}
          >
            <div>
              <Label>Invoice</Label>
              <select
                name="invoice_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select…</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} ({inv.currency} {inv.amount})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input name="amount" type="number" step="0.01" required />
            </div>
            <div>
              <Label>Paid at</Label>
              <Input
                name="paid_at"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending}>
                Add payment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoices.map((inv) => {
            const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
            return (
              <div
                key={inv.id}
                className="rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {inv.invoice_number}{" "}
                      <span className="text-muted-foreground font-normal">
                        · {inv.project?.name || inv.client_name || "—"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.currency} {Number(inv.amount).toLocaleString()} · paid{" "}
                      {paid.toLocaleString()} · {inv.status}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {invoices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No invoices yet. Add invoices/payments for accurate PAID commissions; otherwise payroll falls back to project payment status.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

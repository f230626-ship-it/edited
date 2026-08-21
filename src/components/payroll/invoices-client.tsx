"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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

export function InvoicesClient() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePreview(invoiceId: string) {
    setPreviewingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/preview`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        alert(err.error || "Failed to load PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("[invoice-preview]", err);
      alert("Failed to load invoice PDF");
    } finally {
      setPreviewingId(null);
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading invoices…</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Invoices ({invoices.length})</h2>
      <div className="space-y-2">
        {invoices.map((inv) => {
          const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
          return (
            <div key={inv.id} className="rounded-lg border border-border/40 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {inv.invoice_number}{" "}
                    <span className="text-muted-foreground font-normal">
                      · {inv.project?.name || inv.client_name || "—"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.currency} {Number(inv.amount).toLocaleString()} · paid {paid.toLocaleString()} · {inv.status}
                  </p>
                </div>
                <button
                  className="text-xs underline"
                  disabled={previewingId === inv.id}
                  onClick={() => handlePreview(inv.id)}
                >
                  {previewingId === inv.id ? "Loading…" : "Preview"}
                </button>
              </div>
            </div>
          );
        })}
        {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
      </div>
    </div>
  );
}

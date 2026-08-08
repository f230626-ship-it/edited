import { listCommissions } from "@/actions/payroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PayrollCommissionsPage() {
  const { rows } = await listCommissions();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commission ledger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(rows as Array<{
          id: string;
          commission_amount: number;
          revenue_amount: number;
          revenue_basis: string;
          commission_percentage: number;
          status: string;
          currency: string;
          notes: string | null;
          employee?: { full_name: string } | null;
          project?: { name: string } | null;
          rule?: { name: string } | null;
        }>).map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold">
                {r.employee?.full_name || "—"} · {r.project?.name || "Project"}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.rule?.name || "Rule"} · {r.revenue_basis} {r.currency}{" "}
                {Number(r.revenue_amount).toLocaleString()} × {r.commission_percentage}%
                {r.notes ? ` · ${r.notes}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">
                {r.currency} {Number(r.commission_amount).toLocaleString()}
              </span>
              <Badge variant="secondary">{r.status}</Badge>
            </div>
          </div>
        ))}
        {(!rows || rows.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No ledger entries yet. Run a payroll calculation to generate commissions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

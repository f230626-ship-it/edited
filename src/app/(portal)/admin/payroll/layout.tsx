import { requirePayrollAccess } from "@/lib/payroll/auth";
import { PayrollNav } from "@/components/payroll/payroll-nav";

export default async function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePayrollAccess();
  return (
    <div className="space-y-2">
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Payroll</h1>
        <p className="text-sm text-muted-foreground">
          Deterministic salary & commission runs with human approval before emails.
        </p>
      </div>
      <PayrollNav />
      {children}
    </div>
  );
}

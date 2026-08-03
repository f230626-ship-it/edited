import { createAdminClient } from "@/lib/supabase/admin";
import { requireSalesOwner } from "@/lib/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteProfileButton } from "@/components/sales/delete-profile-button";

export default async function AdminProfilesPage() {
  await requireSalesOwner();
  const supabase = createAdminClient();

  // Avoid ambiguous embed: sales_profiles has employee_id + created_by FKs to employees
  const { data: profiles } = await supabase
    .from("sales_profiles")
    .select("*")
    .order("name");

  const handlerIds = Array.from(
    new Set((profiles || []).map((p) => p.employee_id).filter(Boolean))
  ) as string[];
  const handlerNames = new Map<string, string>();
  if (handlerIds.length > 0) {
    const { data: handlers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", handlerIds);
    for (const h of handlers || []) handlerNames.set(h.id, h.full_name);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Outreach profiles</h2>
          <p className="text-sm text-muted-foreground">Map each LinkedIn/email account to a rep</p>
        </div>
        <Link href="/sales/admin/profiles/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />
          Add profile
        </Link>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">All profiles ({profiles?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!profiles?.length ? (
            <div className="py-12 text-center">
              <Link2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No profiles yet. Create your first outreach profile.</p>
              <Link href="/sales/admin/profiles/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
                Add profile
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table style={{ tableLayout: 'fixed' }}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[22%]">Profile</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[20%]">Rep</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[13%]">Platform</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[22%]">Sheet</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[13%]">Status</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[10%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id} className="border-b border-border/30">
                      <TableCell className="py-2.5 px-3 font-medium truncate">{p.name}</TableCell>
                      <TableCell className="py-2.5 px-3 text-sm truncate">
                        {p.employee_id && handlerNames.get(p.employee_id) ? (
                          handlerNames.get(p.employee_id)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 capitalize text-sm">{p.platform}</TableCell>
                      <TableCell className="py-2.5 px-3 truncate font-mono text-xs text-muted-foreground">
                        {p.google_sheet_id ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <Badge variant={p.is_active ? "default" : "outline"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/sales/admin/profiles/${p.id}`}
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <DeleteProfileButton profileId={p.id} profileName={p.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

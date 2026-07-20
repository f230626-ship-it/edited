"use client";

import { useState } from "react";
import { createSalesLead, updateLeadStatus, deleteSalesLead } from "@/actions/sales-leads";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { SalesLead, LeadStatus } from "@/types/database";

const STATUS_COLORS: Record<LeadStatus, string> = {
  cold: "bg-slate-500/15 text-slate-600",
  contacted: "bg-blue-500/15 text-blue-600",
  replied: "bg-amber-500/15 text-amber-600",
  interested: "bg-emerald-500/15 text-emerald-600",
  meeting_booked: "bg-violet-500/15 text-violet-600",
  closed: "bg-green-500/15 text-green-600",
  lost: "bg-red-500/15 text-red-600",
};

const STATUS_FLOW: LeadStatus[] = ["cold", "contacted", "replied", "interested", "meeting_booked", "closed"];

export function SalesLeadsClient({
  leads: initialLeads,
  error,
}: {
  leads: SalesLead[];
  error: string | null;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [newLead, setNewLead] = useState({
    lead_name: "",
    company_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    source: "manual",
    notes: "",
  });

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.lead_name.toLowerCase().includes(search.toLowerCase()) || l.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLead.lead_name.trim()) {
      toast.error("Lead name is required");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    Object.entries(newLead).forEach(([k, v]) => formData.set(k, v));
    const result = await createSalesLead(formData);
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Lead created");
      setCreateOpen(false);
      setNewLead({ lead_name: "", company_name: "", email: "", phone: "", linkedin_url: "", source: "manual", notes: "" });
      window.location.reload();
    }
  }

  async function handleAdvanceStatus(leadId: string, currentStatus: LeadStatus) {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[idx + 1];
    const result = await updateLeadStatus(leadId, nextStatus);
    if (result.error) toast.error(result.error);
    else {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: nextStatus } : l));
      toast.success(`Lead moved to ${nextStatus.replace("_", " ")}`);
    }
  }

  async function handleDelete(leadId: string) {
    const result = await deleteSalesLead(leadId);
    if (result.error) toast.error(result.error);
    else {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast.success("Lead deleted");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Sales Leads</h2>
          <p className="text-sm text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!pl-10 sm:!pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["", ...STATUS_FLOW] as const).map((s) => (
            <Button
              key={s || "all"}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s as LeadStatus | "")}
              className="capitalize text-xs"
            >
              {s ? s.replace("_", " ") : "All"}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="border-border/60 bg-card/70">
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Plus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No leads found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table style={{ tableLayout: 'fixed' }}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[22%]">Lead</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[20%]">Company</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[14%]">Status</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[12%]">Source</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[18%]">Assigned to</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-2.5 px-3 w-[14%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id} className="border-b border-border/30">
                      <TableCell className="py-2.5 px-3 font-medium truncate">{lead.lead_name}</TableCell>
                      <TableCell className="py-2.5 px-3 text-muted-foreground text-sm truncate">{lead.company_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="py-2.5 px-3">
                        <Badge className={`capitalize ${STATUS_COLORS[lead.status]}`}>
                          {lead.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 capitalize text-muted-foreground text-sm">{lead.source}</TableCell>
                      <TableCell className="py-2.5 px-3 text-muted-foreground text-sm truncate">
                        {lead.employee?.full_name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {STATUS_FLOW.indexOf(lead.status) < STATUS_FLOW.length - 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdvanceStatus(lead.id, lead.status)}
                              className="gap-1 text-xs"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              Advance
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(lead.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Pipeline Summary */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">Pipeline Summary</CardTitle>
          <CardDescription>Lead distribution by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
            {STATUS_FLOW.map((status) => {
              const count = leads.filter((l) => l.status === status).length;
              const pctVal = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
              return (
                <div key={status} className="rounded-xl border border-border/60 p-3 text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs capitalize text-muted-foreground">{status.replace("_", " ")}</p>
                  <p className="text-xs font-semibold text-primary">{pctVal}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Sales Lead</DialogTitle>
            <DialogDescription>Track a new prospect through the pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lead name *</Label>
                <Input
                  value={newLead.lead_name}
                  onChange={(e) => setNewLead((l) => ({ ...l, lead_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={newLead.company_name}
                  onChange={(e) => setNewLead((l) => ({ ...l, company_name: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead((l) => ({ ...l, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newLead.phone}
                  onChange={(e) => setNewLead((l) => ({ ...l, phone: e.target.value }))}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input
                  value={newLead.linkedin_url}
                  onChange={(e) => setNewLead((l) => ({ ...l, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={newLead.source}
                  onChange={(e) => setNewLead((l) => ({ ...l, source: e.target.value }))}
                  placeholder="linkedin, referral, etc."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newLead.notes}
                onChange={(e) => setNewLead((l) => ({ ...l, notes: e.target.value }))}
                placeholder="Any additional context..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add lead"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

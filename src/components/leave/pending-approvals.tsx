"use client";

import { reviewLeave } from "@/actions/leaves";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LEAVE_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/date";
import { toast } from "sonner";
import { Check, X, Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

interface PendingLeave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  employee?: {
    full_name: string;
    designation: string;
    employee_code: string | null;
  };
}

export function PendingLeaveApprovals({ leaves }: { leaves: PendingLeave[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingLeave | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  if (leaves.length === 0) return null;

  async function handleApprove(leaveId: string) {
    setLoadingId(leaveId);
    const result = await reviewLeave(leaveId, "approved");
    setLoadingId(null);
    if (result.error) toast.error(result.error);
    else toast.success("Leave approved successfully");
  }

  async function handleReject() {
    if (!rejectTarget) return;
    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      toast.error("A rejection reason is required.");
      return;
    }
    setRejectLoading(true);
    const result = await reviewLeave(rejectTarget.id, "rejected", trimmed);
    setRejectLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Leave request rejected");
      setRejectTarget(null);
      setRejectionReason("");
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Pending Approvals</h3>
          <Badge variant="secondary">{leaves.length}</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 pl-4 pr-3 whitespace-nowrap">Employee</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-3 whitespace-nowrap">Type</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-3 whitespace-nowrap">Dates</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-3 text-right whitespace-nowrap">Days</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-3">Reason</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 pl-3 pr-4 whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id} className="border-b border-border/30 align-top">
                  <TableCell className="py-3 pl-4 pr-3">
                    <p className="font-medium text-sm whitespace-nowrap">{leave.employee?.full_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {leave.employee?.employee_code ?? leave.employee?.designation}
                    </p>
                  </TableCell>
                  <TableCell className="py-3 px-3 text-sm whitespace-nowrap">
                    {LEAVE_TYPE_LABELS[leave.leave_type]}
                  </TableCell>
                  <TableCell className="py-3 px-3 text-sm whitespace-nowrap">
                    {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
                  </TableCell>
                  <TableCell className="py-3 px-3 text-right tabular-nums font-semibold">
                    {leave.days_count}
                  </TableCell>
                  <TableCell className="py-3 px-3 text-sm">
                    {leave.reason ? (
                      <p className="text-foreground/80 leading-relaxed break-words min-w-[180px] max-w-[320px]">
                        {leave.reason}
                      </p>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 pr-4 pl-2 overflow-hidden">
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/70 transition-colors"
                        disabled={loadingId === leave.id}
                        onClick={() => handleApprove(leave.id)}
                        title="Approve leave"
                      >
                        {loadingId === leave.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 hover:border-rose-500/70 transition-colors"
                        disabled={loadingId === leave.id}
                        onClick={() => { setRejectTarget(leave); setRejectionReason(""); }}
                        title="Reject leave"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>


      {/* Rejection reason dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(v) => { if (!v) { setRejectTarget(null); setRejectionReason(""); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Reject Leave Request</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rejectTarget?.employee?.full_name} — {rejectTarget && LEAVE_TYPE_LABELS[rejectTarget.leave_type]} Leave
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 pt-1">
            <Label htmlFor="pending-rejection-reason" className="text-sm font-medium">
              Reason for Rejection <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="pending-rejection-reason"
              placeholder="e.g. Critical project deadline this week, please reschedule for next month..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              This reason will be visible to the employee in their leave history.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRejectTarget(null); setRejectionReason(""); }}
              disabled={rejectLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectLoading || !rejectionReason.trim()}
              className="gap-1.5"
            >
              {rejectLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/date";
import { cancelLeave } from "@/actions/leaves";
import { toast } from "sonner";
import { Trash2, Calendar, Clock, CheckCircle2 } from "lucide-react";

interface LeaveRecord {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
  reason?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

type TabType = "upcoming" | "past" | "all";

export function LeaveHistoryTable({ leaves }: { leaves: LeaveRecord[] }) {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const upcomingLeaves = leaves.filter((l) => l.end_date >= todayStr || l.start_date >= todayStr);
  const pastLeaves = leaves.filter((l) => l.end_date < todayStr);

  const displayedLeaves =
    activeTab === "upcoming"
      ? upcomingLeaves
      : activeTab === "past"
      ? pastLeaves
      : leaves;

  async function handleCancel(leaveId: string) {
    if (!confirm("Are you sure you want to cancel this pending leave request?")) return;
    setCancellingId(leaveId);
    const result = await cancelLeave(leaveId);
    setCancellingId(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Leave request cancelled successfully.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Upcoming / Past / All */}
      <div className="flex items-center gap-2 border-b border-border/30 pb-3">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-violet-400" />
          <span>Upcoming & Future ({upcomingLeaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("past")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "past"
              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Past Leaves History ({pastLeaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>All ({leaves.length})</span>
        </button>
      </div>

      {displayedLeaves.length === 0 ? (
        <p className="text-xs sm:text-sm text-muted-foreground py-8 text-center">
          No {activeTab === "upcoming" ? "upcoming or planned" : activeTab === "past" ? "past" : ""} leave requests found.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 pl-2 sm:pl-4 pr-2">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 px-2">
                  From
                </TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 px-2">
                  To
                </TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 px-2 text-right">
                  Days
                </TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 px-2">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 px-2">
                  Reason / Notes
                </TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 pr-2 sm:pr-4 pl-2 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedLeaves.map((leave) => {
                const isUpcoming = leave.end_date >= todayStr || leave.start_date >= todayStr;
                return (
                  <TableRow key={leave.id} className="border-b border-border/30 hover:bg-card/40 transition-colors">
                    <TableCell className="py-3 pl-2 sm:pl-4 pr-2 text-xs sm:text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        {LEAVE_TYPE_LABELS[leave.leave_type]}
                        {isUpcoming && (
                          <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                            Upcoming
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-xs sm:text-sm">
                      {formatDate(leave.start_date)}
                    </TableCell>
                    <TableCell className="py-3 px-2 text-xs sm:text-sm">
                      {formatDate(leave.end_date)}
                    </TableCell>
                    <TableCell className="py-3 px-2 text-right tabular-nums font-bold text-xs sm:text-sm">
                      {leave.days_count}d
                    </TableCell>
                    <TableCell className="py-3 px-2">
                      <Badge className={STATUS_COLORS[leave.status]} variant="secondary">
                        {LEAVE_STATUS_LABELS[leave.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-xs sm:text-sm max-w-[240px]">
                      {leave.status === "rejected" && leave.rejection_reason ? (
                        <p className="text-destructive text-[11px] leading-relaxed break-words">
                          {leave.rejection_reason}
                        </p>
                      ) : (
                        <p className="text-muted-foreground truncate text-xs">{leave.reason || "—"}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-3 pr-2 sm:pr-4 pl-2 text-right">
                      {leave.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(leave.id)}
                          disabled={cancellingId === leave.id}
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

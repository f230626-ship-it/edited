"use client";

import { Badge } from "@/components/ui/badge";
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

export function LeaveHistoryTable({ leaves }: { leaves: LeaveRecord[] }) {
  if (leaves.length === 0) {
    return <p className="text-xs sm:text-sm text-muted-foreground">No leave requests yet</p>;
  }

  return (
    <>
      <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
                Rejection Reason
              </TableHead>
              <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-3 pr-2 sm:pr-4 pl-2">
                Applied
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.map((leave) => (
              <TableRow key={leave.id} className="border-b border-border/30">
                <TableCell className="py-2 sm:py-3 pl-2 sm:pl-4 pr-2 text-xs sm:text-sm">
                  {LEAVE_TYPE_LABELS[leave.leave_type]}
                </TableCell>
                <TableCell className="py-2 sm:py-3 px-2 text-xs sm:text-sm">
                  {formatDate(leave.start_date)}
                </TableCell>
                <TableCell className="py-2 sm:py-3 px-2 text-xs sm:text-sm">
                  {formatDate(leave.end_date)}
                </TableCell>
                <TableCell className="py-2 sm:py-3 px-2 text-right tabular-nums font-semibold text-xs sm:text-sm">
                  {leave.days_count}
                </TableCell>
                <TableCell className="py-2 sm:py-3 px-2">
                  <Badge className={STATUS_COLORS[leave.status]} variant="secondary">
                    {LEAVE_STATUS_LABELS[leave.status]}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 sm:py-3 px-2 text-xs sm:text-sm max-w-[280px]">
                  {leave.status === "rejected" && leave.rejection_reason ? (
                    <p className="text-destructive text-[10px] sm:text-xs leading-relaxed break-words">
                      {leave.rejection_reason}
                    </p>
                  ) : (
                    <span className="text-muted-foreground/50 text-[10px] sm:text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="py-2 sm:py-3 pr-2 sm:pr-4 pl-2 text-xs sm:text-sm text-muted-foreground">
                  {formatDate(leave.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

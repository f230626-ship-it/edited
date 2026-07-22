"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Plus
} from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { LeaveForm } from "@/components/leave/leave-form";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from "@/lib/constants";

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
  description?: string | null;
}

export interface LeaveRecord {
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

interface HolidayPlannerProps {
  holidays: HolidayItem[];
  leaves: LeaveRecord[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HolidayPlanner({ holidays, leaves }: HolidayPlannerProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    dateStr: string;
    holiday?: HolidayItem;
    leave?: LeaveRecord;
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayDetails(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayDetails(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDayDetails(null);
  };

  // Generate calendar grid
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const totalDaysPrev = new Date(year, month, 0).getDate();

  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, totalDaysPrev - i);
    cells.push({
      dateStr: prevDate.toISOString().split("T")[0],
      dayNum: totalDaysPrev - i,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const currDate = new Date(year, month, i);
    cells.push({
      dateStr: currDate.toISOString().split("T")[0],
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Next month padding to round up to full weeks
  const totalCells = Math.ceil(cells.length / 7) * 7;
  const nextMonthPadding = totalCells - cells.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    const nextDate = new Date(year, month + 1, i);
    cells.push({
      dateStr: nextDate.toISOString().split("T")[0],
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  // Check if date is in selection range
  const isSelected = (dateStr: string) => {
    if (rangeStart === dateStr || rangeEnd === dateStr) return true;
    if (rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd) return true;
    if (rangeStart && !rangeEnd && hoverDate && dateStr > rangeStart && dateStr <= hoverDate) return true;
    return false;
  };

  const handleDateClick = (dateStr: string, holiday?: HolidayItem, leave?: LeaveRecord) => {
    if (holiday || leave) {
      setSelectedDayDetails({ dateStr, holiday, leave });
    } else {
      setSelectedDayDetails(null);
    }

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd(null);
    } else {
      if (dateStr < rangeStart) {
        setRangeStart(dateStr);
      } else {
        setRangeEnd(dateStr);
      }
    }
  };

  const handleClearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setHoverDate(null);
  };

  // Find holidays and leaves in current month
  const monthHolidays = holidays.filter((h) => {
    const hDate = new Date(h.date);
    return hDate.getFullYear() === year && hDate.getMonth() === month;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      {/* Calendar Grid Section */}
      <Card className="xl:col-span-3 glass-card-glow-violet border-none overflow-hidden transition-all duration-300">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/30 pb-3 pt-4 px-4">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground">
              Company Holiday & Vacation Planner
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToday}
              className="text-[11px] h-7 px-2.5 font-semibold border-border/40 hover:bg-muted/40 cursor-pointer"
            >
              Today
            </Button>
            <div className="flex items-center border border-border/40 rounded-lg overflow-hidden h-7">
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevMonth}
                className="h-7 w-7 rounded-none hover:bg-muted/40 border-r border-border/40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2.5 text-[11px] font-bold text-foreground min-w-[80px] text-center">
                {MONTHS[month]} {year}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNextMonth}
                className="h-7 w-7 rounded-none hover:bg-muted/40 border-l border-border/40 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center text-[11px] font-semibold text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map(({ dateStr, dayNum, isCurrentMonth }) => {
              const dayHoliday = holidays.find((h) => h.date === dateStr);
              const dayLeaves = leaves.filter((l) => dateStr >= l.start_date && dateStr <= l.end_date);
              const activeLeave = dayLeaves[0]; // pick first matching leave if any
              const isWknd = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
              const rangeSelected = isSelected(dateStr);
              const isStart = rangeStart === dateStr;
              const isEnd = rangeEnd === dateStr;

              let cellStyle = "border-border/30 hover:border-violet-500/40 bg-card/10";
              if (!isCurrentMonth) {
                cellStyle = "opacity-30 border-transparent bg-transparent pointer-events-none";
              } else if (isWknd) {
                cellStyle = "border-border/20 bg-muted/5 text-muted-foreground/80";
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => isCurrentMonth && handleDateClick(dateStr, dayHoliday, activeLeave)}
                  onMouseEnter={() => isCurrentMonth && rangeStart && !rangeEnd && setHoverDate(dateStr)}
                  className={`group relative rounded-lg border min-h-[42px] sm:min-h-[56px] p-1 sm:p-1.5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${cellStyle} ${
                    rangeSelected
                      ? "bg-violet-500/10 border-violet-500/60 ring-1 ring-violet-500/30"
                      : ""
                  } ${isStart ? "bg-violet-500/20 border-violet-500" : ""} ${
                    isEnd ? "bg-violet-500/20 border-violet-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold ${
                        isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                      } ${isStart || isEnd ? "text-violet-400 scale-105" : ""}`}
                    >
                      {dayNum}
                    </span>
                    {dayHoliday && (
                      <span className="h-1 w-1 rounded-full bg-violet-400" />
                    )}
                  </div>

                  {/* Badges/Indicators */}
                  <div className="space-y-0.5 mt-0.5">
                    {dayHoliday && isCurrentMonth && (
                      <div className="hidden sm:block text-[8px] font-semibold text-violet-400 bg-violet-500/15 border border-violet-500/20 rounded px-0.5 py-0.5 truncate max-w-full">
                        {dayHoliday.name}
                      </div>
                    )}
                    {activeLeave && isCurrentMonth && (
                      <div
                        className={`hidden sm:block text-[8px] font-semibold rounded px-0.5 py-0.5 truncate max-w-full border ${
                          activeLeave.status === "approved"
                            ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/20"
                            : activeLeave.status === "rejected"
                            ? "text-rose-400 bg-rose-500/15 border-rose-500/20"
                            : "text-amber-400 bg-amber-500/15 border-amber-500/20"
                        }`}
                      >
                        {LEAVE_TYPE_LABELS[activeLeave.leave_type] || "Leave"}
                      </div>
                    )}

                    {/* Small dot indicators for mobile */}
                    <div className="flex sm:hidden gap-0.5 justify-end">
                      {dayHoliday && <div className="h-0.5 w-0.5 rounded-full bg-violet-400" />}
                      {activeLeave && (
                        <div
                          className={`h-0.5 w-0.5 rounded-full ${
                            activeLeave.status === "approved"
                              ? "bg-emerald-400"
                              : activeLeave.status === "rejected"
                              ? "bg-rose-400"
                              : "bg-amber-400"
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info / Action Sidebar */}
      <div className="flex flex-col gap-4">
        {/* Selection Details Panel */}
        <Card className="glass-card-glow-violet border-none flex-1 flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="border-b border-border/30 pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-violet-400" />
                Planner Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {rangeStart ? (
                <div className="space-y-2">
                  <div className="bg-violet-500/5 border border-violet-500/15 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase font-bold text-violet-400 tracking-wider">
                        Selected Range
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleClearSelection}
                        className="h-4 w-4 hover:bg-violet-500/20 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-[11px] font-semibold text-foreground">
                      {formatDate(rangeStart)}
                      {rangeEnd && rangeEnd !== rangeStart && ` - ${formatDate(rangeEnd)}`}
                    </div>
                    {rangeEnd && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        Duration:{" "}
                        {Math.ceil(
                          (new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1}{" "}
                        days
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => setFormOpen(true)}
                    className="w-full text-[11px] h-8 font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 cursor-pointer flex items-center justify-center gap-1 py-2 rounded-lg"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Apply for These Dates</span>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 border border-dashed border-border/40 rounded-lg">
                  <CalendarDays className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-foreground">Select Dates Directly</p>
                  <p className="text-[9px] text-muted-foreground max-w-[150px] mx-auto mt-0.5 leading-relaxed">
                    Click dates on the calendar to select a range.
                  </p>
                </div>
              )}

              {/* Day details or Legend */}
              {selectedDayDetails ? (
                <div className="bg-card/30 border border-border/40 rounded-lg p-2.5 space-y-2 transition-all duration-300">
                  <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Details for {formatDate(selectedDayDetails.dateStr)}
                    </span>
                  </div>

                  {selectedDayDetails.holiday && (
                    <div className="space-y-0.5">
                      <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/20 text-[8px] font-bold py-0 h-4">
                        Company Holiday
                      </Badge>
                      <h4 className="text-[11px] font-bold text-foreground mt-0.5">
                        {selectedDayDetails.holiday.name}
                      </h4>
                      {selectedDayDetails.holiday.description && (
                        <p className="text-[9px] text-muted-foreground/80 leading-normal">
                          {selectedDayDetails.holiday.description}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedDayDetails.leave && (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Badge
                          className={`text-[8px] font-bold py-0 h-4 ${
                            selectedDayDetails.leave.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : selectedDayDetails.leave.status === "rejected"
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {LEAVE_STATUS_LABELS[selectedDayDetails.leave.status]}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          {LEAVE_TYPE_LABELS[selectedDayDetails.leave.leave_type]} Leave
                        </span>
                      </div>
                      {selectedDayDetails.leave.reason && (
                        <p className="text-[9px] text-muted-foreground/80 leading-normal italic bg-muted/10 p-1.5 rounded border border-border/10">
                          &ldquo;{selectedDayDetails.leave.reason}&rdquo;
                        </p>
                      )}
                      {selectedDayDetails.leave.status === "rejected" && selectedDayDetails.leave.rejection_reason && (
                        <div className="text-[9px] text-rose-400 leading-normal">
                          <span className="font-bold">Rejection note:</span> {selectedDayDetails.leave.rejection_reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                    Legend
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span>Company Holiday</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Approved Leave</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>Pending Approval</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span>Rejected Leave</span>
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          <div className="border-t border-border/30 p-2.5 bg-violet-500/5">
            <div className="text-[9px] font-semibold text-violet-400 flex items-center gap-1">
              <span>Guidelines</span>
            </div>
            <p className="text-[9px] text-muted-foreground/80 mt-0.5 leading-normal">
              Select range directly on the calendar to request leaves. Hover over active markers to view details.
            </p>
          </div>
        </Card>

        {/* Holidays List in Current Month */}
        <Card className="glass-card-glow-violet border-none">
          <CardHeader className="border-b border-border/30 pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
              Month Holidays ({monthHolidays.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {monthHolidays.length > 0 ? (
              monthHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  onClick={() => setSelectedDayDetails({ dateStr: holiday.date, holiday })}
                  className="flex items-center justify-between p-1.5 rounded-lg border border-border/30 bg-card/20 hover:border-violet-500/40 hover:bg-card/50 transition-all duration-200 cursor-pointer"
                >
                  <div className="truncate pr-1.5">
                    <div className="text-[11px] font-bold text-foreground truncate">
                      {holiday.name}
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      {formatDate(holiday.date)}
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-[9px] text-muted-foreground text-center py-2">
                No holidays in {MONTHS[month]}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <LeaveForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialStartDate={rangeStart || undefined}
        initialEndDate={rangeEnd || rangeStart || undefined}
      />
    </div>
  );
}

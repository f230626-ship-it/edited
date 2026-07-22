"use client";

import { useState, useEffect } from "react";
import { applyLeave } from "@/actions/leaves";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { LEAVE_TYPE_LABELS } from "@/lib/constants";
import type { LeaveType } from "@/types/database";

interface LeaveFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialStartDate?: string;
  initialEndDate?: string;
  buttonText?: string;
}

export function LeaveForm({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  initialStartDate,
  initialEndDate,
  buttonText = "Apply for Leave",
}: LeaveFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState(initialStartDate || "");
  const [endDate, setEndDate] = useState(initialEndDate || "");

  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;

  const handleOpenChange = (openState: boolean) => {
    if (isControlled && externalOnOpenChange) {
      externalOnOpenChange(openState);
    } else {
      setInternalOpen(openState);
    }
  };

  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate);
    if (initialEndDate) setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("leave_type", leaveType);
    const result = await applyLeave(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Leave request submitted");
      handleOpenChange(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />
          {buttonText}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={(v) => v && setLeaveType(v as LeaveType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              required
              placeholder="Briefly explain why you are requesting this leave..."
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">Required. Your manager will see this when reviewing your request.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Leave Request"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

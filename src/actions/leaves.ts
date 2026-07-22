"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee, requireRole } from "@/lib/auth";
import { calculateLeaveDays } from "@/lib/utils/date";
import { revalidatePath } from "next/cache";
import type { LeaveType } from "@/types/database";

export async function applyLeave(formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) return { error: "Not authenticated" };

  if (!employee.lead_id) {
    return { error: "No lead assigned. Contact admin to set your lead before applying for leave." };
  }

  const leaveType = formData.get("leave_type") as LeaveType;
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;
  const reason = (formData.get("reason") as string)?.trim();

  if (!startDate || !endDate) {
    return { error: "Please select both start and end dates." };
  }

  if (new Date(endDate) < new Date(startDate)) {
    return { error: "End date cannot be earlier than start date." };
  }

  if (!reason) {
    return { error: "Please provide a reason for your leave request." };
  }

  const supabase = createAdminClient();

  // 1. Check for overlapping existing leave requests (pending or approved)
  const { data: overlapping } = await supabase
    .from("leaves")
    .select("id, start_date, end_date, status")
    .eq("employee_id", employee.id)
    .in("status", ["pending", "approved"])
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  if (overlapping && overlapping.length > 0) {
    return { error: "You already have a pending or approved leave request for overlapping dates." };
  }

  // 2. Calculate working days excluding holidays & weekends
  const { data: holidays } = await supabase.from("holidays").select("date");
  const holidayDates = holidays?.map((h) => h.date) ?? [];
  const daysCount = calculateLeaveDays(startDate, endDate, holidayDates);

  if (daysCount <= 0) {
    return { error: "The selected dates fall entirely on weekends or official company holidays. No leave days deducted." };
  }

  // 3. Check Leave Quota Balance
  const { data: balance } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", employee.id)
    .maybeSingle();

  if (balance) {
    let quotaKey: "annual_quota" | "sick_quota" | "casual_quota" = "annual_quota";
    let usedKey: "annual_used" | "sick_used" | "casual_used" = "annual_used";

    if (leaveType === "sick") {
      quotaKey = "sick_quota";
      usedKey = "sick_used";
    } else if (leaveType === "casual") {
      quotaKey = "casual_quota";
      usedKey = "casual_used";
    }

    const quota = balance[quotaKey] ?? 0;
    const used = balance[usedKey] ?? 0;
    const remaining = quota - used;

    if (daysCount > remaining) {
      return {
        error: `Insufficient ${leaveType} leave balance. You requested ${daysCount} day(s), but only have ${remaining} day(s) remaining.`,
      };
    }
  }

  const { error } = await supabase.from("leaves").insert({
    employee_id: employee.id,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason,
    days_count: daysCount,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  revalidatePath("/admin/leaves");
  return { success: true };
}

export async function cancelLeave(leaveId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  const { data: leave } = await supabase
    .from("leaves")
    .select("*")
    .eq("id", leaveId)
    .single();

  if (!leave) return { error: "Leave request not found." };

  if (leave.employee_id !== employee.id && employee.role !== "admin") {
    return { error: "Unauthorized to cancel this request." };
  }

  if (leave.status !== "pending") {
    return { error: "Only pending leave requests can be cancelled." };
  }

  const { error } = await supabase
    .from("leaves")
    .delete()
    .eq("id", leaveId);

  if (error) return { error: error.message };

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  revalidatePath("/admin/leaves");
  return { success: true };
}

export async function reviewLeave(
  leaveId: string,
  status: "approved" | "rejected",
  rejectionReason?: string
) {
  const reviewer = await getCurrentEmployee();
  if (!reviewer) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  const { data: leave } = await supabase
    .from("leaves")
    .select("*, employee:employees!leaves_employee_id_fkey(id, full_name, lead_id, manager_id)")
    .eq("id", leaveId)
    .single();

  if (!leave) return { error: "Leave request not found" };

  const emp = leave.employee as { id: string; lead_id: string | null };
  const canApprove =
    reviewer.role === "admin" ||
    emp.lead_id === reviewer.id;

  if (!canApprove) return { error: "You are not authorized to approve this leave" };

  if (status === "rejected" && !rejectionReason?.trim()) {
    return { error: "A rejection reason is required when rejecting a leave request." };
  }

  const { error } = await supabase
    .from("leaves")
    .update({
      status,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason ?? null,
    })
    .eq("id", leaveId);

  if (error) return { error: error.message };

  if (leave.employee_id) {
    await supabase.from("notifications").insert({
      recipient_id: leave.employee_id,
      type: "leave_review",
      title: `Leave ${status}`,
      message: `Your leave request has been ${status}`,
      entity_type: "leave",
      entity_id: leaveId,
    });
  }

  revalidatePath("/admin/leaves");
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getPendingLeavesForLead() {
  const employee = await getCurrentEmployee();
  if (!employee) return [];

  const supabase = createAdminClient();

  const { data: team } = await supabase
    .from("employees")
    .select("id")
    .eq("lead_id", employee.id);

  const teamIds = team?.map((t) => t.id) ?? [];
  if (teamIds.length === 0) return [];

  const { data } = await supabase
    .from("leaves")
      .select("*, employee:employees!leaves_employee_id_fkey(id, full_name, email, designation, employee_code)")
    .in("employee_id", teamIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function updateGlobalLeaveQuota(
  quotas: { annual_quota?: number; sick_quota?: number; casual_quota?: number }
) {
  await requireRole("admin");
  const supabase = createAdminClient();

  const updates: Record<string, number> = {};
  if (quotas.annual_quota !== undefined) updates.annual_quota = quotas.annual_quota;
  if (quotas.sick_quota !== undefined) updates.sick_quota = quotas.sick_quota;
  if (quotas.casual_quota !== undefined) updates.casual_quota = quotas.casual_quota;

  if (Object.keys(updates).length === 0) {
    return { error: "No changes provided." };
  }

  const { error } = await supabase
    .from("leave_balances")
    .update(updates)
    .neq("employee_id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("Error updating global leave quota:", error);
    return { error: error.message };
  }

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  revalidatePath("/admin/leaves");
  return { success: true };
}

export async function getAllLeaveBalances() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leave_balances")
    .select(`
      *,
      employee:employees!leave_balances_employee_id_fkey(id, full_name, email, employee_code, designation, status)
    `)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

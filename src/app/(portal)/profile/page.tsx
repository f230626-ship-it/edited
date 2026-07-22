import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfilePhotoUpload } from "@/components/profile/profile-photo-upload";
import { ProfileForm } from "@/components/profile/profile-form";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils/date";
import {
  Building2,
  Briefcase,
  Calendar,
  Fingerprint,
  UsersRound,
  User,
  GitBranch,
  CheckCircle2,
  UserCircle2,
  MapPin,
} from "lucide-react";

export default async function ProfilePage() {
  const employee = await requireAuth();
  const supabase = createAdminClient();

  // Fetch manager name if present
  let managerName: string | null = null;
  if (employee.manager_id) {
    const { data: mgr } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", employee.manager_id)
      .maybeSingle();
    managerName = mgr?.full_name ?? null;
  }

  // Fetch lead name if present and different from manager
  let leadName: string | null = null;
  if (employee.lead_id && employee.lead_id !== employee.manager_id) {
    const { data: ld } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", employee.lead_id)
      .maybeSingle();
    leadName = ld?.full_name ?? null;
  }

  // Fetch direct report count (team size)
  const { count: teamCount } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", employee.id)
    .eq("status", "active");

  const initials = employee.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">

      {/* ── Premium Hero Header ── */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <UserCircle2 className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">My Profile</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  {employee.designation}
                  {employee.department?.name && ` · ${employee.department.name}`}
                  {employee.employee_code && ` · #${employee.employee_code}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground shrink-0">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Joined {formatDate(employee.joining_date)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Avatar + Name + Badges ── */}
      <div className="relative rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
        {/* Banner with a modern gradient */}
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        </div>
        
        <div className="px-6 pb-6 -mt-16 flex flex-col sm:flex-row sm:items-end gap-5 relative z-10">
          <div className="relative shrink-0 self-center sm:self-auto">
            <div className="rounded-2xl border-[5px] border-card bg-card shadow-lg overflow-hidden">
              <ProfilePhotoUpload
                employeeId={employee.id}
                fullName={employee.full_name}
                currentUrl={employee.profile_photo_url}
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-0 pb-1 text-center sm:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{employee.full_name}</h2>
            <p className="text-base font-medium text-muted-foreground mt-0.5">{employee.designation}</p>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start items-center gap-2">
              <Badge className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase", statusColors[employee.status])}>
                {EMPLOYEE_STATUS_LABELS[employee.status]}
              </Badge>
              <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border-border/60">
                {EMPLOYMENT_TYPE_LABELS[employee.employment_type]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Org Info Card Grid ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {/* Employee ID */}
        <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
          <Fingerprint className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Employee ID</p>
            <p className="text-sm font-bold font-mono tracking-wide text-foreground">{employee.employee_code ?? "—"}</p>
          </div>
        </div>

        {/* Department */}
        <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
          <Building2 className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Department</p>
            <p className="text-sm font-semibold text-foreground truncate">{employee.department?.name ?? "—"}</p>
          </div>
        </div>

        {/* Role / Position */}
        <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
          <Briefcase className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Position</p>
            <p className="text-sm font-semibold text-foreground truncate">{employee.designation}</p>
          </div>
        </div>

        {/* Employment Status */}
        <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
          <CheckCircle2 className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Status</p>
            <p className="text-sm font-semibold text-foreground truncate">{EMPLOYEE_STATUS_LABELS[employee.status]}</p>
          </div>
        </div>

        {/* Join Date */}
        <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
          <Calendar className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Join Date</p>
            <p className="text-sm font-semibold text-foreground">{formatDate(employee.joining_date)}</p>
          </div>
        </div>

        {/* Manager */}
        {managerName && (
          <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
            <User className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Manager</p>
              <p className="text-sm font-semibold text-foreground truncate">{managerName}</p>
            </div>
          </div>
        )}

        {/* Lead */}
        {leadName && (
          <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
            <GitBranch className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Team Lead</p>
              <p className="text-sm font-semibold text-foreground truncate">{leadName}</p>
            </div>
          </div>
        )}

        {/* Team Size (if manager) */}
        {(teamCount ?? 0) > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-xs flex items-center gap-4 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md transition-all duration-300">
            <UsersRound className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75 mb-0.5">Direct Reports</p>
              <p className="text-sm font-bold text-foreground">{teamCount} report{(teamCount ?? 0) !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Personal Info Editing ── */}
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Personal Contact Info</h3>
          <p className="text-xs text-muted-foreground/80 mt-1">Update your contact details and emergency information</p>
        </div>
        <ProfileForm employee={employee} />
      </div>
    </div>
  );
}

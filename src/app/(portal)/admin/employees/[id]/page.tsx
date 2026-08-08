import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { EditEmployeeDialog } from '@/components/admin/edit-employee-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  UserCheck,
  Clock,
  Shield,
  Hash,
  Heart,
  UserPlus,
  FileText,
  Cake,
  UserCircle,
  TrendingUp,
  Laptop,
  DollarSign,
  Activity,
  Globe,
  AlertCircle,
  ChevronRight,
  Layers,
  Star,
  Users,
  CheckCircle2,
  Timer,
  Wallet,
  Building,
  IdCard,
  ArrowLeft,
  Banknote,
  GraduationCap,
  Code2,
  Award,
  Crown,
  ShieldCheck,
  Hourglass,
} from 'lucide-react';
import Link from 'next/link';

interface EmployeeDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailsPage({ params }: EmployeeDetailsPageProps) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: employee, error } = await supabase
    .from('employees')
    .select(`*`)
    .eq('id', id)
    .single();

  if (error || !employee) notFound();

  // Fetch related data in parallel
  const [leadResult, managerResult, leaveBalanceResult, assetsResult, recentLeavesResult, managersResult, goalsResult, reviewsResult, departmentsResult] =
    await Promise.all([
      employee.lead_id
        ? supabase.from('employees').select('full_name, designation, email').eq('id', employee.lead_id).single()
        : Promise.resolve({ data: null }),
      employee.manager_id
        ? supabase.from('employees').select('full_name, designation, email').eq('id', employee.manager_id).single()
        : Promise.resolve({ data: null }),
      supabase.from('leave_balances').select('*').eq('employee_id', id).single(),
      supabase
        .from('asset_assignments')
        .select('*, asset:assets(name, asset_type, serial_number, condition)')
        .eq('employee_id', id)
        .is('return_date', null),
      supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('employees').select('id, full_name, employee_code').eq('status', 'active').order('full_name').limit(100),
      supabase.from('performance_goals').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('performance_reviews').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('departments').select('id, name').order('name'),
    ]);

  const leadData = leadResult.data;
  const managerData = managerResult.data;
  const leaveBalance = leaveBalanceResult.data;
  const activeAssets = assetsResult.data ?? [];
  const recentLeaves = recentLeavesResult.data ?? [];
  const managers = managersResult.data ?? [];
  const departments = departmentsResult.data ?? [];
  const goals = goalsResult.data ?? [];
  const reviews = reviewsResult.data ?? [];
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / reviews.filter((r: any) => r.rating != null).length).toFixed(1) : null;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const today = new Date();
  const joiningDate = employee.joining_date ? new Date(employee.joining_date) : null;
  const daysEmployed = joiningDate
    ? Math.floor((today.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const yearsEmployed = Math.floor(daysEmployed / 365);
  const monthsEmployed = Math.floor((daysEmployed % 365) / 30);
  const tenureLabel = daysEmployed < 30 ? 'New' : yearsEmployed > 0 ? `${yearsEmployed}y ${monthsEmployed}m` : `${monthsEmployed}mo`;

  const totalSalary = (employee.basic_salary ?? 0) + (employee.allowances ?? 0);

  const statusMeta: Record<string, { label: string; pill: string; dot: string }> = {
    active:    { label: 'Active',    pill: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25', dot: 'bg-emerald-500' },
    inactive:  { label: 'Inactive',  pill: 'bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/25',           dot: 'bg-rose-500'    },
    suspended: { label: 'Suspended', pill: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25',       dot: 'bg-amber-500'   },
  };

  const empTypeMeta: Record<string, string> = {
    full_time: 'Full-Time',
    intern:    'Intern',
    contract:  'Contract',
  };

  const workLocMeta: Record<string, { label: string; icon: typeof Globe }> = {
    onsite: { label: 'Onsite', icon: Building },
    remote: { label: 'Remote', icon: Globe   },
    hybrid: { label: 'Hybrid', icon: Layers  },
  };

  const roleMeta: Record<string, { label: string; color: string }> = {
    admin:    { label: 'Admin',    color: 'text-red-600 dark:text-red-400 bg-red-500/8 ring-1 ring-red-500/20'       },
    hr:       { label: 'HR',       color: 'text-violet-600 dark:text-violet-400 bg-violet-500/8 ring-1 ring-violet-500/20' },
    developer:{ label: 'Developer',color: 'text-blue-600 dark:text-blue-400 bg-blue-500/8 ring-1 ring-blue-500/20'   },
    employee: { label: 'Employee', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/8 ring-1 ring-slate-500/20' },
  };

  const leaveStatusMeta: Record<string, { chip: string; label: string }> = {
    approved: { chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20', label: 'Approved' },
    pending:  { chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20',         label: 'Pending'  },
    rejected: { chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20',             label: 'Rejected' },
  };

  const currentStatus  = statusMeta[employee.status]              ?? statusMeta.active;
  const currentRole    = roleMeta[employee.role ?? 'employee']    ?? roleMeta.employee;
  const currentEmpType = empTypeMeta[employee.employment_type ?? 'full_time'] ?? 'Full-Time';
  const currentWorkLoc = workLocMeta[employee.work_location ?? 'onsite']      ?? workLocMeta.onsite;
  const WorkLocIcon    = currentWorkLoc.icon;

  const leaveUsed  = (leaveBalance?.annual_used  ?? 0) + (leaveBalance?.sick_used  ?? 0) + (leaveBalance?.casual_used  ?? 0);
  const leaveTotal = (leaveBalance?.annual_quota ?? 0) + (leaveBalance?.sick_quota ?? 0) + (leaveBalance?.casual_quota ?? 0);
  const leaveLeft  = leaveTotal - leaveUsed;
  const leavePct   = leaveTotal > 0 ? Math.round((leaveUsed / leaveTotal) * 100) : 0;

  const assetTypeLabels: Record<string, string> = {
    laptop: 'Laptop', monitor: 'Monitor', phone: 'Phone', license: 'License', other: 'Other',
  };

  const fmt = (dateStr: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', opts ?? { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const fmtCurrency = (amount: number | null | undefined) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: employee.currency || 'USD', maximumFractionDigits: 0,
    }).format(amount);
  };

  let age: number | null = null;
  if (employee.date_of_birth) {
    const dob = new Date(employee.date_of_birth);
    age = today.getFullYear() - dob.getFullYear() -
      (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground border border-border/40 hover:border-border/70 transition-all duration-150 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            Employees
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{employee.full_name}</span>
        </div>

        {/* ══════════════════════════════════════════════
            PREMIUM IDENTITY HEADER
        ══════════════════════════════════════════════ */}
        <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
          {/* Glassmorphic Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none blur-3xl opacity-50" />
          
          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              {/* Avatar Squircle */}
              <div className="relative shrink-0 mx-auto md:mx-0">
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-[2rem] overflow-hidden ring-4 ring-background shadow-2xl bg-card">
                  {employee.profile_photo_url ? (
                    <img
                      src={employee.profile_photo_url}
                      alt={employee.full_name}
                      className="h-full w-full object-cover transition-transform hover:scale-105 duration-700"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-4xl sm:text-5xl font-black text-primary">
                        {getInitials(employee.full_name)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Status Indicator */}
                <span className={cn(
                  "absolute -bottom-2 -right-2 h-6 w-6 rounded-xl border-4 border-card shadow-lg flex items-center justify-center",
                  currentStatus.dot,
                  "shadow-" + currentStatus.dot.replace('bg-', '') + "/50"
                )}>
                  <div className="h-2 w-2 rounded-full bg-white/90 animate-pulse" />
                </span>
              </div>

              {/* Identity & Details */}
              <div className="flex-1 min-w-0 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-1 text-foreground drop-shadow-sm">
                      {employee.full_name}
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium tracking-wide">
                      {employee.designation}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <EditEmployeeDialog
                      employee={employee}
                      managers={managers}
                      departments={departments}
                    />
                  </div>
                </div>

                {/* Tags Row */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 my-5">
                  {employee.employee_code && (
                    <Tag icon={<Hash className="h-3.5 w-3.5" />} label={`#${employee.employee_code}`} mono className="bg-muted/80 backdrop-blur-md" />
                  )}
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold shadow-sm backdrop-blur-md",
                    currentStatus.pill
                  )}>
                    {currentStatus.label}
                  </span>
                  <Tag label={currentRole.label} className={cn(currentRole.color, "bg-background/50 backdrop-blur-md font-bold rounded-xl")} />
                  <Tag label={currentEmpType} className="bg-background/50 backdrop-blur-md font-bold rounded-xl" />
                  <Tag icon={<WorkLocIcon className="h-3.5 w-3.5" />} label={currentWorkLoc.label} className="bg-background/50 backdrop-blur-md font-bold rounded-xl" />
                </div>

                {/* Integrated Quick Info Strip */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-4 pt-4 mt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                    <div className="h-8 w-8 rounded-lg bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Email</span>
                      <span className="text-sm font-semibold">{employee.email}</span>
                    </div>
                  </div>
                  
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Phone</span>
                        <span className="text-sm font-semibold">{employee.phone}</span>
                      </div>
                    </div>
                  )}

                  {employee.joining_date && (
                    <div className="flex items-center gap-2 text-muted-foreground group">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Joined</span>
                        <span className="text-sm font-semibold">{fmt(employee.joining_date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={<Timer className="h-5 w-5" />}
            label="Tenure"
            value={joiningDate ? tenureLabel : '—'}
            sub={joiningDate ? `Since ${fmt(employee.joining_date, { month: 'short', year: 'numeric' })}` : 'Not set'}
            color="amber"
          />
          <KpiCard
            icon={<Calendar className="h-5 w-5" />}
            label="Leave Left"
            value={leaveTotal > 0 ? `${leaveLeft}d` : '—'}
            sub={leaveTotal > 0 ? `${leaveUsed} used of ${leaveTotal}` : 'No quota set'}
            color="blue"
          />
          <KpiCard
            icon={<Laptop className="h-5 w-5" />}
            label="Assets"
            value={String(activeAssets.length)}
            sub={activeAssets.length === 0 ? 'None assigned' : 'Active assignments'}
            color="violet"
          />
          <KpiCard
            icon={<Wallet className="h-5 w-5" />}
            label="Monthly Pkg"
            value={totalSalary > 0 ? fmtCurrency(totalSalary) : '—'}
            sub={totalSalary > 0 ? 'Total compensation' : 'Not configured'}
            color="emerald"
          />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* ── LEFT ── */}
          <div className="flex flex-col gap-8">

            <InfoCard title="Contact Information" icon={<Mail className="h-4 w-4 text-blue-500" />} accent="#3b82f6">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email"   value={employee.email} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone"  value={employee.phone ?? '—'} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={employee.address ?? '—'} />
            </InfoCard>

            <InfoCard title="Personal Details" icon={<UserCircle className="h-4 w-4 text-violet-500" />} accent="#8b5cf6">
              <InfoRow icon={<Cake className="h-3.5 w-3.5" />}     label="Date of Birth" value={fmt(employee.date_of_birth)} />
              {age !== null && (
                <InfoRow icon={<Star className="h-3.5 w-3.5" />}   label="Age"           value={`${age} years old`} />
              )}
              <InfoRow icon={<IdCard className="h-3.5 w-3.5" />}   label="CNIC"          value={employee.cnic_number ?? '—'} mono />
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Joining Date"  value={fmt(employee.joining_date)} />
            </InfoCard>

            {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
              <InfoCard title="Emergency Contact" icon={<Heart className="h-4 w-4 text-rose-500" />} accent="#f43f5e">
                {employee.emergency_contact_name && (
                  <InfoRow icon={<UserPlus className="h-3.5 w-3.5" />} label="Name"  value={employee.emergency_contact_name} />
                )}
                {employee.emergency_contact_phone && (
                  <InfoRow icon={<Phone className="h-3.5 w-3.5" />}    label="Phone" value={employee.emergency_contact_phone} />
                )}
                <div className="px-5 py-3">
                  <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/8 rounded-lg px-3 py-2 ring-1 ring-rose-500/15">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Contact only in case of emergency
                  </div>
                </div>
              </InfoCard>
            )}

            <InfoCard title="Account & System" icon={<Shield className="h-4 w-4 text-primary" />} accent="#e5a158">
              <InfoRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Created"      value={fmt(employee.created_at)} />
              <InfoRow icon={<Activity className="h-3.5 w-3.5" />}    label="Last Updated"  value={fmt(employee.updated_at)} />
              <div className="px-5 py-3 border-t border-border/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Employee Code</p>
                <p className="text-[11px] font-mono text-muted-foreground/70">{employee.employee_code ?? "N/A"}</p>
              </div>
            </InfoCard>



            {/* Career Progression & Probation */}
            {(() => {
              const desig = (employee.designation || '').toLowerCase();
              const isBD = desig.includes('business') || desig.includes('bd');

              const CAREER_LADDER = isBD
                ? [
                    { key: 'associate',     label: 'Associate',         icon: GraduationCap },
                    { key: 'bd',            label: 'Business Developer', icon: Briefcase },
                    { key: 'sr-bd',         label: 'Senior BD',         icon: Award },
                    { key: 'admin',         label: 'Admin / CEO',       icon: Building },
                  ]
                : [
                    { key: 'associate',     label: 'Associate Engineer', icon: Code2 },
                    { key: 'engineer',      label: 'Software Engineer',  icon: Layers },
                    { key: 'senior',        label: 'Senior Engineer',    icon: ShieldCheck },
                    { key: 'admin',         label: 'Admin / CEO',       icon: Building },
                  ];

              const isAdminRole = desig.includes('admin') || desig.includes('ceo') || desig.includes('director');
              const LADDER = isAdminRole ? [...CAREER_LADDER] : CAREER_LADDER.slice(0, -1);

              let currentIdx = 0;
              if (desig.includes('admin') || desig.includes('ceo') || desig.includes('director') || desig.includes('head')) currentIdx = 3;
              else if (desig.includes('senior')) currentIdx = isBD ? 2 : 2;
              else if (desig.includes('business') || desig.includes('bd') || desig.includes('developer') || desig.includes('software') || desig.includes('engineer') || desig.includes('ai')) currentIdx = 1;

              const current = LADDER[currentIdx];
              const next = currentIdx < LADDER.length - 1 ? LADDER[currentIdx + 1] : null;

              const joining = employee.joining_date ? new Date(employee.joining_date) : null;
              const now = new Date();
              const daysEmployed = joining ? Math.floor((now.getTime() - joining.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              const monthsEmployed = Math.floor(daysEmployed / 30);

              const PROBATION_MONTHS = 3;
              const probationEnd = joining
                ? new Date(joining.getFullYear(), joining.getMonth() + PROBATION_MONTHS, joining.getDate())
                : null;
              const probationActive = probationEnd && now < probationEnd;
              const probationDaysLeft = probationEnd ? Math.max(0, Math.ceil((probationEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
              const probationPct = probationEnd && joining
                ? Math.min(100, Math.round(((now.getTime() - joining.getTime()) / (probationEnd.getTime() - joining.getTime())) * 100))
                : 0;

              const totalStageMonths = currentIdx * 6;
              const monthsInStage = Math.max(0, monthsEmployed - totalStageMonths);
              const stageDuration = 12;
              const progressPct = Math.min(100, Math.round((monthsInStage / stageDuration) * 100));
              const monthsUntilNext = next ? Math.max(0, stageDuration - monthsInStage) : 0;

              return (
                <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex-1 flex flex-col">
                  <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold tracking-tight">Career Progression</h3>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Career Path</p>
                        </div>
                      </div>
                      {probationActive && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold bg-muted/80 text-foreground border border-border/40 shadow-sm backdrop-blur-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                          Probation: 3 Months
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-6 space-y-8">
                    {probationActive && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Timer className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Probation Period</span>
                          </div>
                          <span className="text-xs font-black text-primary">{probationPct}%</span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-primary/20 w-full" />
                          <div className="absolute inset-y-0 left-0 bg-primary transition-all duration-700 shadow-[0_0_10px_rgba(var(--primary),0.5)]" style={{ width: `${probationPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <span>{probationDaysLeft} days remaining</span>
                          <span>Ends {fmt(probationEnd ? probationEnd.toISOString() : null, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-muted/20">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center text-primary bg-primary/10 shadow-sm shrink-0">
                        <current.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Current Role</p>
                        <p className="text-base font-black text-foreground truncate">{current.label}</p>
                      </div>
                      <div className="text-right shrink-0 pl-4 border-l border-border/30">
                        <div className="text-2xl font-black tabular-nums text-foreground leading-none">{monthsEmployed}<span className="text-xs font-bold text-muted-foreground ml-0.5">mo</span></div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Total Tenure</p>
                      </div>
                    </div>

                    {next && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Next: {next.label}</span>
                          <span className="text-xs font-black text-primary">{progressPct}%</span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-primary/20 w-full" />
                          <div className="absolute inset-y-0 left-0 bg-primary transition-all duration-700 shadow-[0_0_10px_rgba(var(--primary),0.5)]" style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <span>{monthsInStage} of {stageDuration} months in stage</span>
                          <span className="text-foreground">
                            {monthsUntilNext > 0 ? `~${monthsUntilNext}mo to promotion` : 'Eligible now'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Career Ladder</p>
                      <div className="space-y-12">
                        {LADDER.map((stage, i) => {
                          const isCurrent = i === currentIdx;
                          const isPast = i < currentIdx;
                          return (
                            <div key={stage.key} className="flex items-center gap-4 relative">
                              {i < LADDER.length - 1 && (
                                <div className="absolute left-[15px] top-[34px] w-[2px] h-[calc(100%+48px)] bg-gradient-to-b from-border to-transparent" />
                              )}
                              <div className={cn(
                                "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ring-4 ring-card",
                                isCurrent ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]" : isPast ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground border border-border/50"
                              )}>
                                {isPast ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : isCurrent ? (
                                  <stage.icon className="h-4 w-4" />
                                ) : (
                                  <span className="text-[11px] font-bold">{i + 1}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={cn("text-sm font-bold", isCurrent ? "text-foreground" : isPast ? "text-foreground/80" : "text-muted-foreground")}>
                                    {stage.label}
                                  </p>
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Level {i + 1} of {LADDER.length}</p>
                              </div>
                              {isCurrent && (
                                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary uppercase tracking-wider">
                                  Current
                                </span>
                              )}
                              {isPast && (
                                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 text-muted-foreground uppercase tracking-wider">
                                  Completed
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── RIGHT ── */}
          <div className="flex flex-col gap-8">

            {/* Professional Details */}
            <InfoCard title="Professional Details" icon={<Briefcase className="h-4 w-4 text-amber-500" />} accent="#f59e0b">
              <div className="grid sm:grid-cols-2">
                <div className="sm:border-r border-border/40">
                  <InfoRow icon={<Hash className="h-3.5 w-3.5" />}      label="Employee Code"  value={employee.employee_code ?? 'N/A'} mono />
                  <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Designation"    value={employee.designation} />
                  <InfoRow icon={<Shield className="h-3.5 w-3.5" />}    label="System Role"    value={currentRole.label} />
                </div>
                <div>
                  <InfoRow icon={<Layers className="h-3.5 w-3.5" />}      label="Employment"  value={currentEmpType} />
                  <InfoRow icon={<WorkLocIcon className="h-3.5 w-3.5" />} label="Location"    value={currentWorkLoc.label} />
                  {leadData && (
                    <InfoRow icon={<UserCheck className="h-3.5 w-3.5" />} label="Team Lead"   value={leadData.full_name} />
                  )}
                </div>
              </div>
            </InfoCard>

            {/* Work Schedule */}
            {(employee.work_start_time || employee.work_end_time || employee.weekly_working_days || employee.probation_end_date) && (
              <InfoCard title="Work Schedule" icon={<Clock className="h-4 w-4 text-cyan-500" />} accent="#06b6d4">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border/30">
                  {employee.work_start_time && <SchedCell icon={<Clock className="h-4 w-4" />} label="Start Time" value={employee.work_start_time} />}
                  {employee.work_end_time   && <SchedCell icon={<Timer className="h-4 w-4" />} label="End Time"   value={employee.work_end_time} />}
                  {employee.weekly_working_days && <SchedCell icon={<Calendar className="h-4 w-4" />} label="Days/Week" value={`${employee.weekly_working_days} days`} />}
                  {employee.probation_end_date  && <SchedCell icon={<Hourglass className="h-4 w-4" />} label="Probation End" value={fmt(employee.probation_end_date, { month: 'short', day: 'numeric', year: 'numeric' })} />}
                </div>
              </InfoCard>
            )}

            {/* Compensation */}
            {totalSalary > 0 && (
              <InfoCard title="Compensation" icon={<DollarSign className="h-4 w-4 text-emerald-500" />} accent="#10b981">
                <div className="px-5 py-6">
                  {/* Big number */}
                  <div className="flex flex-col items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 relative z-10">Monthly Total</p>
                    <p className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground relative z-10 drop-shadow-sm">
                      {fmtCurrency(totalSalary)}
                    </p>
                  </div>
                  {/* Breakdown grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <CompCell label="Basic Salary"  value={fmtCurrency(employee.basic_salary)} />
                    <CompCell label="Allowances"    value={fmtCurrency(employee.allowances ?? 0)} />
                    {employee.payment_cycle && (
                      <CompCell
                        label="Pay Cycle"
                        value={employee.payment_cycle.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      />
                    )}
                    {employee.bank_name && <CompCell label="Bank" value={employee.bank_name} />}
                    {employee.bank_account_number && (
                      <CompCell label="Account No." value={`••••${employee.bank_account_number.slice(-4)}`} />
                    )}
                    {employee.currency && <CompCell label="Currency" value={employee.currency} />}
                  </div>
                  <div className="mt-4 text-center">
                    <a
                      href="/admin/payroll/compensation"
                      className="text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Manage versioned compensation →
                    </a>
                  </div>
                </div>
              </InfoCard>
            )}

            {/* Leave Balance */}
            {leaveBalance && leaveTotal > 0 && (
              <InfoCard title="Leave Balance" icon={<Calendar className="h-4 w-4 text-blue-500" />} accent="#3b82f6">
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">Usage this period</span>
                    <span className="font-bold">{leavePct}% used</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                      style={{ width: `${leavePct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <LeaveCell label="Annual" used={leaveBalance.annual_used} quota={leaveBalance.annual_quota} color="blue" />
                    <LeaveCell label="Sick"   used={leaveBalance.sick_used}   quota={leaveBalance.sick_quota}   color="rose" />
                    <LeaveCell label="Casual" used={leaveBalance.casual_used} quota={leaveBalance.casual_quota} color="amber" />
                  </div>
                </div>
              </InfoCard>
            )}

            {/* Assigned Assets */}
            {activeAssets.length > 0 && (
              <InfoCard title={`Assigned Assets (${activeAssets.length})`} icon={<Laptop className="h-4 w-4 text-violet-500" />} accent="#8b5cf6">
                <div className="divide-y divide-border/30">
                  {activeAssets.map((a: any) => {
                    if (!a.asset) return null;
                    return (
                      <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className="h-9 w-9 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                          <Laptop className="h-4 w-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assetTypeLabels[a.asset.asset_type] ?? a.asset.asset_type}
                            {a.asset.serial_number && ` · ${a.asset.serial_number}`}
                          </p>
                        </div>
                        {a.asset.condition && (
                          <span className="text-[11px] font-medium bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md ring-1 ring-border/50 shrink-0 capitalize">
                            {a.asset.condition}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </InfoCard>
            )}

            {/* Recent Leave Requests */}
            {recentLeaves.length > 0 && (
              <InfoCard title="Recent Leave Requests" icon={<FileText className="h-4 w-4 text-orange-500" />} accent="#f97316">
                <div className="divide-y divide-border/30 max-h-[320px] overflow-y-auto pm-scroll-col">
                  {recentLeaves.map((leave: any) => {
                    const ls = leaveStatusMeta[leave.status] ?? leaveStatusMeta.pending;
                    return (
                      <div key={leave.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold capitalize mb-0.5">
                            {leave.leave_type.replace('_', ' ')} Leave
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmt(leave.start_date, { month: 'short', day: 'numeric' })}
                            {' → '}
                            {fmt(leave.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' · '}
                            {leave.days_count} {leave.days_count === 1 ? 'day' : 'days'}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${ls.chip}`}>
                          {ls.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </InfoCard>
            )}

            {/* Employment Timeline */}
            <InfoCard title="Employment Timeline" icon={<Clock className="h-4 w-4 text-muted-foreground" />} accent="hsl(var(--primary))" className="flex-1">
              <div className="px-5 py-5 flex flex-col justify-between space-y-0 h-full">
                {[
                  ...(employee.joining_date ? [{
                    label: 'Joined Organisation',
                    date: fmt(employee.joining_date),
                    meta: `${tenureLabel} ago`,
                    icon: UserPlus,
                    filled: true,
                  }] : []),
                  ...(employee.probation_end_date ? [{
                    label: 'Probation Period Ended',
                    date: fmt(employee.probation_end_date),
                    meta: new Date(employee.probation_end_date) < today ? 'Completed' : 'Upcoming',
                    icon: CheckCircle2,
                    filled: true,
                  }] : []),
                  ...(employee.date_of_birth ? [{
                    label: 'Birthday',
                    date: fmt(employee.date_of_birth, { month: 'long', day: 'numeric' }),
                    meta: 'Annual celebration',
                    icon: Calendar,
                    filled: false,
                  }] : []),
                  {
                    label: 'Profile Last Updated',
                    date: fmt(employee.updated_at),
                    meta: 'Record modified',
                    icon: Activity,
                    filled: false,
                  },
                  {
                    label: 'Account Created',
                    date: fmt(employee.created_at),
                    meta: 'System registration',
                    icon: Shield,
                    filled: false,
                  },
                ].map((ev, i, arr) => (
                  <div key={i} className="relative flex gap-3.5 flex-1 items-start last:pb-0">
                    {i < arr.length - 1 && (
                      <div className="absolute left-[13px] top-9 bottom-0 w-[2px] bg-border" />
                    )}
                    <div className={cn(
                      "relative z-10 h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2",
                      ev.filled
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-card border-border text-muted-foreground"
                    )}>
                      <ev.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-foreground">{ev.label}</p>
                      <p className="text-xs text-muted-foreground">{ev.date}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{ev.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>






          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════ */

function InfoCard({
  title,
  icon,
  accent,
  className,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col", className)}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent shrink-0">
        <div className="h-7 w-7 rounded-md flex items-center justify-center shadow-sm" style={{ backgroundColor: `${accent}15`, color: accent }}>
          {icon}
        </div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors group">
      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground/80 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</span>
        <span className={cn(
          "text-left sm:text-right min-w-0 truncate",
          mono ? "font-mono text-xs text-muted-foreground" : "text-sm font-bold"
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Tag({
  icon,
  label,
  mono,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground ring-1 ring-border/50 ${mono ? 'font-mono' : ''} ${className ?? ''}`}
    >
      {icon}
      {label}
    </span>
  );
}

function QuickInfo({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-semibold min-w-0 ${small ? 'text-sm' : 'text-base'}`}>{value}</p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'amber' | 'blue' | 'violet' | 'emerald';
}) {
  const c = {
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', grad: 'via-amber-500' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', grad: 'via-blue-500' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', grad: 'via-violet-500' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', grad: 'via-emerald-500' },
  }[color];

  return (
    <div className="group relative flex flex-col justify-center text-left w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-border/80">
      <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent ${c.grad} to-transparent opacity-80`} />
      
      <div className="flex flex-col w-full gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300", c.bg)}>
            <div className={cn("transition-colors duration-300", c.text)}>
              {icon}
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-2xl font-black tabular-nums tracking-tight leading-none text-foreground">
            {value}
          </span>
          <span className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">{sub}</span>
        </div>
      </div>
    </div>
  );
}

function SchedCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-5 px-3 text-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function CompCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 ring-1 ring-border/40 px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  );
}

function LeaveCell({
  label, used, quota, color,
}: { label: string; used: number; quota: number; color: 'blue' | 'rose' | 'amber' }) {
  const pct = quota > 0 ? Math.round((used / quota) * 100) : 0;
  const c = {
    blue:  { bar: 'bg-blue-500',  val: 'text-blue-700 dark:text-blue-300',  bg: 'bg-blue-500/8 ring-1 ring-blue-500/20'   },
    rose:  { bar: 'bg-rose-500',  val: 'text-rose-700 dark:text-rose-300',  bg: 'bg-rose-500/8 ring-1 ring-rose-500/20'   },
    amber: { bar: 'bg-amber-500', val: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500/8 ring-1 ring-amber-500/20' },
  }[color];
  return (
    <div className={`rounded-xl p-3 flex flex-col gap-2 ${c.bg}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-black ${c.val}`}>{quota - used}</p>
      <p className="text-[11px] text-muted-foreground">{used}/{quota} used</p>
      <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

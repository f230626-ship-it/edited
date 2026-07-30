"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit,
  Mail,
  Phone,
  Plus,
  Trash2,
  Users,
  Briefcase,
  Building2,
  Globe,
  TrendingUp,
  AlertCircle,
  Check,
  Clock,
  Pause,
  FolderOpen,
  Activity,
  X,
  Lock,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ResourceAssignmentDialog } from "../resource-assignment-dialog";
import { removeResource, updateProjectProgress } from "@/actions/projects";
import type { Project, Employee, ProjectResource } from "@/types/database";

type ProjectWithRelations = Project & {
  bd: Pick<Employee, "id" | "full_name" | "email"> | null;
  manager: Pick<Employee, "id" | "full_name" | "email"> | null;
  closing_developer: Pick<Employee, "id" | "full_name" | "email"> | null;
  resources: (ProjectResource & {
    employee: Pick<Employee, "id" | "full_name" | "email" | "designation" | "profile_photo_url"> | null;
  })[];
};

interface ProjectDetailClientProps {
  project: ProjectWithRelations;
  allEmployees: Employee[];
  currentEmployee: Employee;
  canEdit: boolean;
  canUpdateProgress: boolean;
  teams?: any[];
}

const STATUS_ICONS: Record<string, typeof TrendingUp> = {
  "Lead Won": TrendingUp,
  Onboarding: FolderOpen,
  "In Progress": Play,
  "On Hold": Pause,
  Completed: Check,
  Maintenance: Activity,
  Paused: Pause,
  Cancelled: X,
  Archived: Lock,
};

const STATUS_COLORS: Record<string, string> = {
  "Lead Won": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Onboarding: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "In Progress": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "On Hold": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Completed: "bg-green-500/10 text-green-600 border-green-500/20",
  Maintenance: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  Paused: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  Archived: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-red-500/10 text-red-600 border-red-500/20",
  Medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Low: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export default function ProjectDetailClient({
  project,
  allEmployees,
  currentEmployee,
  canEdit,
  canUpdateProgress,
  teams = [],
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(project.progress_percentage ?? 0);
  const [savingProgress, setSavingProgress] = useState(false);

  const StatusIcon = STATUS_ICONS[project.status] || AlertCircle;
  const totalAllocation = project.resources.reduce((sum, r) => sum + r.allocation_percentage, 0);

  function handleRemove(resourceId: string) {
    setRemovingId(resourceId);
  }

  function confirmRemove(resourceId: string) {
    startTransition(async () => {
      const result = await removeResource(resourceId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Resource removed.");
        router.refresh();
      }
      setRemovingId(null);
    });
  }

  async function handleSaveProgress() {
    setSavingProgress(true);
    try {
      const result = await updateProjectProgress(project.id, progressValue);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Progress updated!");
        setEditingProgress(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update progress.");
    } finally {
      setSavingProgress(false);
    }
  }

  return (
    <div>
      <PageBreadcrumb
        segments={[{ label: "Projects", href: "/projects" }]}
        current={project.name}
      />
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <Badge
                variant="secondary"
                className={`${STATUS_COLORS[project.status]} border text-xs gap-1`}
              >
                <StatusIcon className="h-3 w-3" />
                {project.status}
              </Badge>
              {project.priority && (
                <Badge
                  variant="secondary"
                  className={`${PRIORITY_COLORS[project.priority]} border text-xs`}
                >
                  {project.priority} Priority
                </Badge>
              )}
              {project.industry && (
                <Badge variant="outline" className="text-xs">
                  {project.industry}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/projects/${project.id}/edit`}
          className="pm-btn-outline inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border/60 hover:bg-muted transition-colors"
        >
          <Edit className="h-3.5 w-3.5" /> Edit Project
        </Link>
      </div>

      {/* Progress */}
      <Card className="pm-glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Project Progress</span>
            <span className="text-sm font-bold text-primary">{project.progress_percentage ?? 0}%</span>
          </div>
          <Progress value={project.progress_percentage ?? 0} className="h-2" />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 sm:gap-4">
        <Card className="pm-glass-card">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-black">{project.currency} {project.value.toLocaleString()}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Budget</p>
          </CardContent>
        </Card>
        <Card className="pm-glass-card">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-black">{project.resources.length}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>
        <Card className="pm-glass-card">
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-purple-500 mx-auto mb-1" />
            <p className="text-sm font-bold">
              {project.start_date ? new Date(project.start_date).toLocaleDateString() : "—"}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">Start Date</p>
          </CardContent>
        </Card>
        <Card className="pm-glass-card">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-sm font-bold">
              {project.expected_delivery_date ? new Date(project.expected_delivery_date).toLocaleDateString() : "—"}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">Deadline</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="pm-glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{project.description}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Client" value={project.client_name} icon={Building2} />
                {project.company_name && (
                  <InfoRow label="Company" value={project.company_name} icon={Briefcase} />
                )}
                {project.project_type && (
                  <InfoRow label="Project Type" value={project.project_type} icon={Briefcase} />
                )}
                {project.business_model && (
                  <InfoRow label="Business Model" value={project.business_model} icon={Globe} />
                )}
                {project.profile_name && (
                  <InfoRow label="Profile Name" value={project.profile_name} icon={Users} />
                )}
                {project.payment_structure && (
                  <InfoRow label="Payment Structure" value={project.payment_structure} icon={DollarSign} />
                )}
                {project.project_rate && (
                  <InfoRow label="Project Rate" value={project.project_rate} icon={DollarSign} />
                )}
                {project.expected_monthly_revenue != null && project.expected_monthly_revenue > 0 && (
                  <InfoRow
                    label="Expected MRR"
                    value={`${project.currency} ${Number(project.expected_monthly_revenue).toLocaleString()}`}
                    icon={TrendingUp}
                  />
                )}
                {project.client_email && (
                  <InfoRow label="Email" value={project.client_email} icon={Mail} />
                )}
                {project.client_contact_number && (
                  <InfoRow label="Phone" value={project.client_contact_number} icon={Phone} />
                )}
                {project.lead_source && (
                  <InfoRow label="Lead Source" value={project.lead_source} icon={Globe} />
                )}
                <InfoRow label="Payment" value={project.payment_status} icon={DollarSign} />
              </div>
              {project.is_monthly_retainer && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 text-xs">
                    Monthly Retainer
                  </Badge>
                  {project.retainer_amount ? (
                    <span className="font-mono text-xs">
                      {project.currency} {project.retainer_amount.toLocaleString()}/mo
                    </span>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team */}
          <Card className="pm-glass-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wide">
                  Team ({project.resources.length})
                </CardTitle>
                {totalAllocation > 100 && (
                  <Badge variant="destructive" className="text-[10px]">
                    Over-allocated ({totalAllocation}%)
                  </Badge>
                )}
              </div>
              <ResourceAssignmentDialog
                projectId={project.id}
                employees={allEmployees}
                teams={teams}
              />
            </CardHeader>
            <CardContent>
              {project.resources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No team members assigned yet.</p>
                  <p className="text-xs mt-1">Click &quot;Assign Resource&quot; to add team members.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.resources.map((r) => {
                    const member = r.employee;
                    const memberName = member?.full_name || "Unknown member";
                    const initials = memberName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2);

                    return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member?.profile_photo_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{memberName}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {r.role}
                            </Badge>
                            <span>{r.allocation_percentage}% allocated</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {removingId === r.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => confirmRemove(r.id)}
                              disabled={isPending}
                            >
                              Remove
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setRemovingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <ResourceAssignmentDialog
                              projectId={project.id}
                              employees={allEmployees}
                              existingAssignment={r}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemove(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ownership */}
          <Card className="pm-glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide">Ownership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OwnerRow
                label="Project Manager"
                person={project.manager}
                fallback="Unassigned"
              />
              <OwnerRow
                label="BD Representative"
                person={project.bd}
                fallback={project.assigned_bd_label || "Unassigned"}
              />
              <OwnerRow
                label="Closer (won deal)"
                person={project.closing_developer}
                fallback={project.closer_label || "Unassigned"}
              />
              <OwnerRow
                label="Assigned Resource / Front Face"
                person={null}
                fallback={project.assigned_resource_label || "Unassigned"}
              />
              {(project.assigned_bd_label || project.assigned_resource_label || project.closer_label) && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5 text-xs">
                  {project.closer_label && (
                    <p>
                      <span className="text-muted-foreground">Sheet Closer: </span>
                      <span className="font-medium">{project.closer_label}</span>
                    </p>
                  )}
                  {project.assigned_bd_label && (
                    <p>
                      <span className="text-muted-foreground">Sheet BD: </span>
                      <span className="font-medium">{project.assigned_bd_label}</span>
                    </p>
                  )}
                  {project.assigned_resource_label && (
                    <p>
                      <span className="text-muted-foreground">Sheet Resource: </span>
                      <span className="font-medium">{project.assigned_resource_label}</span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="pm-glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <TimelineRow label="Start Date" date={project.start_date} />
              <TimelineRow label="Expected Delivery" date={project.expected_delivery_date} />
              {project.actual_delivery_date && (
                <TimelineRow label="Actual Delivery" date={project.actual_delivery_date} />
              )}
            </CardContent>
          </Card>

          {/* Financials */}
          <Card className="pm-glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide">Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget / Value</span>
                <span className="font-mono font-bold">
                  {project.currency} {Number(project.value || 0).toLocaleString()}
                </span>
              </div>
              {project.project_rate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sheet Rate</span>
                  <span className="font-mono text-xs">{project.project_rate}</span>
                </div>
              )}
              {project.expected_monthly_revenue != null && project.expected_monthly_revenue > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MRR</span>
                  <span className="font-mono text-xs">
                    {project.currency} {Number(project.expected_monthly_revenue).toLocaleString()}
                  </span>
                </div>
              )}
              {project.business_model && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="text-xs font-semibold">{project.business_model}</span>
                </div>
              )}
              {project.retainer_amount ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retainer</span>
                  <span className="font-mono">
                    {project.currency} {project.retainer_amount.toLocaleString()}/mo
                  </span>
                </div>
              ) : null}
              {project.expected_profit ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Profit</span>
                  <span className="font-mono text-green-600">
                    {project.currency} {project.expected_profit.toLocaleString()}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon: typeof Building2;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function OwnerRow({
  label,
  person,
  fallback,
}: {
  label: string;
  person: Pick<Employee, "id" | "full_name" | "email"> | null;
  fallback: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase mb-1">{label}</p>
      {person ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
              {person.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{person.full_name}</p>
            <p className="text-[10px] text-muted-foreground">{person.email}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{fallback}</p>
      )}
    </div>
  );
}

function TimelineRow({ label, date }: { label: string; date: string | null }) {
  if (!date) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">
        {new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, updateProject } from "@/actions/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Briefcase, 
  User, 
  DollarSign, 
  Calendar, 
  ArrowLeft,
  X,
  Check
} from "lucide-react";
import type { Project, Employee } from "@/types/database";

interface ProjectFormProps {
  employees: Employee[];
  currentEmployee: Employee;
  project?: Project; // If provided, we are editing
}

export function ProjectForm({ employees, currentEmployee, project }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [industry, setIndustry] = useState(project?.industry || "Other");
  const [leadSource, setLeadSource] = useState(project?.lead_source || "Other");
  const [paymentStatus, setPaymentStatus] = useState(project?.payment_status || "Pending");
  const [status, setStatus] = useState(project?.status || "Lead Won");
  const [priority, setPriority] = useState<Project["priority"]>(project?.priority || "Medium");
  
  const [bdId, setBdId] = useState(project?.bd_id || "");
  const [closingDevId, setClosingDevId] = useState(project?.closing_developer_id || "");
  
  const [isMonthlyRetainer, setIsMonthlyRetainer] = useState(project?.is_monthly_retainer || false);
  const [currency, setCurrency] = useState(project?.currency || "USD");
  const [projectType, setProjectType] = useState(project?.project_type || "");
  const [paymentStructure, setPaymentStructure] = useState(project?.payment_structure || "");

  const isEditing = !!project;
  // Portal admin OR PM admin can edit (pm_role may still be developer for portal admins)
  const isAdmin =
    currentEmployee.role === "admin" || currentEmployee.pm_role === "admin";

  const PROJECT_TYPE_OPTIONS = [
    "Full Time",
    "Part Time",
    "One-time",
    "Contract",
    "Internship",
    "Fixed Price",
  ];
  const PAYMENT_STRUCTURE_OPTIONS = [
    "Milestones",
    "Milestone Based",
    "Monthly",
    "Weekly",
    "Bi-weekly",
    "Bi-Weekly",
    "Upfront",
  ];
  // Preserve sheet free-text values that aren't in the fixed lists
  const projectTypeOptions = projectType && !PROJECT_TYPE_OPTIONS.includes(projectType)
    ? [projectType, ...PROJECT_TYPE_OPTIONS]
    : PROJECT_TYPE_OPTIONS;
  const paymentStructureOptions =
    paymentStructure && !PAYMENT_STRUCTURE_OPTIONS.includes(paymentStructure)
      ? [paymentStructure, ...PAYMENT_STRUCTURE_OPTIONS]
      : PAYMENT_STRUCTURE_OPTIONS;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("industry", industry);
    formData.set("lead_source", leadSource);
    formData.set("payment_status", paymentStatus);
    formData.set("status", status);
    formData.set("priority", priority || "Medium");
    formData.set("is_monthly_retainer", String(isMonthlyRetainer));
    formData.set("currency", currency);
    formData.set("project_type", projectType || "");
    formData.set("payment_structure", paymentStructure || "");
    // Always send FKs so clearing is possible
    formData.set("bd_id", bdId || "");
    formData.set("closing_developer_id", closingDevId || "");

    try {
      let result;
      if (isEditing && project) {
        result = await updateProject(project.id, formData);
      } else {
        result = await createProject(formData);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEditing ? "Project updated successfully!" : "Project created successfully!");
        router.push(isEditing ? `/projects/${project.id}` : "/projects");
        router.refresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 1: General Details */}
        <Card className="pm-section-card">
          <CardHeader className="pm-section-header">
            <div className="pm-section-icon">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">General Information</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Core project identification, client details, and description</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Project Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project?.name || ""}
                placeholder="E.g. Real Estate Portal Design"
                required
                className="pm-input"
              />
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client_name" className="text-xs font-semibold text-muted-foreground">Client Name</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  defaultValue={project?.client_name || ""}
                  placeholder="John Doe"
                  required
                  className="pm-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company_name" className="text-xs font-semibold text-muted-foreground">Company Name</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  defaultValue={project?.company_name || ""}
                  placeholder="E.g. Acme Corp"
                  className="pm-input"
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client_email" className="text-xs font-semibold text-muted-foreground">Client Email</Label>
                <Input
                  id="client_email"
                  name="client_email"
                  type="email"
                  defaultValue={project?.client_email || ""}
                  placeholder="client@example.com"
                  required
                  className="pm-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_contact_number" className="text-xs font-semibold text-muted-foreground">Client Phone</Label>
                <Input
                  id="client_contact_number"
                  name="client_contact_number"
                  defaultValue={project?.client_contact_number || ""}
                  placeholder="+1 (234) 567-890"
                  className="pm-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Industry</Label>
              <Select value={industry} onValueChange={(val) => setIndustry(val as Project["industry"])}>
                <SelectTrigger className="pm-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Restaurant">Restaurant</SelectItem>
                  <SelectItem value="Hotel">Hotel</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Project Type</Label>
              <Select
                value={projectType || null}
                onValueChange={(val) => setProjectType(val ?? "")}
              >
                <SelectTrigger className="pm-select-trigger">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground">Project Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={project?.description || ""}
                placeholder="Provide a detailed overview of project milestones, scope, and parameters..."
                rows={5}
                className="pm-textarea"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Ownership & Status */}
        <div className="space-y-6">
          <Card className="pm-section-card">
            <CardHeader className="pm-section-header">
              <div className="pm-section-icon">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Ownership & Pipeline Settings</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Define key stakeholders, project urgency, and status</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">BD Representative</Label>
                  <Select
                    value={bdId || null}
                    onValueChange={(val) => setBdId(val || "")}
                    items={employees
                      .filter((e) => e.pm_role === "bd" || e.pm_role === "admin" || e.role === "admin")
                      .map((emp) => ({ value: emp.id, label: emp.full_name }))}
                  >
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue placeholder="Select BD" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter((e) => e.pm_role === "bd" || e.pm_role === "admin" || e.role === "admin")
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Lead Source</Label>
                  <Select value={leadSource} onValueChange={(val) => setLeadSource(val as Project["lead_source"])}>
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fiverr">Fiverr</SelectItem>
                      <SelectItem value="Upwork">Upwork</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Cold Email">Cold Email</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Front Face</Label>
                  <Select
                    value={closingDevId || null}
                    onValueChange={(val) => setClosingDevId(val || "")}
                    items={employees.map((emp) => ({ value: emp.id, label: emp.full_name }))}
                  >
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue placeholder="Select Front Face" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile_name" className="text-xs font-semibold text-muted-foreground">Profile Name</Label>
                  <Input
                    id="profile_name"
                    name="profile_name"
                    defaultValue={project?.profile_name || ""}
                    placeholder="E.g. Fiza"
                    className="pm-input"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Project Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as Project["status"])}>
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead Won">Lead Won</SelectItem>
                      <SelectItem value="Onboarding">Onboarding</SelectItem>
                      <SelectItem value="In Progress">Active (In Progress)</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Completed">Ended (Completed)</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Paused">Paused</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                      {(isAdmin || project?.status === "Archived") && (
                        <SelectItem value="Archived">Archived</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(val) => setPaymentStatus(val as Project["payment_status"])}>
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-1 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Project Priority</Label>
                  <Select value={priority} onValueChange={(val) => setPriority(val as Project["priority"])}>
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Financials */}
          <Card className="pm-section-card">
            <CardHeader className="pm-section-header">
              <div className="pm-section-icon">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Financial Settings</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Budget value, billing model, and profit projections</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="value" className="text-xs font-semibold text-muted-foreground">Project Value</Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    step="0.01"
                    defaultValue={project?.value || ""}
                    placeholder="E.g. 5000"
                    required
                    className="pm-input font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Currency</Label>
                  <Select value={currency} onValueChange={(val) => setCurrency(val || "USD")}>
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="PKR">PKR (₨)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project_rate" className="text-xs font-semibold text-muted-foreground">Project Rate</Label>
                  <Input
                    id="project_rate"
                    name="project_rate"
                    defaultValue={project?.project_rate || ""}
                    placeholder="E.g. 1500RS/h"
                    className="pm-input font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Payment Structure</Label>
                  <Select
                    value={paymentStructure || null}
                    onValueChange={(val) => setPaymentStructure(val ?? "")}
                  >
                    <SelectTrigger className="pm-select-trigger">
                      <SelectValue placeholder="Select structure" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStructureOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expected_monthly_revenue" className="text-xs font-semibold text-muted-foreground">Expected Monthly Revenue (MRR)</Label>
                  <Input
                    id="expected_monthly_revenue"
                    name="expected_monthly_revenue"
                    type="number"
                    step="0.01"
                    defaultValue={project?.expected_monthly_revenue || ""}
                    placeholder="E.g. 2000"
                    className="pm-input font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2.5 py-1 px-2.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                <Checkbox
                  id="is_monthly_retainer"
                  checked={isMonthlyRetainer}
                  onCheckedChange={(checked) => setIsMonthlyRetainer(!!checked)}
                  className="rounded border-border/60 text-primary focus:ring-primary/20"
                />
                <Label
                  htmlFor="is_monthly_retainer"
                  className="text-xs font-semibold leading-none cursor-pointer text-foreground select-none"
                >
                  This is a Monthly Retainer Project
                </Label>
              </div>

              {isMonthlyRetainer && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 animate-fade-in">
                  <div className="space-y-1.5">
                    <Label htmlFor="retainer_amount" className="text-xs font-semibold text-muted-foreground">Monthly Retainer Amount</Label>
                    <Input
                      id="retainer_amount"
                      name="retainer_amount"
                      type="number"
                      step="0.01"
                      defaultValue={project?.retainer_amount || ""}
                      placeholder="E.g. 1500"
                      required={isMonthlyRetainer}
                      className="pm-input font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expected_profit" className="text-xs font-semibold text-muted-foreground">Expected Profit Margin</Label>
                    <Input
                      id="expected_profit"
                      name="expected_profit"
                      type="number"
                      step="0.01"
                      defaultValue={project?.expected_profit || ""}
                      placeholder="E.g. 2000"
                      className="pm-input font-mono text-green-600 dark:text-green-400"
                    />
                  </div>
                </div>
              )}

              {!isMonthlyRetainer && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label htmlFor="expected_profit" className="text-xs font-semibold text-muted-foreground">Expected Profit Margin</Label>
                  <Input
                    id="expected_profit"
                    name="expected_profit"
                    type="number"
                    step="0.01"
                    defaultValue={project?.expected_profit || ""}
                    placeholder="E.g. 2000"
                    className="pm-input font-mono text-green-600 dark:text-green-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Timeline */}
          <Card className="pm-section-card">
            <CardHeader className="pm-section-header">
              <div className="pm-section-icon">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Timeline & Milestones</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Crucial dates, deadlines, and delivery milestones</p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-semibold text-muted-foreground">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={project?.start_date || ""}
                  required
                  className="pm-input text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expected_delivery_date" className="text-xs font-semibold text-muted-foreground">Expected Delivery</Label>
                <Input
                  id="expected_delivery_date"
                  name="expected_delivery_date"
                  type="date"
                  defaultValue={project?.expected_delivery_date || ""}
                  required
                  className="pm-input text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="actual_delivery_date" className="text-xs font-semibold text-muted-foreground">Actual Delivery</Label>
                <Input
                  id="actual_delivery_date"
                  name="actual_delivery_date"
                  type="date"
                  defaultValue={project?.actual_delivery_date || ""}
                  className="pm-input text-xs font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-border/40">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(isEditing ? `/projects/${project?.id}` : "/projects")}
          disabled={loading}
          className="pm-btn-outline h-10 px-5 w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading} 
          className="pm-btn-primary text-primary-foreground px-6 h-10 w-full sm:w-auto"
        >
          {loading ? (
            "Saving..."
          ) : isEditing ? (
            <>
              <Check className="h-4 w-4 mr-1.5" /> Save Changes
            </>
          ) : (
            <>
              <Briefcase className="h-4 w-4 mr-1.5" /> Create Project
            </>
          )}
        </Button>
      </div>
    </form>
  );
}


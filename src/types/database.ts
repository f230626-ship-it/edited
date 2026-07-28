export type UserRole = "admin" | "hr" | "employee" | "developer";
export type EmploymentType = "full_time" | "intern" | "contract";
export type WorkLocation = "onsite" | "remote" | "hybrid";
export type EmployeeStatus = "active" | "inactive" | "suspended";
export type LeaveType = "sick" | "casual" | "annual" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type AttendanceType = "office" | "remote" | "half_day" | "absent";
export type AssetType = "laptop" | "monitor" | "phone" | "license" | "other";
export type AssetStatus = "available" | "assigned" | "under_maintenance" | "retired";
export type PolicyCategory = "handbook" | "leave_policy" | "remote_work" | "sops" | "nda" | "other";
export type DocumentType = "cnic" | "offer_letter" | "employment_contract" | "certificate" | "other";
export type PaymentCycle = "monthly" | "bi_weekly" | "weekly";

export type PMRole = "admin" | "coordinator" | "bd" | "developer";

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_code: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  profile_photo_url: string | null;
  cnic_number: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  joining_date: string;
  designation: string;
  department_id: string | null;
  manager_id: string | null;
  lead_id: string | null;
  employment_type: EmploymentType;
  work_location: WorkLocation;
  status: EmployeeStatus;
  role: UserRole;
  pm_role: PMRole;
  basic_salary: number | null;
  allowances: number | null;
  payment_cycle: PaymentCycle | null;
  bank_name: string | null;
  bank_account_number: string | null;
  created_at: string;
  updated_at: string;
  work_start_time: string | null;
  work_end_time: string | null;
  weekly_working_days: number | null;
  probation_end_date: string | null;
  currency: string | null;
  department?: Department;
  manager?: Pick<Employee, "id" | "full_name" | "email">;
  lead?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  annual_quota: number;
  sick_quota: number;
  casual_quota: number;
  annual_used: number;
  sick_used: number;
  casual_used: number;
  updated_at: string;
}

export interface Leave {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  days_count: number;
  created_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email" | "designation">;
  reviewer?: Pick<Employee, "id" | "full_name">;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  working_hours: number | null;
  attendance_type: AttendanceType;
  notes: string | null;
  created_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface Timesheet {
  id: string;
  employee_id: string;
  date: string;
  task_description: string;
  hours: number;
  created_at: string;
}

export interface Policy {
  id: string;
  title: string;
  category: PolicyCategory;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface PerformanceGoal {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completion_status: number;
  created_by: string | null;
  created_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string | null;
  review_period: string;
  strengths: string | null;
  weaknesses: string | null;
  improvement_areas: string | null;
  rating: number | null;
  status: string;
  created_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "designation">;
  reviewer?: Pick<Employee, "id" | "full_name">;
}

export interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  serial_number: string | null;
  purchase_date: string | null;
  condition: string | null;
  status: AssetStatus;
  notes: string | null;
  created_at: string;
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  employee_id: string;
  assigned_date: string;
  return_date: string | null;
  notes: string | null;
  created_at: string;
  asset?: Asset;
  employee?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type ProjectSource = "manual" | "sheet_sync" | "excel_import";

export interface Project {
  id: string;
  name: string;
  client_name: string;
  company_name: string | null;
  client_email: string;
  client_contact_number: string | null;
  description: string | null;
  industry: "Real Estate" | "Healthcare" | "Restaurant" | "Hotel" | "E-commerce" | "Other";
  bd_id: string | null;
  lead_source: "Fiverr" | "Upwork" | "LinkedIn" | "Website" | "Referral" | "Cold Email" | "Other";
  closing_developer_id: string | null;
  manager_id: string | null;
  value: number;
  currency: string;
  is_monthly_retainer: boolean;
  retainer_amount: number | null;
  expected_profit: number | null;
  payment_status: "Pending" | "Partial" | "Paid" | "Overdue";
  start_date: string;
  expected_delivery_date: string;
  actual_delivery_date: string | null;
  status: "Lead Won" | "Onboarding" | "In Progress" | "On Hold" | "Completed" | "Maintenance" | "Paused" | "Cancelled" | "Archived";
  priority?: "Low" | "Medium" | "High";
  progress_percentage?: number;
  project_type?: string | null;
  business_model?: string | null;
  payment_structure?: string | null;
  project_rate?: string | null;
  expected_monthly_revenue?: number | null;
  profile_name?: string | null;
  assigned_bd_label?: string | null;
  assigned_resource_label?: string | null;
  source?: ProjectSource | null;
  external_row_hash?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  bd?: Pick<Employee, "id" | "full_name" | "email">;
  manager?: Pick<Employee, "id" | "full_name" | "email">;
  closing_developer?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  employee_id: string;
  role: "Frontend Developer" | "Backend Developer" | "Full Stack Developer" | "Designer" | "QA" | "AI Engineer" | "DevOps" | "Project Manager";
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  created_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface ProjectAuditLog {
  id: string;
  project_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface SalesProfile {
  id: string;
  name: string;
  employee_id: string;
  platform: string;
  google_sheet_id: string | null;
  sheet_tab_name: string | null;
  is_active: boolean;
  linkedin_email: string | null;
  linkedin_username: string | null;
  linkedin_url: string | null;
  profile_image: string | null;
  assigned_team_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email" | "employee_code">;
}

export interface SalesDailyLog {
  id: string;
  employee_id: string;
  profile_id: string;
  log_date: string;
  connections_sent: number;
  connections_accepted: number;
  messages_sent: number;
  replies_received: number;
  follow_ups_done: number;
  meetings_booked: number;
  leads_added: number;
  proposals_sent: number;
  notes: string | null;
  screenshot: string | null;
  created_at: string;
  updated_at: string;
  profile?: SalesProfile;
  employee?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface SalesTarget {
  id: string;
  employee_id: string;
  connections_daily: number;
  messages_daily: number;
  follow_ups_daily: number;
  meetings_weekly: number;
  monthly_goal: number;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface SalesSheetSnapshot {
  id: string;
  profile_id: string;
  snapshot_date: string;
  active_leads: number;
  follow_up: number;
  intro_call: number;
  trying_to_call: number;
  won_mtd: number;
  status_breakdown: Record<string, number> | null;
  created_at: string;
  profile?: SalesProfile;
}

export type SalesTeamStatus = "active" | "archived" | "deleted";

export interface SalesTeam {
  id: string;
  name: string;
  description: string | null;
  team_lead_id: string | null;
  project_id: string | null;
  status: SalesTeamStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  team_lead?: Pick<Employee, "id" | "full_name" | "email">;
  creator?: Pick<Employee, "id" | "full_name">;
  members?: SalesTeamMember[];
}

export interface SalesTeamMember {
  id: string;
  team_id: string;
  employee_id: string;
  created_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email" | "designation" | "profile_photo_url" | "employee_code">;
}

export type LeadStatus = "cold" | "contacted" | "replied" | "interested" | "meeting_booked" | "closed" | "lost";

export interface SalesLead {
  id: string;
  employee_id: string;
  profile_id: string | null;
  lead_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email">;
  profile?: Pick<SalesProfile, "id" | "name" | "platform">;
}

export type MeetingStatus = "pending" | "completed" | "cancelled";

export interface SalesMeeting {
  id: string;
  lead_id: string | null;
  employee_id: string;
  meeting_date: string;
  meeting_link: string | null;
  status: MeetingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lead?: Pick<SalesLead, "id" | "lead_name" | "company_name">;
  employee?: Pick<Employee, "id" | "full_name" | "email">;
}

export interface SalesActivityLog {
  id: string;
  user_id: string;
  action: string;
  module: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: Pick<Employee, "id" | "full_name" | "email">;
}

export type IcpFilterSource = "manual" | "sheet_sync" | "excel_import";

export interface IcpFilter {
  id: string;
  profile_name: string;
  sales_profile_id: string | null;
  filter_date_raw: string | null;
  filter_date: string | null;
  period_year: number | null;
  period_month: number | null;
  period_week: number | null;
  company_headcount: string | null;
  past_companies: string | null;
  regions: string | null;
  job_titles: string | null;
  industry: string | null;
  years_experience: string | null;
  projects_closed: string | null;
  notes: string | null;
  source: IcpFilterSource;
  external_row_hash: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcpFilterSyncMeta {
  id: string;
  google_sheet_id: string | null;
  sheet_tab_name: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  last_sync_count: number | null;
  updated_at: string;
}

export interface ProjectSyncMeta {
  id: string;
  google_sheet_id: string | null;
  sheet_tab_name: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  last_sync_count: number | null;
  updated_at: string;
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  total_connections: number;
  total_messages: number;
  total_replies: number;
  total_meetings: number;
  total_leads: number;
  total_followups: number;
  conversion_rate: number;
  acceptance_rate: number;
  reply_rate: number;
  top_performer_id: string | null;
  needs_attention_id: string | null;
  pipeline_summary: Record<string, number> | null;
  recommendations: string | null;
  generated_at: string;
  top_performer?: Pick<Employee, "id" | "full_name">;
  needs_attention?: Pick<Employee, "id" | "full_name">;
}



export type TeamStatus = "active" | "inactive" | "archived";

export interface Team {
  id: string;
  name: string;
  code: string;
  description: string | null;
  lead_id: string | null;
  status: TeamStatus;
  color: string | null;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead?: Pick<Employee, "id" | "full_name" | "email" | "profile_photo_url">;
  creator?: Pick<Employee, "id" | "full_name">;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  employee_id: string;
  role: "lead" | "member";
  joined_at: string;
  employee?: Pick<Employee, "id" | "full_name" | "email" | "designation" | "profile_photo_url" | "employee_code" | "department_id">;
}

export interface TeamAuditLog {
  id: string;
  team_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor?: Pick<Employee, "id" | "full_name">;
}


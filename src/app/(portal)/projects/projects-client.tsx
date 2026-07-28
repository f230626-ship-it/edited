"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutGrid,
  TrendingUp,
  Clock,
  CheckCircle2,
  Repeat2,
  DollarSign,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  FolderOpen,
  Upload,
  Calendar,
  X,
  Filter,
} from "lucide-react";
import { ImportDialog } from "@/components/projects/import-dialog";
import { ProjectSheetSyncControls } from "@/components/projects/project-sheet-sync";
import { AnimatedNumber } from "@/components/projects/premium-ui";
import { MetricStrip } from "@/components/projects/metric-strip";
import type { Employee, Project, ProjectResource, ProjectSyncMeta } from "@/types/database";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Lead Won": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Onboarding": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  "In Progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "On Hold": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Completed": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Maintenance": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  "Paused": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Cancelled": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Archived": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

const getStatusBadge = (status: string) => {
  const baseClass = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-200 whitespace-nowrap";
  switch (status) {
    case "Active":
      return <span className={`${baseClass} bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 dark:bg-green-500/5`}>Active</span>;
    case "Ended":
      return <span className={`${baseClass} bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5`}>Ended</span>;
    case "Lead Won":
      return <span className={`${baseClass} bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/5`}>Lead Won</span>;
    case "Onboarding":
      return <span className={`${baseClass} bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 dark:bg-indigo-500/5`}>Onboarding</span>;
    case "In Progress":
      return <span className={`${baseClass} bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/5`}>In Progress</span>;
    case "On Hold":
      return <span className={`${baseClass} bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400 dark:bg-orange-500/5`}>On Hold</span>;
    case "Completed":
      return <span className={`${baseClass} bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 dark:bg-green-500/5`}>Completed</span>;
    case "Maintenance":
      return <span className={`${baseClass} bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400 dark:bg-teal-500/5`}>Maintenance</span>;
    case "Paused":
      return <span className={`${baseClass} bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 dark:bg-purple-500/5`}>Paused</span>;
    case "Cancelled":
      return <span className={`${baseClass} bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:bg-red-500/5`}>Cancelled</span>;
    case "Archived":
      return <span className={`${baseClass} bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5`}>Archived</span>;
    default:
      return <span className={`${baseClass} bg-slate-500/10 text-slate-600 border-slate-500/20`}>{status}</span>;
  }
};

const getPriorityBadge = (priority?: string) => {
  const baseClass = "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all duration-200";
  switch (priority) {
    case "High":
      return <span className={`${baseClass} bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:bg-red-500/5`}>High</span>;
    case "Medium":
      return <span className={`${baseClass} bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/5`}>Medium</span>;
    case "Low":
      return <span className={`${baseClass} bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5`}>Low</span>;
    default:
      return <span className={`${baseClass} bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5`}>Medium</span>;
  }
};

const CHART_COLORS = [
  "#e5a158", // Brand Gold
  "#818cf8", // Muted Indigo
  "#34d399", // Mint Green
  "#f472b6", // Pastel Rose
  "#a78bfa", // Soft Lavender
  "#22d3ee", // Sky Cyan
  "#fb923c", // Warm Peach
  "#2dd4bf", // Pale Teal
  "#94a3b8", // Cool Gray
];

const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-800/80 backdrop-blur-md rounded-xl p-3 shadow-2xl space-y-1">
        {label && (
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: payload[0].color || payload[0].fill }} />
          <span className="text-xs font-semibold text-slate-400">{payload[0].name}:</span>
          <span className="text-xs font-black text-white">
            {prefix}{Number(payload[0].value).toLocaleString()}{suffix}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

interface ProjectsClientProps {
  initialProjects: (Project & {
    bd: Pick<Employee, "id" | "full_name" | "email"> | null;
    manager: Pick<Employee, "id" | "full_name" | "email"> | null;
    resources: (ProjectResource & { employee: Pick<Employee, "id" | "full_name" | "email"> })[];
  })[];
  allEmployees: Employee[];
  currentEmployee: Employee;
  syncMeta?: ProjectSyncMeta | null;
}

export default function ProjectsClient({
  initialProjects,
  allEmployees,
  currentEmployee,
  syncMeta = null,
}: ProjectsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "list">("dashboard");
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Only pm_role='admin' can create projects (coordinators can edit but not create)
  const isAdmin = currentEmployee.pm_role === "admin" || currentEmployee.role === "admin";
  // Both admin and coordinator can edit/delete
  const isWritable = currentEmployee.pm_role === "admin" || currentEmployee.pm_role === "coordinator";

  // --- Filtering & Search State ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [bdFilter, setBdFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [leadSourceFilter, setLeadSourceFilter] = useState("ALL");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [timeFilterYear, setTimeFilterYear] = useState<number>(new Date().getFullYear());
  const [timeFilterMode, setTimeFilterMode] = useState<"quarter" | "month">("quarter");
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Helper: unique clients ---
  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    initialProjects.forEach((p) => {
      if (p.client_name) clients.add(p.client_name);
    });
    return Array.from(clients).sort();
  }, [initialProjects]);

  // --- Filtered Projects ---
  const filteredProjects = useMemo(() => {
    return initialProjects.filter((p) => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchLower) ||
        p.client_name.toLowerCase().includes(searchLower) ||
        (p.company_name && p.company_name.toLowerCase().includes(searchLower));

      // Dropdowns
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchesClient = clientFilter === "ALL" || p.client_name === clientFilter;
      const matchesIndustry = industryFilter === "ALL" || p.industry === industryFilter;
      const matchesBd =
        bdFilter === "ALL" ||
        p.bd_id === bdFilter ||
        (p.assigned_bd_label || "").toLowerCase().includes(
          (allEmployees.find((e) => e.id === bdFilter)?.full_name || "").toLowerCase().split(" ")[0] || "__none__"
        );
      const matchesLeadSource = leadSourceFilter === "ALL" || p.lead_source === leadSourceFilter;
      
      const matchesResource =
        resourceFilter === "ALL" ||
        p.resources.some((r) => r.employee_id === resourceFilter) ||
        (p.assigned_resource_label || "")
          .toLowerCase()
          .includes(
            (allEmployees.find((e) => e.id === resourceFilter)?.full_name || "")
              .toLowerCase()
              .split(" ")[0] || "__none__"
          );

      // Date ranges
      const projectStart = new Date(p.start_date);
      const matchesStartFrom = !startDateFrom || projectStart >= new Date(startDateFrom);
      const matchesStartTo = !startDateTo || projectStart <= new Date(startDateTo);

      // KPI filter
      let matchesKpi = true;
      if (kpiFilter === "active") {
        matchesKpi = ["Onboarding", "In Progress", "Maintenance"].includes(p.status);
      } else if (kpiFilter === "on_hold") {
        matchesKpi = p.status === "On Hold";
      } else if (kpiFilter === "completed") {
        matchesKpi = p.status === "Completed";
      } else if (kpiFilter === "retainers") {
        matchesKpi = !!p.is_monthly_retainer;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClient &&
        matchesIndustry &&
        matchesBd &&
        matchesResource &&
        matchesLeadSource &&
        matchesStartFrom &&
        matchesStartTo &&
        matchesKpi
      );
    });
  }, [
    initialProjects,
    allEmployees,
    search,
    statusFilter,
    clientFilter,
    industryFilter,
    bdFilter,
    resourceFilter,
    leadSourceFilter,
    startDateFrom,
    startDateTo,
    kpiFilter,
  ]);

  // --- Paginated Projects ---
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;

  // --- Reset Pagination when filters change is handled inline with handlers ---

  // --- Close time dropdown on outside click ---
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
    }
    if (isTimeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isTimeDropdownOpen]);

  // --- Time filter label ---
  const timeFilterLabel = useMemo(() => {
    if (timeFilter === "all") return "All Time";
    if (timeFilter === "month") return "Current Month";
    if (timeFilter === "year") return `${timeFilterYear} Full Year`;
    if (timeFilter === "q1") return `Q1 ${timeFilterYear}`;
    if (timeFilter === "q2") return `Q2 ${timeFilterYear}`;
    if (timeFilter === "q3") return `Q3 ${timeFilterYear}`;
    if (timeFilter === "q4") return `Q4 ${timeFilterYear}`;
    const monthNum = parseInt(timeFilter);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[monthNum - 1]} ${timeFilterYear}`;
    }
    return "All Time";
  }, [timeFilter, timeFilterYear]);

  // --- Time-based filtered projects ---
  const filteredProjectsByTime = useMemo(() => {
    if (timeFilter === "all") return initialProjects;

    return initialProjects.filter((p) => {
      if (!p.start_date) return false;
      const d = new Date(p.start_date);
      const year = d.getFullYear();
      if (year !== timeFilterYear) return false;

      if (timeFilter === "year") return true;

      const month = d.getMonth(); // 0-indexed

      if (timeFilterMode === "quarter") {
        if (timeFilter === "q1") return month >= 0 && month <= 2;
        if (timeFilter === "q2") return month >= 3 && month <= 5;
        if (timeFilter === "q3") return month >= 6 && month <= 8;
        if (timeFilter === "q4") return month >= 9 && month <= 11;
      } else {
        const monthNum = parseInt(timeFilter);
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
          return month === monthNum - 1;
        }
      }

      if (timeFilter === "month") {
        const now = new Date();
        return year === now.getFullYear() && month === now.getMonth();
      }
      return true;
    });
  }, [initialProjects, timeFilter, timeFilterYear, timeFilterMode]);

  // ==========================================
  // --- METRIC CALCULATIONS FOR DASHBOARD ---
  // ==========================================

  const metrics = useMemo(() => {
    const projects = filteredProjectsByTime;
    const total = projects.length;
    
    let active = 0;
    let onHold = 0;
    let completed = 0;
    let monthlyRecurring = 0;
    let totalValue = 0;

    projects.forEach((p) => {
      if (["Onboarding", "In Progress", "Maintenance"].includes(p.status)) {
        active++;
      }
      if (p.status === "On Hold") {
        onHold++;
      }
      if (p.status === "Completed") {
        completed++;
      }
      if (p.is_monthly_retainer) {
        monthlyRecurring++;
      }
      totalValue += Number(p.value || 0);
    });

    // Total active resources (distinct employee IDs assigned to active projects)
    const activeResourceIds = new Set<string>();
    projects.forEach((p) => {
      if (["Onboarding", "In Progress", "Maintenance"].includes(p.status)) {
        p.resources.forEach((r) => {
          activeResourceIds.add(r.employee_id);
        });
      }
    });

    return {
      total,
      active,
      onHold,
      completed,
      monthlyRecurring,
      totalValue,
      totalActiveResources: activeResourceIds.size,
    };
  }, [filteredProjectsByTime]);

  // 1. Project Status Chart Data
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProjectsByTime.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredProjectsByTime]);

  // 2. Revenue Dashboard Calculations
  const revenueMetrics = useMemo(() => {
    let totalRevenue = 0;
    const byMonth: Record<string, { value: number; sortKey: number }> = {};
    const bySource: Record<string, number> = {};
    const byBD: Record<string, number> = {};

    filteredProjectsByTime.forEach((p) => {
      const val = Number(p.value || 0);
      totalRevenue += val;

      // Group by Month (using start_date) — store sort key for chronological ordering
      if (p.start_date) {
        const date = new Date(p.start_date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthName = date.toLocaleString("default", { month: "short", year: "2-digit" });
        const sortKey = year * 12 + month;
        if (!byMonth[monthName]) {
          byMonth[monthName] = { value: 0, sortKey };
        }
        byMonth[monthName].value += val;
      }

      // Group by Lead Source
      if (p.lead_source) {
        bySource[p.lead_source] = (bySource[p.lead_source] || 0) + val;
      }

      // Group by BD
      const bdName = p.bd?.full_name || "Self / Other";
      byBD[bdName] = (byBD[bdName] || 0) + val;
    });

    // Sort months chronologically
    const monthData = Object.entries(byMonth)
      .map(([name, { value, sortKey }]) => ({ name, value, sortKey }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ name, value }) => ({ name, value }));

    return {
      totalRevenue,
      monthData,
      sourceData: Object.entries(bySource)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      bdData: Object.entries(byBD)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [filteredProjectsByTime]);

  // 3. Resource Utilization Calculations
  const resourceMetrics = useMemo(() => {
    // Total employees in CRM
    const totalResources = allEmployees.length;

    // Calculate workload of each employee across all active projects
    const workloads: Record<string, { employee: Employee; workload: number; projectsCount: number }> = {};
    
    // Seed all active employees
    allEmployees.forEach((emp) => {
      if (emp.status === "active") {
        workloads[emp.id] = { employee: emp, workload: 0, projectsCount: 0 };
      }
    });

    filteredProjectsByTime.forEach((p) => {
      if (["Onboarding", "In Progress", "Maintenance"].includes(p.status)) {
        p.resources.forEach((r) => {
          if (workloads[r.employee_id]) {
            workloads[r.employee_id].workload += Number(r.allocation_percentage || 0);
            workloads[r.employee_id].projectsCount += 1;
          }
        });
      }
    });

    const workloadList = Object.values(workloads).sort((a, b) => b.workload - a.workload);
    
    let assignedCount = 0;
    workloadList.forEach((w) => {
      if (w.workload > 0) assignedCount++;
    });

    return {
      totalResources,
      assignedCount,
      availableCount: totalResources - assignedCount,
      workloads: workloadList,
    };
  }, [filteredProjectsByTime, allEmployees]);

  // 4. BD Performance Calculations
  const bdPerformanceData = useMemo(() => {
    const stats: Record<string, { name: string; closed: number; revenue: number; active: number; completed: number }> = {};

    filteredProjectsByTime.forEach((p) => {
      if (!p.bd_id) return;
      const bdName = p.bd?.full_name || "Unknown";
      
      if (!stats[p.bd_id]) {
        stats[p.bd_id] = { name: bdName, closed: 0, revenue: 0, active: 0, completed: 0 };
      }

      const row = stats[p.bd_id];
      row.closed += 1;
      row.revenue += Number(p.value || 0);
      
      if (["Onboarding", "In Progress", "Maintenance"].includes(p.status)) {
        row.active += 1;
      }
      if (p.status === "Completed") {
        row.completed += 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjectsByTime]);

  return (
    <div className="projects-module space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header and Controls */}
      <div className="pm-hero flex flex-col gap-4 sm:gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 sm:space-y-1.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient-brand">Project Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg truncate">Manage client projects, resource allocations, and view performance insights.</p>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
          {/* Tabs */}
          <div className="pm-tabs">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`pm-tab text-xs sm:text-sm ${activeTab === "dashboard" ? "pm-tab-active" : ""}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`pm-tab text-xs sm:text-sm ${activeTab === "list" ? "pm-tab-active" : ""}`}
            >
              Projects List ({filteredProjects.length})
            </button>
          </div>

          {/* Google Sheet sync – primary; Excel import kept as secondary */}
          {isAdmin && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ProjectSheetSyncControls syncMeta={syncMeta} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsImportOpen(true)}
                  className="text-xs text-muted-foreground"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Excel
                </Button>
              </div>
            </div>
          )}

          {/* Create Button – admin only */}
          {isAdmin ? (
            <Link href="/projects/new" className="flex items-center">
              <Button className="pm-btn-primary text-primary-foreground text-xs sm:text-sm">
                <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Project
              </Button>
            </Link>
          ) : isWritable ? (
            <Button
              disabled
              title="Only Admins can create new projects"
              className="pm-btn-primary opacity-50 cursor-not-allowed text-xs sm:text-sm"
            >
              <Lock className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Add Project
            </Button>
          ) : null}
        </div>
      </div>

      {/* ========================================================== */}
      {/* --- DASHBOARD TAB VIEW --- */}
      {/* ========================================================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Time Period Filter — Compact Dropdown */}
          <div className="flex items-center justify-end">
            <div className="relative" ref={timeDropdownRef}>
              <button
                onClick={() => setIsTimeDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl bg-card border border-border/40 hover:border-border/70 text-xs sm:text-sm font-medium text-foreground transition-all duration-200 hover:shadow-sm"
              >
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground text-[10px] sm:text-xs font-semibold">Period:</span>
                <span className="font-bold text-[10px] sm:text-xs">{timeFilterLabel}</span>
                <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground transition-transform duration-200 ${isTimeDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-2xl bg-card border border-border/40 shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-border/30">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Period</span>
                    <div className="flex items-center gap-1 bg-muted/40 rounded-lg px-1">
                      <button
                        onClick={() => setTimeFilterYear((y) => y - 1)}
                        className="h-5 w-5 sm:h-6 sm:w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </button>
                      <span className="text-[10px] sm:text-xs font-bold tabular-nums min-w-[32px] sm:min-w-[36px] text-center select-none">{timeFilterYear}</span>
                      <button
                        onClick={() => setTimeFilterYear((y) => y + 1)}
                        className="h-5 w-5 sm:h-6 sm:w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1 sm:mb-1.5">Quick Filters</p>
                    <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
                      {[
                        { value: "all", label: "All Time" },
                        { value: "month", label: "Current Month" },
                        { value: "year", label: "Full Year" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setTimeFilter(opt.value); setIsTimeDropdownOpen(false); }}
                          className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all duration-150 ${
                            timeFilter === opt.value
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-2 sm:px-3 pt-1.5 sm:pt-2 pb-1">
                    <div className="flex items-center bg-muted/30 rounded-lg p-0.5">
                      <button
                        onClick={() => setTimeFilterMode("quarter")}
                        className={`flex-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all duration-200 ${
                          timeFilterMode === "quarter"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Quarters
                      </button>
                      <button
                        onClick={() => setTimeFilterMode("month")}
                        className={`flex-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all duration-200 ${
                          timeFilterMode === "month"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Months
                      </button>
                    </div>
                  </div>

                  <div className="px-2 sm:px-3 pt-1.5 sm:pt-2 pb-2 sm:pb-3">
                    {timeFilterMode === "quarter" ? (
                      <>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1 sm:mb-1.5">Quarters</p>
                        <div className="grid grid-cols-2 gap-0.5 sm:gap-1">
                          {[
                            { value: "q1", label: "Q1", sub: "Jan – Mar" },
                            { value: "q2", label: "Q2", sub: "Apr – Jun" },
                            { value: "q3", label: "Q3", sub: "Jul – Sep" },
                            { value: "q4", label: "Q4", sub: "Oct – Dec" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => { setTimeFilter(opt.value); setIsTimeDropdownOpen(false); }}
                              className={`flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-left transition-all duration-150 ${
                                timeFilter === opt.value
                                  ? "bg-primary/10 border border-primary/20 text-primary"
                                  : "bg-muted/20 hover:bg-muted/40 border border-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="text-[10px] sm:text-xs font-bold">{opt.label}</span>
                              <span className="text-[9px] sm:text-[10px] font-medium opacity-60">{opt.sub}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1 sm:mb-1.5">Months</p>
                        <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
                          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                            <button
                              key={m}
                              onClick={() => { setTimeFilter(String(i + 1)); setIsTimeDropdownOpen(false); }}
                              className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all duration-150 ${
                                timeFilter === String(i + 1)
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 1. Metric Strip */}
          <MetricStrip
            activeFilter={kpiFilter}
            onFilterChange={(f) => { setKpiFilter(f); setActiveTab("list"); }}
            metrics={[
              { label: "Total Projects", value: metrics.total, icon: LayoutGrid, color: "primary" },
              { label: "Active", value: metrics.active, icon: TrendingUp, color: "blue" },
              { label: "On Hold", value: metrics.onHold, icon: Clock, color: "amber" },
              { label: "Completed", value: metrics.completed, icon: CheckCircle2, color: "green" },
              { label: "Retainers", value: metrics.monthlyRecurring, icon: Repeat2, color: "violet" },
              { label: "Total Value", value: `$${metrics.totalValue.toLocaleString()}`, icon: DollarSign, color: "primary" },
            ]}
          />

          {/* Charts grid */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
            {/* ── Donut: Project Status Breakdown ── */}
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="pb-0 pt-6 px-6">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">Project Status Breakdown</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Status share of all active and completed projects</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col sm:flex-row items-center justify-center p-6 gap-8">
                {statusChartData.length > 0 ? (
                  <>
                    <div className="relative w-48 h-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="transparent"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip suffix=" projects" />} cursor={{ fill: 'transparent' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black tabular-nums text-foreground">{filteredProjectsByTime.length}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Total</span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                      {statusChartData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            <span className="text-sm font-medium text-muted-foreground">{entry.name}</span>
                          </div>
                          <span className="text-sm font-bold tabular-nums text-foreground">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No project data available</div>
                )}
              </CardContent>
            </Card>

            {/* ── Area: Monthly Revenue Timeline ── */}
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl flex flex-col overflow-hidden">
              <CardHeader className="pb-0 pt-6 px-6">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">Monthly Revenue Timeline</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Revenue incoming grouped by project start date</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-4 pb-2 px-2">
                {revenueMetrics.monthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenueMetrics.monthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e5a158" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#e5a158" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="currentColor"
                        className="text-muted-foreground/10"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
                        className="text-muted-foreground"
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
                        className="text-muted-foreground"
                        tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                      />
                      <Tooltip content={<ChartTooltip prefix="$" />} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', className: 'text-muted-foreground/30' }} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Revenue"
                        stroke="#e5a158"
                        strokeWidth={2}
                        fill="url(#gradRevenue)"
                        dot={{ r: 0 }}
                        activeDot={{
                          r: 5,
                          fill: "#e5a158",
                          stroke: "var(--background)",
                          strokeWidth: 2,
                        }}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No start date timeline available</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* ── Bar: Revenue by Lead Source ── */}
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl flex flex-col overflow-hidden">
              <CardHeader className="pb-0 pt-6 px-6">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">Revenue by Lead Source</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Financial volume generated by origin source</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-4 pb-2 px-2">
                {revenueMetrics.sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={revenueMetrics.sourceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="currentColor"
                        className="text-muted-foreground/10"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
                        className="text-muted-foreground"
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }}
                        className="text-muted-foreground"
                        tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                      />
                      <Tooltip content={<ChartTooltip prefix="$" />} cursor={{ fill: 'currentColor', className: 'text-muted-foreground/5' }} />
                      <Bar
                        dataKey="value"
                        name="Revenue"
                        barSize={24}
                        fill="url(#barGrad)"
                        radius={[4, 4, 0, 0]}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No lead source financial data</div>
                )}
              </CardContent>
            </Card>


            {/* ── Resource Allocation ── */}
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl flex flex-col overflow-hidden">
              <CardHeader className="pb-4 pt-6 px-6 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Resource Allocation</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">Assigned workload vs remaining capacity</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1">
                    <span className="text-sm font-bold text-primary">{resourceMetrics.assignedCount}</span>
                    <span className="text-xs font-semibold text-primary/70">/ {resourceMetrics.totalResources} Active</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto max-h-[260px]">
                <div className="flex flex-col">
                  {resourceMetrics.workloads.slice(0, 8).map((item, i) => {
                    const pct = Math.min(item.workload, 100);
                    let statusColor = "bg-emerald-500";
                    let textColor = "text-emerald-600 dark:text-emerald-400";
                    if (item.workload > 100) {
                      statusColor = "bg-red-500";
                      textColor = "text-red-600 dark:text-red-400";
                    } else if (item.workload >= 80) {
                      statusColor = "bg-amber-500";
                      textColor = "text-amber-600 dark:text-amber-400";
                    }

                    return (
                      <div key={item.employee.id} className={cn(
                        "flex items-center justify-between p-4 transition-colors hover:bg-muted/30",
                        i !== 0 && "border-t border-border/30"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shadow-sm">
                            {item.employee.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{item.employee.full_name}</span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {item.projectsCount} active {item.projectsCount === 1 ? "project" : "projects"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Sleek track bar */}
                          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-1000 ease-out", statusColor)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={cn("text-sm font-bold tabular-nums w-12 text-right", textColor)}>
                            {item.workload}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BD Performance Dashboard Table */}
          {bdPerformanceData.length > 0 && (
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden mt-6">
              <CardHeader className="pb-4 pt-6 px-6 border-b border-border/30">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">Business Development Performance</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Metrics on deals closed, revenue generated, and active pipelines</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/20">
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-6 w-[30%]">Representative</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-4 text-center w-[17%]">Closed Won</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-6 text-right w-[23%]">Total Revenue</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-4 text-center w-[15%]">Active Deals</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-6 text-center w-[15%]">Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bdPerformanceData.map((row) => (
                        <TableRow key={row.name} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 px-6 font-semibold text-sm text-foreground">{row.name}</TableCell>
                          <TableCell className="py-4 px-4 text-center font-bold font-mono text-sm tabular-nums text-foreground/80">{row.closed}</TableCell>
                          <TableCell className="py-4 px-6 text-right font-bold font-mono text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                            ${row.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[32px]">{row.active}</span>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-center">
                            <span className="inline-flex items-center justify-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 min-w-[32px]">{row.completed}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* --- PROJECTS LIST TAB VIEW --- */}
      {/* ========================================================== */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Active KPI filter banner */}
          {kpiFilter && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Filtered by: <span className="font-bold text-primary">
                    {kpiFilter === "active" && "Active Projects"}
                    {kpiFilter === "on_hold" && "On Hold"}
                    {kpiFilter === "completed" && "Completed"}
                    {kpiFilter === "retainers" && "Monthly Retainers"}
                  </span>
                  <span className="text-muted-foreground ml-1.5">({filteredProjects.length} results)</span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setKpiFilter(null)}
                className="h-7 gap-1 text-xs"
              >
                <X className="h-3 w-3" /> Clear
              </Button>
            </div>
          )}

          {/* Filters Bar */}
          <Card className="pm-filter-card">
            <CardContent className="pt-4 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by Project Name or Client..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pm-search"
                  />
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="pm-btn-outline flex items-center gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {showFilters ? "Hide" : "Show"}
                </Button>
              </div>

              {/* Extended filters */}
              {showFilters && (
                <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] pm-filter-panel">
                  {/* Status Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="Lead Won">Lead Won</SelectItem>
                        <SelectItem value="Onboarding">Onboarding</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Client</Label>
                    <Select value={clientFilter} onValueChange={(val) => { setClientFilter(val || "ALL"); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Clients</SelectItem>
                        {uniqueClients.map((client) => (
                          <SelectItem key={client} value={client}>
                            {client}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Industry Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Industry</Label>
                    <Select value={industryFilter} onValueChange={(val) => { setIndustryFilter(val || "ALL"); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Industries</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Restaurant">Restaurant</SelectItem>
                        <SelectItem value="Hotel">Hotel</SelectItem>
                        <SelectItem value="E-commerce">E-commerce</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* BD Rep Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">BD Representative</Label>
                    <Select
                      value={bdFilter}
                      onValueChange={(val) => { setBdFilter(val || "ALL"); setCurrentPage(1); }}
                      items={[
                        { value: "ALL", label: "All BD Reps" },
                        ...allEmployees
                          .filter((e) => e.pm_role === "bd" || e.pm_role === "admin")
                          .map((bd) => ({ value: bd.id, label: bd.full_name }))
                      ]}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select BD" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All BD Reps</SelectItem>
                        {allEmployees
                          .filter((e) => e.pm_role === "bd" || e.pm_role === "admin")
                          .map((bd) => (
                            <SelectItem key={bd.id} value={bd.id}>
                              {bd.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assigned Resource Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Resource</Label>
                    <Select
                      value={resourceFilter}
                      onValueChange={(val) => { setResourceFilter(val || "ALL"); setCurrentPage(1); }}
                      items={[
                        { value: "ALL", label: "All Resources" },
                        ...allEmployees.map((emp) => ({ value: emp.id, label: emp.full_name }))
                      ]}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Resource" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Resources</SelectItem>
                        {allEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lead Source Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Lead Source</Label>
                    <Select value={leadSourceFilter} onValueChange={(val) => { setLeadSourceFilter(val || "ALL"); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Sources</SelectItem>
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

                  {/* Date range from */}
                  <div className="space-y-1 col-span-1 sm:col-span-2">
                    <Label className="text-xs">Start Date Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={startDateFrom}
                        onChange={(e) => {
                          setStartDateFrom(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="h-9 text-xs"
                      />
                      <span className="self-center text-muted-foreground text-xs">to</span>
                      <Input
                        type="date"
                        value={startDateTo}
                        onChange={(e) => {
                          setStartDateTo(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card className="pm-table-card overflow-hidden">
            <div className="overflow-x-auto">
              <div className="px-4 py-1" style={{ minWidth: '900px' }}>
              <Table className="pm-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      {/* First col: extra left padding for edge clearance */}
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 pl-4 pr-3 whitespace-nowrap w-[11%]">Client</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[13%]">Project</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[7%]">Type</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 text-right whitespace-nowrap w-[8%]">Value</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[7%]">Payment</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[6%]">Start</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[6%]">Rate</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[11%]">Status</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 text-right whitespace-nowrap w-[6%]">MRR</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[9%]">Resource</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[7%]">Profile</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[6%]">BD</TableHead>
                      {/* Last col: extra right padding for edge clearance */}
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 pl-3 pr-4 whitespace-nowrap w-[7%]">End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProjects.length > 0 ? (
                      paginatedProjects.map((p) => (
                        <TableRow
                          key={p.id}
                          onClick={() => router.push(`/projects/${p.id}`)}
                          className="cursor-pointer group border-b border-border/20 hover:bg-muted/30"
                        >
                          <TableCell className="py-2.5 pl-4 pr-3 max-w-0 truncate text-[13px] font-medium group-hover:text-primary transition-colors">{p.client_name}</TableCell>
                          <TableCell className="py-2.5 px-3 max-w-0 truncate text-[13px]">{p.name}</TableCell>
                          <TableCell className="py-2.5 px-3 max-w-0 truncate text-xs text-muted-foreground" title={[p.project_type, p.business_model].filter(Boolean).join(" · ")}>
                            {[p.project_type, p.business_model].filter(Boolean).join(" · ") || "—"}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right font-semibold font-mono text-foreground tabular-nums text-[13px] whitespace-nowrap">
                            {Number(p.value || 0) > 0 ? `$${Number(p.value).toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 max-w-0 truncate text-xs text-muted-foreground">{p.payment_structure || "—"}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {p.start_date ? new Date(p.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 max-w-0 truncate text-xs text-muted-foreground" title={p.project_rate || undefined}>{p.project_rate || "—"}</TableCell>
                          <TableCell className="py-2.5 px-3 overflow-hidden">
                            {getStatusBadge(p.status)}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                            {p.expected_monthly_revenue ? `$${Number(p.expected_monthly_revenue).toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell
                            className="py-2.5 px-3 max-w-0 truncate text-xs text-muted-foreground"
                            title={
                              p.assigned_resource_label ||
                              p.resources.map((r) => r.employee.full_name).join(", ") ||
                              undefined
                            }
                          >
                            {p.assigned_resource_label ||
                              (p.resources.length > 0
                                ? p.resources.map((r) => r.employee.full_name.split(" ")[0]).join(", ")
                                : "—")}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 max-w-0 truncate text-xs text-muted-foreground" title={p.profile_name || undefined}>{p.profile_name || "—"}</TableCell>
                          <TableCell
                            className="py-2.5 px-3 max-w-0 truncate text-xs text-muted-foreground"
                            title={p.assigned_bd_label || p.bd?.full_name || undefined}
                          >
                            {p.assigned_bd_label || p.bd?.full_name?.split(" ")[0] || "—"}
                          </TableCell>
                          <TableCell className="py-2.5 pl-3 pr-4 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {p.expected_delivery_date
                              ? new Date(p.expected_delivery_date + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={13} className="h-40 text-center">
                          <div className="pm-empty-state">
                            <FolderOpen className="pm-empty-icon" />
                            <p className="text-sm font-medium text-muted-foreground">No projects found</p>
                            <p className="text-xs text-muted-foreground/70">
                              {search || statusFilter !== "ALL" || clientFilter !== "ALL"
                                ? "Try clearing your filters to see all projects."
                                : isAdmin
                                ? "Get started by adding your first project."
                                : "No projects have been assigned to you yet."}
                            </p>
                            {isAdmin && !search && statusFilter === "ALL" && clientFilter === "ALL" && (
                              <Link href="/projects/new" className="mt-1">
                                <Button size="sm" className="pm-btn-primary text-primary-foreground">
                                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Project
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3 px-1">
              <span className="text-xs text-muted-foreground">
                Showing page {currentPage} of {totalPages} ({filteredProjects.length} total projects)
              </span>
              <div className="pm-pagination">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                  disabled={currentPage === 1}
                  className="pm-pagination-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="pm-pagination-current">{currentPage}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pm-pagination-btn"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        allEmployees={allEmployees}
        existingProjects={initialProjects}
        onImportSuccess={() => router.refresh()}
      />
    </div>
  );
}

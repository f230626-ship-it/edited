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
  Gauge,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/actions/projects";
import { ImportDialog } from "@/components/projects/import-dialog";
import { ProjectSheetSyncControls } from "@/components/projects/project-sheet-sync";
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
      return <span className={`${baseClass} bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/5`}>Active</span>;
    case "On Hold":
      return <span className={`${baseClass} bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400 dark:bg-orange-500/5`}>On Hold</span>;
    case "Completed":
      return <span className={`${baseClass} bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 dark:bg-green-500/5`}>Ended</span>;
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

/** Sheet-facing lifecycle buckets */
/** Sheet "Active" maps to In Progress — used for MRR / portfolio metrics */
const SHEET_ACTIVE_STATUSES = ["In Progress"] as const;
/** Broader ops bucket for list filters (includes onboarding & maintenance) */
const ACTIVE_STATUSES = ["In Progress", "Onboarding", "Maintenance"] as const;
const PAUSED_STATUSES = ["Paused", "On Hold"] as const;
const ENDED_STATUSES = ["Completed"] as const;

function matchesStatusBucket(status: string, filter: string): boolean {
  if (filter === "ALL") return true;
  if (filter === "Active") return (ACTIVE_STATUSES as readonly string[]).includes(status);
  if (filter === "Paused") return (PAUSED_STATUSES as readonly string[]).includes(status);
  if (filter === "Ended") return (ENDED_STATUSES as readonly string[]).includes(status);
  return status === filter;
}

/** Sheet notes that are not real BD / closer / resource people. */
const JUNK_PERSON_LABELS = new Set([
  "none",
  "null",
  "n/a",
  "na",
  "-",
  "--",
  "tbd",
  "unknown",
  "unassigned",
  "self",
  "other",
  "reference",
  "referral",
  "upsell",
  "up sell",
  "internal",
  "outsource",
  "outsourced",
]);

function isJunkPersonLabel(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true;
  const v = raw.trim().toLowerCase();
  if (JUNK_PERSON_LABELS.has(v)) return true;
  // Notes like "Irfan 50% share", "Looking for GHL", "Outsource to X"
  if (/%|\bshare\b|\blooking for\b|\boutsource\b/.test(v) && !/^[a-z][a-z\s.'-]{1,40}$/i.test(raw.trim())) {
    // still allow if it starts with a clear person token — handled by resolver
  }
  if (v === "reference" || v.includes("reference only")) return true;
  if (/^(upsell|reference|none)\b/.test(v)) return true;
  return false;
}

function resolvePersonFromLabel(
  label: string | null | undefined,
  employees: Employee[],
  options?: { preferNonBd?: boolean }
): { id: string | null; name: string } | null {
  const raw = (label || "").trim();
  if (!raw || isJunkPersonLabel(raw)) return null;
  if (options?.preferNonBd && /\boutsource\b/i.test(raw)) return null;

  const aliases: Record<string, string[]> = {
    moin: ["moin", "moeen"],
    moeen: ["moeen", "moin"],
  };

  const lower = raw.toLowerCase();
  const cleaned = raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+\s*%/g, " ")
    .replace(/\b(share|upsell|reference|outsource(d)?|to)\b/gi, " ")
    .replace(/[+/,;|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || isJunkPersonLabel(cleaned)) return null;

  const tokens = new Set<string>([lower, cleaned.toLowerCase()]);
  for (const t of [...tokens]) {
    for (const a of aliases[t] || []) tokens.add(a);
  }

  const ranked = [...employees].sort((a, b) => {
    if (!options?.preferNonBd) return 0;
    const score = (e: Employee) =>
      e.pm_role === "bd" ? 2 : e.pm_role === "developer" || e.pm_role === "admin" ? 0 : 1;
    return score(a) - score(b);
  });

  for (const candidate of tokens) {
    const exact = ranked.find((e) => e.full_name.toLowerCase().trim() === candidate);
    if (exact) return { id: exact.id, name: exact.full_name };

    const byFirst = ranked.find(
      (e) => e.full_name.toLowerCase().split(/\s+/)[0] === candidate
    );
    if (byFirst) return { id: byFirst.id, name: byFirst.full_name };
  }

  let best: { id: string; name: string; len: number; rank: number } | null = null;
  for (const e of ranked) {
    const rank =
      options?.preferNonBd && e.pm_role === "bd"
        ? 2
        : options?.preferNonBd && (e.pm_role === "developer" || e.pm_role === "admin")
          ? 0
          : 1;
    for (const part of e.full_name.toLowerCase().split(/\s+/)) {
      if (part.length < 3) continue;
      const re = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(cleaned) && (!best || part.length > best.len || (part.length === best.len && rank < best.rank))) {
        best = { id: e.id, name: e.full_name, len: part.length, rank };
      }
    }
  }
  if (best) return { id: best.id, name: best.name };

  // Only accept cleaned label if it looks like a person name (2–40 letters/spaces)
  if (/^[A-Za-z][A-Za-z .'-]{1,39}$/.test(cleaned) && cleaned.split(/\s+/).length <= 4) {
    // Canonicalize Moin → Moeen for display when unmatched
    const display =
      cleaned.toLowerCase() === "moin" ? "Moeen" : cleaned;
    return { id: null, name: display };
  }
  return null;
}

/** Resolve closing developer from FK + sheet closer label only (never BD / resource). */
function resolveCloser(
  project: {
    closer_label?: string | null;
    closing_developer_id?: string | null;
    closing_developer?: Pick<Employee, "id" | "full_name" | "pm_role"> | null;
  },
  employees: Employee[]
): { id: string | null; name: string } | null {
  if (project.closing_developer_id) {
    const emp =
      employees.find((e) => e.id === project.closing_developer_id) ||
      (project.closing_developer as Employee | undefined) ||
      null;
    // Reject BD wrongly stored as closer
    if (emp && emp.pm_role !== "bd") {
      return { id: emp.id, name: emp.full_name };
    }
  }
  return resolvePersonFromLabel(project.closer_label, employees, { preferNonBd: true });
}

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
    closing_developer?: Pick<Employee, "id" | "full_name" | "email"> | null;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Only pm_role='admin' can create projects (coordinators can edit but not create)
  const isAdmin = currentEmployee.pm_role === "admin" || currentEmployee.role === "admin";
  // Both admin and coordinator can edit/delete
  const isWritable = currentEmployee.pm_role === "admin" || currentEmployee.pm_role === "coordinator";

  async function handleDeleteProject(projectId: string, projectName: string) {
    const ok = window.confirm(
      `Delete project "${projectName}" permanently? This cannot be undone.`
    );
    if (!ok) return;
    setDeletingId(projectId);
    try {
      const result = await deleteProject(projectId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Project deleted.");
      router.refresh();
    } catch {
      toast.error("Failed to delete project.");
    } finally {
      setDeletingId(null);
    }
  }

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
      const matchesStatus = matchesStatusBucket(p.status, statusFilter);
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

      // KPI filter — Active / With MRR only count sheet Active (= In Progress)
      let matchesKpi = true;
      if (kpiFilter === "active") {
        matchesKpi = (SHEET_ACTIVE_STATUSES as readonly string[]).includes(p.status);
      } else if (kpiFilter === "on_hold") {
        matchesKpi = (PAUSED_STATUSES as readonly string[]).includes(p.status);
      } else if (kpiFilter === "completed") {
        matchesKpi = (ENDED_STATUSES as readonly string[]).includes(p.status);
      } else if (kpiFilter === "retainers") {
        matchesKpi =
          (SHEET_ACTIVE_STATUSES as readonly string[]).includes(p.status) &&
          Number(p.expected_monthly_revenue || 0) > 0;
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
  // Portfolio MRR uses the *current* active set (sheet Active = In Progress),
  // not the time filter. Time filter is for acquisition / started-in-period views.
  const metrics = useMemo(() => {
    const portfolio = initialProjects;
    const sheetActive = portfolio.filter((p) =>
      (SHEET_ACTIVE_STATUSES as readonly string[]).includes(p.status)
    );
    const periodProjects = filteredProjectsByTime;

    let paused = 0;
    let ended = 0;
    periodProjects.forEach((p) => {
      if ((PAUSED_STATUSES as readonly string[]).includes(p.status)) paused += 1;
      if ((ENDED_STATUSES as readonly string[]).includes(p.status)) ended += 1;
    });

    let monthlyEstimatedRevenue = 0;
    let activeWithMrr = 0;
    sheetActive.forEach((p) => {
      const mrr = Number(p.expected_monthly_revenue || 0);
      if (mrr > 0) {
        monthlyEstimatedRevenue += mrr;
        activeWithMrr += 1;
      }
    });

    const activeResourceIds = new Set<string>();
    sheetActive.forEach((p) => {
      p.resources.forEach((r) => activeResourceIds.add(r.employee_id));
      if (p.closing_developer_id) activeResourceIds.add(p.closing_developer_id);
    });

    return {
      total: periodProjects.length,
      active: sheetActive.length,
      paused,
      ended,
      monthlyEstimatedRevenue,
      activeWithMrr,
      avgActiveMrr:
        activeWithMrr > 0 ? Math.round(monthlyEstimatedRevenue / activeWithMrr) : 0,
      totalActiveResources: activeResourceIds.size,
      onHold: paused,
      completed: ended,
      monthlyRecurring: activeWithMrr,
      totalValue: monthlyEstimatedRevenue,
    };
  }, [initialProjects, filteredProjectsByTime]);

  /** Dashboard scope: sheet Active (= In Progress) for MRR table */
  const activeDashboardProjects = useMemo(
    () =>
      initialProjects.filter((p) =>
        (SHEET_ACTIVE_STATUSES as readonly string[]).includes(p.status)
      ),
    [initialProjects]
  );

  // 1. Project Status Chart Data
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProjectsByTime.forEach((p) => {
      const label =
        p.status === "In Progress"
          ? "Active"
          : p.status === "Completed"
            ? "Ended"
            : p.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredProjectsByTime]);

  // 2. Revenue Dashboard — active projects, monthly estimated revenue
  const revenueMetrics = useMemo(() => {
    let totalRevenue = 0;
    const byMonth: Record<string, { value: number; sortKey: number }> = {};
    const bySource: Record<string, number> = {};
    const byBD: Record<string, number> = {};

    activeDashboardProjects.forEach((p) => {
      const val = Number(p.expected_monthly_revenue || 0);
      totalRevenue += val;

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

      if (p.lead_source) {
        bySource[p.lead_source] = (bySource[p.lead_source] || 0) + val;
      }

      const bdName = p.assigned_bd_label || p.bd?.full_name || "Self / Other";
      byBD[bdName] = (byBD[bdName] || 0) + val;
    });

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
  }, [activeDashboardProjects]);

  // 3. Resource Utilization — prefer project_resources, fall back to sheet labels / closer
  const resourceMetrics = useMemo(() => {
    type WorkloadRow = {
      id: string;
      name: string;
      workload: number;
      projectsCount: number;
      employee: Employee | null;
    };

    const workloads: Record<string, WorkloadRow> = {};

    const ensure = (id: string, name: string, employee: Employee | null = null) => {
      if (!workloads[id]) {
        workloads[id] = { id, name, workload: 0, projectsCount: 0, employee };
      } else if (!workloads[id].employee && employee) {
        workloads[id].employee = employee;
        workloads[id].name = employee.full_name;
      }
      return workloads[id];
    };

    allEmployees.forEach((emp) => {
      if (emp.status === "active") {
        ensure(emp.id, emp.full_name, emp);
      }
    });

    const running = activeDashboardProjects;

    running.forEach((p) => {
      const resourceRows = (p.resources || []).filter((r) => r.employee_id);
      if (resourceRows.length > 0) {
        resourceRows.forEach((r) => {
          const emp =
            allEmployees.find((e) => e.id === r.employee_id) ||
            (r.employee as Employee | undefined) ||
            null;
          const row = ensure(
            r.employee_id,
            emp?.full_name || "Unknown",
            emp
          );
          row.workload += Number(r.allocation_percentage || Math.floor(100 / resourceRows.length));
          row.projectsCount += 1;
        });
        return;
      }

      // Sheet fallback: resource label only (closer is a different role — not workload)
      const assignees: { id: string; name: string; employee: Employee | null }[] = [];
      if (p.assigned_resource_label?.trim()) {
        const matched = resolvePersonFromLabel(p.assigned_resource_label, allEmployees);
        if (matched) {
          assignees.push({
            id: matched.id || `label:${matched.name.toLowerCase()}`,
            name: matched.name,
            employee: matched.id
              ? allEmployees.find((e) => e.id === matched.id) || null
              : null,
          });
        }
      }

      if (assignees.length === 0) return;
      const share = Math.floor(100 / assignees.length);
      assignees.forEach((a) => {
        const row = ensure(a.id, a.name, a.employee);
        row.workload += share;
        row.projectsCount += 1;
      });
    });

    const workloadList = Object.values(workloads).sort(
      (a, b) => b.workload - a.workload || b.projectsCount - a.projectsCount
    );
    const assignedCount = workloadList.filter((w) => w.projectsCount > 0).length;
    const totalResources = allEmployees.filter((e) => e.status === "active").length;

    return {
      totalResources,
      assignedCount,
      availableCount: Math.max(0, totalResources - assignedCount),
      workloads: workloadList,
    };
  }, [activeDashboardProjects, allEmployees]);

  // Projects running per outreach/sales profile (sheet "Profile Name")
  const profileRunningData = useMemo(() => {
    const map = new Map<string, { profile: string; running: number; value: number; mrr: number }>();
    activeDashboardProjects.forEach((p) => {
      const profile = (p.profile_name || "").trim() || "Unassigned profile";
      const current = map.get(profile) || { profile, running: 0, value: 0, mrr: 0 };
      current.running += 1;
      current.value += Number(p.value || 0);
      current.mrr += Number(p.expected_monthly_revenue || 0);
      map.set(profile, current);
    });
    return Array.from(map.values()).sort((a, b) => b.mrr - a.mrr || b.running - a.running);
  }, [activeDashboardProjects]);

  // 4. BD Performance — active pipeline only (ended deals stay on Projects List)
  const bdPerformanceData = useMemo(() => {
    const stats: Record<string, { name: string; closed: number; revenue: number; active: number; completed: number }> = {};

    activeDashboardProjects.forEach((p) => {
      const matched =
        (p.bd_id && p.bd?.full_name
          ? { id: p.bd_id, name: p.bd.full_name }
          : null) ||
        resolvePersonFromLabel(p.assigned_bd_label, allEmployees) ||
        resolvePersonFromLabel(p.bd?.full_name, allEmployees);

      // Skip sheet notes like "Reference", "None", "Irfan 50% share" when unmatched
      if (!matched) return;

      const key = matched.id || `name:${matched.name.toLowerCase()}`;
      if (!stats[key]) {
        stats[key] = { name: matched.name, closed: 0, revenue: 0, active: 0, completed: 0 };
      }

      const row = stats[key];
      row.closed += 1;
      row.active += 1;
      row.revenue += Number(p.expected_monthly_revenue || 0);
    });

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue || b.active - a.active);
  }, [activeDashboardProjects, allEmployees]);

  const visibilityMetrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const runningStatuses = new Set(["Onboarding", "In Progress", "Maintenance"]);
    const completedStatuses = new Set(["Completed"]);
    const closedOwnerMap = new Map<string, { count: number; value: number }>();

    let runningCount = 0;
    let totalRunningDurationDays = 0;
    let healthyCount = 0;
    let atRiskCount = 0;
    let criticalCount = 0;
    let overdueCount = 0;
    let closedThisMonth = 0;
    let cycleTimeSum = 0;
    let cycleTimeCount = 0;

    filteredProjectsByTime.forEach((project) => {
      const start = project.start_date ? new Date(project.start_date) : null;
      const expected = project.expected_delivery_date
        ? new Date(project.expected_delivery_date)
        : null;
      const end =
        project.actual_delivery_date
          ? new Date(project.actual_delivery_date)
          : expected;
      const progress = Number(project.progress_percentage || 0);
      const value = Number(project.value || 0);

      if (runningStatuses.has(project.status)) {
        runningCount += 1;

        if (start && Number.isFinite(start.getTime())) {
          const runningDays = Math.max(
            0,
            Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          );
          totalRunningDurationDays += runningDays;
        }

        let health: "healthy" | "atRisk" | "critical" = "healthy";
        if (project.status === "On Hold") {
          health = "critical";
        } else if (start && expected && expected < now) {
          health = "critical";
          overdueCount += 1;
        } else if (start && expected && expected > start) {
          const totalPlanDays = Math.max(
            1,
            Math.floor((expected.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          );
          const elapsedDays = Math.max(
            0,
            Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          );
          const expectedProgress = Math.min(100, (elapsedDays / totalPlanDays) * 100);
          if (progress + 10 < expectedProgress) {
            health = expectedProgress - progress > 25 ? "critical" : "atRisk";
          }
        }

        if (health === "healthy") healthyCount += 1;
        if (health === "atRisk") atRiskCount += 1;
        if (health === "critical") criticalCount += 1;
      }

      if (completedStatuses.has(project.status)) {
        const closer = resolveCloser(project, allEmployees);
        // Only credit real closers (devs). Never fall back to BD / resource labels.
        if (closer) {
          const owner = closer.name;
          const current = closedOwnerMap.get(owner) || { count: 0, value: 0 };
          current.count += 1;
          current.value += value;
          closedOwnerMap.set(owner, current);
        }

        const closeDate =
          project.actual_delivery_date
            ? new Date(project.actual_delivery_date)
            : project.expected_delivery_date
              ? new Date(project.expected_delivery_date)
              : project.updated_at
                ? new Date(project.updated_at)
                : null;
        if (closeDate && closeDate >= monthStart && closeDate <= now) {
          closedThisMonth += 1;
        }

        if (start && end && end >= start) {
          cycleTimeSum += Math.max(
            0,
            Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          );
          cycleTimeCount += 1;
        }
      }
    });

    const closedByOwner = Array.from(closedOwnerMap.entries())
      .map(([owner, stats]) => ({ owner, ...stats }))
      .sort((a, b) => b.count - a.count || b.value - a.value);

    const topCloser = closedByOwner[0] ?? null;

    return {
      runningCount,
      avgRunningDurationDays:
        runningCount > 0 ? Math.round(totalRunningDurationDays / runningCount) : 0,
      healthyCount,
      atRiskCount,
      criticalCount,
      overdueCount,
      closedThisMonth,
      avgCycleTimeDays:
        cycleTimeCount > 0 ? Math.round(cycleTimeSum / cycleTimeCount) : 0,
      topCloser,
      closedByOwner,
    };
  }, [filteredProjectsByTime, allEmployees]);

  return (
    <div className="projects-module space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header and Controls — plain div avoids framer-motion SSR style hydration mismatch */}
      <div className="pm-hero rounded-2xl border border-border/50 bg-card/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient-brand">
                Project Management
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Complete visibility from Google Sheet: project health, running duration, closer ownership, and delivery performance.
              </p>
            </div>

            {/* Add Project — always visible, never packed into the sync row */}
            <div className="shrink-0">
              {isAdmin ? (
                <Link href="/projects/new">
                  <Button className="pm-btn-primary text-primary-foreground shadow-md shadow-primary/20 w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Project
                  </Button>
                </Link>
              ) : isWritable ? (
                <Button
                  disabled
                  title="Only Admins can create new projects"
                  className="pm-btn-primary opacity-50 cursor-not-allowed w-full sm:w-auto"
                >
                  <Lock className="mr-2 h-3.5 w-3.5" /> Add Project
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="pm-tabs">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`pm-tab text-xs sm:text-sm ${activeTab === "dashboard" ? "pm-tab-active" : ""}`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`pm-tab text-xs sm:text-sm ${activeTab === "list" ? "pm-tab-active" : ""}`}
              >
                Projects List ({filteredProjects.length})
              </button>
            </div>
          </div>

          {/* Google Sheet sync – primary; Excel import kept as secondary */}
          {isAdmin && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/50 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Synced dashboard from Google Sheet
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <ProjectSheetSyncControls syncMeta={syncMeta} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsImportOpen(true)}
                  className="text-xs text-muted-foreground shrink-0"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Excel
                </Button>
              </div>
            </div>
          )}
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

          {/* Active portfolio metrics */}
          <MetricStrip
            activeFilter={kpiFilter}
            onFilterChange={(f) => { setKpiFilter(f); setActiveTab("list"); }}
            metrics={[
              { label: "Active Projects", value: metrics.active, icon: TrendingUp, color: "blue" },
              { label: "Est. Monthly Rev", value: `$${metrics.monthlyEstimatedRevenue.toLocaleString()}`, icon: DollarSign, color: "primary" },
              { label: "With MRR", value: metrics.activeWithMrr, icon: Repeat2, color: "violet" },
              { label: "Avg MRR", value: `$${metrics.avgActiveMrr.toLocaleString()}`, icon: Gauge, color: "green" },
              { label: "Paused", value: metrics.paused, icon: Clock, color: "amber" },
              { label: "Ended", value: metrics.ended, icon: CheckCircle2, color: "green" },
            ]}
          />

          {/* Active projects + monthly estimated revenue */}
          <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 pt-6 px-6 border-b border-border/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                    Active Projects · Monthly Estimated Revenue
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Current sheet Active (In Progress) · sum of Expected Monthly Revenue — not filtered by start month
                  </CardDescription>
                </div>
                <div className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-bold text-primary tabular-nums">
                  ${metrics.monthlyEstimatedRevenue.toLocaleString()}
                  <span className="ml-1 text-xs font-semibold text-primary/70">/ mo</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/20">
                    <TableHead className="font-semibold text-xs uppercase text-muted-foreground py-3 px-6">Client / Project</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-muted-foreground py-3 px-4">Closer</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-muted-foreground py-3 px-4">Resource</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-muted-foreground py-3 px-4">Profile</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-muted-foreground py-3 px-4">Platform</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-muted-foreground py-3 px-6 text-right">Est. MRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDashboardProjects.length > 0 ? (
                    activeDashboardProjects.map((p) => (
                      <TableRow
                        key={p.id}
                        className="border-b border-border/20 hover:bg-muted/30 cursor-pointer"
                        onClick={() => router.push(`/projects/${p.id}`)}
                      >
                        <TableCell className="py-3 px-6">
                          <div className="font-semibold text-sm">{p.client_name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">{p.name}</div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {resolveCloser(p, allEmployees)?.name || "—"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                          {p.assigned_resource_label || "—"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                          {p.profile_name || "—"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                          {p.lead_source || "—"}
                        </TableCell>
                        <TableCell className="py-3 px-6 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(p.expected_monthly_revenue || 0) > 0
                            ? `$${Number(p.expected_monthly_revenue).toLocaleString()}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        No active projects in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {visibilityMetrics.closedByOwner.length > 0 && (
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 pt-6 px-6 border-b border-border/30">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                  Which Person Closed Which Project
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Closed projects credited to the Closer column (developers only)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/20">
                      <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-6">Person</TableHead>
                      <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-4 text-center">Closed Projects</TableHead>
                      <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-6 text-right">Closed Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibilityMetrics.closedByOwner.slice(0, 8).map((row) => (
                      <TableRow key={row.owner} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3 px-6 font-medium text-sm">{row.owner}</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold tabular-nums">{row.count}</TableCell>
                        <TableCell className="py-3 px-6 text-right font-semibold tabular-nums">
                          ${row.value.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

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
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">Monthly Estimated Revenue Timeline</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Active projects only · Expected Monthly Revenue by start month</CardDescription>
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
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">Revenue by Platform</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Active projects · estimated monthly revenue by closing platform</CardDescription>
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
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      Running projects per person (from assignments / Assigned Resource)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1">
                    <span className="text-sm font-bold text-primary">{resourceMetrics.assignedCount}</span>
                    <span className="text-xs font-semibold text-primary/70">/ {resourceMetrics.totalResources} Active</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto max-h-[260px]">
                <div className="flex flex-col">
                  {resourceMetrics.workloads.filter((w) => w.projectsCount > 0).slice(0, 12).map((item, i) => {
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
                    const initials = item.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2);

                    return (
                      <div key={item.id} className={cn(
                        "flex items-center justify-between p-4 transition-colors hover:bg-muted/30",
                        i !== 0 && "border-t border-border/30"
                      )}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shadow-sm">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {item.projectsCount} running {item.projectsCount === 1 ? "project" : "projects"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
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
                  {resourceMetrics.workloads.every((w) => w.projectsCount === 0) && (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      No running project assignments found from resources or sheet labels
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Running projects by Profile Name */}
          {profileRunningData.length > 0 && (
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 pt-6 px-6 border-b border-border/30">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                  Running Projects by Profile
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  How many active projects sit on each sheet profile name
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/20">
                      <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-6">
                        Profile
                      </TableHead>
                      <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-4 text-center">
                        Running
                      </TableHead>
                      <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3 px-6 text-right">
                        Est. MRR
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profileRunningData.map((row) => (
                      <TableRow key={row.profile} className="border-b border-border/20 hover:bg-muted/30">
                        <TableCell className="py-3 px-6 font-semibold text-sm">{row.profile}</TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[32px]">
                            {row.running}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-6 text-right font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${row.mrr.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* BD Performance Dashboard Table */}
          {bdPerformanceData.length > 0 && (
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden mt-6">
              <CardHeader className="pb-4 pt-6 px-6 border-b border-border/30">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">BD Active Pipeline</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Active projects only · ended deals are excluded from this dashboard
                </CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/20">
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-6 w-[40%]">Representative</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-4 text-center w-[20%]">Active Projects</TableHead>
                        <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground py-4 px-6 text-right w-[40%]">Est. Monthly Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bdPerformanceData.map((row, idx) => (
                        <TableRow key={`${row.name}-${idx}`} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 px-6 font-semibold text-sm text-foreground">{row.name}</TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[32px]">{row.active}</span>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right font-bold font-mono text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                            ${row.revenue.toLocaleString()}
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
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "ALL", label: "All" },
                  { key: "Active", label: "Active" },
                  { key: "Paused", label: "Paused" },
                  { key: "Ended", label: "Ended" },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(chip.key);
                      setKpiFilter(null);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "h-8 px-3 rounded-full text-xs font-semibold border transition-colors",
                      statusFilter === chip.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

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
                        <SelectItem value="Active">Active (sheet)</SelectItem>
                        <SelectItem value="Paused">Paused (sheet)</SelectItem>
                        <SelectItem value="Ended">Ended (sheet)</SelectItem>
                        <SelectItem value="Lead Won">Lead Won</SelectItem>
                        <SelectItem value="Onboarding">Onboarding</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
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
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[9%]">Closer</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[9%]">Resource</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[7%]">Profile</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 px-3 whitespace-nowrap w-[6%]">BD</TableHead>
                      <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 pl-3 pr-2 whitespace-nowrap w-[7%]">End</TableHead>
                      {isAdmin && (
                        <TableHead className="font-semibold text-[10px] tracking-wider uppercase text-muted-foreground py-2.5 pr-4 whitespace-nowrap w-[48px]">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      )}
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
                            title={resolveCloser(p, allEmployees)?.name || undefined}
                          >
                            {resolveCloser(p, allEmployees)?.name.split(" ")[0] || "—"}
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
                          <TableCell className="py-2.5 pl-3 pr-2 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {p.expected_delivery_date
                              ? new Date(p.expected_delivery_date + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="py-2.5 pr-4" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={deletingId === p.id}
                                title="Delete project"
                                onClick={() => handleDeleteProject(p.id, p.name)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 14 : 13} className="h-40 text-center">
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

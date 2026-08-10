"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Calendar, RefreshCw } from "lucide-react";
import { getDashboardAnalyticsData, type DashboardAnalyticsResponse } from "@/actions/dashboard";

type PeriodType = "daily" | "weekly" | "monthly";

interface DashboardTrendChartProps {
  initialData?: DashboardAnalyticsResponse;
}

interface MetricConfigItem {
  label: string;
  key: string;
  color: string;
  prefix?: string;
  suffix?: string;
}

interface DepartmentConfig {
  analyticsLabel: string;
  title: string;
  metrics: Record<string, MetricConfigItem>;
  metricOrder: string[];
}

const DEPARTMENT_CONFIGS: Record<"bd" | "engineering" | "admin", DepartmentConfig> = {
  bd: {
    analyticsLabel: "Sales Analytics",
    title: "Sales & Outreach Performance",
    metricOrder: ["sales", "leads", "meetings", "deals"],
    metrics: {
      sales: { label: "Sales Outreaches", key: "sales", color: "#8b5cf6" },
      leads: { label: "Leads Generated", key: "leads", color: "#ec4899" },
      meetings: { label: "Meetings Booked", key: "meetings", color: "#3b82f6" },
      deals: { label: "Closed Deals", key: "deals", color: "#10b981", prefix: "$" },
    },
  },
  engineering: {
    analyticsLabel: "Development Analytics",
    title: "Engineering Performance",
    metricOrder: ["assigned_projects", "active_projects", "completed_tasks", "bugs_fixed"],
    metrics: {
      assigned_projects: { label: "Assigned Projects", key: "assigned_projects", color: "#3b82f6" },
      active_projects: { label: "Active Projects", key: "active_projects", color: "#8b5cf6" },
      completed_tasks: { label: "Completed Tasks", key: "completed_tasks", color: "#10b981" },
      bugs_fixed: { label: "Bugs Fixed", key: "bugs_fixed", color: "#ec4899" },
    },
  },
  admin: {
    analyticsLabel: "Organization Analytics",
    title: "Company Performance Overview",
    metricOrder: ["total_projects", "sales_progress", "engineering_progress"],
    metrics: {
      total_projects: { label: "Total Projects", key: "total_projects", color: "#3b82f6" },
      sales_progress: { label: "Sales Progress", key: "sales_progress", color: "#10b981", suffix: "%" },
      engineering_progress: { label: "Engineering Progress", key: "engineering_progress", color: "#ec4899", suffix: "%" },
    },
  },
};

const CustomTooltip = ({ active, payload, activeMetric, config }: any) => {
  if (active && payload && payload.length && config) {
    const metricConfig = config[activeMetric] || { label: activeMetric, color: "#8b5cf6" };
    const val = payload[0].value;
    const formattedVal = metricConfig.prefix
      ? `${metricConfig.prefix}${val.toLocaleString()}`
      : `${val.toLocaleString()}${metricConfig.suffix || ""}`;

    return (
      <div className="rounded-xl border border-white/15 bg-slate-950/90 backdrop-blur-xl p-3 shadow-2xl z-50">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {payload[0].payload.name}
        </p>
        <p className="text-base font-extrabold text-white mt-1">
          {metricConfig.label}: <span style={{ color: metricConfig.color }}>{formattedVal}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardTrendChart({ initialData }: DashboardTrendChartProps) {
  const userRole = initialData?.role ?? "bd";
  const deptConfig = DEPARTMENT_CONFIGS[userRole] ?? DEPARTMENT_CONFIGS.bd;

  const [period, setPeriod] = useState<PeriodType>(initialData?.period || "daily");
  const [activeMetric, setActiveMetric] = useState<string>(deptConfig.metricOrder[0]);
  const [data, setData] = useState<DashboardAnalyticsResponse | undefined>(initialData);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset active metric if the user role/initialData config changes
  useEffect(() => {
    setActiveMetric(deptConfig.metricOrder[0]);
  }, [userRole]);

  function handlePeriodChange(newPeriod: PeriodType) {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    startTransition(async () => {
      try {
        const res = await getDashboardAnalyticsData(newPeriod);
        setData(res);
      } catch (e) {
        console.error("Failed to load analytics data:", e);
      }
    });
  }

  const chartData = data?.chartData ?? [
    { name: "Day 1", [activeMetric]: 0 },
    { name: "Day 2", [activeMetric]: 0 },
  ];

  const currentMetricConfig = deptConfig.metrics[activeMetric] || {
    label: activeMetric,
    key: activeMetric,
    color: "#8b5cf6",
  };

  const totalValue = data?.totals[activeMetric] ?? 0;
  const growthPct = data?.totals[`growth_${activeMetric}`] ?? data?.totals.growthPct ?? 0;
  const isPositiveGrowth = growthPct >= 0;

  const formattedTotal = currentMetricConfig.prefix
    ? `${currentMetricConfig.prefix}${totalValue.toLocaleString()}`
    : `${totalValue.toLocaleString()}${currentMetricConfig.suffix || ""}`;

  if (!mounted) {
    return (
      <Card className="glass-card-glow-violet border-none overflow-hidden pt-0 transition-all duration-300 w-full min-w-0 h-[380px] flex items-center justify-center">
        <div className="text-muted-foreground/45 text-xs">Loading chart...</div>
      </Card>
    );
  }

  return (
    <Card className="glass-card-glow-violet border-none overflow-hidden pt-0 transition-all duration-300 w-full min-w-0">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4 p-4 sm:p-6">
        {/* Title & Current Date Badge */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {deptConfig.analyticsLabel}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            {data?.todayFormatted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/90 bg-muted/40 px-2 py-0.5 rounded-full border border-border/30">
                <Calendar className="h-2.5 w-2.5" />
                {data.todayFormatted}
              </span>
            )}
          </div>
          <CardTitle className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight text-foreground">
            {deptConfig.title}
          </CardTitle>
        </div>

        {/* Controls: Period Switcher (Daily/Weekly/Monthly) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isPending && <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
          <div className="flex gap-1 bg-background/50 p-1 rounded-full border border-border/30 backdrop-blur-md">
            {(["daily", "weekly", "monthly"] as PeriodType[]).map((p) => {
              const isActive = period === p;
              return (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`relative px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer capitalize ${
                    isActive ? "text-white shadow-sm z-10" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePeriodBg"
                      className="absolute inset-0 rounded-full bg-violet-600"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-20">{p}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 md:p-7">
        {/* Metric Selector Pills & Stat Display */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${period}-${activeMetric}-${totalValue}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground"
              >
                {formattedTotal}
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center gap-2 mt-1.5">
              <div
                className={`flex items-center gap-1 text-xs font-bold ${
                  isPositiveGrowth ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {isPositiveGrowth ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {isPositiveGrowth ? `+${growthPct}%` : `${growthPct}%`} vs previous {period} period
                </span>
              </div>
            </div>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {deptConfig.metricOrder.map((m) => {
              const cfg = deptConfig.metrics[m];
              const isActive = activeMetric === m;
              return (
                <button
                  key={m}
                  onClick={() => setActiveMetric(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                    isActive
                      ? "bg-violet-500/15 border-violet-500/40 text-violet-400 shadow-sm"
                      : "bg-background/30 border-border/30 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recharts Area Chart Container with Responsive Zero-Scroll Constraints */}
        <div className="w-full min-w-0 h-[260px] sm:h-[300px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetricConfig.color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={currentMetricConfig.color} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
              <XAxis
                dataKey="name"
                className="text-[10px] text-muted-foreground font-semibold"
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                className="text-[10px] text-muted-foreground font-semibold"
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                content={<CustomTooltip activeMetric={activeMetric} config={deptConfig.metrics} />}
                cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey={currentMetricConfig.key}
                stroke={currentMetricConfig.color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#trendGradient)"
                dot={{ fill: currentMetricConfig.color, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

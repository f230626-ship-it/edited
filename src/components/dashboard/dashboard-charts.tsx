"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, AreaChart, Area } from "recharts";
import { Calendar, TrendingUp, Target, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface TooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/90 backdrop-blur-md p-3 shadow-xl">
        <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {payload[0].payload.name || payload[0].payload.status || payload[0].payload.range || payload[0].name}
        </p>
        <p className="text-lg font-bold text-foreground">
          {payload[0].name}: <span className="text-primary">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

interface DashboardChartsProps {
  leaveBalance: any;
  recentLeaves: any[];
  teamPerformance: any[];
  isManager: boolean;
}

export function DashboardCharts({
  leaveBalance,
  recentLeaves,
  teamPerformance,
  isManager,
}: DashboardChartsProps) {
  // Leave balance pie chart data
  const leaveBalanceData = [
    { name: "Annual", value: leaveBalance?.annual_quota ?? 0, color: "#3b82f6" },
    { name: "Sick", value: leaveBalance?.sick_quota ?? 0, color: "#ef4444" },
    { name: "Casual", value: leaveBalance?.casual_quota ?? 0, color: "#10b981" },
  ];

  // Leave trends over last 90 days
  const leavesByMonth = recentLeaves.reduce((acc, leave) => {
    const month = new Date(leave.created_at).toLocaleDateString('en-US', { month: 'short' });
    const existing = acc.find((item: any) => item.month === month);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ month, count: 1 });
    }
    return acc;
  }, [] as any[]);

  // Leave status distribution
  const leaveStatusData = [
    { 
      status: "Approved", 
      count: recentLeaves.filter(l => l.status === 'approved').length,
      fill: "#10b981"
    },
    { 
      status: "Pending", 
      count: recentLeaves.filter(l => l.status === 'pending').length,
      fill: "#f59e0b"
    },
    { 
      status: "Rejected", 
      count: recentLeaves.filter(l => l.status === 'rejected').length,
      fill: "#ef4444"
    },
  ];

  // Performance distribution (if manager)
  const performanceDistribution = teamPerformance.reduce((acc, perf) => {
    const bucket = Math.floor(perf.completion_status / 25) * 25;
    const existing = acc.find((item: any) => item.range === `${bucket}-${bucket + 25}%`);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ range: `${bucket}-${bucket + 25}%`, count: 1 });
    }
    return acc;
  }, [] as any[]);

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))]">
      {/* Leave Balance Pie Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card-glow-blue border-none overflow-hidden pt-0 h-full">
          <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
              <Calendar className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-wide">
              Leave Balance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leaveBalanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leaveBalanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-6">
              {leaveBalanceData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-semibold text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leave Status Bar Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card-glow-green border-none overflow-hidden pt-0 h-full">
          <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
              <Activity className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-wide">
              Leave Request Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leaveStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                <XAxis dataKey="status" className="text-xs text-muted-foreground font-semibold" tickLine={false} />
                <YAxis className="text-xs text-muted-foreground font-semibold" tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {leaveStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leave Trends Line Chart (Rewritten to AreaChart for premium neon glow styling) */}
      {leavesByMonth.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card-glow-violet border-none overflow-hidden pt-0 h-full">
            <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
              <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-500">
                <TrendingUp className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold uppercase tracking-wide">
                Leave Request Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={leavesByMonth}>
                  <defs>
                    <linearGradient id="colorViolet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                  <XAxis dataKey="month" className="text-xs text-muted-foreground font-semibold" tickLine={false} />
                  <YAxis className="text-xs text-muted-foreground font-semibold" tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorViolet)"
                    dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 1 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Performance Distribution (Manager View) */}
      {isManager && performanceDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card-glow-primary border-none overflow-hidden pt-0 h-full">
            <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                <Target className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold uppercase tracking-wide">
                Team Performance Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={performanceDistribution}>
                  <defs>
                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e5a158" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#e5a158" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                  <XAxis dataKey="range" className="text-xs text-muted-foreground font-semibold" tickLine={false} />
                  <YAxis className="text-xs text-muted-foreground font-semibold" tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="url(#colorPrimary)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

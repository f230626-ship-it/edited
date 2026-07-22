"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Package, Clock, TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardsProps {
  totalEmployees: number;
  totalAssets: number;
  pendingLeaves: number;
  avgPerformance: number;
  teamSize: number;
  isManager: boolean;
}

export function StatsCards({
  totalEmployees,
  totalAssets,
  pendingLeaves,
  avgPerformance,
  teamSize,
  isManager,
}: StatsCardsProps) {
  const stats = [
    {
      title: isManager ? "Total Employees" : "Team Size",
      value: isManager ? totalEmployees : teamSize,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      change: "+12%",
    },
    {
      title: "Assets Assigned",
      value: totalAssets,
      icon: Package,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      change: "+8%",
    },
    {
      title: "Pending Requests",
      value: pendingLeaves,
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-500/10",
      change: "-3%",
    },
    {
      title: "Avg Performance",
      value: `${Math.round(avgPerformance)}%`,
      icon: Target,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      change: "+15%",
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 min-w-0 w-full">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="min-w-0"
          >
            <Card className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow ${stat.bgColor}`}>
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      {stat.title}
                    </p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-2xl sm:text-3xl font-bold truncate">{stat.value}</p>
                      <span className="text-[10px] sm:text-xs font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br ${stat.color} text-white shadow-lg shrink-0`}>
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

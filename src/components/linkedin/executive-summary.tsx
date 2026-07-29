"use client";

import { Briefcase, Award, Target, Users, GraduationCap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExecutiveSummaryProps {
  summary: any;
  profile: any;
}

export function ExecutiveSummary({ summary, profile }: ExecutiveSummaryProps) {
  const stats = [
    {
      label: "Years Experience",
      value: summary.years_of_experience || 0,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Positions",
      value: summary.total_positions || 0,
      icon: Briefcase,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Skills",
      value: summary.total_skills || 0,
      icon: Target,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Endorsements",
      value: summary.total_endorsements || 0,
      icon: Award,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Projects",
      value: summary.total_projects || 0,
      icon: Users,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Certifications",
      value: summary.total_certifications || 0,
      icon: GraduationCap,
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Profile Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {profile.first_name} {profile.last_name}
                </span>
                {profile.headline && <> • {profile.headline}</>}
                {profile.location && <> • {profile.location}</>}
              </p>
              
              {summary.current_company && summary.current_title && (
                <p className="text-sm">
                  Currently <span className="font-medium text-foreground">{summary.current_title}</span> at{" "}
                  <span className="font-medium text-foreground">{summary.current_company}</span>
                </p>
              )}

              {summary.strongest_expertise && summary.strongest_expertise.length > 0 && (
                <p className="text-sm">
                  Strongest expertise: <span className="font-medium text-foreground">
                    {summary.strongest_expertise.join(", ")}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className={`p-2 rounded-lg ${stat.bgColor} mb-2`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground text-center">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

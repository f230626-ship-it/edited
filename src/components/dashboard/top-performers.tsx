"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopPerformersProps {
  employees: any[];
  projects: any[];
  isAdmin: boolean;
}

export function TopPerformers({ employees, projects, isAdmin }: TopPerformersProps) {
  // Create mock top performers based on employees
  const topPerformers = employees.slice(0, 8).map((emp, index) => ({
    id: emp.id,
    name: emp.full_name,
    role: emp.role,
    department: emp.department,
    rank: index + 1,
    points: Math.floor(Math.random() * 5000) + 2000,
    badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'none',
    growth: `+${(Math.random() * 20 + 5).toFixed(1)}%`,
    completedTasks: Math.floor(Math.random() * 50) + 20,
  }));

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'gold':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'silver':
        return <Medal className="h-4 w-4 text-slate-400" />;
      case 'bronze':
        return <Award className="h-4 w-4 text-orange-400" />;
      default:
        return null;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'gold':
        return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/40';
      case 'silver':
        return 'from-slate-500/20 to-zinc-500/20 border-slate-500/40';
      case 'bronze':
        return 'from-orange-500/20 to-amber-600/20 border-orange-500/40';
      default:
        return 'from-muted/20 to-muted/10 border-border/40';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Top Performers</h2>
        <div className="flex gap-2">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Week
          </button>
          <button className="text-sm text-foreground font-medium">
            Month
          </button>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topPerformers.map((performer) => (
          <Card
            key={performer.id}
            className={cn(
              "relative overflow-hidden border backdrop-blur-sm p-5 group hover:shadow-xl transition-all duration-300",
              "bg-gradient-to-br",
              getBadgeColor(performer.badge)
            )}
          >
            {/* Rank badge */}
            <div className="absolute top-3 right-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                performer.rank === 1 && "bg-yellow-500/20 text-yellow-400",
                performer.rank === 2 && "bg-slate-500/20 text-slate-400",
                performer.rank === 3 && "bg-orange-500/20 text-orange-400",
                performer.rank > 3 && "bg-muted/30 text-muted-foreground"
              )}>
                #{performer.rank}
              </div>
            </div>

            {/* User info */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-background">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {getInitials(performer.name)}
                  </AvatarFallback>
                </Avatar>
                {performer.badge !== 'none' && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border">
                    {getBadgeIcon(performer.badge)}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-1">{performer.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {performer.department || performer.role}
                </Badge>
              </div>

              {/* Stats */}
              <div className="w-full pt-3 border-t border-border/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-bold">{performer.points.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tasks</span>
                  <span className="font-semibold text-primary">{performer.completedTasks}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Growth</span>
                  <span className="font-semibold text-green-400">{performer.growth}</span>
                </div>
              </div>
            </div>

            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>
        ))}
      </div>
    </div>
  );
}

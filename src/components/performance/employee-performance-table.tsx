import { cn } from "@/lib/utils";
import type { WeeklyScore } from "@/lib/standup/scoring";

interface EmployeePerformanceTableProps {
  leaderboard?: WeeklyScore[];
}

export function EmployeePerformanceTable({ leaderboard = [] }: EmployeePerformanceTableProps) {
  const displayEmployees = leaderboard.map((emp) => {
    const scoreVal = emp.avg_score;
    return {
      name: emp.employee_name,
      avatar: emp.employee_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.employee_name)}`,
      score: `${scoreVal}%`,
      scoreColor: scoreVal >= 85 ? "text-emerald-500" : scoreVal >= 70 ? "text-orange-500" : "text-rose-500",
      standups: `${emp.total_standups} / 5`,
      standupsColor: emp.total_standups >= 4 ? "text-emerald-500" : "text-orange-500",
      tasks: `${emp.total_tasks_completed} done`,
      tasksColor: "text-foreground",
      consistency: `${emp.consistency_pct}%`,
      consistencyColor: emp.consistency_pct >= 80 ? "text-emerald-500" : "text-orange-500",
    };
  });

  return (
    <div className="card-premium rounded-2xl animate-slide-up stagger-3 overflow-hidden">
      <div className="px-6 py-5 border-b border-border/30">
        <h3 className="text-[15px] font-semibold">Employee Performance</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/20">
            <tr>
              <th className="px-6 py-4 font-medium rounded-tl-lg">Employee</th>
              <th className="px-6 py-4 font-medium text-center">Score</th>
              <th className="px-6 py-4 font-medium text-center">Stand-ups</th>
              <th className="px-6 py-4 font-medium text-center">Tasks</th>
              <th className="px-6 py-4 font-medium text-center rounded-tr-lg">Consistency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {displayEmployees.length > 0 ? (
              displayEmployees.map((emp) => (
                <tr key={emp.name} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img 
                        src={emp.avatar} 
                        alt={emp.name} 
                        className="h-8 w-8 rounded-full object-cover border border-border/50" 
                      />
                      <span className="font-medium">{emp.name}</span>
                    </div>
                  </td>
                  <td className={cn("px-6 py-4 whitespace-nowrap text-center font-bold", emp.scoreColor)}>
                    {emp.score}
                  </td>
                  <td className={cn("px-6 py-4 whitespace-nowrap text-center font-bold", emp.standupsColor)}>
                    {emp.standups}
                  </td>
                  <td className={cn("px-6 py-4 whitespace-nowrap text-center font-bold", emp.tasksColor)}>
                    {emp.tasks}
                  </td>
                  <td className={cn("px-6 py-4 whitespace-nowrap text-center font-bold", emp.consistencyColor)}>
                    {emp.consistency}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-xs font-medium">
                  No active employee performance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

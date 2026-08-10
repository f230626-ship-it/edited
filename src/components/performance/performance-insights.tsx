import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerformanceInsightItem } from "@/actions/standup";

const defaultInsights: PerformanceInsightItem[] = [
  {
    type: "positive",
    title: "Consistent stand-up reporting",
    desc: "Team is regularly sharing updates and maintaining transparency.",
  },
  {
    type: "positive",
    title: "Strong task completion",
    desc: "Great job! Task completion rate is above team average.",
  },
  {
    type: "warning",
    title: "Decline in activity during last 2 weeks",
    desc: "Stand-up participation has dropped by 12% compared to last month.",
  },
];

interface PerformanceInsightsProps {
  insights?: PerformanceInsightItem[];
}

export function PerformanceInsights({ insights = [] }: PerformanceInsightsProps) {
  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  return (
    <div className="card-premium rounded-2xl animate-slide-up stagger-4 overflow-hidden">
      <div className="px-6 py-5 border-b border-border/30">
        <h3 className="text-[15px] font-semibold">Performance Insights</h3>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        <div className="flex-1 space-y-6">
          {displayInsights.map((item, i) => {
            const IconComponent = item.type === "positive" ? CheckCircle2 : AlertTriangle;
            const iconColor = item.type === "positive" ? "text-emerald-500" : "text-orange-500";
            const bgClass = item.type === "positive" ? "bg-emerald-500/10" : "bg-orange-500/10";
            
            return (
              <div key={i} className="flex gap-4">
                <div className={cn("mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center", bgClass)}>
                  <IconComponent className={cn("h-4 w-4", iconColor)} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Right side Illustration */}
        <div className="hidden md:flex shrink-0 w-[240px] lg:w-[280px] bg-muted/10 rounded-xl border border-border/20 items-center justify-center p-6">
           <div className="flex items-end gap-6 w-full justify-center">
             {/* Mini Bar Chart */}
             <div className="flex items-end gap-2 h-20">
               <div className="w-4 bg-indigo-500 rounded-t-sm h-[60%]"></div>
               <div className="w-4 bg-emerald-500 rounded-t-sm h-[100%]"></div>
             </div>
             {/* Mini Donut Chart */}
             <div className="relative h-16 w-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                   <circle r="12" cx="16" cy="16" fill="transparent" stroke="#f97316" strokeWidth="6" strokeDasharray="75.39" strokeDashoffset="0"></circle>
                   <circle r="12" cx="16" cy="16" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray="75.39" strokeDashoffset="25" className="drop-shadow-sm"></circle>
                   <circle r="12" cx="16" cy="16" fill="transparent" stroke="#6366f1" strokeWidth="6" strokeDasharray="75.39" strokeDashoffset="60" className="drop-shadow-sm"></circle>
                </svg>
                <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"></div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface CareerTimelineProps {
  positions: any[];
}

export function CareerTimeline({ positions }: CareerTimelineProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {positions.map((position, index) => {
            const startDate = position.started_on ? new Date(position.started_on) : null;
            const endDate = position.finished_on ? new Date(position.finished_on) : null;
            
            return (
              <div key={position.id} className="relative pl-8 pb-6 last:pb-0 border-l-2 border-border">
                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold">{position.title}</h4>
                      <p className="text-sm text-muted-foreground">{position.company_name}</p>
                    </div>
                    {position.is_current && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {startDate && format(startDate, 'MMM yyyy')} 
                    {' - '}
                    {endDate ? format(endDate, 'MMM yyyy') : 'Present'}
                    {position.location && ` • ${position.location}`}
                  </p>
                  
                  {position.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {position.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

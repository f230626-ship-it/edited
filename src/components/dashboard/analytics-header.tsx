"use client";

import { Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsHeaderProps {
  userName: string;
  userCode?: string | null;
}

export function AnalyticsHeader({ userName, userCode }: AnalyticsHeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentDate}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Apr 25 - Apr 30</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">All Campaigns</span>
        </Button>
        <Button size="sm" className="bg-primary">
          Share
        </Button>
      </div>
    </div>
  );
}

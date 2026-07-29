"use client";

import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIRecommendationsProps {
  recommendations: string[];
}

export function AIRecommendations({ recommendations }: AIRecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          AI-Powered Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">{idx + 1}</span>
              </div>
              <span className="text-sm text-muted-foreground leading-relaxed">{rec}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

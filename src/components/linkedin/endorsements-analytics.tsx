"use client";

import { Card, CardContent } from "@/components/ui/card";

interface EndorsementsAnalyticsProps {
  endorsements: any[];
}

export function EndorsementsAnalytics({ endorsements }: EndorsementsAnalyticsProps) {
  const skillCounts = endorsements.reduce((acc: any, e: any) => {
    acc[e.skill_name] = (acc[e.skill_name] || 0) + 1;
    return acc;
  }, {});

  const topEndorsed = Object.entries(skillCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Most Endorsed Skills</h3>
            <div className="space-y-3">
              {topEndorsed.map(([skill, count]: any, idx) => (
                <div key={skill} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-muted-foreground">{idx + 1}</div>
                    <span className="text-sm">{skill}</span>
                  </div>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Endorsement Stats</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold">{endorsements.length}</div>
                <div className="text-sm text-muted-foreground">Total Endorsements</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold">{Object.keys(skillCounts).length}</div>
                <div className="text-sm text-muted-foreground">Skills Endorsed</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

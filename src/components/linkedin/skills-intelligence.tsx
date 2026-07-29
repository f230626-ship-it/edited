"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SkillsIntelligenceProps {
  skills: any[];
  endorsements: any[];
}

export function SkillsIntelligence({ skills, endorsements }: SkillsIntelligenceProps) {
  // Calculate endorsement counts per skill
  const skillCounts = endorsements.reduce((acc: any, e: any) => {
    acc[e.skill_name] = (acc[e.skill_name] || 0) + 1;
    return acc;
  }, {});

  const topSkills = Object.entries(skillCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, endorsements: count }));

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Top Endorsed Skills</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSkills}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="endorsements" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Skills Summary</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <div className="text-3xl font-bold">{skills.length}</div>
              <div className="text-sm text-muted-foreground">Total Skills</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-3xl font-bold">{endorsements.length}</div>
              <div className="text-sm text-muted-foreground">Total Endorsements</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-3xl font-bold">
                {topSkills.length > 0 ? Math.round(endorsements.length / skills.length) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Avg Endorsements/Skill</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

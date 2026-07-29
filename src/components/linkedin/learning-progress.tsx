"use client";

import { Card, CardContent } from "@/components/ui/card";

interface LearningProgressProps {
  learning: any[];
  certifications: any[];
  education: any[];
}

export function LearningProgress({ learning, certifications, education }: LearningProgressProps) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-4xl font-bold mb-2">{learning.length}</div>
          <div className="text-sm text-muted-foreground">Courses Completed</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-4xl font-bold mb-2">{certifications.length}</div>
          <div className="text-sm text-muted-foreground">Certifications</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-4xl font-bold mb-2">{education.length}</div>
          <div className="text-sm text-muted-foreground">Education History</div>
        </CardContent>
      </Card>
    </div>
  );
}

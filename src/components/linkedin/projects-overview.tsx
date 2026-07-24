"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ProjectsOverviewProps {
  projects: any[];
}

export function ProjectsOverview({ projects }: ProjectsOverviewProps) {
  const activeProjects = projects.filter(p => p.is_current);
  const completedProjects = projects.filter(p => !p.is_current);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border">
            <div className="text-3xl font-bold">{projects.length}</div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-3xl font-bold text-green-600">{activeProjects.length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-3xl font-bold">{completedProjects.length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>

        <div className="space-y-4">
          {projects.slice(0, 5).map(project => (
            <div key={project.id} className="p-4 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{project.title}</h4>
                {project.is_current && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400">
                    Active
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

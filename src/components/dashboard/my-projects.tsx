"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateProjectProgress } from "@/actions/projects";

type ProjectWithRelations = {
  id: string;
  name: string;
  client_name: string;
  status: string;
  priority?: string;
  progress_percentage?: number;
  value: number;
  currency: string;
  start_date: string;
  expected_delivery_date: string;
  manager?: { full_name: string } | null;
};

interface MyProjectsProps {
  projects: ProjectWithRelations[];
}

const STATUS_COLORS: Record<string, string> = {
  "Lead Won": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Onboarding: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "In Progress": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "On Hold": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Completed: "bg-green-500/10 text-green-600 border-green-500/20",
  Maintenance: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  Paused: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  Archived: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function MyProjects({ projects }: MyProjectsProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  function startEditing(projectId: string, currentProgress: number) {
    setEditingId(projectId);
    setProgressValues((prev) => ({ ...prev, [projectId]: currentProgress }));
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function saveProgress(projectId: string) {
    const value = progressValues[projectId];
    if (value === undefined || value < 0 || value > 100) {
      toast.error("Progress must be between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateProjectProgress(projectId, value);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Progress updated!");
        setEditingId(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update progress.");
    } finally {
      setSaving(false);
    }
  }

  if (projects.length === 0) {
    return (
      <Card className="glass-card-glow-violet border-none">
        <CardContent className="py-12 text-center">
          <Briefcase className="h-10 w-10 mx-auto mb-3 text-violet-400 opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">No projects assigned to you yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Only projects where you are the assigned BD (or team resource) appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-glow-violet border-none">
      <CardHeader className="pb-3 border-b border-border/30 mb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
          <div className="relative flex items-center justify-center p-1">
            <div className="absolute inset-0 rounded-full blur-md bg-violet-500 opacity-30" />
            <Briefcase className="h-4 w-4 text-violet-400 relative z-10" />
          </div>
          My Projects ({projects.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {projects.map((project) => {
          const isEditing = editingId === project.id;
          const currentProgress = isEditing
            ? (progressValues[project.id] ?? project.progress_percentage ?? 0)
            : (project.progress_percentage ?? 0);

          return (
            <div
              key={project.id}
              className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-md p-4 hover:border-violet-500/30 hover:bg-card/70 transition-all duration-300 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{project.name}</p>
                  <p className="text-[11px] text-muted-foreground">{project.client_name}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-[10px] ${STATUS_COLORS[project.status] || ""} border`}
                >
                  {project.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
                {project.manager && <span>PM: {project.manager.full_name}</span>}
                <span>•</span>
                <span>{project.currency} {project.value.toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">Progress</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={progressValues[project.id] ?? 0}
                        onChange={(e) =>
                          setProgressValues((prev) => ({
                            ...prev,
                            [project.id]: Number(e.target.value),
                          }))
                        }
                        className="w-24 accent-primary"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={progressValues[project.id] ?? 0}
                        onChange={(e) =>
                          setProgressValues((prev) => ({
                            ...prev,
                            [project.id]: Math.min(100, Math.max(0, Number(e.target.value))),
                          }))
                        }
                        className="w-16 h-7 text-xs font-mono text-center px-1"
                      />
                      <span className="text-xs">%</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-green-500 hover:text-green-600"
                        onClick={() => saveProgress(project.id)}
                        disabled={saving}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={cancelEditing}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{currentProgress}%</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => startEditing(project.id, currentProgress)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <Progress value={currentProgress} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

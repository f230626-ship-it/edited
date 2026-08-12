"use client";

import { useState } from "react";
import { Search, Filter, Hash, MessageSquare, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Standup {
  id: string;
  employee_name: string;
  employee_photo: string | null;
  score: number;
  completed: string[];
  blockers: string[];
  in_progress: string[];
  raw_text: string;
  channel_id: string;
  date: string;
}

function scoreColor(s: number) {
  if (s >= 80) return "bg-emerald-500 text-white";
  if (s >= 60) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}

function scoreTextColor(s: number) {
  if (s >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (s >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
}

const CHANNEL_MAP: Record<string, string> = {
  C0ABTT2V884: "Development",
  C0AUWEKB882: "Sales",
};

export function AllStandupsList({
  standups,
  totalCount,
  devCount,
  salesCount,
  title,
  backHref,
}: {
  standups: Standup[];
  totalCount: number;
  devCount: number;
  salesCount: number;
  title: string;
  backHref: string;
}) {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "dev" | "sales">("all");

  const query = (typeof search === "string" ? search : "").trim().toLowerCase();

  const filtered = standups.filter((s) => {
    const name = (s.employee_name || "").toLowerCase();
    const raw = (s.raw_text || "").toLowerCase();
    const matchesSearch = !query || name.includes(query) || raw.includes(query);
    const matchesChannel =
      channelFilter === "all" ||
      (channelFilter === "dev" && s.channel_id === "C0ABTT2V884") ||
      (channelFilter === "sales" && s.channel_id === "C0AUWEKB882");
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <a href={backHref} className="hover:text-foreground transition-colors">Back</a>
          <span>/</span>
          <span className="font-semibold text-foreground">Stand-ups</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalCount}</p>
          <p className="text-xs text-muted-foreground">Total Stand-ups</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{devCount}</p>
          <p className="text-xs text-muted-foreground">Development</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{salesCount}</p>
          <p className="text-xs text-muted-foreground">Sales</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or content..."
            value={typeof search === "string" ? search : ""}
            onChange={(e) => setSearch(String(e.target.value ?? ""))}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/60 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border/40 bg-muted/60 p-1">
          {(["all", "dev", "sales"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                channelFilter === ch ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {ch === "all" ? "All" : ch === "dev" ? "Development" : "Sales"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0", scoreColor(s.score))}>
                  {s.score}
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.employee_name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.date} · {CHANNEL_MAP[s.channel_id] || s.channel_id}</p>
                </div>
              </div>
            </div>

            {(s.completed.length > 0 || s.in_progress.length > 0 || s.blockers.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {s.completed.length > 0 && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Completed ({s.completed.length})
                    </p>
                    {s.completed.slice(0, 3).map((t, i) => (
                      <p key={i} className="text-muted-foreground pl-4 truncate">{t}</p>
                    ))}
                    {s.completed.length > 3 && <p className="text-muted-foreground pl-4">+{s.completed.length - 3} more</p>}
                  </div>
                )}
                {s.in_progress.length > 0 && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                      <Clock className="h-3 w-3" /> In Progress ({s.in_progress.length})
                    </p>
                    {s.in_progress.slice(0, 3).map((t, i) => (
                      <p key={i} className="text-muted-foreground pl-4 truncate">{t}</p>
                    ))}
                  </div>
                )}
                {s.blockers.length > 0 && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-red-500 font-semibold">
                      <AlertTriangle className="h-3 w-3" /> Blockers ({s.blockers.length})
                    </p>
                    {s.blockers.map((b, i) => (
                      <p key={i} className="text-muted-foreground pl-4 truncate">{b}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No stand-ups found.</p>
        )}
      </div>
    </div>
  );
}

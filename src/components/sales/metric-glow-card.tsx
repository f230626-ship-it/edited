import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ACCENT_CONFIG = {
  primary: {
    iconBg: "bg-primary/15",
    iconRing: "ring-primary/20",
    iconText: "text-primary",
    glow: "shadow-primary/8",
    barColor: "bg-primary",
  },
  emerald: {
    iconBg: "bg-emerald-500/15",
    iconRing: "ring-emerald-500/20",
    iconText: "text-emerald-500",
    glow: "shadow-emerald-500/8",
    barColor: "bg-emerald-500",
  },
  blue: {
    iconBg: "bg-blue-500/15",
    iconRing: "ring-blue-500/20",
    iconText: "text-blue-500",
    glow: "shadow-blue-500/8",
    barColor: "bg-blue-500",
  },
  violet: {
    iconBg: "bg-violet-500/15",
    iconRing: "ring-violet-500/20",
    iconText: "text-violet-500",
    glow: "shadow-violet-500/8",
    barColor: "bg-violet-500",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconRing: "ring-amber-500/20",
    iconText: "text-amber-500",
    glow: "shadow-amber-500/8",
    barColor: "bg-amber-500",
  },
  rose: {
    iconBg: "bg-rose-500/15",
    iconRing: "ring-rose-500/20",
    iconText: "text-rose-500",
    glow: "shadow-rose-500/8",
    barColor: "bg-rose-500",
  },
} as const;

export function MetricGlowCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  progress,
  className,
  accent = "primary",
  href,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  progress?: number;
  className?: string;
  accent?: keyof typeof ACCENT_CONFIG;
  href?: string;
  onClick?: () => void;
}) {
  const a = ACCENT_CONFIG[accent] || ACCENT_CONFIG.primary;

  const CardComponent = href ? Link : onClick ? "button" : "div";
  const cardProps = href ? { href } : onClick ? { onClick, type: "button" as const } : {};

  return (
    <CardComponent
      {...(cardProps as any)}
      className={cn(
        href || onClick ? "cursor-pointer" : "cursor-default",
        "block h-full w-full"
      )}
    >
      <Card
        className={cn(
          "group relative overflow-hidden border border-border/40 bg-card/80 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg h-full py-0",
          a.glow,
          className
        )}
      >
        {/* Decorative corner gradient */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-white/[0.04] to-transparent blur-xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-100 opacity-60" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-gradient-to-tr from-white/[0.02] to-transparent blur-lg" />

        <CardContent className="relative p-5 h-full flex flex-col">
          {/* Top Row: Title + Icon */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground truncate">
              {title}
            </p>
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
                a.iconBg,
                a.iconRing
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", a.iconText)} />
            </div>
          </div>

          {/* Value */}
          <div className="mt-3">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums leading-none">
              {value}
            </p>
          </div>

          {/* Subtitle / Trend */}
          {(subtitle || trend) && (
            <div className="mt-auto pt-3">
              {subtitle && (
                <p className="text-[12px] text-muted-foreground/80 font-medium leading-normal">
                  {subtitle}
                </p>
              )}
              {trend && (
                <p
                  className={cn(
                    "mt-1.5 text-xs font-semibold flex items-center gap-1",
                    trendUp === false ? "text-rose-500" : "text-emerald-500"
                  )}
                >
                  <span className="text-[10px]">{trendUp === false ? "▼" : "▲"}</span> {trend}
                </p>
              )}
            </div>
          )}

          {/* Optional progress bar at bottom */}
          {progress !== undefined && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 ease-out", a.barColor)}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </CardComponent>
  );
}

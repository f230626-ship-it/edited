import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "primary" | "blue" | "amber" | "green" | "violet";

const TONE_MAPPING: Record<
  KpiTone,
  {
    glowClass: string;
    iconColor: string;
    iconGlow: string;
    trendBadge: string;
  }
> = {
  primary: {
    glowClass: "glass-card-glow-primary",
    iconColor: "text-[#e5a158]",
    iconGlow: "bg-[#e5a158]",
    trendBadge: "bg-[#e5a158]/10 text-[#e5a158]",
  },
  blue: {
    glowClass: "glass-card-glow-blue",
    iconColor: "text-[#3b82f6]",
    iconGlow: "bg-[#3b82f6]",
    trendBadge: "bg-[#3b82f6]/10 text-[#3b82f6]",
  },
  amber: {
    glowClass: "glass-card-glow-amber",
    iconColor: "text-[#f59e0b]",
    iconGlow: "bg-[#f59e0b]",
    trendBadge: "bg-[#f59e0b]/10 text-[#f59e0b]",
  },
  green: {
    glowClass: "glass-card-glow-green",
    iconColor: "text-[#10b981]",
    iconGlow: "bg-[#10b981]",
    trendBadge: "bg-[#10b981]/10 text-[#10b981]",
  },
  violet: {
    glowClass: "glass-card-glow-violet",
    iconColor: "text-[#8b5cf6]",
    iconGlow: "bg-[#8b5cf6]",
    trendBadge: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  },
};

export function KpiStatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "primary",
  delay = 0,
  active,
  onClick,
  className,
}: {
  label: string;
  value: React.ReactNode;
  description?: string;
  icon: LucideIcon;
  tone?: KpiTone;
  delay?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const t = TONE_MAPPING[tone];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl border bg-card/65 backdrop-blur-xl overflow-hidden opacity-0 animate-slide-up transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        t.glowClass,
        onClick && "cursor-pointer select-none",
        active && "ring-1 ring-primary/45 border-primary/50",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {/* Soft gradient accent line at top */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
        {/* Top Header Row: Label & Sleek Floating Glowing Icon (No Square Box) */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
            {label}
          </span>
          <div className="relative flex items-center justify-center p-1 transition-transform duration-300 group-hover:scale-110">
            {/* Ambient soft glow aura */}
            <div
              className={cn(
                "absolute inset-0 rounded-full blur-md opacity-25 group-hover:opacity-60 transition-opacity",
                t.iconGlow
              )}
            />
            <Icon
              className={cn("h-5 w-5 shrink-0 relative z-10 transition-colors", t.iconColor)}
              strokeWidth={1.75}
            />
          </div>
        </div>

        {/* Value and Description */}
        <div className="space-y-1">
          <div className="text-3xl font-extrabold tracking-tight text-foreground transition-transform duration-300 group-hover:scale-[1.01] origin-left">
            {value}
          </div>
          {description && (
            <p className="text-[12px] font-medium text-muted-foreground/90 mt-1.5 leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

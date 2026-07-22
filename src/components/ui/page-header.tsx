import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  icon,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5 mb-6 animate-slide-up opacity-0 [animation-fill-mode:forwards]",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
      <div className="relative px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{title}</h1>
              {description && (
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          {(action || badge) && (
            <div className="flex items-center gap-3 shrink-0">
              {badge}
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export interface OutreachThemeColors {
  accent: string;
  teal: string;
  purple: string;
  rose: string;
  grid: string;
  axis: string;
  accentForeground: string;
}

const FALLBACK: OutreachThemeColors = {
  accent: "#d97706",
  teal: "#0d9488",
  purple: "#7c3aed",
  rose: "#e11d48",
  grid: "#e2e8f0",
  axis: "#64748b",
  accentForeground: "#0f172a",
};

const CSS_VAR_MAP: Record<keyof OutreachThemeColors, string> = {
  accent: "--outreach-accent",
  teal: "--outreach-teal",
  purple: "--outreach-purple",
  rose: "--outreach-rose",
  grid: "--outreach-grid",
  axis: "--outreach-axis",
  accentForeground: "--outreach-accent-foreground",
};

function readThemeColors(): OutreachThemeColors {
  if (typeof window === "undefined") return FALLBACK;

  const style = getComputedStyle(document.documentElement);
  const read = (key: keyof OutreachThemeColors) =>
    style.getPropertyValue(CSS_VAR_MAP[key]).trim() || FALLBACK[key];

  return {
    accent: read("accent"),
    teal: read("teal"),
    purple: read("purple"),
    rose: read("rose"),
    grid: read("grid"),
    axis: read("axis"),
    accentForeground: read("accentForeground"),
  };
}

/** Reads LinkedIn outreach chart/KPI colors from CSS theme tokens (light + dark). */
export function useOutreachTheme(): OutreachThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<OutreachThemeColors>(FALLBACK);

  useEffect(() => {
    setColors(readThemeColors());
  }, [resolvedTheme]);

  return colors;
}

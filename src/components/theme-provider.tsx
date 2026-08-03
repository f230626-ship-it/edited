"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "@/lib/theme-script";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme | ((prev: Theme) => Theme)) => void;
  resolvedTheme?: "light" | "dark";
  themes: string[];
  systemTheme?: "light" | "dark";
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark", disableTransition: boolean) {
  const root = document.documentElement;
  let cleanup: (() => void) | undefined;

  if (disableTransition) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
      )
    );
    document.head.appendChild(style);
    cleanup = () => {
      window.getComputedStyle(document.body);
      setTimeout(() => {
        style.parentNode?.removeChild(style);
      }, 1);
    };
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  cleanup?.();
}

export type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  // Inject FOUC script into the SSR HTML stream outside the React tree —
  // avoids React 19's "Encountered a script tag while rendering" warning.
  const scriptInserted = React.useRef(false);
  useServerInsertedHTML(() => {
    if (scriptInserted.current) return null;
    scriptInserted.current = true;
    return (
      <script
        id="theme-init"
        dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      />
    );
  });

  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    } catch {
      /* ignore */
    }
    setSystemTheme(getSystemTheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [storageKey]);

  const resolvedTheme: "light" | "dark" =
    theme === "system" && enableSystem ? systemTheme : theme === "dark" ? "dark" : "light";

  React.useEffect(() => {
    if (!mounted) return;
    applyTheme(resolvedTheme, disableTransitionOnChange);
  }, [mounted, resolvedTheme, disableTransitionOnChange]);

  const setTheme = React.useCallback(
    (next: Theme | ((prev: Theme) => Theme)) => {
      setThemeState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(storageKey, value);
        } catch {
          /* ignore */
        }
        return value;
      });
    },
    [storageKey]
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme: mounted ? resolvedTheme : undefined,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
      systemTheme: enableSystem ? systemTheme : undefined,
    }),
    [theme, setTheme, resolvedTheme, mounted, enableSystem, systemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "system",
      setTheme: () => undefined,
      themes: ["light", "dark", "system"],
      resolvedTheme: undefined,
      systemTheme: undefined,
    };
  }
  return ctx;
}

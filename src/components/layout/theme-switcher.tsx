"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Same footprint on server + first client paint — avoid Button tabIndex mismatch
  if (!mounted) {
    return <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />;
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="h-9 w-9 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] active:scale-95"
      aria-label="Toggle theme"
    >
      {currentTheme === "dark" ? (
        <Sun className="h-[18px] w-[18px] transition-all duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="h-[18px] w-[18px] transition-all duration-300 rotate-0 scale-100" />
      )}
    </Button>
  );
}

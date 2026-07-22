"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/constants";
import type { Employee, Notification } from "@/types/database";
import { LogOut, User, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { useSidebar } from "@/components/layout/app-shell-client";

export function Header({
  employee,
  notifications,
  unreadCount,
  onMenuClick,
}: {
  employee: Employee;
  notifications: Notification[];
  unreadCount: number;
  onMenuClick?: () => void;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const { setOpen } = useSidebar();
  const initials = employee.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  const handleMenuClick = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      setOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-12 sm:h-13 md:h-[52px] items-center justify-between border-b border-border/50 bg-background/70 px-2.5 sm:px-3 md:px-4 lg:px-5 xl:px-6 backdrop-blur-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.02)]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={handleMenuClick}
          className="lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] h-9 w-9 rounded-md hover:bg-muted/80 transition-colors shrink-0 touch-manipulation active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
        
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
            <span className="text-[11px] sm:text-[13px] font-medium text-muted-foreground hidden sm:inline-block">
              Welcome back,
            </span>
            <span className="text-[13px] sm:text-[14px] md:text-[15px] font-semibold tracking-tight text-foreground truncate">
              {employee.full_name.split(" ")[0]}
            </span>
          </div>
          <div className="h-3 sm:h-3.5 w-[1px] bg-border/60 mx-0.5 shrink-0" />
          <Badge 
            variant="outline" 
            className="text-[8px] sm:text-[9px] font-bold tracking-widest uppercase px-1.5 py-0 h-4 sm:h-4.5 bg-primary/5 text-primary border-primary/20 shrink-0 shadow-xs whitespace-nowrap"
          >
            {ROLE_LABELS[employee.role]}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-2 sm:ml-4 rounded-full border border-border/40 bg-muted/20 p-0.5 sm:p-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-0 sm:gap-0.5">
          <ThemeSwitcher />
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        </div>
        
        <div className="h-4 w-[1px] bg-border/60 mx-0.5 sm:mx-1 shrink-0" />
        
        <DropdownMenu>
          <DropdownMenuTrigger className="relative inline-flex rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/50 shrink-0 touch-manipulation min-h-[44px] min-w-[44px] items-center justify-center">
            <Avatar className="h-8 w-8 sm:h-[30px] sm:w-[30px] md:h-[32px] md:w-[32px] border border-border/60 bg-background shadow-xs">
              <AvatarImage src={employee.profile_photo_url ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold text-[10px] sm:text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 sm:w-60" align="end" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold tracking-tight truncate">{employee.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate break-all">{employee.email}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer py-2.5 touch-manipulation">
                <User className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-destructive focus:text-destructive cursor-pointer py-2.5 touch-manipulation"
              >
                {signingOut ? (
                  <Spinner size="sm" className="mr-2 shrink-0" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4 shrink-0" />
                )}
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

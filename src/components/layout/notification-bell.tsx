"use client";

import { useState } from "react";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
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
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Notification } from "@/types/database";
import { formatDate } from "@/lib/utils/date";

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleRead(id: string, entityType?: string | null) {
    await markNotificationRead(id);
    setOpen(false);
    if (entityType === "leave") router.push("/leave");
    router.refresh();
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative inline-flex rounded-md p-1.5 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation min-h-[44px] min-w-[44px] items-center justify-center active:scale-95 transition-all">
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-px -top-px flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground shadow-sm ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-md" align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between py-2.5">
            Notifications
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs touch-manipulation" onClick={handleReadAll}>
                Mark all read
              </Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="max-h-[min(60vh,400px)] overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-1.5 p-3 cursor-pointer touch-manipulation min-h-[44px]"
                onClick={() => handleRead(n.id, n.entity_type)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium text-xs sm:text-sm leading-tight">{n.title}</span>
                  {!n.read_at && <Badge className="text-[9px] sm:text-[10px] shrink-0">New</Badge>}
                </div>
                {n.message && (
                  <span className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(n.created_at, "MMM d, h:mm a")}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

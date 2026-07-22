"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { PMRole } from "@/types/database";

// Extend UserRole to include legacy "Developer" role
type ExtendedUserRole = UserRole | "Developer";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Package,
  Users,
  CheckSquare,
  Star,
  Briefcase,
  LineChart,
  ChevronRight,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";

import { X } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  description?: string;
  salesHref?: boolean;
}

const employeeNav: NavItem[] = [
  { 
    title: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    description: "Overview & analytics"
  },
  { 
    title: "Projects", 
    href: "/projects", 
    icon: Briefcase,
    description: "Project management",
    roles: ["admin"]
  },
  { 
    title: "My Team", 
    href: "/team", 
    icon: Users,
    description: "Company directory"
  },
  { 
    title: "Leave", 
    href: "/leave", 
    icon: CalendarDays,
    description: "Time off requests"
  },
  { 
    title: "Policies", 
    href: "/policies", 
    icon: FileText,
    description: "Company policies"
  },
  { 
    title: "Assets", 
    href: "/assets", 
    icon: Package,
    description: "Equipment tracking"
  },
  {
    title: "Sales",
    href: "/sales",
    icon: LineChart,
    description: "Outreach & performance",
    salesHref: true,
  },
  { 
    title: "My Performance", 
    href: "/performance", 
    icon: Star,
    description: "Goals & reviews"
  },
];

const adminNav: NavItem[] = [
  { 
    title: "Employees", 
    href: "/admin/employees", 
    icon: Users, 
    roles: ["admin", "hr"],
    description: "Manage staff"
  },
  { 
    title: "Leave Approvals", 
    href: "/admin/leaves", 
    icon: CheckSquare, 
    roles: ["admin"],
    description: "Review requests"
  },
  { 
    title: "Performance Reviews", 
    href: "/admin/performance", 
    icon: Star, 
    roles: ["admin"],
    description: "Team evaluations"
  },
  { 
    title: "Assets", 
    href: "/admin/assets", 
    icon: Package, 
    roles: ["admin"],
    description: "Equipment management"
  },
  { 
    title: "Policies", 
    href: "/admin/policies", 
    icon: FileText, 
    roles: ["admin"],
    description: "Document management"
  },
  { 
    title: "Holidays", 
    href: "/admin/holidays", 
    icon: CalendarDays, 
    roles: ["admin"],
    description: "Company calendar"
  },
];

function NavLink({
  item,
  active,
  index,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  index: number;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2.5 sm:gap-3 rounded-lg px-2.5 sm:px-3 py-2.5 sm:py-2 text-[12px] sm:text-[13px] font-medium transition-all duration-200 ease-out touch-manipulation",
        "animate-slide-up opacity-0 fill-mode-[forwards] hover:scale-[1.02] active:scale-95",
        active
          ? "bg-linear-to-r from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/15 ring-1 ring-primary/20"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <Icon
        className={cn(
          "h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
          active ? "drop-shadow-sm opacity-100" : "opacity-80 group-hover:opacity-100 text-sidebar-foreground/60"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-tight">{item.title}</div>
        {item.description && (
          <div className="text-[10px] sm:text-xs opacity-75 truncate leading-tight mt-0.5">
            {item.description}
          </div>
        )}
      </div>
    </Link>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: number }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-4 px-3 first:mt-1">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/45">
        {title}
      </h3>
      {badge !== undefined && (
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-sidebar-accent text-sidebar-foreground/70">
          {badge}
        </Badge>
      )}
    </div>
  );
}

export function Sidebar({
  role,
  pmRole,
  profilePhotoUrl,
  fullName,
  designation,
  onNavClick,
  onClose,
}: {
  role: ExtendedUserRole;
  pmRole: PMRole;
  profilePhotoUrl?: string | null;
  fullName?: string;
  designation?: string;
  onNavClick?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const showSales = role === "admin" || role === "Developer";
  const isBd = pmRole === "bd" || (designation || "").toLowerCase().includes("business developer") || (designation || "").toLowerCase().includes("bd ");
  const filteredEmployeeNav = employeeNav.filter((item) => {
    if (item.salesHref) return showSales || isBd;
    return !item.roles || item.roles.includes(role as UserRole);
  });

  // Special handling for admin navigation - include "Developer" as admin-equivalent
  const filteredAdminNav = adminNav.filter((item) => {
    if (!item.roles) return true;
    
    // Allow if role is in the allowed roles OR if user is "Developer" and item allows "admin"
    return item.roles.includes(role as UserRole) || 
           (role === "Developer" && item.roles.includes("admin"));
  });

  return (
    <aside className="flex h-full w-full max-w-[280px] sm:max-w-[300px] md:max-w-[280px] lg:max-w-[260px] xl:max-w-[280px] 2xl:max-w-[300px] flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-md z-40">
      {/* Header / Logo */}
      <div className="flex h-12 sm:h-13 md:h-[52px] items-center justify-between border-b border-sidebar-border/50 px-3 sm:px-4 md:px-5 shrink-0 relative touch-manipulation">
        <Link href="/dashboard" className="flex items-center group flex-1 min-w-0">
          <BrandLogo
            lightLogoSrc="/images/mindvista-sidebar-logo-light.png"
            darkLogoSrc="/images/mindvista-sidebar-logo-dark.png"
            priority
            className="w-32 sm:w-36 max-w-full transition-transform duration-300 group-hover:scale-[1.02] origin-left"
            sizes="(max-width: 640px) 8rem, (max-width: 768px) 9rem, 9rem"
          />
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] h-9 w-9 rounded-md hover:bg-sidebar-accent transition-colors shrink-0 ml-2 text-sidebar-foreground/60 touch-manipulation active:scale-95"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Area */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3 md:p-4 scrollbar-modern overscroll-contain">
        {/* Portal Section */}
        <div>
          <SectionHeader title="Portal" />
          <div className="space-y-0.5 sm:space-y-1">{filteredEmployeeNav.map((item, i) => {
              const effectiveHref = item.salesHref
                ? showSales
                  ? "/sales/command"
                  : "/sales/my-day"
                : item.href;

              const active = item.salesHref
                ? pathname.startsWith("/sales")
                : pathname === effectiveHref ||
                  (effectiveHref !== "/dashboard" &&
                    pathname.startsWith(effectiveHref + "/"));

              return (
                <NavLink
                  key={effectiveHref}
                  item={{ ...item, href: effectiveHref }}
                  active={active}
                  index={i}
                  onClick={onNavClick}
                />
              );
            })}
          </div>
        </div>

        {/* Management Section */}
        {filteredAdminNav.length > 0 && (
          <div>
            <SectionHeader title="Management" />
            <div className="space-y-0.5 sm:space-y-1">{filteredAdminNav.map((item, i) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={active}
                    index={i + filteredEmployeeNav.length}
                    onClick={onNavClick}
                  />
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer - Profile Card */}
      <div className="border-t border-sidebar-border/30 px-2.5 sm:px-3 py-2 sm:py-1.5 shrink-0 bg-sidebar/85 backdrop-blur-md z-10 sticky bottom-0">
        <Link
          href="/profile"
          onClick={onNavClick}
          className="flex items-center gap-2 sm:gap-2.5 rounded-lg p-1.5 sm:p-1 transition-colors duration-200 hover:bg-sidebar-accent group touch-manipulation active:scale-[0.98] min-h-[44px]"
        >
          <div className="relative shrink-0">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={fullName ?? "Profile"}
                className="h-10 w-10 sm:h-9 sm:w-9 rounded-full object-cover ring-1 ring-border/40 group-hover:ring-primary/40 transition-all shadow-xs"
              />
            ) : (
              <div className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xs ring-1 ring-border/40 shadow-xs">
                {fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) ?? "U"}
              </div>
            )}
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-500 shadow-xs" />
          </div>
          <div className="flex-1 min-w-0 pl-0.5">
            <p className="text-[12px] sm:text-[12.5px] font-semibold tracking-tight truncate text-sidebar-foreground group-hover:text-primary transition-colors leading-tight mb-1">
              {fullName ?? "User"}
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium text-sidebar-foreground/50 truncate leading-tight">
              {designation ?? "Employee"}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

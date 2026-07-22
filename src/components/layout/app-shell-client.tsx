"use client";

import { useState, createContext, useContext, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AnimatedPage } from "@/components/ui/animated-page";
import type { Employee, Notification } from "@/types/database";

const SidebarContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function AppShellClient({
  employee,
  notifications,
  unreadCount,
  children,
}: {
  employee: Employee;
  notifications: Notification[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <SidebarContext.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-full max-w-[280px] sm:max-w-[300px] md:max-w-[280px]
            lg:relative lg:translate-x-0 lg:w-auto lg:max-w-[260px] xl:max-w-[280px] 2xl:max-w-[300px]
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          `}
        >
          <Sidebar
            role={employee.role}
            pmRole={employee.pm_role}
            profilePhotoUrl={employee.profile_photo_url}
            fullName={employee.full_name}
            designation={employee.designation}
            onNavClick={() => setSidebarOpen(false)}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0 w-full">
          <Header
            employee={employee}
            notifications={notifications}
            unreadCount={unreadCount}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/30 dark:bg-background overscroll-contain">
            <div className="mx-auto w-full max-w-[2560px] px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 2xl:px-10 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-8">
              <AnimatedPage>{children}</AnimatedPage>
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

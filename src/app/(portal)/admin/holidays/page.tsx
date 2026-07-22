import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { HolidayForm } from "@/components/admin/holiday-form";
import { DeleteHolidayButton } from "@/components/admin/delete-holiday-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseISO, format, isPast, isFuture, isToday, isSameMonth } from "date-fns";
import { CalendarDays, Trophy, Clock, PartyPopper, Calendar } from "lucide-react";

const MONTH_COLORS: Record<string, string> = {
  January: "via-red-500",
  February: "via-pink-500",
  March: "via-emerald-500",
  April: "via-purple-500",
  May: "via-amber-500",
  June: "via-cyan-500",
  July: "via-blue-500",
  August: "via-orange-500",
  September: "via-teal-500",
  October: "via-yellow-500",
  November: "via-emerald-500",
  December: "via-rose-500",
};

const DOT_COLORS: Record<string, string> = {
  January: "bg-red-500 text-white",
  February: "bg-pink-500 text-white",
  March: "bg-emerald-500 text-white",
  April: "bg-purple-500 text-white",
  May: "bg-amber-500 text-white",
  June: "bg-cyan-500 text-white",
  July: "bg-blue-500 text-white",
  August: "bg-orange-500 text-white",
  September: "bg-teal-500 text-white",
  October: "bg-yellow-500 text-white",
  November: "bg-emerald-500 text-white",
  December: "bg-rose-500 text-white",
};

export default async function AdminHolidaysPage() {
  await requireRole("admin");
  const supabase = createAdminClient();

  const { data: holidays } = await supabase
    .from("holidays")
    .select("*")
    .order("date");

  const now = new Date();
  const allHolidays = holidays ?? [];
  const upcoming = allHolidays.filter((h) => isFuture(parseISO(h.date)) || isToday(parseISO(h.date)));
  const past = allHolidays.filter((h) => isPast(parseISO(h.date)) && !isToday(parseISO(h.date)));
  const thisMonth = allHolidays.filter((h) => isSameMonth(parseISO(h.date), now));

  // Group by month
  const grouped = allHolidays.reduce<Record<string, typeof allHolidays>>((acc, holiday) => {
    const month = format(parseISO(holiday.date), "MMMM yyyy");
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {});

  const kpis = [
    {
      label: "Total Holidays",
      value: String(allHolidays.length),
      sub: "Configured yearly",
      icon: CalendarDays,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Upcoming",
      value: String(upcoming.length),
      sub: "Future holidays",
      icon: Trophy,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "This Month",
      value: String(thisMonth.length),
      sub: "Current period",
      icon: PartyPopper,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
    {
      label: "Past",
      value: String(past.length),
      sub: "Completed holidays",
      icon: Clock,
      grad: "via-slate-500",
      iconBg: "bg-slate-500/10",
      iconText: "text-slate-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <Calendar className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Holiday Calendar</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Configure company-wide holidays and observances excluded from leave quotas
                </p>
              </div>
            </div>

            <HolidayForm />
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="group relative flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-border/80"
            >
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent to-transparent opacity-80",
                  kpi.grad
                )}
              />
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center shrink-0">
                    <Icon className={cn("h-5 w-5 drop-shadow-sm", kpi.iconText)} strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {kpi.label}
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-black tabular-nums tracking-tight leading-none">
                    {kpi.value}
                  </span>
                  <p className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">{kpi.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Holiday Cards by Month */}
      {allHolidays.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-16 text-center shadow-sm">
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
            <div className="flex items-center justify-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 opacity-50" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold">No Holidays Configured</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add company holidays to exclude them automatically from employee leave calculations.
              </p>
            </div>
            <HolidayForm />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, items]) => {
            const monthName = month.split(" ")[0];
            const gradClass = MONTH_COLORS[monthName] ?? "via-primary";
            const badgeColor = DOT_COLORS[monthName] ?? "bg-primary text-primary-foreground";

            return (
              <div key={month} className="space-y-4">
                <div className="flex items-center gap-2.5 px-1">
                  <div className={cn("h-2.5 w-2.5 rounded-full", badgeColor.split(" ")[0])} />
                  <h2 className="text-base font-bold tracking-tight">{month}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                    {items.length} {items.length === 1 ? "holiday" : "holidays"}
                  </span>
                </div>

                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                  {items.map((holiday) => {
                    const holidayDate = parseISO(holiday.date);
                    const isPastDate = isPast(holidayDate) && !isToday(holidayDate);
                    const isTodayDate = isToday(holidayDate);

                    return (
                      <div
                        key={holiday.id}
                        className={cn(
                          "group relative flex items-center justify-between rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-4 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300",
                          isPastDate && "opacity-60"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent to-transparent opacity-70",
                          gradClass
                        )} />

                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Date box */}
                          <div className={cn("flex flex-col items-center justify-center rounded-xl min-w-[50px] h-[54px] shadow-sm shrink-0", badgeColor)}>
                            <span className="text-[10px] font-black uppercase leading-none tracking-widest opacity-90">
                              {format(holidayDate, "MMM")}
                            </span>
                            <span className="text-xl font-black leading-none mt-1">
                              {format(holidayDate, "d")}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-sm leading-tight text-foreground truncate">
                              {holiday.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {holiday.description || "Company holiday"}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground/80">
                                {format(holidayDate, "EEEE")}
                              </span>
                              {isTodayDate && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                                  Today
                                </Badge>
                              )}
                              {isPastDate && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                                  Past
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delete Action */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <DeleteHolidayButton holidayId={holiday.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

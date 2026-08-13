import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Users, Download, CalendarDays } from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/components/ui/card';
import { getLeaveHistory } from '@/features/leaves/services/leaves';

import { getOrganizations } from "@/features/organization/services/organizations";
import Select from "@/shared/components/ui/Select";

const LEAVE_COLORS: Record<string, string> = {
  "Annual Leave": "bg-green-500",
  "Casual Leave": "bg-orange-500",
  "Sick Leave": "bg-red-500",
  "Comp Off": "bg-teal-500",
  "Personal": "bg-primary",
  "Bereavement": "bg-gray-500",
  "Maternity": "bg-pink-500",
  "Paternity": "bg-blue-500",
  "Holiday": "bg-purple-600",
};

function getLeaveColor(type: string): string {
  if (!type) return "bg-amber-500";
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('holiday')) return LEAVE_COLORS["Holiday"];
  if (normalizedType.includes('sick')) return LEAVE_COLORS["Sick Leave"];
  if (normalizedType.includes('casual')) return LEAVE_COLORS["Casual Leave"];
  if (normalizedType.includes('annual')) return LEAVE_COLORS["Annual Leave"];
  if (normalizedType.includes('comp')) return LEAVE_COLORS["Comp Off"];
  if (normalizedType.includes('personal')) return LEAVE_COLORS["Personal"];
  
  return LEAVE_COLORS[type] || "bg-amber-500";
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function TeamCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Navigate months
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Fetch data
  useEffect(() => {
    Promise.all([
      getLeaveHistory({ status: 'APPROVED' }),
      getOrganizations()
    ])
      .then(([leaveRes, orgRes]) => {
        const leaveRaw = Array.isArray(leaveRes?.data) ? leaveRes.data : (leaveRes?.data?.data ?? leaveRes ?? []);
        setLeaveData(leaveRaw);

        // Extract holidays from organization data structure
        const org = Array.isArray(orgRes) ? orgRes[0] : (orgRes as any)?.data || orgRes;
        if (org?.public_holidays) {
          const formattedHolidays = org.public_holidays.map((h: string) => {
            const [datePart, namePart] = h.includes(':') ? h.split(':') : [h, 'Public Holiday'];
            const date = datePart.trim();
            const name = namePart.trim();
            
            // Timezone-proof parsing: YYYY-MM-DD
            const [y, m, d] = date.split('-').map(Number);
            return { 
              date, 
              name, 
              isHoliday: true,
              parsedDate: { year: y, month: m - 1, day: d } // Month is 0-indexed
            };
          });
          setHolidays(formattedHolidays);
        }
      })
      .catch(() => setLeaveData([]));
  }, []);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayIndex = getFirstDayOfMonth(viewYear, viewMonth);

  // Build a map: day -> list of events (leaves + holidays)
  const dayEventsMap = useMemo(() => {
    const map: Record<number, any[]> = {};

    // Process Leaves
    leaveData.forEach((leave: any) => {
      if (!leave.start_date || !leave.end_date) return;
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(viewYear, viewMonth, d);
        date.setHours(0, 0, 0, 0);
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(23, 59, 59, 999);
        if (date >= s && date <= e) {
          if (!map[d]) map[d] = [];
          map[d].push(leave);
        }
      }
    });

    // Process Holidays
    holidays.forEach((holiday: any) => {
      const { year, month, day } = holiday.parsedDate || {};
      if (year === viewYear && month === viewMonth) {
        if (!map[day]) map[day] = [];
        map[day].push({
          ...holiday,
          leave_type: 'Official Holiday',
          user: { details: { first_name: holiday.name, last_name: '' } }
        });
      }
    });

    return map;
  }, [leaveData, holidays, viewYear, viewMonth]);

  const yearHolidays = useMemo(() => {
    return holidays.filter(h => h.parsedDate?.year === viewYear).sort((a, b) => {
      if (a.parsedDate.month !== b.parsedDate.month) return a.parsedDate.month - b.parsedDate.month;
      return a.parsedDate.day - b.parsedDate.day;
    });
  }, [holidays, viewYear]);

  const downloadHolidays = () => {
    if (yearHolidays.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," + "Date,Holiday Name\n" + yearHolidays.map(h => `${h.date},"${h.name}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `holidays_${viewYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Events on the selected day
  const selectedDayEvents = selectedDay ? (dayEventsMap[selectedDay] || []) : [];

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Calendar</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">View approved team leave schedule by month</p>
          </div>
        </div>
        <Select
          value={String(viewYear)}
          onChange={(val) => { setViewYear(Number(val)); setSelectedDay(null); }}
          options={Array.from({length: 10}, (_, i) => today.getFullYear() - 3 + i).map(y => ({ value: String(y), label: `${y} Year` }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={prevMonth}
                    className="h-10 w-10 hover:bg-muted rounded transition-colors p-0"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-sm font-semibold px-3 min-w-[140px] text-center">
                    {monthLabel}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={nextMonth}
                    className="h-10 w-10 hover:bg-muted rounded transition-colors p-0"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-muted-foreground pb-1"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty offset cells */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const events = dayEventsMap[day] || [];
                    const hasLeave = events.length > 0;
                    const isTod = isToday(day);
                    const isSel = selectedDay === day;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(isSel ? null : day)}
                        className={`
                          aspect-square border rounded-sm p-1 transition-colors relative flex flex-col items-start
                          ${isSel
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                          }
                          ${isTod ? "ring-2 ring-primary/40" : ""}
                        `}
                        aria-label={`${day} ${monthLabel}${hasLeave ? `, ${events.length} on leave` : ""}`}
                      >
                        <span className={`text-xs font-medium ${isTod ? "text-primary" : "text-foreground"}`}>
                          {day}
                        </span>
                        {/* Up to 3 colored dots for leave types */}
                        {hasLeave && (
                          <div className="flex flex-wrap gap-0.5 mt-auto">
                            {events.slice(0, 3).map((ev, idx) => {
                              const type = ev.leave_policy?.leave_type || ev.leave_policy?.name || ev.leave_type || "";
                              return (
                                <span
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full ${getLeaveColor(type)}`}
                                />
                              );
                            })}
                            {events.length > 3 && (
                              <span className="text-[9px] text-muted-foreground leading-none">+{events.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                  {Object.entries(LEAVE_COLORS).map(([type, color]) => (
                    <span key={type} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar panels */}
        <div className="flex flex-col gap-4">
          {/* Day detail panel */}
          <Card className="flex-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {selectedDay
                    ? `${monthLabel.split(" ")[0]} ${selectedDay}`
                    : "Select a Day"}
                </CardTitle>
                {selectedDay && (
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedDay(null)}
                    className="h-10 w-10 hover:bg-muted rounded p-0"
                    aria-label="Clear selection"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDay && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click any date to see who is on leave
                </p>
              )}
              {selectedDay && selectedDayEvents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No events on this day
                </p>
              )}
              {selectedDay && selectedDayEvents.length > 0 && (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedDayEvents.length} event{selectedDayEvents.length > 1 ? "s" : ""} 
                  </p>
                  {selectedDayEvents.map((ev: any, idx: number) => {
                    const isHoliday = ev.isHoliday;
                    const firstName =
                      ev.user?.details?.first_name ||
                      ev.employee?.first_name || "";
                    const lastName =
                      ev.user?.details?.last_name ||
                      ev.employee?.last_name || "";
                    const name = isHoliday ? ev.name : `${firstName} ${lastName}`.trim() || ev.username || `Employee #${ev.user_id}`;
                    const dept = isHoliday ? "All Departments" :
                      (ev.user?.details?.department?.department_name ||
                      ev.employee?.department?.department_name || "");
                    const type = isHoliday ? "Official Holiday" :
                      (ev.leave_policy?.leave_type ||
                      ev.leave_policy?.name ||
                      ev.leave_type || "Leave");
                    const color = getLeaveColor(type);

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-muted rounded-sm border border-border"
                      >
                        <div className={`w-2 h-full min-h-[36px] rounded-full flex-shrink-0 ${color}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          {dept && (
                            <p className="text-xs text-muted-foreground truncate">{dept}</p>
                          )}
                          <span className="text-xs text-muted-foreground">{type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Holidays panel */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Holidays ({viewYear})
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs font-medium border-border text-foreground hover:bg-muted"
                  onClick={downloadHolidays}
                  disabled={yearHolidays.length === 0}
                >
                  <Download className="w-3 h-3 mr-1.5" /> Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 min-h-[200px] max-h-[350px]">
              {yearHolidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                  <p className="text-sm text-muted-foreground font-medium">No holidays this year</p>
                  <p className="text-xs text-muted-foreground mt-1">There are no public holidays scheduled for {viewYear}.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 p-4">
                  {Object.entries(
                    yearHolidays.reduce((acc, holiday) => {
                      const monthStr = new Date(viewYear, holiday.parsedDate.month, 1).toLocaleString("default", { month: "long" });
                      if (!acc[monthStr]) acc[monthStr] = [];
                      acc[monthStr].push(holiday);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([month, monthHolidaysList]) => (
                    <div key={month} className="space-y-2">
                      <h4 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-1">{month}</h4>
                      <div className="divide-y divide-gray-100 dark:divide-border border border-border rounded-lg overflow-hidden shadow-sm bg-card">
                        {(monthHolidaysList as any[]).map((holiday, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 hover:bg-muted/80 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900 flex flex-col items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold uppercase leading-none">{month.slice(0, 3)}</span>
                                <span className="text-sm font-bold leading-none mt-0.5">{holiday.parsedDate.day}</span>
                              </div>
                              <div className="pt-0.5">
                                <p className="text-sm font-semibold text-foreground leading-none">{holiday.name}</p>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-none">Official Holiday • All Departments</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

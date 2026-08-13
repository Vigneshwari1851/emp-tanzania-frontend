import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./utils";

interface CalendarProps {
  className?: string;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  events?: Array<{ date: number; type: string; title?: string; time?: string }>;
}

export const Calendar: React.FC<CalendarProps> = ({
  className,
  selectedDate: initialSelectedDate,
  onDateSelect,
  events = [],
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialSelectedDate);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    if (onDateSelect) {
      onDateSelect(newDate);
    }
  };

  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return selectedDate && 
           day === selectedDate.getDate() && 
           currentMonth === selectedDate.getMonth() && 
           currentYear === selectedDate.getFullYear();
  };

  return (
    <div className={cn("select-none w-full", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground tracking-tight">
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{day}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const event = events.find(e => e.date === day);
          const hasEvent = !!event;
          const isTodayDay = isToday(day);
          const isSelectedDay = isSelected(day);

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative group overflow-hidden",
                isTodayDay 
                  ? "bg-primary text-white font-bold shadow-sm shadow-primary-200 ring-2 ring-primary-600 ring-offset-2"
                  : isSelectedDay
                  ? "bg-primary/10 text-primary font-bold border-2 border-primary-200"
                  : "text-foreground hover:bg-primary/10/50 hover:text-primary"
              )}
            >
              <span className="z-10">{day}</span>
              
              {/* Event indicators */}
              {hasEvent && !isTodayDay && !isSelectedDay && (
                <div className={cn(
                  "absolute bottom-2.5 w-1 h-1 rounded-full",
                  event.type === 'holiday' ? "bg-emerald-500" :
                  event.type === 'deadline' ? "bg-rose-500" :
                  "bg-primary"
                )} />
              )}

              {/* Interaction highlight */}
              <div className="absolute inset-0 bg-primary/0 group-active:bg-primary/10 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

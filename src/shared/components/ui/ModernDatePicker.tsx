import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react";
import { cn } from "./utils";

interface ModernDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  align?: 'left' | 'right';
  holidayDates?: string[];
  highlightWeekends?: boolean;
}

type ViewMode = "days" | "months" | "years";

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  className,
  minDate,
  maxDate,
  disabled,
  required,
  error,
  align = 'left',
  holidayDates,
  highlightWeekends = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [dropdownUp, setDropdownUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 290; 
      
      let top = rect.bottom + scrollY;
      let dropdownUpValue = false;
      
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        top = rect.top + scrollY - dropdownHeight - 4;
        dropdownUpValue = true;
      } else {
        top = rect.bottom + scrollY + 4;
      }

      setDropdownUp(dropdownUpValue);
      setCoords({
        top,
        left: align === 'right' ? rect.right + scrollX - 300 : rect.left + scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const startScrollY = window.scrollY;
    const startScrollX = window.scrollX;

    const handleScroll = (event: Event) => {
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      ) {
        return;
      }
      
      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;
      
      if (
        Math.abs(currentScrollY - startScrollY) > 2 ||
        Math.abs(currentScrollX - startScrollX) > 2
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const fullMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && minDate) {
      const minD = new Date(minDate);
      if (!isNaN(minD.getTime())) {
        const minYear = minD.getFullYear();
        const minMonth = minD.getMonth();
        if (viewYear < minYear || (viewYear === minYear && viewMonth < minMonth)) {
          setViewYear(minYear);
          setViewMonth(minMonth);
        }
      }
    }
  }, [isOpen, minDate]);

  const handleDateSelect = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleMonthSelect = (monthIdx: number) => {
    if (minDate) {
      const minD = new Date(minDate);
      if (!isNaN(minD.getTime())) {
        if (viewYear < minD.getFullYear() || (viewYear === minD.getFullYear() && monthIdx < minD.getMonth())) {
          return;
        }
      }
    }
    setViewMonth(monthIdx);
    setViewMode("days");
  };

  const handleYearSelect = (year: number) => {
    if (minDate) {
      const minD = new Date(minDate);
      if (!isNaN(minD.getTime())) {
        if (year < minD.getFullYear()) {
          return;
        }
      }
    }
    setViewYear(year);
    setViewMode("months");
  };

  const nextView = () => {
    if (isNextDisabled) return;
    if (viewMode === "days") {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    } else if (viewMode === "years") {
      setViewYear(viewYear + 12);
    }
  };

  const prevView = () => {
    if (isPrevDisabled) return;
    if (viewMode === "days") {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    } else if (viewMode === "years") {
      setViewYear(viewYear - 12);
    }
  };



  const yearRangeStart = Math.floor(viewYear / 12) * 12;

  const isPrevDisabled = (() => {
    if (!minDate) return false;
    const minD = new Date(minDate);
    if (isNaN(minD.getTime())) return false;
    const minYear = minD.getFullYear();
    const minMonth = minD.getMonth();

    if (viewMode === "days") {
      let prevMonth = viewMonth - 1;
      let prevYear = viewYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear = viewYear - 1;
      }
      return prevYear < minYear || (prevYear === minYear && prevMonth < minMonth);
    } else if (viewMode === "months") {
      return viewYear <= minYear;
    } else if (viewMode === "years") {
      return (yearRangeStart - 1) < minYear;
    }
    return false;
  })();

  const isNextDisabled = (() => {
    if (!maxDate) return false;
    const maxD = new Date(maxDate);
    if (isNaN(maxD.getTime())) return false;
    const maxYear = maxD.getFullYear();
    const maxMonth = maxD.getMonth();

    if (viewMode === "days") {
      let nextMonth = viewMonth + 1;
      let nextYear = viewYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear = viewYear + 1;
      }
      return nextYear > maxYear || (nextYear === maxYear && nextMonth > maxMonth);
    } else if (viewMode === "months") {
      return viewYear >= maxYear;
    } else if (viewMode === "years") {
      return (yearRangeStart + 11) >= maxYear;
    }
    return false;
  })();

  


  return (
    <div className={cn("relative w-full h-10", className)} ref={containerRef}>
      <div 
        onClick={() => {
          if (disabled) return;
          if (!isOpen) {
            setDropdownUp(false);
            updateCoords();
          }
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-full h-full px-3.5 bg-card border rounded-lg shadow-sm cursor-pointer flex items-center justify-between transition-all group",
          disabled ? "bg-muted border-border text-muted-foreground cursor-not-allowed" : 
          error ? "border-red-500 ring-2 ring-red-500/20" : 
          "border-border hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
          isOpen && !disabled && "border-primary ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className={cn("w-4 h-4", value ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-sm truncate", !value && "text-muted-foreground font-normal")}>
            {value 
              ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : placeholder
            }
          </span>
        </div>
        {!disabled && value && !required && (
          <X 
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="w-4 h-4 text-muted-foreground hover:text-rose-500 transition-colors" 
          />
        )}
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 9999,
          }}
          className={cn(
            "bg-card rounded-lg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-border p-4 min-w-[300px] animate-in fade-in zoom-in-95 duration-200",
            dropdownUp ? "origin-bottom" : "origin-top"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button 
              type="button"
              onClick={() => {
                if (viewMode === "days") setViewMode("months");
                else if (viewMode === "months") setViewMode("years");
              }}
              className="text-sm font-bold text-foreground hover:bg-muted/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              {viewMode === "days" && `${fullMonthNames[viewMonth]}, ${viewYear}`}
              {viewMode === "months" && `${viewYear}`}
              {viewMode === "years" && `${yearRangeStart} - ${yearRangeStart + 11}`}
            </button>
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={prevView} 
                disabled={isPrevDisabled}
                className={cn(
                  "p-1.5 hover:bg-muted rounded-lg transition-colors",
                  isPrevDisabled && "opacity-35 cursor-not-allowed hover:bg-transparent text-muted-foreground/35"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={nextView} 
                disabled={isNextDisabled}
                className={cn(
                  "p-1.5 hover:bg-muted rounded-lg transition-colors",
                  isNextDisabled && "opacity-35 cursor-not-allowed hover:bg-transparent text-muted-foreground/35"
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Views */}
          {viewMode === "days" && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateString = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = value === dateString;
                  
                  let isDateDisabled = false;
                  if (minDate && dateString < minDate) {
                    isDateDisabled = true;
                  }
                  if (maxDate && dateString > maxDate) {
                    isDateDisabled = true;
                  }

                  const dObj = new Date(viewYear, viewMonth, day);
                  const isWeekend = highlightWeekends && (dObj.getDay() === 0 || dObj.getDay() === 6);
                  const isHoliday = holidayDates?.includes(dateString);

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDateDisabled}
                      onClick={() => handleDateSelect(day)}
                      className={cn(
                        "aspect-square text-xs rounded-lg transition-all relative flex flex-col items-center justify-center gap-0.5",
                        isSelected ? "bg-primary text-primary-foreground font-bold" : 
                        isDateDisabled ? "text-muted-foreground/30 hover:bg-transparent cursor-not-allowed opacity-35" :
                        isHoliday ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100 border border-amber-200 dark:border-amber-900/50 font-semibold" :
                        isWeekend ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium" :
                        "text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <span>{day}</span>
                      {isHoliday && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 animate-in fade-in zoom-in-95 duration-200">
              {monthNames.map((m, i) => {
                const isMonthDisabled = (() => {
                  if (!minDate) return false;
                  const minD = new Date(minDate);
                  if (isNaN(minD.getTime())) return false;
                  return viewYear < minD.getFullYear() || (viewYear === minD.getFullYear() && i < minD.getMonth());
                })();
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isMonthDisabled}
                    onClick={() => handleMonthSelect(i)}
                    className={cn(
                      "py-3 text-xs rounded-lg transition-all font-medium",
                      viewMonth === i ? "bg-primary text-primary-foreground font-bold" : 
                      isMonthDisabled ? "text-muted-foreground/30 hover:bg-transparent cursor-not-allowed opacity-35" :
                      "text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "years" && (
            <div className="grid grid-cols-3 gap-2 animate-in fade-in zoom-in-95 duration-200">
              {Array.from({ length: 12 }).map((_, i) => {
                const year = yearRangeStart + i;
                const isYearDisabled = (() => {
                  if (!minDate) return false;
                  const minD = new Date(minDate);
                  if (isNaN(minD.getTime())) return false;
                  return year < minD.getFullYear();
                })();
                return (
                  <button
                    key={year}
                    type="button"
                    disabled={isYearDisabled}
                    onClick={() => handleYearSelect(year)}
                    className={cn(
                      "py-3 text-xs rounded-lg transition-all font-medium",
                      viewYear === year ? "bg-primary text-primary-foreground font-bold" : 
                      isYearDisabled ? "text-muted-foreground/30 hover:bg-transparent cursor-not-allowed opacity-35" :
                      "text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ModernDatePicker;

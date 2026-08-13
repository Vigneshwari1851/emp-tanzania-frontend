import React, { useState, useRef, useEffect } from "react";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "./Calendar";
import { cn } from "./utils";

interface DatePickerProps {
  value?: string; // ISO string or empty
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  className,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : undefined;

  const handleDateSelect = (date: Date) => {
    // Correctly format to YYYY-MM-DD using local time components to avoid timezone offset issues (previously toISOString was causing one day shift)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    onChange(formattedDate);
    setIsOpen(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3.5 h-10 bg-card border border-border rounded-lg shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
          isOpen && "border-primary ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className={cn("w-4 h-4", selectedDate ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-sm truncate", !selectedDate && "text-muted-foreground font-normal")}>
            {selectedDate 
              ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : placeholder
            }
          </span>
        </div>
        {value && !required && (
          <X 
            onClick={clearDate}
            className="w-4 h-4 text-muted-foreground hover:text-rose-500 transition-colors" 
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 p-4 bg-card rounded-lg shadow-sm border border-border min-w-[320px] animate-in fade-in zoom-in duration-200 origin-top-left">
          <Calendar 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function CustomDropdown({ value, onChange, options, placeholder, className = "" }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-card border border-border rounded-lg pl-3.5 pr-9 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer h-9 shadow-sm flex items-center justify-between"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder || "Select..."}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground absolute right-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-sm py-1 max-h-60 overflow-y-auto scrollbar-hide">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                value === opt.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

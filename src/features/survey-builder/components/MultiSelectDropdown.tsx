import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface MultiSelectDropdownProps {
  value: string; // Comma separated string of values, e.g. "HR, Sales"
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function MultiSelectDropdown({ value, onChange, options, placeholder, className = "" }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert comma separated string to array
  const selectedValues = value ? value.split(",").map(v => v.trim()).filter(v => v !== "") : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (optValue: string) => {
    let newSelected: string[];
    
    if (optValue === "All Departments") {
      // If "All Departments" is clicked, we either select it alone or clear everything
      if (selectedValues.includes("All Departments")) {
        newSelected = [];
      } else {
        newSelected = ["All Departments"];
      }
    } else {
      // If a specific department is clicked, remove "All Departments" if it was selected
      newSelected = selectedValues.filter(v => v !== "All Departments");
      
      if (newSelected.includes(optValue)) {
        newSelected = newSelected.filter(v => v !== optValue);
      } else {
        newSelected.push(optValue);
      }
    }

    // if nothing is selected, default to All Departments maybe? Let's just allow empty or let caller handle it
    onChange(newSelected.join(", "));
  };

  const displayText = selectedValues.length === 0 
    ? placeholder || "Select..."
    : selectedValues.length <= 2 
      ? selectedValues.join(", ") 
      : `${selectedValues.length} selected`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-card border border-border rounded-lg pl-3.5 pr-9 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer min-h-[36px] shadow-sm flex items-center justify-between text-left"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-sm py-1 max-h-60 overflow-y-auto scrollbar-hide">
          {options.map((opt) => {
            const isSelected = selectedValues.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleToggle(opt.value)}
                className="w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted/50 text-foreground"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600 bg-card"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className={`truncate ${isSelected ? "font-medium text-foreground" : ""}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

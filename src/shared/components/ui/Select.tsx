import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  className?: string;
  onBlur?: () => void;
  direction?: "bottom" | "top";
}

interface Coords {
  top: number;
  bottom: number;
  left: number;
  width: number;
  openUp: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  error,
  required,
  name,
  id,
  disabled = false,
  searchable = false,
  clearable = false,
  className = "",
  onBlur,
  direction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const close = useCallback(() => {
    setIsOpen(false);
    setCoords(null);
    setSearch("");
    setHighlightedIndex(-1);
  }, []);

  const measure = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUp = direction === "top" ? true : false;
    setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, openUp });
  }, [direction]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
      onBlur?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close, onBlur]);

  useEffect(() => {
    if (!isOpen) return;
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [isOpen, measure]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) { close(); return; }
    measure();
    setIsOpen(true);
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    close();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) { handleToggle(); return; }
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) return;
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (isOpen) {
        close();
      } else {
        handleToggle();
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        close();
      }
    }
  };

  const panelStyle: React.CSSProperties = coords
    ? {
        position: "fixed",
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
        ...(coords.openUp
          ? { bottom: window.innerHeight - coords.top + 4 }
          : { top: coords.bottom + 4 }),
      }
    : { display: "none" };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={id || name}
          name={name}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full flex items-center justify-between gap-2 px-3.5 h-10 text-sm border rounded-lg bg-card shadow-sm transition-all outline-none ${
            error
              ? "border-red-400 ring-2 ring-red-400/20"
              : isOpen
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
          } ${disabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "cursor-pointer text-left"}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={`flex-1 truncate ${selectedOption ? "text-foreground" : "text-muted-foreground"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {clearable && value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-muted rounded transition-colors shrink-0"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            data-select-portal="true"
            className="bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            role="listbox"
          >
            {searchable && (
              <div className="sticky top-0 p-2 bg-card border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-sm outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary bg-transparent"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape") {
                        handleKeyDown(e);
                      }
                      e.stopPropagation();
                    }}
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto max-h-60 py-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => {
                  const isSelected = value === option.value;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-all ${
                        isHighlighted
                          ? "bg-primary/10 text-primary"
                          : isSelected
                            ? "bg-primary/5 text-primary font-medium"
                            : "text-foreground hover:bg-muted"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(option.value);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-sm text-center text-muted-foreground">
                  No matching results
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      {error && (
        <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
          <span className="w-1 h-1 bg-red-500 rounded-full shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;

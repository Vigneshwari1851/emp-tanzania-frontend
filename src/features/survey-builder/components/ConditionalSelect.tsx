import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface Option {
  value: number | string;
  label: string;
}

interface ConditionalSelectProps {
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  options: Option[];
  placeholder: string;
}

interface Coords {
  top: number;
  bottom: number;
  left: number;
  width: number;
  openUp: boolean;
}

export default function ConditionalSelect({ value, onChange, options, placeholder }: ConditionalSelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setCoords(null);
  }, []);

  const measure = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUp = false;
    setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, openUp });
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  const handleToggle = () => {
    if (open) { close(); return; }
    measure();
    setOpen(true);
  };

  const handleSelect = (optValue: number | string) => {
    onChange(optValue);
    close();
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
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs rounded-lg border transition-all ${
          open
            ? "border-primary ring-1 ring-primary/30"
            : "border-border hover:border-gray-300"
        } bg-card text-left`}
      >
        <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground"}`} title={selected?.label}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && createPortal(
        <div ref={panelRef} style={panelStyle} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-y-auto max-h-40 py-1 custom-scrollbar">
            {options.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-muted-foreground">No options available</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-all ${
                    opt.value === value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                  onClick={() => handleSelect(opt.value)}
                  title={opt.label}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

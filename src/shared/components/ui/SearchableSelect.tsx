import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  error,
  required,
  name,
  id,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Find selected option label to display in the input
  const selectedOption = options.find(opt => opt.value === value);

  // Sync search term with value prop when value changes
  useEffect(() => {
    setSearchTerm(selectedOption ? selectedOption.label : value || "");
  }, [value, options, selectedOption]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term to current selected value
        setSearchTerm(selectedOption ? selectedOption.label : value || "");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, selectedOption]);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          id={id || name}
          name={name}
          disabled={disabled}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${
            error
              ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300'
              : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
        />
        <ChevronDown 
          className={`absolute right-3 top-3 w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''} cursor-pointer`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        />

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded shadow-lg max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <ul className="py-1">
                {filteredOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors ${
                        value === option.value ? 'bg-blue-50 text-primary font-medium' : 'text-foreground'
                      }`}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                    >
                      <span className="truncate">{option.label}</span>
                      {value === option.value && <Check className="w-4 h-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                No matching results
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default SearchableSelect;

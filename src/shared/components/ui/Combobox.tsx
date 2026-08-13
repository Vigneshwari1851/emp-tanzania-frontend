import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, PlusCircle } from 'lucide-react';

interface Option {
  id: string | number;
  name: string;
}

interface ComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  name?: string;
  id?: string;
  allowCustom?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
}

const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select or type...",
  label,
  error,
  required,
  name,
  id,
  allowCustom = true,
  onBlur,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal input value with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    return options.filter(option =>
      option.name.toLowerCase().startsWith(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  const showAddNew = allowCustom && inputValue && !options.some(opt => opt.name.toLowerCase() === inputValue.toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If it's a custom value and allowed, commit it on blur
        if (allowCustom && inputValue && !options.some(opt => opt.name === inputValue)) {
            // onChange(inputValue); // Already handled in handleInputChange for immediate sync
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, options, allowCustom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
    onChange(val); // Update parent immediately for free text
  };

  const handleSelect = (optionName: string) => {
    if (disabled) return;
    onChange(optionName);
    setInputValue(optionName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => 
        prev < (showAddNew ? filteredOptions.length : filteredOptions.length - 1) ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (isOpen) {
        if (highlightedIndex >= 0) {
          e.preventDefault();
          if (highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex].name);
          } else if (showAddNew) {
            handleSelect(inputValue);
          }
        } else {
            setIsOpen(false);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2 w-full" ref={containerRef}>
      {label && (
        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            id={id || name}
            name={name}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => !disabled && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className={`w-full pl-3 pr-10 py-2 border rounded-sm bg-card focus:outline-none focus:ring-4 transition-all ${
              error ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-300 dark:border-border focus:ring-blue-400/20 focus:border-blue-400'
            } group-hover:border-gray-400 dark:group-hover:border-border ${disabled ? 'bg-muted opacity-60 cursor-not-allowed' : ''}`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <button 
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className="p-1 hover:bg-muted rounded-sm transition-colors"
             >
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
             </button>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-1 bg-card border border-border rounded-lg shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="overflow-y-auto max-h-60 py-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-all ${
                      highlightedIndex === index ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 
                      value === option.name ? 'bg-blue-50/50 dark:bg-blue-950/20 text-primary font-medium' : 'text-foreground hover:bg-muted'
                    }`}
                    onClick={() => handleSelect(option.name)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="truncate">{option.name}</span>
                    {value === option.name && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))
              ) : !showAddNew && (
                <div className="px-4 py-6 text-sm text-center text-muted-foreground flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <PlusCircle className="w-5 h-5 text-gray-300 dark:text-gray-500" />
                  </div>
                  No matching banks found
                </div>
              )}

              {showAddNew && (
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-primary font-semibold border-t border-gray-50 dark:border-border transition-all ${
                    highlightedIndex === filteredOptions.length ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                  }`}
                  onClick={() => handleSelect(inputValue)}
                  onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add new: "{inputValue}"</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-[11px] font-medium text-red-500 mt-1.5 flex items-center gap-1.5 animate-in slide-in-from-top-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  );
};

export default Combobox;

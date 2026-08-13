import React, { useState, useRef, useEffect } from 'react';
import { useTolgee, useTranslate } from '@tolgee/react';
import { LANGUAGES } from '@/shared/i18n/tolgee';
import { Globe, Check, ChevronDown } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const tolgee = useTolgee(['language']);
  const { t } = useTranslate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = tolgee.getLanguage() || 'en';
  const currentLang = LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: string) => {
    tolgee.changeLanguage(code);
    localStorage.setItem('app_language', code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-muted rounded-sm transition-all text-muted-foreground hover:text-foreground text-sm font-medium focus:outline-none"
        aria-label={t('select_language', 'Select Language')}
        title={t('select_language', 'Select Language')}
      >
        <Globe className="w-[18px] h-[18px] text-muted-foreground" />
        <span className="text-xs uppercase font-semibold tracking-wider text-foreground">
          {currentLang.code}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-md shadow-lg py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground border-b border-border/60">
            {t('select_language', 'Select Language')}
          </div>
          <div className="py-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLangCode;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

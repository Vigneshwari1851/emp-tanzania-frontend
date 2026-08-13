import { LegalEntityTaxTab } from './LegalEntityTaxTab';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { GeographicalLocationTab } from './GeographicalLocationTab';
import { HolidaysTab } from './HolidaysTab';
import React, { useState } from "react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { Card, CardHeader, CardContent, CardTitle } from "@/shared/components/ui/card";
import {
  Building2,
  Briefcase,
  MapPin,
  Trash2,
  PlusCircle,
  Pencil,
  Save,
  Loader2,
  ChevronRight,
  Search,
  Check,
  Image as ImageIcon,
  Calendar,
  Sunrise,
  Sun,
  Moon,
  Plus,
  Coffee,
  Clock,
  Settings2,
  UserCheck,
  Upload,
  Network,
  Info
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import FileUpload from "@/shared/components/ui/FileUpload";
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { UserRole } from "@/shared/types/rbac";
import { DesignationSettingsForm } from "./DesignationSettingsForm";
import { DepartmentHierarchyView } from "./DepartmentHierarchyView";
import Select from "@/shared/components/ui/Select";

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  const hourStr = hour.toString().padStart(2, "0");
  const value = `${hourStr}:${minute}`;
  
  // Format for display (e.g. 09:30 AM / PM)
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const label = `${displayHour.toString().padStart(2, "0")}:${minute} ${ampm}`;
  
  return { value, label };
});

interface ModernTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ModernTimePicker: React.FC<ModernTimePickerProps> = ({ value = "09:30", onChange, disabled = false }) => {
  const [hours, minutes] = value.split(":");
  const hNum = parseInt(hours || "9", 10);
  const mNum = parseInt(minutes || "30", 10);

  const displayHour = hNum % 12 === 0 ? 12 : hNum % 12;
  const ampm = hNum >= 12 ? "PM" : "AM";
  const displayMinute = mNum.toString().padStart(2, "0");

  const [localHours, setLocalHours] = React.useState(displayHour.toString().padStart(2, "0"));
  const [localMinutes, setLocalMinutes] = React.useState(displayMinute);
  const hourInputRef = React.useRef<HTMLInputElement>(null);
  const minuteInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalHours(displayHour.toString().padStart(2, "0"));
  }, [displayHour]);

  React.useEffect(() => {
    setLocalMinutes(displayMinute);
  }, [displayMinute]);

  const updateTime = (newHour12: number, newMinute: number, newAmpm: string) => {
    let finalHour24 = newHour12 % 12;
    if (newAmpm === "PM") {
      finalHour24 += 12;
    }
    const finalHourStr = finalHour24.toString().padStart(2, "0");
    const finalMinuteStr = newMinute.toString().padStart(2, "0");
    onChange(`${finalHourStr}:${finalMinuteStr}`);
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextHour = displayHour === 12 ? 1 : displayHour + 1;
      updateTime(nextHour, mNum, ampm);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const prevHour = displayHour === 1 ? 12 : displayHour - 1;
      updateTime(prevHour, mNum, ampm);
    } else if (e.key === "Enter") {
      e.preventDefault();
      let h = parseInt(localHours, 10);
      if (isNaN(h)) h = 12;
      if (h > 12) h = 12;
      if (h < 1) h = 1;
      setLocalHours(h.toString().padStart(2, "0"));
      updateTime(h, mNum, ampm);
      e.currentTarget.blur();
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextMin = (mNum + 5) % 60; // increment by 5 mins for convenience
      updateTime(displayHour, nextMin, ampm);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const prevMin = mNum === 0 ? 55 : (mNum - 5 + 60) % 60; // decrement by 5 mins
      updateTime(displayHour, prevMin, ampm);
    } else if (e.key === "Enter") {
      e.preventDefault();
      let m = parseInt(localMinutes, 10);
      if (isNaN(m)) m = 0;
      if (m > 59) m = 59;
      if (m < 0) m = 0;
      setLocalMinutes(m.toString().padStart(2, "0"));
      updateTime(displayHour, m, ampm);
      e.currentTarget.blur();
    }
  };

  const handleHourBlur = () => {
    let h = parseInt(localHours, 10);
    if (isNaN(h)) h = 12;
    if (h > 12) h = 12;
    if (h < 1) h = 1;
    updateTime(h, mNum, ampm);
  };

  const handleMinuteBlur = () => {
    let m = parseInt(localMinutes, 10);
    if (isNaN(m)) m = 0;
    if (m > 59) m = 59;
    if (m < 0) m = 0;
    updateTime(displayHour, m, ampm);
  };

  const toggleAmPm = () => {
    if (disabled) return;
    const nextAmpm = ampm === "AM" ? "PM" : "AM";
    updateTime(displayHour, mNum, nextAmpm);
  };

  return (
    <div 
      onClick={(e) => {
        if (disabled) return;
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "BUTTON") {
          if (document.activeElement === hourInputRef.current) {
            minuteInputRef.current?.focus();
          } else {
            hourInputRef.current?.focus();
          }
        }
      }}
      onDoubleClick={() => {
        if (!disabled) {
          minuteInputRef.current?.focus();
        }
      }}
      className={`flex items-center gap-1.5 h-11 px-3 border border-border rounded-sm bg-card transition-all text-sm w-full justify-between cursor-text ${
      disabled 
        ? "opacity-60 cursor-not-allowed bg-muted" 
        : "hover:border-gray-400 dark:hover:border-gray-500 focus-within:border-gray-400 dark:focus-within:border-gray-500"
    }`}>
      <div className="flex items-center gap-1">
        <Clock className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />
        <input
          ref={hourInputRef}
          type="text"
          value={localHours}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            if (val === "") {
              setLocalHours(val);
            } else {
              const h = parseInt(val, 10);
              if (h <= 12 && val.length <= 2) {
                setLocalHours(val);
                if (val.length === 2) {
                  setTimeout(() => {
                    minuteInputRef.current?.focus();
                  }, 30);
                }
              }
            }
          }}
           onBlur={handleHourBlur}
           onKeyDown={handleHourKeyDown}
          disabled={disabled}
          className="w-7 text-center bg-transparent border-none outline-none font-semibold text-foreground focus:text-foreground p-0 selection:bg-gray-200 dark:selection:bg-zinc-700 selection:text-foreground"
          maxLength={2}
          title="Type or use Arrow Up/Down to adjust"
        />
        <span className="text-muted-foreground/60 font-semibold">:</span>
        <input
          ref={minuteInputRef}
          type="text"
          value={localMinutes}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            if (val === "") {
              setLocalMinutes(val);
            } else {
              const m = parseInt(val, 10);
              if (m <= 59 && val.length <= 2) {
                setLocalMinutes(val);
              }
            }
          }}
           onBlur={handleMinuteBlur}
           onKeyDown={handleMinuteKeyDown}
          disabled={disabled}
          className="w-7 text-center bg-transparent border-none outline-none font-semibold text-foreground focus:text-foreground p-0 selection:bg-gray-200 dark:selection:bg-zinc-700 selection:text-foreground"
          maxLength={2}
          title="Type or use Arrow Up/Down to adjust"
        />
      </div>
      <button
        type="button"
        onClick={toggleAmPm}
        disabled={disabled}
        className={`px-2 py-0.5 text-xs font-bold rounded transition-all text-foreground shrink-0 ${
          disabled 
            ? "bg-muted cursor-not-allowed" 
            : "bg-muted/80 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-foreground dark:hover:text-zinc-100 active:scale-95 cursor-pointer"
        }`}
      >
        {ampm}
      </button>
    </div>
  );
};

interface CompanyStructureFormProps {
  companyData: any;
  setCompanyData: (data: any) => void;
  updateField: (section: any, field: string, value: any) => void;
  activeTab: string;
  isReadOnly: boolean;
  addLocation: () => void;
  updateLocation: (id: string, field: string, value: any) => void;
  removeLocation: (id: string) => Promise<void> | void;
  saveLocation: (id: string) => Promise<void>;
  isSaving: boolean;
  panError: string;
  handleSave?: (shouldNavigate?: boolean) => Promise<boolean | void>;
  handleCancel?: () => void;
  editMode?: boolean;
  setEditMode?: (val: boolean) => void;
  orgId?: number | null;
  errors?: any;
  setErrors?: (errors: any) => void;
}

export const CompanyStructureForm: React.FC<CompanyStructureFormProps> = ({
  companyData,
  setCompanyData,
  updateField,
  activeTab,
  isReadOnly,
  addLocation,
  updateLocation,
  removeLocation,
  saveLocation,
  isSaving,
  panError,
  handleSave,
  handleCancel,
  editMode,
  setEditMode,
}) => {
  const navigate = useOrgNavigate();
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = React.useState(false);
  const [countrySearch, setCountrySearch] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [hasSeenHierarchyPrompt, setHasSeenHierarchyPrompt] = React.useState(false);
  const [orgSubTab, setOrgSubTab] = React.useState<"departments" | "designations">("departments");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setHasSeenHierarchyPrompt(Boolean(localStorage.getItem("org_setup_job_hierarchy_prompt_seen")));
    }
  }, []);

  const [activeLocationCountryDropdown, setActiveLocationCountryDropdown] = React.useState<string | null>(null);
  const [locCountrySearch, setLocCountrySearch] = React.useState("");
  const [deleteCostCenterTarget, setDeleteCostCenterTarget] = React.useState<{ index: number; name: string } | null>(null);

  const getTaxLabelAndPlaceholder = (countryName: string) => {
    const country = (countryName || "").trim().toLowerCase();

    if (country === "india") {
      return {
        label: "GSTIN / Tax Number",
        placeholder: "e.g. 29AAAAA1111A1Z1"
      };
    }
    if (country === "united states" || country === "usa" || country === "us") {
      return {
        label: "EIN / Federal Tax ID",
        placeholder: "e.g. 12-3456789"
      };
    }
    if (country === "united kingdom" || country === "uk" || country === "gb") {
      return {
        label: "VAT Registration Number",
        placeholder: "e.g. GB123456789"
      };
    }
    if (country === "canada" || country === "ca") {
      return {
        label: "GST / Business Number (BN)",
        placeholder: "e.g. 123456789 RT0001"
      };
    }
    if (country === "australia" || country === "au") {
      return {
        label: "ABN / GST Number",
        placeholder: "e.g. 12 345 678 901"
      };
    }
    if (country === "singapore" || country === "sg") {
      return {
        label: "UEN / GST Number",
        placeholder: "e.g. 200123456G"
      };
    }
    if (country === "tanzania" || country === "tz") {
      return {
        label: "VRN / TIN Number",
        placeholder: "e.g. 10-123456-A"
      };
    }
    if (country === "germany" || country === "france" || country === "netherlands" || country === "italy" || country === "spain" || country === "ireland") {
      return {
        label: "VAT Registration Number",
        placeholder: "e.g. DE123456789"
      };
    }
    return {
      label: "Tax / VAT Registration Number",
      placeholder: "Enter tax registration number"
    };
  };

  const getCompanyTypesByCountry = (countryName: string) => {
    const country = (countryName || "").trim().toLowerCase();

    if (country === "india") {
      return [
        "Private Limited Company (Pvt Ltd)",
        "Public Limited Company",
        "Limited Liability Partnership (LLP)",
        "One Person Company (OPC)",
        "Partnership Firm",
        "Sole Proprietorship"
      ];
    }
    if (country === "united states" || country === "usa" || country === "us") {
      return [
        "Limited Liability Company (LLC)",
        "C Corporation (C-Corp)",
        "S Corporation (S-Corp)",
        "Partnership",
        "Sole Proprietorship"
      ];
    }
    if (country === "united kingdom" || country === "uk" || country === "gb") {
      return [
        "Private Limited Company (Ltd)",
        "Public Limited Company (Plc)",
        "Limited Liability Partnership (LLP)",
        "Sole Trader",
        "Partnership"
      ];
    }
    if (country === "canada" || country === "ca") {
      return [
        "Corporation",
        "Limited Liability Partnership (LLP)",
        "General Partnership",
        "Sole Proprietorship"
      ];
    }
    if (country === "australia" || country === "au") {
      return [
        "Proprietary Limited Company (Pty Ltd)",
        "Public Company",
        "Partnership",
        "Sole Trader"
      ];
    }
    if (country === "singapore" || country === "sg") {
      return [
        "Private Limited Company (Pte Ltd)",
        "Public Limited Company",
        "Limited Liability Partnership (LLP)",
        "Sole Proprietorship",
        "Partnership"
      ];
    }
    if (country === "tanzania" || country === "tz") {
      return [
        "Private Company Limited by Shares",
        "Public Company Limited by Shares",
        "Sole Proprietorship",
        "Partnership",
        "Branch of a Foreign Company"
      ];
    }
    if (country === "germany" || country === "de") {
      return [
        "GmbH",
        "AG",
        "GbR",
        "OHG",
        "KG",
        "Einzelunternehmen"
      ];
    }
    if (country === "france" || country === "fr") {
      return [
        "SARL",
        "SAS",
        "SA",
        "Entreprise Individuelle (EI)"
      ];
    }
    if (country === "united arab emirates" || country === "uae" || country === "ae") {
      return [
        "Limited Liability Company (LLC)",
        "Private Joint Stock Company",
        "Public Joint Stock Company",
        "Sole Proprietorship",
        "Branch of a Foreign Company"
      ];
    }

    // Default fallback
    return [
      "Private Limited Company",
      "Public Limited Company",
      "Limited Liability Company (LLC)",
      "Corporation",
      "Sole Proprietorship",
      "Partnership",
      "Other"
    ];
  };

  const getTaxFieldsForCompanyType = (
    countryName: string,
    companyType: string
  ): { key: string; label: string; placeholder: string; required?: boolean }[] => {
    const country = (countryName || "").trim().toLowerCase();
    const type = (companyType || "").trim().toLowerCase();

    // ── India ──
    if (country === "india") {
      const base: { key: string; label: string; placeholder: string; required?: boolean }[] = [
        { key: "pan", label: "Permanent Account Number (PAN)", placeholder: "e.g. ABCDE1234F", required: true },
      ];
      if (type.includes("private limited") || type.includes("public limited") || type.includes("opc") || type.includes("one person")) {
        base.push(
          { key: "cin", label: "Corporate Identification Number (CIN)", placeholder: "e.g. U12345MH2020PTC123456", required: true },
          { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A" },
          { key: "other", label: "GSTIN (if registered)", placeholder: "e.g. 29AAAAA1111A1Z1" }
        );
      } else if (type.includes("llp") || type.includes("limited liability partnership")) {
        base.push(
          { key: "cin", label: "LLPIN (LLP Identification Number)", placeholder: "e.g. AAA-1234", required: true },
          { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A" },
          { key: "other", label: "GSTIN (if registered)", placeholder: "e.g. 29AAAAA1111A1Z1" }
        );
      } else if (type.includes("partnership") || type.includes("sole proprietorship")) {
        base.push(
          { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A" },
          { key: "other", label: "Udyam / MSME Registration No.", placeholder: "e.g. UDYAM-MH-01-0012345" }
        );
      } else {
        base.push(
          { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A" },
          { key: "other", label: "Other Tax ID", placeholder: "Enter additional tax ID" }
        );
      }
      return base;
    }

    // ── United States ──
    if (country === "united states" || country === "usa" || country === "us") {
      const base: { key: string; label: string; placeholder: string; required?: boolean }[] = [
        { key: "ein", label: "Employer Identification Number (EIN)", placeholder: "e.g. 12-3456789", required: true },
      ];
      if (type.includes("c corporation") || type.includes("c-corp")) {
        base.push(
          { key: "other", label: "State Charter / Incorporation Number", placeholder: "e.g. C1234567" }
        );
      } else if (type.includes("s corporation") || type.includes("s-corp")) {
        base.push(
          { key: "other", label: "State Charter / Incorporation Number", placeholder: "e.g. S1234567" }
        );
      } else if (type.includes("llc")) {
        base.push(
          { key: "other", label: "State LLC Filing Number", placeholder: "e.g. LLC-123456" }
        );
      } else {
        base.push(
          { key: "other", label: "State Business Registration No.", placeholder: "Enter state registration number" }
        );
      }
      return base;
    }

    // ── United Kingdom ──
    if (country === "united kingdom" || country === "uk" || country === "gb") {
      const base: { key: string; label: string; placeholder: string; required?: boolean }[] = [
        { key: "tin", label: "Unique Taxpayer Reference (UTR)", placeholder: "e.g. 12345 67890", required: true },
      ];
      if (type.includes("ltd") || type.includes("plc") || type.includes("limited")) {
        base.push(
          { key: "cin", label: "Company Registration Number (CRN)", placeholder: "e.g. 12345678", required: true },
          { key: "other", label: "VAT Registration Number", placeholder: "e.g. GB123456789" }
        );
      } else if (type.includes("llp")) {
        base.push(
          { key: "cin", label: "LLP Registration Number", placeholder: "e.g. OC123456", required: true },
          { key: "other", label: "VAT Registration Number", placeholder: "e.g. GB123456789" }
        );
      } else {
        base.push(
          { key: "other", label: "VAT Registration Number (Optional)", placeholder: "e.g. GB123456789" }
        );
      }
      return base;
    }

    // ── Germany ──
    if (country === "germany" || country === "de") {
      return [
        { key: "tin", label: "Steuernummer (Tax Number)", placeholder: "e.g. 123/456/78901", required: true },
        { key: "other", label: "USt-IdNr (VAT ID)", placeholder: "e.g. DE123456789" },
        { key: "cin", label: "Handelsregisternummer (HRB)", placeholder: "e.g. HRB 12345" },
      ];
    }

    // ── France ──
    if (country === "france" || country === "fr") {
      return [
        { key: "siret", label: "SIRET Number", placeholder: "e.g. 12345678901234", required: true },
        { key: "tin", label: "SIREN Number", placeholder: "e.g. 123456789", required: true },
        { key: "other", label: "TVA Intracommunautaire (VAT)", placeholder: "e.g. FR12345678901" },
      ];
    }

    // ── UAE ──
    if (country === "united arab emirates" || country === "uae" || country === "ae") {
      return [
        { key: "tin", label: "Tax Registration Number (TRN)", placeholder: "e.g. 100123456789003", required: true },
        { key: "cin", label: "Commercial License Number", placeholder: "e.g. 12345" },
        { key: "other", label: "Chamber of Commerce No.", placeholder: "Enter chamber number" },
      ];
    }

    // ── Canada ──
    if (country === "canada" || country === "ca") {
      return [
        { key: "sin", label: "Business Number (BN)", placeholder: "e.g. 123456789RC0001", required: true },
        { key: "other", label: "GST/HST Registration Number", placeholder: "e.g. 123456789RT0001" },
      ];
    }

    // ── Australia ──
    if (country === "australia" || country === "au") {
      return [
        { key: "tin", label: "Australian Business Number (ABN)", placeholder: "e.g. 12 345 678 901", required: true },
        { key: "cin", label: "Australian Company Number (ACN)", placeholder: "e.g. 123 456 789" },
        { key: "other", label: "GST Registration", placeholder: "Enter GST number if registered" },
      ];
    }

    // ── Singapore ──
    if (country === "singapore" || country === "sg") {
      return [
        { key: "tin", label: "Unique Entity Number (UEN)", placeholder: "e.g. 202012345A", required: true },
        { key: "other", label: "GST Registration Number", placeholder: "e.g. M90012345X" },
      ];
    }

    // ── Tanzania ──
    if (country === "tanzania" || country === "tz") {
      return [
        { key: "tin", label: "Taxpayer Identification Number (TIN)", placeholder: "e.g. 123-456-789", required: true },
        { key: "cin", label: "Business Registration Number (BRELA)", placeholder: "e.g. 123456", required: true },
        { key: "paye_reg_no", label: "PAYE Registration Number (TRA)", placeholder: "e.g. TRA-PAYE-12345" },
        { key: "nssf_reg_no", label: "NSSF Employer Registration No.", placeholder: "e.g. NSSF-ER-12345" },
        { key: "wcf_reg_no", label: "WCF Employer Registration No.", placeholder: "e.g. WCF-ER-12345" },
        { key: "sdl_reg_no", label: "SDL Registration Number", placeholder: "e.g. SDL-ER-12345" },
        { key: "other", label: "VAT Registration Number (VRN)", placeholder: "e.g. 40-123456-X" },
      ];
    }

    // ── Default / Unrecognized Country ──
    return [
      { key: "tin", label: "Tax Identification Number (TIN)", placeholder: "Enter primary tax ID", required: true },
      { key: "other", label: "Secondary Tax / Registration ID", placeholder: "Enter additional ID" },
    ];
  };

  const [activeScheduleTab, setActiveScheduleTab] = useState<'fixed' | 'shift' | 'flexible' | 'holidays'>(
    companyData?.workingCalendar?.scheduleType || 'fixed'
  );

  React.useEffect(() => {
    if (companyData?.workingCalendar?.scheduleType && activeScheduleTab !== 'holidays') {
      setActiveScheduleTab(companyData.workingCalendar.scheduleType);
    }
  }, [companyData?.workingCalendar?.scheduleType]);

  const prevHolidayCountryRef = React.useRef(companyData?.legalAddress?.country);

  React.useEffect(() => {
    const country = companyData?.legalAddress?.country;
    if (!country) return;

    const prevCountry = prevHolidayCountryRef.current;
    prevHolidayCountryRef.current = country;

    const holidays = companyData?.workingCalendar?.publicHolidays;
    if (!holidays || holidays.length === 0 || prevCountry !== country) {
      const allYears = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];
      const allDefaults = allYears.flatMap(y => getDefaultHolidaysForCountry(country, y));
      setCompanyData({
        ...companyData,
        workingCalendar: {
          ...companyData.workingCalendar,
          publicHolidays: allDefaults,
        },
      });
    }
  }, [companyData?.legalAddress?.country]);

  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isRemoveLocationModalOpen, setIsRemoveLocationModalOpen] = useState(false);
  const [locationToRemove, setLocationToRemove] = useState<string | null>(null);
  const [isRemoveHolidayModalOpen, setIsRemoveHolidayModalOpen] = useState(false);
  const [holidayToRemoveIndex, setHolidayToRemoveIndex] = useState<number | null>(null);
  const [isRemoveShiftModalOpen, setIsRemoveShiftModalOpen] = useState(false);
  const [shiftToRemove, setShiftToRemove] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  const getDefaultHolidaysForCountry = (country: string, year: number): string[] => {
    const y = year;
    const fixed = (m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const holidays: { date: string; name: string }[] = [];

    switch (country.toLowerCase()) {
      case "india":
        holidays.push(
          { date: fixed(1, 26), name: "Republic Day" },
          { date: fixed(8, 15), name: "Independence Day" },
          { date: fixed(10, 2), name: "Gandhi Jayanti" },
          { date: fixed(12, 25), name: "Christmas" },
        );
        break;
      case "united states":
      case "usa":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(7, 4), name: "Independence Day" },
          { date: fixed(11, 11), name: "Veterans Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
        );
        break;
      case "united kingdom":
      case "uk":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
          { date: fixed(12, 26), name: "Boxing Day" },
        );
        break;
      case "united arab emirates":
      case "uae":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(12, 2), name: "UAE National Day" },
        );
        break;
      case "singapore":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(8, 9), name: "National Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
        );
        break;
      case "canada":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(7, 1), name: "Canada Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
          { date: fixed(12, 26), name: "Boxing Day" },
        );
        break;
      case "australia":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(1, 26), name: "Australia Day" },
          { date: fixed(4, 25), name: "Anzac Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
          { date: fixed(12, 26), name: "Boxing Day" },
        );
        break;
      case "germany":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(10, 3), name: "German Unity Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
          { date: fixed(12, 26), name: "St. Stephen's Day" },
        );
        break;
      case "france":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(7, 14), name: "Bastille Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
        );
        break;
      case "netherlands":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(4, 27), name: "King's Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
          { date: fixed(12, 26), name: "Boxing Day" },
        );
        break;
      case "saudi arabia":
        holidays.push(
          { date: fixed(9, 23), name: "Saudi National Day" },
        );
        break;
      case "south africa":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(3, 21), name: "Human Rights Day" },
          { date: fixed(4, 27), name: "Freedom Day" },
          { date: fixed(5, 1), name: "Workers' Day" },
          { date: fixed(6, 16), name: "Youth Day" },
          { date: fixed(8, 9), name: "National Women's Day" },
          { date: fixed(9, 24), name: "Heritage Day" },
          { date: fixed(12, 16), name: "Day of Reconciliation" },
          { date: fixed(12, 25), name: "Christmas Day" },
          { date: fixed(12, 26), name: "Day of Goodwill" },
        );
        break;
      case "japan":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(2, 11), name: "National Foundation Day" },
          { date: fixed(4, 29), name: "Showa Day" },
          { date: fixed(5, 3), name: "Constitution Memorial Day" },
          { date: fixed(5, 4), name: "Greenery Day" },
          { date: fixed(5, 5), name: "Children's Day" },
          { date: fixed(11, 3), name: "Culture Day" },
          { date: fixed(11, 23), name: "Labour Thanksgiving Day" },
        );
        break;
      case "brazil":
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(4, 21), name: "Tiradentes Day" },
          { date: fixed(5, 1), name: "Labour Day" },
          { date: fixed(9, 7), name: "Independence Day" },
          { date: fixed(10, 12), name: "Our Lady of Aparecida" },
          { date: fixed(11, 2), name: "All Souls' Day" },
          { date: fixed(11, 15), name: "Republic Proclamation Day" },
          { date: fixed(12, 25), name: "Christmas" },
        );
        break;
      default:
        holidays.push(
          { date: fixed(1, 1), name: "New Year's Day" },
          { date: fixed(12, 25), name: "Christmas Day" },
        );
    }
    return holidays.map(h => `${h.date}: ${h.name}`);
  };

  const getCountryDateFormat = (country: string): string => {
    const c = country.toLowerCase();
    if (c === "united states" || c === "usa") return "MM/DD/YYYY";
    if (c === "japan") return "YYYY/MM/DD";
    if (c === "south africa") return "YYYY/MM/DD";
    if (c === "germany") return "DD.MM.YYYY";
    if (c === "netherlands") return "DD-MM-YYYY";
    return "DD/MM/YYYY";
  };

  const formatDateForCountry = (dateStr: string, country: string): string => {
    if (!dateStr || !dateStr.includes("-")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const fmt = getCountryDateFormat(country);
    return fmt.replace("DD", d).replace("MM", m).replace("YYYY", y);
  };

  const downloadSampleSheet = () => {
    try {
      const data = [
        ["Date", "Name"],
        ["2026-01-26", "Republic Day"],
        ["2026-08-15", "Independence Day"],
        ["2026-10-02", "Gandhi Jayanti"],
        ["2026-12-25", "Christmas"]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Holidays");
      XLSX.writeFile(workbook, "holiday_template.xlsx");
      toast.success("Downloaded sample holiday template!");
    } catch (err: any) {
      toast.error("Failed to generate template: " + err.message);
    }
  };

  // Inline Shift Form State
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [newShift, setNewShift] = useState({ name: "", startTime: "09:00", endTime: "18:00", breakTime: 60 });
  const [simLogin, setSimLogin] = useState("09:00");
  const [simLogout, setSimLogout] = useState("18:00");

  const countries = [
    "India", "United States", "United Kingdom", "United Arab Emirates",
    "Singapore", "Canada", "Australia", "Germany", "France",
    "Netherlands", "Saudi Arabia", "South Africa", "Japan",
    "China", "Brazil", "Mexico", "Italy", "Spain", "Malaysia", "Indonesia",
    "Israel", "Ireland", "New Zealand", "Tanzania", "Kenya", "Nigeria", "Other"
  ];

  const filteredCountries = countries.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      const target = event.target as HTMLElement;
      if (!target.closest('.location-country-wrapper')) {
        setActiveLocationCountryDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (activeTab === "legal") {
    return (
      <LegalEntityTaxTab
        companyData={companyData}
        setCompanyData={setCompanyData}
        updateField={updateField}
        isReadOnly={isReadOnly}
        panError={panError}
        isCountryDropdownOpen={isCountryDropdownOpen}
        setIsCountryDropdownOpen={setIsCountryDropdownOpen}
        countrySearch={countrySearch}
        setCountrySearch={setCountrySearch}
        filteredCountries={filteredCountries}
        dropdownRef={dropdownRef}
        getCompanyTypesByCountry={getCompanyTypesByCountry}
        getTaxFieldsForCompanyType={getTaxFieldsForCompanyType}
      />
    );
  }

  if (activeTab === "organizational") {
    return (
      <div className="space-y-5">
        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border/60">
          <button
            onClick={() => setOrgSubTab("departments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${orgSubTab === "departments"
              ? "border-primary text-primary-600"
              : "border-transparent text-gray-400 hover:text-gray-500 hover:border-gray-200"
              }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Department Hierarchy
          </button>
          <button
            onClick={() => setOrgSubTab("designations")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${orgSubTab === "designations"
              ? "border-primary text-primary-600"
              : "border-transparent text-gray-400 hover:text-gray-500 hover:border-gray-200"
              }`}
          >
            <Network className="w-3.5 h-3.5" />
            Designation Hierarchy
          </button>
        </div>

        {orgSubTab === "departments" ? (
          <div className="space-y-5">
            <DepartmentHierarchyView isReadOnly={isReadOnly} />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Setup Wizard shortcut */}
            {!isReadOnly && (
              <div className="flex items-center justify-between bg-primary-50 border border-primary-100 rounded-xl px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <Network className="w-4 h-4 text-primary-600" />
                  <span className="text-[13px] font-semibold text-primary-800">
                    {hasSeenHierarchyPrompt
                      ? "Need a quick way to reshape your hierarchy or add reporting lines?"
                      : "Need to define job hierarchy from scratch?"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("org_setup_job_hierarchy_prompt_seen", "true");
                    }
                    setHasSeenHierarchyPrompt(true);
                    navigate("/org-setup/job-hierarchy-setup");
                  }}
                  className="h-8 px-4 text-[12px] font-bold border-primary-200 text-primary-700 bg-white dark:bg-card hover:bg-primary-100 gap-1.5"
                >
                  <Network className="w-3.5 h-3.5" />
                  Setup Wizard
                </Button>
              </div>
            )}

            <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm min-h-[400px]">
              <DesignationSettingsForm isReadOnly={isReadOnly} isGlobal={true} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "cost-centers") {
    return (
      <div className="space-y-5">
        {/* Cost Centres */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pt-4 pb-3 px-5 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px] font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Cost Centres
              </CardTitle>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const existing = companyData.costCenters || [];
                    setCompanyData({ ...companyData, costCenters: [...existing, ""] });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 dark:bg-primary-900/30 text-primary dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-lg text-[11px] font-bold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  Add Cost Centre
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Define cost centres for financial tracking. Budgets will be assigned later by the Finance team.
            </p>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {(!companyData.costCenters || companyData.costCenters.length === 0) ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center mx-auto">
                  <Briefcase className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-muted-foreground">No cost centres defined</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Add cost centres to track departmental expenses. Example: CC-100 Engineering, CC-200 Sales
                  </p>
                </div>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    onClick={() => setCompanyData({ ...companyData, costCenters: [""] })}
                    className="h-8 px-4 text-[12px] font-bold gap-1.5 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Cost Centre
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-[40px_1fr_auto] gap-2 px-1 pb-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cost Centre Name / Code</span>
                  <span className="w-7" />
                </div>

                {companyData.costCenters?.map((cc: string, index: number) => (
                  <div key={index} className="grid grid-cols-[40px_1fr_auto] gap-2 items-center group">
                    <span className="text-[12px] font-bold text-muted-foreground bg-muted/50 rounded h-9 flex items-center justify-center">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={cc}
                      onChange={(e) => {
                        if (isReadOnly) return;
                        const updated = [...(companyData.costCenters || [])];
                        updated[index] = e.target.value;
                        setCompanyData({ ...companyData, costCenters: updated });
                      }}
                      readOnly={isReadOnly}
                      placeholder="e.g., CC-100 - Engineering"
                      className={`h-9 px-3 text-[13px] border border-border rounded-[7px] focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-primary-300 transition-all outline-none ${isReadOnly ? "bg-muted text-muted-foreground" : "bg-card"}`}
                    />
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setDeleteCostCenterTarget({ index, name: cc.trim() || `Cost Centre #${index + 1}` })}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 border-none bg-transparent"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Budget note */}
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border">
                  <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong>Budget allocation</strong> for each cost centre will be managed by the Finance team after the initial setup. Cost centres defined here will appear in department assignment and expense tracking.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmationDialog
          isOpen={!!deleteCostCenterTarget}
          onClose={() => setDeleteCostCenterTarget(null)}
          onConfirm={() => {
            if (deleteCostCenterTarget !== null) {
              const updated = companyData.costCenters.filter((_: string, i: number) => i !== deleteCostCenterTarget.index);
              setCompanyData({ ...companyData, costCenters: updated.length ? updated : [] });
              toast.success("Cost Centre removed.");
              setDeleteCostCenterTarget(null);
            }
          }}
          title="Delete Cost Centre?"
          description={`Are you sure you want to delete "${deleteCostCenterTarget?.name}"? This action will remove it from the organization configuration.`}
          confirmText="Delete Cost Centre"
          variant="danger"
        />
      </div>
    );
  }



  if (activeTab === "geographical") {
    return (
      <GeographicalLocationTab
        companyData={companyData}
        setCompanyData={setCompanyData}
        updateField={updateField}
        isReadOnly={isReadOnly}
        addLocation={addLocation}
        updateLocation={updateLocation}
        removeLocation={removeLocation}
        legalEntityCountry={companyData.legalAddress.country}
      />
    );
  }

  if (activeTab === "calendar") {
    return (
      <>
        {/* Remove Holiday Confirmation */}
        <ConfirmationDialog
          isOpen={isRemoveHolidayModalOpen}
          onClose={() => { setIsRemoveHolidayModalOpen(false); setHolidayToRemoveIndex(null); }}
          onConfirm={() => {
            if (holidayToRemoveIndex !== null) {
              const newHols = companyData.workingCalendar.publicHolidays.filter((_: any, i: number) => i !== holidayToRemoveIndex);
              setCompanyData({
                ...companyData,
                workingCalendar: {
                  ...companyData.workingCalendar,
                  publicHolidays: newHols
                }
              });
            }
            setIsRemoveHolidayModalOpen(false);
            setHolidayToRemoveIndex(null);
          }}
          title="Remove Holiday"
          description="Are you sure you want to delete this holiday? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />

        {/* Remove Shift Confirmation */}
        <ConfirmationDialog
          isOpen={isRemoveShiftModalOpen}
          onClose={() => { setIsRemoveShiftModalOpen(false); setShiftToRemove(null); }}
          onConfirm={() => {
            if (shiftToRemove) {
              const newShifts = companyData.workingCalendar.shifts.filter((s: any) => s.id !== shiftToRemove);
              setCompanyData({
                ...companyData,
                workingCalendar: { ...companyData.workingCalendar, shifts: newShifts }
              });
            }
            setIsRemoveShiftModalOpen(false);
            setShiftToRemove(null);
          }}
          title="Remove Shift"
          description="Are you sure you want to delete this shift? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />

        <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
          <div className="bg-primary/10 dark:bg-primary/5 border border-primary-100 dark:border-primary/30 rounded-lg p-4 overflow-hidden shadow-sm">
            <div className="flex items-start gap-4">
              <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
              <div>
                <h4 className="text-[12px] font-medium text-primary-900 dark:text-primary-100 mb-1">
                  Working Calendar & Schedule
                </h4>
                <p className="text-[14px] leading-5 text-primary/80 dark:text-primary-300 leading-relaxed">
                  Define your organization's operational rhythm, including standard hours,
                  weekly schedules, and specialized shift rotations.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-sm border-border overflow-hidden lg:col-span-3">
              <CardHeader className="py-3 pb-0 px-4 border-b border-border bg-muted/50">
                <CardTitle className="text-base font-medium text-foreground">
                  Working Calendar & Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 mt-0">
                {/* Schedule Mode Selector */}
                <div className="border-b border-border mb-6">
                  <div className="flex gap-6">

                    {/* Fixed Schedule Tab */}
                    <button
                      onClick={() => {
                        setActiveScheduleTab("fixed");
                        if (!isReadOnly) {
                          setCompanyData({
                            ...companyData,
                            workingCalendar: {
                              ...companyData.workingCalendar,
                              scheduleType: "fixed",
                            },
                          });
                        }
                      }}
                      className={`relative pb-2 text-[14px] leading-5 font-medium transition-all ${activeScheduleTab === "fixed"
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground font-medium"
                        }`}
                    >
                      Fixed Schedule

                      {activeScheduleTab === "fixed" && (
                        <span className="absolute left-0 bottom-0 w-full h-[2px] bg-primary rounded-full"></span>
                      )}
                    </button>

                    {/* Shift Management Tab */}
                    <button
                      onClick={() => {
                        setActiveScheduleTab("shift");
                        if (!isReadOnly) {
                          setCompanyData({
                            ...companyData,
                            workingCalendar: {
                              ...companyData.workingCalendar,
                              scheduleType: "shift",
                            },
                          });
                        }
                      }}
                      className={`relative pb-2 text-[14px] leading-5 font-medium transition-all ${activeScheduleTab === "shift"
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground font-medium"
                        }`}
                    >
                      Shift Management

                      {activeScheduleTab === "shift" && (
                        <span className="absolute left-0 bottom-0 w-full h-[2px] bg-primary rounded-full"></span>
                      )}
                    </button>

                    {/* Flexible Tab - Hidden for now */}
                    {/* <button
                      onClick={() => {
                        setActiveScheduleTab("flexible");
                        if (!isReadOnly) {
                          setCompanyData({
                            ...companyData,
                            workingCalendar: {
                              ...companyData.workingCalendar,
                              scheduleType: "flexible",
                            },
                          });
                        }
                      }}
                      className={`relative pb-2 text-[14px] leading-5 font-medium transition-all ${activeScheduleTab === "flexible"
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground font-medium"
                        }`}
                    >
                      Flexible Schedule

                      {activeScheduleTab === "flexible" && (
                        <span className="absolute left-0 bottom-0 w-full h-[2px] bg-primary rounded-full"></span>
                      )}
                    </button> */}

                    {/* Holidays Tab */}
                    <button
                      onClick={() => setActiveScheduleTab("holidays")}
                      className={`relative pb-2 text-[14px] leading-5 font-medium transition-all ${activeScheduleTab === "holidays"
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground font-medium"
                        }`}
                    >
                      Holidays

                      {activeScheduleTab === "holidays" && (
                        <span className="absolute left-0 bottom-0 w-full h-[2px] bg-primary rounded-full"></span>
                      )}
                    </button>

                  </div>
                </div>

                {activeScheduleTab === 'fixed' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-500">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* Left Column: Inputs */}
                      <div className="xl:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Start Time */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[12px] leading-4 font-semibold text-foreground ml-1">
                              <Sunrise className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                              Work Starts At
                            </label>
                            <ModernTimePicker
                              value={companyData.workingCalendar?.fixedStartTime || "09:30"}
                              onChange={(val) =>
                                !isReadOnly &&
                                setCompanyData({
                                  ...companyData,
                                  workingCalendar: {
                                    ...companyData.workingCalendar,
                                    fixedStartTime: val,
                                  },
                                })
                              }
                              disabled={isReadOnly}
                            />
                          </div>

                          {/* End Time */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[12px] leading-4 font-semibold text-foreground ml-1">
                              <Moon className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
                              Work Ends At
                            </label>
                            <ModernTimePicker
                              value={companyData.workingCalendar?.fixedEndTime || "18:30"}
                              onChange={(val) =>
                                !isReadOnly &&
                                setCompanyData({
                                  ...companyData,
                                  workingCalendar: {
                                    ...companyData.workingCalendar,
                                    fixedEndTime: val,
                                  },
                                })
                              }
                              disabled={isReadOnly}
                            />
                          </div>

                          {/* Break Time */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[12px] leading-4 font-semibold text-foreground ml-1">
                              <Coffee className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                              Daily Break Time
                            </label>
                            <div className="relative group">
                              <input
                                type="number"
                                value={companyData.workingCalendar?.breakTime !== undefined ? companyData.workingCalendar.breakTime : ""}
                                onChange={(e) => {
                                  if (isReadOnly) return;
                                  const val = e.target.value === "" ? '' : parseInt(e.target.value);
                                  setCompanyData({
                                    ...companyData,
                                    workingCalendar: {
                                      ...companyData.workingCalendar,
                                      breakTime: val,
                                    },
                                  });
                                }}
                                readOnly={isReadOnly}
                                className={`w-full h-11 pl-3 pr-12 text-[14px] leading-5 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary hover:border-primary transition-all ${isReadOnly ? "bg-muted font-medium" : "bg-card"} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground tracking-tight pointer-events-none">Mins</span>
                            </div>
                          </div>
                        </div>

                        {/* Working Days Grid */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[12px] leading-4 font-semibold text-foreground ml-1">
                              Configured Working Days
                            </label>
                            <span className="text-[10px] font-medium text-muted-foreground">Select active days</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                              "Sunday",
                            ].map((day) => (
                              <label key={day} className="flex items-center gap-3 group cursor-pointer">
                                <div className="relative flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={(
                                      companyData.workingCalendar?.workingDays || []
                                    ).includes(day)}
                                    onChange={(e) => {
                                      if (isReadOnly) return;
                                      const days = e.target.checked
                                        ? [
                                          ...(companyData.workingCalendar?.workingDays ||
                                            []),
                                          day,
                                        ]
                                        : (
                                          companyData.workingCalendar?.workingDays || []
                                        ).filter((d: string) => d !== day);
                                      setCompanyData({
                                        ...companyData,
                                        workingCalendar: {
                                          ...companyData.workingCalendar,
                                          workingDays: days,
                                        },
                                      });
                                    }}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-primary accent-primary border-gray-300 dark:border-border rounded focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </div>
                                <span className="text-[14px] leading-5 text-foreground group-hover:text-foreground transition-colors">{day}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Calculations */}
                      <div className="xl:col-span-1">
                        <div className="bg-muted/50/80 border border-border rounded-lg p-6 space-y-6">
                        <h4 className="text-[12px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          Live Schedule Insights
                          </h4>

                          <div className="space-y-4">
                            {/* Daily Hours */}
                            {(() => {
                              const start = companyData.workingCalendar?.fixedStartTime || "09:30";
                              const end = companyData.workingCalendar?.fixedEndTime || "18:30";
                              const breakMins = companyData.workingCalendar?.breakTime ?? 0;

                              const [sH, sM] = start.split(':').map(Number);
                              const [eH, eM] = end.split(':').map(Number);
                              let startTotal = sH * 60 + sM;
                              let endTotal = eH * 60 + eM;
                              if (endTotal <= startTotal) endTotal += 1440;
                              const dailyMins = endTotal - startTotal - breakMins;
                              const dailyHrs = Math.max(0, dailyMins / 60);
                              const weeklyHrs = dailyHrs * (companyData.workingCalendar?.workingDays?.length || 0);

                              return (
                                <>
                                  <div className="bg-card p-5 rounded-lg border border-border shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-medium text-muted-foreground">Daily Work Shift</span>
                                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-transparent px-2 py-0.5 rounded-full">Calculated</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-[24px] font-semibold text-foreground">{dailyHrs.toFixed(1)}</span>
                                      <span className="text-[14px] leading-5 font-medium text-muted-foreground">Hrs/day</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                      Calculated as <span className="text-slate-600 dark:text-slate-400 font-bold">(ET - ST) - BT</span>.
                                      {endTotal > 1440 && " Shift crosses midnight."}
                                    </p>
                                  </div>

                                  <div className="bg-primary p-5 rounded-lg shadow-sm shadow-primary-100 dark:shadow-primary-950 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-medium text-primary-100 tracking-wider">Weekly Commitment</span>
                                      <Calendar className="w-4 h-4 text-primary-300" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-3xl font-semibold text-white">{weeklyHrs.toFixed(1)}</span>
                                      <span className="text-[14px] leading-5 font-medium text-primary-200">Hrs / week</span>
                                    </div>
                                    <div className="pt-2 border-t border-primary-500/50 dark:border-primary-700/50">
                                      <p className="text-[10px] text-primary-100 font-medium leading-relaxed italic">
                                        * Based on {companyData.workingCalendar?.workingDays?.length || 0} active working days.
                                      </p>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          <div className="flex items-start gap-3 p-3.5 bg-muted/50/60 rounded-lg border border-border">
                            <div className="p-1.5 rounded-lg bg-primary/10/70 dark:bg-primary-900/30 flex-shrink-0">
                              <Clock className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                              This configuration defines the <span className="text-foreground font-semibold">expected working hours</span>.
                              Attendance and overtime will be measured against this baseline.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeScheduleTab === 'shift' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                    {/* Enable Shift Toggle Header */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <label className="text-[14px] leading-5 font-bold text-foreground">
                            Enable Shift Management
                          </label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${companyData.workingCalendar?.enableShifts ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200" : "bg-muted text-muted-foreground border border-border"}`}>
                            {companyData.workingCalendar?.enableShifts ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Turn on to configure multiple shifts (e.g., Night, Morning) and allow assigning shifts to employees.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const currentVal = !!companyData.workingCalendar?.enableShifts;
                          setCompanyData({
                            ...companyData,
                            workingCalendar: {
                              ...companyData.workingCalendar,
                              enableShifts: !currentVal,
                            },
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${companyData.workingCalendar?.enableShifts ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${companyData.workingCalendar?.enableShifts ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                    </div>

                    {/* Shift Library Section - Shown only if enableShifts is true */}
                    {companyData.workingCalendar?.enableShifts ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="space-y-1">
                          <label className="block text-[14px] leading-5 font-bold text-foreground">
                            Managed Shifts
                          </label>
                          <p className="text-[10px] text-muted-foreground font-normal">Configure and manage organizational shift timings</p>
                        </div>
                        {!isReadOnly && !isAddingShift && (
                          <button
                            onClick={() => setIsAddingShift(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary-900/30 text-primary dark:text-primary-300 rounded-lg text-[12px] leading-4 font-bold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            Add New Shift
                          </button>
                        )}
                      </div>

                      {/* Existing Shifts Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {companyData.workingCalendar?.shifts?.map((shift: any) => {
                          const nameLower = shift.name.toLowerCase();
                          let Icon = Sun;
                          let colorClass = "bg-primary/10/70 dark:bg-primary-900/30 text-primary dark:text-primary-300 border-primary-100/60 dark:border-primary-800/60";

                          if (nameLower.includes('night') || nameLower.includes('grave') || nameLower.includes('late')) {
                            Icon = Moon;
                            colorClass = "bg-muted/50/80 text-slate-600 dark:text-slate-400 border-border/60";
                          } else if (nameLower.includes('morning') || nameLower.includes('sunrise') || nameLower.includes('day')) {
                            Icon = Sunrise;
                            colorClass = "bg-amber-50/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-150/60 dark:border-amber-800/60";
                          } else if (nameLower.includes('evening') || nameLower.includes('afternoon') || nameLower.includes('sunset')) {
                            Icon = Sun;
                            colorClass = "bg-amber-50/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-150/60 dark:border-amber-800/60";
                          } else {
                            // Fallback to start time if name is generic
                            const startHour = shift.startTime ? parseInt(shift.startTime.split(':')[0]) : 9;
                            if (startHour >= 18 || startHour < 5) {
                              Icon = Moon;
                              colorClass = "bg-muted/50/80 text-slate-600 dark:text-slate-400 border-border/60";
                            } else if (startHour >= 12 && startHour < 18) {
                              Icon = Sun;
                              colorClass = "bg-amber-50/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-150/60 dark:border-amber-800/60";
                            } else {
                              Icon = Sunrise;
                              colorClass = "bg-primary/10/70 dark:bg-primary-900/30 text-primary dark:text-primary-300 border-primary-100/60 dark:border-primary-800/60";
                            }
                          }

                          return (
                            <div
                              key={shift.id}
                              className="flex items-center justify-between p-3.5 border border-border rounded-lg bg-card hover:border-primary-100/80 dark:hover:border-primary-700/80 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 group shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg border ${colorClass} flex items-center justify-center`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-[14px] leading-5 font-semibold text-foreground capitalize leading-snug">{shift.name}</h5>
                                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                    {shift.startTime} - {shift.endTime}
                                    {shift.totalHours !== undefined && ` • ${shift.totalHours.toFixed(1)} hrs`}
                                  </p>
                                </div>
                              </div>
                              {!isReadOnly && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingShiftId(shift.id);
                                      setIsAddingShift(false);
                                      setNewShift({
                                        name: shift.name,
                                        startTime: shift.startTime,
                                        endTime: shift.endTime,
                                        breakTime: shift.breakTime ?? 60
                                      });
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-primary dark:hover:text-primary-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg opacity-80 group-hover:opacity-100 transition-all duration-200"
                                    title="Edit Shift"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShiftToRemove(shift.id);
                                      setIsRemoveShiftModalOpen(true);
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-80 group-hover:opacity-100 transition-all duration-200"
                                    title="Delete Shift"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Shift Form (Opens Below) */}
                      {!isReadOnly && (isAddingShift || editingShiftId !== null) && (
                        <div className="pt-4 border-t border-dashed border-border">
                          <div className="p-5 border border-primary/20 dark:border-primary-800/30 rounded-lg bg-muted/10 dark:bg-muted/5 space-y-5 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1 h-4 bg-primary rounded-full" />
                              <h4 className="text-[12px] font-medium text-foreground tracking-tight">
                                {editingShiftId !== null ? "Edit Shift Definition" : "Create New Shift Definition"}
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-1 space-y-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-muted-foreground tracking-wider mb-1.5 ml-1">Shift Name</label>
                                  <input
                                    type="text"
                                    value={newShift.name}
                                    onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                                    placeholder="e.g. Morning Shift"
                                    className="w-full h-11 px-3 text-[14px] leading-5 border border-gray-300 dark:border-border rounded-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 hover:border-primary transition-all bg-card"
                                    autoFocus
                                  />
                                </div>

                                <div className="relative">
                                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground tracking-wider mb-1.5 ml-1">
                                    <Coffee className="w-3 h-3" /> Break Time
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={newShift.breakTime || ""}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setNewShift({ ...newShift, breakTime: val === "" ? 0 : parseInt(val) });
                                      }}
                                      className="w-full h-11 pl-3 pr-12 text-[14px] leading-5 border border-gray-300 dark:border-border rounded-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 hover:border-primary transition-all bg-card"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground tracking-tight pointer-events-none">Mins</span>
                                  </div>
                                </div>
                              </div>

                              <div className="md:col-span-2 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground tracking-wider mb-1.5 ml-1">
                                      <Sunrise className="w-3 h-3" /> Shift Starts
                                    </label>
                                    <ModernTimePicker
                                      value={newShift.startTime}
                                      onChange={(val) => setNewShift({ ...newShift, startTime: val })}
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                  <div>
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground tracking-wider mb-1.5 ml-1">
                                      <Moon className="w-3 h-3" /> Shift Ends
                                    </label>
                                    <ModernTimePicker
                                      value={newShift.endTime}
                                      onChange={(val) => setNewShift({ ...newShift, endTime: val })}
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                </div>

                                {/* Live Calculation Display */}
                                {(() => {
                                  const [sH, sM] = newShift.startTime.split(':').map(Number);
                                  const [eH, eM] = newShift.endTime.split(':').map(Number);
                                  let startTotal = sH * 60 + sM;
                                  let endTotal = eH * 60 + eM;
                                  if (endTotal <= startTotal) endTotal += 1440;
                                  const totalMins = endTotal - startTotal - (newShift.breakTime || 0);
                                  const hours = Math.max(0, totalMins / 60);
                                  const isValid = totalMins > 0;

                                  return (
                                    <div className={`relative overflow-hidden p-4 rounded-lg border transition-all duration-300 shadow-sm max-w-md ${isValid ? "bg-card border-border" : "bg-rose-50/50 dark:bg-transparent border-rose-100 dark:border-rose-800/50"}`}>
                                      {/* Background Decoration */}
                                      {isValid && <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 dark:bg-transparent rounded-full blur-2xl opacity-60" />}

                                      <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className={`p-2.5 rounded-lg transition-colors duration-300 ${isValid ? "bg-primary/10 text-primary" : "bg-rose-100 dark:bg-transparent text-rose-600 dark:text-rose-400"}`}>
                                            <Clock className="w-4 h-4" />
                                          </div>
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <span className={`text-[11px] font-medium tracking-tight ${isValid ? "text-foreground" : "text-rose-800 dark:text-rose-300"}`}>
                                                Expected Shift Duration
                                              </span>
                                              {isValid && <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-transparent px-1.5 py-0.5 rounded-sm tracking-tighter">Live</span>}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-medium">Auto-calculated (ET - ST) - BT</span>
                                          </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                          <div className="flex items-baseline gap-1">
                                            <span className={`text-[24px] font-semibold tracking-tight transition-colors duration-300 ${isValid ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}>
                                              {isValid ? hours.toFixed(1) : "---"}
                                            </span>
                                            {isValid && <span className="text-[10px] font-medium text-muted-foreground tracking-widest">Hrs</span>}
                                          </div>
                                          {!isValid && <span className="text-[9px] font-medium text-rose-500 dark:text-rose-400 uppercase">Invalid Range</span>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                              <button
                                onClick={() => {
                                  setIsAddingShift(false);
                                  setEditingShiftId(null);
                                  setNewShift({ name: "", startTime: "09:00", endTime: "18:00", breakTime: 60 });
                                }}
                                className="px-6 h-10 border border-border text-slate-600 dark:text-slate-400 text-[12px] leading-4 font-bold rounded-lg hover:bg-muted/50 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!newShift.name.trim()) return;

                                  const [sH, sM] = newShift.startTime.split(':').map(Number);
                                  const [eH, eM] = newShift.endTime.split(':').map(Number);
                                  let startTotal = sH * 60 + sM;
                                  let endTotal = eH * 60 + eM;
                                  if (endTotal <= startTotal) endTotal += 1440;
                                  const totalMins = endTotal - startTotal - (newShift.breakTime || 0);
                                  const hours = Math.max(0, totalMins / 60);

                                  const nameLower = newShift.name.toLowerCase();
                                  let calculatedIcon: 'sunrise' | 'sun' | 'moon' = 'sun';
                                  let calculatedColor = 'primary';

                                  if (nameLower.includes('night') || nameLower.includes('grave') || nameLower.includes('late')) {
                                    calculatedIcon = 'moon';
                                    calculatedColor = 'slate';
                                  } else if (nameLower.includes('morning') || nameLower.includes('sunrise') || nameLower.includes('day')) {
                                    calculatedIcon = 'sunrise';
                                    calculatedColor = 'primary';
                                  } else if (nameLower.includes('evening') || nameLower.includes('afternoon') || nameLower.includes('sunset')) {
                                    calculatedIcon = 'sun';
                                    calculatedColor = 'amber';
                                  } else {
                                    const startHour = newShift.startTime ? parseInt(newShift.startTime.split(':')[0]) : 9;
                                    if (startHour >= 18 || startHour < 5) {
                                      calculatedIcon = 'moon';
                                      calculatedColor = 'slate';
                                    } else if (startHour >= 12 && startHour < 18) {
                                      calculatedIcon = 'sun';
                                      calculatedColor = 'amber';
                                    } else {
                                      calculatedIcon = 'sunrise';
                                      calculatedColor = 'primary';
                                    }
                                  }

                                  if (editingShiftId !== null) {
                                    const updatedShifts = (companyData.workingCalendar.shifts || []).map((s: any) => {
                                      if (s.id === editingShiftId) {
                                        return {
                                          ...s,
                                          ...newShift,
                                          totalHours: hours,
                                          icon: calculatedIcon,
                                          color: calculatedColor
                                        };
                                      }
                                      return s;
                                    });
                                    setCompanyData({
                                      ...companyData,
                                      workingCalendar: {
                                        ...companyData.workingCalendar,
                                        shifts: updatedShifts
                                      }
                                    });
                                    setEditingShiftId(null);
                                  } else {
                                    const newShiftObj = {
                                      id: Date.now().toString(),
                                      ...newShift,
                                      totalHours: hours,
                                      icon: calculatedIcon,
                                      color: calculatedColor
                                    };

                                    setCompanyData({
                                      ...companyData,
                                      workingCalendar: {
                                        ...companyData.workingCalendar,
                                        shifts: [...(companyData.workingCalendar.shifts || []), newShiftObj]
                                      }
                                    });
                                    setIsAddingShift(false);
                                  }
                                  setNewShift({ name: "", startTime: "09:00", endTime: "18:00", breakTime: 60 });
                                }}
                                className="px-6 h-10 bg-primary hover:bg-primary/90 text-white text-[12px] leading-4 font-bold rounded-lg transition-all"
                              >
                                Save Shift
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                        <Clock className="w-10 h-10 text-muted-foreground/40 mb-3" />
                        <h4 className="text-sm font-bold text-foreground">Shift Management is Disabled</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mt-1">
                          Toggle "Enable Shift Management" above to configure custom work shifts and make shift assignments available during employee creation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeScheduleTab === 'flexible' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="space-y-1">
                        <label className="block text-[14px] leading-5 font-bold text-foreground">
                          Flexible (Hybrid) Shift Configuration
                        </label>
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          Commonly used in MNCs: Define mandatory core hours while allowing flexible login/logout windows.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* Configuration Columns */}
                      <div className="xl:col-span-2 space-y-8">

                        {/* 1. Required Work Metrics */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-primary-500 dark:bg-primary-600 rounded-full" />
                            <h4 className="text-[12px] font-medium text-foreground tracking-tight">1. Required Work Metrics</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground ml-1">
                                Required Daily Hours
                              </label>
                              <div className="relative group">
                                <input
                                  type="number"
                                  value={companyData.workingCalendar?.flexRequiredHours}
                                  onChange={(e) => !isReadOnly && updateField('workingCalendar', 'flexRequiredHours', parseInt(e.target.value))}
                                  className="w-full h-11 px-3 text-[14px] leading-5 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary hover:border-primary transition-all bg-card"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground tracking-tight">Hrs / Day</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground ml-1">
                                Max Allowed Hours
                              </label>
                              <div className="relative group">
                                <input
                                  type="number"
                                  value={companyData.workingCalendar?.flexMaxHours}
                                  onChange={(e) => !isReadOnly && updateField('workingCalendar', 'flexMaxHours', parseInt(e.target.value))}
                                  className="w-full h-11 px-3 text-[14px] leading-5 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary hover:border-primary transition-all bg-card text-muted-foreground"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground tracking-tight">Optional</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Core Attendance Window */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-amber-500 dark:bg-amber-600 rounded-full" />
                            <h4 className="text-[12px] font-medium text-foreground tracking-tight">2. Mandatory Core Window</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground ml-1">
                                Core Start Time
                              </label>
                              <ModernTimePicker
                                value={companyData.workingCalendar?.flexCoreStartTime || "11:00"}
                                onChange={(val) => !isReadOnly && updateField('workingCalendar', 'flexCoreStartTime', val)}
                                disabled={isReadOnly}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground ml-1">
                                Core End Time
                              </label>
                              <ModernTimePicker
                                value={companyData.workingCalendar?.flexCoreEndTime || "16:00"}
                                onChange={(val) => !isReadOnly && updateField('workingCalendar', 'flexCoreEndTime', val)}
                                disabled={isReadOnly}
                              />
                            </div>
                          </div>
                          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium ml-1 !mt-1">* Employees must be present during this entire window.</p>
                        </div>

                        {/* 3. Login Flexibility Window */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-emerald-500 dark:bg-emerald-600 rounded-full" />
                            <h4 className="text-[12px] font-medium text-foreground tracking-tight">3. Login Flexibility Window</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground ml-1">
                                Earliest Login Allowed
                              </label>
                              <ModernTimePicker
                                value={companyData.workingCalendar?.flexMinLoginTime || "07:00"}
                                onChange={(val) => !isReadOnly && updateField('workingCalendar', 'flexMinLoginTime', val)}
                                disabled={isReadOnly}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground ml-1">
                                Latest Login Allowed
                              </label>
                              <ModernTimePicker
                                value={companyData.workingCalendar?.flexMaxLoginTime || "11:00"}
                                onChange={(val) => !isReadOnly && updateField('workingCalendar', 'flexMaxLoginTime', val)}
                                disabled={isReadOnly}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calculations & Insights */}
                      <div className="xl:col-span-1">
                        <div className="bg-muted/50 border border-border rounded-lg p-6 space-y-6">
                          <h4 className="text-[12px] font-medium text-foreground flex items-center gap-2">
                            Flexible Model Logic
                          </h4>

                          <div className="space-y-4">
                            <div className="bg-card p-5 rounded-lg border border-border shadow-sm space-y-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <span className="text-[12px] font-semibold text-foreground">Rule Simulator</span>
                                  <p className="text-[9px] text-muted-foreground font-medium">Test your configuration logic</p>
                                </div>
                                <div className="px-2 py-0.5 bg-muted rounded text-[9px] font-bold text-muted-foreground">BETA</div>
                              </div>

                              {/* Simulator Inputs */}
                              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-50 dark:border-border">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Sample Login</label>
                                  <input
                                    type="time"
                                    value={simLogin}
                                    onChange={(e) => setSimLogin(e.target.value)}
                                    className="w-full h-8 px-2 text-[12px] leading-4 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 hover:border-primary transition-all bg-card"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Sample Logout</label>
                                  <input
                                    type="time"
                                    value={simLogout}
                                    onChange={(e) => setSimLogout(e.target.value)}
                                    className="w-full h-8 px-2 text-[12px] leading-4 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 hover:border-primary transition-all bg-card"
                                  />
                                </div>
                              </div>

                              {/* Rule Verification Logic */}
                              {(() => {
                                const toMins = (t: string) => {
                                  const [h, m] = t.split(':').map(Number);
                                  return h * 60 + m;
                                };

                                const req = companyData.workingCalendar?.flexRequiredHours || 8;
                                const coreS = companyData.workingCalendar?.flexCoreStartTime || "11:00";
                                const coreE = companyData.workingCalendar?.flexCoreEndTime || "16:00";
                                const minL = companyData.workingCalendar?.flexMinLoginTime || "07:00";
                                const maxL = companyData.workingCalendar?.flexMaxLoginTime || "11:00";

                                const curLogin = toMins(simLogin);
                                let curLogout = toMins(simLogout);
                                if (curLogout < curLogin) curLogout += 1440; // Next day logout

                                // 1. Hours Check (Assume 1hr break for simulator)
                                const totalHrs = (curLogout - curLogin - 60) / 60;
                                const hasHours = totalHrs >= req;

                                // 2. Core Check
                                const coreSMins = toMins(coreS);
                                const coreEMins = toMins(coreE);
                                const hasCore = curLogin <= coreSMins && curLogout >= coreEMins;

                                // 3. Login Window Check
                                const minLMins = toMins(minL);
                                const maxLMins = toMins(maxL);
                                const hasWindow = curLogin >= minLMins && curLogin <= maxLMins;

                                const isCompliant = hasHours && hasCore && hasWindow;

                                return (
                                  <div className="space-y-4">
                                    <div className="space-y-3">
                                      {/* Rule 1: Hours */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${hasHours ? "bg-primary-500 dark:bg-primary-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                                          <span className={`text-[10px] font-medium ${hasHours ? "text-slate-600 dark:text-slate-300" : "text-muted-foreground line-through"}`}>Meets {req}hrs Requirement</span>
                                        </div>
                                        <Check className={`w-3 h-3 ${hasHours ? "text-emerald-500 dark:text-emerald-400" : "text-slate-200 dark:text-slate-600"}`} />
                                      </div>

                                      {/* Rule 2: Core Hours */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${hasCore ? "bg-amber-500 dark:bg-amber-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                                          <span className={`text-[10px] font-medium ${hasCore ? "text-slate-600 dark:text-slate-300" : "text-muted-foreground line-through"}`}>Presence during {coreS}-{coreE}</span>
                                        </div>
                                        <Check className={`w-3 h-3 ${hasCore ? "text-emerald-500 dark:text-emerald-400" : "text-slate-200 dark:text-slate-600"}`} />
                                      </div>

                                      {/* Rule 3: Login Window */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${hasWindow ? "bg-emerald-500 dark:bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                                          <span className={`text-[10px] font-medium ${hasWindow ? "text-slate-600 dark:text-slate-300" : "text-muted-foreground line-through"}`}>Login between {minL}-{maxL}</span>
                                        </div>
                                        <Check className={`w-3 h-3 ${hasWindow ? "text-emerald-500 dark:text-emerald-400" : "text-slate-200 dark:text-slate-600"}`} />
                                      </div>
                                    </div>

                                    <div className={`p-3 rounded-lg border transition-all duration-300 flex items-center gap-3 ${isCompliant ? "bg-emerald-50 dark:bg-transparent border-emerald-100 dark:border-emerald-800/50" : "bg-rose-50 dark:bg-transparent border-rose-100 dark:border-rose-800/50"}`}>
                                      <div className="p-2 bg-card rounded-lg shadow-sm">
                                        {isCompliant ? (
                                          <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <Clock className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                        )}
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className={`text-[10px] font-bold leading-none ${isCompliant ? "text-emerald-900 dark:text-emerald-300" : "text-rose-900 dark:text-rose-300"}`}>
                                          {isCompliant ? "Compliant Shift" : "Compliance Breach"}
                                        </span>
                                        <p className={`text-[9px] font-medium leading-none ${isCompliant ? "text-emerald-700/70 dark:text-emerald-400/70" : "text-rose-700/70 dark:text-rose-400/70"}`}>
                                          {isCompliant ? "Valid for attendance processing" : "Correct settings or timings"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="p-4 bg-primary rounded-lg text-white space-y-4 shadow-sm shadow-primary-100 dark:shadow-primary-950">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary-500 dark:bg-primary-600 rounded-lg">
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="text-[10px] font-bold tracking-wider">Automated Processing Rules</span>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-primary-300 mt-1.5" />
                                  <p className="text-[10px] text-primary-50 font-medium leading-tight">
                                    <span className="font-bold text-white">Deficit:</span> Triggers if Worked Hours &lt; {companyData.workingCalendar?.flexRequiredHours} hrs.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-primary-300 mt-1.5" />
                                  <p className="text-[10px] text-primary-50 font-medium leading-tight">
                                    <span className="font-bold text-white">Late Login:</span> Triggers if Login &gt; {companyData.workingCalendar?.flexMaxLoginTime}.
                                  </p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-primary-300 mt-1.5" />
                                  <p className="text-[10px] text-primary-50 font-medium leading-tight">
                                    <span className="font-bold text-white">Half Day:</span> Triggers if Core Hours ({companyData.workingCalendar?.flexCoreStartTime} - {companyData.workingCalendar?.flexCoreEndTime}) are missed.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Flexible Rules Summary Table */}
                    <div className="space-y-4 pt-6 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-slate-400 dark:bg-slate-500 rounded-full" />
                        <h4 className="text-[12px] font-medium text-foreground uppercase tracking-tight">Flexible Shift Policy Summary</h4>
                      </div>

                      <div className="overflow-hidden border border-border rounded-lg bg-card shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/50/50 border-b border-border">
                              <th className="px-4 py-3 text-sm font-semibold text-black tracking-wider">Rule Category</th>
                              <th className="px-4 py-3 text-sm font-semibold text-black tracking-wider">Current Configuration</th>
                              <th className="px-4 py-3 text-sm font-semibold text-black tracking-wider">Validation Logic</th>
                              <th className="px-4 py-3 text-sm font-semibold text-black tracking-wider">Violation Impact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-border">
                            <tr>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-primary/10 rounded-lg"><Clock className="w-3 h-3 text-primary" /></div>
                                  <span className="text-[11px] font-bold text-foreground">Working Hours</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{companyData.workingCalendar?.flexRequiredHours} hrs / day</td>
                              <td className="px-4 py-3 text-[10px] text-muted-foreground font-medium">Net worked hours must reach threshold</td>
                              <td className="px-4 py-3"><span className="px-2 py-0.5 bg-rose-50 dark:bg-transparent text-rose-600 dark:text-rose-400 rounded-full text-[9px] font-bold">Deficit Triggers</span></td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg"><Sun className="w-3 h-3 text-amber-600 dark:text-amber-400" /></div>
                                  <span className="text-[11px] font-bold text-foreground">Core Attendance</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{companyData.workingCalendar?.flexCoreStartTime} - {companyData.workingCalendar?.flexCoreEndTime}</td>
                              <td className="px-4 py-3 text-[10px] text-muted-foreground font-medium">Mandatory presence during this window</td>
                              <td className="px-4 py-3"><span className="px-2 py-0.5 bg-amber-50 dark:bg-transparent text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-bold">Half Day Mark</span></td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg"><Sunrise className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /></div>
                                  <span className="text-[11px] font-bold text-foreground">Login Window</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{companyData.workingCalendar?.flexMinLoginTime} to {companyData.workingCalendar?.flexMaxLoginTime}</td>
                              <td className="px-4 py-3 text-[10px] text-muted-foreground font-medium">Flexibility allowed only within this range</td>
                              <td className="px-4 py-3"><span className="px-2 py-0.5 bg-orange-50 dark:bg-transparent text-orange-600 dark:text-orange-400 rounded-full text-[9px] font-bold">Late Mark / Violation</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeScheduleTab === 'holidays' && (
                  <HolidaysTab
                    companyData={companyData}
                    setCompanyData={setCompanyData}
                    isReadOnly={isReadOnly}
                    handleSave={handleSave}
                    handleCancel={handleCancel}
                    isSaving={isSaving}
                    editMode={editMode}
                    setEditMode={setEditMode}
                  />
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        <ConfirmationDialog
          isOpen={!!deleteCostCenterTarget}
          onClose={() => setDeleteCostCenterTarget(null)}
          onConfirm={() => {
            if (deleteCostCenterTarget !== null) {
              const updated = companyData.costCenters.filter((_: string, i: number) => i !== deleteCostCenterTarget.index);
              setCompanyData({ ...companyData, costCenters: updated.length ? updated : [] });
              toast.success("Cost Centre removed.");
              setDeleteCostCenterTarget(null);
            }
          }}
          title="Delete Cost Centre?"
          description={`Are you sure you want to delete "${deleteCostCenterTarget?.name}"? This action will remove it from the organization configuration.`}
          confirmText="Delete Cost Centre"
          variant="danger"
        />
      </>
    );
  }

  return null;
};

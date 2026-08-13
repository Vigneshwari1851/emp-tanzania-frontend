import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Upload, 
  Clock, 
  Info, 
  Search, 
  MoreVertical, 
  Edit2, 
  Bell, 
  Lock, 
  ArrowUpDown,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';

interface HolidayItem {
  id: string;
  originalIndex: number;
  date: string; // YYYY-MM-DD
  name: string;
}

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

const getMonthNameFromDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthInt = parseInt(parts[1], 10);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[monthInt - 1] || "";
  }
  return "";
};

const getWeekdayName = (dateStr: string): string => {
  if (!dateStr || !dateStr.includes("-")) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

const getDefaultHolidaysForCountry = (country: string, year: number): { date: string; name: string }[] => {
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
  return holidays;
};

export const HolidaysTab = ({
  companyData,
  setCompanyData,
  isReadOnly,
  handleSave,
  handleCancel,
  isSaving,
  editMode,
  setEditMode
}: any) => {
  const navigate = useOrgNavigate();

  const currentYearInt = new Date().getFullYear();
  const currentYearStr = String(currentYearInt);

  // Filtering & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    // Dynamic default: use current year, or fallback to the year of first holiday, or default to "2023"
    const currentYear = new Date().getFullYear().toString();
    const hols = companyData?.workingCalendar?.publicHolidays || [];
    if (hols.length > 0) {
      const firstHol = hols[0];
      const colonIdx = firstHol.indexOf(':');
      const dateStr = colonIdx !== -1 ? firstHol.substring(0, colonIdx).trim() : firstHol.trim();
      const match = dateStr.match(/^(\d{4})/);
      if (match) return match[1];
    }
    return "2023"; // Visual parity default
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  
  // Custom Year Dropdown states
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const holidayDates = useMemo(() => {
    const hols = companyData?.workingCalendar?.publicHolidays || [];
    return hols.map((h: string) => {
      const colonIdx = h.indexOf(':');
      return colonIdx !== -1 ? h.substring(0, colonIdx).trim() : h.trim();
    });
  }, [companyData?.workingCalendar?.publicHolidays]);

  const minDateLimit = useMemo(() => {
    if (selectedYear && selectedYear !== 'all') {
      return `${selectedYear}-01-01`;
    }
    return undefined;
  }, [selectedYear]);

  const modalMinDate = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (selectedYear && selectedYear !== 'all') {
      const yearStart = `${selectedYear}-01-01`;
      return yearStart > todayStr ? yearStart : todayStr;
    }
    return todayStr;
  }, [selectedYear]);

  const maxDateLimit = useMemo(() => {
    if (selectedYear && selectedYear !== 'all') {
      return `${selectedYear}-12-31`;
    }
    return undefined;
  }, [selectedYear]);

  const isEditable = !isReadOnly;

  // Ensure default holidays for all years if not yet populated
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    const hols = companyData?.workingCalendar?.publicHolidays;
    const country = companyData?.legalAddress?.country || "India";
    if (country) {
      const allYears = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];
      const existingYears = new Set<string>();
      if (hols) {
        hols.forEach((h: string) => {
          const colonIdx = h.indexOf(':');
          const dateStr = colonIdx !== -1 ? h.substring(0, colonIdx).trim() : h.trim();
          const match = dateStr.match(/^(\d{4})/);
          if (match) existingYears.add(match[1]);
        });
      }
      const missingYears = allYears.filter(y => !existingYears.has(String(y)));
      if (missingYears.length > 0 && setCompanyData) {
        const toAdd = missingYears.flatMap(y => {
          const defaults = getDefaultHolidaysForCountry(country, y);
          return defaults.map(d => `${d.date}: ${d.name}`);
        });
        setCompanyData({
          ...companyData,
          workingCalendar: {
            ...companyData.workingCalendar,
            publicHolidays: [...(hols || []), ...toAdd],
          },
        });
      }
    }
    initializedRef.current = true;
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper to check if a year can be edited
  const canEditSelectedYear = selectedYear !== 'all' && parseInt(selectedYear) >= currentYearInt;

  const isDefaultHoliday = (holidayName: string, dateStr: string): boolean => {
    const country = companyData?.legalAddress?.country || "India";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0]);
    const defaults = getDefaultHolidaysForCountry(country, year);
    return defaults.some(d => {
      const nameMatch = d.name.trim().toLowerCase() === holidayName.trim().toLowerCase();
      const dateMatch = d.date === dateStr;
      return nameMatch && dateMatch;
    });
  };

  // Row-level editability helper
  const isRowEditable = (dateStr: string) => {
    if (!isEditable) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const holidayYear = parseInt(parts[0]);
    if (holidayYear < currentYearInt) return false;
    if (holidayYear > currentYearInt) return true;
    
    // For current year, check if holiday date is today or in the future
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr >= todayStr;
  };
  
  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal / Add-Edit states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);
  const [holidayNameInput, setHolidayNameInput] = useState('');
  const [holidayDateInput, setHolidayDateInput] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showCancelHolidayEditConfirm, setShowCancelHolidayEditConfirm] = useState(false);
  const [showCancelHolidayModalConfirm, setShowCancelHolidayModalConfirm] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [holidayToDeleteIndex, setHolidayToDeleteIndex] = useState<number | null>(null);

  // Button Action handlers
  const handleRedirect = () => {
    if (!window.location.pathname.endsWith('/holidays')) {
      navigate('/org-setup');
    }
  };



  // Years options list
  const years = ["2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Parse parent holidays to structured objects
  const parsedHolidays = useMemo(() => {
    const hols = companyData?.workingCalendar?.publicHolidays || [];
    return hols.map((h: string, index: number) => {
      if (h.trim().startsWith('{')) {
        try {
          const obj = JSON.parse(h);
          return {
            id: obj.id || `${obj.date}-${obj.name}-${index}`,
            originalIndex: index,
            date: obj.date,
            name: obj.name,
            isDefault: !!obj.isDefault,
            isLocked: !!obj.isLocked || !!obj.isDefault,
          };
        } catch (e) {
          // fallback
        }
      }
      const colonIdx = h.indexOf(':');
      const dateStr = colonIdx !== -1 ? h.substring(0, colonIdx).trim() : h.trim();
      const nameStr = colonIdx !== -1 ? h.substring(colonIdx + 1).trim() : "Public Holiday";
      const isDefault = isDefaultHoliday(nameStr, dateStr);
      return {
        id: `${dateStr}-${nameStr}-${index}`,
        originalIndex: index,
        date: dateStr,
        name: nameStr,
        isDefault: isDefault,
        isLocked: isDefault,
      };
    });
  }, [companyData?.workingCalendar?.publicHolidays, companyData?.legalAddress?.country]);

  // Calculate dynamic counts per month based on the selected year
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: 0,
      January: 0,
      February: 0,
      March: 0,
      April: 0,
      May: 0,
      June: 0,
      July: 0,
      August: 0,
      September: 0,
      October: 0,
      November: 0,
      December: 0,
    };

    const yearFiltered = parsedHolidays.filter((h: any) => {
      if (selectedYear === "all") return true;
      return h.date.startsWith(selectedYear);
    });

    counts.All = yearFiltered.length;

    yearFiltered.forEach((h: any) => {
      const monthName = getMonthNameFromDate(h.date);
      if (monthName && counts[monthName] !== undefined) {
        counts[monthName]++;
      }
    });

    return counts;
  }, [parsedHolidays, selectedYear]);

  // Filter and sort holidays list
  const filteredHolidays = useMemo(() => {
    let list = [...parsedHolidays];

    // Filter by selected year
    if (selectedYear !== "all") {
      list = list.filter(h => h.date.startsWith(selectedYear));
    }

    // Filter by selected month sidebar
    if (selectedMonth !== "All") {
      list = list.filter(h => getMonthNameFromDate(h.date) === selectedMonth);
    }

    // Filter by search bar input
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      list = list.filter(h => 
        h.name.toLowerCase().includes(query) || 
        h.date.toLowerCase().includes(query) ||
        formatDateForCountry(h.date, companyData?.legalAddress?.country || "India").toLowerCase().includes(query)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.date.localeCompare(b.date);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return list;
  }, [parsedHolidays, selectedYear, selectedMonth, searchTerm, sortField, sortDirection, companyData?.legalAddress?.country]);

  // Sort handlers
  const handleSort = (field: 'name' | 'date') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Trigger Add Modal
  const handleAddHolidayClick = () => {
    const activeYear = selectedYear !== 'all' ? parseInt(selectedYear) : new Date().getFullYear();
    if (activeYear < new Date().getFullYear()) {
      toast.error("Cannot add new holidays to past years.");
      return;
    }
    setEditingHoliday(null);
    setHolidayNameInput('');
    // Default to the selected year if not "all", otherwise default to current year
    const defaultYear = selectedYear !== 'all' ? selectedYear : new Date().getFullYear().toString();
    // Default month: selected month or current month
    let defaultMonth = "01";
    if (selectedMonth !== 'All') {
      const mIdx = months.indexOf(selectedMonth) + 1;
      defaultMonth = mIdx.toString().padStart(2, '0');
    } else {
      defaultMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    }
    setHolidayDateInput(`${defaultYear}-${defaultMonth}-01`);
    setIsAddEditModalOpen(true);
  };

  // Trigger Edit Modal
  const handleEditHolidayClick = (holiday: HolidayItem) => {
    const parts = holiday.date.split('-');
    if (parts.length === 3) {
      const holidayYear = parseInt(parts[0]);
      if (holidayYear < currentYearInt) {
        toast.error("Editing holiday schedules from previous years is not permitted.");
        return;
      }
    }
    setEditingHoliday(holiday);
    setHolidayNameInput(holiday.name);
    setHolidayDateInput(holiday.date);
    setIsAddEditModalOpen(true);
  };

  // Save changes from Modal
  const handleSaveModal = () => {
    if (!holidayNameInput.trim()) {
      toast.error("Please enter a holiday name");
      return;
    }
    if (!holidayDateInput) {
      toast.error("Please select a date");
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (holidayDateInput < todayStr) {
      toast.error("Cannot add or modify holidays in the past.");
      return;
    }

    const currentHols = [...(companyData.workingCalendar.publicHolidays || [])];

    if (editingHoliday) {
      // Edit mode
      currentHols[editingHoliday.originalIndex] = JSON.stringify({
        date: holidayDateInput,
        name: holidayNameInput.trim(),
        isDefault: false,
        isLocked: false
      });
      toast.success("Holiday updated successfully!");
    } else {
      // Add mode
      currentHols.push(JSON.stringify({
        date: holidayDateInput,
        name: holidayNameInput.trim(),
        isDefault: false,
        isLocked: false
      }));
      toast.success("Holiday added successfully!");
    }

    // Sort and update state
    const serialized = currentHols.sort();
    setCompanyData({
      ...companyData,
      workingCalendar: {
        ...companyData.workingCalendar,
        publicHolidays: serialized
      }
    });

    if (setEditMode) {
      setEditMode(true);
    }

    setIsAddEditModalOpen(false);
    setEditingHoliday(null);
    setHolidayNameInput('');
    setHolidayDateInput('');
  };

  // Trigger delete operation
  const handleDeleteClick = (originalIndex: number) => {
    const currentHols = [...(companyData.workingCalendar.publicHolidays || [])];
    const holidayStr = currentHols[originalIndex];
    if (holidayStr) {
      let dateStr = "";
      if (holidayStr.trim().startsWith('{')) {
        try {
          dateStr = JSON.parse(holidayStr).date;
        } catch (e) {}
      } else {
        const colonIdx = holidayStr.indexOf(':');
        dateStr = colonIdx !== -1 ? holidayStr.substring(0, colonIdx).trim() : holidayStr.trim();
      }
      if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const holidayYear = parseInt(parts[0]);
          if (holidayYear < currentYearInt) {
            toast.error("Deleting holidays from previous years is not permitted.");
            return;
          }
        }
      }
    }
    setHolidayToDeleteIndex(originalIndex);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (holidayToDeleteIndex !== null) {
      const currentHols = [...(companyData.workingCalendar.publicHolidays || [])];
      const newHols = currentHols.filter((_, i) => i !== holidayToDeleteIndex).sort();
      
      setCompanyData({
        ...companyData,
        workingCalendar: {
          ...companyData.workingCalendar,
          publicHolidays: newHols
        }
      });
      if (setEditMode) {
        setEditMode(true);
      }
      toast.success("Holiday deleted successfully");
    }
    setIsDeleteModalOpen(false);
    setHolidayToDeleteIndex(null);
  };

  // Download template
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

  // Excel/CSV import parsing
  const handleImportSheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        
        if (rows.length < 2) {
          toast.error("The uploaded sheet appears to be empty.");
          return;
        }
        
        const headers = rows[0].map((h: any) => String(h).trim().toLowerCase());
        let dateColIdx = headers.findIndex((h: string) => 
          h.includes('date') || h.includes('day') || h.includes('dt') || h.includes('when')
        );
        let nameColIdx = headers.findIndex((h: string) => 
          h.includes('name') || h.includes('holiday') || h.includes('title') || h.includes('event') || h.includes('desc')
        );
        
        if (dateColIdx === -1) dateColIdx = 0;
        if (nameColIdx === -1) nameColIdx = 1;
        
        const newHolidays: string[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          let rawDate = row[dateColIdx];
          let rawName = row[nameColIdx];
          
          if (!rawDate && !rawName) continue;
          
          let formattedDate = "";
          if (rawDate) {
            if (typeof rawDate === 'number') {
              const dateObj = new Date((rawDate - 25569) * 86400 * 1000);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().split('T')[0];
              }
            } else {
              const dateStr = String(rawDate).trim();
              const dateObj = new Date(dateStr);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().split('T')[0];
              } else {
                const match = dateStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
                if (match) {
                  const [_, d, m, y] = match;
                  formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                } else {
                  const match2 = dateStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
                  if (match2) {
                    const [_, y, m, d] = match2;
                    formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                  }
                }
              }
            }
          }
          
          let formattedName = rawName ? String(rawName).trim() : "Public Holiday";
          if (formattedDate) {
            newHolidays.push(`${formattedDate}: ${formattedName}`);
          }
        }
        
        if (newHolidays.length === 0) {
          toast.error("Could not extract any valid holidays from the sheet.");
          return;
        }
        
        const currentHols = companyData.workingCalendar.publicHolidays || [];
        const holidayMap = new Map<string, string>();
        currentHols.forEach((h: string) => {
          const parts = h.split(':');
          if (parts.length >= 2) {
            holidayMap.set(parts[0].trim(), parts.slice(1).join(':').trim());
          }
        });
        
        newHolidays.forEach((h: string) => {
          const parts = h.split(':');
          if (parts.length >= 2) {
            holidayMap.set(parts[0].trim(), parts.slice(1).join(':').trim());
          }
        });
        
        const mergedHols = Array.from(holidayMap.entries())
          .map(([dt, nm]) => `${dt}: ${nm}`)
          .sort();
          
        setCompanyData({
          ...companyData,
          workingCalendar: {
            ...companyData.workingCalendar,
            publicHolidays: mergedHols
          }
        });
        
        toast.success(`Successfully imported ${newHolidays.length} holidays!`);
      } catch (err: any) {
        toast.error("Failed to parse sheet: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col space-y-6 pt-2 font-['Inter',sans-serif]">
      {/* Redesigned Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-border pb-3 gap-4">
        {/* Navigation title */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <h2 className="text-base font-bold text-slate-800 dark:text-foreground">Holiday Calendar</h2>
        </div>

        {/* Search Bar & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Year Dropdown Selector */}
          <div className="relative" ref={yearDropdownRef}>
            <button
              type="button"
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3.5 py-2 border border-slate-200 dark:border-border rounded-[8px] text-[13px] font-semibold bg-white dark:bg-card text-slate-700 dark:text-foreground outline-none transition-all hover:bg-slate-50 dark:hover:bg-muted hover:shadow-sm focus:border-blue-600 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-400 min-w-[110px]"
            >
              <span>{selectedYear === 'all' ? 'All Years' : selectedYear}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-muted-foreground transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isYearDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-card border border-[#E6E8EE] dark:border-border rounded-lg shadow-lg py-1 z-30 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all');
                    setSelectedMonth('All');
                    setIsYearDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${
                    selectedYear === 'all'
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted'
                  }`}
                >
                  <span>All Years</span>
                  {selectedYear === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setSelectedYear(y);
                      setSelectedMonth('All');
                      setIsYearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${
                      selectedYear === y
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted'
                    }`}
                  >
                    <span>{y}</span>
                    {selectedYear === y && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 dark:text-muted-foreground" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Clients by Name or ID"
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-border rounded-[8px] text-[13px] leading-none w-64 bg-white dark:bg-card text-slate-700 dark:text-foreground outline-none transition-all focus:border-blue-600 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-400"
            />
          </div>

          {/* Excel Import button (hidden file input trigger) */}
          {isEditable && (
            <>
              <button
                onClick={() => document.getElementById('holiday-file-import')?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-border rounded-[8px] text-[13px] font-semibold text-[#0FA968] dark:text-emerald-400 bg-[#E8F8F1] dark:bg-transparent hover:bg-[#D3F2E3] dark:hover:bg-transparent transition-all"
                title="Import spreadsheet sheet"
              >
                <Upload className="w-4 h-4" />
                Import Sheet
              </button>
              <input
                id="holiday-file-import"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleImportSheet}
              />
            </>
          )}

          {/* "+ Add Holiday" button */}
          {isEditable && (
            <button
              onClick={handleAddHolidayClick}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-border rounded-[8px] text-[13px] font-semibold text-slate-800 dark:text-foreground bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted transition-all shadow-sm border-blue-600/10"
            >
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Rendering */}
      <div className="space-y-6">

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-stretch">
            
            {/* Sidebar Column: Select Month */}
            <div className="bg-white dark:bg-card border border-slate-100 dark:border-border rounded-[8px] p-4 shadow-sm space-y-3">
              <h3 className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-wider border-b border-slate-50 dark:border-border pb-2 mb-1">
                Filter Month
              </h3>
              
              <div className="space-y-1">
                {/* ALL Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMonth("All")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-left text-[13px] transition-all duration-200 group ${
                    selectedMonth === "All"
                      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary pl-2.5"
                      : "text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-foreground border-l-2 border-transparent"
                  }`}
                >
                  <span>All Months</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                    selectedMonth === "All"
                      ? "bg-primary/20 text-primary"
                      : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground group-hover:bg-slate-200 dark:group-hover:bg-muted/80 group-hover:text-slate-700 dark:group-hover:text-foreground"
                  }`}>
                    {monthCounts.All}
                  </span>
                </button>

                {/* Individual Months */}
                {months.map(m => {
                  const count = monthCounts[m] || 0;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonth(m)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-left text-[13px] transition-all duration-200 group ${
                        selectedMonth === m
                          ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary pl-2.5"
                          : "text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-foreground border-l-2 border-transparent"
                      }`}
                    >
                      <span>{m}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                        selectedMonth === m
                          ? "bg-primary/20 text-primary"
                          : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground group-hover:bg-slate-200 dark:group-hover:bg-muted/80 group-hover:text-slate-700 dark:group-hover:text-foreground"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Table of Holidays */}
            <div className="bg-white dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[8px] overflow-hidden shadow-[0_1px_2px_rgba(16,17,26,0.04)]">
              <table className="w-full text-left border-collapse">
                {filteredHolidays.length > 0 && (
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-muted/50 border-b border-slate-100 dark:border-border text-[11px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-muted select-none font-semibold text-sm text-black" 
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1.5">
                          Name
                          <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-muted-foreground" />
                        </div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-muted select-none font-semibold text-sm text-black" 
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-1.5">
                          Date
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="px-6 py-4 select-none font-semibold text-sm text-black">
                        Day
                      </th>
                      {isEditable && (
                        <th className="px-6 py-4 text-right select-none w-24 font-semibold text-sm text-black">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-100 dark:divide-border text-[13px]">
                  {filteredHolidays.length === 0 ? (
                    <tr>
                      <td colSpan={isEditable ? 4 : 3} className="px-6 py-12 text-center text-slate-400 dark:text-muted-foreground">
                        <Calendar className="w-8 h-8 text-slate-300 dark:text-muted-foreground/50 mx-auto mb-2" />
                        <p className="font-semibold text-sm text-slate-500 dark:text-muted-foreground">No holidays scheduled</p>
                        <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
                          {isReadOnly 
                            ? "No holidays scheduled for the selected date range." 
                            : "Try widening filters or add a new holiday."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredHolidays.map((h) => (
                       <tr 
                        key={h.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-muted/50 transition-colors group ${isEditable ? 'cursor-pointer' : ''}`}
                         onClick={() => {
                          if (!isEditable) return;
                          
                          if (h.isDefault) {
                            toast.error("Default holidays cannot be modified.");
                            return;
                          }
                          
                          if (!isRowEditable(h.date)) {
                            toast.error("Past holidays cannot be modified.");
                            return;
                          }
                          
                          handleEditHolidayClick(h);
                        }}
                      >
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-foreground">
                          <div className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            <span className="text-[13.5px]">{h.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 text-slate-600 dark:text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-muted-foreground flex-shrink-0" />
                            <span className="text-[13px] font-medium">
                              {formatDateForCountry(h.date, companyData?.legalAddress?.country || "India")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
                            {getWeekdayName(h.date)}
                          </span>
                        </td>
                        {isEditable && (
                          <td className="px-6 py-4 text-right relative">
                            {h.isDefault ? (
                              <div className="inline-flex items-center gap-1.5 text-slate-400 dark:text-muted-foreground/60 justify-end w-full" title="Default holidays cannot be modified">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                            ) : isRowEditable(h.date) ? (
                              <div className="inline-flex items-center gap-2 justify-end w-full">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditHolidayClick(h);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-muted text-slate-400 hover:text-slate-650 transition-colors border-none bg-transparent"
                                  title="Edit Holiday"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(h.originalIndex);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-650 transition-colors border-none bg-transparent"
                                  title="Delete Holiday"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-slate-400 dark:text-muted-foreground/60 justify-end w-full" title="Past dates are read-only">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Import/Download instructions tips card */}
          {isEditable && (
            <div className="space-y-6 mt-6">
              <div className="flex items-start gap-3 bg-slate-50 dark:bg-muted/30 border border-slate-100 dark:border-border rounded-[8px] p-4 text-[13px] text-slate-600 dark:text-muted-foreground leading-relaxed shadow-sm">
                <FileSpreadsheet className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-foreground">Spreadsheet Batch Operations:</span> 
                  {" "}You can upload an Excel or CSV file containing <span className="font-semibold text-slate-800 dark:text-foreground">Date</span> and <span className="font-semibold text-slate-800 dark:text-foreground">Name</span> columns. All imported holidays will be synced dynamically. 
                  {" "}
                  <button 
                    type="button" 
                    onClick={downloadSampleSheet}
                    className="font-semibold text-primary hover:underline focus:outline-none"
                  >
                    Download Excel Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Confirmation Delete Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setHolidayToDeleteIndex(null); }}
        onConfirm={handleConfirmDelete}
        title="Remove Holiday"
        description="Are you sure you want to delete this holiday? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Add / Edit Holiday Dialog */}
      {isAddEditModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center w-screen h-screen bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card rounded-xl shadow-xl border border-slate-100 dark:border-border w-full max-w-lg p-6 m-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-foreground mb-4 border-b border-slate-100 dark:border-border pb-2">
              {editingHoliday ? "Edit Holiday" : "Add Holiday"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-muted-foreground mb-1.5">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={holidayNameInput}
                  onChange={(e) => setHolidayNameInput(e.target.value)}
                  placeholder="e.g. Christmas Day"
                  className="w-full border border-slate-200 dark:border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-400 bg-white dark:bg-card text-slate-800 dark:text-foreground"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-muted-foreground mb-1.5">
                  Date
                </label>
                <ModernDatePicker
                  value={holidayDateInput}
                  onChange={(date) => setHolidayDateInput(date)}
                  minDate={modalMinDate}
                  maxDate={maxDateLimit}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-border">
              <button
                onClick={() => setShowCancelHolidayModalConfirm(true)}
                className="px-4 py-2 border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                className="px-5 py-2 bg-primary hover:bg-primary/70 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={showCancelHolidayEditConfirm}
        title="Discard Holiday Edits?"
        message="Are you sure you want to cancel editing? Any unsaved holiday modifications will be discarded."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={async () => {
          setShowCancelHolidayEditConfirm(false);
          if (handleCancel) {
            await handleCancel();
          }
        }}
        onCancel={() => setShowCancelHolidayEditConfirm(false)}
      />

      <ConfirmDialog
        open={showCancelHolidayModalConfirm}
        title="Discard Holiday Changes?"
        message="Are you sure you want to cancel? The holiday details entered in this modal will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelHolidayModalConfirm(false);
          setIsAddEditModalOpen(false);
          setEditingHoliday(null);
          setHolidayNameInput('');
          setHolidayDateInput('');
        }}
        onCancel={() => setShowCancelHolidayModalConfirm(false)}
      />
    </div>
  );
};

import { useState, useEffect, useMemo } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useLocation } from "react-router";
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { ArrowLeft, Building2, Save, MapPin, Briefcase, ChevronRight, Loader2, Calendar, Network, DollarSign, Edit } from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { getOrganizations, createOrganization, updateOrganization } from '@/features/organization/services/organizations';
import { ProgressBar } from '@/features/organization/components/ProgressBar';
import { Permission } from '@/shared/types/rbac';
import { CompanyStructureForm } from '@/features/organization/components/CompanyStructureForm';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { getDepartments } from '@/features/organization/services/departments';
import { getRoles } from '@/features/rbac/services/roles';
import { getDesignations } from '@/features/organization/services/designations';

interface CompanyData {
  // Legal Entity & Tax Data
  EntityName: string;
  companyCode: string;
  taxRegistrationNumber: string; // New field from column: tax_registration_number
  taxRegistrationNumbers: {
    pan?: string;
    tin?: string;
    sin?: string;
    ein?: string;
    siret?: string;
    other?: string;
    [key: string]: string | undefined;
  };
  legalAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  jurisdiction: string;
  currency: string;
  fiscalYearEnd: string;
  companyType: string;
  logoUrl?: string;

  // Organizational Structure
  departments: string[];
  businessUnits: string[];
  divisions: string[];
  costCenters: string[];

  // Geographical/Location Structure
  locations: Array<{
    id: string;
    locationCode: string;
    locationName: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    timeZone: string;
    taxLocation: string;
    gst?: string;
  }>;

  // HR & Payroll Structure
  payrollStatutoryUnit: string;
  legalEmployer: string;
  legislativeDataGroup: string;
  payFrequency: string;

  // Tanzania Employer Statutory Registration
  traTin: string;
  nssfEmployerNumber: string;
  wcfEmployerNumber: string;
  workingCalendar: {
    standardHours: number;
    fixedStartTime: string;
    fixedEndTime: string;
    breakTime: number; // in minutes
    workingDays: string[];
    publicHolidays: string[];
    scheduleType: 'fixed' | 'shift' | 'flexible';
    enableShifts?: boolean;
    flexRequiredHours: number;
    flexCoreStartTime: string;
    flexCoreEndTime: string;
    flexMinLoginTime: string;
    flexMaxLoginTime: string;
    flexMaxHours?: number;
    shifts: Array<{
      id: string;
      name: string;
      startTime: string;
      endTime: string;
      icon: 'sunrise' | 'sun' | 'moon';
      color: string;
    }>;
  };
}

const initialCompanyData: CompanyData = {
  EntityName: "",
  companyCode: "",
  taxRegistrationNumber: "",
  taxRegistrationNumbers: {
    pan: "",
    tin: "",
    sin: "",
    ein: "",
    siret: "",
    other: "",
  },
  legalAddress: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  },
  jurisdiction: "",
  currency: "USD",
  fiscalYearEnd: "",
  companyType: "",
  logoUrl: "",
  departments: [],
  businessUnits: [],
  divisions: [],
  costCenters: [],
  locations: [],
  payrollStatutoryUnit: "",
  legalEmployer: "",
  legislativeDataGroup: "",
  payFrequency: "Monthly",
  traTin: "",
  nssfEmployerNumber: "",
  wcfEmployerNumber: "",
  workingCalendar: {
    standardHours: 40,
    fixedStartTime: "09:30",
    fixedEndTime: "18:30",
    breakTime: 60,
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    publicHolidays: [],
    scheduleType: 'fixed',
    enableShifts: false,
    flexRequiredHours: 8,
    flexCoreStartTime: "11:00",
    flexCoreEndTime: "16:00",
    flexMinLoginTime: "07:00",
    flexMaxLoginTime: "11:00",
    flexMaxHours: 12,
    shifts: [],
  },
};

export function CompanySettings() {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const [editMode, setEditMode] = useState(() => new URLSearchParams(location.search).get("edit") === "true");

  useEffect(() => {
    const editParam = new URLSearchParams(location.search).get("edit") === "true";
    setEditMode(editParam);
  }, [location.search]);

  const [companyData, setCompanyData] = useState<CompanyData>(initialCompanyData);
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [deptCount, setDeptCount] = useState(0);
  const [roleCount, setRoleCount] = useState(0);
  const [designationCount, setDesignationCount] = useState(0);

  const tabFromUrl = new URLSearchParams(location.search).get("tab") as "legal" | "organizational" | "cost-centers" | "geographical" | "calendar" | null;
  const [activeTab, setActiveTabState] = useState<"legal" | "organizational" | "cost-centers" | "geographical" | "calendar">(tabFromUrl || "legal");
  const setActiveTab = (tab: typeof activeTab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelCompanyConfirm, setShowCancelCompanyConfirm] = useState(false);
  const [orgId, setOrgId] = useState<number | null>(null);
  const { can } = usePermissions();
  const isReadOnly = !can(Permission.EDIT_COMPANY_STRUCTURE);
  const effectiveReadOnly = isReadOnly || !editMode;

  const mapBranchesToLocations = (branches: any[]) =>
    (branches || []).map((branch: any) => ({
      id: (branch.id || Date.now()).toString(),
      locationCode: branch.location_code || branch.branch_code || "",
      locationName: capitalizeFirstLetter(branch.location_name || branch.branch_name || ""),
      address: {
        street: capitalizeFirstLetter(branch.street_address || branch.address || ""),
        city: capitalizeFirstLetter(branch.city || ""),
        state: capitalizeFirstLetter(branch.state || ""),
        zipCode: branch.zip_code || branch.zip || "",
        country: capitalizeFirstLetter(branch.country || ""),
      },
      timeZone: branch.time_zone || "",
      taxLocation: capitalizeFirstLetter(branch.tax_location || ""),
      gst: branch.gst || "",
    }));

  const buildBranchPayload = (locations: any[]) =>
    locations.map(loc => {
      const numId = parseInt(loc.id, 10);
      const hasValidId = !isNaN(numId) && numId > 0 && loc.id.length < 10;
      return {
        ...(hasValidId ? { id: numId } : {}),
        branch_name: capitalizeFirstLetter(loc.locationName),
        branch_code: loc.locationCode,
        address: capitalizeFirstLetter(loc.address.street),
        city: capitalizeFirstLetter(loc.address.city),
        state: capitalizeFirstLetter(loc.address.state),
        zip: loc.address.zipCode,
        country: capitalizeFirstLetter(loc.address.country),
        time_zone: loc.timeZone,
        tax_location: capitalizeFirstLetter(loc.taxLocation),
        gst: loc.gst || "",
      };
    });

  const panStatus = useMemo(() => {
    const pan = (companyData.taxRegistrationNumbers.pan || "").trim().toUpperCase();
    const isIndia = companyData.legalAddress.country === "India";
    if (!isIndia) return { isValid: true, error: "" };
    if (!pan) return { isValid: false, error: "PAN is required" };
    const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
    return { isValid, error: isValid ? "" : "Invalid PAN format (e.g., ABCDE1234F)" };
  }, [companyData.taxRegistrationNumbers.pan, companyData.legalAddress.country]);

  const getTaxKeysForCountry = (countryName: string) => {
    const country = (countryName || "").trim().toLowerCase();
    if (country === "india") {
      return ["pan", "cin", "tan", "other"];
    }
    if (country === "united states" || country === "usa" || country === "us") {
      return ["ein", "other"];
    }
    if (country === "united kingdom" || country === "uk" || country === "gb") {
      return ["tin", "cin", "other"];
    }
    if (country === "germany" || country === "de") {
      return ["tin", "other", "cin"];
    }
    if (country === "france" || country === "fr") {
      return ["siret", "tin", "other"];
    }
    if (country === "united arab emirates" || country === "uae" || country === "ae") {
      return ["tin", "cin", "other"];
    }
    if (country === "canada" || country === "ca") {
      return ["sin", "other"];
    }
    if (country === "australia" || country === "au") {
      return ["tin", "cin", "other"];
    }
    if (country === "singapore" || country === "sg") {
      return ["tin", "other"];
    }
    if (country === "tanzania" || country === "tz") {
      return ["tin", "cin", "paye_reg_no", "nssf_reg_no", "wcf_reg_no", "sdl_reg_no", "other"];
    }
    return ["tin", "other"];
  };

  const completionPercentage = useMemo(() => {
    const checks: { label: string; done: boolean; weight: number }[] = [];
    const filled = (v: string | undefined | null) => typeof v === "string" && v.trim() !== "";

    // 1. Legal Entity & Tax Tab
    checks.push({ label: "Entity Name", done: filled(companyData.EntityName), weight: 2 });
    checks.push({ label: "Company Code", done: filled(companyData.companyCode), weight: 2 });
    checks.push({ label: "Company Type", done: filled(companyData.companyType), weight: 1 });
    checks.push({ label: "Street Address", done: filled(companyData.legalAddress.street), weight: 1 });
    checks.push({ label: "City", done: filled(companyData.legalAddress.city), weight: 1 });
    checks.push({ label: "State", done: filled(companyData.legalAddress.state), weight: 1 });
    checks.push({ label: "Zip Code", done: filled(companyData.legalAddress.zipCode), weight: 1 });
    checks.push({ label: "Country", done: filled(companyData.legalAddress.country), weight: 1 });
    
    // Tax fields based on country
    const taxKeys = getTaxKeysForCountry(companyData.legalAddress.country);
    taxKeys.forEach(key => {
      const isFilled = filled((companyData.taxRegistrationNumbers as any)[key]) || filled((companyData as any)[key]);
      const isMandatory = (companyData.legalAddress.country === "Tanzania" && (key === "tin" || key === "cin")) ||
                          (companyData.legalAddress.country === "India" && key === "pan");
      checks.push({ label: `Tax Field: ${key}`, done: isFilled, weight: isMandatory ? 2 : 1 });
    });

    checks.push({ label: "Jurisdiction", done: filled(companyData.jurisdiction), weight: 1 });
    checks.push({ label: "Fiscal Year End", done: filled(companyData.fiscalYearEnd), weight: 1 });
    checks.push({ label: "Company Logo", done: filled(companyData.logoUrl), weight: 1 });

    // 2. Geographical/Location Tab
    const hasLocations = Array.isArray(companyData.locations) && companyData.locations.length > 0;
    const locationsComplete = hasLocations && companyData.locations.every(loc => 
      filled(loc.locationName) && 
      filled(loc.locationCode) && 
      filled(loc.address?.street) && 
      filled(loc.address?.city) && 
      filled(loc.address?.state) && 
      filled(loc.address?.zipCode) && 
      filled(loc.timeZone) &&
      filled(loc.taxLocation) &&
      filled(loc.gst)
    );
    checks.push({ label: "Office Locations Configured", done: hasLocations, weight: 1 });
    checks.push({ label: "Office Locations Complete", done: locationsComplete, weight: 1 });

    // 3. Cost Centers Tab
    const hasCostCenters = Array.isArray(companyData.costCenters) && companyData.costCenters.length > 0 && companyData.costCenters.every(cc => filled(cc));
    checks.push({ label: "Cost Centers", done: hasCostCenters, weight: 1 });

    // 4. Organizational Structure Tab
    checks.push({ label: "Departments Hierarchy", done: deptCount > 0, weight: 1 });
    checks.push({ label: "Designations Hierarchy", done: designationCount > 0, weight: 1 });
    checks.push({ label: "Roles Hierarchy", done: roleCount > 0, weight: 1 });

    // 5. Working Calendar & Schedule Tab
    const calendar = companyData.workingCalendar;
    checks.push({ label: "Standard Hours", done: !!calendar.standardHours, weight: 1 });
    checks.push({ label: "Working Days Configured", done: Array.isArray(calendar.workingDays) && calendar.workingDays.length > 0, weight: 1 });
    checks.push({ label: "Schedule Type Selected", done: filled(calendar.scheduleType), weight: 1 });
    
    if (calendar.scheduleType === "fixed") {
      checks.push({ label: "Fixed Hours Configured", done: filled(calendar.fixedStartTime) && filled(calendar.fixedEndTime), weight: 2 });
    } else if (calendar.scheduleType === "flexible") {
      checks.push({ label: "Flex Hours Configured", done: !!calendar.flexRequiredHours && filled(calendar.flexCoreStartTime) && filled(calendar.flexCoreEndTime), weight: 2 });
    }

    if (calendar.enableShifts) {
      const shiftsComplete = Array.isArray(calendar.shifts) && calendar.shifts.length > 0 && calendar.shifts.every((s: any) => filled(s.name) && filled(s.startTime) && filled(s.endTime));
      checks.push({ label: "Shifts Configured", done: shiftsComplete, weight: 1 });
    }

    checks.push({ label: "Public Holidays Configured", done: Array.isArray(calendar.publicHolidays) && calendar.publicHolidays.length > 0, weight: 1 });

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const doneWeight = checks.reduce((sum, c) => (c.done ? sum + c.weight : sum), 0);
    return Math.min(100, Math.round((doneWeight / totalWeight) * 100));
  }, [companyData, deptCount, designationCount, roleCount]);

  const loadOrg = async () => {
    setIsLoading(true);
    try {
      const [orgs, depts, roles, desigs] = await Promise.all([
        getOrganizations(),
        getDepartments().catch(() => []),
        getRoles().catch(() => []),
        getDesignations().catch(() => []),
      ]);
      setDeptCount(depts.length);
      setRoleCount(roles.length);
      setDesignationCount(desigs.length);

      const organization = Array.isArray(orgs) ? orgs[0] : orgs;
      if (organization && organization.id) {
        setOrgId(organization.id);
        setCompanyData({
          EntityName: capitalizeFirstLetter(organization.entity_name || ""),
          companyCode: organization.company_code || "",
          taxRegistrationNumber: organization.tax_registration_number || "",
          companyType: organization.company_type || "",
          jurisdiction: organization.jurisdiction || "",
          currency: organization.currency || "USD",
          fiscalYearEnd: organization.fiscal_year_end || "",
          taxRegistrationNumbers: (() => {
            const base = {
              pan: organization.pan || "",
              tin: organization.tin || "",
              sin: organization.sin || "",
              ein: organization.ein || "",
              siret: organization.siret || "",
              other: "",
            };
            try {
              if (organization.other_tax_id && organization.other_tax_id.startsWith("{")) {
                const extra = JSON.parse(organization.other_tax_id);
                return { ...base, ...extra };
              }
            } catch (e) {
              // Keep default fallback
            }
            return { ...base, other: organization.other_tax_id || "" };
          })(),
          legalAddress: {
            street: capitalizeFirstLetter(organization.legal_address || organization.address || ""),
            city: capitalizeFirstLetter(organization.city || ""),
            state: capitalizeFirstLetter(organization.state || ""),
            zipCode: organization.zip || "",
            country: capitalizeFirstLetter(organization.country || ""),
          },
          departments: [],
          businessUnits: organization.business_unit ? organization.business_unit.split(",").map((i: string) => capitalizeFirstLetter(i.trim())) : [],
          divisions: organization.division ? organization.division.split(",").map((i: string) => capitalizeFirstLetter(i.trim())) : [],
          costCenters: organization.cost_center ? organization.cost_center.split(",").map((i: string) => capitalizeFirstLetter(i.trim())) : [],
          locations: mapBranchesToLocations(organization.branches || organization.branch || []),
          payrollStatutoryUnit: capitalizeFirstLetter(organization.payroll_statutory_unit || ""),
          legalEmployer: capitalizeFirstLetter(organization.legal_employer || ""),
          legislativeDataGroup: capitalizeFirstLetter(organization.legislative_data_group || ""),
          payFrequency: organization.pay_frequency || "Monthly",
          traTin: organization.tra_tin || "",
          nssfEmployerNumber: organization.nssf_employer_number || "",
          wcfEmployerNumber: organization.wcf_employer_number || "",
          workingCalendar: {
            standardHours: organization.standard_working_hours_per_week || 40,
            fixedStartTime: organization.fixed_start_time || "09:30",
            fixedEndTime: organization.fixed_end_time || "18:30",
            breakTime: organization.fixed_break_time || 60,
            workingDays: organization.working_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            publicHolidays: organization.public_holidays || [],
            scheduleType: organization.schedule_type || 'fixed',
            enableShifts: typeof organization.enable_shifts === 'boolean'
              ? organization.enable_shifts
              : typeof organization.working_calendar?.enableShifts === 'boolean'
                ? organization.working_calendar.enableShifts
                : false,
            flexRequiredHours: organization.flex_required_hours || 8,
            flexCoreStartTime: organization.flex_core_start_time || "11:00",
            flexCoreEndTime: organization.flex_core_end_time || "16:00",
            flexMinLoginTime: organization.flex_min_login_time || "07:00",
            flexMaxLoginTime: organization.flex_max_login_time || "11:00",
            flexMaxHours: organization.flex_max_hours || 12,
            shifts: organization.shifts || [],
          },
          logoUrl: organization.logo_url || "",
        });
      }
    } catch (error) {
      console.error("Failed to load organization", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (window as any).temp_company_logo = undefined;
    window.dispatchEvent(new Event('company-logo-updated'));
    loadOrg();
  }, []);

  const handleCancel = () => {
    (window as any).temp_company_logo = undefined;
    window.dispatchEvent(new Event('company-logo-updated'));
    setErrors({});
    loadOrg();
    setEditMode(false);
    navigate("/org-setup");
  };

  const handleSave = async (shouldNavigate: boolean = true) => {
    setErrors({});
    let hasError = false;
    const newErrors: any = {};

    // Validate legal tab required fields
    if (!companyData.EntityName?.trim()) {
      newErrors.EntityName = "Legal entity name is required";
      hasError = true;
    }
    if (!companyData.companyCode?.trim()) {
      newErrors.companyCode = "Company code is required";
      hasError = true;
    }
    if (!companyData.legalAddress?.country?.trim()) {
      newErrors.country = "Country of incorporation is required";
      hasError = true;
    }
    if (!companyData.companyType?.trim()) {
      newErrors.companyType = "Company type is required";
      hasError = true;
    }
    if (!companyData.legalAddress?.street?.trim()) {
      newErrors.street = "Street address is required";
      hasError = true;
    }
    if (!companyData.legalAddress?.state?.trim()) {
      newErrors.state = "State/province is required";
      hasError = true;
    }
    if (!companyData.legalAddress?.city?.trim()) {
      newErrors.city = "City is required";
      hasError = true;
    }
    if (!companyData.legalAddress?.zipCode?.trim()) {
      newErrors.zipCode = "Zip/postal code is required";
      hasError = true;
    }

    // Country specific validation
    const ctry = (companyData.legalAddress?.country || "").trim().toLowerCase();
    const type = (companyData.companyType || "").trim().toLowerCase();

    if (ctry === "india") {
      const pan = (companyData.taxRegistrationNumbers?.pan || "").trim().toUpperCase();
      if (!pan) {
        newErrors.pan = "PAN is required";
        hasError = true;
      } else if (!panStatus.isValid) {
        newErrors.pan = panStatus.error;
        hasError = true;
      }
      if (type.includes("private limited") || type.includes("public limited") || type.includes("opc") || type.includes("one person") || type.includes("llp") || type.includes("limited liability partnership")) {
        if (!(companyData.taxRegistrationNumbers?.cin || "").trim()) {
          newErrors.cin = "CIN/LLPIN is required";
          hasError = true;
        }
      }
    } else if (ctry === "united states" || ctry === "usa" || ctry === "us") {
      if (!(companyData.taxRegistrationNumbers?.ein || "").trim()) {
        newErrors.ein = "EIN is required";
        hasError = true;
      }
    } else if (ctry === "united kingdom" || ctry === "uk" || ctry === "gb") {
      if (!(companyData.taxRegistrationNumbers?.tin || "").trim()) {
        newErrors.tin = "UTR (Tax Reference) is required";
        hasError = true;
      }
      if (type.includes("ltd") || type.includes("plc") || type.includes("limited") || type.includes("llp")) {
        if (!(companyData.taxRegistrationNumbers?.cin || "").trim()) {
          newErrors.cin = "Registration Number (CRN) is required";
          hasError = true;
        }
      }
    } else if (ctry === "germany" || ctry === "de") {
      if (!(companyData.taxRegistrationNumbers?.tin || "").trim()) {
        newErrors.tin = "Steuernummer is required";
        hasError = true;
      }
    } else if (ctry === "france" || ctry === "fr") {
      if (!(companyData.taxRegistrationNumbers?.siret || "").trim()) {
        newErrors.siret = "SIRET is required";
        hasError = true;
      }
      if (!(companyData.taxRegistrationNumbers?.tin || "").trim()) {
        newErrors.tin = "SIREN is required";
        hasError = true;
      }
    } else if (ctry === "united arab emirates" || ctry === "uae" || ctry === "ae") {
      if (!(companyData.taxRegistrationNumbers?.tin || "").trim()) {
        newErrors.tin = "TRN is required";
        hasError = true;
      }
    } else if (ctry === "canada" || ctry === "ca") {
      if (!(companyData.taxRegistrationNumbers?.sin || "").trim()) {
        newErrors.sin = "Business Number is required";
        hasError = true;
      }
    } else if (ctry === "australia" || ctry === "au") {
      if (!(companyData.taxRegistrationNumbers?.tin || "").trim()) {
        newErrors.tin = "ABN is required";
        hasError = true;
      }
    } else if (ctry === "singapore" || ctry === "sg") {
      if (!(companyData.taxRegistrationNumbers?.tin || "").trim()) {
        newErrors.tin = "UEN is required";
        hasError = true;
      }
    } else if (ctry === "tanzania" || ctry === "tz") {
      if (!(companyData.taxRegistrationNumbers?.tin || "").trim()) {
        newErrors.tin = "TIN is required";
        hasError = true;
      }
      if (!(companyData.taxRegistrationNumbers?.cin || "").trim()) {
        newErrors.cin = "BRELA (Business Registration No.) is required";
        hasError = true;
      }
    } else {
      if (!(companyData.taxRegistrationNumbers?.tin || companyData.taxRegistrationNumber || "").trim()) {
        newErrors.tin = "Tax ID is required";
        hasError = true;
      }
    }

    // Validate geographical locations
    const locationErrors: Record<string, any> = {};
    let hasLocationError = false;
    companyData.locations.forEach((loc) => {
      const locErr: any = {};
      if (!loc.locationName?.trim()) {
        locErr.locationName = "Location name is required";
        hasLocationError = true;
      }
      if (!loc.locationCode?.trim()) {
        locErr.locationCode = "Location code is required";
        hasLocationError = true;
      }
      if (!loc.address?.street?.trim()) {
        locErr.street = "Street address is required";
        hasLocationError = true;
      }
      if (!loc.address?.city?.trim()) {
        locErr.city = "City is required";
        hasLocationError = true;
      }
      if (!loc.address?.state?.trim()) {
        locErr.state = "State/province is required";
        hasLocationError = true;
      }
      if (!loc.address?.zipCode?.trim()) {
        locErr.zipCode = "Zip/postal code is required";
        hasLocationError = true;
      }
      if (!loc.address?.country?.trim()) {
        locErr.country = "Country is required";
        hasLocationError = true;
      }
      if (!loc.timeZone?.trim()) {
        locErr.timeZone = "Time zone is required";
        hasLocationError = true;
      }
      if (!loc.taxLocation?.trim()) {
        locErr.taxLocation = "Tax location is required";
        hasLocationError = true;
      }

      if (Object.keys(locErr).length > 0) {
        locationErrors[loc.id] = locErr;
      }
    });

    if (hasLocationError) {
      newErrors.locations = locationErrors;
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      if (hasLocationError) {
        toast.error("Validation failed", { description: "Please fill in all required fields for office locations." });
        setActiveTab("geographical");
      } else {
        toast.error("Required fields missing", { description: "Please fill in all required fields." });
        setActiveTab("legal");
      }
      return false;
    }
    setIsSaving(true);
    const normalizedTaxNumbers = {
      ...companyData.taxRegistrationNumbers,
      pan: (companyData.taxRegistrationNumbers.pan || "").trim().toUpperCase(),
      ein: (companyData.taxRegistrationNumbers.ein || "").trim().toUpperCase(),
      siret: (companyData.taxRegistrationNumbers.siret || "").trim(),
      tin: (companyData.taxRegistrationNumbers.tin || "").trim().toUpperCase(),
    };

    // Dynamically serialize extra fields into other_tax_id to support unlimited country tax inputs
    const extraFields: Record<string, string> = {};
    Object.keys(companyData.taxRegistrationNumbers).forEach(key => {
      if (!["pan", "tin", "sin", "ein", "siret"].includes(key)) {
        extraFields[key] = (companyData.taxRegistrationNumbers[key] || "").trim();
      }
    });

    let otherTaxId = "";
    if (Object.keys(extraFields).length === 1 && extraFields.other !== undefined) {
      otherTaxId = extraFields.other;
    } else if (Object.keys(extraFields).length > 0) {
      otherTaxId = JSON.stringify(extraFields);
    }

    const apiPayload = {
      entity_name: capitalizeFirstLetter(companyData.EntityName),
      company_code: companyData.companyCode,
      company_type: companyData.companyType,
      jurisdiction: companyData.jurisdiction,
      currency: companyData.currency,
      fiscal_year_end: companyData.fiscalYearEnd,
      pan: normalizedTaxNumbers.pan || "",
      tin: normalizedTaxNumbers.tin || "",
      sin: (companyData.taxRegistrationNumbers.sin || "").trim(),
      ein: normalizedTaxNumbers.ein || "",
      siret: normalizedTaxNumbers.siret || "",
      other_tax_id: otherTaxId,
      address: capitalizeFirstLetter(companyData.legalAddress.street),
      city: capitalizeFirstLetter(companyData.legalAddress.city),
      state: capitalizeFirstLetter(companyData.legalAddress.state),
      country: capitalizeFirstLetter(companyData.legalAddress.country),
      zip: companyData.legalAddress.zipCode,
      business_unit: (companyData.businessUnits || []).filter(v => v && v.trim()).map(v => capitalizeFirstLetter(v.trim())).join(", "),
      cost_center: (companyData.costCenters || []).filter(v => v && v.trim()).map(v => capitalizeFirstLetter(v.trim())).join(", "),
      payroll_statutory_unit: capitalizeFirstLetter(companyData.payrollStatutoryUnit),
      legal_employer: capitalizeFirstLetter(companyData.legalEmployer),
      legislative_data_group: capitalizeFirstLetter(companyData.legislativeDataGroup),
      pay_frequency: companyData.payFrequency,
      tra_tin: companyData.traTin.trim(),
      nssf_employer_number: companyData.nssfEmployerNumber.trim(),
      wcf_employer_number: companyData.wcfEmployerNumber.trim(),
      standard_working_hours_per_week: companyData.workingCalendar.standardHours,
      fixed_start_time: companyData.workingCalendar.fixedStartTime,
      fixed_end_time: companyData.workingCalendar.fixedEndTime,
      fixed_break_time: companyData.workingCalendar.breakTime,
      working_days: companyData.workingCalendar.workingDays,
      public_holidays: companyData.workingCalendar.publicHolidays.filter(v => v.trim()),
      schedule_type: companyData.workingCalendar.scheduleType,
      enable_shifts: !!companyData.workingCalendar.enableShifts,
      flex_required_hours: companyData.workingCalendar.flexRequiredHours,
      flex_core_start_time: companyData.workingCalendar.flexCoreStartTime,
      flex_core_end_time: companyData.workingCalendar.flexCoreEndTime,
      flex_min_login_time: companyData.workingCalendar.flexMinLoginTime,
      flex_max_login_time: companyData.workingCalendar.flexMaxLoginTime,
      flex_max_hours: companyData.workingCalendar.flexMaxHours,
      shifts: companyData.workingCalendar.enableShifts ? companyData.workingCalendar.shifts : [],
      logo_url: companyData.logoUrl,
      branch: buildBranchPayload(companyData.locations),
    };
    try {
      const savedOrg = orgId ? await updateOrganization(orgId, apiPayload) : await createOrganization(apiPayload);
      if (!orgId) setOrgId(savedOrg.id);
      if (savedOrg?.branches) {
        setCompanyData(prev => ({ ...prev, locations: mapBranchesToLocations(savedOrg.branches || []) }));
      }
      (window as any).temp_company_logo = undefined;
      if (savedOrg?.logo_url) {
        localStorage.setItem('cached_company_logo', savedOrg.logo_url);
      } else {
        localStorage.removeItem('cached_company_logo');
      }
      if (savedOrg?.entity_name) {
        localStorage.setItem('cached_company_name', savedOrg.entity_name);
      }
      window.dispatchEvent(new Event('company-logo-updated'));
      window.dispatchEvent(new CustomEvent('org-country-changed', { detail: { country: savedOrg.country } }));
      if (shouldNavigate) {
        toast.success("Company settings saved!", { description: "Your organization setup has been updated." });
        setTimeout(() => navigate("/org-setup"), 500);
      } else {
        toast.success("Company settings saved successfully!");
      }
      return true;
    } catch (error: any) {
      toast.error("Failed to save to database", { description: error.message || "An unexpected error occurred" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (section: keyof CompanyData, field: string, value: any) => {
    setCompanyData(prev => ({
      ...prev,
      [section]: typeof prev[section] === "object" && !Array.isArray(prev[section])
        ? { ...(prev[section] as any), [field]: value }
        : value,
    }));
  };

  const addLocation = () => {
    const newLocation = {
      id: Date.now().toString(),
      locationCode: "",
      locationName: "",
      address: { street: "", city: "", state: "", zipCode: "", country: "" },
      timeZone: "",
      taxLocation: "",
      gst: "",
    };
    setCompanyData(prev => ({ ...prev, locations: [newLocation, ...prev.locations] }));
  };

  const updateLocation = (id: string, field: string, value: any) => {
    const targetId = String(id);
    setCompanyData(prev => ({
      ...prev,
      locations: prev.locations.map(loc => String(loc.id) === targetId ? { ...loc, [field]: value } : loc),
    }));
  };

  const saveLocation = async (id: string) => {
    const loc = companyData.locations.find(l => String(l.id) === String(id));
    if (!loc) return;
    if (!loc.locationName || !loc.locationCode) {
      toast.error("Validation failed", { description: "Please provide both a Location Name and Code before saving." });
      document.getElementById(`location-name-${id}`)?.focus();
      return;
    }
    await handleSave(false);
    toast.success("Location updated successfully!");
  };

  const removeLocation = (id: string) => {
    const targetId = String(id);
    setCompanyData(prev => ({ ...prev, locations: prev.locations.filter(loc => String(loc.id) !== targetId) }));
  };

  const tabs = [
    { id: "legal", label: "Legal Entity & Tax", icon: Building2 },
    { id: "geographical", label: "Geographical/Location", icon: MapPin },
    { id: "cost-centers", label: "Cost Centres", icon: DollarSign },
    { id: "organizational", label: "Organizational Structure", icon: Briefcase },
    { id: "calendar", label: "Working Calendar & Schedule", icon: Calendar },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/org-setup")} className="p-1.5 hover:bg-primary/10/50 rounded-lg transition-all group">
            <ArrowLeft className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </button>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground truncate">Org Setup Settings</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isLoading && <ProgressBar percentage={completionPercentage} />}

          {!isReadOnly && (
            editMode ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 font-bold px-5 text-gray-600 hover:text-foreground shadow-sm border-border"
                  onClick={() => setShowCancelCompanyConfirm(true)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const success = await handleSave(false);
                    if (success) {
                      setEditMode(false);
                    }
                  }}
                  disabled={isSaving}
                  className="h-10 gap-2 bg-primary hover:bg-primary/95 min-w-[100px] font-bold shadow-sm border-none"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setEditMode(true);
                  const params = new URLSearchParams(window.location.search);
                  params.set("edit", "true");
                  navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                }}
                className="h-10 gap-2 bg-primary hover:bg-primary/95 min-w-[100px] font-bold shadow-sm border-none"
              >
                <Edit className="w-4 h-4" />
                Edit Settings
              </Button>
            )
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto custom-scrollbar">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-[14px] leading-5 font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] py-4 overflow-hidden">
        <CompanyStructureForm
          companyData={companyData}
          setCompanyData={setCompanyData}
          updateField={updateField}
          activeTab={activeTab}
          isReadOnly={effectiveReadOnly}
          addLocation={addLocation}
          updateLocation={updateLocation}
          removeLocation={removeLocation}
          saveLocation={saveLocation}
          isSaving={isSaving}
          panError={panStatus.error}
          handleSave={handleSave}
          handleCancel={handleCancel}
          editMode={editMode}
          setEditMode={setEditMode}
          orgId={orgId}
          errors={errors}
          setErrors={setErrors}
        />
      </div>

      <ConfirmDialog
        open={showCancelCompanyConfirm}
        title="Discard Unsaved Company Settings?"
        message="Are you sure you want to cancel? Any unsaved modifications across your organization setup tabs will be discarded."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelCompanyConfirm(false);
          handleCancel();
        }}
        onCancel={() => setShowCancelCompanyConfirm(false)}
      />
    </div>
  );
}

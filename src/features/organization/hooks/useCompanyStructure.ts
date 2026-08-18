import { useState, useEffect, useCallback } from "react";
import { getDepartments } from '@/features/organization/services/departments';
import { getOrganizations, type Organization } from '@/features/organization/services/organizations';
import { toast } from "sonner";

export interface TeamNode {
  id: string | number;
  name: string;
  description?: string;
  lead: string;
  members: any[]; // Changed to array to hold member objects
  avatars: string[];
  team_employee_count: number;
}

export interface DepartmentNode {
  id: string | number;
  name: string;
  manager: string;
  managerAvatar?: string | null;
  headcount: number;
  avatars?: string[];
  teams: TeamNode[];
  sub_departments?: DepartmentNode[];
  branch_id?: number | string;
  branch_ids?: (number | string)[];
  expanded?: boolean;
  designations?: Array<{ name: string; code: string; count: number }>;
}

export interface MappedOrganization {
  id: number;
  logoUrl?: string;
  EntityName: string | undefined;
  companyCode: string;
  companyType?: string;
  currency?: string;
  payFrequency?: string;
  jurisdiction?: string;
  fiscalYearEnd?: string;
  legalAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  pan?: string;
  tin?: string;
  ein?: string;
  siret?: string;
  otherTaxId?: string;
  businessUnit?: string;
  costCenter?: string;
  payrollStatutoryUnit?: string;
  legalEmployer?: string;
  legislativeDataGroup?: string;
  workingCalendar?: {
    standardHours: number;
    workingDays: string[];
    scheduleType: string;
    fixedStartTime: string;
    fixedEndTime: string;
    flexRequiredHours: number;
    flexCoreStartTime: string;
    flexCoreEndTime: string;
  };
  locations: {
    id: number;
    locationName?: string;
    locationCode?: string;
    timeZone?: string;
    branch_employee_count?: number;
    address: { city: string; country: string; street?: string; state?: string; zipCode?: string };
    departments: DepartmentNode[];
  }[];
}

function mapDepartments(deptData: any[]): DepartmentNode[] {
  return deptData.map(d => ({
    id: d.id,
    name: d.department_name,
    manager: d.manager?.full_name ?? d.manager?.username ?? (d.manager_id ? `Manager #${d.manager_id}` : "Unassigned"),
    managerAvatar: d.manager?.profile_picture ?? null,
    headcount: d.department_employee_count ?? 0,
    avatars: (d.userDetails || [])
      .map((ud: any) => ud.profile_picture || (ud.first_name?.[0] || ud.user?.username?.[0] || "?").toUpperCase())
      .filter(Boolean)
      .slice(0, 3),
    teams: (d.teams ?? []).map((t: any) => ({
      id: t.id,
      name: t.team_name ?? t.name,
      description: t.description,
      lead: t.team_lead?.username ?? t.team_lead ?? t.lead ?? "Unassigned",
      members: Array.isArray(t.members) ? t.members : (Array.isArray(t.team_members) ? t.team_members : []),
      avatars: (t.members || t.team_members || [])
        .map((m: any) => m.profile_picture || (m.first_name?.[0] || m.username?.[0] || "?").toUpperCase())
        .filter(Boolean)
        .slice(0, 3) || (t.avatars ?? []),
      team_employee_count: t.team_employee_count ?? (Array.isArray(t.members) ? t.members.length : (Array.isArray(t.team_members) ? t.team_members.length : 0)),
    })),
    sub_departments: d.sub_departments ? mapDepartments(d.sub_departments) : [],
    branch_id: d.branch_id,
    branch_ids: d.branch_ids,
    expanded: false,
  }));
}

function mapOrganization(org: Organization): MappedOrganization {
  return {
    id: org.id,
    logoUrl: org.logo_url,
    EntityName: org.entity_name,
    companyCode: org.company_code,
    companyType: org.company_type,
    currency: org.currency,
    payFrequency: org.pay_frequency,
    jurisdiction: org.jurisdiction,
    fiscalYearEnd: org.fiscal_year_end,
    legalAddress: org.address,
    city: org.city,
    state: org.state,
    country: org.country,
    zip: org.zip,
    pan: org.pan,
    tin: org.tin,
    ein: org.ein,
    siret: org.siret,
    otherTaxId: org.other_tax_id,
    taxRegistrationNumbers: (() => {
      const base = {
        pan: org.pan || "",
        tin: org.tin || "",
        sin: org.sin || "",
        ein: org.ein || "",
        siret: org.siret || "",
        other: "",
      };
      try {
        if (org.other_tax_id && org.other_tax_id.startsWith("{")) {
          const extra = JSON.parse(org.other_tax_id);
          return { ...base, ...extra };
        }
      } catch (e) {
        // Keep default fallback
      }
      return { ...base, other: org.other_tax_id || "" };
    })(),
    businessUnit: org.business_unit,
    costCenter: org.cost_center,
    payrollStatutoryUnit: org.payroll_statutory_unit,
    legalEmployer: org.legal_employer,
    legislativeDataGroup: org.legislative_data_group,
    workingCalendar: {
      standardHours: org.standard_working_hours_per_week || 40,
      workingDays: org.working_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      scheduleType: org.schedule_type || "fixed",
      fixedStartTime: org.fixed_start_time || "09:30",
      fixedEndTime: org.fixed_end_time || "18:30",
      flexRequiredHours: org.flex_required_hours || 8,
      flexCoreStartTime: org.flex_core_start_time || "11:00",
      flexCoreEndTime: org.flex_core_end_time || "16:00",
      enableShifts: org.enable_shifts || false,
      shifts: org.shifts || [],
      publicHolidays: org.public_holidays || [],
    } as any,
    locations: (org.branches ?? org.branch ?? []).map((b: any) => ({
      id: b.id,
      locationName: b.location_name ?? b.branch_name,
      locationCode: b.location_code ?? b.branch_code,
      timeZone: b.time_zone || b.timeZone,
      taxLocation: b.tax_location || "",
      gst: b.gst || "",
      branch_employee_count: b.branch_employee_count,
      address: {
        city: b.city,
        country: b.country,
        street: b.street_address ?? b.address,
        state: b.state,
        zipCode: b.zip_code ?? b.zip,
      },
      departments: b.departments ? mapDepartments(b.departments) : [],
    })),
  };
}

export function useCompanyStructure() {
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentNode | null>(null);
  const [companyDetails, setCompanyDetails] = useState<MappedOrganization | null>(null);
  const [companyName, setCompanyName] = useState("My Company");
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupView, setIsSetupView] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Record<string | number, boolean>>({});
  const [hoveredNode, setHoveredNode] = useState<{ type: string; id: string | number } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use individual try-catches within Promise.all to handle partial failures (like 403 Forbidden)
      const [deptData, orgs] = await Promise.all([
        getDepartments().catch(err => {
          console.warn("[CompanyStructure] Departments forbidden or failed:", err);
          return [];
        }),
        getOrganizations().catch(err => {
          console.warn("[CompanyStructure] Organizations forbidden or failed:", err);
          return [];
        }),
      ]);

      // Organization
      const org = Array.isArray(orgs) ? orgs[0] : orgs;
      let syncDepts: DepartmentNode[] = [];

      if (org?.id) {
        const mapped = mapOrganization(org);
        setCompanyDetails(mapped);
        setCompanyName(org.entity_name ?? "My Company");
        
        // Expand all branches/locations by default
        const initialExpanded: Record<string | number, boolean> = {};
        mapped.locations.forEach(loc => {
          initialExpanded[loc.id] = true;
        });
        setExpandedBranches(initialExpanded);
        
        // Sync Headcount Analytics with the specific departments in the Org Hierarchy
        syncDepts = mapped.locations.flatMap(loc => loc.departments);
        
        const storageMapped = { ...mapped };
        delete storageMapped.logoUrl;
        localStorage.setItem("companyData", JSON.stringify(storageMapped));
        setIsSetupView(false);
      } else {
        setCompanyDetails(null);
        setIsSetupView(true);
        // Fallback to flat departments if no organization is defined
        syncDepts = mapDepartments(deptData);
      }

      setDepartments(syncDepts);
      if (syncDepts.length > 0) {
        setSelectedDept(syncDepts[0]);
      }

      // Use the unique total_employees from the organization API response
      setTotalEmployees(org?.total_employees ?? 0);
    } catch (err) {
      console.error("[CompanyStructure] Critical fetch error:", err);
      toast.error("An error occurred while loading data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDepartment = useCallback((deptId: string | number) => {
    const toggleInList = (list: DepartmentNode[]): DepartmentNode[] => {
      return list.map(d => {
        if (String(d.id) === String(deptId)) return { ...d, expanded: !d.expanded };
        if (d.sub_departments && d.sub_departments.length > 0) {
          return { ...d, sub_departments: toggleInList(d.sub_departments) };
        }
        return d;
      });
    };

    setDepartments(prev => toggleInList(prev));
    setCompanyDetails(prev => {
      if (!prev) return null;
      return {
        ...prev,
        locations: prev.locations.map(loc => ({
          ...loc,
          departments: toggleInList(loc.departments),
        })),
      };
    });
  }, []);

  const toggleBranch = useCallback((branchId: string | number) => {
    setExpandedBranches(prev => ({ ...prev, [branchId]: !prev[branchId] }));
  }, []);

  return {
    departments,
    setDepartments,
    selectedDept,
    setSelectedDept,
    companyDetails,
    companyName,
    totalEmployees,
    isLoading,
    isSetupView,
    setIsSetupView,
    expandedBranches,
    hoveredNode,
    setHoveredNode,
    toggleDepartment,
    toggleBranch,
    refetch: fetchData,
  };
}

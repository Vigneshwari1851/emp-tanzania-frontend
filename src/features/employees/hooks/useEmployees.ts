import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getEmployees, deleteEmployee, type Employee } from '@/features/employees/services/employees';
import { toast } from "sonner";

interface Filters {
  department: string[];
  role: string[];
  location: string[];
  status: string[];
}

const DEFAULT_FILTERS: Filters = {
  department: [],
  role: [],
  location: [],
  status: [],
};

const DEFAULT_PAGE_SIZE = 10;

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // ──────────────────────────────────────────────
  // Search & Filter
  // ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // ──────────────────────────────────────────────
  // Selection
  // ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ──────────────────────────────────────────────
  // Pagination
  // ──────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // ──────────────────────────────────────────────
  // Hover (for row actions)
  // ──────────────────────────────────────────────
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // ──────────────────────────────────────────────
  // Filter Dropdown state
  // ──────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────────
  // Data fetching
  // ──────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all employees to allow for instant client-side filtering
      const data = await getEmployees({ limit: 1000 });
      setEmployees(data ?? []);
    } catch {
      toast.error("Failed to load employees. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove filters/searchTerm dependencies to avoid unnecessary re-fetching

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ──────────────────────────────────────────────
  // Click-outside handler for filter dropdown
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!showFilters) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  // ──────────────────────────────────────────────
  // Filter Options (Dynamic)
  // ──────────────────────────────────────────────
  const [dynOptions, setDynOptions] = useState<{ 
    departments: string[], 
    roles: string[],
    locations: string[]
  }>({
    departments: [],
    roles: [],
    locations: []
  });

  const fetchOptions = useCallback(async () => {
    try {
      const { getDepartments } = await import('@/features/organization/services/departments');
      const { getRoles } = await import('@/features/rbac/services/roles');
      const { getOrganizations } = await import('@/features/organization/services/organizations');

      const [deps, roles, orgs] = await Promise.all([
        getDepartments(),
        getRoles(),
        getOrganizations()
      ]);

      // Extract unique branch/location names
      const locations = new Set<string>();
      if (Array.isArray(orgs)) {
        orgs.forEach(org => {
          const branches = org.branches || org.branch || [];
          if (Array.isArray(branches)) {
            branches.forEach((b: any) => {
              if (b.branch_name) locations.add(b.branch_name);
              if (b.location_name) locations.add(b.location_name);
            });
          }
          if (org.city) locations.add(org.city);
          if (org.country) locations.add(org.country);
        });
      }

      setDynOptions({
        departments: Array.isArray(deps) ? deps.map(d => d.department_name) : [],
        roles: Array.isArray(roles) 
          ? roles
              .map(r => r.name)
              .filter(name => name.toUpperCase() !== 'SUPER_ADMIN' && name.toLowerCase() !== 'super admin') 
          : [],
        locations: Array.from(locations).filter(Boolean) as string[]
      });
    } catch (error) {
      console.error("Failed to fetch filter options", error);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const filterOptions = useMemo(() => {
    return {
      departments: dynOptions.departments,
      roles: dynOptions.roles,
      locations: dynOptions.locations.length > 0 ? dynOptions.locations : ["Remote"],
      statuses: ["Active", "Inactive", "Draft", "On Leave"],
    };
  }, [dynOptions]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((val) => val.length > 0),
    [filters],
  );

  // ──────────────────────────────────────────────
  // Filtered & paginated results
  // ──────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];

    return employees.filter((emp) => {
      // 1. Normalize Search Term
      const searchStr = searchTerm.toLowerCase().trim();
      
      // 2. Normalize Employee Data for Comparison
      const firstName = (emp.details?.first_name ?? "").toLowerCase();
      const lastName = (emp.details?.last_name ?? "").toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const empEmail = (emp.email ?? "").toLowerCase();
      const empDept = (emp.details?.department?.department_name ?? "").toLowerCase();
      const empRole = (emp.details?.role?.name || emp.details?.role?.role_name || emp.details?.job_role || "Associate").toLowerCase();
      const empLoc = (emp.details?.work_location || "Remote").toLowerCase();
      const empStatus = (emp.details?.is_draft ? "Draft" : emp.status ? "Active" : "Inactive").toLowerCase();

      // 0. Exclude Super Admin from the list
      if (empRole === 'super_admin' || empRole === 'super admin') return false;

      // 3. Search Filter (matches name, email, or department) - Always a prerequisite
      const isSearchActive = searchStr.length > 0;
      const matchesSearch = !isSearchActive || 
                          fullName.includes(searchStr) || 
                          empEmail.includes(searchStr) || 
                          empDept.includes(searchStr);
      
      if (!matchesSearch) return false;

      // 4. Normalize Active Filters
      const filterDepts = filters.department.map(v => v.toLowerCase().trim());
      const filterRoles = filters.role.map(v => v.toLowerCase().trim());
      const filterLocs = filters.location.map(v => v.toLowerCase().trim());
      const filterStatuses = filters.status.map(v => v.toLowerCase().trim());

      const hasDeptFilter = filterDepts.length > 0;
      const hasRoleFilter = filterRoles.length > 0;
      const hasLocFilter = filterLocs.length > 0;
      const hasStatusFilter = filterStatuses.length > 0;

      // 5. AND-based Category Filtering (OR within categories)
      // Employee must match ALL categories that have at least one selection
      const matchesDept = !hasDeptFilter || filterDepts.includes(empDept);
      const matchesRole = !hasRoleFilter || filterRoles.includes(empRole);
      const matchesLoc = !hasLocFilter || filterLocs.includes(empLoc);
      
      // For status, handle multiple possible matches (e.g. "Active" vs specific states)
      const matchesStatus = !hasStatusFilter || filterStatuses.includes(empStatus);

      return matchesDept && matchesRole && matchesLoc && matchesStatus;
    });
  }, [employees, searchTerm, filters]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

  const paginatedEmployees = useMemo(
    () =>
      filteredEmployees.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [filteredEmployees, currentPage, pageSize],
  );

  const paginationInfo = {
    total: filteredEmployees.length,
    start: filteredEmployees.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
    end: Math.min(currentPage * pageSize, filteredEmployees.length),
    currentPage,
    totalPages,
    pageSize,
  };

  // Reset to first page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // ──────────────────────────────────────────────
  // Pagination helpers
  // ──────────────────────────────────────────────
  const getPageNumbers = useCallback((): (number | "...")[] => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  }, [currentPage, totalPages]);

  // ──────────────────────────────────────────────
  // Selection
  // ──────────────────────────────────────────────
  const isAllSelected =
    filteredEmployees.length > 0 &&
    selectedIds.size === filteredEmployees.length;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === filteredEmployees.length
        ? new Set()
        : new Set(filteredEmployees.map((e) => e.id)),
    );
  }, [filteredEmployees]);

  const toggleSelectEmployee = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleFilter = useCallback((type: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value],
    }));
  }, []);

  // ──────────────────────────────────────────────
  // Clear Actions
  // ──────────────────────────────────────────────
  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  // ──────────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: number) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this employee? This action cannot be undone.",
        )
      )
        return;

      setIsDeleting(true);
      try {
        await deleteEmployee(id);
        toast.success("Employee deleted successfully");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await fetchEmployees();
      } catch {
        toast.error("Failed to delete employee. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    },
    [fetchEmployees],
  );

  return {
    // Data
    employees,
    paginatedEmployees,
    filteredEmployees,
    isLoading,
    isDeleting,
    refetch: fetchEmployees,

    // Search & Filter
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    toggleFilter,
    clearFilters,
    filterOptions,
    hasActiveFilters,
    showFilters,
    setShowFilters,
    filterRef,

    // Selection
    selectedIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelectEmployee,
    clearSelection,

    // Pagination
    paginationInfo,
    getPageNumbers,
    setCurrentPage,
    setPageSize,

    // Hover
    hoveredId,
    setHoveredId,

    // Actions
    handleDelete,
  };
}

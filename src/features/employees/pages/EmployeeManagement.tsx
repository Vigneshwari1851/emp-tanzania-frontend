import { useState, useEffect } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useAuth } from '@/shared/context/AuthContext';
import { capitalizeFirstLetter, formatDisplayRole } from '@/shared/utils/stringUtils';
import axiosInstance from '@/shared/services/axiosInstance';
import {
  Search,
  Download,
  Upload,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Network,
  Building2
} from "lucide-react";
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { RoleGate } from '@/features/auth/components/RoleGate';
import { Permission } from '@/shared/types/rbac';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { EmployeeBulkUploadModal } from '@/features/employees/components/EmployeeBulkUploadModal';
import { DepartmentHierarchyView } from '@/features/organization/components/DepartmentHierarchyView';
import { DesignationSettingsForm } from '@/features/organization/components/DesignationSettingsForm';
import { AddEmployee } from './AddEmployee';
import Select from "@/shared/components/ui/Select";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────────────────────
// Employee Management Page
// ─────────────────────────────────────────────────────────────────────────────
export function EmployeeManagement() {
  const navigate = useOrgNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'HR';
  const userRoles: string[] = Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r).toUpperCase()) : [];
  const normalizedRole = (user?.role || '').toString().toUpperCase();
  const isManagerRole = [normalizedRole, ...userRoles].some(r =>
    ['MANAGER', 'TEAM MANAGER', 'TEAM_MANAGER'].includes(r)
  );
  const showDirectoryByDefault = isAdmin || isManagerRole;
  const isSelfView = localStorage.getItem('sidebar_view_mode') === 'self';
  const [viewMode, setViewMode] = useState<'directory' | 'canvas'>(isSelfView ? 'canvas' : (showDirectoryByDefault ? 'directory' : 'canvas'));
  const [canvasSubTab, setCanvasSubTab] = useState<'department' | 'designation'>('department');
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'department' | 'role' | 'location' | 'status'>('department');

  // Sync viewMode if sidebar view mode switches while mounted
  useEffect(() => {
    const handleSyncView = () => {
      const selfView = localStorage.getItem('sidebar_view_mode') === 'self';
      setViewMode(selfView ? 'canvas' : (showDirectoryByDefault ? 'directory' : 'canvas'));
    };
    window.addEventListener('sidebar-view-mode-changed', handleSyncView);
    return () => window.removeEventListener('sidebar-view-mode-changed', handleSyncView);
  }, [isAdmin]);

  const {
    paginatedEmployees,
    filteredEmployees,
    isLoading,

    searchTerm,
    setSearchTerm,
    filters,
    toggleFilter,
    clearFilters,
    filterOptions,
    hasActiveFilters,
    showFilters,
    setShowFilters,
    filterRef,

    selectedIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelectEmployee,
    paginationInfo,
    getPageNumbers,
    setCurrentPage,
    setPageSize,
    hoveredId,
    setHoveredId,
    refetch,
  } = useEmployees();

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const exportList = filteredEmployees;
      
      if (exportList.length === 0) {
        toast.error("No employee records to export.");
        setIsExporting(false);
        return;
      }

      const dataRows = exportList.map(emp => {
        const details = (emp.details || {}) as any;
        const primaryPhone = details.phone || details.primaryPhone || "";
        const role = details.role?.role_name || details.role?.name || details.job_role || "Associate";
        const bankName = details.bank_name || details.bankName || "—";
        const accountNumber = details.account_number || details.accountNumber || "—";
        const ifscCode = details.ifsc_code || details.ifscCode || "—";
        const rawJoinDate = details.joining_date || details.joiningDate || details.start_date || details.startDate;
        let formattedJoinDate = "—";
        if (rawJoinDate) {
          try {
            formattedJoinDate = new Date(rawJoinDate).toLocaleDateString('en-GB');
          } catch {
            formattedJoinDate = String(rawJoinDate);
          }
        }
        
        return {
          "Employee ID": details.employee_id || details.employeeId || "—",
          "Full Name": `${details.first_name || ""} ${details.last_name || ""}`.trim() || "—",
          "Email & Primary Contact": `${emp.email || ""} / ${primaryPhone || ""}`,
          "Department & Role/Designation": `${details.department?.department_name || "—"} / ${role}`,
          "Employment Type": details.employment_type || details.employmentType || "—",
          "Work Location": details.work_location || details.workLocation || "—",
          "Joining Date": formattedJoinDate,
          "Bank Name": bankName,
          "Account Number": accountNumber,
          "IFSC Code": ifscCode,
          "Payroll Status": details.is_draft ? "Draft" : "Active",
          "Documents / Verification Status": details.documents && Array.isArray(details.documents) && details.documents.length > 0 ? "Uploaded" : "Pending"
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      
      const objectKeys = Object.keys(dataRows[0]);
      worksheet["!cols"] = objectKeys.map(key => {
        const maxLength = Math.max(
          key.length,
          ...dataRows.map(row => String(row[key as keyof typeof row] || "").length)
        );
        return { wch: maxLength + 3 };
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Employee_Details_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      try {
        await axiosInstance.post('/employees/export/audit', {
          employeeIds: exportList.map(e => e.id),
          format: 'excel'
        });
      } catch (err) {
        console.error('Failed to log export activities', err);
      }

      toast.success("Employee data exported successfully");
    } catch (error) {
      console.error("Excel export error", error);
      toast.error("Failed to export employee data.");
    } finally {
      setIsExporting(false);
    }
  };

  // ... Deletion logic removed to pass build (code was commented out)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { total, start, end, currentPage, totalPages, pageSize } =
    paginationInfo;
  const pageNumbers = getPageNumbers();

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {showDirectoryByDefault ? "Employee Directory" : "Organizational Structure"}
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              {showDirectoryByDefault ? "Manage and view your workforce and organizational structure" : "View company department and designation structure canvas"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          {/* View Toggle - Shown for Admin/HR/Manager */}
          {showDirectoryByDefault && (
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-lg p-1 border border-border">
              <button
                onClick={() => setViewMode('directory')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'directory'
                    ? 'bg-card text-primary shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4" />
                Directory View
              </button>
              <button
                onClick={() => setViewMode('canvas')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'canvas'
                    ? 'bg-card text-primary shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Network className="w-4 h-4" />
                Org Structure Canvas
              </button>
            </div>
          )}
          <RoleGate permissions={[Permission.ADD_EMPLOYEE]}>
            <Button
              onClick={() => navigate("/employee-management/add-employee")}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </RoleGate>
        </div>
      </div>

      {viewMode === 'canvas' ? (
        <div className="space-y-4">
          {/* Canvas Sub-tab navigation */}
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <button
              onClick={() => setCanvasSubTab('department')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                canvasSubTab === 'department'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Department Canvas
            </button>
            <button
              onClick={() => setCanvasSubTab('designation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                canvasSubTab === 'designation'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              <Network className="w-4 h-4" />
              Designation Canvas
            </button>
          </div>

          {canvasSubTab === 'department' ? (
            <DepartmentHierarchyView isReadOnly={true} />
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] p-4">
              <DesignationSettingsForm isReadOnly={true} isGlobal={true} />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employees…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(capitalizeFirstLetter(e.target.value))}
              className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 relative">
          <div className="relative" ref={filterRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFilters(!showFilters);
              }}
              className={`toolbar-filter-btn-with-text relative ${showFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
              title="Filters"
            >
              {showFilters ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 18 18"
                  aria-labelledby="CollapseCloseIconTitle"
                  role="graphics-symbol img"
                  fill="none"
                  className={showFilters ? '!text-blue-600 dark:!text-blue-400 w-4 h-4' : 'w-4 h-4'}
                >
                  <title id="CollapseCloseIconTitle">Collapse Close Icon</title>
                  <g>
                    <path
                      className="CollapseClose-path-dRZ"
                      clipRule="evenodd"
                      fillRule="evenodd"
                      fill="currentColor"
                      d="M2.09 1.526c.31 0 .562.252.562.563v15.82a.562.562 0 1 1-1.125 0V2.089c0-.311.252-.563.563-.563Zm6.198 5.438c.22.22.22.576 0 .796L6.612 9.436H17.91a.563.563 0 0 1 0 1.125H6.612l1.676 1.677a.562.562 0 1 1-.795.795l-2.637-2.636a.562.562 0 0 1 0-.796l2.637-2.637c.22-.22.576-.22.795 0Z"
                    />
                  </g>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 15"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M15.8,2H6.9C6.7,0.7,5.4-0.2,4,0.1C3,0.3,2.2,1,2,2H0.2C0.1,2,0,2.1,0,2.3v0.5 C0,2.9,0.1,3,0.2,3H2C2.3,4.4,3.6,5.2,5,5c1-0.2,1.8-1,1.9-2h8.8C15.9,3,16,2.9,16,2.8V2.3C16,2.1,15.9,2,15.8,2z M4.5,4 C3.7,4,3,3.3,3,2.5S3.7,1,4.5,1S6,1.7,6,2.5S5.3,4,4.5,4z" />
                  <path d="M15.8,12H8.9C8.7,10.7,7.4,9.8,6,10.1c-1,0.2-1.8,1-1.9,1.9H0.2C0.1,12,0,12.1,0,12.3v0.5 C0,12.9,0.1,13,0.2,13h3.8C4.3,14.4,5.6,15.2,7,15c1-0.2,1.8-1,1.9-1.9h6.8c0.1,0,0.2-0.1,0.2-0.2v-0.5C16,12.1,15.9,12,15.8,12z M6.5,14C5.7,14,5,13.3,5,12.5S5.7,11,6.5,11S7.3,11,7.3,12.5S7.3,14,6.5,14z" />
                  <path d="M0,7.3v0.5C0,7.9,0.1,8,0.2,8h8.8c0.3,1.4,1.6,2.2,2.9,1.9c1-0.2,1.8-1,1.9-1.9h1.8 C15.9,8,16,7.9,16,7.8V7.3C16,7.1,15.9,7,15.8,7h-1.8c-0.3-1.3-1.6-2.2-2.9-1.9C10,5.3,9.2,6,9.1,7H0.2C0.1,7,0,7.1,0,7.3z M10,7.5 C10,6.7,10.7,6,11.5,6S13,6.7,13,7.5S12.3,9,11.5,9S10,8.3,10,7.5z" />
                </svg>
              )}
              Filter
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white dark:border-card" />
              )}
            </button>

            {/* Filter Dropdown Modal */}
            {showFilters && (
              <div className="absolute right-0 top-full mt-3 w-[min(800px,calc(100vw-1.5rem))] bg-white dark:bg-zinc-900 rounded-xl shadow-xl shadow-slate-200/80 dark:shadow-black/45 border border-slate-100 dark:border-zinc-800 z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Main Split Body */}
                <div className="flex h-[450px] divide-x divide-slate-100 dark:divide-zinc-800">
                  {/* Left Column - Category Selector */}
                  <div className="w-[300px] bg-slate-50/30 dark:bg-zinc-900/10 p-6 flex flex-col justify-between shrink-0">
                    <div className="space-y-6">
                      {/* Header Title */}
                      <div>
                        <div className="text-[20px] font-bold text-primarydark:text-blue-400 tracking-tight">
                          Filters
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[12px] font-medium text-slate-400 dark:text-zinc-500">
                            {filters.department.length + filters.role.length + filters.location.length + filters.status.length} Filter Selected
                          </span>
                          <button
                            type="button"
                            onClick={clearFilters}
                            disabled={!hasActiveFilters}
                            className={`text-[12px] font-semibold transition-colors ${
                              hasActiveFilters
                                ? 'text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400'
                                : 'text-slate-300 dark:text-zinc-700 cursor-not-allowed'
                            }`}
                          >
                            Reset all Filters
                          </button>
                        </div>
                      </div>

                      {/* Category Options List */}
                      <div className="space-y-2.5">
                        {/* Department Tab */}
                        <button
                          type="button"
                          onClick={() => setActiveCategoryTab('department')}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-xs font-semibold ${
                            activeCategoryTab === 'department'
                              ? 'border-blue-500 bg-white dark:bg-zinc-800 text-primarydark:text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                              : 'border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-800/30 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">Department</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {filters.department.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                {filters.department.length}
                              </span>
                            )}
                            <ChevronRight className={`w-3.5 h-3.5 ${activeCategoryTab === 'department' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-muted-foreground'}`} />
                          </div>
                        </button>

                        {/* Role Tab */}
                        <button
                          type="button"
                          onClick={() => setActiveCategoryTab('role')}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-xs font-semibold ${
                            activeCategoryTab === 'role'
                              ? 'border-blue-500 bg-white dark:bg-zinc-800 text-primarydark:text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                              : 'border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-800/30 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">Role</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {filters.role.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                {filters.role.length}
                              </span>
                            )}
                            <ChevronRight className={`w-3.5 h-3.5 ${activeCategoryTab === 'role' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-muted-foreground'}`} />
                          </div>
                        </button>

                        {/* Location Tab */}
                        <button
                          type="button"
                          onClick={() => setActiveCategoryTab('location')}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-xs font-semibold ${
                            activeCategoryTab === 'location'
                              ? 'border-blue-500 bg-white dark:bg-zinc-800 text-primarydark:text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                              : 'border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-800/30 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">Location</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {filters.location.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                {filters.location.length}
                              </span>
                            )}
                            <ChevronRight className={`w-3.5 h-3.5 ${activeCategoryTab === 'location' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-muted-foreground'}`} />
                          </div>
                        </button>

                        {/* Status Tab */}
                        <button
                          type="button"
                          onClick={() => setActiveCategoryTab('status')}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-xs font-semibold ${
                            activeCategoryTab === 'status'
                              ? 'border-blue-500 bg-white dark:bg-zinc-800 text-primarydark:text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                              : 'border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-800/30 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">Status</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {filters.status.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                {filters.status.length}
                              </span>
                            )}
                            <ChevronRight className={`w-3.5 h-3.5 ${activeCategoryTab === 'status' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-muted-foreground'}`} />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Options List */}
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    {/* Header info */}
                    {activeCategoryTab === 'department' && (
                      <div className="mb-5">
                        <div className="text-[15px] font-bold text-slate-800 dark:text-zinc-100">
                          Department
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          Select one or more departments to filter the workforce list
                        </div>
                      </div>
                    )}
                    {activeCategoryTab === 'role' && (
                      <div className="mb-5">
                        <div className="text-[15px] font-bold text-slate-800 dark:text-zinc-100">
                          Role
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          Select one or more roles to filter the workforce list
                        </div>
                      </div>
                    )}
                    {activeCategoryTab === 'location' && (
                      <div className="mb-5">
                        <div className="text-[15px] font-bold text-slate-800 dark:text-zinc-100">
                          Location
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          Select one or more office locations to filter the workforce list
                        </div>
                      </div>
                    )}
                    {activeCategoryTab === 'status' && (
                      <div className="mb-5">
                        <div className="text-[15px] font-bold text-slate-800 dark:text-zinc-100">
                          Status
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          Select one or more employment statuses to filter the workforce list
                        </div>
                      </div>
                    )}

                    {/* Actual options */}
                    <div className="space-y-2">
                      {activeCategoryTab === 'department' &&
                        filterOptions.departments.map((dept) => {
                          const isSelected = filters.department.includes(dept);
                          return (
                            <label
                              key={dept}
                              className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all duration-150 ${
                                isSelected
                                  ? 'border-blue-500/30 bg-blue-50/10 dark:border-blue-500/20 dark:bg-blue-950/10 text-primarydark:text-blue-400'
                                  : 'border-slate-200/60 hover:bg-slate-50/60 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30 text-slate-600 dark:text-zinc-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFilter("department", dept)}
                                className="w-4 h-4 rounded border-slate-300 text-primaryfocus:ring-blue-500 focus:ring-offset-0 cursor-pointer dark:bg-zinc-800 dark:border-zinc-700"
                              />
                              <span className="ml-3 text-[12px] font-medium">
                                {dept}
                              </span>
                            </label>
                          );
                        })}

                      {activeCategoryTab === 'role' &&
                        filterOptions.roles.map((role) => {
                          const isSelected = filters.role.includes(role);
                          return (
                            <label
                              key={role}
                              className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all duration-150 ${
                                isSelected
                                  ? 'border-blue-500/30 bg-blue-50/10 dark:border-blue-500/20 dark:bg-blue-950/10 text-primarydark:text-blue-400'
                                  : 'border-slate-200/60 hover:bg-slate-50/60 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30 text-slate-600 dark:text-zinc-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFilter("role", role)}
                                className="w-4 h-4 rounded border-slate-300 text-primaryfocus:ring-blue-500 focus:ring-offset-0 cursor-pointer dark:bg-zinc-800 dark:border-zinc-700"
                              />
                              <span className="ml-3 text-[12px] font-medium">
                                {formatDisplayRole(role)}
                              </span>
                            </label>
                          );
                        })}

                      {activeCategoryTab === 'location' &&
                        filterOptions.locations.map((loc) => {
                          const isSelected = filters.location.includes(loc);
                          return (
                            <label
                              key={loc}
                              className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all duration-150 ${
                                isSelected
                                  ? 'border-blue-500/30 bg-blue-50/10 dark:border-blue-500/20 dark:bg-blue-950/10 text-primarydark:text-blue-400'
                                  : 'border-slate-200/60 hover:bg-slate-50/60 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30 text-slate-600 dark:text-zinc-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFilter("location", loc)}
                                className="w-4 h-4 rounded border-slate-300 text-primaryfocus:ring-blue-500 focus:ring-offset-0 cursor-pointer dark:bg-zinc-800 dark:border-zinc-700"
                              />
                              <span className="ml-3 text-[12px] font-medium">
                                {loc}
                              </span>
                            </label>
                          );
                        })}

                      {activeCategoryTab === 'status' &&
                        filterOptions.statuses.map((status) => {
                          const isSelected = filters.status.includes(status);
                          return (
                            <label
                              key={status}
                              className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all duration-150 ${
                                isSelected
                                  ? 'border-blue-500/30 bg-blue-50/10 dark:border-blue-500/20 dark:bg-blue-950/10 text-primarydark:text-blue-400'
                                  : 'border-slate-200/60 hover:bg-slate-50/60 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30 text-slate-600 dark:text-zinc-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFilter("status", status)}
                                className="w-4 h-4 rounded border-slate-300 text-primaryfocus:ring-blue-500 focus:ring-offset-0 cursor-pointer dark:bg-zinc-800 dark:border-zinc-700"
                              />
                              <span className="ml-3 text-[12px] font-medium">
                                {status}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="px-5 py-2 text-[11px] font-bold text-primary hover:text-blue-700 dark:hover:text-blue-400 border border-blue-500/60 dark:border-blue-400/60 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-6 py-2.5 text-[11px] font-bold text-white bg-blue-500 hover:bg-primary rounded-lg shadow-sm transition-colors uppercase tracking-wider"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="toolbar-filter-btn-with-text"
            onClick={() => setIsBulkUploadOpen(true)}
            title="Bulk Upload (Excel)"
          >
            <Upload />
            Import
          </button>
          <button
            className="toolbar-filter-btn-with-text disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportExcel}
            disabled={isExporting}
            title={isExporting ? "Exporting..." : "Export"}
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download />}
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>



      {/* ── Employee Table ───────────────────────────────────────── */}
      <Card className="rounded shadow-sm border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="bg-muted border-b border-border">
                <tr>

                  {[
                    { label: "Employee", cls: "" },
                    { label: "Department", cls: "hidden md:table-cell" },
                    { label: "Role", cls: "hidden sm:table-cell" },
                    { label: "Location", cls: "hidden lg:table-cell" },
                    { label: "Status", cls: "" },
                    { label: "Last Active", cls: "hidden md:table-cell" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className={`px-4 py-3 text-left text-sm font-semibold text-black ${col.cls}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-card divide-y divide-border">
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      No employees found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((employee) => {
                    const isHovered = hoveredId === employee.id;
                    const isSelected = selectedIds.has(employee.id);
                    const hasSelections = selectedIds.size > 0;
                    const showCheckbox =
                      isHovered || isSelected || hasSelections;
                    // const showActions = isHovered && !hasSelections;
                    const { details } = employee;

                    return (
                      <tr
                        key={employee.id}
                        className={`hover:bg-muted transition-colors cursor-pointer ${isSelected ? "bg-primary/10/30" : ""}`}
                        onMouseEnter={() => setHoveredId(employee.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() =>
                          navigate(
                            `/employee-management/profile/${employee.id}`,
                          )
                        }
                      >


                        {/* Employee name + email */}
                        <td className="pl-3 pr-6 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {details?.profile_picture ? (
                              <img
                                src={getProfilePictureUrl(details.profile_picture) || ""}
                                alt={`${details.first_name} ${details.last_name}`}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${details.first_name}+${details.last_name}&background=6366f1&color=fff`;
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                {details?.first_name?.[0]}
                                {details?.last_name?.[0]}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate text-sm">
                                {details?.first_name} {details?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-foreground truncate block">
                            {details?.department?.department_name ??
                              "Unassigned"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-sm text-foreground truncate block">
                            {formatDisplayRole(details?.role?.role_name ?? "Associate")}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-foreground truncate block">
                            {details?.work_location ?? "Remote"}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${employee.details?.is_draft
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                : employee.status
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                  : "bg-muted text-foreground"
                              }`}
                          >
                            {employee.details?.is_draft ? "Draft" : employee.status ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Last active + hover actions */}
                        <td className="px-4 py-3 relative hidden md:table-cell">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {employee.created_at
                                ? new Date(
                                  employee.created_at,
                                ).toLocaleDateString()
                                : "Just now"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card rounded border">
          {/* Count + rows per page */}
          <div className="flex items-center gap-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{start}</span>{" "}
              to <span className="font-medium text-foreground">{end}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span>{" "}
              employees
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onChange={(val) => setPageSize(Number(val))}
                options={[5, 10, 20, 50].map((n) => ({ value: String(n), label: String(n) }))}
                className="w-20"
                direction="top"
              />
            </div>
          </div>

          {/* Page buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-muted-foreground" />
              </Button>

              <div className="flex items-center gap-1 mx-2">
                {pageNumbers.map((page, idx) =>
                  typeof page === "number" ? (
                    <Button
                      key={idx}
                      variant={currentPage === page ? "primary" : "ghost"}
                      className={`h-10 min-w-[40px] px-2 ${currentPage === page
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-600 dark:text-muted-foreground hover:bg-muted border-0"
                        }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={idx} className="px-2 text-muted-foreground">
                      …
                    </span>
                  ),
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Deletion Dialog removed to fix build errors */}

      <EmployeeBulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {
          setIsBulkUploadOpen(false);
          refetch();
        }}
      />
        </>
      )}

    </div>
  );
}

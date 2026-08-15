import React, { useState, useEffect } from 'react';
import {
  UserX, Search, Download, Plus, Eye, Clock,
  CheckCircle2, AlertCircle, Users, ClipboardCheck,
  Loader2, Shield, XCircle, User, ArrowLeft, Edit,
  MessageSquare, ChevronLeft, ChevronRight, LogOut, Filter
} from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useAuth } from '@/shared/context/AuthContext';
import { UserRole } from '@/shared/types/rbac';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import InitiateExitForm from '../components/InitiateExitForm';
import ManagerExitReview from '../components/ManagerExitReview';
import ExitManagementDetail from '../components/ExitManagementDetail';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { useNotifications } from '@/shared/context/NotificationContext';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { EXIT_STATUS } from '../components/InitiateExitForm';
import OffboardingDashboard from '../components/OffboardingDashboard';

const EmployeeExit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useOrgNavigate();
  const { lastEvent } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [exitStats, setExitStats] = useState<any>(null);
  const [exitRequests, setExitRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [activeStatus, setActiveStatus] = useState('All');
  const [showExitFilters, setShowExitFilters] = useState(false);
  const [showInitiateForm, setShowInitiateForm] = useState(false);
  const [showManagerReview, setShowManagerReview] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Pagination state matching EmployeeManagement pattern
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const normalizedRole = user?.role?.toString().toUpperCase() || '';
  const userRolesList = Array.isArray(user?.roles) ? user.roles : [];
  const normalizedRoles = [normalizedRole, ...userRolesList.map((r: any) => String(r).toUpperCase())];
  const isSuperAdminOrAdmin = normalizedRoles.some((r: string) =>
    ['SUPER ADMIN', 'SUPER_ADMIN', 'ADMIN', 'CEO', 'SYSTEM ADMINISTRATOR', 'HR', 'HR MANAGER', 'HR_MANAGER', 'HR EXECUTIVE', 'HR_EXECUTIVE'].includes(r)
  );
  const isManager = normalizedRoles.includes('MANAGER') || normalizedRoles.includes('TEAM MANAGER');
  const isEmployee = !isSuperAdminOrAdmin && !isManager;

  const totalPages = Math.max(1, Math.ceil(exitRequests.length / pageSize));
  const startRecord = exitRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, exitRequests.length);
  const paginatedRequests = exitRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeStatus]);

  const handleExportCSV = () => {
    if (!exitRequests.length) { toast.info('No data to export'); return; }
    const headers = ['Employee Name', 'Employee ID', 'Exit Type', 'Last Working Day', 'Status', 'Progress %'];
    const rows = exitRequests.map(r => [
      `${r.user?.details?.first_name || ''} ${r.user?.details?.last_name || ''}`.trim(),
      r.user?.details?.employee_id || 'N/A',
      r.exit_type,
      new Date(r.last_working_day).toLocaleDateString(),
      r.status.replace(/_/g, ' '),
      r.progress_percentage || 0
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `exit-report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  useEffect(() => {
    fetchStats();
    fetchRequests();
  }, [searchQuery, activeStatus]);

  useEffect(() => {
    if (!lastEvent) return;

    const { event, data } = lastEvent;

    // Refresh list for any exit-related event
    if (['exit_request', 'exit_request_update', 'exit_request_hr', 'lwd_negotiation'].includes(event)) {
      fetchStats();
      fetchRequests();
    }

    // Show toast when request is updated (WebSocket already targets this user only)
    if (event === 'exit_request_update') {
      toast.info(data?.title || 'Exit Request Updated', { description: data?.message, duration: 5000 });
    }

    // Show toast when manager negotiates LWD
    if (event === 'lwd_negotiation') {
      const managerName = data?.metadata?.manager_name || data?.manager_name || 'Your Manager';
      const formattedLwd = data?.metadata?.formatted_lwd || data?.formatted_lwd || 'a new date';
      toast.warning(`📅 LWD Negotiation from ${managerName}`, {
        description: `Proposed Last Working Day: ${formattedLwd}. Please review in your exit portal.`,
        duration: 10000,
      });
    }

    // Show toast for generic exit notification events
    if (event === 'notification' && (data?.type === 'exit' || data?.related_module === 'exit')) {
      toast.info(data?.title || 'Exit Update', { description: data?.message, duration: 5000 });
    }
  }, [lastEvent]);



  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/exit/stats');
      if (response.data.success) { setExitStats(response.data.data); }
    } catch (error) {
      console.error('Error fetching exit stats:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const response = await axiosInstance.get('/exit/all-requests', {
        params: { search: searchQuery, status: activeStatus }
      });
      if (response.data.success) {
        const requests = response.data.data;
        if (isEmployee && requests.length > 0) {
          const detailRes = await axiosInstance.get(`/exit/${requests[0].id}`);
          if (detailRes.data.success) {
            setExitRequests([detailRes.data.data]);
            return;
          }
        }
        setExitRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching exit requests:', error);
      toast.error('Failed to fetch exit requests');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const getExitTypeStyle = (type: string) => {
    const t = type?.toUpperCase();
    switch (t) {
      case 'RESIGNATION': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'RETIREMENT': return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'TERMINATION': return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getWorkflowStyle = (stage: string) => {
    switch (stage) {
      case 'Resignation Submitted': return { bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: Clock };
      case 'Acknowledgment & Acceptance': return { bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', icon: User };
      case 'Workflow Triggered': return { bg: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: Shield };
      case 'Clearance & Approvals': return { bg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: Shield };
      case 'Final Settlement': return { bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 };
      case 'Completed': return { bg: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800', icon: CheckCircle2 };
      case 'Rejected': return { bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', icon: XCircle };
      default: return { bg: 'bg-muted text-foreground border-border', icon: Clock };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case EXIT_STATUS.PENDING_ACCEPTANCE:
      case EXIT_STATUS.NEGOTIATION_PENDING:
        return { bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', icon: Clock };
      case EXIT_STATUS.RESIGNATION_ACCEPTED:
      case EXIT_STATUS.OFFBOARDING:
      case EXIT_STATUS.ASSET_HANDOVER:
      case EXIT_STATUS.IT_CLEARANCE:
      case EXIT_STATUS.EXIT_INTERVIEW:
      case EXIT_STATUS.CLEARANCE:
      case EXIT_STATUS.FINAL_SETTLEMENT:
        return { bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: Shield };
      case EXIT_STATUS.COMPLETED:
        return { bg: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800', icon: CheckCircle2 };
      case EXIT_STATUS.REJECTED:
        return { bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', icon: XCircle };
      default:
        return { bg: 'bg-muted text-foreground border-border', icon: Clock };
    }
  };

  const getWorkflowStage = (status: string) => {
    if (status === EXIT_STATUS.REJECTED) return 'Rejected';
    switch (status) {
      case EXIT_STATUS.PENDING_ACCEPTANCE: return 'Resignation Submitted';
      case EXIT_STATUS.NEGOTIATION_PENDING: return 'LWD Negotiation';
      case EXIT_STATUS.RESIGNATION_ACCEPTED: return 'Acknowledgment & Acceptance';
      case EXIT_STATUS.OFFBOARDING: return 'Workflow Triggered';
      case EXIT_STATUS.ASSET_HANDOVER: return 'Asset Handover';
      case EXIT_STATUS.IT_CLEARANCE: return 'IT Clearance';
      case EXIT_STATUS.EXIT_INTERVIEW: return 'Exit Interview';
      case EXIT_STATUS.CLEARANCE: return 'Clearance & Approvals';
      case EXIT_STATUS.FINAL_SETTLEMENT: return 'Final Settlement';
      case EXIT_STATUS.COMPLETED: return 'Completed';
      default: return 'Initiated';
    }
  };

  const getPendingLabel = (status: string, userData: any) => {
    if (status === 'PENDING' && userData?.details?.reporting_manager) {
      return `Pending: ${userData.details.reporting_manager.details?.first_name || ''} ${userData.details.reporting_manager.details?.last_name || ''}`.trim();
    }
    const labels: Record<string, string> = {
      'APPROVED': 'Pending: HR Admin',
      'PENDING_CLEARANCE': 'Pending: System Admin',
      'ASSET_HANDOVER': 'Pending: Asset Handover',
      'IT_CLEARANCE': 'Pending: IT Clearance',
      'EXIT_INTERVIEW': 'Pending: HR Interview',
      'FINAL_SETTLEMENT': 'Pending: Finance Settlement',
    };
    return labels[status] || null;
  };

  if (showInitiateForm) {
    return (
      <div className="space-y-6">
        <InitiateExitForm
          onBack={() => setShowInitiateForm(false)}
          initialData={isEmployee && exitRequests.length > 0 ? exitRequests[0] : null}
        />
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div className="space-y-6">
        <ExitManagementDetail
          request={selectedRequest}
          onBack={() => setSelectedRequest(null)}
        />
      </div>
    );
  }

  if (showManagerReview) {
    return (
      <div className="space-y-6">
        <ManagerExitReview
          requests={exitRequests}
          onBack={() => setShowManagerReview(false)}
          onSelectRequest={(req) => {
            setSelectedRequest(req);
            setShowManagerReview(false);
          }}
          onRefresh={() => {
            fetchStats();
            fetchRequests();
          }}
        />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // 1. EMPLOYEE VIEW
  // ────────────────────────────────────────────────────────
  if (isEmployee) {
    if (isLoadingRequests) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin " />
        </div>
      );
    }

    if (exitRequests.length > 0) {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Your Offboarding Dashboard"
            description="Track your resignation progress and clearance tasks"
            icon={<LogOut className="w-8 h-8" />}
            action={
              exitRequests[0].status === EXIT_STATUS.PENDING_ACCEPTANCE && (
                <Button variant="outline" className="gap-2" onClick={() => setShowInitiateForm(true)}>
                  <Edit className="w-4 h-4" /> Edit Request
                </Button>
              )
            }
          />
          <div>
            <OffboardingDashboard request={exitRequests[0]} />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <InitiateExitForm onBack={() => navigate('/')} />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // 2. MANAGER VIEW
  // ────────────────────────────────────────────────────────
  if (isManager) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Manager Exit Review Portal"
          description="Manage and review exit requests from reporting employees"
          icon={
            <button onClick={() => navigate('/')} className="hover:bg-muted p-2 rounded-full transition-colors mr-2">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          }
        />
        <div>
          <ManagerExitReview
            requests={exitRequests}
            onBack={() => navigate('/')}
            onSelectRequest={(req) => setSelectedRequest(req)}
            onRefresh={() => {
              fetchStats();
              fetchRequests();
            }}
          />
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // 3. SUPER ADMIN / ADMIN VIEW (Matching Employee Management UI)
  // ────────────────────────────────────────────────────────
  const adminStats = [
    { label: 'Total Cases', value: exitStats?.totalCases || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
    { label: 'Initiated', value: exitStats?.initiated || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 dark:bg-amber-950/30' },
    { label: 'In Progress', value: exitStats?.inProgress || 0, icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100 dark:bg-purple-950/30' },
    { label: 'Pending Clearance', value: exitStats?.pendingClearance || 0, icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100 dark:bg-blue-950/30' },
    { label: 'Completed', value: exitStats?.completed || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30' },
    { label: 'My Approvals', value: exitStats?.pendingMyApproval || 0, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100 dark:bg-rose-950/30' },
  ];

  const pageNumbers = getPageNumbers();

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 ">
            <UserX className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Exit Management
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Enterprise overview of employee exits, clearances, and offboarding workflows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">

          <Button
            onClick={() => setShowInitiateForm(true)}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Initiate Exit
          </Button>
        </div>
      </div>

      {/* ── KPI Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {adminStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${stat.color} shrink-0`} />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {stat.value}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  {stat.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Filter Button & Popover Modal */}
        {(() => {
          const hasActiveFilter = activeStatus !== "All";
          return (
            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setShowExitFilters(!showExitFilters)}
                className={`toolbar-filter-btn-with-text relative ${showExitFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                title="Filters"
              >
                {showExitFilters ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 18 18"
                    fill="none"
                    className="!text-primary w-4 h-4"
                  >
                    <path
                      clipRule="evenodd"
                      fillRule="evenodd"
                      fill="currentColor"
                      d="M2.09 1.526c.31 0 .562.252.562.563v15.82a.562.562 0 1 1-1.125 0V2.089c0-.311.252-.563.563-.563Zm6.198 5.438c.22.22.22.576 0 .796L6.612 9.436H17.91a.563.563 0 0 1 0 1.125H6.612l1.676 1.677a.562.562 0 1 1-.795.795l-2.637-2.636a.562.562 0 0 1 0-.796l2.637-2.637c.22-.22.576-.22.795 0Z"
                    />
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
                {hasActiveFilter && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                )}
              </button>

              {/* Filter Dropdown Popover */}
              {showExitFilters && (
                <div className="absolute right-0 top-full mt-2 w-[300px] bg-card rounded-xl shadow-xl border border-border p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">Filter Exit Requests</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStatus("All")}
                      className="text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                      <Select
                        value={activeStatus}
                        onChange={(val) => setActiveStatus(val)}
                        options={[
                          { value: "All", label: "All Statuses" },
                          { value: "PENDING_ACCEPTANCE", label: "Pending Approval" },
                          { value: "OFFBOARDING", label: "Offboarding" },
                          { value: "COMPLETED", label: "Completed" },
                          { value: "REJECTED", label: "Rejected" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setShowExitFilters(false)}
                      className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Apply Filter
                    </Button>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <Button
                variant="ghost"
                onClick={handleExportCSV}
                className="toolbar-filter-btn-with-text"
              >
                <Download />
                Export
              </Button>
            </div>
          );
        })()}
      </div>

      {/* ── Exit Requests Table ─────────────────────────────────── */}
      <Card className="rounded shadow-sm border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoadingRequests ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : exitRequests.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                  <UserX className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">No exit requests found</p>
              </div>
            ) : (
              <table className="w-full min-w-[750px] border-collapse">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    {[
                      { label: "Employee", width: "230px" },
                      { label: "Exit Type", width: "130px" },
                      { label: "Last Working Day", width: "160px" },
                      { label: "Workflow Stage", width: "180px" },
                      { label: "Progress", width: "120px" },
                      { label: "Status", width: "110px" },
                      { label: "Actions", width: "80px", cls: "text-right pr-6" },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className={`px-6 py-4 text-left text-sm font-semibold text-black tracking-wider ${col.cls || ""}`}
                        style={col.width ? { width: col.width } : undefined}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {paginatedRequests.map((item) => {
                    const fullName = `${item.user?.details?.first_name || ''} ${item.user?.details?.last_name || ''}`.trim() || 'N/A';
                    const empId = item.user?.details?.employee_id || 'N/A';
                    const stage = getWorkflowStage(item.status);
                    const stageStyle = getWorkflowStyle(stage);
                    const pendingLabel = getPendingLabel(item.status, item.user);
                    const statusStyle = getStatusStyle(item.status);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setSelectedRequest(item)}
                      >
                        {/* Employee */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.user?.details?.profile_picture ? (
                              <img
                                src={getProfilePictureUrl(item.user.details.profile_picture) || ''}
                                alt={fullName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.user?.details?.first_name || ''}+${item.user?.details?.last_name || ''}&background=6366f1&color=fff`;
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                {item.user?.details?.first_name?.[0]}
                                {item.user?.details?.last_name?.[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {fullName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {empId}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Exit Type */}
                        <td className="px-6 py-4 align-middle">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap w-fit ${getExitTypeStyle(item.exit_type)}`}>
                            {item.exit_type}
                          </span>
                        </td>

                        {/* Last Working Day */}
                        <td className="px-6 py-4 align-middle">
                          <p className="text-xs font-semibold text-foreground">
                            {new Date(item.last_working_day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </td>

                        {/* Workflow Stage */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit border ${stageStyle.bg}`}>
                              <stageStyle.icon className="w-3 h-3 mr-1" />
                              {stage}
                            </span>
                            {pendingLabel && (
                              <p className="text-[11px] font-medium text-muted-foreground">{pendingLabel}</p>
                            )}
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${item.status === EXIT_STATUS.REJECTED ? 'bg-rose-500' : 'bg-primary'}`}
                                style={{ width: `${item.status === EXIT_STATUS.REJECTED ? 0 : item.progress_percentage || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground min-w-[28px]">
                              {item.status === EXIT_STATUS.REJECTED ? '—' : `${item.progress_percentage || 0}%`}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 align-middle">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${statusStyle.bg}`}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right pr-6 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequest(item)}
                            className="h-8 px-2 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {exitRequests.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-border bg-card rounded border">
          {/* Count + rows per page */}
          <div className="flex items-center gap-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startRecord}</span>{" "}
              to <span className="font-medium text-foreground">{endRecord}</span> of{" "}
              <span className="font-medium text-foreground">{exitRequests.length}</span>{" "}
              exit requests
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                label="Rows per page:"
                options={[5, 10, 20, 50].map((n) => ({ value: String(n), label: String(n) }))}
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
    </div>
  );
};

export default EmployeeExit;

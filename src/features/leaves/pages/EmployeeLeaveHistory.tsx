import { useState, useEffect, useMemo } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import {
  Calendar, Check, X, Clock, ArrowLeft, Search,
  FileText, AlertCircle, CheckCircle2, XCircle, ChevronLeft,
  LayoutGrid, List
} from "lucide-react";
import {
  getLeaveHistory,
  handleLeaveAction,
  getAllLeavePolicies
} from '@/features/leaves/services/leaves';
import { getEmployee } from '@/features/employees/services/employees';
import { toast } from "sonner";
import { toTitleCase } from '@/shared/utils/stringUtils';
import RejectReasonDialog from '@/shared/components/ui/RejectReasonDialog';
import Select from "@/shared/components/ui/Select";
import { Card, CardContent } from "@/shared/components/ui/card";

export function EmployeeLeaveHistory() {
  const { employeeId } = useParams();
  const navigate = useOrgNavigate();

  const [employee, setEmployee] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "compact">("compact");

  const fetchData = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [empRes, historyRes, policiesRes] = await Promise.all([
        getEmployee(Number(employeeId)),
        getLeaveHistory({ user_id: employeeId, limit: 100 }),
        getAllLeavePolicies()
      ]);
      setEmployee(empRes);
      setHistory(historyRes.data?.data || historyRes.data || []);
      setPolicies(policiesRes.data || []);
    } catch (error) {
      toast.error("Failed to load employee leave data");
      navigate("/leave-management");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesType = typeFilter === "All" || String(item.leave_policy_id) === typeFilter;
      const matchesSearch = !searchTerm ||
        (item.reason?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [history, statusFilter, typeFilter, searchTerm]);

  const stats = useMemo(() => {
    const approved = history.filter(h => h.status === "APPROVED");
    const totalDays = approved.reduce((sum, h) => sum + (h.duration || h.days || 0), 0);
    const rejected = history.filter(h => h.status === "REJECTED").length;
    const pending = history.filter(h => h.status === "PENDING").length;
    return { totalDays, approvedCount: approved.length, rejectedCount: rejected, pendingCount: pending };
  }, [history]);

  const handleApprove = async (id: string) => {
    try {
      await handleLeaveAction(id, "APPROVED");
      toast.success("Leave request approved");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve leave request");
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectRequestId) return;
    try {
      await handleLeaveAction(rejectRequestId, "REJECTED", reason);
      toast.success("Leave request rejected");
      setRejectRequestId(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to reject leave request");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const empName = employee?.details
    ? `${employee.details.first_name || ''} ${employee.details.last_name || ''}`.trim()
    : (employee?.first_name ? `${employee.first_name} ${employee.last_name || ''}` : 'Unknown Employee');
  const empIdText = employee?.details?.employee_id || employee?.employee_id || 'N/A';
  const deptName = employee?.details?.department?.department_name || employee?.department_name || 'Department';
  const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REJECTED': return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'PENDING': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">

      {/* Premium Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/leave-management")}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-card border border-border text-muted-foreground hover:bg-muted/50 hover:text-primary hover:border-primary-200 transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-[15px] shadow-sm shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-foreground leading-tight">{empName}</h1>
            <p className="text-[13px] font-medium text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{empIdText}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"></span>
              <span>{deptName}</span>
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Deep Archive Access</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Days Taken', value: stats.totalDays, icon: Calendar },
          { label: 'Approved', value: stats.approvedCount, icon: CheckCircle2, status: 'Approved', statusColor: 'text-emerald-600' },
          { label: 'Rejected', value: stats.rejectedCount, icon: XCircle, status: 'Rejected', statusColor: 'text-rose-600' },
          { label: 'Pending', value: stats.pendingCount, icon: Clock, status: 'Pending', statusColor: 'text-amber-600' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                {card.status && (
                  <span className={`text-[11px] font-medium flex items-center gap-0.5 ${card.statusColor}`}>
                    {card.status}
                  </span>
                )}
              </div>
              <div className={`my-1 text-2xl font-bold tracking-tight ${card.statusColor || 'text-foreground'}`}>
                {card.value}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  {card.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* History Table Card */}
      <Card className="rounded shadow-sm border border-border">
        {/* Table Header with filters */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">Leave History</h2>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{filteredHistory.length} record{filteredHistory.length !== 1 && 's'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search reason..."
                className="w-full pl-9 pr-4 h-10 border border-border rounded-lg text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card shadow-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="min-w-[150px]">
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "All", label: "All Types" },
                  ...policies.map(p => ({ value: String(p.id), label: p.policy_name }))
                ]}
              />
            </div>
            <div className="min-w-[150px]">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "All", label: "All Statuses" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                  { value: "PENDING", label: "Pending" },
                ]}
              />
            </div>
            {/* View Mode Toggle */}
            <div className="bg-card border border-border p-1 rounded-lg flex items-center shrink-0 h-10 shadow-sm">
              <button 
                onClick={() => setViewMode('card')}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'card' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('compact')}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'compact' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {viewMode === 'compact' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Date Range</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Leave Type</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-black tracking-wider">Days</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-black tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-black tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-muted transition-colors cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-foreground leading-none">
                          {new Date(item.start_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          → {new Date(item.end_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-muted border border-border text-xs font-semibold text-foreground">
                        {item.leave_policy?.policy_name || item.leave_policy?.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap align-middle">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                        {item.duration || item.days}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex flex-col gap-1.5 min-w-[180px] max-w-[380px]">
                        <p className="text-xs font-medium text-muted-foreground whitespace-normal break-words leading-relaxed">
                          {item.reason || <span className="italic">No reason provided</span>}
                        </p>
                        {item.attachment_url && (
                          <div>
                            <a
                              href={item.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                              </svg>
                              View Supporting Doc
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap align-middle">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${getStatusStyle(item.status)}`}>
                        {toTitleCase(item.status)}
                      </span>
                    </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap align-middle">
                    {item.status === "PENDING" ? (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => setRejectRequestId(item.id)}
        className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-all shadow-sm"
        title="Reject"
        aria-label="Reject"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleApprove(item.id)}
        className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 transition-all shadow-sm"
        title="Approve"
        aria-label="Approve"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
    </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-slate-300" />
                      </div>
                      <p className="text-[13px] font-semibold text-muted-foreground">No matching records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistory.map((item) => {
            const duration = item.duration || item.days || 0;
            const statusUpper = (item.status || "").toUpperCase();
            
            const leaveType = item.leave_policy?.policy_name || item.leave_policy?.name || item.leave_type || "-";
            
            let typeColorHex = "#64748b";
            let typeBgColorHex = "rgba(100, 116, 139, 0.2)";
            const t = leaveType.toLowerCase();
            if (t.includes('annual') || t.includes('vacation')) { typeColorHex = "#6366f1"; typeBgColorHex = "rgba(99, 102, 241, 0.15)"; }
            else if (t.includes('sick') || t.includes('emergency')) { typeColorHex = "#e11d48"; typeBgColorHex = "rgba(225, 29, 72, 0.15)"; }
            else if (t.includes('casual') || t.includes('personal')) { typeColorHex = "#059669"; typeBgColorHex = "rgba(5, 150, 105, 0.15)"; }
            else if (t.includes('maternity') || t.includes('paternity')) { typeColorHex = "#d97706"; typeBgColorHex = "rgba(217, 119, 6, 0.15)"; }
            
            return (
              <div key={item.id} className="bg-card rounded-lg border border-border p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-sm flex shrink-0" style={{ backgroundColor: typeBgColorHex }}>
                      <div className="w-full h-full rounded-sm opacity-40" style={{ backgroundColor: typeColorHex }}></div>
                    </div>
                    <span className="font-bold text-foreground text-[15px] font-['Space_Grotesk'] tracking-tight">{leaveType}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                      {duration} {duration === 1 ? 'DAY' : 'DAYS'}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
                    {toTitleCase(item.status)}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 text-sm">
                  <div className="font-mono text-[13px] font-medium text-foreground/90">
                    {new Date(item.start_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                    {" – "}
                    {new Date(item.end_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Applied on {new Date(item.applied_at || item.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap mt-1">
                  <div className="text-[13px] text-muted-foreground leading-relaxed max-w-xl">
                    {item.reason || <span className="italic text-slate-300">No reason provided</span>}
                  </div>
                  {item.attachment_url && (
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold font-['Inter']"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      Supporting Doc
                    </a>
                  )}
                </div>
                
                {item.status === "PENDING" ? (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-auto">
                    <button
                      onClick={() => setRejectRequestId(item.id)}
                      className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-all shadow-sm"
                      title="Reject"
                      aria-label="Reject"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 transition-all shadow-sm"
                      title="Approve"
                      aria-label="Approve"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end pt-2 border-t border-border mt-auto">
                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Processed</span>
                  </div>
                )}
              </div>
            );
          })}
          {filteredHistory.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-[13px] font-semibold text-muted-foreground">No matching records found</p>
              </div>
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>

      <RejectReasonDialog
        isOpen={rejectRequestId !== null}
        onClose={() => setRejectRequestId(null)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}

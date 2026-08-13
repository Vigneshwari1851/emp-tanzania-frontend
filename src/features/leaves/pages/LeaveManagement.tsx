import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar as CalendarIcon, Check, CheckCircle2, X, Plus, Clock, Download, Edit, Trash2, Search, LogIn, LogOut, Users, TrendingUp, Eye, ArrowLeft, Hourglass, Undo, LayoutGrid, List, Filter, ArrowDownUp, Loader2, Upload, FileText, AlertTriangle, BarChart3, CalendarDays, History, Tags } from "lucide-react";
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { useParams, useLocation } from "react-router-dom";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import RejectReasonDialog from '@/shared/components/ui/RejectReasonDialog';
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotifications } from '@/shared/context/NotificationContext';
import Select from "@/shared/components/ui/Select";
import axiosInstance from '@/shared/services/axiosInstance';

import {
  applyLeave,
  getMyRequests,
  getPendingRequests,
  getLeaveHistory,
  handleLeaveAction,
  getMyLeaveBalance,
  getLeaveStatistics,
  getAllLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy
} from '@/features/leaves/services/leaves';
import {

  getMyAttendanceLogs,
  getTeamAttendanceLogs,
  getAttendanceStats
} from '@/features/attendance/services/attendance';
import { getEmployee, getEmployees } from '@/features/employees/services/employees';
import { toast } from "sonner";
import { toTitleCase } from '@/shared/utils/stringUtils';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';






// Leave type colors are now handled dynamically by getLeaveTypeColor

export function LeaveManagement() {
  const { user } = useAuth();
  const navigate = useOrgNavigate();
  // Robust role checks (handle both frontend enum and backend raw string)
  const userRoles = [...(user?.roles || []), user?.role].filter(Boolean) as string[];
  const normalizeRole = (r: string) => r.toUpperCase().replace(/[\s_]+/g, '');

  const isSuperAdmin = userRoles.some(r => normalizeRole(r) === 'SUPERADMIN');
  const isAdmin = userRoles.some(r => normalizeRole(r) === 'ADMIN');
  const isManager = userRoles.some(r => normalizeRole(r) === 'MANAGER');
  const isHR = userRoles.some(r => normalizeRole(r) === 'HR');
  const baseIsEmployee = !isSuperAdmin && !isAdmin && !isManager && !isHR;

  const { id } = useParams();
  const requestRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const location = useLocation();
  const isSelfView = localStorage.getItem('sidebar_view_mode') === 'self' || location.state?.selfView === true;
  const isEmployee = baseIsEmployee || isSelfView;

  const getTabFromPath = (path: string) => {
    if (path.includes("/requests")) return "requests";
    if (path.includes("/history")) return "history";
    if (path.includes("/types") || path.includes("/policies")) return "policies";
    if (path.includes("/time-attendance")) return "attendance";
    if (path.includes("/statistics")) return "statistics";
    return isEmployee ? "requests" : "statistics";
  };

  const [activeTab, setActiveTab] = useState(() => {
    return getTabFromPath(location.pathname);
  });

  // Keep state in sync with URL changes (e.g. from sidebar clicks)
  useEffect(() => {
    const tab = getTabFromPath(location.pathname);
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname, activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "requests") {
      navigate("/leave-management/requests");
    } else if (tabId === "history") {
      navigate("/leave-management/history");
    } else if (tabId === "policies") {
      navigate("/leave-management/types");
    } else if (tabId === "attendance") {
      navigate("/time-attendance");
    } else if (tabId === "statistics") {
      navigate("/leave-management/statistics");
    }
  };
  const [requests, setRequests] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveStats, setLeaveStats] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Attendance filter states
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceEndDate, setAttendanceEndDate] = useState("");
  const [attendanceDept, setAttendanceDept] = useState("All");
  const [attendanceStatus, setAttendanceStatus] = useState("All");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showCancelPolicyModalConfirm, setShowCancelPolicyModalConfirm] = useState(false);
  const [deletePolicyTarget, setDeletePolicyTarget] = useState<{ id: number; name: string } | null>(null);
  const [showPolicyFullPage, setShowPolicyFullPage] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  // Remove viewingPolicy state
  const [showLeaveRequestFullPage, setShowLeaveRequestFullPage] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("All Employees");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [selectedLeaveType, setSelectedLeaveType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showLeaveHistoryFilters, setShowLeaveHistoryFilters] = useState(false);
  const [showLeaveRequestFilters, setShowLeaveRequestFilters] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  
  const [requestFilterStatus, setRequestFilterStatus] = useState("All");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestSort, setRequestSort] = useState("Newest applied");
  const [requestView, setRequestView] = useState("card"); // card or compact
  const [historyView, setHistoryView] = useState("card"); // card or compact

  const [leaveRequestData, setLeaveRequestData] = useState({
    id: "",
    leave_policy_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    attachment_url: ""
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [overQuotaReason, setOverQuotaReason] = useState("");

  const [policyFormFields, setPolicyFormFields] = useState({ is_paid: "Paid", color: "primary", document_url: "" });
  const [dragActive, setDragActive] = useState(false);
  const policyFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        policiesRes,
        pendingRes,
        historyRes,
        statsRes,
        myAttendanceRes,
        balanceRes,
        attStatsRes
      ] = await Promise.allSettled([
        getAllLeavePolicies(),
        isEmployee ? getMyRequests() : getPendingRequests(),
        isEmployee ? getMyRequests() : getLeaveHistory(),
        (!isEmployee) ? getLeaveStatistics() : Promise.resolve({ data: null }),
        getMyAttendanceLogs(),
        getMyLeaveBalance(),
        (!isEmployee) ? getAttendanceStats() : Promise.resolve({ data: null })
      ]);

      if (policiesRes.status === 'fulfilled') setPolicies(policiesRes.value.data || []);

      const userMap: Record<number, any> = {};

      if (pendingRes.status === 'fulfilled') {
        const pendingData = pendingRes.value.data || [];

        // Fetch and Attach employee details for each request
        const uniqueUserIds = [...new Set(pendingData.map((req: any) => req.user_id || req.approved_by).filter(Boolean))];

        await Promise.allSettled(
          uniqueUserIds.map(async (uid: any) => {
            try {
              const emp = await getEmployee(uid);
              userMap[uid] = emp;
            } catch (e) {
              console.error(`Failed to fetch user ${uid}`);
            }
          })
        );

        const mappedData = pendingData.map((req: any) => {
          const approverFull = userMap[req.approved_by];
          const employeeFull = userMap[req.user_id];
          const approverData = approverFull?.details;
          const employeeData = employeeFull?.details;

          let approverName: string;
          if (!req.approved_by) {
            approverName = 'Pending';
          } else if (approverData?.first_name || approverData?.last_name) {
            approverName = `${approverData.first_name || ''} ${approverData.last_name || ''}`.trim();
          } else if (approverFull?.username) {
            approverName = approverFull.username;
          } else {
            approverName = `User #${req.approved_by}`;
          }

          const roleName = approverFull?.roles?.[0]?.name || approverFull?.roles?.[0]?.role_name;
          const approverDetails = roleName || approverData?.department?.department_name || approverData?.job_role || '';

          return {
            ...req,
            approverName,
            approverDetails,
            employee: employeeData,
            employeeName: employeeData ? `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim() : 'Unknown',
            employeeId: employeeData?.employee_id || ''
          };
        });

        setRequests(mappedData);
        if (isEmployee) {
          setLeaves(mappedData);
        }
      }

      if (historyRes.status === 'fulfilled') {
        // Map history data as well
        const historyData = historyRes.value.data;
        const hData = Array.isArray(historyData) ? historyData : (historyData?.data || []);

        // Ensure all users in history are also in userMap
        const historyUserIds = [...new Set(hData.map((req: any) => req.user_id || req.approved_by).filter(Boolean))];
        const missingUserIds = historyUserIds.filter(id => !userMap[id as number]);

        if (missingUserIds.length > 0) {
          await Promise.allSettled(
            missingUserIds.map(async (uid: any) => {
              try {
                const emp = await getEmployee(uid);
                userMap[uid] = emp;
              } catch (e) {
                console.error(`Failed to fetch user ${uid}`);
              }
            })
          );
        }

        const mappedHistory = hData.map((req: any) => {
          const approverFull = userMap[req.approved_by];
          const employeeFull = userMap[req.user_id];
          const approverData = approverFull?.details;
          const employeeData = employeeFull?.details;

          let approverName: string;
          if (!req.approved_by) {
            approverName = 'Pending';
          } else if (approverData?.first_name || approverData?.last_name) {
            approverName = `${approverData.first_name || ''} ${approverData.last_name || ''}`.trim();
          } else if (approverFull?.username) {
            approverName = approverFull.username;
          } else {
            approverName = `User #${req.approved_by}`;
          }

          return {
            ...req,
            approverName,
            employee: employeeData,
            employeeName: employeeData ? `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim() : 'Unknown',
            employeeId: employeeData?.employee_id || ''
          };
        });

        setLeaveHistory(mappedHistory);
      }

      if (statsRes.status === 'fulfilled') setLeaveStats(statsRes.value.data);
      if (balanceRes.status === 'fulfilled') setLeaveBalances(balanceRes.value.data || []);
      if (attStatsRes.status === 'fulfilled') setAttendanceStats(attStatsRes.value.data);

      if (!isEmployee) {
        try {
          const empData = await getEmployees({ limit: 1000 });
          setEmployees(Array.isArray(empData) ? empData : []);
        } catch (_e) { /* non-critical */ }
      }

      if (!isEmployee) {
        // Only pass status if it's not "All" to allow the backend to return everything
        const teamLogs = await getTeamAttendanceLogs({
          startDate: attendanceDate || undefined,
          endDate: attendanceEndDate || undefined,
          status: attendanceStatus === "All" ? undefined : attendanceStatus
        });
        setAttendance(teamLogs.data || []);
      } else {
        if (myAttendanceRes.status === 'fulfilled') setAttendance(myAttendanceRes.value.data || []);
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
      toast.error("Failed to load leave information. Please try again");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [attendanceDate, attendanceEndDate, attendanceStatus]);

  useEffect(() => {
    if (editingPolicy) {
      setPolicyFormFields({
        is_paid: editingPolicy.is_paid ? "Paid" : (editingPolicy.leave_category === 'paid' ? "Paid" : "Unpaid"),
        color: editingPolicy.color || editingPolicy.leave_color || "primary",
        document_url: editingPolicy.document_url || "",
      });
    } else {
      setPolicyFormFields({ is_paid: "Paid", color: "primary", document_url: "" });
    }
  }, [editingPolicy]);

  // Real-time synchronization via WebSocket events
  const { lastEvent } = useNotifications();
  useEffect(() => {
    const syncEvents = ['leave_request', 'leave_status', 'leave_action_processed', 'notification_update'];
    if (lastEvent && syncEvents.includes(lastEvent.event)) {
      console.log('Real-time leave update triggered by:', lastEvent.event);
      fetchData();
    }
  }, [lastEvent]);
  // Handle deep linking/scrolling
  useEffect(() => {
    if (id && (requests.length > 0 || leaves.length > 0)) {
      const scrollTimeout = setTimeout(() => {
        const element = requestRefs.current[id];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(scrollTimeout);
    }
  }, [id, requests, leaves]);

  
  const processedRequests = useMemo(() => {
    let result = [...requests];
    
    // Status Filter
    if (requestFilterStatus !== "All") {
      result = result.filter(r => {
        const statusUpper = (r.status || "").toUpperCase();
        if (requestFilterStatus.toUpperCase() === 'PENDING') {
          return statusUpper === 'PENDING' || statusUpper === 'EXTENDED_APPROVAL';
        }
        return statusUpper === requestFilterStatus.toUpperCase();
      });
    }
    
    // Search Filter
    if (requestSearch) {
      const q = requestSearch.toLowerCase();
      result = result.filter(r => {
        const leaveType = (r.leave_policy?.leave_type || r.leave_policy?.name || r.leave_type || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        return leaveType.includes(q) || reason.includes(q);
      });
    }
    
    // Sort
    result.sort((a, b) => {
      if (requestSort === "Newest applied") {
        return new Date(b.applied_at || b.created_at || 0).getTime() - new Date(a.applied_at || a.created_at || 0).getTime();
      } else if (requestSort === "Oldest applied") {
        return new Date(a.applied_at || a.created_at || 0).getTime() - new Date(b.applied_at || b.created_at || 0).getTime();
      } else if (requestSort === "Longest duration") {
        const durA = a.duration || a.days || 0;
        const durB = b.duration || b.days || 0;
        return durB - durA;
      }
      return 0;
    });
    
    return result;
  }, [requests, requestFilterStatus, requestSearch, requestSort]);

  const requestStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: requests.length, Pending: 0, Approved: 0, Rejected: 0, Withdrawn: 0 };
    requests.forEach(r => {
      let status = (r.status || "").toLowerCase();
      if (status === 'extended_approval') {
        status = 'pending';
      }
      status = status.charAt(0).toUpperCase() + status.slice(1);
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [requests]);

  const handleWithdrawRequest = async (id: string) => {
    if(window.confirm("Withdraw this leave request?")) {
      try {
        await handleLeaveAction(id, 'WITHDRAWN');
        toast.success("Leave request withdrawn");
        fetchData();
      } catch (error) {
        toast.error("Failed to withdraw leave request");
      }
    }
  };

  const handleEditRequest = (request: any) => {
    setLeaveRequestData({
      id: request.id?.toString() || "",
      leave_policy_id: request.leave_policy_id?.toString() || "",
      start_date: request.start_date ? new Date(request.start_date).toISOString().split('T')[0] : "",
      end_date: request.end_date ? new Date(request.end_date).toISOString().split('T')[0] : "",
      reason: request.reason || "",
      attachment_url: request.attachment_url || ""
    });
    setShowLeaveRequestFullPage(true);
  };

  const handleViewDetails = (request: any) => {
    // TODO: implement view details modal
    toast.info("View details coming soon");
  };


  const filteredAttendance = useMemo(() => {
    return attendance.filter((record: any) => {
      // 1. Employee Name Matching
      const firstName = (record.user?.details?.first_name || '').toLowerCase();
      const lastName = (record.user?.details?.last_name || '').toLowerCase();
      const name = `${firstName} ${lastName}`.trim() || (record.employeeName || 'Unknown').toLowerCase();

      // 2. Department Matching
      const dept = (record.user?.details?.department?.department_name || record.department || 'Unassigned').toLowerCase();

      // 3. Date Matching
      const recordDateStr = record.date ? new Date(record.date).toISOString().split('T')[0] : "";

      // 4. Strict AND Filtering (All conditions must be met)
      const matchesSearch = !attendanceSearch || name.includes(attendanceSearch.toLowerCase());

      // Normalize status names for comparison (handle Half Day vs HALF_DAY)
      const recordStatus = record.status?.toUpperCase()?.replace("_", " ");
      const filterStatus = attendanceStatus.toUpperCase();
      const matchesStatus = attendanceStatus === "All" || recordStatus === filterStatus;

      const matchesDept = attendanceDept === "All" || dept === attendanceDept.toLowerCase();
      const matchesStartDate = !attendanceDate || (recordDateStr && recordDateStr >= attendanceDate);
      const matchesEndDate = !attendanceEndDate || (recordDateStr && recordDateStr <= attendanceEndDate);

      return matchesSearch && matchesStatus && matchesDept && matchesStartDate && matchesEndDate;
    });
  }, [attendance, attendanceSearch, attendanceStatus, attendanceDept, attendanceDate, attendanceEndDate]);

  const handleApprove = async (id: string) => {
    try {
      await handleLeaveAction(id, 'APPROVED');
      toast.success("Leave request approved");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve leave request");
    }
  };

  const handleReject = (id: string) => setRejectRequestId(id);

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectRequestId) return;
    try {
      await handleLeaveAction(rejectRequestId, 'REJECTED', reason);
      toast.success("Leave request rejected");
      setRejectRequestId(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to reject leave request");
    }
  };

  const getAppliedLeaveDays = () => {
    const { start_date, end_date } = leaveRequestData;
    if (!start_date || !end_date) return 0;
    try {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
      
      let count = 0;
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat/Sun
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    } catch (e) {
      return 0;
    }
  };

  const getSelectedPolicyBalance = () => {
    if (!leaveRequestData.leave_policy_id) return null;
    const balances = getDynamicBalances();
    const selected = balances.find(b => b.leave_policy_id.toString() === leaveRequestData.leave_policy_id.toString());
    return selected ? selected.balance : null;
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const response = await axiosInstance.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data?.success) {
        setLeaveRequestData(prev => ({
          ...prev,
          attachment_url: response.data.url
        }));
        toast.success("File uploaded successfully");
      } else {
        toast.error("Failed to upload file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during file upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const appliedDays = getAppliedLeaveDays();
    const selectedBalance = getSelectedPolicyBalance();
    const isOverQuota = selectedBalance !== null && appliedDays > selectedBalance;
    const extraDays = isOverQuota ? (appliedDays - selectedBalance) : 0;

    if (isOverQuota && !overQuotaReason.trim()) {
      toast.error("Please provide justification for exceeding leave balance.");
      return;
    }
    const selectedPolicy = policies.find(p => String(p.id) === String(leaveRequestData.leave_policy_id));
    if (selectedPolicy?.requires_document && !leaveRequestData.attachment_url) {
      toast.error("Document upload is required for this leave type.");
      return;
    }
    try {
      const selectedPolicy = getDynamicBalances().find(b => b.leave_policy_id.toString() === leaveRequestData.leave_policy_id.toString());
      await applyLeave({
        ...leaveRequestData,
        id: leaveRequestData.id ? Number(leaveRequestData.id) : undefined,
        leave_policy_id: Number(leaveRequestData.leave_policy_id),
        leaveType: selectedPolicy?.policy_name || "Annual Leave",
        startDate: leaveRequestData.start_date,
        endDate: leaveRequestData.end_date,
        requestedDays: appliedDays,
        availableQuota: selectedBalance,
        isOverQuota,
        extraDaysRequested: extraDays,
        reason: isOverQuota ? overQuotaReason : leaveRequestData.reason,
        overQuotaReason: isOverQuota ? overQuotaReason : undefined
      });
      toast.success("Leave application submitted successfully");
      setShowLeaveRequestFullPage(false);
      setLeaveRequestData({
        id: "",
        leave_policy_id: "",
        start_date: "",
        end_date: "",
        reason: "",
        attachment_url: ""
      });
      setOverQuotaReason("");
      fetchData();
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || "Failed to submit leave application";
      toast.error(errMsg);
    }
  };

  const [isPolicyUploading, setIsPolicyUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      await uploadPolicyFile(selected);
    }
  };

  const handlePolicyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      await uploadPolicyFile(selected);
    }
  };

  const uploadPolicyFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsPolicyUploading(true);
    try {
      const response = await axiosInstance.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data?.success) {
        setPolicyFormFields(prev => ({
          ...prev,
          document_url: response.data.url
        }));
        toast.success("Policy document uploaded successfully");
      } else {
        toast.error("Failed to upload policy document");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during file upload");
    } finally {
      setIsPolicyUploading(false);
    }
  };

  const handlePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      policy_name: formData.get('name'),
      days_per_year: parseInt(formData.get('total_days') as string),
      carry_forward_days: parseInt(formData.get('carry_forward') as string) || 0,
      accrual_rate: Number(formData.get('accrual_rate')) || 0,
      leave_category: policyFormFields.is_paid === 'Paid' ? 'paid' : 'unpaid',
      leave_color: policyFormFields.color,
      description: formData.get('description'),
      requires_document: formData.get('requires_document') === 'on',
      document_url: policyFormFields.document_url || null,
      leave_type: (formData.get('name') as string)?.split(' ')?.[0] || 'General' // Default leave type
    };

    try {
      if (editingPolicy) {
        await updateLeavePolicy(editingPolicy.id, data);
        toast.success("Leave policy updated successfully");
      } else {
        await createLeavePolicy(data);
        toast.success("Leave policy created successfully");
      }
      setShowPolicyModal(false);
      setShowPolicyFullPage(false);
      setEditingPolicy(null);
      setPolicyFormFields({ is_paid: "Paid", color: "primary", document_url: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to save leave policy");
    }
  };

  // const handleAttendanceAction = async (action: 'check-in' | 'check-out') => {
  //   try {
  //     if (action === 'check-in') {
  //       await checkIn({ location: 'Remote' });
  //       toast.success("Checked in successfully");
  //     } else {
  //       await checkOut({ location: 'Remote' });
  //       toast.success("Checked out successfully");
  //     }
  //     fetchData();
  //   } catch (error) {
  //     toast.error(`Failed to ${action}`);
  //   }
  // };

  const getLeaveTypeColor = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes('annual') || t.includes('vacation')) return "bg-primary/10 text-primary border-primary-200 dark:border-primary-800";
    if (t.includes('sick')) return "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50";
    if (t.includes('casual') || t.includes('personal')) return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50";
    if (t.includes('maternity') || t.includes('paternity')) return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50";
    return "bg-muted text-foreground border-border";
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case "PRESENT": return "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300";
      case "LATE": return "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300";
      case "HALF DAY":
      case "HALF_DAY": return "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300";
      case "ABSENT": return "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50";
      case "APPROVED": return "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300";
      case "PENDING": return "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300";
      case "REJECTED": return "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50";
      default: return "bg-muted text-foreground";
    }
  };

  const calculateDynamicWorkHours = (checkIn: string | null) => {
    if (!checkIn) return "0.0";
    try {
      const start = new Date(checkIn);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));
      return diffHrs.toFixed(1);
    } catch (e) {
      return "0.0";
    }
  };

  const isTimeAttendancePage = location.pathname.includes("/time-attendance");
  const tabs = isTimeAttendancePage
    ? [
      { id: "attendance", label: isEmployee ? "My Attendance" : "Attendance Tracking" }
    ]
    : [
      ...(!isEmployee ? [{ id: "statistics", label: "Statistics" }] : []),
      { id: "requests", label: isEmployee ? "My Leave Requests" : "Leave Requests" },
      { id: "history", label: isEmployee ? "My Leave History" : "Leave History" },
      ...(!isEmployee ? [{ id: "policies", label: "Leave Types" }] : []),
    ];

  const filteredHistory = leaveHistory.filter(leave => {
    const fullName = `${leave.user?.details?.first_name || ''} ${leave.user?.details?.last_name || ''}`.trim() || leave.employeeName || 'N/A';
    const employeeId = leave.user?.details?.employee_id || leave.employeeId || "";

    const matchesEmployee = (selectedEmployee === "All Employees" || fullName === selectedEmployee);
    const matchesSearch = (fullName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
      employeeId.toLowerCase().includes(searchEmployee.toLowerCase()));
    const matchesPolicy = (selectedLeaveType === "All" || leave.leave_policy_id.toString() === selectedLeaveType);
    const matchesStatus = (selectedStatus === "All" || leave.status === selectedStatus);

    return matchesEmployee && matchesSearch && matchesPolicy && matchesStatus;
  });

  const getDynamicBalances = () => {
    return policies.map((policy: any) => {
      const totalDays = Number(policy.days_per_year || 0);

      // Calculate used days from approved leaves
      const usedDays = leaves
        .filter((l: any) => l.status?.toUpperCase() === 'APPROVED' && l.leave_policy_id == policy.id)
        .reduce((sum: number, l: any) => sum + Number(l.duration || l.days || 0), 0);

      const balance = Math.max(0, totalDays - usedDays);

      return {
        leave_policy_id: policy.id,
        policy_name: policy.policy_name,
        total_days: totalDays,
        used: usedDays,
        balance: balance,
        color: policy.leave_color || 'blue'
      };
    }).filter(b => b.total_days > 0);
  };

  const handleCloseForm = () => {
    setShowLeaveRequestFullPage(false);
    setLeaveRequestData({
      id: "",
      leave_policy_id: "",
      start_date: "",
      end_date: "",
      reason: "",
      attachment_url: ""
    });
    setOverQuotaReason("");
  };

  if (showLeaveRequestFullPage) {
    const appliedDays = getAppliedLeaveDays();
    const selectedBalance = getSelectedPolicyBalance();
    const isOverQuota = selectedBalance !== null && appliedDays > selectedBalance;

    return (
      <div className="space-y-6">
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseForm}
            className="icon-circle-btn"
          >
            <ArrowLeft />
          </button>
          <div>
            <h2 className="text-xl font-medium text-foreground leading-none">Apply for Leave</h2>
            <p className="text-sm text-muted-foreground mt-1">Submit your request for time off</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Form Area */}
          <div className="w-full lg:w-1/2 space-y-6">
            <Card className="border border-border shadow-sm overflow-hidden">

              <div className="h-1.5 bg-primary w-full"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Leave Application Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleApplyLeaveSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Select
                        value={leaveRequestData.leave_policy_id}
                        onChange={(val) => setLeaveRequestData({ ...leaveRequestData, leave_policy_id: val })}
                        placeholder="Select a leave type"
                        label="Leave Type"
                        required
                        options={[
                          { value: "", label: "Select a leave type" },
                          ...getDynamicBalances().map((b: any) => ({ value: String(b.leave_policy_id), label: `${b.policy_name} • ${b.balance} days available` }))
                        ]}
                      />
                      {leaveRequestData.leave_policy_id && (
                        <div className="mt-1.5 text-xs text-primary font-semibold">
                          Available: {getSelectedPolicyBalance() !== null ? `${getSelectedPolicyBalance()} Days` : 'N/A'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Start Date <span className="text-red-500 font-normal">*</span>
                      </label>
                      <ModernDatePicker
                        value={leaveRequestData.start_date}
                        onChange={(val) => setLeaveRequestData({ ...leaveRequestData, start_date: val })}
                        minDate={todayStr}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        End Date <span className="text-red-500 font-normal">*</span>
                      </label>
                      <ModernDatePicker
                        value={leaveRequestData.end_date}
                        onChange={(val) => setLeaveRequestData({ ...leaveRequestData, end_date: val })}
                        minDate={leaveRequestData.start_date || todayStr}
                        required
                      />
                    </div>

                    {!isOverQuota && (
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Reason for Leave <span className="text-red-500 font-normal">*</span>
                        </label>
                        <textarea
                          value={leaveRequestData.reason}
                          onChange={(e) => setLeaveRequestData({ ...leaveRequestData, reason: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground resize-none"
                          placeholder="Please describe why you need this leave..."
                          required
                        />
                      </div>
                    )}

                    {(() => {
                      const selectedPolicy = policies.find(p => String(p.id) === String(leaveRequestData.leave_policy_id));
                      if (selectedPolicy?.requires_document) {
                        return (
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Supporting Document <span className="text-red-500 font-normal">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="leave-attachment"
                                disabled={isUploading}
                              />
                              <label
                                htmlFor="leave-attachment"
                                className={`flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {isUploading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                ) : (
                                  <Upload className="w-4 h-4 text-primary" />
                                )}
                                <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-300">
                                  {isUploading ? "Uploading..." : "Upload Document"}
                                </span>
                              </label>
                              {leaveRequestData.attachment_url && (
                                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Document Uploaded Successfully</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Only PDF, PNG, JPG/JPEG are allowed (Max 10MB).
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Dynamic Leave Balance Validation Messages */}
                    {(() => {
                      const appliedDays = getAppliedLeaveDays();
                      const selectedBalance = getSelectedPolicyBalance();

                      if (selectedBalance !== null && appliedDays > selectedBalance) {
                        const extraDays = appliedDays - selectedBalance;
                        return (
                          <>
                            <div className="md:col-span-2 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-300 text-xs flex flex-col gap-1 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="font-semibold flex items-center gap-1.5">
                                <span>⚠️ You are requesting <strong className="font-bold">{extraDays} extra days</strong> beyond your remaining balance of <strong className="font-bold">{selectedBalance} days</strong>.</span>
                              </div>
                            </div>
                            
                            <div className="md:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              <label className="text-sm font-medium text-foreground">
                                Special Approval / Reason for Exceeding Leave Balance <span className="text-red-500 font-normal">*</span>
                              </label>
                              <textarea
                                value={overQuotaReason}
                                onChange={(e) => setOverQuotaReason(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground resize-none"
                                placeholder="Please explain why you require additional days beyond your quota for manager review..."
                                required
                              />
                            </div>
                          </>
                        );
                      }

                      if (selectedBalance !== null && appliedDays > 0 && appliedDays <= selectedBalance) {
                        return (
                          <div className="md:col-span-2 p-3 bg-green-50/50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/50 rounded-lg text-green-700 dark:text-green-300 text-xs flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                            <span>This request is for <strong className="font-semibold">{appliedDays} days</strong>. You have <strong className="font-semibold">{selectedBalance} days</strong> available.</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-8 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-700 dark:hover:text-rose-300"
                      onClick={handleCloseForm}
                    >
                      Cancel
                    </Button>
                    {(() => {
                      return (
                        <Button
                          type="submit"
                          className="px-10 font-medium tracking-wide shadow-sm transition-all bg-primary hover:bg-primary/95 text-white shadow-primary-200"
                        >
                          Submit Application
                        </Button>
                      );
                    })()}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="w-full lg:w-1/2 space-y-4">
            <div className="p-6 bg-primary/10 border border-primary-100 dark:border-primary-900/50 rounded-sm flex items-start gap-4">
              <div className="p-2 bg-card rounded shadow-sm">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-900 dark:text-primary-200">What happens next?</p>
                <p className="text-xs text-primary/80 dark:text-primary-300/80 mt-1 leading-relaxed">
                  Your application will be routed to your direct manager for review. You will receive an email notification once a decision is made.
                </p>
              </div>
            </div>

            <Card className="border border-border shadow-sm mt-4">
              <CardHeader className="p-6 pb-0 border-b border-border">
                <CardTitle className="text-base font-medium text-foreground">Available Balance</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {getDynamicBalances().map((leave, idx) => (
                    <div
                      key={idx}
                      className={`px-2 py-1.5 border rounded-lg flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer group hover:shadow-sm ${leaveRequestData.leave_policy_id === leave.leave_policy_id.toString()
                        ? 'border-primary-200 bg-primary/10/50 ring-2 ring-primary/5'
                        : 'border-border bg-muted/30 hover:border-primary-100 hover:bg-card'
                        }`}
                      onClick={() => setLeaveRequestData({ ...leaveRequestData, leave_policy_id: leave.leave_policy_id.toString() })}
                    >
                      <p className="text-[9px] font-medium text-muted-foreground capitalize">{leave.policy_name}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-medium text-primary leading-none">{leave.balance}</span>
                        <span className="text-[7.5px] font-medium text-muted-foreground capitalize">days</span>
                      </div>
                      <div className="w-8 h-0.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary-500 transition-all duration-500"
                          style={{ width: `${leave.total_days > 0 ? (leave.used / leave.total_days) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="p-6 border border-dashed border-border dark:border-border/60 rounded-sm mt-6">
              <h4 className="text-[12px] font-medium text-muted-foreground mb-3">Policy Reminders</h4>
              <ul className="space-y-2.5">
                {[
                  "Ensure all handovers are documented before leave.",
                  "Sick leave for >2 days requires a certificate.",
                  "Apply planed leaves 15 days in advance."
                ].map((text, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0"></div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (showPolicyFullPage) {
    return (
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCancelPolicyModalConfirm(true)}
            className="icon-circle-btn"
          >
            <ArrowLeft />
          </button>
          <div>
            <h2 className="text-xl font-medium text-foreground leading-none">
              {editingPolicy ? "Update Leave Type" : "Create New Leave Type"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Configure leave entitlement and rules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border shadow-sm overflow-hidden">
              <div className="h-1.5 bg-primary w-full"></div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit className="w-5 h-5 text-primary" />
                  Leave Type Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form key={editingPolicy ? editingPolicy.id : 'new'} className="space-y-6" onSubmit={handlePolicySubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium text-foreground">
                        Leave Type Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingPolicy?.policy_name || editingPolicy?.name || ""}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                        placeholder="e.g., Annual Vacation"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Total Days per Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="total_days"
                        defaultValue={editingPolicy?.days_per_year || editingPolicy?.total_days || editingPolicy?.totalDays || ""}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                        placeholder="20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Carry Forward Limit
                      </label>
                      <input
                        type="number"
                        name="carry_forward"
                        defaultValue={editingPolicy?.carry_forward_days !== undefined ? editingPolicy?.carry_forward_days : (editingPolicy?.carry_forward || editingPolicy?.carryForward || 0)}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                        placeholder="5"
                      />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium text-foreground">
                        Accrual Rate
                      </label>
                      <input
                        type="text"
                        name="accrual_rate"
                        defaultValue={editingPolicy?.accrual_rate || editingPolicy?.accrualRate || ""}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                        placeholder="e.g., 1.67 days/month"
                      />
                    </div>

                    <div>
                      <Select
                        value={policyFormFields.is_paid}
                        onChange={(val) => setPolicyFormFields(prev => ({ ...prev, is_paid: val }))}
                        label="Leave Category"
                        required
                        options={[
                          { value: "Paid", label: "Paid Leave" },
                          { value: "Unpaid", label: "Unpaid Leave" },
                        ]}
                      />
                    </div>

                    <div>
                      <Select
                        value={policyFormFields.color}
                        onChange={(val) => setPolicyFormFields(prev => ({ ...prev, color: val }))}
                        label="Theme Color"
                        options={[
                          { value: "blue", label: "Ocean Blue" },
                          { value: "primary", label: "primary Sky" },
                          { value: "green", label: "Forest Green" },
                          { value: "purple", label: "Royal Purple" },
                          { value: "red", label: "Ruby Red" },
                          { value: "pink", label: "Sunset Pink" },
                          { value: "gray", label: "Steel Gray" },
                        ]}
                      />
                    </div>

                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Description
                      </label>
                      <textarea
                        name="description"
                        defaultValue={editingPolicy?.description || ""}
                        rows={3}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground resize-none"
                        placeholder="Provide details about the eligibility and rules for this policy..."
                      />
                    </div>

                    <div className="flex items-center gap-2 lg:col-span-2 pt-2">
                      <input
                        type="checkbox"
                        id="requires_document"
                        name="requires_document"
                        defaultChecked={editingPolicy?.requires_document}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer dark:bg-zinc-800 dark:border-zinc-700"
                      />
                      <label htmlFor="requires_document" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                        Require Document Upload for Leave Application
                      </label>
                    </div>

                    <div className="lg:col-span-2 space-y-2 border-t border-border pt-4 mt-2">
                      <label className="text-sm font-bold text-foreground mb-1">
                        Official Policy Document (Optional)
                      </label>
                      
                      {!policyFormFields.document_url ? (
                        <div 
                          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            dragActive ? "border-primary bg-primary/5" : "border-slate-300 dark:border-slate-600 bg-muted/50 hover:bg-muted/50"
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => policyFileInputRef.current?.click()}
                        >
                          <input 
                            ref={policyFileInputRef}
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={handlePolicyFileChange}
                            disabled={isPolicyUploading}
                          />
                          {isPolicyUploading ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                          ) : (
                            <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                          )}
                          <div className="text-foreground font-semibold text-sm mb-0.5">
                            {isPolicyUploading ? "Uploading file..." : "Drag and drop file here, or click to browse"}
                          </div>
                          <div className="text-muted-foreground text-[11px]">Supported formats: PDF, DOC, DOCX, PNG, JPG (Max 10MB)</div>
                        </div>
                      ) : (
                        <div className="border border-border rounded-lg bg-muted/50 p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                          <div className="absolute top-3 right-3 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(policyFormFields.document_url, '_blank');
                              }}
                              className="p-1.5 bg-card border border-border text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all shadow-sm"
                              title="Preview Document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                setPolicyFormFields(prev => ({ ...prev, document_url: "" }));
                              }}
                              className="p-1.5 bg-card border border-border text-rose-500 hover:text-rose-750 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all shadow-sm"
                              title="Remove Document"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Clean Document Icon Box */}
                          <div className="w-24 h-32 bg-card border border-border shadow-sm rounded-lg mb-4 flex flex-col items-center justify-center relative group-hover:shadow-sm transition-shadow overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl"></div>
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center border border-primary/20">
                              <FileText className="w-6 h-6" />
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <h4 className="text-[12px] font-medium text-foreground mb-0.5 truncate max-w-xs">
                              {policyFormFields.document_url.split('/').pop()}
                            </h4>
                            <p className="text-xs font-medium text-muted-foreground">
                              Official Policy Document Attachment
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-8 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => setShowCancelPolicyModalConfirm(true)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="px-10 bg-primary hover:bg-primary/95 text-white font-medium tracking-wide shadow-sm shadow-primary-200 transition-all">
                      {editingPolicy ? "Update Type" : "Save Type"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 rounded-sm flex items-start gap-4">
              <div className="p-2 bg-card rounded shadow-sm text-orange-600 dark:text-orange-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Admin Pro-tip</p>
                <p className="text-xs text-orange-800/80 dark:text-orange-300/80 mt-1 leading-relaxed">
                  Leave types defined here will immediately apply to all employees. Users can track their respective balances in the 'Leave Management' dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Reference Column */}
          <div className="space-y-6">
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                  Active Leave Types
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {policies.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-muted rounded-sm border border-border">
                    <div className={`w-2 h-2 rounded-full bg-${p.leave_color}-500`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{p.policy_name}</p>
                      <p className="text-xs text-muted-foreground">{p.days_per_year} Days / Year</p>
                    </div>
                  </div>
                ))}
                {policies.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No leave types created yet.</p>
                )}
              </CardContent>
            </Card>

            <div className="p-5 border border-dashed border-border dark:border-border/60 rounded-sm">
              <h4 className="text-[12px] font-medium text-muted-foreground mb-3 whitespace-nowrap">Governance Guidelines</h4>
              <ul className="space-y-2.5">
                {[
                  "Paid leaves should typically be > 10 days.",
                  "Define color codes systematically (e.g., medical = red).",
                  "Description should mention who can approve."
                ].map((text, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0"></div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={showCancelPolicyModalConfirm}
          title={editingPolicy ? "Discard Update Leave Type Changes?" : "Discard Leave Type Changes?"}
          message="Are you sure you want to cancel? Any leave type modifications entered in this form will be discarded."
          confirmLabel="Discard Changes"
          cancelLabel="Keep Editing"
          confirmColor="red"
          onConfirm={() => {
            setShowCancelPolicyModalConfirm(false);
            setShowPolicyFullPage(false);
            setShowPolicyModal(false);
            setEditingPolicy(null);
            setPolicyFormFields({ is_paid: "Paid", color: "primary", document_url: "" });
          }}
          onCancel={() => setShowCancelPolicyModalConfirm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            {isTimeAttendancePage ? <Clock className="w-6 h-6 sm:w-7 sm:h-7" /> : <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7" />}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {isTimeAttendancePage ? "Time & Attendance" : "Leave Management"}
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              {isTimeAttendancePage
                ? "Track daily clock-in/out records, work hours, and team attendance"
                : "Manage leave applications, track history, and configure policies"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {activeTab === "policies" && (isSuperAdmin || isAdmin) && !isSelfView && (
            <button
              onClick={() => {
                setEditingPolicy(null);
                setPolicyFormFields({ is_paid: "Paid", color: "primary", document_url: "" });
                setShowPolicyFullPage(true);
              }}
              className="px-4 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-[13px] font-bold flex items-center gap-2 shadow-sm shadow-primary-500/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Leave Type
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Actions Row */}
      {tabs.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border gap-4 mb-6">
          <nav className="flex gap-6 overflow-x-auto max-w-full pb-0 [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              
              let IconComponent = CalendarIcon;
              if (tab.id === "statistics") IconComponent = BarChart3;
              else if (tab.id === "requests") IconComponent = CalendarDays;
              else if (tab.id === "history") IconComponent = History;
              else if (tab.id === "policies") IconComponent = Tags;
              else if (tab.id === "attendance") IconComponent = Clock;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group px-1 py-3.5 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${isActive ? "text-primary border-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <IconComponent className={`w-4 h-4 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          {isEmployee && activeTab === "requests" && (
            <button
              onClick={() => setShowLeaveRequestFullPage(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-[13px] font-bold flex items-center gap-1.5 shadow-sm shadow-primary-500/20 transition-all mb-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Request Leave
            </button>
          )}
        </div>
      )}
      {activeTab === "requests" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Header and Requests */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border shadow-sm p-6 sm:p-8 space-y-6">
            
            
            {/* Header with Title and Request Button aligned horizontally */}
            <div className="flex flex-col gap-5 mb-2">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-['Space_Grotesk'] text-[20px] font-bold text-foreground leading-tight">
                      {isEmployee ? "My Leave Requests" : "Pending Leave Requests"}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[13px] font-['Inter']">
                      <span className="text-muted-foreground">{requests.length} request{requests.length !== 1 && 's'}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-amber-500 font-semibold">
                        {requestStatusCounts['Pending'] || 0} pending review
                      </span>
                    </div>
                  </div>
                </div>
                
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full max-w-[400px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search reason or type..." 
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all font-['Inter']"
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Filter Button & Popover Modal */}
                  {(() => {
                    const hasActiveFilter = requestSort !== "Newest applied";
                    return (
                      <div className="flex items-center gap-2 relative">
                        <button
                          type="button"
                          onClick={() => setShowLeaveRequestFilters(!showLeaveRequestFilters)}
                          className={`toolbar-filter-btn-with-text relative ${showLeaveRequestFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                          title="Sort & Filter"
                        >
                          {showLeaveRequestFilters ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 18 18"
                              aria-labelledby="CollapseCloseIconTitle"
                              role="graphics-symbol img"
                              fill="none"
                              className="!text-blue-600 dark:!text-blue-400 w-4 h-4"
                            >
                              <title id="CollapseCloseIconTitle">Collapse Close Icon</title>
                              <g>
                                <path
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
                              className="w-4 h-4 text-foreground"
                            >
                              <path d="M15.8,2H6.9C6.7,0.7,5.4-0.2,4,0.1C3,0.3,2.2,1,2,2H0.2C0.1,2,0,2.1,0,2.3v0.5 C0,2.9,0.1,3,0.2,3H2C2.3,4.4,3.6,5.2,5,5c1-0.2,1.8-1,1.9-2h8.8C15.9,3,16,2.9,16,2.8V2.3C16,2.1,15.9,2,15.8,2z M4.5,4 C3.7,4,3,3.3,3,2.5S3.7,1,4.5,1S6,1.7,6,2.5S5.3,4,4.5,4z" />
                              <path d="M15.8,12H8.9C8.7,10.7,7.4,9.8,6,10.1c-1,0.2-1.8,1-1.9,1.9H0.2C0.1,12,0,12.1,0,12.3v0.5 C0,12.9,0.1,13,0.2,13h3.8C4.3,14.4,5.6,15.2,7,15c1-0.2,1.8-1,1.9-1.9h6.8c0.1,0,0.2-0.1,0.2-0.2v-0.5C16,12.1,15.9,12,15.8,12z M6.5,14C5.7,14,5,13.3,5,12.5S5.7,11,6.5,11S8,12.5S7.3,14,6.5,14z" />
                              <path d="M0,7.3v0.5C0,7.9,0.1,8,0.2,8h8.8c0.3,1.4,1.6,2.2,2.9,1.9c1-0.2,1.8-1,1.9-1.9h1.8 C15.9,8,16,7.9,16,7.8V7.3C16,7.1,15.9,7,15.8,7h-1.8c-0.3-1.3-1.6-2.2-2.9-1.9C10,5.3,9.2,6,9.1,7H0.2C0.1,7,0,7.1,0,7.3z M10,7.5 C10,6.7,10.7,6,11.5,6S13,6.7,13,7.5S12.3,9,11.5,9S10,8.3,10,7.5z" />
                            </svg>
                          )}
                          Filter
                          {hasActiveFilter && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                          )}
                        </button>

                        {/* Filter Dropdown Popover */}
                        {showLeaveRequestFilters && (
                          <div className="absolute right-0 top-full mt-2 w-[300px] bg-card rounded-xl shadow-xl border border-border p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                              <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-primary" />
                                <span className="text-sm font-bold text-foreground">Sort & Filter</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setRequestSort("Newest applied")}
                                className="text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Sort Order</label>
                                <Select
                                  value={requestSort}
                                  onChange={setRequestSort}
                                  options={[
                                    { value: "Newest applied", label: "Newest applied" },
                                    { value: "Oldest applied", label: "Oldest applied" },
                                    { value: "Longest duration", label: "Longest duration" },
                                  ]}
                                />
                              </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-border flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => setShowLeaveRequestFilters(false)}
                                className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Grid / List View Toggle */}
                  <div className="p-1 rounded-lg flex items-center h-10">
                    <button 
                      onClick={() => setRequestView('card')}
                      className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${requestView === 'card' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setRequestView('compact')}
                      className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${requestView === 'compact' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center overflow-x-auto w-full hide-scrollbar gap-6 mt-4 border-b border-border dark:border-border/40 pb-0">
                {['All', 'Pending', 'Approved', 'Rejected', 'Withdrawn'].map(status => {
                  const isActive = requestFilterStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setRequestFilterStatus(status)}
                      className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                        isActive 
                        ? 'text-primary border-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{status}</span>
                      <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {requestStatusCounts[status] || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pending Requests Cards */}
            <div className="border-none shadow-none mt-4">
              {processedRequests.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-muted/20 rounded-lg border border-dashed border-border dark:border-border/50">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1 font-['Inter']">No requests match this filter.</p>
                  <p className="text-xs text-muted-foreground font-['Inter']">Try clearing the search or picking another tab.</p>
                  {(requestSearch || requestFilterStatus !== 'All') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 h-8"
                      onClick={() => { setRequestSearch(''); setRequestFilterStatus('All'); }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : requestView === 'compact' ? (
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/80 hover:bg-transparent">
                        {!isEmployee && <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Employee</th>}
                        <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Leave Type</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Duration</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Dates</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Applied On</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Doc</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-black tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {processedRequests.map((request) => {
                        const leaveType = request.leave_policy?.leave_type || request.leave_policy?.name || request.leave_type || "-";
                        const duration = request.duration || request.days || 0;
                        const statusUpper = (request.status || "").toUpperCase();
                        return (
                          <tr key={request.id} className="hover:bg-muted/50 transition-colors">
                            {!isEmployee && (
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">
                                {request.employeeName || "Unknown"}
                              </td>
                            )}
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">{leaveType}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{duration} {duration === 1 ? 'day' : 'days'}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {request.start_date ? new Date(request.start_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "-"}
                              {request.end_date ? ` – ${new Date(request.end_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}` : ""}
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {request.applied_at ? new Date(request.applied_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {request.attachment_url ? (
                                <a
                                  href={request.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                  </svg>
                                  View
                                </a>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                                (statusUpper === 'PENDING' || statusUpper === 'EXTENDED_APPROVAL') ? 'bg-amber-55/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900/40' :
                                statusUpper === 'APPROVED' ? 'bg-emerald-55/60 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-900/40' :
                                statusUpper === 'REJECTED' ? 'bg-rose-55/60 text-rose-700 border-rose-200/60 dark:bg-rose-950/30 dark:border-rose-900/40' :
                                'bg-slate-55/60 text-slate-700 border-slate-200/60 dark:bg-slate-900/30 dark:border-slate-800/40'
                              }`}>
                                {request.status === 'EXTENDED_APPROVAL' ? 'Extended Approval' : (request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase() : 'Pending')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isEmployee ? (
                                (statusUpper === 'PENDING' || statusUpper === 'EXTENDED_APPROVAL') ? (
                                  <div className="flex gap-1.5 justify-end">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditRequest(request); }} className="mini-icon-btn" title="Edit"><Edit /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleWithdrawRequest(request.id); }} className="mini-icon-btn" title="Withdraw"><Undo /></button>
                                  </div>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); handleViewDetails(request); }} className="mini-icon-btn" title="View Details"><Eye /></button>
                                )
                              ) : (
                                (statusUpper === 'PENDING' || statusUpper === 'EXTENDED_APPROVAL') && (
                                  <div className="flex gap-1.5 justify-end">
                                    <button onClick={(e) => { e.stopPropagation(); handleReject(request.id); }} className="mini-icon-btn-reject" title="Reject"><X /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }} className="mini-icon-btn-accept" title="Approve"><Check /></button>
                                  </div>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {processedRequests.map((request) => {
                  const leaveType = request.leave_policy?.leave_type || request.leave_policy?.name || request.leave_type || "-";
                  const duration = request.duration || request.days || 0;
                  const statusUpper = (request.status || "").toUpperCase();
                  
                  // Status Pill Config
                  let statusColor = "bg-muted/50 text-muted-foreground";
                  if (statusUpper === 'PENDING' || statusUpper === 'EXTENDED_APPROVAL') { statusColor = "bg-amber-500/20 text-amber-500"; }
                  else if (statusUpper === 'APPROVED') { statusColor = "bg-emerald-500/20 text-emerald-500"; }
                  else if (statusUpper === 'REJECTED') { statusColor = "bg-rose-500/20 text-rose-500"; }
                  else if (statusUpper === 'WITHDRAWN') { statusColor = "bg-slate-500/20 text-slate-400"; }

                  // Left edge color bar & icon color
                  let typeColorHex = "#64748b"; // default slate
                  let typeBgColorHex = "rgba(100, 116, 139, 0.2)";
                  const t = leaveType.toLowerCase();
                  if (t.includes('annual') || t.includes('vacation')) { typeColorHex = "#6366f1"; typeBgColorHex = "rgba(99, 102, 241, 0.15)"; }
                  else if (t.includes('sick') || t.includes('emergency')) { typeColorHex = "#e11d48"; typeBgColorHex = "rgba(225, 29, 72, 0.15)"; }
                  else if (t.includes('casual') || t.includes('personal')) { typeColorHex = "#059669"; typeBgColorHex = "rgba(5, 150, 105, 0.15)"; }
                  else if (t.includes('maternity') || t.includes('paternity')) { typeColorHex = "#d97706"; typeBgColorHex = "rgba(217, 119, 6, 0.15)"; }
                  else if (t.includes('work from home')) { typeColorHex = "#d97706"; typeBgColorHex = "rgba(217, 119, 6, 0.15)"; }

                  return (
                    <div
                      key={request.id}
                      ref={el => { requestRefs.current[request.id] = el; }}
                      className="group relative rounded-lg border border-border dark:border-border/40 bg-card hover:bg-muted/10 transition-all p-5 flex items-center justify-between gap-4 overflow-hidden"
                      onClick={() => !isEmployee && navigate(`/leave-history/${request.user_id}`)}
                    >
                      <div className="flex-1 min-w-0 pl-2">
                        <div className="flex flex-col gap-2">
                          
                          {/* Row 1: Icon, Title, Duration */}
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-sm flex shrink-0" style={{ backgroundColor: typeBgColorHex }}>
                               <div className="w-full h-full rounded-sm opacity-40" style={{ backgroundColor: typeColorHex }}></div>
                            </div>
                            <span className="font-bold text-foreground text-[15px] font-['Space_Grotesk'] tracking-tight">
                              {!isEmployee ? `${request.employeeName || 'Unknown'} - ${leaveType}` : leaveType}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                              {duration} {duration === 1 ? 'DAY' : 'DAYS'}
                            </span>
                          </div>

                          {/* Row 2: Dates, Applied, Status */}
                          <div className="flex items-center gap-4 text-sm font-['Inter'] flex-wrap">
                            <div className="font-mono text-[13px] font-medium text-foreground/90">
                              {request.start_date ? new Date(request.start_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "-"} 
                              {request.end_date ? ` – ${new Date(request.end_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}` : ""}
                            </div>
                            <div className="text-[13px] text-muted-foreground">
                              Applied <span className="font-mono font-medium text-foreground/80">{request.applied_at ? new Date(request.applied_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "-"}</span>
                            </div>
                            <div className={`flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusColor}`}>
                              {request.status === 'EXTENDED_APPROVAL' ? 'Extended Approval' : (request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase() : 'Pending')}
                            </div>
                          </div>

                          {/* Row 3: Reason */}
                          <div className="flex items-center gap-4 flex-wrap mt-1">
                            <div className="text-[13px] text-muted-foreground truncate max-w-xl">
                              {request.reason || "No reason provided."}
                            </div>
                            {request.attachment_url && (
                              <a
                                href={request.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold font-['Inter']"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                                Supporting Doc
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions: Right Side */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 pr-1">
                        {isEmployee ? (
                          <>
                            {(statusUpper === 'PENDING' || statusUpper === 'EXTENDED_APPROVAL') ? (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditRequest(request); }}
                                  className="mini-icon-btn"
                                  aria-label="Edit"
                                >
                                  <Edit />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleWithdrawRequest(request.id); }}
                                  className="mini-icon-btn"
                                  aria-label="Withdraw"
                                >
                                  <Undo />
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleViewDetails(request); }}
                                className="mini-icon-btn"
                                  aria-label="View Details"
                                >
                                  <Eye />
                              </button>
                            )}
                          </>
                        ) : (
                          (statusUpper === 'PENDING' || statusUpper === 'EXTENDED_APPROVAL') && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReject(request.id); }}
                                className="mini-icon-btn-reject"
                                title="Reject"
                                aria-label="Reject"
                              >
                                <X />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                                className="mini-icon-btn-accept"
                                title="Approve"
                                aria-label="Approve"
                              >
                                <Check />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-6">
            {isEmployee && (
              <>
                {/* My Leave Balance - Moved from Attendance */}
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-foreground">My Leave Balance</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {(() => {
                        const dynamicBalances = getDynamicBalances();
                        if (dynamicBalances.length === 0) {
                          return <p className="text-sm text-muted-foreground">No leave types assigned yet.</p>;
                        }
                        return dynamicBalances.map((leave, idx) => (
                          <div key={idx} className="p-4 bg-muted/40 rounded-lg border border-border/80">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-[13px] font-semibold text-foreground">{leave.policy_name}</h4>
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {leave.balance} days left
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-muted-foreground">Total: {leave.total_days}</span>
                                <span className="text-muted-foreground">Used: {leave.used}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-primary h-full rounded-full transition-all duration-500"
                                  style={{ width: `${leave.total_days > 0 ? (leave.used / leave.total_days) * 100 : 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* My Recent Leaves - Moved from Attendance */}
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-base font-semibold text-foreground">My Recent Leaves</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {leaveHistory.slice(0, 3).map((leave, idx) => (
                        <div key={idx} className="p-3 bg-muted/40 rounded-lg border border-border/80">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-xs text-foreground truncate max-w-[140px]">
                              {leave.leave_policy?.name || leave.leave_type || "Leave Request"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(leave.status)}`}>
                              {toTitleCase(leave.status)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{new Date(leave.start_date).toLocaleDateString()}</span>
                            <span>{leave.duration} days</span>
                          </div>
                        </div>
                      ))}
                      {leaveHistory.length === 0 && (
                        <p className="text-sm text-muted-foreground">No recent leave requests.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Leave Statistics */}
            {!isEmployee && (
              <div className="bg-card rounded-lg border border-border shadow-sm p-6 hover:shadow-sm transition-shadow">
                <h3 className="text-[16px] font-bold text-foreground mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Leave Statistics
                </h3>
                <div className="space-y-6">
                  {(() => {
                    const today = new Date();
                    const pendingCount = requests.filter(r => r.status === 'PENDING').length;
                    const currentMonth = today.getMonth();
                    const currentYear = today.getFullYear();
                    const approvedThisMonth = requests.filter(r => {
                      if (r.status !== 'APPROVED') return false;
                      const sd = new Date(r.start_date);
                      return sd.getMonth() === currentMonth && sd.getFullYear() === currentYear;
                    }).length;
                    let outToday = 0;
                    requests.forEach(r => {
                      if (r.status === 'APPROVED') {
                        const sd = new Date(r.start_date);
                        const ed = new Date(r.end_date);
                        sd.setHours(0, 0, 0, 0);
                        ed.setHours(23, 59, 59, 999);
                        if (today >= sd && today <= ed) {
                          outToday = 1;
                        }
                      }
                    });
                    const displayPending = isEmployee ? pendingCount : (leaveStats?.pending_requests || 0);
                    const displayApproved = isEmployee ? approvedThisMonth : (leaveStats?.approved_this_month || 0);
                    const displayOutToday = isEmployee ? outToday : (leaveStats?.out_today_count || 0);
                    return (
                      <>
                        <div className="group">
                          <div className="flex items-center justify-between text-[11px] font-semibold mb-2 uppercase tracking-wider text-muted-foreground group-hover:text-amber-600 transition-colors">
                            <span>Pending Requests</span>
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 font-bold">{displayPending}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, displayPending * 5)}%` }}></div>
                          </div>
                        </div>
                        <div className="group">
                          <div className="flex items-center justify-between text-[11px] font-semibold mb-2 uppercase tracking-wider text-muted-foreground group-hover:text-emerald-600 transition-colors">
                            <span>Approved This Month</span>
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 font-bold">{displayApproved}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, displayApproved * 25)}%` }}></div>
                          </div>
                        </div>
                        <div className="group">
                          <div className="flex items-center justify-between text-[11px] font-semibold mb-2 uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                            <span>Out Today</span>
                            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary-100 font-bold">{displayOutToday}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-primary-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, displayOutToday * 100)}%` }}></div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Upcoming Leaves */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 hover:shadow-sm transition-shadow">
              <h3 className="text-[16px] font-bold text-foreground mb-6 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-rose-500" />
                Upcoming Leaves
              </h3>
              <div>
                {(() => {
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);

                  const upcomingSource = isEmployee ? leaves : leaveHistory;
                  const upcomingLeaves = upcomingSource.filter(
                    (item: any) => item.start_date && new Date(item.start_date) > today && item.status === 'APPROVED'
                  );
                  upcomingLeaves.sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

                  const displayLeaves = upcomingLeaves.slice(0, 4); // Show top 4 upcoming

                  const formatDate = (date: any) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  if (displayLeaves.length === 0) {
                    return <p className="text-xs text-muted-foreground font-medium text-center py-5 bg-card rounded-lg border border-border shadow-sm">No Upcoming Leaves</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {displayLeaves.map((item: any, idx: number) => {
                        const leaveType = item.leave_policy?.leave_type || item.leave_policy?.name || item.leave_type || "-";
                        const sd = new Date(item.start_date);
                        const ed = new Date(item.end_date);
                        const dateDisplay = sd.getMonth() === ed.getMonth() && sd.getDate() !== ed.getDate()
                          ? `${formatDate(item.start_date)}–${ed.getDate()}`
                          : sd.getDate() === ed.getDate() && sd.getMonth() === ed.getMonth()
                            ? `${formatDate(item.start_date)}`
                            : `${formatDate(item.start_date)}–${formatDate(item.end_date)}`;

                        const name = isEmployee ? null : (item.employeeName && item.employeeName !== 'Unknown' ? item.employeeName : (item.user?.details ? `${item.user.details.first_name || ''} ${item.user.details.last_name || ''}`.trim() : 'Employee'));

                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-card shadow-sm border border-border rounded-lg hover:bg-muted/50 transition-colors">
                            {!isEmployee && (
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-sm shrink-0">
                                {(name || "E").split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              {!isEmployee && <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{name}</p>}
                              <div className={`flex items-center gap-1.5 ${!isEmployee ? 'mt-1' : ''}`}>
                                <span className={`font-bold text-foreground ${!isEmployee ? 'text-[11px]' : 'text-[13px]'}`}>{dateDisplay}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className={`text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate`}>{leaveType}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave History Tab */}
      {/* Leave History Tab */}
      {activeTab === "history" && (
        <div className="space-y-6 w-full min-w-0">
          {/* Employee Leave Summary */}
          {(() => {
            const currentYear = new Date().getFullYear();
            const sourceData = isEmployee ? leaves : leaveHistory;

            // Total leaves taken this year (approved only)
            const thisYearLeaves = sourceData.filter((l: any) => {
              const year = l.start_date ? new Date(l.start_date).getFullYear() : null;
              return year === currentYear && l.status === 'APPROVED';
            });
            const totalLeavesTaken = thisYearLeaves.reduce((sum: number, l: any) => sum + (l.duration || l.days || 0), 0);

            // Avg days per employee (unique employees from approved records this year)
            const uniqueEmployees = new Set(thisYearLeaves.map((l: any) => l.user_id));
            const avgDays = uniqueEmployees.size > 0 ? (totalLeavesTaken / uniqueEmployees.size).toFixed(1) : '0';

            // Most common leave type across all records
            const typeCounts: Record<string, number> = {};
            sourceData.forEach((l: any) => {
              const type = l.leave_policy?.leave_type || l.leave_policy?.name || l.leave_type;
              if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
            const totalRecords = sourceData.length;
            const mostCommonPct = mostCommonType && totalRecords > 0
              ? Math.round((mostCommonType[1] / totalRecords) * 100)
              : 0;

            // Employees out today
            const outTodayCount = sourceData.filter((l: any) => {
              if (l.status !== 'APPROVED') return false;
              if (!l.start_date || !l.end_date) return false;
              const sd = new Date(l.start_date);
              const ed = new Date(l.end_date);
              const today = new Date();
              sd.setHours(0, 0, 0, 0);
              ed.setHours(23, 59, 59, 999);
              return today >= sd && today <= ed;
            }).length;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <CalendarIcon className="w-5 h-5 text-primary shrink-0" />
                  </div>
                  <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {totalLeavesTaken}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                      {isEmployee ? "My Total Leaves Taken" : "Total Leaves Taken"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block truncate">This year ({currentYear})</span>
                  </div>
                </div>

                {!isEmployee ? (
                  <>
                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <Users className="w-5 h-5 text-primary shrink-0" />
                      </div>
                      <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {avgDays}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                          Avg Days per Employee
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">Days taken</span>
                      </div>
                    </div>

                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                      </div>
                      <div className="my-1 text-2xl font-bold tracking-tight text-foreground truncate tabular-nums" title={mostCommonType ? mostCommonType[0] : '—'}>
                        {mostCommonType ? mostCommonType[0] : '—'}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                          Most Common Type
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {mostCommonPct > 0 ? `${mostCommonPct}% of all leaves` : 'No data yet'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <Clock className="w-5 h-5 text-primary shrink-0" />
                      </div>
                      <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {outTodayCount}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                          On Leave Today
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">Currently away</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <Clock className="w-5 h-5 text-primary shrink-0" />
                      </div>
                      <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {requests.filter(r => r.status === 'PENDING').length}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                          Pending Requests
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">Awaiting manager review</span>
                      </div>
                    </div>

                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      </div>
                      <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {requests.filter(r => r.status === 'APPROVED').length}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                          Approved Requests
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">Approved in total</span>
                      </div>
                    </div>

                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <CalendarIcon className="w-5 h-5 text-primary shrink-0" />
                      </div>
                      <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {requests.filter(r => r.start_date && new Date(r.start_date) > new Date() && r.status === 'APPROVED').length}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                          Upcoming Leaves
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">Scheduled future leaves</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          <div className="mt-6 mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 font-['Space_Grotesk']">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Leave History ({isEmployee ? leaves.filter(i => i.status === 'APPROVED').length : filteredHistory.length} records)
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
              {/* Employee Search */}
              {!isEmployee && (
                <div className="relative w-full max-w-[400px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all text-foreground"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 shrink-0">
              {/* Filter Button & Popover Modal */}
              {!isEmployee && (() => {
                const activeFilterCount = (selectedEmployee !== "All Employees" ? 1 : 0) + (selectedLeaveType !== "All" ? 1 : 0) + (selectedStatus !== "All" ? 1 : 0);
                return (
                  <div className="flex items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setShowLeaveHistoryFilters(!showLeaveHistoryFilters)}
                      className={`toolbar-filter-btn-with-text relative ${showLeaveHistoryFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                      title="Filters"
                    >
                      {showLeaveHistoryFilters ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 18 18"
                          aria-labelledby="CollapseCloseIconTitle"
                          role="graphics-symbol img"
                          fill="none"
                          className="!text-blue-600 dark:!text-blue-400 w-4 h-4"
                        >
                          <title id="CollapseCloseIconTitle">Collapse Close Icon</title>
                          <g>
                            <path
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
                          className="w-4 h-4 text-foreground"
                        >
                          <path d="M15.8,2H6.9C6.7,0.7,5.4-0.2,4,0.1C3,0.3,2.2,1,2,2H0.2C0.1,2,0,2.1,0,2.3v0.5 C0,2.9,0.1,3,0.2,3H2C2.3,4.4,3.6,5.2,5,5c1-0.2,1.8-1,1.9-2h8.8C15.9,3,16,2.9,16,2.8V2.3C16,2.1,15.9,2,15.8,2z M4.5,4 C3.7,4,3,3.3,3,2.5S3.7,1,4.5,1S6,1.7,6,2.5S5.3,4,4.5,4z" />
                          <path d="M15.8,12H8.9C8.7,10.7,7.4,9.8,6,10.1c-1,0.2-1.8,1-1.9,1.9H0.2C0.1,12,0,12.1,0,12.3v0.5 C0,12.9,0.1,13,0.2,13h3.8C4.3,14.4,5.6,15.2,7,15c1-0.2,1.8-1,1.9-1.9h6.8c0.1,0,0.2-0.1,0.2-0.2v-0.5C16,12.1,15.9,12,15.8,12z M6.5,14C5.7,14,5,13.3,5,12.5S5.7,11,6.5,11S8,12.5S7.3,14,6.5,14z" />
                          <path d="M0,7.3v0.5C0,7.9,0.1,8,0.2,8h8.8c0.3,1.4,1.6,2.2,2.9,1.9c1-0.2,1.8-1,1.9-1.9h1.8 C15.9,8,16,7.9,16,7.8V7.3C16,7.1,15.9,7,15.8,7h-1.8c-0.3-1.3-1.6-2.2-2.9-1.9C10,5.3,9.2,6,9.1,7H0.2C0.1,7,0,7.1,0,7.3z M10,7.5 C10,6.7,10.7,6,11.5,6S13,6.7,13,7.5S12.3,9,11.5,9S10,8.3,10,7.5z" />
                        </svg>
                      )}
                      Filter
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-card">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    {/* Filter Dropdown Popover */}
                    {showLeaveHistoryFilters && (
                      <div className="absolute right-0 top-full mt-2 w-[320px] sm:w-[360px] bg-card rounded-xl shadow-xl border border-border p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                          <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-foreground">Filter Leave History</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee("All Employees");
                              setSelectedLeaveType("All");
                              setSelectedStatus("All");
                            }}
                            className="text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            Reset all
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Employee</label>
                            <Select
                              value={selectedEmployee}
                              onChange={setSelectedEmployee}
                              options={[
                                { value: "All Employees", label: "All Employees" },
                                ...employees.map((emp: any) => {
                                  const name = `${emp.details?.first_name || ''} ${emp.details?.last_name || ''}`.trim() || emp.username || `Employee #${emp.id}`;
                                  return { value: name, label: name };
                                })
                              ]}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Leave Type</label>
                            <Select
                              value={selectedLeaveType}
                              onChange={setSelectedLeaveType}
                              options={[
                                { value: "All", label: "All Leave Types" },
                                ...policies.map((p: any) => ({ value: String(p.id), label: p.policy_name || p.leave_type }))
                              ]}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                            <Select
                              value={selectedStatus}
                              onChange={setSelectedStatus}
                              options={[
                                { value: "All", label: "All Status" },
                                { value: "APPROVED", label: "Approved" },
                                { value: "PENDING", label: "Pending" },
                                { value: "REJECTED", label: "Rejected" },
                                { value: "CANCELLED", label: "Cancelled" },
                              ]}
                            />
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-border flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => setShowLeaveHistoryFilters(false)}
                            className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* View Mode Toggle */}
              <div className="p-1 rounded-lg flex items-center shrink-0 h-10">
                <button 
                  onClick={() => setHistoryView('card')}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${historyView === 'card' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setHistoryView('compact')}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${historyView === 'compact' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              </div>
            </div>
          </div>
          
          <div className="border-none shadow-none mt-2 w-full min-w-0">
            {(() => {
              const historyItems = isEmployee 
                ? leaves.filter((i: any) => i.status === 'APPROVED') 
                : filteredHistory;
              
              if (historyItems.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center justify-center text-center bg-muted/20 rounded-lg border border-dashed border-border dark:border-border/50">
                    <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1 font-['Inter']">No history records found.</p>
                    <p className="text-xs text-muted-foreground font-['Inter']">Adjust your filters to see more results.</p>
                  </div>
                );
              }
              
              if (historyView === 'compact') {
                return (
                   <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                     <table className="w-full text-sm border-collapse">
                       <thead>
                         <tr className="bg-muted/40 border-b border-border/80 hover:bg-transparent">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Leave Type</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Duration</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Dates</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Doc</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black tracking-wider">Approved By</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-black tracking-wider">Actions</th>
                          </tr>
                       </thead>
                      <tbody className="divide-y divide-border">
                        {historyItems.map((request: any) => {
                          const isOwnRequest = Number(request.user_id) === Number(user?.id);
                          const name = isOwnRequest ? "You" : (request.user?.details
                            ? `${request.user.details.first_name || ""} ${request.user.details.last_name || ""}`.trim()
                            : request.employeeName || "Unknown");
                          const leaveType = request.leave_policy?.leave_type || request.leave_policy?.policy_name || request.leave_policy?.name || request.leave_type || request.leaveType || "-";
                          const duration = request.duration || request.days || 0;
                          const statusUpper = (request.status || "").toUpperCase();
                          const approverName = request.approver?.username || request.approverName || (request.status === 'PENDING' ? 'Pending' : '-');
                          return (
                            <tr key={request.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">{name}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{leaveType}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{duration} {duration === 1 ? 'day' : 'days'}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">
                                {request.start_date || request.startDate ? new Date(request.start_date || request.startDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                                {request.end_date || request.endDate ? ` – ${new Date(request.end_date || request.endDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}` : ""}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                 {request.attachment_url ? (
                                   <a
                                     href={request.attachment_url}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
                                     onClick={(e) => e.stopPropagation()}
                                   >
                                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                       <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                     </svg>
                                     View
                                   </a>
                                 ) : (
                                   <span className="text-muted-foreground italic text-xs">-</span>
                                 )}
                               </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                                  statusUpper === 'PENDING' ? 'bg-amber-55/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900/40' :
                                  statusUpper === 'APPROVED' ? 'bg-emerald-55/60 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-900/40' :
                                  statusUpper === 'REJECTED' ? 'bg-rose-55/60 text-rose-700 border-rose-200/60 dark:bg-rose-950/30 dark:border-rose-900/40' :
                                  'bg-slate-55/60 text-slate-700 border-slate-200/60 dark:bg-slate-900/30 dark:border-slate-800/40'
                                }`}>
                                  {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase() : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{approverName}</td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => handleViewDetails(request)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="View Details">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                  {historyItems.map((request: any) => {
                  const isOwnRequest = Number(request.user_id) === Number(user?.id);
                  const name = isOwnRequest ? "You" : (request.user?.details
                    ? `${request.user.details.first_name || ""} ${request.user.details.last_name || ""}`.trim()
                    : request.employeeName || "Unknown");

                  const leaveType = request.leave_policy?.leave_type || request.leave_policy?.policy_name || request.leave_policy?.name || request.leave_type || request.leaveType || "-";
                  const duration = request.duration || request.days || 0;
                  const statusUpper = (request.status || "").toUpperCase();
                  
                  // Status Pill Config
                  let statusColor = "bg-muted/50 text-muted-foreground";
                  if (statusUpper === 'PENDING') { statusColor = "bg-amber-500/20 text-amber-500"; }
                  else if (statusUpper === 'APPROVED') { statusColor = "bg-emerald-500/20 text-emerald-500"; }
                  else if (statusUpper === 'REJECTED') { statusColor = "bg-rose-500/20 text-rose-500"; }
                  else if (statusUpper === 'WITHDRAWN' || statusUpper === 'CANCELLED') { statusColor = "bg-slate-500/20 text-slate-400"; }

                  // Left edge color bar & icon color
                  let typeColorHex = "#64748b"; // default slate
                  let typeBgColorHex = "rgba(100, 116, 139, 0.2)";
                  const t = leaveType.toLowerCase();
                  if (t.includes('annual') || t.includes('vacation')) { typeColorHex = "#6366f1"; typeBgColorHex = "rgba(99, 102, 241, 0.15)"; }
                  else if (t.includes('sick') || t.includes('emergency')) { typeColorHex = "#e11d48"; typeBgColorHex = "rgba(225, 29, 72, 0.15)"; }
                  else if (t.includes('casual') || t.includes('personal')) { typeColorHex = "#059669"; typeBgColorHex = "rgba(5, 150, 105, 0.15)"; }
                  else if (t.includes('maternity') || t.includes('paternity')) { typeColorHex = "#d97706"; typeBgColorHex = "rgba(217, 119, 6, 0.15)"; }
                  else if (t.includes('work from home')) { typeColorHex = "#d97706"; typeBgColorHex = "rgba(217, 119, 6, 0.15)"; }

                  const approverName = request.approver?.username || request.approverName || (request.status === 'PENDING' ? 'Pending' : '-');

                  return (
                    <div
                      key={request.id}
                      className="group relative rounded-lg border border-border dark:border-border/40 bg-card hover:bg-muted/10 transition-all p-5 flex items-center justify-between gap-4 overflow-hidden"
                    >
                      <div className="flex-1 min-w-0 pl-2">
                        <div className="flex flex-col gap-2">
                          
                          {/* Row 1: Icon, Title, Duration */}
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-sm flex shrink-0" style={{ backgroundColor: typeBgColorHex }}>
                               <div className="w-full h-full rounded-sm opacity-40" style={{ backgroundColor: typeColorHex }}></div>
                            </div>
                            <span className="font-bold text-foreground text-[15px] font-['Space_Grotesk'] tracking-tight">
                              {!isOwnRequest ? `${name} - ${leaveType}` : leaveType}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                              {duration} {duration === 1 ? 'DAY' : 'DAYS'}
                            </span>
                          </div>

                          {/* Row 2: Dates, Applied, Status */}
                          <div className="flex items-center gap-4 text-sm font-['Inter'] flex-wrap">
                            <div className="font-mono text-[13px] font-medium text-foreground/90">
                              {request.start_date || request.startDate ? new Date(request.start_date || request.startDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"} 
                              {request.end_date || request.endDate ? ` – ${new Date(request.end_date || request.endDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}` : ""}
                            </div>
                            <div className={`flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusColor}`}>
                              {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase() : 'Pending'}
                            </div>
                            <div className="text-[12px] text-muted-foreground border-l border-border dark:border-border/50 pl-3">
                              Approved by <span className="font-medium text-foreground/80">{approverName}</span>
                            </div>
                          </div>

                          {/* Row 3: Reason / Rejection Reason */}
                          <div className="flex items-center gap-4 flex-wrap mt-1">
                            <div className="text-[13px] text-muted-foreground truncate max-w-xl">
                              {request.rejection_reason ? (
                                <span className="text-rose-500/80"><span className="font-medium text-rose-500">Rejection reason:</span> {request.rejection_reason}</span>
                              ) : (
                                request.reason || "No reason provided."
                              )}
                            </div>
                            {request.attachment_url && (
                              <a
                                href={request.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold font-['Inter']"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                                Supporting Doc
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions: Right Side */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 pr-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleViewDetails(request); }}
                          className="mini-icon-btn"
                                  aria-label="View Details"
                                >
                                  <Eye />
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab Content Rendering below */}

      {/* Leave Policies Tab */}
      {activeTab === "policies" && !showPolicyFullPage && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {policies.map((policy: any) => (
              <div key={policy.id} className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-sm transition-all max-w-md w-full relative overflow-hidden group flex flex-col">
                <div className={`absolute top-0 left-0 right-0 h-1 ${(policy.leave_category === 'paid' || policy.is_paid) ? "bg-primary" : "bg-primary/70"}`}></div>

                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${(policy.leave_category === 'paid' || policy.is_paid) ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-slate-600 border-border"}`}>
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-base font-bold text-foreground leading-tight">{policy.policy_name || policy.name}</h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold w-max ${(policy.leave_category === 'paid' || policy.is_paid) ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-slate-600 border border-border"}`}>
                        {(policy.leave_category === 'paid' || policy.is_paid) ? "Paid Leave" : "Unpaid Leave"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 -mt-1 -mr-1">
                    {policy.document_url && (
                      <a
                        href={policy.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors group/btn flex items-center justify-center"
                        title="Download Official Policy Document"
                      >
                        <Download className="w-4 h-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/leave-management/policy/${policy.id}`)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors group/btn"
                      title="View Leave Type Document"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                    </button>
                    {(isSuperAdmin || isAdmin) && (
                      <>
                        <button
                          onClick={() => {
                            setEditingPolicy(policy);
                            setPolicyFormFields({
                              is_paid: policy.leave_category === 'paid' ? 'Paid' : 'Unpaid',
                              color: policy.leave_color || 'primary',
                              document_url: policy.document_url || '',
                            });
                            setShowPolicyFullPage(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors group/btn"
                        >
                          <Edit className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                        </button>
                        <button
                          onClick={() => setDeletePolicyTarget({ id: policy.id, name: policy.policy_name || policy.name || "Leave Policy" })}
                          className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors group/btn"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground group-hover/btn:text-rose-600 transition-colors" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  {(() => {
                    const totalDays = Number(policy.days_per_year || policy.total_days || policy.totalDays || 0);
                    const usedDays = leaves
                      .filter((l: any) => l.status?.toUpperCase() === 'APPROVED' && l.leave_policy_id == policy.id)
                      .reduce((sum: number, l: any) => sum + Number(l.duration || l.days || 0), 0);
                    const balance = Math.max(0, totalDays - usedDays);
                    const carryForwardDays = policy.carry_forward_days !== undefined ? policy.carry_forward_days : (policy.carry_forward || policy.carryForward || 0);

                    return (
                      <div className={`grid gap-3 mb-5 ${isEmployee ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div className="p-3 rounded-lg bg-muted/50 border border-border flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Limit</span>
                          <span className="text-lg font-bold text-foreground leading-none">{totalDays} <span className="text-[11px] font-medium text-muted-foreground">days</span></span>
                        </div>
                        {isEmployee && (
                          <div className="p-3 rounded-lg bg-primary/10 border border-primary-100 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider mb-1">Available</span>
                            <span className="text-lg font-bold text-primary leading-none">{balance} <span className="text-[11px] font-medium text-primary-500">days</span></span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-3 pt-4 border-t border-border mt-auto">
                    {isEmployee && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[12px] font-medium text-slate-600">Carry Forward</span>
                        </div>
                        <span className="text-[12px] font-bold text-foreground">{policy.carry_forward_days !== undefined ? policy.carry_forward_days : (policy.carry_forward || policy.carryForward || 0)} days</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[12px] font-medium text-slate-600">Accrual Rate</span>
                      </div>
                      <span className="text-[12px] font-bold text-foreground">{policy.accrual_rate || policy.accrualRate || 'N/A'}</span>
                    </div>
                  </div>

                  {policy.description && (
                    <div className="mt-4 pt-3 border-t border-slate-50">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{policy.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === "statistics" && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Pending Requests", value: leaveStats?.pending_requests?.toString() || "0", icon: CalendarIcon },
              { label: "Approved This Month", value: leaveStats?.approved_this_month?.toString() || "0", icon: Check, status: "Approved", statusColor: "text-emerald-600" },
              { label: "Out Today", value: leaveStats?.out_today_count?.toString() || "0", icon: Users },
              { label: "Rejected This Month", value: leaveStats?.rejected_this_month?.toString() || "0", icon: X, status: "Rejected", statusColor: "text-rose-600" },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    {card.status && (
                      <span className={`text-[11px] font-medium flex items-center gap-0.5 ${card.statusColor}`}>
                        {card.status}
                      </span>
                    )}
                  </div>
                  <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Distribution by Type */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 hover:shadow-sm transition-all">
              <h3 className="text-base font-bold text-foreground mb-6">
                Leave distribution by type
              </h3>
              <div className="space-y-5">
                {(() => {
                  const distCounts: Record<string, number> = {};
                  policies.forEach((p: any) => {
                    distCounts[p.policy_name || p.name] = 0;
                  });
                  const distributionHistory = leaveHistory.filter((l: any) => l.status === 'APPROVED');
                  distributionHistory.forEach((l: any) => {
                    const type = l.leave_policy?.name || l.leave_policy?.policy_name || l.leave_policy?.leave_type || l.leaveType || 'Other';
                    distCounts[type] = (distCounts[type] || 0) + (l.duration || l.days || 0);
                  });

                  const totalDaysMapped = Object.values(distCounts).reduce((a, b) => a + b, 0);

                  const distributionArr = Object.entries(distCounts)
                    .sort((a, b) => {
                      if (a[0] === 'Annual Leave') return -1;
                      if (b[0] === 'Annual Leave') return 1;
                      return b[1] - a[1];
                    })
                    .map(([type, count]) => ({
                      type,
                      count,
                      percentage: totalDaysMapped > 0 ? Math.round((count / totalDaysMapped) * 100) : 0,
                    }));

                  if (distributionArr.length === 0) {
                    return <p className="text-[13px] font-medium text-muted-foreground text-center py-8 bg-card rounded-lg border border-border">No data available</p>;
                  }

                  const colorMap: Record<string, { fill: string, bg: string, dot: string }> = {
                    'Annual Leave': { fill: 'bg-[#2D2A54]', bg: 'bg-[#2D2A54]/10', dot: 'bg-[#2D2A54]' },
                    'Sick Leave': { fill: 'bg-rose-400', bg: 'bg-rose-400/20', dot: 'bg-rose-400' },
                    'Casual Leave': { fill: 'bg-emerald-500', bg: 'bg-emerald-500/20', dot: 'bg-emerald-500' },
                    'Maternity Leave': { fill: 'bg-amber-500', bg: 'bg-amber-500/20', dot: 'bg-amber-500' },
                  };
                  const defaultColors = [
                    { fill: 'bg-blue-500', bg: 'bg-blue-500/20', dot: 'bg-blue-500' },
                    { fill: 'bg-purple-500', bg: 'bg-purple-500/20', dot: 'bg-purple-500' },
                  ];

                  return (
                    <>
                      <div className="space-y-6">
                        {distributionArr.map((item, idx) => {
                          const style = colorMap[item.type] || defaultColors[idx % defaultColors.length];
                          const hasData = item.count > 0;
                          return (
                            <div key={idx} className="group">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-2 h-2 rounded-full ${style.dot}`}></div>
                                  <span className="text-[14px] font-medium text-foreground">{item.type}</span>
                                </div>
                                <div className="text-[13px] font-medium text-muted-foreground">
                                  {hasData ? `${item.count}d • ${item.percentage}%` : '—'}
                                </div>
                              </div>
                              <div className={`w-full ${style.bg} rounded-full h-2 overflow-hidden`}>
                                <div
                                  className={`${style.fill} h-2 rounded-full transition-all duration-1000 ease-out`}
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-8 pt-5 border-t border-border/60 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-muted-foreground">Logged this year</span>
                        <span className="text-[14px] font-bold text-foreground">{totalDaysMapped} days</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 hover:shadow-sm transition-all flex flex-col">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Monthly leave trends</h3>
                  <p className="text-[13px] font-medium text-muted-foreground">Company-wide leave days, {new Date().getFullYear()}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-100/50 text-emerald-700 px-2.5 py-1 rounded-sm">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-semibold">39% since Jan</span>
                </div>
              </div>

              <div className="flex-1 flex items-end justify-between gap-3 h-48 mt-auto pb-2">
                {[
                  { month: "Jan", leaves: 15, max: 50 },
                  { month: "Feb", leaves: 12, max: 50 },
                  { month: "Mar", leaves: 18, max: 50 },
                  { month: "Apr", leaves: 22, max: 50 },
                  { month: "May", leaves: 25, max: 50 },
                  { month: "Jun", leaves: 35, max: 50 },
                ].map((item, idx, arr) => {
                  const isCurrent = idx === arr.length - 1;
                  const height = `${(item.leaves / item.max) * 100}%`;
                  return (
                    <div key={idx} className="flex flex-col items-center justify-end w-full h-full gap-3 group relative">
                      {/* tooltip */}
                      <div className="absolute -top-8 bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {item.leaves} days
                      </div>
                      <div className={`w-full rounded-t-lg transition-all duration-500 ${isCurrent ? 'bg-[#2D2A54]' : 'bg-[#D1CDE0] hover:bg-[#BDB8D0]'}`} style={{ height, minHeight: '4px' }}></div>
                      <span className="text-[12px] font-medium text-muted-foreground">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Department-wise Analytics */}
          <Card className="rounded shadow-sm border border-border">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <Users className="w-5 h-5 text-primary shrink-0" />
                Department-wise Leave Analytics
              </h3>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Employees</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Total Days</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Avg/Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {(leaveStats?.department_analytics || []).map((row: any, idx: number) => {
                      const utilPercent = Math.min(100, (row.employees > 0 ? (row.leaves / (row.employees * 10)) * 100 : 0));
                      return (
                        <tr key={idx} className="hover:bg-muted transition-colors cursor-pointer">
                          <td className="px-4 py-3 font-semibold text-sm text-foreground">{row.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-medium">{row.employees}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-medium">{row.leaves}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-medium">
                            {row.employees > 0 ? (row.leaves / row.employees).toFixed(1) : "0"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${utilPercent}%` }}></div>
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{utilPercent.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!leaveStats?.department_analytics || leaveStats.department_analytics.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                          No department data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Tracking Tab */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Top Analytics Dashboard - Optimized Grid Layout */}
          {/* Top Analytics Dashboard - Premium Redesign */}
          {!isEmployee && (
            <div className="flex flex-col gap-6 mb-8">
              {/* Top Row: Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: "Present Today", value: attendanceStats?.presentToday || 0, icon: Check, color: "teal", bg: "bg-teal-50", text: "text-teal-600" },
                  { label: "Late Arrivals", value: attendanceStats?.lateToday || 0, icon: Clock, color: "amber", bg: "bg-amber-50", text: "text-amber-600" },
                  { label: "Half Days", value: attendanceStats?.halfDayToday || 0, icon: CalendarIcon, color: "blue", bg: "bg-blue-50", text: "text-blue-600" },
                  { label: "Absent Today", value: attendanceStats?.absentToday || 0, icon: X, color: "rose", bg: "bg-rose-50", text: "text-rose-600" }
                ].map((stat, i) => (
                  <div key={i} className="bg-card rounded-lg border border-border shadow-sm p-6 hover:shadow-sm hover:border-slate-300 transition-all group flex items-center justify-between cursor-default">
                    <div className="flex flex-col justify-center">
                      <p className="text-[26px] font-semibold text-foreground leading-none mb-2">{stat.value}</p>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none">{stat.label}</p>
                    </div>
                    <div className={`shrink-0 p-3 rounded-lg ${stat.bg} ${stat.text} group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="w-6 h-6" strokeWidth={2} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Row: Charts & Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Half: Weekly Overview */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 flex flex-col h-full">
                  <div className="mb-8 flex flex-row items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Weekly Overview</h3>
                      <p className="text-xs text-muted-foreground mt-1">Attendance distribution by day</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-teal-50/50 border border-teal-100/50 flex items-center justify-center text-teal-600 shadow-sm">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="w-full h-[250px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            { day: "Mon", rate: 97.7, present: 1189, late: 18, absent: 10, total: 1217 },
                            { day: "Tue", rate: 98.1, present: 1195, late: 15, absent: 8, total: 1218 },
                            { day: "Wed", rate: 97.1, present: 1178, late: 23, absent: 12, total: 1213 },
                            { day: "Thu", rate: 97.7, present: 1192, late: 19, absent: 9, total: 1220 },
                            { day: "Fri", rate: 96.4, present: 1165, late: 28, absent: 15, total: 1208 },
                          ]}
                          margin={{ left: -25, right: 15, top: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                            axisLine={false} tickLine={false}
                            dy={10}
                          />
                          <YAxis
                            domain={[95, 100]}
                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                            axisLine={false} tickLine={false}
                            tickFormatter={(v) => `${v}%`}
                            width={60}
                          />
                          <Tooltip
                            cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-card p-4 border border-border shadow-sm rounded-lg min-w-[160px]">
                                    <p className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2">{data.day} Overview</p>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                          <span className="text-[11px] font-medium text-muted-foreground">Present</span>
                                        </div>
                                        <span className="text-xs font-bold text-foreground">{data.present}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                          <span className="text-[11px] font-medium text-muted-foreground">Late</span>
                                        </div>
                                        <span className="text-xs font-bold text-foreground">{data.late}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                                          <span className="text-[11px] font-medium text-muted-foreground">Absent</span>
                                        </div>
                                        <span className="text-xs font-bold text-foreground">{data.absent}</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                                      <span className="text-[11px] font-semibold text-muted-foreground">Attendance Rate</span>
                                      <span className="text-xs font-extrabold text-teal-600">{data.rate}%</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone" dataKey="rate" name="Attendance Rate"
                            stroke="#10b981" strokeWidth={3.5}
                            dot={{ r: 5, fill: '#10b981', strokeWidth: 2.5, stroke: '#fff' }}
                            activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Right Half: Analytics Insights */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 flex flex-col h-full relative">
                  <div className="mb-8 relative z-10 flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse ring-4 ring-teal-500/20"></span>
                      <h3 className="text-[15px] font-semibold text-foreground tracking-tight">AI Insights</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-3.5">Automated anomalies & trends</p>
                  </div>
                  <div className="flex-1 relative z-10 flex flex-col justify-center">
                    <div className="space-y-6">
                      {[
                        { icon: TrendingUp, title: "High Attendance", text: "Engineering shows 98.4% rate this week, leading all departments." },
                        { icon: Clock, title: "Late Arrivals", text: "Fridays see a 12% spike in late check-ins compared to Mon-Thu." },
                        { icon: Users, title: "Remote Work", text: "42% of staff worked remotely at least one day this month." },
                        { icon: CalendarIcon, title: "Work Cycles", text: "Daily average work hours stabilized at 8.4h across all roles." }
                      ].map((insight, i) => (
                        <div key={i} className="flex gap-4 group cursor-default items-start">
                          <div className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-teal-500 transition-colors duration-300">
                            <insight.icon className="w-4 h-4" strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-foreground mb-1">{insight.title}</p>
                            <p className="text-[12px] text-muted-foreground leading-relaxed group-hover:text-gray-600 transition-colors">{insight.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Filters - Only for Admin/Manager/Super Admin */}

          {/* Attendance Records Table */}
          <Card className="rounded shadow-sm border border-border mb-8">
            <div className="p-4 sm:p-5 border-b border-border">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    {isEmployee ? "My Attendance Record" : "Attendance Records"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Viewing {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!isEmployee && (
                    <div className="relative w-full sm:w-auto sm:min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search employee..."
                        className="w-full pl-9 pr-4 h-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm bg-card"
                        value={attendanceSearch}
                        onChange={(e) => setAttendanceSearch(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-[140px]">
                      <ModernDatePicker
                        value={attendanceDate}
                        onChange={setAttendanceDate}
                      />
                    </div>
                    <span className="text-muted-foreground font-light">-</span>
                    <div className="w-[140px]">
                      <ModernDatePicker
                        value={attendanceEndDate}
                        onChange={setAttendanceEndDate}
                      />
                    </div>
                  </div>

                  <Select
                    value={attendanceStatus}
                    onChange={setAttendanceStatus}
                    options={[
                      { value: "All", label: "All Status" },
                      { value: "Present", label: "Present" },
                      { value: "Late", label: "Late" },
                      { value: "Half Day", label: "Half Day" },
                      { value: "Absent", label: "Absent" },
                    ]}
                  />

                  {!isEmployee && (
                    <Select
                      value={attendanceDept}
                      onChange={setAttendanceDept}
                      options={[
                        { value: "All", label: "All Departments" },
                        { value: "Engineering", label: "Engineering" },
                        { value: "Sales", label: "Sales" },
                        { value: "Marketing", label: "Marketing" },
                        { value: "HR", label: "HR" },
                      ]}
                    />
                  )}

                  {!isEmployee && (
                    <Button variant="outline" className="gap-2 h-9 rounded-lg border-border text-foreground hover:bg-muted w-full sm:w-auto shadow-sm transition-all text-xs font-semibold">
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      {!isEmployee && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                          Employee
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                        Check In
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                        Check Out
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                        Work Hours
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredAttendance.map((record: any) => {
                      const name = record.user?.details
                        ? `${record.user.details.first_name || ''} ${record.user.details.last_name || ''}`.trim()
                        : (record.employeeName || 'Unknown');
                      const empId = record.user?.details?.employee_id || record.employeeId || "N/A";

                      const getPremiumStatusColor = (status: string) => {
                        switch (status?.toLowerCase()) {
                          case 'present': return 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40';
                          case 'late': return 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40';
                          case 'half day': return 'bg-blue-50 text-primary border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40';
                          case 'absent': return 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40';
                          default: return 'bg-muted text-foreground border border-border';
                        }
                      };

                      return (
                        <tr key={record.id} className="hover:bg-muted transition-colors cursor-pointer">
                          {!isEmployee && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {record.user?.details?.profile_picture ? (
                                  <img
                                    src={getProfilePictureUrl(record.user.details.profile_picture) || ''}
                                    alt={name}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${record.user?.details?.first_name || ''}+${record.user?.details?.last_name || ''}&background=6366f1&color=fff`;
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                    {record.user?.details?.first_name?.[0] || name.charAt(0)}
                                    {record.user?.details?.last_name?.[0] || ''}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{empId}</p>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {record.date ? new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : record.date}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-sm font-medium text-foreground">
                                {record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <LogOut className="w-3.5 h-3.5 text-rose-500" />
                              <span className="text-sm font-medium text-foreground">
                                {record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-foreground">
                              {Number(record.work_hours) > 0
                                ? `${record.work_hours} hrs`
                                : `${calculateDynamicWorkHours(record.check_in)} hrs`
                              }
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPremiumStatusColor(record.status)}`}>
                              {toTitleCase(record.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-medium">{record.location || 'N/A'}</td>
                        </tr>
                      );
                    })}
                    {!loading && filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan={isEmployee ? 6 : 7} className="px-6 py-16 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                              <Search className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="font-semibold text-sm text-foreground">
                              {attendanceSearch || attendanceDept !== "All" || attendanceStatus !== "All"
                                ? "No matching records found"
                                : "No records for this period"
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">Try adjusting your filters or search terms.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-[9999] p-4 sm:p-6 overflow-y-auto">
          <Card className="max-w-2xl w-full bg-card shadow-sm border-none my-4 sm:my-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingPolicy ? "Edit Leave Policy" : "Add New Leave Policy"}</CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelPolicyModalConfirm(true)}
                  className="h-10 w-10 text-muted-foreground hover:bg-muted p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePolicySubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Policy Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingPolicy?.name || editingPolicy?.policy_name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Annual Vacation"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Total Days per Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="total_days"
                      defaultValue={editingPolicy?.total_days || editingPolicy?.totalDays}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Carry Forward Days
                    </label>
                    <input
                      type="number"
                      name="carry_forward"
                      defaultValue={editingPolicy?.carry_forward || editingPolicy?.carryForward || 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Accrual Rate
                    </label>
                    <input
                      type="text"
                      name="accrual_rate"
                      defaultValue={editingPolicy?.accrual_rate || editingPolicy?.accrualRate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="1.67 days/month"
                    />
                  </div>
                  <div>
                    <Select
                      value={policyFormFields.is_paid}
                      onChange={(val) => setPolicyFormFields(prev => ({ ...prev, is_paid: val }))}
                      label="Type"
                      required
                      options={[
                        { value: "Paid", label: "Paid" },
                        { value: "Unpaid", label: "Unpaid" },
                      ]}
                    />
                  </div>
                  <div>
                    <Select
                      value={policyFormFields.color}
                      onChange={(val) => setPolicyFormFields(prev => ({ ...prev, color: val }))}
                      label="Color"
                      options={[
                        { value: "blue", label: "Blue" },
                        { value: "red", label: "Red" },
                        { value: "green", label: "Green" },
                        { value: "purple", label: "Purple" },
                        { value: "primary", label: "primary" },
                        { value: "pink", label: "Pink" },
                        { value: "gray", label: "Gray" },
                      ]}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingPolicy?.description}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Brief description of this leave policy..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCancelPolicyModalConfirm(true)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingPolicy ? "Update Policy" : "Create Policy"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leave Request Full Page UI handled at start of component if showLeaveRequestFullPage is true */}

      <RejectReasonDialog
        isOpen={rejectRequestId !== null}
        onClose={() => setRejectRequestId(null)}
        onConfirm={handleRejectConfirm}
      />

      <ConfirmationDialog
        isOpen={deletePolicyTarget !== null}
        onClose={() => setDeletePolicyTarget(null)}
        onConfirm={async () => {
          if (deletePolicyTarget) {
            await deleteLeavePolicy(deletePolicyTarget.id.toString());
            toast.success("Leave type deleted");
            setDeletePolicyTarget(null);
            fetchData();
          }
        }}
        title="Delete Leave Policy?"
        description={`Are you sure you want to delete "${deletePolicyTarget?.name}"? Employees will no longer be able to apply for this leave type.`}
        confirmText="Delete Policy"
        variant="danger"
      />

      <ConfirmDialog
        open={showCancelPolicyModalConfirm}
        title={editingPolicy ? "Discard Update Leave Type Changes?" : "Discard Leave Type Changes?"}
        message="Are you sure you want to cancel? Any leave type modifications entered in this form will be discarded."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelPolicyModalConfirm(false);
          setShowPolicyModal(false);
          setEditingPolicy(null);
        }}
        onCancel={() => setShowCancelPolicyModalConfirm(false)}
      />
    </div>
  );
}


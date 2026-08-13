import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Shield, 
  CheckCircle2, 
  FileText, 
  ClipboardCheck, 
  MessageSquare, 
  DollarSign,
  Info,
  Loader2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Calculator,
  Star,
  Download,
  CheckCircle,
  Calendar,
  TrendingUp,
  X,
  Check
} from 'lucide-react';
import { EXIT_STATUS } from './InitiateExitForm';
import { useFeatures } from '@/features/edition/hooks/useFeatures';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useAuth } from '@/shared/context/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import axiosInstance from '@/shared/services/axiosInstance';
import { getEmployees } from '@/features/employees/services/employees';
import { toast } from 'sonner';
import { UserRole } from '@/shared/types/rbac';

interface ExitManagementDetailProps {
  request: any;
  onBack: () => void;
  onRefresh?: () => void;
}

const getTabForStatus = (status: string, ktStatus?: string, hasAssets?: boolean): string => {
  if (ktStatus === 'Completed' && (status === 'OFFBOARDING' || status === 'RESIGNATION_ACCEPTED')) {
    return hasAssets ? 'Assets' : 'Clearance';
  }
  switch (status) {
    case 'PENDING_ACCEPTANCE':
      return 'Overview';
    case 'RESIGNATION_ACCEPTED':
      return 'Overview';
    case 'OFFBOARDING':
      return 'KT';
    case 'ASSET_HANDOVER':
      return 'Assets';
    case 'IT_CLEARANCE':
    case 'CLEARANCE':
      return 'Clearance';
    case 'EXIT_INTERVIEW':
      return 'Interview';
    case 'FINAL_SETTLEMENT':
    case 'COMPLETED':
      return 'Settlement';
    default:
      return 'Overview';
  }
};

const ExitManagementDetail: React.FC<ExitManagementDetailProps> = ({ request: initialRequest, onBack, onRefresh }) => {
  const { formatCurrency, currencySymbol } = useCurrency();
  const { has } = useFeatures();
  const [assetTrackingEnabledState, setAssetTrackingEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("asset_tracking_enabled") !== "false";
  });

  useEffect(() => {
    const handleModuleConfigUpdate = () => {
      setAssetTrackingEnabledState(localStorage.getItem("asset_tracking_enabled") !== "false");
    };
    window.addEventListener("module-config-updated", handleModuleConfigUpdate);
    return () => window.removeEventListener("module-config-updated", handleModuleConfigUpdate);
  }, []);

  const isAssetTrackingEnabled = assetTrackingEnabledState && has("ASSET_MANAGEMENT");
  const { user: currentUser } = useAuth();
  const isFinanceOrAdmin = ['FINANCE', 'FINANCE_ADMIN', 'ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN', 'SUPER ADMIN'].includes(String(currentUser?.role).toUpperCase()) && String(currentUser?.role).toUpperCase() !== 'HR';
  console.log("DEBUG: currentUser role:", currentUser?.role, "isFinanceOrAdmin:", isFinanceOrAdmin, "rawUser:", currentUser);
  const [activeTab, setActiveTab] = useState(() => getTabForStatus(initialRequest.status));
  const [request, setRequest] = useState(initialRequest);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interviewData, setInterviewData] = useState({
    reason: '',
    rating: '8',
    feedback: ''
  });
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showSettlementEdit, setShowSettlementEdit] = useState(false);
  const [salaryAdvanceRecovery, setSalaryAdvanceRecovery] = useState(0);
  const [loanRecovery, setLoanRecovery] = useState(0);
  const [additionalDeductions, setAdditionalDeductions] = useState(0);

  const [fetchError, setFetchError] = useState(false);

  // Negotiate Modal states
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [proposedLwd, setProposedLwd] = useState('');

  const handleNegotiateSubmit = async () => {
    if (!proposedLwd) {
      toast.error('Please select a proposed Last Working Day');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await axiosInstance.put(`/exit/${request.id}/negotiate-lwd`, {
        proposed_lwd: proposedLwd
      });
      if (res.data.success) {
        toast.success('Proposed new Last Working Day for negotiation');
        setRequest(res.data.data);
        setShowNegotiateModal(false);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error('Negotiation error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit proposed date');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeLwdDecision = async (decision: 'ACCEPT' | 'DECLINE') => {
    try {
      setIsSubmitting(true);
      const targetStatus = decision === 'ACCEPT' ? EXIT_STATUS.RESIGNATION_ACCEPTED : EXIT_STATUS.PENDING_ACCEPTANCE;
      const res = await axiosInstance.put(`/exit/${request.id}/status`, {
        status: targetStatus
      });
      if (res.data.success) {
        toast.success(decision === 'ACCEPT' ? 'Accepted manager proposed Last Working Day' : 'Declined proposed date, reverting to pending review');
        setRequest(res.data.data);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error('LWD decision error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KT Management Modal states
  const [showKTModal, setShowKTModal] = useState(false);
  const [ktFormStatus, setKtFormStatus] = useState<string>('Not Started');
  const [ktFormAssignee, setKtFormAssignee] = useState<any>(null);
  const [ktFormAssigneeQuery, setKtFormAssigneeQuery] = useState('');
  const [ktFormDescription, setKtFormDescription] = useState('');
  const [ktFormCompletionDate, setKtFormCompletionDate] = useState('');
  const [ktFormVerifiedBy, setKtFormVerifiedBy] = useState<any>(null);
  const [ktFormVerifiedByQuery, setKtFormVerifiedByQuery] = useState('');
  const [ktFormRemarks, setKtFormRemarks] = useState('');

  const [ktAssigneeResults, setKtAssigneeResults] = useState<any[]>([]);
  const [ktVerifiedByResults, setKtVerifiedByResults] = useState<any[]>([]);
  const [isSearchingKTAssignee, setIsSearchingKTAssignee] = useState(false);
  const [isSearchingKTVerifiedBy, setIsSearchingKTVerifiedBy] = useState(false);
  const [showKTAssigneeDrop, setShowKTAssigneeDrop] = useState(false);
  const [showKTVerifiedByDrop, setShowKTVerifiedByDrop] = useState(false);

  const openKTEditModal = () => {
    setKtFormStatus(request.kt_status || 'In Progress');
    setKtFormAssignee(request.kt_assignee || null);
    setKtFormAssigneeQuery(
      request.kt_assignee?.details
        ? `${request.kt_assignee.details.first_name} ${request.kt_assignee.details.last_name} (${request.kt_assignee.details.employee_id || ''})`
        : request.kt_assignee?.username || ''
    );
    setKtFormDescription(request.kt_description || '');
    setKtFormCompletionDate(request.kt_completion_date ? new Date(request.kt_completion_date).toISOString().split('T')[0] : '');
    setKtFormVerifiedBy(request.kt_verified_by || currentUser);
    setKtFormVerifiedByQuery(
      request.kt_verified_by?.details
        ? `${request.kt_verified_by.details.first_name} ${request.kt_verified_by.details.last_name} (${request.kt_verified_by.details.employee_id || ''})`
        : request.kt_verified_by?.username || (currentUser?.name || '')
    );
    setKtFormRemarks(request.kt_remarks || '');
    setShowKTModal(true);
  };

  const handleSaveKT = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        kt_status: ktFormStatus,
        kt_assignee_id: ktFormAssignee?.id || null,
        kt_description: ktFormDescription,
        kt_completion_date: ktFormCompletionDate || null,
        kt_verified_by_id: ktFormVerifiedBy?.id || null,
        kt_remarks: ktFormRemarks
      };

      const response = await axiosInstance.put(`/exit/${request.id}`, payload);
      if (response.data.success) {
        const updatedReq = response.data.data;
        if (ktFormStatus === 'Completed') {
          toast.success('KT Completed! Exit request advanced to next clearance phase.');
          const nextTab = (hasAssets) ? 'Assets' : 'Clearance';
          setActiveTab(nextTab);
        } else {
          toast.success('Knowledge Transfer details updated successfully');
        }
        setRequest(updatedReq);
        setShowKTModal(false);
        if (onRefresh) onRefresh();
      }
    } catch (error: any) {
      console.error('Failed to update KT details:', error);
      toast.error(error.response?.data?.message || 'Failed to update Knowledge Transfer details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDeptName = (empOrDetails: any): string => {
    if (!empOrDetails) return '';
    const d = empOrDetails.details || empOrDetails;
    if (d.department) {
      if (typeof d.department === 'string') return d.department;
      if (typeof d.department === 'object') {
        return d.department.department_name || d.department.name || d.department.department_code || '';
      }
    }
    if (d.department_name && typeof d.department_name === 'string') return d.department_name;
    if (empOrDetails.department) {
      if (typeof empOrDetails.department === 'string') return empOrDetails.department;
      if (typeof empOrDetails.department === 'object') {
        return empOrDetails.department.department_name || empOrDetails.department.name || '';
      }
    }
    return '';
  };

  const exitingEmployeeDept = getDeptName(employeeDetails) || getDeptName(request?.user) || 'General';

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setIsSearchingKTAssignee(true);
        const searchVal = ktFormAssigneeQuery.includes('(') ? '' : ktFormAssigneeQuery.trim();
        const list = await getEmployees({ search: searchVal, limit: 100 });

        if (Array.isArray(list) && list.length > 0) {
          const targetDept = exitingEmployeeDept.toLowerCase().trim();
          if (targetDept && targetDept !== 'general') {
            const sameDeptList = list.filter((emp: any) => {
              const empDept = getDeptName(emp).toLowerCase().trim();
              if (!empDept) return true;
              return empDept.includes(targetDept) || targetDept.includes(empDept);
            });
            setKtAssigneeResults(sameDeptList.length > 0 ? sameDeptList : list);
          } else {
            setKtAssigneeResults(list);
          }
        } else {
          setKtAssigneeResults([]);
        }
      } catch (err) {
        console.error('KT assignee search error:', err);
      } finally {
        setIsSearchingKTAssignee(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [ktFormAssigneeQuery, exitingEmployeeDept]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setIsSearchingKTVerifiedBy(true);
        const searchVal = ktFormVerifiedByQuery.includes('(') ? '' : ktFormVerifiedByQuery.trim();
        const list = await getEmployees({ search: searchVal, limit: 100 });
        setKtVerifiedByResults(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('KT verifier search error:', err);
      } finally {
        setIsSearchingKTVerifiedBy(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [ktFormVerifiedByQuery]);

  useEffect(() => {
    if (request?.settlement_data) {
      const extraData = request.settlement_data.data || {};
      setSalaryAdvanceRecovery(Number(extraData.salaryAdvanceRecovery || 0));
      setLoanRecovery(Number(extraData.loanRecovery || 0));
      setAdditionalDeductions(Number(extraData.additionalDeductions || 0));
    }
  }, [request]);

  // Fetch full details including related data
  useEffect(() => {
    const fetchFullDetails = async () => {
      try {
        setIsLoading(true);
        setFetchError(false);
        // Step 1: Fetch Exit Request Full Details
        const exitResponse = await axiosInstance.get(`/exit/${initialRequest.id}`);
        if (exitResponse.data.success) {
          const exitData = exitResponse.data.data;
          setRequest(exitData);

          // Step 2: Fetch Real-time Employee Details using user ID
          const userId = exitData.user_id || exitData.user?.id;
          if (userId) {
            const empResponse = await axiosInstance.get(`/employees/${userId}`);
            if (empResponse.data.success) {
              setEmployeeDetails(empResponse.data.data);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        setFetchError(true);
        toast.error('Failed to load complete details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullDetails();
  }, [initialRequest.id]);

  const getProgress = () => {
    if (request.status === EXIT_STATUS.REJECTED) return 0;
    if (request.kt_status === 'Completed' && (request.progress_percentage || 0) < 35) {
      return 35;
    }
    return request.progress_percentage || 0;
  };

  const completionProgress = getProgress();

  const getWorkflowSteps = () => {
    const status = request.status;
    const hasAssets = isAssetTrackingEnabled && request?.assets && request.assets.length > 0;

    const steps = [
      { id: EXIT_STATUS.PENDING_ACCEPTANCE, label: 'Resignation Submitted', icon: FileText },
      { id: EXIT_STATUS.RESIGNATION_ACCEPTED, label: 'Acknowledgment & Acceptance', icon: User },
      { id: EXIT_STATUS.OFFBOARDING, label: 'Knowledge Transfer', icon: ClipboardCheck },
      ...(hasAssets ? [{ id: EXIT_STATUS.ASSET_HANDOVER, label: 'Assets Returned', icon: Shield }] : []),
      { id: EXIT_STATUS.IT_CLEARANCE, label: 'Clearance & Approvals', icon: ClipboardCheck },
      { id: EXIT_STATUS.EXIT_INTERVIEW, label: 'Exit Interview', icon: MessageSquare },
      { id: EXIT_STATUS.FINAL_SETTLEMENT, label: 'Final Settlement', icon: DollarSign },
      { id: EXIT_STATUS.COMPLETED, label: 'Exit & Post-Exit', icon: CheckCircle2 },
    ];

    const statusOrder = [
      EXIT_STATUS.PENDING_ACCEPTANCE,
      EXIT_STATUS.RESIGNATION_ACCEPTED,
      EXIT_STATUS.OFFBOARDING,
      ...(hasAssets ? [EXIT_STATUS.ASSET_HANDOVER] : []),
      EXIT_STATUS.IT_CLEARANCE,
      EXIT_STATUS.EXIT_INTERVIEW,
      EXIT_STATUS.CLEARANCE, // For legacy/compatibility
      EXIT_STATUS.FINAL_SETTLEMENT,
      EXIT_STATUS.COMPLETED
    ];
    
    const currentIdx = statusOrder.indexOf(status);
    const isRejected = status === 'REJECTED';
    const ktDone = request.kt_status === 'Completed';

    let effectiveCurrentIdx = currentIdx;
    if (ktDone && currentIdx <= statusOrder.indexOf(EXIT_STATUS.OFFBOARDING)) {
      effectiveCurrentIdx = statusOrder.indexOf(EXIT_STATUS.OFFBOARDING) + 1;
    }

    return steps.map((step) => {
      const stepIdx = statusOrder.indexOf(step.id);
      let stepStatus = 'Upcoming';
      let color = 'text-muted-foreground';
      let bgColor = 'bg-muted';

      if (isRejected) {
        stepStatus = 'Cancelled';
        color = 'text-red-500';
        bgColor = 'bg-red-500';
      } else if (stepIdx < effectiveCurrentIdx || status === EXIT_STATUS.COMPLETED) {
        stepStatus = 'Approved';
        color = 'text-primary';
        bgColor = 'bg-primary';
      } else if (stepIdx === effectiveCurrentIdx) {
        stepStatus = 'Current Phase';
        color = 'text-primary';
        bgColor = 'bg-primary';
      } else if (status === EXIT_STATUS.NEGOTIATION_PENDING && stepIdx === 1) {
        stepStatus = 'Negotiation Pending';
        color = 'text-amber-600';
        bgColor = 'bg-amber-600';
      }

      return {
        ...step,
        status: stepStatus,
        color,
        bgColor
      };
    });
  };

  const handleAssetToggle = async (assetId: number, currentStatus: boolean) => {
    try {
      setIsSubmitting(true);
      const response = await axiosInstance.patch(`/exit/asset/${assetId}/status`, { returnStatus: !currentStatus });
      if (response.data.success) {
        toast.success('Asset status updated');
        // Update local state
        const updatedAssets = request.assets.map((a: any) => 
          a.id === assetId ? { ...a, return_status: !currentStatus } : a
        );

        // Auto-update IT clearance task locally if all assets are returned
        const allReturned = updatedAssets.every((a: any) => a.return_status);
        const updatedTasks = request.clearance_tasks?.map((t: any) => {
          if (allReturned && t.task_name === 'Asset Audit & Recovery') {
            return { ...t, status: 'COMPLETED', completion_date: new Date().toISOString() };
          }
          return t;
        });

        setRequest({ ...request, assets: updatedAssets, clearance_tasks: updatedTasks });
      }
    } catch (error) {
      console.error('Failed to update asset status:', error);
      toast.error('Failed to update asset status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearanceTaskToggle = async (taskId: number, currentStatus: string) => {
    try {
      setIsSubmitting(true);
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      const response = await axiosInstance.patch(`/exit/clearance-task/${taskId}/status`, { status: newStatus });
      if (response.data.success) {
        toast.success('Task status updated');
        // Update local state
        const updatedTasks = request.clearance_tasks.map((t: any) => 
          t.id === taskId ? { ...t, status: newStatus } : t
        );
        setRequest({ ...request, clearance_tasks: updatedTasks });
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminAction = async (status: string) => {
    try {
      setIsSubmitting(true);
      const payload: any = { status };
      
      if (status === 'FINAL_SETTLEMENT') {
        payload.interview_responses = {
          data: {
            reason: interviewData.reason || 'Career Growth',
            rating: interviewData.rating || '8',
            feedback: interviewData.feedback || 'Great work environment'
          }
        };
      }
      
      const response = await axiosInstance.put(`/exit/${request.id}/status`, payload);
      if (response.data.success) {
        toast.success(`Request moved to ${status.replace(/_/g, ' ').toLowerCase()} phase successfully`);
        setRequest(response.data.data);
        setActiveTab(getTabForStatus(status));
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAllClearanceTasksCompleted = async () => {
    try {
      setIsSubmitting(true);
      if (request.clearance_tasks?.length > 0) {
        await Promise.all(
          request.clearance_tasks.map((task: any) =>
            axiosInstance.patch(`/exit/clearance-task/${task.id}/status`, { status: 'COMPLETED' })
          )
        );
      }
      const response = await axiosInstance.put(`/exit/${request.id}/status`, { status: EXIT_STATUS.EXIT_INTERVIEW });
      if (response.data.success) {
        toast.success('All clearance tasks marked COMPLETED. Advanced to Exit Interview phase!');
        setRequest(response.data.data);
        setActiveTab('Interview');
        if (onRefresh) onRefresh();
      }
    } catch (error: any) {
      console.error('Failed to mark clearance tasks:', error);
      toast.error('Failed to complete clearance tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHROverride = async (status: string) => {
    if (!overrideReason) {
      toast.error('Please provide a reason for HR override');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axiosInstance.post(`/exit/${request.id}/hr-override`, {
        status,
        comments: overrideReason
      });
      if (response.data.success) {
        toast.success('HR Override successful');
        setRequest(response.data.data);
        setShowOverrideModal(false);
        setActiveTab(getTabForStatus(status));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Override failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettlement = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        total_earnings: Number(request.settlement_data.total_earnings || 0),
        gratuity: Number(request.settlement_data.gratuity || 0),
        leave_encashment: Number(request.settlement_data.leave_encashment || 0),
        notice_pay: Number(request.settlement_data.notice_pay || 0),
        salaryAdvanceRecovery,
        loanRecovery,
        additionalDeductions
      };

      const response = await axiosInstance.put(`/exit/${request.id}/settlement`, payload);
      if (response.data.success) {
        toast.success('F&F settlement details updated successfully');
        setRequest(response.data.data);
        setShowSettlementEdit(false);
      }
    } catch (error: any) {
      console.error('Failed to save settlement:', error);
      toast.error(error.response?.data?.message || 'Failed to save settlement details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAssets = isAssetTrackingEnabled && request?.assets && request.assets.length > 0;

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: FileText },
    { id: 'KT', label: 'Knowledge Transfer', icon: ClipboardCheck },
    ...(hasAssets ? [{ id: 'Assets', label: 'Assets Returned', icon: Shield }] : []),
    { id: 'Clearance', label: 'Clearance Checklist', icon: ClipboardCheck },
    { id: 'Interview', label: 'Exit Interview', icon: MessageSquare },
    { id: 'Settlement', label: 'Final Settlement', icon: DollarSign },
    { id: 'Workflow', label: 'Workflow & History', icon: CheckCircle2 },
  ];

  if (fetchError) {
    return (
      <div className="w-full min-h-[600px] flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-xl font-bold text-foreground mb-2">Something went wrong</p>
        <p className="text-muted-foreground mb-6 text-center max-w-md">We couldn't synchronize the exit data with the database. This might be due to a connection issue or a server error.</p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} className="bg-primary">Retry Synchronization</Button>
          <Button variant="outline" onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (isLoading || !employeeDetails) {
    return (
      <div className="w-full min-h-[600px] flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
        <p className="text-lg font-medium">Synchronizing exit and employee data...</p>
      </div>
    );
  }

  const workflowStepsCount = getWorkflowSteps().length;
  const stepperHalfStepPercent = 100 / (2 * workflowStepsCount);

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
         <div className="flex items-center gap-5">
            <button 
               onClick={onBack}
               className="icon-circle-btn hover:bg-slate-100 hover:text-slate-700 hover:border-slate-200 transition-all duration-300"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-md border-2 border-white ring-4 ring-primary/10">
               {employeeDetails.details?.profile_picture ? (
                  <img
                    src={getProfilePictureUrl(employeeDetails.details.profile_picture) || ''}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${employeeDetails.details?.first_name || ''}+${employeeDetails.details?.last_name || ''}&background=6366f1&color=fff`;
                    }}
                  />
               ) : (
                  `${employeeDetails.details?.first_name?.[0] || ''}${employeeDetails.details?.last_name?.[0] || ''}`
               )}
            </div>
            <div>
               <h1 className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                  {`${employeeDetails.details?.first_name || ''} ${employeeDetails.details?.last_name || ''}`.trim()}
               </h1>
               <p className="text-sm text-muted-foreground font-semibold mt-1">
                  {employeeDetails.details?.department?.department_name || 'N/A'} • {employeeDetails.details?.team?.team_name || 'N/A'}
               </p>
               <div className="flex flex-wrap items-center gap-2 mt-3.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm transition-all ${
                     request.status === EXIT_STATUS.REJECTED ? 'bg-red-50 text-red-600 border-red-100' :
                     request.status === EXIT_STATUS.COMPLETED ? 'bg-blue-50 text-primaryborder-blue-100' :
                     request.status === EXIT_STATUS.PENDING_ACCEPTANCE ? 'bg-amber-50 text-amber-600 border-amber-100' :
                     'bg-primary-50 text-primary-600 border-primary-100'
                  }`}>
                     {request.status === EXIT_STATUS.PENDING_ACCEPTANCE ? <Clock className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                     {request.kt_status === 'Completed' && (request.status === EXIT_STATUS.RESIGNATION_ACCEPTED || request.status === EXIT_STATUS.OFFBOARDING)
                        ? 'Clearance & Approvals'
                        : request.status.charAt(0) + request.status.slice(1).toLowerCase().replace(/_/g, ' ')
                     }
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-primaryborder border-blue-100 text-xs font-bold shadow-sm">
                     {request.exit_type || 'Resignation'}
                  </span>
               </div>
            </div>
         </div>

         <div className="flex flex-row items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-muted/40 border border-border/80 px-3 py-1.5 rounded-lg shadow-sm">
               <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Exit ID:</span>
               <span className="text-xs font-bold text-foreground">EXIT-{request.id?.toString().padStart(3, '0') || '001'}</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/40 border border-border/80 px-3 py-1.5 rounded-lg shadow-sm">
               <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Requested LWD:</span>
               <span className="text-xs font-bold text-foreground">
                 {request.last_working_day ? new Date(request.last_working_day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
               </span>
            </div>
            {request.negotiated_lwd && (
               <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">Manager Proposed LWD:</span>
                  <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                    {new Date(request.negotiated_lwd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
               </div>
            )}
         </div>
      </div>

      {/* Main Workflow Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
         <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
               <TrendingUp className="w-4 h-4 text-primary" />
               Offboarding Journey ({workflowStepsCount} Phases)
            </h3>
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
               <CheckCircle className="w-3.5 h-3.5 text-primary" />
               <span className="text-xs font-bold text-primary">{completionProgress}% Complete</span>
            </div>
         </div>
         
         {/* Desktop Timeline */}
         <div className="hidden md:block relative h-28">
            {/* Progress Line */}
            <div className="absolute top-6 left-[22px] right-[22px] h-0.5 -z-0">
               <div className="w-full h-full bg-muted rounded" />
               <div 
                  className="absolute top-0 left-0 h-full bg-primary rounded transition-all duration-1000"
                  style={{ width: `${completionProgress}%` }} 
               />
            </div>

            {/* Stepper Nodes */}
            {getWorkflowSteps().map((step, idx) => {
               const totalSteps = getWorkflowSteps().length;
               const pct = idx / (totalSteps - 1);
               const circleLeft = `calc(${pct} * (100% - 44px))`;
               
               // Label style
               let labelStyle = {};
               let labelClass = "";
               
               if (idx === 0) {
                  labelStyle = { left: 0 };
                  labelClass = "text-left w-[120px]";
               } else if (idx === totalSteps - 1) {
                  labelStyle = { right: 0 };
                  labelClass = "text-right w-[120px]";
               } else {
                  labelStyle = { 
                     left: `calc(22px + ${pct} * (100% - 44px))`, 
                     transform: 'translateX(-50%)' 
                  };
                  labelClass = "text-center w-[120px]";
               }

               return (
                  <React.Fragment key={idx}>
                     {/* Circle */}
                     <div 
                        className={`absolute top-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${step.bgColor} shadow-sm text-white`}
                        style={{ left: circleLeft }}
                     >
                        <step.icon className="w-5 h-5" />
                     </div>

                     {/* Label */}
                     <div 
                        className={`absolute top-14 mt-1 ${labelClass}`}
                        style={labelStyle}
                     >
                        <p className="text-[11px] font-bold text-foreground leading-tight">{step.label}</p>
                        <p className={`text-[10px] font-bold mt-1 ${step.color}`}>
                           {step.status}
                        </p>
                     </div>
                  </React.Fragment>
               );
            })}
         </div>
         
         {/* Mobile Timeline */}
         <div className="block md:hidden space-y-4">
            {getWorkflowSteps().map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 text-white transition-all ${
                  step.bgColor === 'bg-primary' ? 'bg-primary border-primary animate-pulse'
                  : step.bgColor === 'bg-red-500' ? 'bg-red-500 border-red-500'
                  : step.bgColor === 'bg-amber-600' ? 'bg-amber-600 border-amber-600'
                  : 'bg-muted/50 border-border !text-muted-foreground'
                }`}>
                  <step.icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${
                      step.color === 'text-primary' ? 'text-primary-600' : step.color
                    }`}>{step.label}</p>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                      step.status === 'Approved' ? 'bg-primary-50 text-primary-600 border-primary-100'
                      : step.status === 'Current Phase' ? 'bg-primary-50 text-primary-600 border-primary-100'
                      : 'bg-muted/50 text-muted-foreground border-border'
                    }`}>{step.status}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Step {idx + 1} of exit workflow</p>
                </div>
              </div>
            ))}
         </div>
      </div>

      {/* Action Cards based on Phase */}
      {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.id === employeeDetails?.reporting_manager_id?.toString() || currentUser?.id === request?.reporting_manager_id?.toString()) && (request.status === EXIT_STATUS.PENDING_ACCEPTANCE || request.status === EXIT_STATUS.NEGOTIATION_PENDING) && (
         <div className="mt-8 p-8 bg-amber-50/60 border border-amber-200/80 rounded-xl animate-in slide-in-from-top-4 duration-700 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-amber-100/80 rounded-xl flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
                     <User className="w-7 h-7" />
                  </div>
                  <div>
                     <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Phase 2: Resignation Review & Approval</h4>
                     <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-lg">
                        Review the employee's exit request reason, notice date, and last working day. You can accept, propose a new LWD for negotiation, or reject.
                     </p>
                     {request.sla_deadline && new Date(request.sla_deadline) < new Date() && (
                       <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                         <AlertCircle className="w-3.5 h-3.5" />
                         SLA OVERDUE: Response pending beyond 3 business days
                       </p>
                     )}
                  </div>
               </div>
               <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  <Button 
                     variant="outline"
                     onClick={() => handleAdminAction(EXIT_STATUS.REJECTED)}
                     disabled={isSubmitting}
                     className="h-10 px-5 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
                  >
                     <X className="w-4 h-4" />
                     Reject
                  </Button>
                  <Button 
                     variant="outline"
                     onClick={() => {
                       setProposedLwd(request.last_working_day ? new Date(request.last_working_day).toISOString().split('T')[0] : '');
                       setShowNegotiateModal(true);
                     }}
                     disabled={isSubmitting}
                     className="h-10 px-5 border-amber-200 text-amber-600 hover:bg-amber-50 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
                  >
                     <MessageSquare className="w-4 h-4" />
                     Negotiate LWD
                  </Button>
                  <Button 
                     variant="outline"
                     onClick={() => handleAdminAction(EXIT_STATUS.RESIGNATION_ACCEPTED)}
                     disabled={isSubmitting}
                     className="h-10 px-6 border-teal-200 text-teal-600 hover:bg-teal-50 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
                  >
                     {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                     Accept Resignation
                  </Button>
               </div>
            </div>
         </div>
      )}

      {/* Employee View during LWD Negotiation */}
      {(currentUser?.role === 'EMPLOYEE' || String(currentUser?.id) === String(request?.user_id) || String(currentUser?.id) === String(request?.user?.id)) && request?.status === EXIT_STATUS.NEGOTIATION_PENDING && (
        <div className="mt-8 p-6 bg-amber-50/60 border border-amber-200/80 rounded-xl shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100/80 rounded-xl flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Manager Proposed Revised LWD</h4>
                <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-xl">
                  Your reporting manager has proposed a revised Last Working Day of{' '}
                  <span className="font-extrabold text-amber-950 underline">
                    {request?.negotiated_lwd 
                      ? new Date(request.negotiated_lwd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                      : request?.last_working_day 
                        ? new Date(request.last_working_day).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Selected Date'}
                  </span>
                  . Please accept the proposed date or decline to keep your original notice period schedule.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-end">
              <Button
                variant="outline"
                onClick={() => handleEmployeeLwdDecision('DECLINE')}
                disabled={isSubmitting}
                className="h-10 px-5 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Decline (Keep Original)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleEmployeeLwdDecision('ACCEPT')}
                disabled={isSubmitting}
                className="h-10 px-6 border-teal-200 text-teal-600 hover:bg-teal-50 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accept Proposed LWD
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HR Override Section */}
      {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN) && 
       request.status === EXIT_STATUS.PENDING_ACCEPTANCE && (
         <div className="mt-4 p-6 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-900">Manager SLA Breached</p>
              <p className="text-xs text-red-600">The manager has not responded within the 3-day window. HR intervention is allowed.</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-100"
            onClick={() => setShowOverrideModal(true)}
          >
            Force Approve (HR Override)
          </Button>
        </div>
      )}



      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && request.status === EXIT_STATUS.OFFBOARDING && (
         <div className="mt-8 p-8 bg-purple-50 border border-purple-100 rounded-lg animate-in slide-in-from-top-4 duration-700 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-card rounded-lg flex items-center justify-center shadow-sm shadow-purple-100/50">
                     <ClipboardCheck className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                     <h4 className="text-[12px] font-medium text-foreground mb-1">
                        {hasAssets ? 'Phase 4: Assets Returned Phase' : 'Phase 4: Department Clearance'}
                     </h4>
                     <p className="text-[13px] text-muted-foreground font-medium leading-relaxed max-w-md">
                        {hasAssets
                           ? 'Knowledge Transfer phase initiated. Move to the Assets Returned phase to manage physical and digital assets return.'
                           : 'Knowledge Transfer phase initiated. No assets assigned to this employee. Proceed directly to Department Clearance.'
                        }
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-4 w-full md:w-auto">
                  <Button 
                     onClick={() => handleAdminAction(hasAssets ? EXIT_STATUS.ASSET_HANDOVER : EXIT_STATUS.IT_CLEARANCE)}
                     disabled={isSubmitting}
                     className="flex-1 md:flex-none h-14 px-10 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm shadow-purple-200 transition-all active:scale-95"
                  >
                     {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ClipboardCheck className="w-5 h-5 mr-2" />}
                     {hasAssets ? 'Initiate Asset Handover' : 'Proceed to Clearance'}
                  </Button>
               </div>
            </div>
         </div>
      )}

       {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && request.status === EXIT_STATUS.ASSET_HANDOVER && (
          <div className="mt-8 p-8 bg-green-50/50 border border-green-200 rounded-lg animate-in slide-in-from-top-4 duration-700 shadow-sm">
             <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-card rounded-lg flex items-center justify-center shadow-sm shadow-green-100/50">
                      <Shield className="w-8 h-8 text-green-600" />
                   </div>
                   <div>
                      <h4 className="text-[12px] font-medium text-foreground mb-1">Phase 5: Complete Asset Handover</h4>
                      <p className="text-[13px] text-muted-foreground font-medium leading-relaxed max-w-md">
                         {hasAssets
                            ? 'Please verify that all assigned assets have been returned in satisfactory condition, then proceed to finalize asset recovery.'
                            : 'No company assets were assigned to this employee. Click below to proceed to Clearance.'
                         }
                      </p>
                   </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <Button 
                      onClick={() => handleAdminAction(EXIT_STATUS.IT_CLEARANCE)}
                      disabled={isSubmitting || (hasAssets && request.assets?.some((a: any) => !(a.return_status === true || a.return_status === 'Returned')))}
                      className="flex-1 md:flex-none h-14 px-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm shadow-green-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      Complete Asset Handover
                   </Button>
                </div>
             </div>
          </div>
       )}

      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && request.status === EXIT_STATUS.CLEARANCE && (
         <div className="mt-8 p-8 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-top-4 duration-700 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-card rounded-lg flex items-center justify-center shadow-sm shadow-blue-100/50">
                     <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                     <h4 className="text-[12px] font-medium text-foreground mb-1">Phase 6: Final Settlement & Exit</h4>
                     <p className="text-[13px] text-muted-foreground font-medium leading-relaxed max-w-md">
                        All clearances obtained. Process Full & Final settlement and generate experience letters.
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-4 w-full md:w-auto">
                  <Button 
                     onClick={() => handleAdminAction(EXIT_STATUS.FINAL_SETTLEMENT)}
                     disabled={isSubmitting}
                     className="flex-1 md:flex-none h-14 px-10 bg-primary hover:bg-primary/70 text-white font-bold rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-95"
                  >
                     {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Calculator className="w-5 h-5 mr-2" />}
                     Initiate Settlement
                  </Button>
               </div>
            </div>
         </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-border mt-2 flex items-center gap-8">
         {tabs.map((tab) => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2.5 pb-2 px-1 transition-all relative ${
                  activeTab === tab.id ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium hover:text-foreground'
               }`}
            >
               <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'}`} />
               <span className="text-[12px] font-medium">{tab.label}</span>
               {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-left-2" />
               )}
            </button>
         ))}
      </div>

      {/* Tab Content */}
      <div className="mt-1 animate-in slide-in-from-top-2 duration-700">
         {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Left Column: Details Cards */}
               <div className="lg:col-span-2 space-y-6">
                   {/* Employee Details Card */}
                   <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-sm transition-all duration-300">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                         <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                            <User className="w-4 h-4 text-primary" />
                         </div>
                         <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Employee Profile</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Employee ID</p>
                            <p className="text-xs font-bold text-foreground">{employeeDetails.details?.employee_id || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Primary Email</p>
                            <p className="text-xs font-bold text-foreground truncate">{employeeDetails.email || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Department</p>
                            <span className="inline-flex px-2 py-0.5 rounded bg-muted/50 border border-border text-slate-600 text-[10px] font-bold">
                               {employeeDetails.details?.department?.department_name || 'N/A'}
                            </span>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Direct Team</p>
                            <p className="text-xs font-bold text-foreground">{employeeDetails.details?.team?.team_name || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Reporting Manager</p>
                            <p className="text-xs font-bold text-foreground">
                               {`${employeeDetails.details?.reporting_manager?.details?.first_name || ''} ${employeeDetails.details?.reporting_manager?.details?.last_name || ''}`.trim() || 'N/A'}
                            </p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Joining Date</p>
                            <p className="text-xs font-bold text-foreground">
                              {employeeDetails.details?.start_date ? new Date(employeeDetails.details.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </p>
                         </div>
                      </div>
                   </div>

                   {/* Exit Information Card */}
                   <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-sm transition-all duration-300">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                         <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                            <FileText className="w-4 h-4 text-primary" />
                         </div>
                         <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Exit Initiation Details</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Exit Classification</p>
                            <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-primarytext-[10px] font-bold">
                               {request.exit_type}
                            </span>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Primary Exit Reason</p>
                            <p className="text-xs font-bold text-foreground">{request.primary_reason || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Resignation Lodged</p>
                            <p className="text-xs font-bold text-foreground">
                              {request.notice_date ? new Date(request.notice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Calculated LWD</p>
                            <p className="text-xs font-bold text-foreground">
                              {request.last_working_day ? new Date(request.last_working_day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                            </p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Waiver Requested</p>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${request.notice_waiver ? 'bg-amber-50 border border-amber-100 text-amber-600' : 'bg-muted/50 border border-border text-muted-foreground'}`}>
                               {request.notice_waiver ? 'Yes' : 'No'}
                            </span>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Interview Preference</p>
                            <p className="text-xs font-bold text-foreground">{request.interview_pref || 'Not Specified'}</p>
                         </div>
                      </div>
                      
                      {request.explanation && (
                        <div className="mt-5 p-4 bg-muted/50 border border-border/60 rounded-lg">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Explanatory Note / Remarks</p>
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold italic">"{request.explanation}"</p>
                        </div>
                      )}
                   </div>

                  {/* Exit Timeline Card */}
                  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                     <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Exit Timeline</h3>
                     </div>
                     <div className="px-6 pb-6 pt-4">
                        <div className="space-y-5 relative">
                           {/* Vertical Line */}
                           <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-muted" />
                           
                           {getWorkflowSteps()
                              .filter(step => step.status !== 'Upcoming' || request.status === 'COMPLETED')
                              .map((step, idx) => (
                              <div key={idx} className="relative flex items-start gap-6 group">
                                 <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                                    step.status === 'Approved' ? 'bg-primary/10 text-primary border-primary/20' : 
                                    step.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                 }`}>
                                    {step.status === 'Approved' ? <CheckCircle2 className="w-4 h-4 text-primary" /> : 
                                     step.status === 'Pending' ? <Clock className="w-4 h-4 text-amber-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                                 </div>
                                 <div className="flex flex-col">
                                    <p className={`text-sm font-medium leading-none mb-1.5 transition-colors ${
                                       step.status === 'Approved' ? 'text-foreground' : 
                                       step.status === 'Pending' ? 'text-amber-600' : 'text-rose-600'
                                    }`}>
                                       {step.label}
                                    </p>
                                    <p className="text-[12px] font-medium text-muted-foreground">
                                       {step.id === 'PENDING' ? new Date(request.notice_date || request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                                        step.id === 'COMPLETED' ? new Date(request.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                                        new Date(request.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Column: Sidebars */}
               <div className="space-y-6">
                  {/* Quick Actions Card */}
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                     <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5">Quick Actions</h3>
                     <div className="space-y-2.5">
                        {[
                           { label: 'View Workflow', icon: CheckCircle, tab: 'Workflow' },
                           { label: 'View Exit Interview', icon: MessageSquare, tab: 'Interview' },
                           { label: 'Clearance Checklist', icon: ClipboardCheck, tab: 'Clearance' },
                           { label: 'Process Settlement', icon: DollarSign, tab: 'Settlement' },
                           { 
                             label: 'Generate Relieving & Experience Letters', 
                             icon: FileText, 
                             action: async () => {
                               try {
                                 toast.loading('Generating documents...', { id: 'gen-docs' });
                                 const response = await axiosInstance.post(`/exit/${request.id}/generate-docs`);
                                 if (response.data.success) {
                                   toast.success('Documents generated successfully', { id: 'gen-docs' });
                                   const baseUrl = axiosInstance.defaults.baseURL?.replace('/employee-api', '') || '';
                                   window.open(`${baseUrl}${response.data.data.relievingUrl}`, '_blank');
                                 }
                               } catch (error: any) {
                                 toast.error(error.response?.data?.message || 'Failed to generate documents', { id: 'gen-docs' });
                               }
                             } 
                           },
                           { label: 'Download HR Exit Audit Report', icon: Download, action: () => toast.info('Preparing report for download...') },
                        ].map((item, idx) => (
                           <button
                             key={idx}
                             onClick={() => item.tab ? setActiveTab(item.tab) : item.action?.()}
                             className="w-full flex items-center gap-3 p-2 bg-muted/50 border border-border/60 rounded-lg hover:bg-primary/5 hover:border-primary/20 transition-all group cursor-pointer"
                           >
                              <div className="w-8 h-8 rounded-lg bg-card border border-border group-hover:bg-primary/10 group-hover:border-primary/20 flex items-center justify-center transition-colors flex-shrink-0">
                                 <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors text-left">{item.label}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Status Summary Card */}
                  <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-foreground">Offboarding Progress</h3>
                        <span className="text-sm font-bold text-primary">{completionProgress}%</span>
                     </div>
                     <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden shadow-inner mb-6">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 shadow-sm ${request.status === 'REJECTED' ? 'bg-rose-500' : 'bg-primary'}`} 
                          style={{ width: `${completionProgress}%` }}
                        />
                     </div>
                     
                     <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current Phase</span>
                           <span className="font-bold text-foreground">
                             {request.status === EXIT_STATUS.PENDING_ACCEPTANCE ? 'Manager Acknowledgment' : 
                              request.status === EXIT_STATUS.NEGOTIATION_PENDING ? 'LWD Negotiation' :
                              (request.kt_status === 'Completed' && (request.status === EXIT_STATUS.RESIGNATION_ACCEPTED || request.status === EXIT_STATUS.OFFBOARDING)) ? 'Clearance & Approvals' :
                              request.status === EXIT_STATUS.RESIGNATION_ACCEPTED ? 'Resignation Accepted' : 
                              request.status === EXIT_STATUS.OFFBOARDING ? 'Workflow Triggered' :
                              request.status === EXIT_STATUS.ASSET_HANDOVER ? 'Asset Handover' :
                              request.status === EXIT_STATUS.IT_CLEARANCE ? 'IT Clearance' :
                              request.status === EXIT_STATUS.EXIT_INTERVIEW ? 'Exit Interview' :
                              request.status === EXIT_STATUS.CLEARANCE ? 'Clearance in Progress' :
                              request.status === EXIT_STATUS.FINAL_SETTLEMENT ? 'Settlement Processing' :
                              request.status === EXIT_STATUS.COMPLETED ? 'Separated' : 'Rejected'}
                           </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Submitted On</span>
                          <span className="font-bold text-foreground">{new Date(request.createdAt).toLocaleDateString()}</span>
                        </div>
                     </div>
                  </div>

                  {/* Documents Card */}
                  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                         <FileText className="w-5 h-5 text-primary" />
                         <h3 className="text-lg font-semibold text-foreground">Documents</h3>
                      </div>
                      <div className="px-6 pb-3 pt-2">
                         <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <FileText className="w-8 h-8 mb-3 opacity-20" />
                            <p className="text-sm font-medium">No documents uploaded yet</p>
                         </div>
                      </div>
                   </div>
               </div>
            </div>
         )}

         {activeTab === 'KT' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 border border-teal-100 rounded-lg">
                    <ClipboardCheck className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Knowledge Transfer (KT) Management</h3>
                    <p className="text-xs text-muted-foreground">Manager assignment, handover scope, and verification tracking.</p>
                  </div>
                </div>
                {request.kt_status !== 'Completed' && (
                  <Button 
                    onClick={openKTEditModal}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    Assign / Edit KT Details
                  </Button>
                )}
              </div>

              {!request.kt_status && !request.kt_assignee_id ? (
                <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
                  <div className="w-14 h-14 bg-muted border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No Knowledge Transfer recipient assigned yet.</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-5">Assign an employee to receive Knowledge Transfer and track handover completion.</p>
                  <Button 
                    onClick={openKTEditModal}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-10 px-6 rounded-lg inline-flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Assign KT Recipient
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Card 1: Knowledge Transfer */}
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-sm transition-all duration-300">
                     <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                        <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                           <ClipboardCheck className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Knowledge Transfer</h3>
                     </div>
                     
                     <div className="space-y-5">
                        <div>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">KT Status</p>
                           <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                             request.kt_status === 'Completed' ? 'bg-green-50 border border-green-100 text-green-600' :
                             request.kt_status === 'In Progress' ? 'bg-blue-50 border border-blue-100 text-blue-600' :
                             'bg-amber-50 border border-amber-100 text-amber-600'
                           }`}>
                              {request.kt_status || 'Pending'}
                           </span>
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">KT Assignee</p>
                           <p className="text-xs font-bold text-foreground">
                              {request.kt_assignee?.details 
                                ? `${request.kt_assignee.details.first_name} ${request.kt_assignee.details.last_name}`
                                : (request.kt_assignee?.username || 'N/A')}
                           </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Description</p>
                            <div className="p-4 bg-muted/50 border border-border/60 rounded-lg">
                              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                {request.kt_description || 'No description provided.'}
                              </p>
                            </div>
                         </div>
                     </div>
                  </div>

                  {/* Card 2: Completion Details */}
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-sm transition-all duration-300">
                     <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                        <div className="p-2 bg-teal-50 border border-teal-100 rounded-lg">
                           <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Completion Details</h3>
                     </div>
                     
                     <div className="space-y-5">
                        <div>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Completion Date</p>
                           <p className="text-xs font-bold text-foreground">
                              {request.kt_completion_date 
                                ? new Date(request.kt_completion_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Pending'}
                           </p>
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Verified By</p>
                           <p className="text-xs font-bold text-foreground">
                              {request.kt_verified_by?.details 
                                ? `${request.kt_verified_by.details.first_name} ${request.kt_verified_by.details.last_name}`
                                : (request.kt_verified_by?.username || 'N/A')}
                           </p>
                        </div>
                        <div>
                             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Remarks</p>
                             <div className="p-4 bg-muted/50 border border-border/60 rounded-lg">
                               <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                 {request.kt_remarks || 'No remarks provided.'}
                               </p>
                             </div>
                          </div>
                          {((currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && request.status === EXIT_STATUS.OFFBOARDING) && (
                             <div className="pt-4 border-t border-border/60 flex justify-end">
                                <Button 
                                  onClick={() => handleAdminAction(EXIT_STATUS.ASSET_HANDOVER)}
                                  disabled={isSubmitting}
                                  className="h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm shadow-purple-100 transition-all active:scale-95"
                                >
                                   {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                   Complete KT & Proceed
                                </Button>
                             </div>
                          )}
                     </div>
                  </div>
                </div>
              )}
            </div>
         )}

         {activeTab === 'Assets' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             {(!request.assets || request.assets.length === 0) ? (
               <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
                 <div className="w-14 h-14 bg-muted border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                   <Shield className="w-6 h-6 text-muted-foreground" />
                 </div>
                 <p className="text-sm font-bold text-foreground">No assets listed yet.</p>
                 <p className="text-xs text-muted-foreground mt-1">This request does not have any company assets registered for return.</p>
               </div>
             ) : (
               <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-sm transition-all duration-300">
                 <div className="px-6 py-5 border-b border-border flex items-center gap-3 bg-card">
                   <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <Shield className="w-4 h-4 text-blue-600" />
                   </div>
                   <div>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Company Assets to be Returned</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">List of physical and digital assets in possession of the employee</p>
                   </div>
                 </div>

                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-muted border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                         <th className="px-6 py-4 font-semibold text-sm text-black">Asset Name</th>
                         <th className="px-6 py-4 font-semibold text-sm text-black">Condition</th>
                         <th className="px-6 py-4 font-semibold text-sm text-black">Return Date</th>
                         <th className="px-6 py-4 text-center font-semibold text-sm text-black">Status</th>
                         <th className="px-6 py-4 text-right pr-8 font-semibold text-sm text-black">Mark Returned</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {request.assets.map((asset: any) => {
                         const isReturned = asset.return_status === true || asset.return_status === 'Returned';
                         return (
                           <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                             <td className="px-6 py-4 text-xs font-bold text-foreground">{asset.asset_name || asset.name}</td>
                             <td className="px-6 py-4">
                               <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                 asset.condition === 'Good' ? 'bg-green-50 border border-green-100 text-green-600' :
                                 asset.condition === 'Damaged' ? 'bg-red-50 border border-red-100 text-red-600' :
                                 'bg-amber-50 border border-amber-100 text-amber-600'
                               }`}>
                                 {asset.condition || 'Good'}
                               </span>
                             </td>
                             <td className="px-6 py-4 text-xs text-muted-foreground font-semibold">
                               {asset.return_date ? new Date(asset.return_date).toLocaleDateString() : 'N/A'}
                             </td>
                             <td className="px-6 py-4 text-center">
                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                 isReturned 
                                   ? 'bg-green-50 border border-green-100 text-green-700' 
                                   : 'bg-amber-50 border border-amber-100 text-amber-700'
                               }`}>
                                 {isReturned ? 'Returned' : 'Pending'}
                               </span>
                             </td>
                             <td className="px-6 py-4 text-right pr-8">
                               <button
                                 disabled={isSubmitting}
                                 onClick={() => handleAssetToggle(asset.id, isReturned)}
                                 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                   isReturned 
                                     ? 'bg-muted text-muted-foreground border-border cursor-pointer hover:bg-slate-200' 
                                     : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 cursor-pointer shadow-sm shadow-blue-100'
                                 }`}
                               >
                                 {isReturned ? 'Mark Pending' : 'Mark Returned'}
                               </button>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                   {((currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && request.status === EXIT_STATUS.ASSET_HANDOVER) && (
                      <div className="px-6 py-5 border-t border-border flex justify-end bg-card">
                         <Button 
                           onClick={() => handleAdminAction(EXIT_STATUS.IT_CLEARANCE)}
                           disabled={isSubmitting || request.assets?.some((a: any) => !(a.return_status === true || a.return_status === 'Returned'))}
                           className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm shadow-green-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            Complete Asset Handover
                         </Button>
                      </div>
                   )}
                 </div>
               </div>
             )}
           </div>
         )}

         {activeTab === 'Workflow' && (
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-50">
                  <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                     <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-[12px] font-medium text-foreground">Approval Workflow & History</h4>
               </div>

               <div className="space-y-4">
                  {request.workflow_history?.length > 0 ? (
                    request.workflow_history.map((step: any, idx: number) => (
                      <div key={idx} className="relative flex gap-6 p-6 rounded-lg bg-muted/50 border border-gray-50 hover:bg-card hover:border-border transition-all group">
                        {idx < request.workflow_history.length - 1 && (
                           <div className="absolute left-[43px] top-[72px] bottom-[-24px] w-0.5 bg-muted" />
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm flex-shrink-0 ${
                          step.action === 'APPROVED' ? 'bg-primary/10' : step.action === 'REJECTED' ? 'bg-red-50' : 'bg-primary/10'
                        }`}>
                           {step.action === 'APPROVED' ? <CheckCircle2 className="w-5 h-5 text-primary" /> : 
                            step.action === 'REJECTED' ? <XCircle className="w-5 h-5 text-red-500" /> : 
                            <Clock className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center justify-between mb-1">
                              <h5 className="text-[16px] font-medium text-foreground">
                                 {step.action === 'INITIATED' ? 'Resignation Submitted' : 
                                  step.action === 'MANAGER_APPROVED' ? 'Acknowledgment & Acceptance' : 
                                  step.action === 'LWD_NEGOTIATION' ? 'LWD Negotiation Proposal' :
                                  step.action === EXIT_STATUS.OFFBOARDING ? 'Offboarding Triggered' :
                                  step.action === EXIT_STATUS.ASSET_HANDOVER ? 'Asset Handover Phase' :
                                  step.action === EXIT_STATUS.IT_CLEARANCE ? 'IT Clearance Phase' :
                                  step.action === EXIT_STATUS.EXIT_INTERVIEW ? 'Exit Interview Phase' :
                                  step.action === EXIT_STATUS.CLEARANCE ? 'Clearance Phase' :
                                  step.action === EXIT_STATUS.FINAL_SETTLEMENT ? 'Settlement Phase' :
                                  step.action === EXIT_STATUS.COMPLETED ? 'Process Completed' : step.action}
                               </h5>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                                step.action === 'APPROVED' ? 'bg-primary/10 text-primary border-primary/20' : 
                                step.action === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 
                                'bg-primary/10 text-primary border-primary/20'
                              }`}>
                                 {step.action}
                              </span>
                           </div>
                           <p className="text-[13px] text-muted-foreground font-medium">
                              By {step.actor?.details?.first_name} {step.actor?.details?.last_name} • {step.actor?.roles?.[0]?.role?.role_name || 'System'}
                           </p>
                           <p className="text-sm text-muted-foreground font-medium mt-0.5">
                              {new Date(step.createdAt).toLocaleString()}
                           </p>
                           {step.comments && (
                              <div className="mt-4 p-4 bg-card/80 rounded-lg border border-border">
                                 <p className="text-sm text-gray-600 leading-relaxed font-medium italic">
                                    "{step.comments}"
                                 </p>
                              </div>
                           )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-4">
                      {/* Virtual record for old requests with no history */}
                      <div className="relative flex gap-6 p-6 rounded-lg bg-muted/50 border border-gray-50">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm flex-shrink-0 ${
                          request.status === 'REJECTED' ? 'bg-red-50' : 'bg-primary/10'
                        }`}>
                          {request.status === 'REJECTED' ? <XCircle className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center justify-between mb-1">
                              <h5 className="text-[16px] font-medium text-foreground">
                                {request.status === 'REJECTED' ? 'Request Rejected' : 'Request Processed'}
                              </h5>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                                request.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-primary/10 text-primary border-primary/20'
                              }`}>
                                 {request.status}
                              </span>
                           </div>
                           <p className="text-[13px] text-muted-foreground font-medium italic">
                              Historical record - workflow tracking was initiated after this request.
                           </p>
                        </div>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'Clearance' && (
             <div className={`grid grid-cols-1 ${isAssetTrackingEnabled ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6 animate-in slide-in-from-bottom-4 duration-500`}>
                {/* Asset Returns Section */}
                {isAssetTrackingEnabled && (
                  <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
                     <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-50">
                        <div className="p-2 bg-primary/10 rounded-lg">
                           <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <h4 className="text-[12px] font-medium text-foreground">Asset Returns</h4>
                     </div>

                     <div className="space-y-4">
                        {request.assets?.length > 0 ? (
                           request.assets.map((asset: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-gray-50">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${asset.return_status ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-600'}`}>
                                       <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-medium text-foreground">{asset.asset_name}</p>
                                       <p className="text-[10px] text-muted-foreground font-medium">{asset.category} • S/N: {asset.asset_serial_no || 'N/A'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-[12px] font-medium border ${
                                       asset.return_status ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                       {asset.return_status ? 'Returned' : 'Pending'}
                                    </span>
                                    
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'HR' || String(currentUser?.id) === String(employeeDetails?.reporting_manager_id) || String(currentUser?.id) === String(request?.reporting_manager_id)) && (
                                       <Button 
                                         onClick={() => handleAssetToggle(asset.id, asset.return_status)}
                                         disabled={isSubmitting}
                                         variant="outline"
                                         className={`h-9 px-4 text-xs font-bold rounded-sm transition-all ${
                                            asset.return_status ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-primary/20 text-primary hover:bg-primary/5'
                                         }`}
                                       >
                                         {asset.return_status ? 'Mark Pending' : 'Mark Returned'}
                                       </Button>
                                    )}
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="py-8 text-center text-muted-foreground">
                              <p className="text-sm">No company assets assigned to this employee.</p>
                           </div>
                        )}
                     </div>

                     {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'HR') && (
                        <div className="mt-8 pt-8 border-t border-gray-50 flex justify-end">
                           <Button 
                             onClick={() => handleAdminAction('IT_CLEARANCE')}
                             disabled={isSubmitting || request.assets?.some((a: any) => !a.return_status)}
                             className="h-12 px-8 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg shadow-sm shadow-primary/20 transition-all active:scale-95"
                           >
                              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                              Complete Asset Handover
                           </Button>
                        </div>
                     )}
                  </div>
                )}

                {/* Clearance Checklist Section */}
                <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-50">
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                         <ClipboardCheck className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="text-[12px] font-medium text-foreground">Clearance Checklist</h4>
                   </div>

                   <div className="space-y-4">
                      {request.clearance_tasks?.length > 0 ? (
                        request.clearance_tasks.map((item: any, idx: number) => {
                          const isTogglable = (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HR') &&
                            ['PENDING_ACCEPTANCE', 'RESIGNATION_ACCEPTED', 'OFFBOARDING', 'ASSET_HANDOVER', 'IT_CLEARANCE', 'CLEARANCE', 'EXIT_INTERVIEW', 'FINAL_SETTLEMENT'].includes(request.status);
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center gap-4 p-5 rounded-lg border transition-all group ${
                                isTogglable ? 'cursor-pointer hover:bg-card hover:border-border' : 'cursor-default'
                              } ${
                                item.status === 'COMPLETED' ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-gray-50'
                              }`}
                              onClick={() => isTogglable && handleClearanceTaskToggle(item.id, item.status)}
                            >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              item.status === 'COMPLETED' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-card border-2 border-border'
                            }`}>
                               {item.status === 'COMPLETED' && <CheckCircle2 className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                               <div className="flex items-center justify-between mb-0.5">
                                  <h5 className={`text-[15px] font-bold ${item.status === 'COMPLETED' ? 'text-primary' : 'text-foreground'}`}>{item.task_name}</h5>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                                    item.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                     {item.status}
                                  </span>
                               </div>
                               <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                                  <span>{item.department}</span>
                                  {item.completion_date && (
                                     <>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                        <span>Completed on {new Date(item.completion_date).toLocaleDateString()}</span>
                                     </>
                                  )}
                               </div>
                            </div>
                          </div>
                          );
                        })
                      ) : (
                        <div className="py-20 text-center text-muted-foreground">
                          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 opacity-10" />
                          <p className="text-lg font-medium">No clearance tasks assigned yet.</p>
                          <p className="text-sm mt-2">Clearance starts automatically after initial HR approval.</p>
                        </div>
                      )}
                      {['ADMIN', 'SUPER_ADMIN', 'HR', 'SUPER ADMIN'].includes(String(currentUser?.role).toUpperCase()) && String(currentUser?.role).toUpperCase() !== 'MANAGER' && (
                        <div className="mt-8 pt-8 border-t border-gray-50 flex flex-wrap items-center justify-between gap-4 animate-in zoom-in duration-300">
                          <Button 
                            variant="outline"
                            onClick={handleMarkAllClearanceTasksCompleted}
                            disabled={isSubmitting}
                            className="h-11 px-6 border-teal-600 text-teal-700 hover:bg-teal-50 font-bold rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                          >
                             <CheckCircle2 className="w-4 h-4 text-teal-600" />
                             Mark All Tasks Cleared & Proceed to Next Step
                          </Button>
                          <Button 
                            onClick={() => handleAdminAction('EXIT_INTERVIEW')}
                            disabled={isSubmitting || request.clearance_tasks?.some((t: any) => t.status !== 'COMPLETED')}
                            className="h-11 px-8 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                             Complete Clearance & Start Interview
                          </Button>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          )}

         {activeTab === 'Interview' && (
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                         <MessageSquare className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                         <h4 className="text-[12px] font-medium text-foreground">Exit Interview Details</h4>
                         <p className="text-sm text-muted-foreground font-medium">Final feedback and transition assessment</p>
                      </div>
                   </div>
                </div>

                 {(request.interview_responses || ['FINAL_SETTLEMENT', 'COMPLETED'].includes(request.status)) ? (
                   <div className="space-y-8">
                     <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                             <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-base">Exit Interview Completed & Archived</p>
                            <p className="text-xs text-muted-foreground font-semibold">
                              Conducted on {request.interview_responses?.createdAt ? new Date(request.interview_responses.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full border border-teal-200">
                          Status: Archived
                        </span>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="space-y-1.5">
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason for Leaving</p>
                           <p className="text-sm font-extrabold text-foreground">{request.interview_responses?.data?.reason || interviewData.reason || 'Career Growth'}</p>
                        </div>
                        <div className="space-y-1.5">
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Experience Rating</p>
                           <div className="flex items-center gap-2">
                              <div className="flex items-center text-amber-400">
                                 {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < Math.round((parseInt(request.interview_responses?.data?.rating || interviewData.rating || '8'))/2) ? 'fill-current text-amber-400' : 'text-gray-200'}`} />
                                 ))}
                              </div>
                              <span className="text-sm font-bold text-foreground">{request.interview_responses?.data?.rating || interviewData.rating || '8'}/10</span>
                           </div>
                        </div>
                        <div className="md:col-span-2 space-y-2 pt-2 border-t border-border">
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detailed Feedback & Remarks</p>
                           <div className="bg-muted/40 p-5 rounded-lg border border-border relative">
                              <p className="text-xs font-medium text-foreground leading-relaxed italic">
                                "{request.interview_responses?.data?.feedback || interviewData.feedback || 'Great work environment and supportive team. Leaving for better career growth opportunities.'}"
                              </p>
                           </div>
                        </div>
                     </div>
                   </div>
                 ) : (
                   <div className="py-12 text-center">
                      {request.status === 'REJECTED' ? (
                         <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                               <XCircle className="w-10 h-10 text-red-400 opacity-40" />
                            </div>
                            <h5 className="text-xl font-bold text-foreground mb-2">Interview Not Required</h5>
                            <p className="text-muted-foreground leading-relaxed font-medium">The exit interview process has been cancelled because this request was rejected.</p>
                         </div>
                      ) : (
                         <div className="max-w-2xl mx-auto">
                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HR' || request.status === 'EXIT_INTERVIEW') ? (
                               <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                                  <div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                                     <MessageSquare className="w-7 h-7 text-teal-600" />
                                  </div>
                                  <h5 className="text-base font-extrabold text-foreground mb-1.5">Conduct Exit Interview</h5>
                                  <p className="text-xs text-muted-foreground mb-8 max-w-md mx-auto">
                                     Collect valuable transition feedback, departure reasons, and organization insights.
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left mb-8">
                                     <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reason for Leaving</label>
                                        <Input 
                                           placeholder="e.g. Career Growth / Relocation"
                                           value={interviewData.reason}
                                           className="h-11 rounded-lg bg-muted/50 border-border focus:bg-card focus:border-teal-600 text-xs font-bold text-foreground"
                                           onChange={(e) => setInterviewData({...interviewData, reason: e.target.value})}
                                        />
                                     </div>
                                     <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Experience Rating (1-10)</label>
                                        <Input 
                                           type="number"
                                           min="1"
                                           max="10"
                                           placeholder="8"
                                           value={interviewData.rating}
                                           className="h-11 rounded-lg bg-muted/50 border-border focus:bg-card focus:border-teal-600 text-xs font-bold text-foreground"
                                           onChange={(e) => setInterviewData({...interviewData, rating: e.target.value})}
                                        />
                                     </div>
                                     <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Detailed Interview Feedback</label>
                                        <textarea 
                                           placeholder="Share employee remarks, transition recommendations, and internal feedback..."
                                           value={interviewData.feedback}
                                           className="w-full h-28 p-4 rounded-lg bg-muted/50 border border-border focus:bg-card focus:border-teal-600 text-xs font-bold text-foreground outline-none resize-none"
                                           onChange={(e) => setInterviewData({...interviewData, feedback: e.target.value})}
                                        />
                                     </div>
                                  </div>
 
                                  <Button 
                                    onClick={() => handleAdminAction('FINAL_SETTLEMENT')}
                                    disabled={isSubmitting}
                                    className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 mx-auto cursor-pointer"
                                  >
                                     {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                     Submit Interview & Proceed to Settlement
                                  </Button>
                               </div>
                            ) : (
                               <div className="max-w-md mx-auto py-6">
                                  <div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                                     <MessageSquare className="w-6 h-6 text-teal-600" />
                                  </div>
                                   <h5 className="text-sm font-bold text-foreground mb-2">Exit Interview Scheduled</h5>
                                   <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                                      The exit interview phase is scheduled. Form entries will unlock for the HR administrator when the workflow enters this phase.
                                   </p>
                               </div>
                            )}
                         </div>
                      )}
                   </div>
                 )}
            </div>
         )}

         {activeTab === 'Settlement' && (
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm animate-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
               <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-50">
                  <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                     <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-[12px] font-medium text-foreground">Final Settlement Details</h4>
               </div>

               {request.settlement_data ? (
                  <div className="space-y-8 animate-in fade-in duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-[10px] font-bold text-muted-foreground mb-2">Total Earnings</p>
                          <p className="text-2xl font-bold text-primary">{formatCurrency(request.settlement_data.total_earnings)}</p>
                       </div>
                       <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-lg">
                          <p className="text-[10px] font-bold text-rose-500 mb-2">Total Deductions</p>
                          <p className="text-2xl font-bold text-rose-600">{formatCurrency(request.settlement_data.total_deductions)}</p>
                       </div>
                       <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-[10px] font-bold text-muted-foreground mb-2">Net Payable</p>
                          <p className="text-2xl font-bold text-primary">{formatCurrency(request.settlement_data.net_payable)}</p>
                       </div>
                    </div>

                    {request.status === 'FINAL_SETTLEMENT' && isFinanceOrAdmin && (
                       <div className="flex justify-end gap-3">
                          <Button 
                             variant="outline" 
                             onClick={async () => {
                               try {
                                 toast.loading('Recalculating settlement from database...', { id: 'recalc' });
                                 const response = await axiosInstance.put(`/exit/${request.id}/status`, { status: 'FINAL_SETTLEMENT' });
                                 if (response.data.success) {
                                   setRequest(response.data.data);
                                   toast.success('Settlement recalculated successfully', { id: 'recalc' });
                                 }
                               } catch (err) {
                                 toast.error('Failed to recalculate', { id: 'recalc' });
                               }
                             }}
                             className="h-10 px-6 border-blue-200 text-primaryhover:bg-blue-50 font-bold rounded-lg flex items-center gap-2"
                          >
                             <Calculator className="w-4 h-4" /> Recalculate
                          </Button>
                          <Button 
                             variant="outline" 
                             onClick={() => setShowSettlementEdit(!showSettlementEdit)}
                             className="h-10 px-6 border-blue-200 text-primaryhover:bg-blue-50 font-bold rounded-lg"
                          >
                             {showSettlementEdit ? 'Cancel Edit' : 'Edit Deductions & Recoveries'}
                          </Button>
                       </div>
                    )}

                    {showSettlementEdit && isFinanceOrAdmin ? (
                        <div className="bg-muted/50/40 rounded-lg p-6 border border-border space-y-5 animate-in slide-in-from-top-2 duration-300">
                           <h5 className="text-xs font-bold text-foreground uppercase tracking-wider text-left">Adjust Deductions & Recoveries (F&F)</h5>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Salary Advance Recovery ({currencySymbol})</label>
                                 <Input 
                                    type="number" 
                                    value={salaryAdvanceRecovery || ''} 
                                    placeholder="0" 
                                    className="h-11 rounded-lg bg-card border-border focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all text-xs font-bold text-foreground" 
                                    onChange={(e) => setSalaryAdvanceRecovery(Number(e.target.value))} 
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Outstanding Loan Recovery ({currencySymbol})</label>
                                 <Input 
                                    type="number" 
                                    value={loanRecovery || ''} 
                                    placeholder="0" 
                                    className="h-11 rounded-lg bg-card border-border focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all text-xs font-bold text-foreground" 
                                    onChange={(e) => setLoanRecovery(Number(e.target.value))} 
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Additional Penalties ({currencySymbol})</label>
                                 <Input 
                                    type="number" 
                                    value={additionalDeductions || ''} 
                                    placeholder="0" 
                                    className="h-11 rounded-lg bg-card border-border focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all text-xs font-bold text-foreground" 
                                    onChange={(e) => setAdditionalDeductions(Number(e.target.value))} 
                                 />
                              </div>
                           </div>
                           <div className="flex justify-end pt-2">
                              <Button 
                                 onClick={handleSaveSettlement} 
                                 disabled={isSubmitting}
                                 className="h-11 px-8 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg shadow-sm shadow-blue-100 cursor-pointer"
                              >
                                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                                 Save & Recalculate Net Payout
                              </Button>
                           </div>
                        </div>
                     ) : null}

                    <div className="bg-muted/50 rounded-lg p-8 border border-gray-50">
                       <h5 className="font-bold text-foreground mb-6 text-left">Settlement Breakdown</h5>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm border-b border-border pb-4">
                             <span className="text-muted-foreground font-medium">Basic Pay & Allowances (LWD proration)</span>
                             <span className="font-bold text-foreground">{formatCurrency(request.settlement_data.total_earnings)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border pb-4">
                             <span className="text-muted-foreground font-medium">Gratuity (if applicable)</span>
                             <span className="font-bold text-foreground">{formatCurrency(request.settlement_data.gratuity)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border pb-4">
                             <span className="text-muted-foreground font-medium">Leave Encashment</span>
                             <span className="font-bold text-foreground">{formatCurrency(request.settlement_data.leave_encashment)}</span>
                          </div>
                          
                          {/* Deductions & Recoveries */}
                          {Number(request.settlement_data.notice_pay || 0) < 0 && (
                             <div className="flex justify-between items-center text-sm border-b border-border pb-4 text-red-600 font-bold">
                                <span className="font-medium text-red-500">Notice Period shortfall recovery</span>
                                <span>-{formatCurrency(Math.abs(Number(request.settlement_data.notice_pay)))}</span>
                             </div>
                          )}
                          {Number(request.settlement_data.data?.salaryAdvanceRecovery || 0) > 0 && (
                             <div className="flex justify-between items-center text-sm border-b border-border pb-4 text-red-600 font-bold">
                                <span className="font-medium text-red-500">Salary Advance Recovery</span>
                                <span>-{formatCurrency(request.settlement_data.data.salaryAdvanceRecovery)}</span>
                             </div>
                          )}
                          {Number(request.settlement_data.data?.loanRecovery || 0) > 0 && (
                             <div className="flex justify-between items-center text-sm border-b border-border pb-4 text-red-600 font-bold">
                                <span className="font-medium text-red-500">Outstanding Loan Recovery</span>
                                <span>-{formatCurrency(request.settlement_data.data.loanRecovery)}</span>
                             </div>
                          )}
                          {Number(request.settlement_data.data?.additionalDeductions || 0) > 0 && (
                             <div className="flex justify-between items-center text-sm border-b border-border pb-4 text-red-600 font-bold">
                                <span className="font-medium text-red-500">Additional Penalties / Deductions</span>
                                <span>-{formatCurrency(request.settlement_data.data.additionalDeductions)}</span>
                             </div>
                          )}

                          <div className="flex justify-between items-center text-sm pt-2">
                             <span className="text-primaryfont-bold">Total Final Settlement Payout</span>
                             <span className="font-bold text-blue-700 text-lg">{formatCurrency(request.settlement_data.net_payable)}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-col gap-4">
                       <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                          <p className="text-sm font-medium text-blue-700">Settlement calculation successfully prepared and audited.</p>
                       </div>
                       
                       {request.status === 'FINAL_SETTLEMENT' && (
                          <div className="flex justify-end pt-4 border-t border-gray-50">
                             <Button 
                               onClick={() => handleAdminAction('COMPLETED')}
                               disabled={isSubmitting}
                               className="h-12 px-8 bg-primary hover:bg-primary/70 text-white font-bold rounded-lg shadow-sm shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
                             >
                               {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                               Complete Exit & Archive Employee
                             </Button>
                          </div>
                       )}
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                    {request.status === 'REJECTED' ? (
                       <>
                          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
                             <XCircle className="w-10 h-10 text-red-300" />
                          </div>
                          <p className="text-red-400 font-bold text-lg mb-2">Settlement Cancelled</p>
                          <p className="text-muted-foreground text-sm mb-8 max-w-sm font-medium">No settlement calculation is required for rejected exit requests.</p>
                       </>
                    ) : (
                       <div className="animate-in fade-in zoom-in duration-500">
                          <div className="mb-6 flex justify-center">
                             <DollarSign className="w-20 h-20 text-gray-200 stroke-[1]" />
                          </div>
                          <p className="text-muted-foreground font-medium text-[16px] mb-8 font-outfit">Settlement not yet processed</p>
                          
                          {request.status === 'FINAL_SETTLEMENT' ? (
                             <Button 
                               onClick={() => handleAdminAction('COMPLETED')}
                               disabled={isSubmitting}
                               className="bg-primary hover:bg-teal-700 text-white px-12 h-12 rounded-lg font-bold shadow-sm shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                             >
                               {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                               Calculate Settlement
                             </Button>
                          ) : (
                             <p className="text-muted-foreground text-[13px] max-w-sm mx-auto leading-relaxed font-medium">
                                Final settlement calculation will be available once the exit interview is completed and HR provides the final sign-off.
                             </p>
                          )}
                       </div>
                    )}
                 </div>
               )}
            </div>
         )}
      </div>

      {/* HR Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card rounded-lg p-8 w-full max-w-lg shadow-sm animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">HR Override Action</h3>
              <button onClick={() => setShowOverrideModal(false)} className="p-2 hover:bg-teal-700 rounded-full transition-all">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  You are about to force-approve this resignation. This will bypass the manager's approval and move the request to the next phase.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Override Reason / Comments <span className="text-red-500">*</span></label>
                <textarea 
                  className="w-full p-4 border border-border rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm h-32 resize-none"
                  placeholder="e.g., Manager failed to respond within SLA, urgent offboarding required..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-lg"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-12 bg-primary rounded-lg"
                  onClick={() => handleHROverride(EXIT_STATUS.RESIGNATION_ACCEPTED)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Override'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Propose New LWD / Negotiate Modal */}
      {showNegotiateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                Propose New Last Working Day
              </h3>
              <button onClick={() => setShowNegotiateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select a proposed Last Working Day to discuss with the employee:</p>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Proposed LWD *</label>
                <ModernDatePicker 
                  value={proposedLwd}
                  onChange={(date) => setProposedLwd(date)}
                  placeholder="Select Proposed Date"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowNegotiateModal(false)} className="text-xs h-9">Cancel</Button>
              <Button onClick={handleNegotiateSubmit} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-5">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                Submit Proposed Date
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Transfer (KT) Assignment & Edit Modal (Full Screen Layout) */}
      {showKTModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] max-h-[850px] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 shadow-2xs">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Assign & Manage Knowledge Transfer (KT)</h3>
                  <p className="text-xs text-muted-foreground">Specify KT recipient colleague, handover scope notes, verifier, and target completion date</p>
                </div>
              </div>
              <button 
                onClick={() => setShowKTModal(false)} 
                className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Column Content Area */}
            <div className="flex-1 overflow-y-auto py-6 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column: KT Recipient & Status */}
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-teal-800 dark:text-teal-400 uppercase tracking-widest pb-2 border-b border-border/60 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assignee & Timeline
                  </h4>

                  {/* KT Assignee Search with Department */}
                  <div className="space-y-2 relative">
                    <label className="block text-xs font-bold text-foreground">KT Assignee (Employee Receiving KT) *</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Search colleague by name, employee ID, or department..."
                        value={ktFormAssigneeQuery}
                        onChange={(e) => {
                          setKtFormAssigneeQuery(e.target.value);
                          setShowKTAssigneeDrop(true);
                        }}
                        onFocus={() => setShowKTAssigneeDrop(true)}
                        className="w-full px-3.5 py-2.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                      {isSearchingKTAssignee && <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-3 text-teal-600" />}
                    </div>

                    {showKTAssigneeDrop && (
                      <div className="absolute z-[120] left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-border/60">
                        {isSearchingKTAssignee && (
                          <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 font-medium">
                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                            Searching department colleagues...
                          </div>
                        )}
                        {!isSearchingKTAssignee && ktAssigneeResults.length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground font-medium">
                            No colleagues found in department ({exitingEmployeeDept || 'General'})
                          </div>
                        )}
                        {!isSearchingKTAssignee && ktAssigneeResults.map((emp) => {
                          const deptName = getDeptName(emp);
                          return (
                            <div 
                              key={emp.id}
                              onClick={() => {
                                setKtFormAssignee(emp);
                                setKtFormAssigneeQuery(emp.details ? `${emp.details.first_name} ${emp.details.last_name} (${emp.details.employee_id || ''})` : emp.username);
                                setShowKTAssigneeDrop(false);
                              }}
                              className="px-4 py-3 text-xs hover:bg-teal-50/70 dark:hover:bg-teal-950/40 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div className="space-y-0.5">
                                <p className="font-bold text-foreground flex items-center gap-2">
                                  {emp.details ? `${emp.details.first_name} ${emp.details.last_name}` : emp.username}
                                  <span className="text-[10px] font-normal text-muted-foreground">({emp.details?.employee_id || ''})</span>
                                </p>
                                <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                                  Dept: {deptName}
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-teal-100/70 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 text-[10px] font-bold shrink-0">
                                {deptName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* KT Status */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-foreground">KT Status *</label>
                    <select 
                      value={ktFormStatus}
                      onChange={(e) => setKtFormStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Target Completion Date */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-foreground">Target Completion Date</label>
                    <ModernDatePicker
                      value={ktFormCompletionDate}
                      onChange={(date) => setKtFormCompletionDate(date)}
                      placeholder="Select target completion date"
                    />
                  </div>
                </div>

                {/* Right Column: Handover Scope & Verification */}
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-teal-800 dark:text-teal-400 uppercase tracking-widest pb-2 border-b border-border/60 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    Handover Scope & Verification
                  </h4>

                  {/* Handover Description */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-foreground">Handover Scope / Detailed Notes</label>
                    <textarea 
                      rows={5}
                      value={ktFormDescription}
                      onChange={(e) => setKtFormDescription(e.target.value)}
                      placeholder="List key projects, code repositories, documentation links, credentials, and handover task checklists..."
                      className="w-full p-3.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none font-medium leading-relaxed"
                    />
                  </div>

                  {/* Verified By Search with Department */}
                  <div className="space-y-2 relative">
                    <label className="block text-xs font-bold text-foreground">Verified By (Manager / Tech Lead)</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Search manager or verifier by name, ID, or department..."
                        value={ktFormVerifiedByQuery}
                        onChange={(e) => {
                          setKtFormVerifiedByQuery(e.target.value);
                          setShowKTVerifiedByDrop(true);
                        }}
                        onFocus={() => setShowKTVerifiedByDrop(true)}
                        className="w-full px-3.5 py-2.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                      {isSearchingKTVerifiedBy && <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-3 text-teal-600" />}
                    </div>

                    {showKTVerifiedByDrop && (
                      <div className="absolute z-[120] left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-border/60">
                        {isSearchingKTVerifiedBy && (
                          <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 font-medium">
                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                            Searching verifiers...
                          </div>
                        )}
                        {!isSearchingKTVerifiedBy && ktVerifiedByResults.length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground font-medium">
                            No verifiers found
                          </div>
                        )}
                        {!isSearchingKTVerifiedBy && ktVerifiedByResults.map((emp) => {
                          const deptName = getDeptName(emp);
                          return (
                            <div 
                              key={emp.id}
                              onClick={() => {
                                setKtFormVerifiedBy(emp);
                                setKtFormVerifiedByQuery(emp.details ? `${emp.details.first_name} ${emp.details.last_name} (${emp.details.employee_id || ''})` : emp.username);
                                setShowKTVerifiedByDrop(false);
                              }}
                              className="px-4 py-3 text-xs hover:bg-teal-50/70 dark:hover:bg-teal-950/40 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div className="space-y-0.5">
                                <p className="font-bold text-foreground flex items-center gap-2">
                                  {emp.details ? `${emp.details.first_name} ${emp.details.last_name}` : emp.username}
                                  <span className="text-[10px] font-normal text-muted-foreground">({emp.details?.employee_id || ''})</span>
                                </p>
                                <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                                  Dept: {deptName}
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-teal-100/70 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 text-[10px] font-bold shrink-0">
                                {deptName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Verification Remarks */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-foreground">Verification Remarks & Sign-off Notes</label>
                    <textarea 
                      rows={3}
                      value={ktFormRemarks}
                      onChange={(e) => setKtFormRemarks(e.target.value)}
                      placeholder="Manager or verifier sign-off notes..."
                      className="w-full p-3.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none font-medium leading-relaxed"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowKTModal(false)} className="text-xs h-10 px-6 font-bold rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveKT} 
                disabled={isSubmitting} 
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-10 px-8 font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save KT Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitManagementDetail;


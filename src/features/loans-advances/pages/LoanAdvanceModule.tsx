import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { useCurrency } from '@/shared/hooks/useCurrency';
import {
  Banknote, TrendingUp, Search, Plus, CheckCircle2, XCircle, Clock,
  DollarSign, Download, Eye, Edit, HandCoins, Trash2, Shield, Sparkles, ArrowLeft, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { ApprovalTimeline, getStatusLabel, getStatusColor } from '../components/ApprovalTimeline';
import * as payrollService from '@/features/payroll/services/payroll';
import { getDepartments } from '@/features/organization/services/departments';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';

// ==========================================
// INTERFACES & TYPE DEFINITIONS
// ==========================================

export interface LoanAdvancePolicy {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'Loan' | 'Advance';
  maxAmount: number;
  interestRate: number;
  maxTenure: number;
  minTenure: number;
  eligibility: {
    departments: string[];
    designations: string[];
    locations: string[];
    minTenureMonths: number;
  };
  recoveryMethod: 'Equal EMI' | 'Bullet' | 'Custom';
  workflow: string[];
  effectiveDate: string;
  expiryDate: string;
  status: 'Active' | 'Inactive';
}

export interface LoanAdvanceRequest {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: 'Loan' | 'Advance';
  policyId: string;
  policyName: string;
  amount: number;
  tenure: number;
  emi: number;
  reason: string;
  submitDate: string;
  status: 'Draft' | 'Submitted' | 'Pending Manager Approval' | 'Pending HR Approval' | 'Pending Finance Approval' | 'Approved' | 'Rejected' | 'Settled' | 'Withdrawn' | 'Disbursed';
  outstandingBalance: number;
  paidAmount: number;
  disbursedDate?: string;
  comments: { user: string; role: string; comment: string; date: string }[];
  history: { action: string; user: string; role: string; date: string; details?: string }[];
  repaymentSchedule?: { month: string; amount: number; status: 'Paid' | 'Pending'; type: 'Credit' | 'EMI Deduction' }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  entityId: string;
  previousValue: string;
  newValue: string;
}

export interface ModuleSettings {
  autoRequestNumberPrefix: string;
  financialYear: string;
  maxLoanAmount: number;
  maxAdvanceAmount: number;
  maxLoanTenure: number;
  defaultInterestRate: number;
  defaultCurrency: string;
  approvalWorkflow: string[];
}

// ==========================================
// MOCK DATA SEEDERS FOR LOCAL STORAGE
// ==========================================

const defaultPolicies: LoanAdvancePolicy[] = [
  {
    id: 'pol-1',
    name: 'Personal Loan',
    code: 'POL-PLN-PERS',
    description: 'Personal loan for employees with 12+ months tenure, low interest rate',
    type: 'Loan',
    maxAmount: 500000,
    interestRate: 8.5,
    maxTenure: 36,
    minTenure: 6,
    eligibility: { departments: ['All'], designations: ['All'], locations: ['All'], minTenureMonths: 12 },
    recoveryMethod: 'Equal EMI',
    workflow: ['Manager', 'HR', 'Finance'],
    effectiveDate: '2026-04-01',
    expiryDate: '2027-03-31',
    status: 'Active'
  },
  {
    id: 'pol-2',
    name: 'Emergency Advance',
    code: 'POL-ADV-EMRG',
    description: 'Quick salary advance for emergencies, no interest, auto-recovered in 3 months',
    type: 'Advance',
    maxAmount: 100000,
    interestRate: 0,
    maxTenure: 3,
    minTenure: 1,
    eligibility: { departments: ['All'], designations: ['All'], locations: ['All'], minTenureMonths: 3 },
    recoveryMethod: 'Equal EMI',
    workflow: ['Manager', 'Finance'],
    effectiveDate: '2026-01-01',
    expiryDate: '2026-12-31',
    status: 'Active'
  },
  {
    id: 'pol-3',
    name: 'Relocation Advance',
    code: 'POL-ADV-RELC',
    description: 'Advance for employees relocating to a new city for work',
    type: 'Advance',
    maxAmount: 200000,
    interestRate: 0,
    maxTenure: 6,
    minTenure: 1,
    eligibility: { departments: ['All'], designations: ['Manager', 'Director', 'VP', 'Developer'], locations: ['All'], minTenureMonths: 6 },
    recoveryMethod: 'Equal EMI',
    workflow: ['Manager', 'HR', 'Finance'],
    effectiveDate: '2026-04-01',
    expiryDate: '2027-03-31',
    status: 'Active'
  },
  {
    id: 'pol-4',
    name: 'Education Loan',
    code: 'POL-PLN-EDUC',
    description: 'Education loan for professional courses and certifications',
    type: 'Loan',
    maxAmount: 300000,
    interestRate: 6.0,
    maxTenure: 24,
    minTenure: 6,
    eligibility: { departments: ['All'], designations: ['All'], locations: ['All'], minTenureMonths: 24 },
    recoveryMethod: 'Equal EMI',
    workflow: ['Manager', 'HR'],
    effectiveDate: '2026-04-01',
    expiryDate: '2027-03-31',
    status: 'Active'
  }
];

const defaultRequests: LoanAdvanceRequest[] = [
  {
    id: 'req-1',
    requestId: 'LA-2026-001',
    employeeId: 'EMP-002',
    employeeName: 'Vignesh K',
    department: 'Engineering',
    type: 'Loan',
    policyId: 'pol-1',
    policyName: 'Personal Loan',
    amount: 200000,
    tenure: 12,
    emi: 17241,
    reason: 'Home renovation work pending',
    submitDate: '2026-07-10',
    status: 'Submitted',
    outstandingBalance: 200000,
    paidAmount: 0,
    comments: [
      { user: 'Vignesh K', role: 'Employee', comment: 'Need funds for home renovation.', date: '2026-07-10' }
    ],
    history: [
      { action: 'Created Request', user: 'Vignesh K', role: 'Employee', date: '2026-07-10' },
      { action: 'Submitted Request', user: 'Vignesh K', role: 'Employee', date: '2026-07-10', details: 'Awaiting manager approval' }
    ]
  },
  {
    id: 'req-2',
    requestId: 'LA-2026-002',
    employeeId: 'EMP-003',
    employeeName: 'Shalini Sharma',
    department: 'Sales',
    type: 'Advance',
    policyId: 'pol-2',
    policyName: 'Emergency Advance',
    amount: 50000,
    tenure: 3,
    emi: 16667,
    reason: 'Medical emergency in family',
    submitDate: '2026-07-11',
    status: 'Pending Finance Approval',
    outstandingBalance: 50000,
    paidAmount: 0,
    comments: [
      { user: 'Shalini Sharma', role: 'Employee', comment: 'Urgent medical expense.', date: '2026-07-11' },
      { user: 'Amit Patel', role: 'Manager', comment: 'Verified medical situation. Approved.', date: '2026-07-12' }
    ],
    history: [
      { action: 'Submitted Request', user: 'Shalini Sharma', role: 'Employee', date: '2026-07-11' },
      { action: 'Manager Approved', user: 'Amit Patel', role: 'Manager', date: '2026-07-12', details: 'Sent to Finance' }
    ]
  },
  {
    id: 'req-3',
    requestId: 'LA-2026-003',
    employeeId: 'EMP-004',
    employeeName: 'Rohan Mehta',
    department: 'Marketing',
    type: 'Loan',
    policyId: 'pol-4',
    policyName: 'Education Loan',
    amount: 150000,
    tenure: 18,
    emi: 8333,
    reason: 'Pursuing MBA part-time',
    submitDate: '2026-06-20',
    status: 'Approved',
    outstandingBalance: 133333,
    paidAmount: 16667,
    comments: [
      { user: 'Rohan Mehta', role: 'Employee', comment: 'Need funds for MBA tuition fees.', date: '2026-06-20' },
      { user: 'Finance Admin', role: 'Finance', comment: 'Approved and disbursed. EMI starts next month.', date: '2026-06-25' }
    ],
    history: [
      { action: 'Submitted Request', user: 'Rohan Mehta', role: 'Employee', date: '2026-06-20' },
      { action: 'Manager Approved', user: 'Preeti Deshmukh', role: 'Manager', date: '2026-06-21' },
      { action: 'HR Approved', user: 'Priya Iyer', role: 'HR', date: '2026-06-22' },
      { action: 'Finance Approved & Disbursed', user: 'Finance Team', role: 'Finance', date: '2026-06-25', details: 'Loan disbursed to employee bank account' }
    ],
    repaymentSchedule: [
      { month: 'Jun 2026', amount: 25000, status: 'Paid', type: 'Credit' },
      { month: 'Jul 2026', amount: 8333, status: 'Paid', type: 'EMI Deduction' },
      { month: 'Aug 2026', amount: 8333, status: 'Paid', type: 'EMI Deduction' },
      { month: 'Sep 2026', amount: 8334, status: 'Pending', type: 'EMI Deduction' },
    ]
  }
];

const defaultSettings: ModuleSettings = {
  autoRequestNumberPrefix: 'LA-2026-',
  financialYear: '2026-2027',
  maxLoanAmount: 500000,
  maxAdvanceAmount: 200000,
  maxLoanTenure: 36,
  defaultInterestRate: 8.5,
  defaultCurrency: 'INR',
  approvalWorkflow: ['Manager', 'HR', 'Finance']
};

const defaultAuditLogs: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-07-15T10:00:00Z',
    user: 'Super Admin',
    role: 'SUPER_ADMIN',
    action: 'POLICY_CREATED',
    module: 'Policies',
    entityId: 'pol-1',
    previousValue: '',
    newValue: 'Created Personal Loan Policy (POL-PLN-PERS)'
  }
];

// ==========================================
// CORE LOAN & ADVANCE PAGE COMPONENT
// ==========================================

export function LoanAdvanceModule() {
  const { user } = useAuth();
  const { currencySymbol } = useCurrency();
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const userRole = useMemo(() => {
    if (!user) return 'EMPLOYEE';
    const role = (user.role || '').toString().toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') return 'SUPER_ADMIN';
    if (role === 'ADMIN') return 'ADMIN';
    if (role === 'HR') return 'HR';
    if (role === 'FINANCE') return 'FINANCE';
    if (role === 'MANAGER') return 'MANAGER';
    return 'EMPLOYEE';
  }, [user]);

  const isManagement = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'HR' || userRole === 'FINANCE' || userRole === 'MANAGER';

  // State Management backed by Local Storage
  const [policies, setPolicies] = useState<LoanAdvancePolicy[]>(() => {
    const data = localStorage.getItem('loanadv_policies');
    return data ? JSON.parse(data) : defaultPolicies;
  });

  const [requests, setRequests] = useState<LoanAdvanceRequest[]>(() => {
    const data = localStorage.getItem('loanadv_requests');
    return data ? JSON.parse(data) : defaultRequests;
  });

  const [settings, setSettings] = useState<ModuleSettings>(() => {
    const data = localStorage.getItem('loanadv_settings');
    return data ? JSON.parse(data) : defaultSettings;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const data = localStorage.getItem('loanadv_audit_logs');
    return data ? JSON.parse(data) : defaultAuditLogs;
  });

  useEffect(() => { localStorage.setItem('loanadv_policies', JSON.stringify(policies)); }, [policies]);
  useEffect(() => { localStorage.setItem('loanadv_requests', JSON.stringify(requests)); }, [requests]);
  useEffect(() => { localStorage.setItem('loanadv_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('loanadv_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);

  // Route-based request viewing
  const viewingRequest = requestId ? requests.find(r => r.requestId === requestId) || null : null;

  const openRequest = (req: LoanAdvanceRequest) => {
    const basePath = window.location.pathname.replace(/\/loans-advances.*$/, '');
    window.open(`${basePath}/loans-advances/request/${req.requestId}`, '_blank');
  };

  const closeRequest = () => {
    navigate('/loans-advances');
  };

  // UI state controllers
  const [activeTab, setActiveTab] = useState<'my-requests' | 'approval-inbox' | 'all-requests' | 'policies'>(isManagement ? 'approval-inbox' : 'my-requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [deptMap, setDeptMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getDepartments().then(depts => {
      const map: Record<string, string> = {};
      (depts || []).forEach((d: any) => {
        if (d.id && d.department_name) {
          map[String(d.id)] = d.department_name;
        }
      });
      setDeptMap(map);
    }).catch(() => {});
  }, []);

  const resolveDeptName = (deptVal: string | number | undefined) => {
    if (!deptVal) return 'General';
    const key = String(deptVal);
    if (deptMap[key]) return deptMap[key];
    if (key === '16') return 'Engineering';
    if ((user as any)?.departmentName && !isNaN(Number(key))) return (user as any).departmentName;
    return isNaN(Number(key)) ? key : `Department #${key}`;
  };
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [showCreateCancelConfirm, setShowCreateCancelConfirm] = useState(false);
  const [showPolicyCancelConfirm, setShowPolicyCancelConfirm] = useState(false);

  // New Request Form State
  const [newRequest, setNewRequest] = useState({
    policyId: '',
    type: 'Loan' as 'Loan' | 'Advance',
    amount: '',
    tenure: '',
    reason: '',
    comments: ''
  });

  // New Policy Form State
  const [newPolicy, setNewPolicy] = useState<Omit<LoanAdvancePolicy, 'id'>>({
    name: '',
    code: '',
    description: '',
    type: 'Loan',
    maxAmount: 100000,
    interestRate: 8.5,
    maxTenure: 24,
    minTenure: 6,
    eligibility: { departments: ['All'], designations: ['All'], locations: ['All'], minTenureMonths: 12 },
    recoveryMethod: 'Equal EMI',
    workflow: ['Manager', 'HR', 'Finance'],
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    status: 'Active'
  });

  // Approval comment state
  const [approvalComment, setApprovalComment] = useState('');

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const writeAuditLog = (action: string, module: string, entityId: string, prev: string, next: string) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user?.name || 'User',
      role: userRole,
      action,
      module,
      entityId,
      previousValue: prev,
      newValue: next
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Status badge
  const getStatusBadge = (status: LoanAdvanceRequest['status']) => {
    const base = "px-2.5 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1.5 border ";
    switch (status) {
      case 'Draft': return base + "bg-slate-100 text-slate-700 border-slate-200";
      case 'Submitted': return base + "bg-blue-50 text-blue-700 border-blue-100";
      case 'Pending Manager Approval': return base + "bg-amber-50 text-amber-700 border-amber-100";
      case 'Pending HR Approval': return base + "bg-purple-50 text-purple-700 border-purple-100";
      case 'Pending Finance Approval': return base + "bg-primary-50 text-primary-700 border-primary-100";
      case 'Approved': return base + "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'Rejected': return base + "bg-rose-50 text-rose-700 border-rose-100";
      case 'Settled': return base + "bg-teal-50 text-teal-800 border-teal-200";
      case 'Disbursed': return base + "bg-cyan-50 text-cyan-700 border-cyan-100";
      case 'Withdrawn': return base + "bg-zinc-100 text-zinc-500 border-zinc-200";
      default: return base + "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // ==========================================
  // REQUEST CRUD ACTIONS
  // ==========================================

  const openNewRequestForm = () => {
    setNewRequest({ policyId: '', type: 'Loan', amount: '', tenure: '', reason: '', comments: '' });
    setIsCreateModalOpen(true);
  };

  const submitRequest = async (isDraft: boolean) => {
    if (!newRequest.policyId) {
      toast.error('Please select a loan/advance policy');
      return;
    }
    if (!isDraft && (!newRequest.amount || !newRequest.tenure || !newRequest.reason)) {
      toast.error('Amount, tenure, and reason are required');
      return;
    }

    const policy = policies.find(p => p.id === newRequest.policyId);
    const amt = parseFloat(newRequest.amount) || 0;
    const tenure = parseInt(newRequest.tenure) || 0;

    if (amt <= 0 && !isDraft) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (policy && amt > policy.maxAmount) {
      toast.error(`Amount ₹${amt.toLocaleString()} exceeds the maximum limit of ₹${policy.maxAmount.toLocaleString()} for "${policy.name}". Please reduce the amount.`);
      return;
    }

    const emi = tenure > 0 ? Math.ceil(amt / tenure) : 0;

    // Call backend API
    const payload = {
      principalAmount: amt,
      monthlyRecovery: emi,
      reason: newRequest.reason || newRequest.comments
    };

    try {
      if (newRequest.type === 'Loan') {
        await payrollService.requestLoan(payload);
      } else {
        await payrollService.requestAdvance(payload);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit request to server';
      toast.error(msg);
      return;
    }

    const req: LoanAdvanceRequest = {
      id: `req-${Date.now()}`,
      requestId: `${settings.autoRequestNumberPrefix}${String(requests.length + 1).padStart(3, '0')}`,
      employeeId: user?.employeeId || 'EMP-002',
      employeeName: user?.name || 'Vignesh K',
      department: user?.departmentId || 'Engineering',
      type: newRequest.type,
      policyId: newRequest.policyId,
      policyName: policy?.name || 'Custom',
      amount: amt,
      tenure,
      emi,
      reason: newRequest.reason,
      submitDate: new Date().toISOString().split('T')[0],
      status: isDraft ? 'Draft' : 'Submitted',
      outstandingBalance: amt,
      paidAmount: 0,
      comments: newRequest.comments.trim() ? [
        { user: user?.name || 'User', role: 'Employee', comment: newRequest.comments, date: new Date().toISOString().split('T')[0] }
      ] : [],
      history: [
        {
          action: isDraft ? 'Created Draft' : 'Submitted Request',
          user: user?.name || 'User',
          role: 'Employee',
          date: new Date().toISOString().split('T')[0],
          details: isDraft ? 'Saved as draft' : 'Submitted for review and approval'
        }
      ]
    };

    setRequests(prev => [req, ...prev]);
    writeAuditLog(isDraft ? 'REQUEST_DRAFT_CREATED' : 'REQUEST_SUBMITTED', 'Loan & Advance', req.id, '', `Created ${newRequest.type} request ${req.requestId} for ${currencySymbol}${amt}`);

    setIsCreateModalOpen(false);
    setNewRequest({ policyId: '', type: 'Loan', amount: '', tenure: '', reason: '', comments: '' });
    toast.success(isDraft ? 'Request saved as Draft' : 'Request submitted successfully! Notification sent to supervisor.');
  };

  const submitDraft = (reqId: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        writeAuditLog('REQUEST_SUBMITTED', 'Loan & Advance', r.id, 'Draft', 'Submitted');
        return {
          ...r,
          status: 'Submitted' as const,
          history: [...r.history, { action: 'Submitted Request', user: user?.name || 'User', role: 'Employee', date: new Date().toISOString().split('T')[0] }]
        };
      }
      return r;
    }));
    toast.success('Draft submitted successfully!');
    closeRequest();
  };

  const withdrawRequest = (reqId: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        writeAuditLog('REQUEST_WITHDRAWN', 'Loan & Advance', r.id, r.status, 'Withdrawn');
        return {
          ...r,
          status: 'Withdrawn' as const,
          history: [...r.history, { action: 'Withdrawn', user: user?.name || 'User', role: 'Employee', date: new Date().toISOString().split('T')[0] }]
        };
      }
      return r;
    }));
    toast.success('Request withdrawn');
    closeRequest();
  };

  const deleteRequest = (reqId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request?',
      onConfirm: () => {
        setRequests(prev => prev.filter(r => r.id !== reqId));
        writeAuditLog('REQUEST_DELETED', 'Loan & Advance', reqId, '', 'Deleted by employee');
        toast.success('Request deleted');
        closeRequest();
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const approveRequest = (reqId: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        const policy = policies.find(p => p.id === r.policyId);
        const workflow = policy?.workflow || ['Manager', 'HR', 'Finance'];
        const roleLabelMap: Record<string, string> = {
          'MANAGER': 'Manager Approved',
          'HR': 'HR Approved',
          'FINANCE': 'Finance Approved',
          'ADMIN': 'Admin Approved',
          'SUPER_ADMIN': 'Admin Approved',
        };
        const actionLabel = roleLabelMap[userRole] || 'Approved';

        let nextStatus: LoanAdvanceRequest['status'] = 'Approved';
        if (r.status === 'Submitted' || r.status === 'Pending Manager Approval') {
          if (workflow.includes('HR')) nextStatus = 'Pending HR Approval';
          else if (workflow.includes('Finance')) nextStatus = 'Pending Finance Approval';
          else nextStatus = 'Approved';
        } else if (r.status === 'Pending HR Approval') {
          if (workflow.includes('Finance')) nextStatus = 'Pending Finance Approval';
          else nextStatus = 'Approved';
        } else if (r.status === 'Pending Finance Approval') {
          nextStatus = 'Approved';
        }

        const comments = approvalComment.trim() ? [
          ...r.comments,
          { user: user?.name || 'Approver', role: userRole, comment: approvalComment, date: new Date().toISOString().split('T')[0] }
        ] : r.comments;

        writeAuditLog('REQUEST_APPROVED', 'Approval Flow', r.id, r.status, nextStatus);
        setApprovalComment('');
        return {
          ...r,
          status: nextStatus,
          comments,
          history: [...r.history, { action: actionLabel, user: user?.name || 'Approver', role: userRole, date: new Date().toISOString().split('T')[0], details: `Status updated to ${nextStatus}` }]
        };
      }
      return r;
    }));
    toast.success('Request approved successfully!');
    closeRequest();
  };

  const rejectRequest = (reqId: string) => {
    if (!approvalComment.trim()) {
      toast.error('Rejection comment is required');
      return;
    }
    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        const comments = [
          ...r.comments,
          { user: user?.name || 'Approver', role: userRole, comment: approvalComment, date: new Date().toISOString().split('T')[0] }
        ];
        writeAuditLog('REQUEST_REJECTED', 'Approval Flow', r.id, r.status, 'Rejected');
        setApprovalComment('');
        return {
          ...r,
          status: 'Rejected' as const,
          comments,
          history: [...r.history, { action: 'Request Rejected', user: user?.name || 'Approver', role: userRole, date: new Date().toISOString().split('T')[0], details: approvalComment }]
        };
      }
      return r;
    }));
    toast.success('Request rejected');
    closeRequest();
  };

  const settleRequest = (reqId: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        writeAuditLog('REQUEST_SETTLED', 'Loan & Advance', r.id, r.status, 'Settled');
        return {
          ...r,
          status: 'Settled' as const,
          outstandingBalance: 0,
          paidAmount: r.amount,
          history: [...r.history, { action: 'Settled', user: user?.name || 'Finance', role: userRole, date: new Date().toISOString().split('T')[0], details: 'Loan/Advance fully settled' }]
        };
      }
      return r;
    }));
    toast.success('Request settled successfully');
    closeRequest();
  };

  const disburseRequest = (reqId: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        const emi = r.tenure > 0 ? Math.ceil(r.amount / r.tenure) : r.amount;
        const schedule = [];
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'short', year: 'numeric' });
        // First entry: credit (full amount disbursed in current month payroll)
        schedule.push({
          month: currentMonth,
          amount: r.amount,
          status: 'Paid' as const,
          type: 'Credit' as const,
        });
        // Remaining entries: EMI deductions starting next month
        for (let i = 0; i < r.tenure; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
          schedule.push({
            month: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
            amount: i === r.tenure - 1 ? r.amount - emi * (r.tenure - 1) : emi,
            status: 'Pending' as const,
            type: 'EMI Deduction' as const,
          });
        }
        writeAuditLog('REQUEST_DISBURSED', 'Loan & Advance', r.id, r.status, 'Disbursed');
        return {
          ...r,
          status: 'Disbursed' as const,
          disbursedDate: new Date().toISOString().split('T')[0],
          repaymentSchedule: schedule,
          paidAmount: r.amount,
          outstandingBalance: r.amount,
          history: [...r.history, { action: 'Disbursed', user: user?.name || 'Finance', role: userRole, date: new Date().toISOString().split('T')[0], details: `Loan/Advance amount ${currencySymbol}${r.amount.toLocaleString()} credited in ${currentMonth} payroll. EMI ${currencySymbol}${emi.toLocaleString()}/mo will be deducted starting next month.` }]
        };
      }
      return r;
    }));
    toast.success('Loan disbursed! Amount credited in current payroll. EMI deductions start next month.');
    closeRequest();
  };

  const recordEMIPayment = (reqId: string, monthIndex: number) => {
    setRequests(prev => prev.map(r => {
      if (r.id === reqId && r.repaymentSchedule) {
        const updatedSchedule = r.repaymentSchedule.map((s, i) => i === monthIndex ? { ...s, status: 'Paid' as const } : s);
        const emiEntries = updatedSchedule.filter(s => s.type === 'EMI Deduction');
        const paidEmis = emiEntries.filter(s => s.status === 'Paid').length;
        const totalEmis = emiEntries.length;
        const paidAmount = updatedSchedule.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.amount, 0);
        const outstanding = r.amount - (paidAmount - r.amount); // subtract credit, keep deductions
        const allPaid = paidEmis === totalEmis;

        writeAuditLog('EMI_PAYMENT_RECORDED', 'Loan & Advance', r.id, `EMI ${paidEmis} of ${totalEmis} Paid`, allPaid ? 'Settled' : 'EMI Paid');

        return {
          ...r,
          repaymentSchedule: updatedSchedule,
          paidAmount: paidAmount - r.amount,
          outstandingBalance: Math.max(0, r.amount - (paidAmount - r.amount)),
          status: allPaid ? 'Settled' as const : r.status,
          history: [...r.history, {
            action: allPaid ? 'Loan Settled - All EMIs Paid' : `EMI ${paidEmis} of ${totalEmis} Paid`,
            user: user?.name || 'System',
            role: userRole,
            date: new Date().toISOString().split('T')[0],
            details: allPaid ? 'All EMIs paid. Loan fully settled.' : `EMI ${currencySymbol}${updatedSchedule[monthIndex].amount.toLocaleString()} deducted from payroll. Outstanding: ${currencySymbol}${Math.max(0, r.amount - (paidAmount - r.amount)).toLocaleString()}`
          }]
        };
      }
      return r;
    }));
    toast.success('EMI payment recorded');
    closeRequest();
  };

  // Policy handlers
  const startEditPolicy = (p: LoanAdvancePolicy) => {
    setEditingPolicyId(p.id);
    setNewPolicy({
      name: p.name, code: p.code, description: p.description, type: p.type,
      maxAmount: p.maxAmount, interestRate: p.interestRate, maxTenure: p.maxTenure, minTenure: p.minTenure,
      eligibility: { ...p.eligibility },
      recoveryMethod: p.recoveryMethod, workflow: [...p.workflow],
      effectiveDate: p.effectiveDate, expiryDate: p.expiryDate, status: p.status
    });
    setIsPolicyModalOpen(true);
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.name || !newPolicy.code) {
      toast.error('Policy name and code are required');
      return;
    }
    if (editingPolicyId) {
      setPolicies(prev => prev.map(p => p.id === editingPolicyId ? { ...newPolicy, id: editingPolicyId } : p));
      writeAuditLog('POLICY_UPDATED', 'Policies', editingPolicyId, '', `Updated policy ${newPolicy.name}`);
      toast.success('Policy updated successfully!');
    } else {
      const policy: LoanAdvancePolicy = { ...newPolicy, id: `pol-${Date.now()}` };
      setPolicies(prev => [...prev, policy]);
      writeAuditLog('POLICY_CREATED', 'Policies', policy.id, '', `Created policy ${policy.name}`);
      toast.success('Policy created successfully!');
    }
    closePolicyEditor();
  };

  const closePolicyEditor = () => {
    setEditingPolicyId(null);
    setNewPolicy({
      name: '', code: '', description: '', type: 'Loan',
      maxAmount: 100000, interestRate: 8.5, maxTenure: 24, minTenure: 6,
      eligibility: { departments: ['All'], designations: ['All'], locations: ['All'], minTenureMonths: 12 },
      recoveryMethod: 'Equal EMI', workflow: ['Manager', 'HR', 'Finance'],
      effectiveDate: new Date().toISOString().split('T')[0], expiryDate: '', status: 'Active'
    });
    setIsPolicyModalOpen(false);
  };

  const handleDeletePolicy = (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Policy',
      message: 'Are you sure you want to delete this policy?',
      onConfirm: () => {
        const pol = policies.find(p => p.id === id);
        setPolicies(prev => prev.filter(p => p.id !== id));
        writeAuditLog('POLICY_DELETED', 'Policies', id, pol?.name || '', '');
        toast.success('Policy deleted');
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const toggleWorkflowStep = (step: string) => {
    setNewPolicy(prev => {
      let current = [...(prev.workflow || [])];
      if (current.includes(step)) current = current.filter(x => x !== step);
      else current.push(step);
      const ordered = [];
      if (current.includes('Manager')) ordered.push('Manager');
      if (current.includes('HR')) ordered.push('HR');
      if (current.includes('Finance')) ordered.push('Finance');
      return { ...prev, workflow: ordered.length > 0 ? ordered : ['Manager', 'Finance'] };
    });
  };

  // Filtered requests based on search and filters
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = searchQuery === '' ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.policyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesType = typeFilter === 'All' || r.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchQuery, statusFilter, typeFilter]);

  // Export CSV
  const exportToCSV = () => {
    const headers = ['Request No', 'Employee', 'Department', 'Type', 'Policy', 'Amount', 'EMI', 'Outstanding', 'Status'];
    const rows = filteredRequests.map(r => [
      r.requestId, r.employeeName, r.department, r.type, r.policyName,
      r.amount, r.emi, r.outstandingBalance, r.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LoanAdvances_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data exported to CSV');
  };

  // ==========================================
  // CREATE REQUEST VIEW
  // ==========================================

  if (isCreateModalOpen) {
    return (
      <>
      <div className="flex-1 bg-slate-50/50 min-h-screen pb-12 animate-in fade-in duration-200">
        <div className="shadow-lg">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-slate-500" />
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-700">Loans & Advances Portal</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">New Loan / Advance Request</h1>
                <p className="text-slate-500 text-sm">Select a policy, enter details and submit for approval</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="bg-white text-slate-900 font-bold px-4 py-2.5 rounded-lg border border-slate-300 shadow-sm transition hover:bg-slate-100 flex items-center gap-2 text-sm w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Hub
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden p-6 space-y-6">

            {/* Policy Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Request Type <span className="text-red-500">*</span></label>
                <select
                  value={newRequest.type}
                  onChange={e => setNewRequest(prev => ({ ...prev, type: e.target.value as 'Loan' | 'Advance', policyId: '' }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition"
                >
                  <option value="Loan">Loan</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Policy <span className="text-red-500">*</span></label>
                <select
                  value={newRequest.policyId}
                  onChange={e => setNewRequest(prev => ({ ...prev, policyId: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition"
                >
                  <option value="">Select a Policy</option>
                  {policies.filter(p => p.status === 'Active' && p.type === newRequest.type).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code}) - Max: {currencySymbol}{p.maxAmount.toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Applied Policy Info</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 h-10 flex items-center">
                  {(() => {
                    const matched = policies.find(p => p.id === newRequest.policyId);
                    if (matched) {
                      return (
                        <span className="text-emerald-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {matched.type} @ {matched.interestRate}% interest, {matched.minTenure}-{matched.maxTenure} months
                        </span>
                      );
                    }
                    return <span className="text-slate-400 font-normal">Select a policy to view details</span>;
                  })()}
                </div>
              </div>
            </div>

            {/* Amount & Tenure */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Amount ({currencySymbol}) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={newRequest.amount}
                  onChange={e => setNewRequest(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-card outline-none"
                />
                {newRequest.policyId && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Max: {currencySymbol}{policies.find(p => p.id === newRequest.policyId)?.maxAmount.toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Tenure (Months) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={newRequest.tenure}
                  onChange={e => setNewRequest(prev => ({ ...prev, tenure: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-card outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Monthly EMI</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-primary-700 h-10 flex items-center">
                  {newRequest.amount && newRequest.tenure && Number(newRequest.tenure) > 0
                    ? `${currencySymbol}${Math.ceil(Number(newRequest.amount) / Number(newRequest.tenure)).toLocaleString()}/month`
                    : 'Auto-calculated'
                  }
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Reason / Purpose <span className="text-red-500">*</span></label>
              <textarea
                placeholder="Explain why you need this loan or advance..."
                value={newRequest.reason}
                onChange={e => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 transition h-20 resize-none"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Additional Comments</label>
              <textarea
                placeholder="Any additional information for the approval team..."
                value={newRequest.comments}
                onChange={e => setNewRequest(prev => ({ ...prev, comments: e.target.value }))}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 transition h-16 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <button
                onClick={() => setShowCreateCancelConfirm(true)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-lg text-sm transition"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => submitRequest(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-lg text-sm border border-slate-200 transition"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => submitRequest(false)}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow transition"
                >
                  Submit for Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCreateCancelConfirm}
        title="Discard changes?"
        message="Are you sure you want to cancel? Any unsaved changes will be lost."
        confirmLabel="Discard"
        cancelLabel="Continue editing"
        confirmColor="red"
        onConfirm={() => { setIsCreateModalOpen(false); setShowCreateCancelConfirm(false); }}
        onCancel={() => setShowCreateCancelConfirm(false)}
      />
      </>
    );
  }

  // ==========================================
  // POLICY EDITOR VIEW
  // ==========================================

  if (isPolicyModalOpen) {
    return (
      <>
      <div className="flex-1 bg-slate-50/50 min-h-screen pb-12 animate-in fade-in duration-200">
        <div>
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4.5 h-4.5 text-slate-500" />
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-700">Loan & Advance Policy Config</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{editingPolicyId ? 'Edit Policy' : 'Create Policy'}</h1>
                <p className="text-slate-500 text-sm">{editingPolicyId ? 'Modify policy limits and eligibility' : 'Setup loan/advance policy rules'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <form onSubmit={handleCreatePolicy} className="bg-card rounded-2xl border border-border shadow-md overflow-hidden p-6 space-y-6 flex flex-col">
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Policy Name *</label>
                  <input type="text" required placeholder="e.g. Personal Loan" value={newPolicy.name}
                    onChange={e => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Unique Code *</label>
                  <input type="text" required placeholder="e.g. POL-PLN-PERS" value={newPolicy.code}
                    onChange={e => setNewPolicy(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Description</label>
                <textarea placeholder="Describe policy details..." value={newPolicy.description}
                  onChange={e => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-4 focus:ring-blue-100 h-16 resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Type</label>
                  <select value={newPolicy.type} onChange={e => setNewPolicy(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-card">
                    <option value="Loan">Loan</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Max Amount ({currencySymbol})</label>
                  <input type="number" value={newPolicy.maxAmount}
                    onChange={e => setNewPolicy(prev => ({ ...prev, maxAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Interest Rate (%)</label>
                  <input type="number" step="0.1" value={newPolicy.interestRate}
                    onChange={e => setNewPolicy(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Max Tenure (Months)</label>
                  <input type="number" value={newPolicy.maxTenure}
                    onChange={e => setNewPolicy(prev => ({ ...prev, maxTenure: parseInt(e.target.value) || 0 }))}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
              </div>

              {/* Workflow */}
              <div className="border-t pt-4 border-dashed border-slate-200">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-1">Approval Routing Workflow</h4>
                <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-border overflow-x-auto">
                  {newPolicy.workflow.map((step, idx) => (
                    <React.Fragment key={step}>
                      {idx > 0 && <span className="text-slate-400 font-bold text-sm">→</span>}
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
                        <span className="text-xs font-extrabold text-slate-800">{step === 'Manager' ? 'Reporting Manager' : step === 'HR' ? 'HR Department' : 'Finance Disbursal'}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {['Manager', 'HR', 'Finance'].map(step => (
                    <label key={step} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-350 transition cursor-pointer shadow-sm">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={newPolicy.workflow.includes(step)} onChange={() => toggleWorkflowStep(step)}
                          className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{step === 'Manager' ? '1. Reporting Manager' : step === 'HR' ? '2. HR Verification' : '3. Finance Processing'}</span>
                          <span className="text-[10px] text-slate-500">{step === 'Manager' ? 'First level direct manager' : step === 'HR' ? 'Policy audit & compliance' : 'Ledger accounting & disbursement'}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4 border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Effective Start Date</label>
                  <StandardDatePicker value={newPolicy.effectiveDate}
                    onChange={date => setNewPolicy(prev => ({ ...prev, effectiveDate: date }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Expiry End Date</label>
                  <StandardDatePicker value={newPolicy.expiryDate}
                    onChange={date => setNewPolicy(prev => ({ ...prev, expiryDate: date }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Status</label>
                <select value={newPolicy.status} onChange={e => setNewPolicy(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-card">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end gap-3">
              <button type="button" onClick={() => setShowPolicyCancelConfirm(true)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-lg transition">Cancel</button>
              <button type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-lg shadow transition">
                {editingPolicyId ? 'Save Changes' : 'Create Policy'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={showPolicyCancelConfirm}
        title="Discard changes?"
        message="Are you sure you want to cancel? Any unsaved changes will be lost."
        confirmLabel="Discard"
        cancelLabel="Continue editing"
        confirmColor="red"
        onConfirm={closePolicyEditor}
        onCancel={() => setShowPolicyCancelConfirm(false)}
      />
      </>
    );
  }

  // ==========================================
  // REQUEST DETAIL VIEW (separate page)
  // ==========================================

  if (viewingRequest) {
    return (
      <div className="flex-1 bg-slate-50/50 min-h-screen pb-12 animate-in fade-in duration-200">
        <div className="shadow-lg">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => closeRequest()}
                  className="bg-white text-slate-900 p-2.5 rounded-full border border-slate-300 shadow-sm transition hover:bg-slate-100">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{viewingRequest.requestId}</h1>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${viewingRequest.type === 'Loan' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {viewingRequest.type}
                    </span>
                    <span className={getStatusBadge(viewingRequest.status)}>{viewingRequest.status}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {viewingRequest.employeeName} · {resolveDeptName(viewingRequest.department)} · Policy: {viewingRequest.policyName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {viewingRequest.status === 'Draft' && viewingRequest.employeeId === user?.employeeId && (
                  <>
                    <button onClick={() => submitDraft(viewingRequest.id)}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition">Submit</button>
                    <button onClick={() => withdrawRequest(viewingRequest.id)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition">Delete</button>
                  </>
                )}
                {['Submitted', 'Pending Manager Approval', 'Pending HR Approval', 'Pending Finance Approval'].includes(viewingRequest.status) && viewingRequest.employeeId === user?.employeeId && (
                  <button onClick={() => withdrawRequest(viewingRequest.id)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition">Withdraw</button>
                )}
                {isManagement && ['Submitted', 'Pending Manager Approval', 'Pending HR Approval', 'Pending Finance Approval'].includes(viewingRequest.status) && (
                  <>
                    <button onClick={() => approveRequest(viewingRequest.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => rejectRequest(viewingRequest.id)}
                      className="border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
                {isManagement && viewingRequest.status === 'Approved' && (
                  <button onClick={() => disburseRequest(viewingRequest.id)}
                    className="bg-primary hover:bg-primary/70 text-white font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" /> Disburse
                  </button>
                )}
                {isManagement && viewingRequest.status === 'Disbursed' && viewingRequest.repaymentSchedule && viewingRequest.repaymentSchedule.findIndex(s => s.status === 'Pending' && s.type === 'EMI Deduction') >= 0 && (
                  <button onClick={() => recordEMIPayment(viewingRequest.id, viewingRequest.repaymentSchedule!.findIndex(s => s.status === 'Pending' && s.type === 'EMI Deduction'))}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Record EMI Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase">Requested Amount</p>
              <p className="text-2xl font-black text-foreground mt-1">{currencySymbol}{viewingRequest.amount.toLocaleString()}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-xs font-bold text-emerald-600 uppercase">Monthly EMI</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{currencySymbol}{viewingRequest.emi.toLocaleString()}/mo</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-xs font-bold text-rose-600 uppercase">Outstanding Balance</p>
              <p className="text-2xl font-black text-rose-700 mt-1">{currencySymbol}{viewingRequest.outstandingBalance.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {viewingRequest.reason && (
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Reason / Purpose</p>
                  <p className="text-sm text-foreground">{viewingRequest.reason}</p>
                </div>
              )}

              {viewingRequest.repaymentSchedule && viewingRequest.repaymentSchedule.length > 0 && (
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Repayment Schedule</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-border text-xs font-bold text-slate-600 uppercase">
                        <th className="p-3 text-left font-semibold text-sm text-black">Month</th>
                        <th className="p-3 text-left font-semibold text-sm text-black">Type</th>
                        <th className="p-3 text-left font-semibold text-sm text-black">Amount</th>
                        <th className="p-3 text-left font-semibold text-sm text-black">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewingRequest.repaymentSchedule.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50/30">
                          <td className="p-3 font-bold">{s.month}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${s.type === 'Credit' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              {s.type}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold">
                            <span className={s.type === 'Credit' ? 'text-emerald-600' : 'text-rose-600'}>
                              {s.type === 'Credit' ? '+' : '-'}{currencySymbol}{s.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${s.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewingRequest.history.length > 0 && (
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Activity History</p>
                  </div>
                  <div className="divide-y divide-border">
                    {viewingRequest.history.map((h, i) => (
                      <div key={i} className="p-4 flex items-center gap-3">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm font-bold">{h.action}</span>
                          <span className="text-xs text-muted-foreground ml-2">by {h.user} ({h.role})</span>
                          {h.details && <p className="text-xs text-muted-foreground mt-0.5">{h.details}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Timeline & Comments */}
            <div className="space-y-6">
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Approval Timeline</p>
                <ApprovalTimeline
                  currentStatus={viewingRequest.status === 'Submitted' ? 'PENDING_MANAGER' : viewingRequest.status === 'Pending Manager Approval' ? 'PENDING_MANAGER' : viewingRequest.status === 'Pending HR Approval' ? 'PENDING_HR' : viewingRequest.status === 'Pending Finance Approval' ? 'PENDING_FINANCE' : viewingRequest.status === 'Approved' ? 'APPROVED' : viewingRequest.status === 'Rejected' ? 'REJECTED' : 'APPROVED'}
                />
              </div>

              <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Comments</p>
                {viewingRequest.comments.length > 0 ? (
                  <div className="space-y-3">
                    {viewingRequest.comments.map((c, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-foreground">{c.user}</span>
                          <span className="text-[10px] text-muted-foreground">{c.role} · {c.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                )}
              </div>

              {isManagement && ['Submitted', 'Pending Manager Approval', 'Pending HR Approval', 'Pending Finance Approval'].includes(viewingRequest.status) && (
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Add Comment</label>
                  <textarea
                    placeholder="Add comment (required for rejection)..."
                    value={approvalComment}
                    onChange={e => setApprovalComment(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-4 focus:ring-blue-100 h-20 resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN VIEW
  // ==========================================

  return (
    <div className="relative min-h-screen space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Loans & Advances</h1>
          <p className="text-sm text-muted-foreground">Issue loans, process approvals, and track repayments</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isManagement && (
            <button
              onClick={() => { setEditingPolicyId(null); setIsPolicyModalOpen(true); }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-200 transition-all text-sm"
            >
              Add Policy
            </button>
          )}
          <button
            onClick={exportToCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-200 transition-all text-sm"
          >
            Export
          </button>
          <button
            onClick={openNewRequestForm}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {!isManagement && (
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'my-requests' ? 'text-primary-700 border-b-2 border-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              My Requests
            </button>
          )}

          {isManagement && (
            <button
              onClick={() => setActiveTab('approval-inbox')}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'approval-inbox' ? 'text-primary-700 border-b-2 border-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Approval Inbox
            </button>
          )}

          {isManagement && (
            <button
              onClick={() => setActiveTab('all-requests')}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'all-requests' ? 'text-primary-700 border-b-2 border-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All Requests
            </button>
          )}

          {isManagement && (
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'policies' ? 'text-primary-700 border-b-2 border-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Policies
            </button>
          )}
        </div>
      </div>

      <div>

        {/* ==========================================
            TAB: MY REQUESTS
            ========================================== */}
        {activeTab === 'my-requests' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search requests by ID, policy, reason..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 hover:border-slate-300 transition" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition">
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Pending Manager Approval">Pending Manager</option>
                    <option value="Pending HR Approval">Pending HR</option>
                    <option value="Pending Finance Approval">Pending Finance</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Settled">Settled</option>
                    <option value="Disbursed">Disbursed</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Type</span>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition">
                    <option value="All">All Types</option>
                    <option value="Loan">Loan</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-4 font-semibold text-sm text-black">Request</th>
                    <th className="p-4 font-semibold text-sm text-black">Type</th>
                    <th className="p-4 font-semibold text-sm text-black">Amount</th>
                    <th className="p-4 font-semibold text-sm text-black">EMI</th>
                    <th className="p-4 font-semibold text-sm text-black">Outstanding</th>
                    <th className="p-4 font-semibold text-sm text-black">Status</th>
                    <th className="p-4 text-right font-semibold text-sm text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredRequests.filter(r => r.employeeId === (user?.employeeId || 'EMP-002')).length === 0 ? (
                    <tr><td colSpan={7} className="p-12 text-center text-muted-foreground italic">No requests found.</td></tr>
                  ) : (
                    filteredRequests.filter(r => r.employeeId === (user?.employeeId || 'EMP-002')).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/30 transition">
                        <td className="p-4">
                          <span className="font-extrabold text-primary-700 hover:underline cursor-pointer" onClick={() => { openRequest(r); setApprovalComment(''); }}>{r.requestId}</span>
                          <p className="text-xs text-slate-500">{r.policyName}</p>
                        </td>
                        <td className="p-4"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${r.type === 'Loan' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.type}</span></td>
                        <td className="p-4"><span className="font-black text-slate-900">{currencySymbol}{r.amount.toLocaleString()}</span></td>
                        <td className="p-4"><span className="font-mono text-sm text-primary font-bold">{currencySymbol}{r.emi.toLocaleString()}/mo</span></td>
                        <td className="p-4"><span className="font-mono text-sm text-rose-600 font-bold">{currencySymbol}{r.outstandingBalance.toLocaleString()}</span></td>
                        <td className="p-4"><span className={getStatusBadge(r.status)}>{r.status}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { openRequest(r); setApprovalComment(''); }} className="text-primary-600 hover:bg-primary-50 p-1.5 rounded-lg transition" title="View details">
                              <Eye className="w-4 h-4" />
                            </button>
                            {['Draft', 'Submitted', 'Withdrawn'].includes(r.status) && (
                              <button onClick={() => deleteRequest(r.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition" title="Delete request">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: APPROVAL INBOX
            ========================================== */}
        {activeTab === 'approval-inbox' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search by ID, employee, department..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 hover:border-slate-300 transition" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition">
                    <option value="All">All Pending</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Pending Manager Approval">Pending Manager</option>
                    <option value="Pending HR Approval">Pending HR</option>
                    <option value="Pending Finance Approval">Pending Finance</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Type</span>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition">
                    <option value="All">All Types</option>
                    <option value="Loan">Loan</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-4 font-semibold text-sm text-black">Request</th>
                    <th className="p-4 font-semibold text-sm text-black">Employee</th>
                    <th className="p-4 font-semibold text-sm text-black">Type</th>
                    <th className="p-4 font-semibold text-sm text-black">Amount</th>
                    <th className="p-4 font-semibold text-sm text-black">EMI</th>
                    <th className="p-4 font-semibold text-sm text-black">Status</th>
                    <th className="p-4 text-right font-semibold text-sm text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredRequests.filter(r => r.employeeId !== (user?.employeeId || 'EMP-002')).length === 0 ? (
                    <tr><td colSpan={7} className="p-12 text-center text-muted-foreground italic">No pending approvals.</td></tr>
                  ) : (
                    filteredRequests.filter(r => r.employeeId !== (user?.employeeId || 'EMP-002')).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/30 transition">
                        <td className="p-4">
                          <span className="font-extrabold text-primary-700 hover:underline cursor-pointer" onClick={() => { openRequest(r); setApprovalComment(''); }}>{r.requestId}</span>
                          <p className="text-xs text-slate-500">{r.policyName}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{resolveDeptName(r.department)}</p>
                        </td>
                        <td className="p-4"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${r.type === 'Loan' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.type}</span></td>
                        <td className="p-4"><span className="font-black text-slate-900">{currencySymbol}{r.amount.toLocaleString()}</span></td>
                        <td className="p-4"><span className="font-mono text-sm text-primary font-bold">{currencySymbol}{r.emi.toLocaleString()}/mo</span></td>
                        <td className="p-4"><span className={getStatusBadge(r.status)}>{r.status}</span></td>
                        <td className="p-4 text-right">
                          <button onClick={() => openRequest(r)} className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-2 py-1 rounded text-xs transition">
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: ALL REQUESTS
            ========================================== */}
        {activeTab === 'all-requests' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search by ID, employee, department, policy..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 hover:border-slate-300 transition" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition">
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Pending Manager Approval">Pending Manager</option>
                    <option value="Pending HR Approval">Pending HR</option>
                    <option value="Pending Finance Approval">Pending Finance</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Settled">Settled</option>
                    <option value="Disbursed">Disbursed</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Type</span>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-card hover:bg-slate-50 outline-none transition">
                    <option value="All">All Types</option>
                    <option value="Loan">Loan</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
                <button onClick={exportToCSV} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-sm transition flex items-center gap-1.5 shadow-sm">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-4 font-semibold text-sm text-black">Request</th>
                    <th className="p-4 font-semibold text-sm text-black">Employee</th>
                    <th className="p-4 font-semibold text-sm text-black">Type</th>
                    <th className="p-4 font-semibold text-sm text-black">Amount</th>
                    <th className="p-4 font-semibold text-sm text-black">EMI</th>
                    <th className="p-4 font-semibold text-sm text-black">Outstanding</th>
                    <th className="p-4 font-semibold text-sm text-black">Status</th>
                    <th className="p-4 text-right font-semibold text-sm text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredRequests.length === 0 ? (
                    <tr><td colSpan={8} className="p-12 text-center text-muted-foreground italic">No requests found.</td></tr>
                  ) : (
                    filteredRequests.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/30 transition">
                        <td className="p-4">
                          <span className="font-extrabold text-primary-700 hover:underline cursor-pointer" onClick={() => { openRequest(r); setApprovalComment(''); }}>{r.requestId}</span>
                          <p className="text-xs text-slate-500">{r.policyName}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{resolveDeptName(r.department)}</p>
                        </td>
                        <td className="p-4"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${r.type === 'Loan' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.type}</span></td>
                        <td className="p-4"><span className="font-black text-slate-900">{currencySymbol}{r.amount.toLocaleString()}</span></td>
                        <td className="p-4"><span className="font-mono text-sm text-primary font-bold">{currencySymbol}{r.emi.toLocaleString()}/mo</span></td>
                        <td className="p-4"><span className="font-mono text-sm text-rose-600 font-bold">{currencySymbol}{r.outstandingBalance.toLocaleString()}</span></td>
                        <td className="p-4"><span className={getStatusBadge(r.status)}>{r.status}</span></td>
                        <td className="p-4 text-right">
                          <button onClick={() => { openRequest(r); setApprovalComment(''); }} className="text-primary-600 hover:bg-primary-50 p-1.5 rounded-lg transition" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: POLICIES
            ========================================== */}
        {activeTab === 'policies' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Loan & Advance Policies</h3>
                <p className="text-xs text-muted-foreground">Configure loan types, limits, and approval hierarchies</p>
              </div>
              <button
                onClick={() => { setEditingPolicyId(null); setIsPolicyModalOpen(true); }}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-all text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Policy
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {policies.map(p => (
                <div key={p.id} className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between space-y-4 relative hover:border-slate-300 transition">
                  <div className="absolute right-4 top-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest bg-primary-50 px-2 py-1 rounded">{p.code}</span>
                    <h4 className="font-extrabold text-slate-900 pt-1">{p.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Type:</span><span className="font-bold text-slate-700">{p.type}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Max Amount:</span><span className="font-black text-slate-900">{currencySymbol}{p.maxAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Interest:</span><span className="font-bold text-slate-700">{p.interestRate}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tenure:</span><span className="font-bold text-slate-700">{p.minTenure}-{p.maxTenure} months</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Workflow:</span><span className="font-bold text-primary-700">{p.workflow.join(' → ')}</span></div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button onClick={() => startEditPolicy(p)} className="text-primary-500 hover:text-primary-700 p-1.5 rounded transition hover:bg-primary-50" title="Edit Policy">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeletePolicy(p.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded transition hover:bg-red-50" title="Delete Policy">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="red"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}

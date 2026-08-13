import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { UserRole } from '@/shared/types/rbac';
import {
  FileText, Search, Plus, Shield, DollarSign, CheckCircle2, XCircle, Clock,
  ArrowRight, Download, Upload, Trash2, Calendar, FileCheck, Layers, PieChart,
  Eye, RefreshCw, ChevronRight, BarChart3, Settings as SettingsIcon, AlertCircle,
  FileSpreadsheet, User, Building, MapPin, Tag, Landmark, Sparkles, Inbox, Activity, ArrowLeft, Edit, Receipt, LayoutDashboard, ShieldCheck, Tags
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { toast } from 'sonner';
import { RejectReasonDialog } from '@/shared/components/ui/RejectReasonDialog';
import { ConfirmationDialog } from '@/shared/components/ui/ConfirmationDialog';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import { Card, CardContent } from '@/shared/components/ui/card';
import Select from '@/shared/components/ui/Select';
import axiosInstance from '@/shared/services/axiosInstance';
import * as payrollService from '@/features/payroll/services/payroll';
import { auditService } from '@/features/audit/services/audit';

// ==========================================
// FILE / RECEIPT URL HELPERS
// ==========================================

// Backend stores file URLs as relative paths (e.g. /upload/xxx.png). In production the
// API lives on a different origin than the frontend, so resolve relative paths against it.
const resolveFileUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (/^(data:|blob:|https?:|\/\/)/i.test(url)) return url;
  if (url.startsWith('/')) {
    const apiBase = axiosInstance.defaults.baseURL || '';
    const origin = apiBase.replace(/\/employee-api\/?$/, '');
    return `${origin}${url}`;
  }
  return url;
};

const downloadReceipt = (item: { receiptUrl?: string; receiptName?: string }) => {
  const url = resolveFileUrl(item.receiptUrl);
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = item.receiptName || 'receipt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded: ${item.receiptName || 'receipt'}`);
  } else {
    const link = document.createElement('a');
    link.href = import.meta.env.BASE_URL + 'scanned_receipt.png';
    link.download = item.receiptName || 'receipt.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded mock: ${item.receiptName || 'receipt.png'}`);
  }
};

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?)(;base64)?$/);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
};

// ==========================================
// INTERFACES & TYPE DEFINITIONS
// ==========================================

export interface ReimbursementPolicy {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'Actual' | 'Fixed' | 'Capped' | 'Per Diem' | 'Mileage';
  categories: string[];
  eligibility: {
    departments: string[];
    designations: string[];
    locations: string[];
  };
  maxLimit: number;
  frequency: 'Daily' | 'Monthly' | 'Yearly' | 'Per Claim';
  receiptRequired: boolean;
  minAmountForReceipt: number;
  workflow: string[]; // e.g. ['Manager', 'HR', 'Finance']
  effectiveDate: string;
  expiryDate: string;
  status: 'Active' | 'Inactive';
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  maxLimit: number;
  receiptRequired: boolean;
  taxApplicable: boolean;
  status: 'Active' | 'Inactive';
}

export interface ClaimItem {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  gstNumber?: string;
  receiptUrl?: string;
  receiptName?: string;
}

export interface EmployeeClaim {
  id: string;
  dbId?: number;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  policyId: string;
  policyName: string;
  submitDate: string;
  amount: number;
  currency: string;
  status: 'Draft' | 'Submitted' | 'Pending Manager Approval' | 'Pending HR Approval' | 'Pending Finance Approval' | 'Waiting for Payout' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled' | 'Re-submission Required' | 'Resubmitted' | 'Processing Payout' | 'Pending Payroll';
  items: ClaimItem[];
  comments: { user: string; role: string; comment: string; date: string }[];
  history: { action: string; user: string; role: string; date: string; details?: string }[];
  paymentDetails?: {
    method: 'Payroll' | 'Bank Transfer' | 'Cash' | 'UPI' | 'Other';
    reference: string;
    paidDate: string;
    month?: string;
  };
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
  autoClaimNumberPrefix: string;
  financialYear: string;
  claimWindowDays: number;
  receiptSizeLimitMb: number;
  allowedFileTypes: string[];
  defaultWorkflow: string[];
  taxRulesGst: number;
  defaultCurrency: string;
  reimbursementFrequency: string;
}

// ==========================================
// MOCK DATA SEEDERS FOR LOCAL STORAGE
// ==========================================

const defaultCategories: ExpenseCategory[] = [
  { id: 'cat-1', name: 'Travel & Local Conveyance', description: 'Flights, trains, cabs, bus fares', maxLimit: 50000, receiptRequired: true, taxApplicable: true, status: 'Active' },
  { id: 'cat-2', name: 'Hotel & Lodging', description: 'Business trip stay and accommodation', maxLimit: 80000, receiptRequired: true, taxApplicable: true, status: 'Active' },
  { id: 'cat-3', name: 'Meals & Client Entertainment', description: 'Business meals and client hospitality expenses', maxLimit: 5000, receiptRequired: true, taxApplicable: false, status: 'Active' },
  { id: 'cat-4', name: 'Fuel & Mileage Allowance', description: 'Personal vehicle fuel rates per km', maxLimit: 15000, receiptRequired: false, taxApplicable: false, status: 'Active' },
  { id: 'cat-5', name: 'Internet & Broadband', description: 'Work from home internet connection bill', maxLimit: 2000, receiptRequired: false, taxApplicable: true, status: 'Active' },
  { id: 'cat-6', name: 'Mobile & Communication', description: 'Postpaid mobile bill and cellular data claims', maxLimit: 1500, receiptRequired: true, taxApplicable: true, status: 'Active' },
  { id: 'cat-7', name: 'Medical Claims', description: 'Annual health checkup and medicine bills', maxLimit: 15000, receiptRequired: true, taxApplicable: false, status: 'Active' },
  { id: 'cat-8', name: 'Office Supplies & Stationery', description: 'Home office desk items and stationery purchases', maxLimit: 3000, receiptRequired: true, taxApplicable: true, status: 'Active' },
  { id: 'cat-9', name: 'Training & Certifications', description: 'Professional skill upgradation courses and exams', maxLimit: 35000, receiptRequired: true, taxApplicable: true, status: 'Active' }
];

const defaultPolicies: ReimbursementPolicy[] = [
  {
    id: 'pol-1',
    name: 'Executive Travel Reimbursement',
    code: 'POL-EXEC-TRV',
    description: 'Travel and lodging policies for managers and above',
    type: 'Capped',
    categories: ['Travel & Local Conveyance', 'Hotel & Lodging', 'Meals & Client Entertainment'],
    eligibility: { departments: ['All'], designations: ['Manager', 'Director', 'VP', 'CEO'], locations: ['All'] },
    maxLimit: 100000,
    frequency: 'Monthly',
    receiptRequired: true,
    minAmountForReceipt: 500,
    workflow: ['Manager', 'HR', 'Finance'],
    effectiveDate: '2026-04-01',
    expiryDate: '2027-03-31',
    status: 'Active'
  },
  {
    id: 'pol-2',
    name: 'Remote Broadband Allowance',
    code: 'POL-WFH-NET',
    description: 'Fixed monthly reimbursement for home internet expenses',
    type: 'Fixed',
    categories: ['Internet & Broadband'],
    eligibility: { departments: ['All'], designations: ['All'], locations: ['All'] },
    maxLimit: 1500,
    frequency: 'Monthly',
    receiptRequired: false,
    minAmountForReceipt: 0,
    workflow: ['Manager', 'HR', 'Finance'],
    effectiveDate: '2026-01-01',
    expiryDate: '2026-12-31',
    status: 'Active'
  },
  {
    id: 'pol-3',
    name: 'Field Sales Mileage Plan',
    code: 'POL-SAL-MIL',
    description: 'Mileage payout for on-field customer engagements',
    type: 'Mileage',
    categories: ['Fuel & Mileage Allowance'],
    eligibility: { departments: ['Sales', 'Marketing'], designations: ['All'], locations: ['All'] },
    maxLimit: 15000,
    frequency: 'Monthly',
    receiptRequired: true,
    minAmountForReceipt: 200,
    workflow: ['Manager', 'HR', 'Finance'],
    effectiveDate: '2026-04-01',
    expiryDate: '2027-03-31',
    status: 'Active'
  }
];

const defaultClaims: EmployeeClaim[] = [
  {
    id: 'clm-1',
    claimNumber: 'CLM-2026-001',
    employeeId: 'EMP-002',
    employeeName: 'Vignesh K',
    department: 'Engineering',
    policyId: 'pol-2',
    policyName: 'Remote Broadband Allowance',
    submitDate: '2026-07-10',
    amount: 1500,
    currency: 'INR',
    status: 'Submitted',
    items: [
      { id: 'item-1', date: '2026-07-01', category: 'Internet & Broadband', amount: 1500, description: 'ACT Fibernet monthly broadband bill payment', receiptName: 'internet_broadband_bill.pdf' }
    ],
    comments: [
      { user: 'Vignesh K', role: 'Employee', comment: 'Submitting internet bill for July 2026.', date: '2026-07-10' }
    ],
    history: [
      { action: 'Created Draft', user: 'Vignesh K', role: 'Employee', date: '2026-07-10' },
      { action: 'Submitted Claim', user: 'Vignesh K', role: 'Employee', date: '2026-07-10', details: 'Awaiting manager approval' }
    ]
  },
  {
    id: 'clm-2',
    claimNumber: 'CLM-2026-002',
    employeeId: 'EMP-003',
    employeeName: 'Shalini Sharma',
    department: 'Sales',
    policyId: 'pol-3',
    policyName: 'Field Sales Mileage Plan',
    submitDate: '2026-07-11',
    amount: 3200,
    currency: 'INR',
    status: 'Pending Finance Approval',
    items: [
      { id: 'item-2', date: '2026-07-05', category: 'Fuel & Mileage Allowance', amount: 3200, description: 'Client meeting travel to TechPark, 160 kms overall.', receiptName: 'mileage_log.pdf' }
    ],
    comments: [
      { user: 'Shalini Sharma', role: 'Employee', comment: 'Added mileage calculation sheet for regional visits.', date: '2026-07-11' },
      { user: 'Amit Patel', role: 'Manager', comment: 'Travel verified and approved.', date: '2026-07-12' }
    ],
    history: [
      { action: 'Submitted Claim', user: 'Shalini Sharma', role: 'Employee', date: '2026-07-11' },
      { action: 'Manager Approved', user: 'Amit Patel', role: 'Manager', date: '2026-07-12', details: 'Sent to Finance for payment validation' }
    ]
  },
  {
    id: 'clm-3',
    claimNumber: 'CLM-2026-003',
    employeeId: 'EMP-004',
    employeeName: 'Rohan Mehta',
    department: 'Marketing',
    policyId: 'pol-1',
    policyName: 'Executive Travel Reimbursement',
    submitDate: '2026-07-05',
    amount: 14500,
    currency: 'INR',
    status: 'Paid',
    items: [
      { id: 'item-3', date: '2026-07-02', category: 'Travel & Local Conveyance', amount: 8500, description: 'primary Flight to Mumbai', receiptName: 'flight_ticket.pdf' },
      { id: 'item-4', date: '2026-07-03', category: 'Hotel & Lodging', amount: 6000, description: 'Taj Vivanta 1 Night Stay', receiptName: 'hotel_bill.pdf' }
    ],
    comments: [
      { user: 'Rohan Mehta', role: 'Employee', comment: 'Travel for Annual Partner Conference.', date: '2026-07-05' },
      { user: 'Finance Admin', role: 'Finance', comment: 'Verified receipts and flight PNR. Initiating bank payout.', date: '2026-07-08' }
    ],
    history: [
      { action: 'Submitted Claim', user: 'Rohan Mehta', role: 'Employee', date: '2026-07-05' },
      { action: 'Manager Approved', user: 'Preeti Deshmukh', role: 'Manager', date: '2026-07-06' },
      { action: 'Finance Verified & Approved', user: 'Finance Team', role: 'Finance', date: '2026-07-08' },
      { action: 'Marked as Paid', user: 'Finance Team', role: 'Finance', date: '2026-07-08', details: 'Ref: Bank Transfer #TXN93821039' }
    ],
    paymentDetails: {
      method: 'Bank Transfer',
      reference: 'TXN93821039',
      paidDate: '2026-07-08',
      month: 'July 2026'
    }
  }
];

const defaultSettings: ModuleSettings = {
  autoClaimNumberPrefix: 'CLM-2026-',
  financialYear: '2026-2027',
  claimWindowDays: 60,
  receiptSizeLimitMb: 10,
  allowedFileTypes: ['PDF', 'JPEG', 'PNG', 'DOCX'],
  defaultWorkflow: ['Manager', 'HR', 'Finance'],
  taxRulesGst: 18,
  defaultCurrency: 'INR',
  reimbursementFrequency: 'Monthly'
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
    newValue: 'Created Executive Travel Policy (POL-EXEC-TRV)'
  },
  {
    id: 'log-2',
    timestamp: '2026-07-15T10:15:00Z',
    user: 'Super Admin',
    role: 'SUPER_ADMIN',
    action: 'SETTINGS_UPDATED',
    module: 'Settings',
    entityId: 'global',
    previousValue: '18% GST default',
    newValue: '18% GST default, Claim window 60 days'
  }
];

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  badgeBgClass,
  badgeTextClass,
  badgeBorderClass
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (option: string) => {
    if (option === 'All') {
      onChange(['All']);
    } else {
      const next = selected.filter(x => x !== 'All');
      if (next.includes(option)) {
        const updated = next.filter(x => x !== option);
        onChange(updated.length === 0 ? ['All'] : updated);
      } else {
        onChange([...next, option]);
      }
    }
  };

  return (
    <div className="relative space-y-1 text-slate-700 dark:text-slate-300" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">{label}</label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50 transition text-sm flex justify-between items-center text-left"
      >
        <span className="truncate">
          {selected.includes('All') ? 'All' : `${selected.length} selected`}
        </span>
        <svg className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map(opt => {
            const isChecked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none transition"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleOption(opt)}
                  className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span className="truncate">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Selected Badges */}
      <div className="flex flex-wrap gap-1 min-h-[36px] p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
        {selected.map(item => (
          <span
            key={item}
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeBgClass} ${badgeTextClass} ${badgeBorderClass}`}
          >
            {item}
            {item !== 'All' && (
              <button
                type="button"
                onClick={() => {
                  const next = selected.filter(x => x !== item);
                  onChange(next.length === 0 ? ['All'] : next);
                }}
                className="hover:opacity-75 font-extrabold focus:outline-none ml-0.5"
              >
                &times;
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// CORE REIMBURSEMENT PAGE COMPONENT
// ==========================================

export function ReimbursementModule() {
  const { user } = useAuth();

  // Dynamic user role mapping
  const userRole = useMemo(() => {
    if (!user) return 'EMPLOYEE';
    let rawRole = Array.isArray(user?.role) ? (user?.role[0] || '') : (user?.role || '');
    if (typeof rawRole === 'object' && rawRole !== null) {
      rawRole = rawRole.name || rawRole.code || rawRole.id || '';
    }
    const role = rawRole.toString().toUpperCase().replace(/[\s_]+/g, '');
    if (role === 'SUPERADMIN' || role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (role === 'ADMIN') return 'ADMIN';
    if (role === 'HR') return 'HR';
    if (role === 'FINANCE') return 'FINANCE';
    if (role === 'MANAGER') return 'MANAGER';
    return 'EMPLOYEE';
  }, [user]);

  // Is Admin/SuperAdmin/Finance (who holds management permission)
  const isManagement = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'HR' || userRole === 'FINANCE';

  // State Management backed by Local Storage
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    const data = localStorage.getItem('reimb_categories');
    return data ? JSON.parse(data) : defaultCategories;
  });

  const [policies, setPolicies] = useState<ReimbursementPolicy[]>(() => {
    const data = localStorage.getItem('reimb_policies');
    return data ? JSON.parse(data) : defaultPolicies;
  });

  const [claims, setClaims] = useState<EmployeeClaim[]>(() => {
    const data = localStorage.getItem('reimb_claims');
    return data ? JSON.parse(data) : defaultClaims;
  });

  const [settings, setSettings] = useState<ModuleSettings>(() => {
    const data = localStorage.getItem('reimb_settings');
    return data ? JSON.parse(data) : defaultSettings;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const data = localStorage.getItem('reimb_audit_logs');
    return data ? JSON.parse(data) : defaultAuditLogs;
  });

  // Save states to local storage on change
  useEffect(() => {
    localStorage.setItem('reimb_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('reimb_policies', JSON.stringify(policies));
  }, [policies]);

  useEffect(() => {
    localStorage.setItem('reimb_claims', JSON.stringify(claims));
  }, [claims]);

  // Sync claims from backend DB (replaces stale localStorage status)
  const syncFromBackend = useCallback(async () => {
      try {
        const backendClaims = isManagement 
          ? await payrollService.getAllClaims() 
          : await payrollService.getMyClaims();
        if (!Array.isArray(backendClaims) || backendClaims.length === 0) return;

        setClaims(prevClaims => {
          const merged = [...prevClaims];
          for (const bc of backendClaims) {
            const backendStatusMap: Record<string, EmployeeClaim['status']> = {
              'Submitted': 'Submitted',
              'approved': 'Approved',
              'pending': 'Pending Manager Approval',
              'pending_hr': 'Pending HR Approval',
              'pending_finance': 'Pending Finance Approval',
              'waiting_payout': 'Waiting for Payout',
              'Rejected': 'Rejected',
              'Paid': 'Paid',
              'Cancelled': 'Cancelled',
            };
            const mappedStatus = backendStatusMap[bc.status] || bc.status as EmployeeClaim['status'];

            const existingIdx = merged.findIndex(c => c.dbId === bc.id);
            if (existingIdx >= 0) {
              const existingItem = merged[existingIdx].items[0];
              merged[existingIdx] = {
                ...merged[existingIdx],
                status: mappedStatus,
                dbId: bc.id,
                items: existingItem
                  ? [{
                      ...existingItem,
                      receiptUrl: resolveFileUrl(bc.proof_url) || existingItem.receiptUrl,
                      receiptName: bc.proof_url && !bc.proof_url.startsWith('data:')
                        ? (bc.proof_url.split('/').pop() || existingItem.receiptName || 'Receipt')
                        : existingItem.receiptName,
                    }]
                  : merged[existingIdx].items,
              };
            } else {
              const deptName = bc.user?.details?.department?.department_name || 'General';
              const firstName = bc.user?.details?.first_name || '';
              const lastName = bc.user?.details?.last_name || '';
              merged.push({
                id: `clm-db-${bc.id}`,
                dbId: bc.id,
                claimNumber: `CLM-${String(bc.id).padStart(4, '0')}`,
                employeeId: `EMP-${bc.user_id}`,
                employeeName: `${firstName} ${lastName}`.trim() || bc.user?.username || 'Unknown',
                department: deptName,
                policyId: '',
                policyName: bc.type || 'General',
                submitDate: bc.expense_date ? new Date(bc.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                amount: Number(bc.amount),
                currency: 'INR',
                status: mappedStatus,
                items: [{ id: `item-${bc.id}`, description: bc.description || '', category: bc.type || '', amount: Number(bc.amount), date: bc.expense_date ? new Date(bc.expense_date).toISOString().split('T')[0] : '', receiptUrl: resolveFileUrl(bc.proof_url) || undefined, receiptName: bc.proof_url && !bc.proof_url.startsWith('data:') ? (bc.proof_url.split('/').pop() || 'Receipt') : undefined }],
                comments: bc.remarks ? [{ user: 'System', role: 'Backend', comment: bc.remarks, date: new Date().toISOString().split('T')[0] }] : [],
                history: [{ action: 'Synced from Backend', user: 'System', role: 'Backend', date: new Date().toISOString().split('T')[0], details: `Status: ${bc.status}, Payment: ${bc.payment_status || 'N/A'}` }]
              });
            }
          }
          return merged;
        });
      } catch (err) {
        console.error('Failed to sync claims from backend:', err);
      }
  }, [isManagement]);

  useEffect(() => {
    syncFromBackend();
  }, [syncFromBackend]);

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-claims' | 'approval-inbox' | 'approved' | 'finance-processing' | 'policies' | 'categories' | 'reports' | 'settings'>(() => {
    if (userRole === 'EMPLOYEE') return 'my-claims';
    if (userRole === 'MANAGER' || userRole === 'HR') return 'approval-inbox';
    if (userRole === 'FINANCE') return 'finance-processing';
    return 'dashboard';
  });

  // Re-sync from backend whenever an approval/payout view is opened so claims
  // approved by another user (e.g. a manager) show up without a full reload.
  useEffect(() => {
    if (activeTab === 'my-claims' || activeTab === 'approval-inbox' || activeTab === 'approved' || activeTab === 'finance-processing' || activeTab === 'dashboard') {
      syncFromBackend();
    }
  }, [activeTab, syncFromBackend]);

  useEffect(() => {
    localStorage.setItem('reimb_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('reimb_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // UI state controllers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [batchMasterUtr, setBatchMasterUtr] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showClaimFilters, setShowClaimFilters] = useState(false);
  
  // Claim view/create state controllers
  const [viewingClaim, setViewingClaim] = useState<EmployeeClaim | null>(null);

  // Claims an Admin/Super Admin has already acted on — "act once per claim".
  // Persisted per user so approved/reviewed claims stay out of their inbox across reloads.
  const [adminActionedClaims, setAdminActionedClaims] = useState<Set<string>>(() => {
    const stored = user ? localStorage.getItem(`reimb_admin_actioned_${user.id}`) : null;
    return new Set(stored ? JSON.parse(stored) : []);
  });

  // Load/persist the per-user set of claims an admin has already acted on
  useEffect(() => {
    if (!user) return;
    const key = `reimb_admin_actioned_${user.id}`;
    const stored = localStorage.getItem(key);
    setAdminActionedClaims(new Set(stored ? JSON.parse(stored) : []));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`reimb_admin_actioned_${user.id}`, JSON.stringify([...adminActionedClaims]));
  }, [adminActionedClaims, user?.id]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<ClaimItem | null>(null);
  const [deletePolicyTarget, setDeletePolicyTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{ id: string; name: string } | null>(null);
  const [showCancelClaimConfirm, setShowCancelClaimConfirm] = useState(false);
  const [showCancelPolicyConfirm, setShowCancelPolicyConfirm] = useState(false);
  const [showCancelCategoryConfirm, setShowCancelCategoryConfirm] = useState(false);
  const isResubmitting = editingClaimId !== null && (claims.find(c => c.id === editingClaimId)?.status === 'Re-submission Required');

  useEffect(() => {
    if (!isCreateModalOpen) {
      setEligibilityError([]);
    }
  }, [isCreateModalOpen]);

  // New Claim Form State
  const [newClaim, setNewClaim] = useState({
    policyId: '',
    category: '',
    comments: '',
    items: [] as Omit<ClaimItem, 'id'>[]
  });
  const [newItem, setNewItem] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    description: '',
    gstNumber: '',
    receiptName: '',
    receiptUrl: ''
  });

  // New Policy Form State
  const [newPolicy, setNewPolicy] = useState<Omit<ReimbursementPolicy, 'id'>>({
    name: '',
    code: '',
    description: '',
    type: 'Actual',
    categories: [],
    eligibility: { departments: ['All'], designations: ['All'], locations: ['All'] },
    maxLimit: 10000,
    frequency: 'Monthly',
    receiptRequired: true,
    minAmountForReceipt: 0,
    workflow: ['Manager', 'HR', 'Finance'],
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    status: 'Active'
  });

  // New Category Form State
  const [newCategory, setNewCategory] = useState<Omit<ExpenseCategory, 'id'>>({
    name: '',
    description: '',
    maxLimit: 10000,
    receiptRequired: true,
    taxApplicable: false,
    status: 'Active'
  });

  // Finance payment modal state
  const [paymentForm, setPaymentForm] = useState({
    claimId: '',
    method: 'Bank Transfer' as 'Payroll' | 'Bank Transfer' | 'Cash' | 'UPI' | 'Other',
    reference: '',
    integrateWithPayroll: false
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string[]>([]);

  // State options for eligibility criteria dropdowns
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableDesignations, setAvailableDesignations] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  useEffect(() => {
    const fetchCriteriaOptions = async () => {
      try {
        const { getDepartments } = await import('@/features/organization/services/departments');
        const { getDesignations } = await import('@/features/organization/services/designations');
        const { getOrganizations } = await import('@/features/organization/services/organizations');

        const [depts, desigs, orgs] = await Promise.all([
          getDepartments().catch(() => []),
          getDesignations().catch(() => []),
          getOrganizations().catch(() => [])
        ]);

        const deptNames = Array.isArray(depts) ? depts.map((d: any) => d.department_name) : [];
        setAvailableDepartments(['All', ...deptNames]);

        const desigNames = Array.isArray(desigs) ? desigs.map((d: any) => d.designation_name) : [];
        setAvailableDesignations(['All', ...desigNames]);

        const normalizedOrgs = Array.isArray(orgs) ? orgs : (orgs ? [orgs] : []);
        const locNames: string[] = [];
        normalizedOrgs.forEach((org: any) => {
          const branches = org.branches || org.branch || [];
          if (Array.isArray(branches)) {
            branches.forEach((b: any) => {
              if (b.branch_name || b.location_name) {
                locNames.push(b.branch_name || b.location_name);
              }
            });
          }
        });
        setAvailableLocations(['All', ...locNames]);
      } catch (error) {
        console.error("Failed to load criteria options:", error);
        setAvailableDepartments(['All', 'Engineering', 'Sales', 'Marketing', 'Corporate', 'HR', 'Finance']);
        setAvailableDesignations(['All', 'Manager', 'Developer', 'Director', 'VP', 'CEO', 'Employee']);
        setAvailableLocations(['All', 'Bangalore', 'Mumbai', 'Delhi', 'New York', 'London']);
      }
    };

    fetchCriteriaOptions();
  }, []);

  // ==========================================
  // HELPER FUNCTIONS & WORKFLOW ACTIONS
  // ==========================================

  const checkEligibility = (policy: ReimbursementPolicy) => {
    if (!user) return { eligible: true, reasons: [] };

    const reasons: string[] = [];
    
    // 1. Department match
    const userDept = user.departmentId || 'Engineering';
    const deptEligible = policy.eligibility.departments.includes('All') || 
                         policy.eligibility.departments.some(d => d.toLowerCase() === userDept.toLowerCase());
    if (!deptEligible) {
      reasons.push(`Your department (${userDept}) is not eligible under this policy (requires: ${policy.eligibility.departments.join(', ')}).`);
    }

    // 2. Designation match
    const userDesig = user.position || 'Developer';
    const desigEligible = policy.eligibility.designations.includes('All') || 
                          policy.eligibility.designations.some(d => d.toLowerCase() === userDesig.toLowerCase());
    if (!desigEligible) {
      reasons.push(`Your designation (${userDesig}) is not eligible under this policy (requires: ${policy.eligibility.designations.join(', ')}).`);
    }

    // 3. Location match
    const userLoc = user.country || 'All';
    const locEligible = policy.eligibility.locations.includes('All') || 
                        policy.eligibility.locations.some(l => l.toLowerCase() === userLoc.toLowerCase());
    if (!locEligible) {
      reasons.push(`Your location (${userLoc}) is not eligible under this policy (requires: ${policy.eligibility.locations.join(', ')}).`);
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  };

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
    setAuditLogs(prevLogs => [newLog, ...prevLogs]);
    
    // Also push to the global backend audit log
    auditService.logAudit({
      module: 'REIMBURSEMENT', // Use a distinct module name for the global log
      action,
      entityId,
      previousValue: prev,
      newValue: next
    }).catch(console.error);
  };

  // Filtered claims based on tab, role, and search queries
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      // 1. Role Gating & Context Filtering
      if (activeTab === 'my-claims') {
        // Employee sees only their own claims
        if (c.employeeId !== (user?.employeeId || 'EMP-002')) return false;
      } else if (activeTab === 'approval-inbox') {
        // Don't show employee's own claim in their own inbox
        if (c.employeeId === user?.employeeId) return false;
        // Admin/Super Admin act once per claim: claims they've already approved/reviewed leave their inbox
        if ((userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && adminActionedClaims.has(c.id)) return false;
        // When user picks a specific status, show matching claims regardless of role
        if (statusFilter !== 'All') {
          // fall through to the status filter at line 755
        } else {
          // Default view: role-based filtering — each role only sees claims at their approval stage.
          // ADMIN/SUPER_ADMIN receive notifications at every stage, so they review any open claim.
          if (userRole === 'MANAGER') {
            if (c.status !== 'Submitted' && c.status !== 'Pending Manager Approval' && c.status !== 'Resubmitted') return false;
          } else if (userRole === 'HR') {
            if (c.status !== 'Pending HR Approval') return false;
          } else if (userRole === 'FINANCE') {
            if (c.status !== 'Pending Finance Approval') return false;
          }
        }
      } else if (activeTab === 'approved') {
        // Approved Reimbursements: fully approved / paid claims visible to all approvers
        if (c.status !== 'Approved' && c.status !== 'Paid') return false;
      } else if (activeTab === 'finance-processing') {
        // Finance sees claims in Pending Finance Approval, Approved, or Paid by default
        if (statusFilter === 'All') {
          if (c.status !== 'Pending Finance Approval' && c.status !== 'Waiting for Payout' && c.status !== 'Approved' && c.status !== 'Paid' && c.status !== 'Processing Payout' && c.status !== 'Pending Payroll') return false;
        }
      }

      // 2. Filter Inputs
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && !c.items.some(item => item.category === categoryFilter)) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          c.claimNumber.toLowerCase().includes(query) ||
          c.employeeName.toLowerCase().includes(query) ||
          c.department.toLowerCase().includes(query) ||
          c.policyName.toLowerCase().includes(query) ||
          c.items.some(item => item.description.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [claims, activeTab, statusFilter, categoryFilter, searchQuery, user, userRole, adminActionedClaims]);

  // Batch Payout Logic
  const handleSelectAllClaims = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pendingFinanceClaims = filteredClaims.filter(c => c.status === 'Pending Finance Approval' || c.status === 'Processing Payout').map(c => c.id);
      setSelectedClaims(pendingFinanceClaims);
    } else {
      setSelectedClaims([]);
    }
  };

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaims(prev => 
      prev.includes(claimId) ? prev.filter(id => id !== claimId) : [...prev, claimId]
    );
  };

  const generatePayoutBatch = async () => {
    if (selectedClaims.length === 0) return;

    // Sync with backend - mark claims as Bank Transfer mode
    try {
      const claimDbIds = claims.filter(c => selectedClaims.includes(c.id) && c.dbId).map(c => c.dbId!);
      if (claimDbIds.length > 0) await payrollService.batchUpdateClaimPaymentMode(claimDbIds, 'Bank Transfer');
    } catch (err) {
      console.error('Backend batch sync failed:', err);
    }
    
    toast.success(`Generated Bank Advice CSV for ${selectedClaims.length} claims. Initiating download...`);
    
    setClaims(prevClaims => 
      prevClaims.map(c => {
        if (selectedClaims.includes(c.id)) {
          writeAuditLog('BATCH_PAYOUT_CREATED', 'Finance Processing', c.id, c.status, 'Processing Payout');
          return {
            ...c,
            status: 'Processing Payout' as const,
            history: [
              ...c.history,
              { action: 'Added to Payout Batch', user: user?.name || 'Finance Admin', role: 'Finance', date: new Date().toISOString().split('T')[0], details: 'Bank CSV Generated' }
            ]
          };
        }
        return c;
      })
    );
    setSelectedClaims([]);
  };

  const sendBatchToPayroll = async () => {
    if (selectedClaims.length === 0) return;

    // Sync with backend
    try {
      const claimDbIds = claims.filter(c => selectedClaims.includes(c.id) && c.dbId).map(c => c.dbId!);
      if (claimDbIds.length > 0) await payrollService.batchUpdateClaimPaymentMode(claimDbIds, 'Salary Payroll');
    } catch (err) {
      console.error('Backend batch sync failed:', err);
    }
    
    toast.success(`Sent ${selectedClaims.length} claims to Payroll system for next cycle processing.`);
    
    setClaims(prevClaims => 
      prevClaims.map(c => {
        if (selectedClaims.includes(c.id)) {
          writeAuditLog('SENT_TO_PAYROLL', 'Finance Processing', c.id, c.status, 'Pending Payroll');
          return {
            ...c,
            status: 'Pending Payroll' as const,
            history: [
              ...c.history,
              { action: 'Sent to Payroll', user: user?.name || 'Finance Admin', role: 'Finance', date: new Date().toISOString().split('T')[0], details: 'Tagged for next salary cycle' }
            ]
          };
        }
        return c;
      })
    );
    setSelectedClaims([]);
  };

  const processBatchPayment = async () => {
    if (!batchMasterUtr.trim()) {
      toast.error('Please enter the Master UTR from the bank return file.');
      return;
    }

    if (selectedClaims.length === 0) {
       toast.error('Select claims in "Processing Payout" status to mark as paid.');
       return;
    }

    // Sync with backend — batch reconciliation is always a direct bank payout,
    // so it marks claims as Paid (never routes them to payroll).
    const claimDbIds = claims.filter(c => selectedClaims.includes(c.id) && c.dbId).map(c => c.dbId!);
    const missingBackend = selectedClaims.filter(id => {
      const c = claims.find(x => x.id === id);
      return !c?.dbId;
    });
    if (missingBackend.length > 0) {
      toast.error('Some selected claims are not linked to the backend. Cannot record payment.');
      return;
    }
    try {
      if (claimDbIds.length > 0) await payrollService.batchProcessPayment(claimDbIds, batchMasterUtr, 'Bank Transfer');
    } catch (err) {
      console.error('Backend batch payment sync failed:', err);
      toast.error('Failed to record batch payment in backend. Please try again.');
      return;
    }

    setClaims(prevClaims => 
      prevClaims.map(c => {
        if (selectedClaims.includes(c.id) && c.status === 'Processing Payout') {
          writeAuditLog('CLAIM_PAID', 'Finance Processing', c.id, c.status, 'Paid');
          return {
            ...c,
            status: 'Paid' as const,
            paymentDetails: {
              method: 'Bank Transfer',
              reference: batchMasterUtr,
              paidDate: new Date().toISOString().split('T')[0]
            },
            history: [
              ...c.history,
              { action: 'Payment Completed', user: user?.name || 'Finance Admin', role: 'Finance', date: new Date().toISOString().split('T')[0], details: `Batch Paid. Master UTR: ${batchMasterUtr}` }
            ]
          };
        }
        return c;
      })
    );
    toast.success('Batch payment reconciliation completed!');
    setIsBatchModalOpen(false);
    setBatchMasterUtr('');
    setSelectedClaims([]);
  };

  // Handle new claim creation
  const handleAddClaimItem = () => {
    if (!newClaim.category) {
      toast.error('Please select an Expense Category at the top first');
      return;
    }
    
    if (newClaim.policyId) {
      const matchedPolicy = policies.find(p => p.id === newClaim.policyId);
      if (matchedPolicy) {
        const eligibility = checkEligibility(matchedPolicy);
        if (!eligibility.eligible) {
          toast.error('Ineligible: Cannot add items under this restricted policy');
          return;
        }
      }
    } else {
      toast.error('No policy found covering this category. Items cannot be added.');
      return;
    }

    if (!newItem.amount || !newItem.description) {
      toast.error('Please enter amount and description for the expense line');
      return;
    }
    const amt = parseFloat(newItem.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Amount must be a valid positive number');
      return;
    }

    setNewClaim(prev => ({
      ...prev,
      items: [...prev.items, {
        date: newItem.date,
        category: prev.category,
        amount: amt,
        description: newItem.description,
        gstNumber: newItem.gstNumber || undefined,
        receiptName: newItem.receiptName || undefined,
        receiptUrl: newItem.receiptUrl || undefined
      }]
    }));

    // Reset item input
    setNewItem({
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: '',
      description: '',
      gstNumber: '',
      receiptName: '',
      receiptUrl: ''
    });
    toast.success('Expense item added to list');
    writeAuditLog('CLAIM_ITEM_ADDED', 'Claims', 'Draft', '', `Added expense item: ${newItem.description} for ₹${amt}`);
  };

  const handleRemoveClaimItem = (idx: number) => {
    const itemToRemove = newClaim.items[idx];
    setNewClaim(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
    writeAuditLog('CLAIM_ITEM_REMOVED', 'Claims', 'Draft', '', `Removed expense item: ${itemToRemove.description} for ₹${itemToRemove.amount}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, receiptName: file.name, receiptUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
      toast.success(`Attached receipt: ${file.name}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, receiptName: file.name, receiptUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
      toast.success(`Attached receipt: ${file.name}`);
    }
  };

  const openNewClaimForm = () => {
    setNewClaim({
      policyId: '',
      category: '',
      comments: '',
      items: []
    });
    setEditingClaimId(null);
    setEditingItemIdx(null);
    setIsAddingNewItem(false);
    setIsCreateModalOpen(true);
  };

  const handleClaimClick = (claim: EmployeeClaim) => {
    setEditingClaimId(claim.id);
    setNewClaim({
      policyId: claim.policyId,
      category: claim.items[0]?.category || '',
      comments: '',
      items: claim.items.map(item => ({
        date: item.date,
        category: item.category || claim.items[0]?.category || '',
        amount: item.amount,
        description: item.description,
        gstNumber: item.gstNumber || '',
        receiptName: item.receiptName || '',
        receiptUrl: item.receiptUrl || ''
      }))
    });
    setEditingItemIdx(null);
    setIsAddingNewItem(false);
    setIsCreateModalOpen(true);
  };

  const handleEditClaimItem = (idx: number) => {
    const item = newClaim.items[idx];
    setEditingItemIdx(idx);
    setNewItem({
      date: item.date,
      category: item.category || '',
      amount: String(item.amount),
      description: item.description,
      gstNumber: item.gstNumber || '',
      receiptName: item.receiptName || '',
      receiptUrl: item.receiptUrl || ''
    });
  };

  const handleCancelEditItem = () => {
    setEditingItemIdx(null);
    setNewItem({
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: '',
      description: '',
      gstNumber: '',
      receiptName: '',
      receiptUrl: ''
    });
  };

  const handleSaveClaimItem = () => {
    if (!newItem.amount || isNaN(Number(newItem.amount)) || Number(newItem.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!newItem.date) {
      toast.error('Please enter a valid date');
      return;
    }
    setNewClaim(prev => {
      const updatedItems = [...prev.items];
      if (editingItemIdx !== null && editingItemIdx >= 0) {
        updatedItems[editingItemIdx] = {
          date: newItem.date,
          category: newItem.category || prev.category || '',
          amount: Number(newItem.amount),
          description: newItem.description,
          gstNumber: newItem.gstNumber,
          receiptName: newItem.receiptName,
          receiptUrl: newItem.receiptUrl
        };
      }
      return { ...prev, items: updatedItems };
    });
    setEditingItemIdx(null);
    setNewItem({
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: '',
      description: '',
      gstNumber: '',
      receiptName: '',
      receiptUrl: ''
    });
    toast.success('Line item updated successfully');
    writeAuditLog('CLAIM_ITEM_UPDATED', 'Claims', 'Draft', '', `Updated expense item: ${newItem.description} for ₹${newItem.amount}`);
  };

  const submitClaim = async (isDraft: boolean) => {
    if (!newClaim.policyId) {
      toast.error('Please select a reimbursement policy');
      return;
    }
    
    const selectedPolicy = policies.find(p => p.id === newClaim.policyId);
    if (selectedPolicy) {
      const eligibility = checkEligibility(selectedPolicy);
      if (!eligibility.eligible) {
        toast.error('Submission blocked: You do not meet the eligibility criteria for this category/policy.');
        return;
      }
    }

    if (newClaim.items.length === 0) {
      toast.error('Please add at least one expense item');
      return;
    }

    const totalAmount = newClaim.items.reduce((sum, item) => sum + item.amount, 0);

    // Policy limit checks
    if (selectedPolicy && totalAmount > selectedPolicy.maxLimit) {
      toast.warning(`Total amount exceeds this policy's limit of ₹${selectedPolicy.maxLimit.toLocaleString()}`);
    }

    const activeClaim = editingClaimId ? claims.find(c => c.id === editingClaimId) : null;
    const claimNo = activeClaim ? activeClaim.claimNumber : `${settings.autoClaimNumberPrefix}${String(claims.length + 1).padStart(3, '0')}`;

    if (editingClaimId) {
      setClaims(prevClaims =>
        prevClaims.map(c => {
          if (c.id === editingClaimId) {
            const updatedHistory = [
              ...c.history,
              {
                action: isDraft ? 'Updated Draft' : 'Resubmitted Claim',
                user: user?.name || 'User',
                role: 'Employee',
                date: new Date().toISOString().split('T')[0],
                details: isDraft ? 'Saved draft claim details' : 'Resubmitted for review and approval workflow'
              }
            ];
            const updatedComments = newClaim.comments.trim() ? [
              ...(c.comments || []),
              { user: user?.name || 'User', role: 'Employee', comment: newClaim.comments, date: new Date().toISOString().split('T')[0] }
            ] : (c.comments || []);
            
            const wasResubmission = c.status === 'Re-submission Required' || c.history.some(h => h.action === 'Sent Back to Employee');
            const nextStatus = isDraft ? 'Draft' : (wasResubmission ? 'Resubmitted' : 'Submitted');
            
            return {
              ...c,
              policyId: newClaim.policyId,
              policyName: selectedPolicy?.name || c.policyName,
              amount: totalAmount,
              status: nextStatus as any,
              items: newClaim.items.map((item, index) => ({
                ...item,
                id: (item as any).id || `item-${Date.now()}-${index}`
              })),
              comments: updatedComments,
              history: updatedHistory
            };
          }
          return c;
        })
      );
      writeAuditLog(
        isDraft ? 'CLAIM_DRAFT_UPDATED' : 'CLAIM_RESUBMITTED',
        'Claims',
        editingClaimId,
        '',
        `Resubmitted claim ${claimNo} for ₹${totalAmount}`
      );
    } else {
      const claim: EmployeeClaim = {
        id: `clm-${Date.now()}`,
        claimNumber: claimNo,
        employeeId: user?.employeeId || 'EMP-002',
        employeeName: user?.name || 'Vignesh K',
        department: user?.departmentId ? 'Engineering' : 'Corporate',
        policyId: newClaim.policyId,
        policyName: selectedPolicy?.name || 'Custom Policy',
        submitDate: new Date().toISOString().split('T')[0],
        amount: totalAmount,
        currency: settings.defaultCurrency,
        status: isDraft ? 'Draft' : 'Submitted',
        items: newClaim.items.map((item, index) => ({
          ...item,
          id: `item-${Date.now()}-${index}`
        })),
        comments: newClaim.comments.trim() ? [
          { user: user?.name || 'User', role: 'Employee', comment: newClaim.comments, date: new Date().toISOString().split('T')[0] }
        ] : [],
        history: [
          {
            action: isDraft ? 'Created Draft' : 'Submitted Claim',
            user: user?.name || 'User',
            role: 'Employee',
            date: new Date().toISOString().split('T')[0],
            details: isDraft ? 'Saved draft claim details' : 'Submitted for review and approval workflow'
          }
        ]
      };

      setClaims(prev => [claim, ...prev]);
      writeAuditLog(
        'CLAIM_SUBMITTED',
        'Claims',
        claim.id,
        '',
        `Created claim ${claimNo} for ₹${totalAmount}`
      );
      // Sync to backend
      try {
        let proofUrl: string | undefined;
        const receiptItem = newClaim.items.find((i: any) => i.receiptUrl);
        if (receiptItem?.receiptUrl && receiptItem.receiptUrl.startsWith('data:')) {
          try {
            const uploadRes = await payrollService.uploadFile(dataUrlToFile(receiptItem.receiptUrl, receiptItem.receiptName || 'receipt'));
            if (uploadRes?.success && uploadRes.url) proofUrl = uploadRes.url;
          } catch (uploadErr) {
            console.error('Receipt upload failed:', uploadErr);
          }
        }
        const backendClaim = await payrollService.submitClaim({
          type: selectedPolicy?.name || newClaim.category || 'General',
          amount: totalAmount,
          description: newClaim.items.map((i: any) => i.description).filter(Boolean).join('; ') || claimNo,
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          proofUrl,
        });
        if (backendClaim?.id) {
          setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, dbId: backendClaim.id } : c));
        }
      } catch (err: any) {
        console.error('Backend claim sync failed:', err?.response?.data || err?.message || err);
      }
    }

    // Reset Form
    setNewClaim({ policyId: '', category: '', comments: '', items: [] });
    setEditingClaimId(null);
    setEditingItemIdx(null);
    setIsAddingNewItem(false);
    setIsCreateModalOpen(false);
    if (editingClaimId) {
      toast.success(isDraft ? 'Claim saved as Draft successfully' : 'Claim resubmitted successfully! Notification sent to supervisor.');
    } else {
      toast.success(isDraft ? 'Claim saved as Draft successfully' : 'Claim submitted successfully! Notification sent to supervisor.');
    }
  };

  // Submit a previously saved draft claim
  const submitDraftClaim = (claimId: string) => {
    setClaims(prevClaims =>
      prevClaims.map(c => {
        if (c.id === claimId) {
          const updatedHistory = [
            ...c.history,
            { action: 'Submitted Claim', user: user?.name || 'User', role: 'Employee', date: new Date().toISOString().split('T')[0], details: 'Awaiting manager approval' }
          ];
          writeAuditLog('CLAIM_SUBMITTED', 'Claims', c.id, 'Draft', 'Submitted');
          return { ...c, status: 'Submitted' as const, history: updatedHistory };
        }
        return c;
      })
    );
    toast.success('Draft claim submitted successfully!');
    if (viewingClaim?.id === claimId) {
      setViewingClaim(prev => prev ? { ...prev, status: 'Submitted', history: [...prev.history, { action: 'Submitted Claim', user: user?.name || 'User', role: 'Employee', date: new Date().toISOString().split('T')[0] }] } : null);
    }
  };

  // Cancel a claim before it gets processed
  const cancelClaim = (claimId: string) => {
    setClaims(prevClaims =>
      prevClaims.map(c => {
        if (c.id === claimId) {
          const updatedHistory = [
            ...c.history,
            { action: 'Cancelled Claim', user: user?.name || 'User', role: 'Employee', date: new Date().toISOString().split('T')[0], details: 'Claim cancelled by user' }
          ];
          writeAuditLog('CLAIM_CANCELLED', 'Claims', c.id, c.status, 'Cancelled');
          return { ...c, status: 'Cancelled' as const, history: updatedHistory };
        }
        return c;
      })
    );
    toast.success('Claim cancelled successfully');
    if (viewingClaim?.id === claimId) {
      setViewingClaim(prev => prev ? { ...prev, status: 'Cancelled', history: [...prev.history, { action: 'Cancelled Claim', user: user?.name || 'User', role: 'Employee', date: new Date().toISOString().split('T')[0] }] } : null);
    }
  };

  const handleDeleteDraft = async (claimId: string) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    if (claim.dbId) {
      try {
        await payrollService.deleteClaim(claim.dbId);
      } catch (err) {
        console.error('Failed to delete claim from backend:', err);
      }
    }

    setClaims(prev => prev.filter(c => c.id !== claimId));
    toast.success('Draft claim deleted successfully');
    writeAuditLog('CLAIM_DELETED', 'Claims', claimId, 'Draft', 'Deleted draft claim');
    
    if (viewingClaim?.id === claimId) {
      setViewingClaim(null);
    }
  };

  // Approve Claim Action
  // Admin/Super Admin act once per claim: once they approve/review a claim, it leaves their inbox
  const markAdminActioned = (claimId: string) => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      setAdminActionedClaims(prev => new Set(prev).add(claimId));
    }
  };

  const approveClaim = async (claimId: string, approvalComment: string) => {
    // Map frontend status to backend status
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    const policy = policies.find(p => p.id === claim.policyId);
    const workflowSteps = policy?.workflow || ['Manager', 'HR', 'Finance'];

    let backendStatus = 'approved';
    if (claim.status === 'Submitted' || claim.status === 'Pending Manager Approval') {
      if (workflowSteps.includes('HR')) {
        backendStatus = 'pending_hr';
      } else if (workflowSteps.includes('Finance')) {
        backendStatus = 'pending_finance';
      }
    } else if (claim.status === 'Pending HR Approval') {
      if (workflowSteps.includes('Finance')) {
        backendStatus = 'pending_finance';
      }
    } else if (claim.status === 'Pending Finance Approval') {
      backendStatus = 'waiting_payout';
    }

    if (claim.dbId) {
      try {
        await payrollService.updateClaimStatus(claim.dbId, backendStatus, approvalComment);
      } catch (err) {
        console.error('Backend sync failed:', err);
      }
    }

    setClaims(prevClaims =>
      prevClaims.map(c => {
        if (c.id === claimId) {
          const policy = policies.find(p => p.id === c.policyId);
          const workflowSteps = policy?.workflow || ['Manager', 'HR', 'Finance'];
          const roleLabelMap: Record<string, string> = {
            'MANAGER': 'Manager Approved',
            'HR': 'HR Approved',
            'FINANCE': 'Finance Approved',
            'ADMIN': 'Admin Approved',
            'SUPER_ADMIN': 'Admin Approved',
          };
          const actionLabel = roleLabelMap[userRole] || 'Approved';

          let nextStatus: EmployeeClaim['status'] = 'Approved';
          if (c.status === 'Submitted' || c.status === 'Pending Manager Approval') {
            if (workflowSteps.includes('HR')) {
              nextStatus = 'Pending HR Approval';
            } else if (workflowSteps.includes('Finance')) {
              nextStatus = 'Pending Finance Approval';
            } else {
              nextStatus = 'Approved';
            }
          } else if (c.status === 'Pending HR Approval') {
            if (workflowSteps.includes('Finance')) {
              nextStatus = 'Pending Finance Approval';
            } else {
              nextStatus = 'Approved';
            }
          } else if (c.status === 'Pending Finance Approval') {
            nextStatus = 'Waiting for Payout';
          }

          const comments = approvalComment.trim() ? [
            ...c.comments,
            { user: user?.name || 'Approver', role: userRole, comment: approvalComment, date: new Date().toISOString().split('T')[0] }
          ] : c.comments;

          const updatedHistory = [
            ...c.history,
            { action: actionLabel, user: user?.name || 'Approver', role: userRole, date: new Date().toISOString().split('T')[0], details: `Status updated to ${nextStatus}` }
          ];

          writeAuditLog('CLAIM_APPROVED', 'Approval Flow', c.id, c.status, nextStatus);
          return { ...c, status: nextStatus, comments, history: updatedHistory };
        }
        return c;
      })
    );
    markAdminActioned(claimId);
    toast.success('Claim approved successfully!');
    setViewingClaim(null);
  };

  const [rejectClaimTarget, setRejectClaimTarget] = useState<{ id: string; title: string } | null>(null);

  // Reject Claim Action
  const rejectClaim = async (claimId: string, rejectionComment: string) => {
    if (!rejectionComment.trim()) {
      toast.error('Rejection comment is required to send back or reject a claim.');
      return;
    }

    const claim = claims.find(c => c.id === claimId);
    if (claim?.dbId) {
      try {
        await payrollService.updateClaimStatus(claim.dbId, 'rejected', rejectionComment);
      } catch (err) {
        console.error('Backend sync failed:', err);
      }
    }

    setClaims(prevClaims =>
      prevClaims.map(c => {
        if (c.id === claimId) {
          const comments = [
            ...c.comments,
            { user: user?.name || 'Approver', role: userRole, comment: rejectionComment, date: new Date().toISOString().split('T')[0] }
          ];
          const updatedHistory = [
            ...c.history,
            { action: 'Claim Rejected', user: user?.name || 'Approver', role: userRole, date: new Date().toISOString().split('T')[0], details: `Claim rejected by ${userRole}` }
          ];

          writeAuditLog('CLAIM_REJECTED', 'Approval Flow', c.id, c.status, 'Rejected');
          return { ...c, status: 'Rejected' as const, comments, history: updatedHistory };
        }
        return c;
      })
    );
    markAdminActioned(claimId);
    toast.success('Claim rejected successfully');
    setViewingClaim(null);
  };

  // Send Back to Employee
  const sendBackClaim = async (claimId: string, comment: string) => {
    if (!comment.trim()) {
      toast.error('Please enter a comment explaining why this claim is being sent back.');
      return;
    }

    const claim = claims.find(c => c.id === claimId);
    if (claim?.dbId) {
      try {
        await payrollService.updateClaimStatus(claim.dbId, 'pending', comment);
      } catch (err) {
        console.error('Backend sync failed:', err);
      }
    }

    setClaims(prevClaims =>
      prevClaims.map(c => {
        if (c.id === claimId) {
          const comments = [
            ...c.comments,
            { user: user?.name || 'Approver', role: userRole, comment, date: new Date().toISOString().split('T')[0] }
          ];
          const updatedHistory = [
            ...c.history,
            { action: 'Sent Back to Employee', user: user?.name || 'Approver', role: userRole, date: new Date().toISOString().split('T')[0], details: 'Requested changes or missing receipts' }
          ];

          writeAuditLog('CLAIM_SENT_BACK', 'Approval Flow', c.id, c.status, 'Re-submission Required');
          return { ...c, status: 'Re-submission Required', comments, history: updatedHistory };
        }
        return c;
      })
    );
    markAdminActioned(claimId);
    toast.success('Claim sent back to employee for editing. Notification sent to employee.');
    setViewingClaim(null);
  };

  // Mark Payment Details by Finance
  // Two pathways:
  //   1. Payroll Integration: status -> 'Pending Payroll' (payroll engine picks it up in next salary run)
  //   2. Direct Payout (Bank/UPI/Cash): status -> 'Paid' immediately
  const processClaimPayment = async () => {
    // Route is decided by the selected payout method only
    // (Payroll Integration vs Direct Payout), so the finance view can't
    // diverge from what is actually saved in the backend.
    const isPayrollRoute = paymentForm.method === 'Payroll';

    // Direct payout requires a UTR/reference; payroll route auto-generates one later
    if (!isPayrollRoute && !paymentForm.reference.trim()) {
      toast.error('Please enter a payment transaction reference number');
      return;
    }

    // Sync with backend
    const payingClaim = claims.find(c => c.id === paymentForm.claimId);
    if (payingClaim?.dbId) {
      try {
        if (isPayrollRoute) {
          await payrollService.updateClaimPaymentMode(payingClaim.dbId, 'Salary Payroll');
        } else {
          await payrollService.processClaimPayment(payingClaim.dbId, {
            payment_reference: paymentForm.reference,
            payment_date: new Date().toISOString().split('T')[0],
            payment_mode: paymentForm.method
          });
        }
      } catch (err) {
        console.error('Backend sync failed:', err);
        setIsPaymentModalOpen(false);
        toast.error(isPayrollRoute
          ? 'Failed to send claim to payroll. Please try again.'
          : 'Failed to record payment in backend. Please try again.');
        return;
      }
    } else {
      toast.error('This claim is not linked to the backend. Cannot record payment.');
      return;
    }

    const nextStatus: EmployeeClaim['status'] = isPayrollRoute ? 'Pending Payroll' : 'Paid';
    const actionLabel = isPayrollRoute ? 'Sent to Payroll' : 'Payment Completed';
    const detailsText = isPayrollRoute
      ? `Tagged for payroll disbursement in ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} salary cycle`
      : `Paid via ${paymentForm.method}. Ref: ${paymentForm.reference}`;

    setClaims(prevClaims =>
      prevClaims.map(c => {
        if (c.id === paymentForm.claimId) {
          const updatedHistory = [
            ...c.history,
            { action: actionLabel, user: user?.name || 'Finance Admin', role: 'Finance', date: new Date().toISOString().split('T')[0], details: detailsText }
          ];

          writeAuditLog(isPayrollRoute ? 'CLAIM_SENT_TO_PAYROLL' : 'CLAIM_PAID', 'Finance Processing', c.id, c.status, nextStatus);
          return {
            ...c,
            status: nextStatus,
            history: updatedHistory,
            paymentDetails: isPayrollRoute ? undefined : {
              method: paymentForm.method,
              reference: paymentForm.reference,
              paidDate: new Date().toISOString().split('T')[0]
            }
          };
        }
        return c;
      })
    );

    setIsPaymentModalOpen(false);
    if (isPayrollRoute) {
      toast.success('Claim sent to Payroll! It will be included in the next salary cycle.');
    } else {
      toast.success('Direct payment recorded and logged successfully!');
    }
    setViewingClaim(null);
  };

  // Helpers to reset and close forms
  const closePolicyEditor = () => {
    setEditingPolicyId(null);
    setNewPolicy({
      name: '',
      code: '',
      description: '',
      type: 'Actual',
      categories: [],
      eligibility: { departments: ['All'], designations: ['All'], locations: ['All'] },
      maxLimit: 10000,
      frequency: 'Monthly',
      receiptRequired: true,
      minAmountForReceipt: 0,
      workflow: ['Manager', 'HR', 'Finance'],
      effectiveDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      status: 'Active'
    });
    setIsPolicyModalOpen(false);
  };

  const closeCategoryEditor = () => {
    setEditingCategoryId(null);
    setNewCategory({
      name: '',
      description: '',
      maxLimit: 10000,
      receiptRequired: true,
      taxApplicable: false,
      status: 'Active'
    });
    setIsCategoryModalOpen(false);
  };

  const toggleWorkflowStep = (step: string) => {
    setNewPolicy(prev => {
      let current = [...(prev.workflow || [])];
      if (current.includes(step)) {
        current = current.filter(x => x !== step);
      } else {
        current.push(step);
      }
      
      const ordered = [];
      if (current.includes('Manager')) ordered.push('Manager');
      if (current.includes('HR')) ordered.push('HR');
      if (current.includes('Finance')) ordered.push('Finance');
      
      return {
        ...prev,
        workflow: ordered.length > 0 ? ordered : ['Manager', 'HR', 'Finance']
      };
    });
  };

  const startEditPolicy = (p: ReimbursementPolicy) => {
    setEditingPolicyId(p.id);
    setNewPolicy({
      name: p.name,
      code: p.code,
      description: p.description,
      type: p.type,
      categories: p.categories,
      eligibility: {
        departments: p.eligibility.departments || ['All'],
        designations: p.eligibility.designations || ['All'],
        locations: p.eligibility.locations || ['All']
      },
      maxLimit: p.maxLimit,
      frequency: p.frequency,
      receiptRequired: p.receiptRequired,
      minAmountForReceipt: p.minAmountForReceipt || 0,
      workflow: p.workflow,
      effectiveDate: p.effectiveDate || new Date().toISOString().split('T')[0],
      expiryDate: p.expiryDate || '',
      status: p.status
    });
    setIsPolicyModalOpen(true);
  };

  const startEditCategory = (cat: ExpenseCategory) => {
    setEditingCategoryId(cat.id);
    setNewCategory({
      name: cat.name,
      description: cat.description,
      maxLimit: cat.maxLimit,
      receiptRequired: cat.receiptRequired,
      taxApplicable: cat.taxApplicable,
      status: cat.status
    });
    setIsCategoryModalOpen(true);
  };

  // Add a new Policy
  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.name || !newPolicy.code || newPolicy.categories.length === 0) {
      toast.error('Policy name, code, and at least one category are required');
      return;
    }

    if (editingPolicyId) {
      setPolicies(prev => prev.map(p => {
        if (p.id === editingPolicyId) {
          return {
            ...newPolicy,
            id: editingPolicyId
          };
        }
        return p;
      }));
      writeAuditLog('POLICY_UPDATED', 'Policies', editingPolicyId, '', `Updated policy ${newPolicy.name} (${newPolicy.code})`);
      toast.success('Reimbursement Policy updated successfully!');
    } else {
      const policy: ReimbursementPolicy = {
        ...newPolicy,
        id: `pol-${Date.now()}`
      };
      setPolicies(prev => [...prev, policy]);
      writeAuditLog('POLICY_CREATED', 'Policies', policy.id, '', `Created policy ${policy.name} (${policy.code})`);
      toast.success('Reimbursement Policy created successfully!');
    }
    
    closePolicyEditor();
  };

  // Add a new Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) {
      toast.error('Category name is required');
      return;
    }

    if (editingCategoryId) {
      setCategories(prev => prev.map(cat => {
        if (cat.id === editingCategoryId) {
          return {
            ...newCategory,
            id: editingCategoryId
          };
        }
        return cat;
      }));
      writeAuditLog('CATEGORY_UPDATED', 'Expense Categories', editingCategoryId, '', `Updated category ${newCategory.name}`);
      toast.success('Expense Category updated successfully!');
    } else {
      const category: ExpenseCategory = {
        ...newCategory,
        id: `cat-${Date.now()}`
      };
      setCategories(prev => [...prev, category]);
      writeAuditLog('CATEGORY_CREATED', 'Expense Categories', category.id, '', `Created category ${category.name}`);
      toast.success('Expense Category created successfully!');
    }

    closeCategoryEditor();
  };

  // Delete policies or categories
  const handleDeletePolicy = (id: string) => {
    const pol = policies.find(p => p.id === id);
    setDeletePolicyTarget({ id, name: pol?.name || 'Reimbursement Policy' });
  };

  const confirmDeletePolicy = () => {
    if (!deletePolicyTarget) return;
    const { id, name } = deletePolicyTarget;
    setPolicies(prev => prev.filter(p => p.id !== id));
    writeAuditLog('POLICY_DELETED', 'Policies', id, name, '');
    toast.success('Policy deleted');
    setDeletePolicyTarget(null);
  };

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    setDeleteCategoryTarget({ id, name: cat?.name || 'Expense Category' });
  };

  const confirmDeleteCategory = () => {
    if (!deleteCategoryTarget) return;
    const { id, name } = deleteCategoryTarget;
    setCategories(prev => prev.filter(c => c.id !== id));
    writeAuditLog('CATEGORY_DELETED', 'Expense Categories', id, name, '');
    toast.success('Category deleted');
    setDeleteCategoryTarget(null);
  };

  // Settings form handlers
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    writeAuditLog('SETTINGS_UPDATED', 'Settings', 'global', '', 'Updated global settings configuration');
    toast.success('Module settings updated successfully!');
  };

  // Export claims to CSV file
  const exportToCSV = () => {
    const headers = ['Claim No', 'Employee Name', 'Department', 'Policy', 'Submit Date', 'Amount', 'Currency', 'Status', 'Paid Date', 'Ref No'];
    const rows = filteredClaims.map(c => [
      c.claimNumber,
      c.employeeName,
      c.department,
      c.policyName,
      c.submitDate,
      c.amount,
      c.currency,
      c.status,
      c.paymentDetails?.paidDate || 'N/A',
      c.paymentDetails?.reference || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reimbursements_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reimbursement data exported to CSV');
    writeAuditLog('EXPORT_CSV', 'Data Export', 'All Claims', 'N/A', `Exported ${filteredClaims.length} records`);
  };

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    const list = claims;
    const total = list.length;
    const pending = list.filter(c => ['Submitted', 'Pending Manager Approval', 'Pending HR Approval', 'Pending Finance Approval'].includes(c.status)).length;
    const approved = list.filter(c => c.status === 'Approved').length;
    const paid = list.filter(c => c.status === 'Paid').length;
    const rejected = list.filter(c => c.status === 'Rejected').length;
    
    const paidAmount = list.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0);
    const pendingAmount = list.filter(c => ['Submitted', 'Pending Manager Approval', 'Pending HR Approval', 'Pending Finance Approval'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0);
    
    // Category Breakdown
    const catBreakdown: Record<string, number> = {};
    list.forEach(c => {
      c.items.forEach(item => {
        catBreakdown[item.category] = (catBreakdown[item.category] || 0) + item.amount;
      });
    });

    // Department Breakdown
    const deptBreakdown: Record<string, number> = {};
    list.forEach(c => {
      deptBreakdown[c.department] = (deptBreakdown[c.department] || 0) + c.amount;
    });

    return { total, pending, approved, paid, rejected, paidAmount, pendingAmount, catBreakdown, deptBreakdown };
  }, [claims]);

  // Status badging styles helper
  const getStatusBadge = (status: EmployeeClaim['status']) => {
    const base = "px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full inline-flex items-center gap-1.5 border ";
    switch (status) {
      case 'Draft':
        return base + "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      case 'Submitted':
      case 'Pending Manager Approval':
        return base + "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case 'Pending HR Approval':
        return base + "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case 'Pending Finance Approval':
        return base + "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case 'Approved':
        return base + "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case 'Paid':
        return base + "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case 'Rejected':
        return base + "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case 'Cancelled':
        return base + "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      case 'Re-submission Required':
        return base + "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case 'Resubmitted':
        return base + "bg-primary/10 text-primary border-primary/20";
      case 'Processing Payout':
        return base + "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case 'Pending Payroll':
        return base + "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case 'Waiting for Payout':
        return base + "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    }
  };

  if (isCreateModalOpen) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen pb-12 animate-in fade-in duration-200">
        {/* Standalone Page Header */}
        <div className="border-b border-border">
          <div className="py-6">
            <PageHeader
              title="New Reimbursement Request"
              description="Add receipts, policy associations and submit for review"
              icon={<Receipt className="size-8" />}
              // breadcrumbs={[
              //   { label: "Reimbursements Portal" }
              // ]}
              action={
                <button
                  onClick={() => setShowCancelClaimConfirm(true)}
                  className="border border-border text-foreground bg-card hover:bg-muted font-bold px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 text-sm w-fit"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Claims Hub
                </button>
              }
            />
          </div>
        </div>

        {/* Page Form Container */}
        <div className="mt-8">
          <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden p-6 space-y-6">
            
            {/* Category & Policy Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Expense Category <span className="text-red-500 dark:text-red-400">*</span></label>
                <select
                  value={newClaim.category}
                  onChange={e => {
                    const catName = e.target.value;
                    const matchedPolicy = policies.find(p => p.status === 'Active' && p.categories.includes(catName));
                    
                    if (matchedPolicy) {
                      const check = checkEligibility(matchedPolicy);
                      setEligibilityError(check.reasons);
                    } else {
                      setEligibilityError(catName ? ["No active reimbursement policy plan covers this category. Submissions are disabled."] : []);
                    }

                    setNewClaim(prev => ({
                      ...prev,
                      category: catName,
                      policyId: matchedPolicy ? matchedPolicy.id : ''
                    }));
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50 outline-none transition"
                >
                  <option value="">Select an Expense Category</option>
                  {categories.filter(c => c.status === 'Active').map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Applied Reimbursement Policy</label>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 h-10 flex items-center">
                  {(() => {
                    const matched = policies.find(p => p.id === newClaim.policyId);
                    if (matched) {
                      return (
                        <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {matched.name} ({matched.code}) - Max: ₹{matched.maxLimit.toLocaleString()}
                        </span>
                      );
                    }
                    return newClaim.category ? (
                      <span className="text-amber-600">No policy covers this category</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-normal">Select a category to apply policy</span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Eligibility Alerts */}
            {eligibilityError.length > 0 && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl p-4 flex gap-3 text-sm animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">Ineligible for Reimbursement:</span>
                  <ul className="list-disc pl-5 mt-1.5 space-y-1 text-xs">
                    {eligibilityError.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <span className="text-[11px] text-rose-600 block mt-2 font-medium">Please contact HR to update your department, designation, or location profile settings.</span>
                </div>
              </div>
            )}

            {/* Expense lines section */}
            <div className="space-y-4">
              {(!isResubmitting || editingItemIdx !== null || isAddingNewItem) && (
                <>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 border-b pb-2 uppercase tracking-wider">
                    {editingItemIdx !== null ? 'Edit Line Item' : isAddingNewItem ? 'Add New Line Item' : 'Line Item Specifications'}
                  </h4>
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-border space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">Expense Date</label>
                    <StandardDatePicker
                      value={newItem.date}
                      onChange={date => setNewItem(prev => ({ ...prev, date }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">Category</label>
                    <input
                      type="text"
                      readOnly
                      value={newClaim.category || 'Select Category at Top'}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 outline-none cursor-not-allowed font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">Amount (₹)</label>
                    {(() => {
                      const selectedCat = categories.find(c => c.name === newClaim.category);
                      const catLimit = selectedCat ? selectedCat.maxLimit : 0;
                      const enteredAmt = Number(newItem.amount || 0);
                      const exceedsCatLimit = catLimit > 0 && enteredAmt > catLimit;
                      const remaining = catLimit - enteredAmt;
                      return (
                        <>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newItem.amount}
                            onChange={e => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                            className={`w-full p-2 border rounded-lg text-xs bg-card outline-none ${
                              exceedsCatLimit
                                ? 'border-rose-400 ring-1 ring-rose-300'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                          />
                          {selectedCat && catLimit > 0 && (
                            <p className={`text-[10px] font-semibold mt-1 ${exceedsCatLimit ? 'text-rose-500' : 'text-slate-500'}`}>
                              {!newItem.amount
                                ? `Max allowed: ₹${catLimit.toLocaleString()}`
                                : exceedsCatLimit
                                  ? `⚠ Exceeds limit by ₹${(enteredAmt - catLimit).toLocaleString()} (Max: ₹${catLimit.toLocaleString()})`
                                  : `✓ Remaining: ₹${remaining.toLocaleString()} of ₹${catLimit.toLocaleString()}`}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">Description / Purpose</label>
                    <textarea
                      placeholder="Explain purpose of expense..."
                      value={newItem.description}
                      onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-card outline-none h-[72px] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">Receipt Attachment</label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => {
                        const fileInput = document.getElementById('receipt-file-input');
                        if (fileInput) fileInput.click();
                      }}
                      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center h-[72px] relative ${
                        newItem.receiptName 
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30' 
                          : isDragging 
                            ? 'border-primary bg-primary/10' 
                            : 'border-slate-300 dark:border-slate-600 bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <input
                        id="receipt-file-input"
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.jpeg,.png,.jpg,.docx"
                      />
                      
                      {newItem.receiptName ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <p className="text-xs font-bold text-emerald-800 truncate max-w-[250px] flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5" /> {newItem.receiptName}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewItem(prev => ({ ...prev, receiptName: '' }));
                              toast.success('Attachment removed');
                            }}
                            className="text-[9px] text-rose-600 hover:text-rose-800 font-extrabold"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Drag & drop receipt, or <span className="text-primary hover:underline">browse</span></p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">PDF, JPG, PNG up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                    {editingItemIdx !== null || isAddingNewItem ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemIdx(null);
                            setIsAddingNewItem(false);
                            handleCancelEditItem();
                          }}
                          className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAddingNewItem) {
                              handleAddClaimItem();
                              setIsAddingNewItem(false);
                            } else {
                              handleSaveClaimItem();
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
                        >
                          {isAddingNewItem ? 'Add' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAddClaimItem}
                        className="bg-primary hover:bg-primary/80 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
                      >
                        Add Line Item
                      </button>
                    )}
                  </div>
              </div>
                </>
              )}
              {/* Added Items List */}
              {newClaim.items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">List of Added Expenses</span>
                    {isResubmitting && editingItemIdx === null && !isAddingNewItem && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewItem(true);
                          setEditingItemIdx(null);
                          setNewItem({
                            date: new Date().toISOString().split('T')[0],
                            category: '',
                            amount: '',
                            description: '',
                            gstNumber: '',
                            receiptName: '',
                            receiptUrl: ''
                          });
                        }}
                        className="bg-primary/10 hover:bg-primary/20 text-primary font-bold px-3 py-1.5 rounded-lg text-xs transition border border-primary/20 flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add New Item
                      </button>
                    )}
                  </div>
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {newClaim.items.map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{item.category} - <span className="text-muted-foreground">{item.date}</span></p>
                          <p className="text-slate-500 dark:text-slate-500">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">₹{item.amount.toLocaleString()}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditClaimItem(idx)}
                              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded"
                              title="Edit item"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveClaimItem(idx)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Submission Remarks / Comments</label>
              <textarea
                placeholder="Provide additional context for validation team..."
                value={newClaim.comments}
                onChange={e => setNewClaim(prev => ({ ...prev, comments: e.target.value }))}
                className="w-full p-3 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 transition h-20 resize-none"
              />
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <button
                onClick={() => setShowCancelClaimConfirm(true)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-lg text-sm transition"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => submitClaim(true)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-lg text-sm border border-slate-200 dark:border-slate-700 transition"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => submitClaim(false)}
                  className="bg-primary hover:bg-primary/80 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow transition"
                >
                  Submit for Approval
                </button>
              </div>
            </div>

          </div>
        </div>

        <ConfirmDialog
          open={showCancelClaimConfirm}
          title="Discard Reimbursement Request?"
          message="Are you sure you want to cancel? Any receipt details and line items added to this claim will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep Editing"
          confirmColor="red"
          onConfirm={() => {
            setShowCancelClaimConfirm(false);
            setIsCreateModalOpen(false);
            setEditingClaimId(null);
            setEditingItemIdx(null);
            setIsAddingNewItem(false);
            setNewClaim({ policyId: '', category: '', comments: '', items: [] });
          }}
          onCancel={() => setShowCancelClaimConfirm(false)}
        />
      </div>
    );
  }

  if (isCategoryModalOpen) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen pb-12 animate-in fade-in duration-200">
        {/* Standalone Page Header */}
        <div className="border-b border-border">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="w-4.5 h-4.5" />
                  <span className="text-xs font-bold tracking-wider uppercase">Expense Category Config</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{editingCategoryId ? 'Edit Expense Category' : 'Add Expense Category'}</h1>
                <p className="text-muted-foreground text-sm">{editingCategoryId ? 'Modify standard cost-center item buckets' : 'Setup standard cost-center item buckets'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelCategoryConfirm(true)}
                className="border border-border text-foreground bg-card hover:bg-muted font-bold px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 text-sm w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Categories
              </button>
            </div>
          </div>
        </div>

        {/* Page Form Container */}
        <div className="mt-8">
          <form onSubmit={handleCreateCategory} className="bg-card rounded-2xl border border-border shadow-md overflow-hidden p-6 space-y-6 flex flex-col">
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Relocation, Medical Claims"
                  value={newCategory.name}
                  onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Description</label>
                <textarea
                  placeholder="Brief description of allowability..."
                  value={newCategory.description}
                  onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Max Ceiling Limit Amount (₹)</label>
                <input
                  type="number"
                  value={newCategory.maxLimit}
                  onChange={e => setNewCategory(prev => ({ ...prev, maxLimit: parseFloat(e.target.value) || 0 }))}
                  className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCategory.receiptRequired}
                    onChange={e => setNewCategory(prev => ({ ...prev, receiptRequired: e.target.checked }))}
                    className="rounded accent-primary focus:ring-primary"
                  />
                  Receipt Mandatory
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCategory.taxApplicable}
                    onChange={e => setNewCategory(prev => ({ ...prev, taxApplicable: e.target.checked }))}
                    className="rounded accent-primary focus:ring-primary"
                  />
                  GST Applicable
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelCategoryConfirm(true)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary hover:bg-primary/80 text-white font-bold px-5 py-2.5 rounded-lg shadow transition"
              >
                {editingCategoryId ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>

        <ConfirmDialog
          open={showCancelCategoryConfirm}
          title={editingCategoryId ? "Discard Category Changes?" : "Discard New Expense Category?"}
          message="Are you sure you want to cancel? Any category ceiling limit details entered in this form will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep Editing"
          confirmColor="red"
          onConfirm={() => {
            setShowCancelCategoryConfirm(false);
            closeCategoryEditor();
          }}
          onCancel={() => setShowCancelCategoryConfirm(false)}
        />
      </div>
    );
  }

  if (isPolicyModalOpen) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen pb-12 animate-in fade-in duration-200">
        {/* Standalone Page Header */}
        <div className="border-b border-border">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4.5 h-4.5" />
                  <span className="text-xs font-bold tracking-wider uppercase">Reimbursements Policy Config</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{editingPolicyId ? 'Edit Reimbursement Policy' : 'Configure Reimbursement Policy'}</h1>
                <p className="text-muted-foreground text-sm">{editingPolicyId ? 'Modify existing limit thresholds and approvals' : 'Setup maximum claim boundaries and eligibility rules'}</p>
              </div>
              <button
                onClick={() => setShowCancelPolicyConfirm(true)}
                className="border border-border text-foreground bg-card hover:bg-muted font-bold px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 text-sm w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Policies
              </button>
            </div>
          </div>
        </div>

        {/* Page Form Container */}
        <div className="mt-8">
          <form onSubmit={handleCreatePolicy} className="bg-card rounded-2xl border border-border shadow-md overflow-hidden p-6 space-y-6 flex flex-col">
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Policy Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Team Travel Reimbursement"
                    value={newPolicy.name}
                    onChange={e => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Unique Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. POL-SLS-TRV"
                    value={newPolicy.code}
                    onChange={e => setNewPolicy(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Description</label>
                  <textarea
                    placeholder="Describe eligibility limits and policy details..."
                    value={newPolicy.description}
                    onChange={e => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Policy Limit Type</label>
                  <select
                    value={newPolicy.type}
                    onChange={e => setNewPolicy(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="Actual">Actual Reimbursement</option>
                    <option value="Fixed">Fixed Stipend</option>
                    <option value="Capped">Capped Limit</option>
                    <option value="Per Diem">Per Diem Allowance</option>
                    <option value="Mileage">Mileage Payout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Max Threshold Limit (₹)</label>
                  <input
                    type="number"
                    value={newPolicy.maxLimit}
                    onChange={e => setNewPolicy(prev => ({ ...prev, maxLimit: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Frequency Cycle</label>
                  <select
                    value={newPolicy.frequency}
                    onChange={e => setNewPolicy(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Per Claim">Per Claim</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase">Associated Expense Categories *</label>
                  <button
                    type="button"
                    onClick={() => { setIsCategoryModalOpen(true); setEditingCategoryId(null); setNewCategory({ name: '', description: '', maxLimit: 10000, receiptRequired: true, taxApplicable: false, status: 'Active' }); }}
                    className="text-xs font-bold text-primary hover:text-primary/80 transition flex items-center gap-1"
                  >
                    + Add Category
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-border">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={newPolicy.categories.includes(cat.name)}
                        onChange={e => {
                          const checked = e.target.checked;
                          setNewPolicy(prev => ({
                            ...prev,
                            categories: checked
                              ? [...prev.categories, cat.name]
                              : prev.categories.filter(name => name !== cat.name)
                          }));
                        }}
                        className="rounded accent-primary focus:ring-primary"
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Policy Eligibility Criteria Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4 border-dashed border-slate-200 dark:border-slate-700">
                <div className="col-span-3">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Policy Eligibility Criteria</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">Configure which employee segments can claim under this policy plan.</p>
                </div>
                {/* Departments */}
                <MultiSelectDropdown
                  label="Eligible Departments"
                  options={availableDepartments}
                  selected={newPolicy.eligibility.departments}
                  onChange={selected => setNewPolicy(prev => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, departments: selected }
                  }))}
                  badgeBgClass="bg-blue-50 dark:bg-blue-950/30"
                  badgeTextClass="text-blue-700 dark:text-blue-300"
                  badgeBorderClass="border-blue-150 dark:border-blue-800"
                />

                {/* Designations */}
                <MultiSelectDropdown
                  label="Eligible Designations"
                  options={availableDesignations}
                  selected={newPolicy.eligibility.designations}
                  onChange={selected => setNewPolicy(prev => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, designations: selected }
                  }))}
                  badgeBgClass="bg-primary/10"
                  badgeTextClass="text-primary"
                  badgeBorderClass="border-primary/20"
                />

                {/* Locations */}
                <MultiSelectDropdown
                  label="Eligible Locations"
                  options={availableLocations}
                  selected={newPolicy.eligibility.locations}
                  onChange={selected => setNewPolicy(prev => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, locations: selected }
                  }))}
                  badgeBgClass="bg-emerald-50 dark:bg-emerald-950/30"
                  badgeTextClass="text-emerald-700 dark:text-emerald-300"
                  badgeBorderClass="border-emerald-150 dark:border-emerald-800"
                />
              </div>

              {/* Approval Routing Workflow Setup */}
              <div className="border-t pt-4 border-dashed border-slate-200 dark:border-slate-700">
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Approval Routing Workflow</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 mb-3">Define the multi-level verification path for claims submitted under this policy.</p>
                
                {/* Visual Workflow Preview */}
                <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-border overflow-x-auto">
                  {newPolicy.workflow.map((step, idx) => (
                    <React.Fragment key={step}>
                      {idx > 0 && <span className="text-slate-400 dark:text-slate-500 font-bold text-sm">→</span>}
                      <div className="flex items-center gap-2 bg-white dark:bg-card px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{step === 'Manager' ? 'Reporting Manager' : step === 'HR' ? 'HR Department' : 'Finance Disbursal'}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Workflow Configuration Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-sm">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newPolicy.workflow.includes('Manager')}
                        onChange={() => toggleWorkflowStep('Manager')}
                        className="rounded accent-primary focus:ring-primary w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Reporting Manager</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500">First level direct manager</span>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-sm">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newPolicy.workflow.includes('HR')}
                        onChange={() => toggleWorkflowStep('HR')}
                        className="rounded accent-primary focus:ring-primary w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">2. HR Verification</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500">Policy audit & compliance check</span>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-sm">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newPolicy.workflow.includes('Finance')}
                        onChange={() => toggleWorkflowStep('Finance')}
                        className="rounded accent-primary focus:ring-primary w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Finance Processing</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500">Ledger accounting & bank payout</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4 border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Effective Start Date</label>
                  <ModernDatePicker
                    value={newPolicy.effectiveDate}
                    onChange={date => setNewPolicy(prev => ({ ...prev, effectiveDate: date }))}
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Expiry End Date</label>
                  <ModernDatePicker
                    value={newPolicy.expiryDate}
                    onChange={date => setNewPolicy(prev => ({ ...prev, expiryDate: date }))}
                    placeholder="Select expiry date"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelPolicyConfirm(true)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary hover:bg-primary/80 text-white font-bold px-5 py-2.5 rounded-lg shadow transition"
              >
                {editingPolicyId ? 'Save Changes' : 'Create Policy'}
              </button>
            </div>
          </form>
        </div>

        <ConfirmDialog
          open={showCancelPolicyConfirm}
          title={editingPolicyId ? "Discard Policy Changes?" : "Discard New Reimbursement Policy?"}
          message="Are you sure you want to cancel? Any policy rules and threshold details entered in this form will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep Editing"
          confirmColor="red"
          onConfirm={() => {
            setShowCancelPolicyConfirm(false);
            closePolicyEditor();
          }}
          onCancel={() => setShowCancelPolicyConfirm(false)}
        />
      </div>
    );
  }

  const receiptPreviewPortal = previewItem && ReactDOM.createPortal(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[210] animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in scale-in-95 duration-250">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <div className="text-left">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{previewItem.receiptName || 'Receipt_Attachment'}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-500">Document Verification Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadReceipt(previewItem);
              }}
              className="bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewItem(null);
              }}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full transition"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-6 bg-slate-100 dark:bg-slate-800 flex-1 overflow-y-auto flex items-center justify-center min-h-[400px]">
          <div className="bg-white dark:bg-card p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg max-w-full w-full flex flex-col items-center justify-center text-center">
            {previewItem.receiptUrl ? (
              (previewItem.receiptName?.toLowerCase().endsWith('.pdf') || resolveFileUrl(previewItem.receiptUrl)?.toLowerCase().includes('.pdf')) ? (
                <embed
                  src={resolveFileUrl(previewItem.receiptUrl)}
                  type="application/pdf"
                  className="w-full h-[60vh] rounded-lg border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <img
                  src={resolveFileUrl(previewItem.receiptUrl)}
                  alt={previewItem.receiptName || 'Receipt Document'}
                  className="max-h-[60vh] object-contain rounded-lg border border-slate-200 dark:border-slate-700 mx-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'text-center p-4 text-xs text-slate-500 dark:text-slate-500 flex flex-col items-center gap-2';
                      fallback.innerHTML = '<span class="font-extrabold text-slate-700 dark:text-slate-200">Unable to display preview</span><span>The file may not be an image or is no longer available. Use Download instead.</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              )
            ) : (
              <div className="py-12 px-6 flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 text-primary rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <FileText className="w-8 h-8" />
                </div>
                <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Direct Preview Unavailable</h5>
                <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                  For security and data isolation, direct in-browser previews are only available for receipts uploaded in this session.
                </p>
                <p className="text-xs font-bold text-primary bg-primary/10 px-3 py-2 rounded-lg border border-primary/20">
                  Attachment: {previewItem.receiptName}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadReceipt(previewItem);
                  }}
                  className="mt-2 bg-primary hover:bg-primary/80 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Attachment File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    , document.body);

  if (viewingClaim) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen pb-12 animate-in fade-in duration-200">
        {/* Standalone Page Header */}
        <div className="py-6 border-b border-border">
          <div className="flex items-center gap-4">
            {/* Round Back Arrow Button */}
            <button
              type="button"
              onClick={() => setViewingClaim(null)}
              className="icon-circle-btn"
            >
              <ArrowLeft className="h-4 w-4"/>
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Claim {viewingClaim.claimNumber} Details
                </h2>
                <span className={getStatusBadge(viewingClaim.status)}>{viewingClaim.status}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Review expense documentation, receipts, and approval history. Submitted by {viewingClaim.employeeName} on {viewingClaim.submitDate}.
              </p>
            </div>
          </div>
        </div>

        {/* Page Content Container */}
        <div className="mt-8">
          <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden p-6 space-y-6">

            {/* Claim general information header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20 text-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wide block">Employee Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{viewingClaim.employeeName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wide block">Department</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{viewingClaim.department}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wide block">Policy Assigned</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{viewingClaim.policyName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wide block">Total Claim Amount</span>
                <span className="font-black text-primary text-base">₹{viewingClaim.amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Expense Items List */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Line Items</h4>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {viewingClaim.items.map((item, index) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-500">#{index + 1}</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.category}</span>
                        <span className="text-xs text-muted-foreground">({item.date})</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-500">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      {(item.receiptName || item.receiptUrl) && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            className="text-xs font-bold text-primary hover:text-primary transition flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadReceipt(item);
                            }}
                            className="text-xs font-bold text-slate-600 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition flex items-center gap-1 bg-white dark:bg-card px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      )}

                      <span className="font-black text-slate-900 dark:text-slate-100 text-base">
                        ₹{item.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification & Payout Details if Paid */}
            {viewingClaim.paymentDetails && (
              <div className="p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-800 rounded-xl space-y-2 text-sm">
                <h4 className="font-extrabold text-teal-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                  Payment Settlement Cleared
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-teal-900 pt-1">
                  <p><strong>Payment Method:</strong> {viewingClaim.paymentDetails.method}</p>
                  <p><strong>Transaction Ref:</strong> {viewingClaim.paymentDetails.reference}</p>
                  <p><strong>Date Settled:</strong> {viewingClaim.paymentDetails.paidDate}</p>
                </div>
              </div>
            )}

            {/* History Timeline workflow */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Workflow Approval Timeline</h4>
              <div className="relative border-l-2 border-slate-200 dark:border-slate-700 pl-5 ml-2 space-y-5 pt-1">
                {viewingClaim.history.map((hist, idx) => {
                  const action = hist.action || '';
                  let dotColor = 'bg-slate-400';
                  let labelColor = 'text-slate-700 dark:text-slate-300';
                  let bgColor = 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800';
                  let statusBadge = '';

                  if (action.includes('Submitted') || action.includes('Created Draft')) {
                    dotColor = 'bg-primary/100'; labelColor = 'text-primary'; bgColor = 'bg-primary/10 border-primary/20'; statusBadge = '📋';
                  } else if (action.includes('Manager Approved')) {
dotColor = 'bg-blue-500'; labelColor = 'text-blue-700 dark:text-blue-300'; bgColor = 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900'; statusBadge = '✅';
                  } else if (viewingClaim.status === 'Pending HR Approval' || viewingClaim.status === 'Pending Finance Approval') {
                    dotColor = 'bg-violet-500'; labelColor = 'text-violet-700 dark:text-violet-300'; bgColor = 'bg-violet-50/60 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900'; statusBadge = '✅';
                  } else if (viewingClaim.status === 'Waiting for Payout' || viewingClaim.status === 'Processing Payout') {
                    dotColor = 'bg-teal-500'; labelColor = 'text-teal-700 dark:text-teal-300'; bgColor = 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900'; statusBadge = '✅';
                  } else if (viewingClaim.status === 'Approved' || viewingClaim.status === 'Paid') {
                    dotColor = 'bg-emerald-500'; labelColor = 'text-emerald-700 dark:text-emerald-300'; bgColor = 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900'; statusBadge = '🎉';
                  } else if (viewingClaim.status === 'Rejected') {
                    dotColor = 'bg-rose-500'; labelColor = 'text-rose-700 dark:text-rose-300'; bgColor = 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900'; statusBadge = '❌';
                  } else if (viewingClaim.status === 'Re-submission Required' || viewingClaim.status === 'Cancelled') {
                    dotColor = 'bg-amber-500'; labelColor = 'text-amber-700 dark:text-amber-300'; bgColor = 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900'; statusBadge = '↩️';
                  } else if (viewingClaim.status === 'Resubmitted') {
                    dotColor = 'bg-sky-500'; labelColor = 'text-sky-700 dark:text-sky-300'; bgColor = 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900'; statusBadge = '🔄';
                  } else if (viewingClaim.status === 'Pending Payroll') {
                    dotColor = 'bg-green-600 dark:bg-green-500'; labelColor = 'text-green-700 dark:text-green-300'; bgColor = 'bg-green-50/60 dark:bg-green-950/30 border-green-100 dark:border-green-900'; statusBadge = '💰';
                  } else if (action.includes('Updated Draft')) {
                    dotColor = 'bg-slate-400'; labelColor = 'text-slate-600 dark:text-slate-500'; bgColor = 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'; statusBadge = '✏️';
                  }

                  return (
                    <div key={idx} className="relative text-xs">
                      <div className={`absolute -left-[23px] top-2.5 w-3 h-3 ${dotColor} rounded-full border-2 border-white shadow-sm ring-2 ring-white`} />
                      <div className={`p-3 rounded-xl border ${bgColor} space-y-1`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-extrabold text-xs ${labelColor} flex items-center gap-1`}>
                            {statusBadge} {hist.action}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 font-semibold text-[10px]">{hist.date}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-500 font-medium leading-relaxed">
                          {hist.details
                            ? hist.details
                            : `By ${hist.user}${hist.role ? ` — ${hist.role}` : ''}`
                          }
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Comments Log</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {viewingClaim.comments.map((comm, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-600 dark:text-slate-500">
                      <span>{comm.user} ({comm.role})</span>
                      <span>{comm.date}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{comm.comment}</p>
                  </div>
                ))}
                {viewingClaim.comments.length === 0 && (
                  <p className="text-xs text-muted-foreground italic pl-1">No comments on this claim.</p>
                )}
              </div>
            </div>

            {/* Approval controls block inside details view */}
            {activeTab === 'approval-inbox' && (() => {
              const terminalStatuses = ['Approved', 'Rejected', 'Paid', 'Cancelled', 'Waiting for Payout'];
              const isTerminal = terminalStatuses.includes(viewingClaim.status);
              if (isTerminal) {
                return (
                  <div className="pt-6 border-t border-border">
                    <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold ${
                      viewingClaim.status === 'Rejected'
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                        : viewingClaim.status === 'Paid'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-500'
                    }`}>
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="font-extrabold">This claim has already been decided</p>
                        <p className="text-xs font-medium mt-0.5 opacity-75">Current status: <span className="font-black">{viewingClaim.status}</span> — No further approval actions are available.</p>
                      </div>
                    </div>
                  </div>
                );
              }

              const canApproveStage = (() => {
                const s = viewingClaim.status;
                if (userRole === 'MANAGER') {
                  return s === 'Submitted' || s === 'Pending Manager Approval' || s === 'Resubmitted';
                }
                if (userRole === 'HR') return s === 'Pending HR Approval';
                if (userRole === 'FINANCE') return s === 'Pending Finance Approval';
                // ADMIN / SUPER_ADMIN can act on any open claim stage — but only once per claim
                if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
                  if (adminActionedClaims.has(viewingClaim.id)) return false;
                  return ['Submitted', 'Pending Manager Approval', 'Pending HR Approval', 'Pending Finance Approval', 'Resubmitted', 'Waiting for Payout'].includes(s);
                }
                return false;
              })();

              if (!canApproveStage) {
                return (
                  <div className="pt-6 border-t border-border">
                    <div className="flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="font-extrabold">Not your approval stage</p>
                        <p className="text-xs font-medium mt-0.5 opacity-75">Current status: <span className="font-black">{viewingClaim.status}</span> — This claim is pending approval at a different stage.</p>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="pt-6 border-t border-border space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Approval Verification Actions</h4>
                  
                  <textarea
                    id="approver-comment"
                    placeholder="Enter approval comments, send-back reason, or rejection reason here..."
                    className="w-full p-3 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 transition h-20 resize-none"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const commentEl = document.getElementById('approver-comment') as HTMLTextAreaElement;
                        approveClaim(viewingClaim.id, commentEl?.value || '');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm shadow transition"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => {
                        const commentEl = document.getElementById('approver-comment') as HTMLTextAreaElement;
                        sendBackClaim(viewingClaim.id, commentEl?.value || '');
                      }}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-lg text-sm transition"
                    >
                      Send Back for Details
                    </button>
                    <button
                      onClick={() => {
                        const commentEl = document.getElementById('approver-comment') as HTMLTextAreaElement;
                        const commentVal = commentEl?.value || '';
                        if (!commentVal.trim()) {
                          setRejectClaimTarget({ id: viewingClaim.id, title: viewingClaim.claimNumber });
                        } else {
                          rejectClaim(viewingClaim.id, commentVal);
                        }
                      }}
                      className="bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold px-4 py-2 rounded-lg text-sm border border-rose-100 dark:border-rose-800 transition"
                    >
                      Reject Claim
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {receiptPreviewPortal}
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Expense Reimbursement Hub"
        description="Policy management, claim submission, multi-level approvals and payroll integrations"
        icon={<Receipt className="size-8" />}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && (
              <button
                onClick={openNewClaimForm}
                className="bg-primary hover:bg-primary/80 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Expense Claim
              </button>
            )}
            {isManagement && (
              <>
                <button
                  onClick={() => setIsPolicyModalOpen(true)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 transition-all text-sm"
                >
                  Add Policy
                </button>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 transition-all text-sm"
                >
                  Add Category
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Sub Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {isManagement && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'dashboard' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <LayoutDashboard className={`w-4 h-4 transition-colors ${activeTab === 'dashboard' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              Dashboard
            </button>
          )}

          {userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && (
            <button
              onClick={() => setActiveTab('my-claims')}
              className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'my-claims' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <FileText className={`w-4 h-4 transition-colors ${activeTab === 'my-claims' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              My Claims
            </button>
          )}

          {(userRole === 'MANAGER' || isManagement) && (
            <button
              onClick={() => setActiveTab('approval-inbox')}
              className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'approval-inbox' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <Inbox className={`w-4 h-4 transition-colors ${activeTab === 'approval-inbox' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              Approval Inbox
            </button>
          )}

          {userRole !== 'EMPLOYEE' && (
            <button
              onClick={() => setActiveTab('approved')}
              className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'approved' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <CheckCircle2 className={`w-4 h-4 transition-colors ${activeTab === 'approved' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              Approved Reimbursements
            </button>
          )}

          {(userRole === 'FINANCE' || userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
            <button
              onClick={() => setActiveTab('finance-processing')}
              className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'finance-processing' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <Receipt className={`w-4 h-4 transition-colors ${activeTab === 'finance-processing' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              Finance Processing
            </button>
          )}

          {isManagement && (
            <>
              <button
                onClick={() => setActiveTab('policies')}
                className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'policies' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
              >
                <ShieldCheck className={`w-4 h-4 transition-colors ${activeTab === 'policies' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
                Policies
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'categories' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
              >
                <Tags className={`w-4 h-4 transition-colors ${activeTab === 'categories' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
                Expense Categories
              </button>
            </>
          )}

          {userRole !== 'EMPLOYEE' && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'reports' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <BarChart3 className={`w-4 h-4 transition-colors ${activeTab === 'reports' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              Reports & Logs
            </button>
          )}

          {isManagement && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`group px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'settings' ? 'text-primary border-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <SettingsIcon className={`w-4 h-4 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
              Settings
            </button>
          )}
        </div>
      </div>

      <div>
        
        {/* ==========================================
            TAB: DASHBOARD
            ========================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {stats.total}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Total Active Claims
                  </span>
                </div>
              </div>

              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-medium text-amber-600">Pending</span>
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-amber-600 tabular-nums">
                  {stats.pending}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Awaiting Approvals
                  </span>
                </div>
              </div>

              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-medium text-emerald-600">Paid</span>
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
                  {stats.paid}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Total Paid Claims
                  </span>
                </div>
              </div>

              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="text-[11px] font-medium text-rose-600">Rejected</span>
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-rose-600 tabular-nums">
                  {stats.rejected}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Rejected Requests
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Category-wise Payout custom chart */}
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-6">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Category-wise Expenditure</h3>
                  <p className="text-xs text-muted-foreground">Reimbursement amounts aggregated by expense type</p>
                </div>
                <div className="space-y-4">
                  {Object.keys(stats.catBreakdown).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic">No expense data available</div>
                  ) : (
                    Object.entries(stats.catBreakdown).map(([cat, amt]) => {
                      const max = Math.max(...Object.values(stats.catBreakdown), 1);
                      const percent = (amt / max) * 100;
                      return (
                        <div key={cat} className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>{cat}</span>
                            <span>₹{amt.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Department Breakdown Custom Chart */}
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-6">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Department-wise Distribution</h3>
                  <p className="text-xs text-muted-foreground">Payout volumes mapped department-wise</p>
                </div>
                <div className="space-y-4">
                  {Object.keys(stats.deptBreakdown).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic">No department data available</div>
                  ) : (
                    Object.entries(stats.deptBreakdown).map(([dept, amt]) => {
                      const max = Math.max(...Object.values(stats.deptBreakdown), 1);
                      const percent = (amt / max) * 100;
                      return (
                        <div key={dept} className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>{dept}</span>
                            <span>₹{amt.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                            <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Recent claims review */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-extrabold text-lg text-foreground">Recent Reimbursements Activity</h3>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="text-xs font-bold text-primary hover:text-primary transition flex items-center gap-1"
                >
                  View All Log History
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {claims.slice(0, 5).map(c => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{c.claimNumber}</span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-500">• {c.employeeName} ({c.department})</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.policyName} submitted on {c.submitDate}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100">₹{c.amount.toLocaleString()}</p>
                      <span className={getStatusBadge(c.status)}>{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: CLAIMS DIRECTORY (MY CLAIMS, INBOX, FINANCE)
            ========================================== */}
        {(activeTab === 'my-claims' || activeTab === 'approval-inbox' || activeTab === 'approved' || activeTab === 'finance-processing') && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter controls row */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 max-w-md relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search claims by number, employee, department..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all text-foreground"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowClaimFilters(!showClaimFilters)}
                      className={`toolbar-filter-btn-with-text relative ${showClaimFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                      title="Filters"
                    >
                      {showClaimFilters ? (
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
                      {(statusFilter !== 'All' || categoryFilter !== 'All') && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-card" />
                      )}
                    </button>

                    {/* Filter Dropdown Card */}
                    {showClaimFilters && (
                      <div className="absolute right-0 top-full mt-3 w-[420px] bg-white dark:bg-zinc-900 rounded-xl shadow-xl shadow-slate-200/80 dark:shadow-black/45 border border-slate-100 dark:border-zinc-800 z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-5 space-y-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[16px] font-bold text-primary tracking-tight">Filters</div>
                              <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                                {(statusFilter !== 'All' ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0)} Filter Selected
                              </span>
                            </div>
                            <button
                              onClick={() => { setStatusFilter('All'); setCategoryFilter('All'); }}
                              disabled={statusFilter === 'All' && categoryFilter === 'All'}
                              className={`text-[12px] font-semibold transition-colors ${
                                statusFilter !== 'All' || categoryFilter !== 'All'
                                  ? 'text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400'
                                  : 'text-slate-300 dark:text-zinc-700 cursor-not-allowed'
                              }`}
                            >
                              Reset all Filters
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</span>
                              <Select
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val)}
                                className="w-full"
                                placeholder="All Statuses"
                                options={[
                                  { value: "All", label: "All Statuses" },
                                  { value: "Draft", label: "Draft" },
                                  { value: "Submitted", label: "Submitted" },
                                  { value: "Pending Manager Approval", label: "Pending Manager" },
                                  { value: "Pending HR Approval", label: "Pending HR" },
                                  { value: "Pending Finance Approval", label: "Pending Finance" },
                                  { value: "Approved", label: "Approved" },
                                  { value: "Paid", label: "Paid" },
                                  { value: "Rejected", label: "Rejected" },
                                  { value: "Re-submission Required", label: "Resubmission Asked" },
                                  { value: "Resubmitted", label: "Resubmitted" }
                                ]}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Category</span>
                              <Select
                                value={categoryFilter}
                                onChange={(val) => setCategoryFilter(val)}
                                className="w-full"
                                placeholder="All Categories"
                                options={[
                                  { value: "All", label: "All Categories" },
                                  ...categories.map(cat => ({ value: cat.name, label: cat.name }))
                                ]}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={exportToCSV}
                    className="toolbar-filter-btn-with-text"
                    title="Export CSV"
                  >
                    <Download className="w-[18px] h-[18px]" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Claims Table */}
            {activeTab === 'finance-processing' && selectedClaims.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200 mb-6">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">{selectedClaims.length} claims selected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={sendBatchToPayroll} className="bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-primary font-bold px-4 py-2 rounded-lg text-xs shadow-sm border border-primary/20 transition">
                    Send to Payroll (Path B)
                  </button>
                  <button onClick={generatePayoutBatch} className="bg-primary hover:bg-primary/80 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" />
                    Generate Bank Advice CSV (Path A)
                  </button>
                  <button onClick={() => setIsBatchModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition">
                    Mark Batch as Paid
                  </button>
                </div>
              </div>
            )}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <Table className="min-w-[800px] border-collapse">
                <TableHeader className="bg-muted border-y border-border">
                  <TableRow className="hover:bg-transparent">
                    {activeTab === 'finance-processing' && (
                      <TableHead className="w-12 text-center px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          onChange={handleSelectAllClaims}
                          checked={filteredClaims.length > 0 && filteredClaims.filter(c => c.status === 'Pending Finance Approval' || c.status === 'Processing Payout').length > 0 && filteredClaims.filter(c => c.status === 'Pending Finance Approval' || c.status === 'Processing Payout').every(c => selectedClaims.includes(c.id))}
                        />
                      </TableHead>
                    )}
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Claim Details</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Employee</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Policy / Category</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Amount</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeTab === 'finance-processing' ? 7 : 6} className="p-12 text-center text-muted-foreground italic">
                        No claims matching your filter selections were found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClaims.map(c => (
                      <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                        {activeTab === 'finance-processing' && (
                          <TableCell className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                              checked={selectedClaims.includes(c.id)}
                              onChange={() => handleSelectClaim(c.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="font-extrabold text-primary hover:underline cursor-pointer" onClick={() => setViewingClaim(c)}>
                              {c.claimNumber}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Submitted: {c.submitDate}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground">{c.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{c.department}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{c.policyName}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.items.map(item => item.category).join(', ')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <span className="font-bold text-foreground">₹{c.amount.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <span className={getStatusBadge(c.status)}>{c.status}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!(activeTab === 'my-claims' && (c.status === 'Draft' || c.status === 'Re-submission Required')) && (
  <button
                              onClick={() => setViewingClaim(c)}
                              className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition"
                              title="View claim breakdown & timeline"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
)}

                            {/* Self operations for Draft/Re-submission Claims */}
                            {activeTab === 'my-claims' && (c.status === 'Draft' || c.status === 'Re-submission Required') && (
                              <button
                                onClick={() => handleClaimClick(c)}
                                className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-primary/20 shadow-sm"
                              >
                                Resubmit
                              </button>
                            )}

                            {/* Manager Actions */}
                            {activeTab === 'approval-inbox' && (
                              <button
                                onClick={() => setViewingClaim(c)}
                                className="bg-primary hover:bg-primary/80 text-white font-bold px-2 py-1 rounded text-xs transition"
                              >
                                Review Approval
                              </button>
                            )}

                            {/* Allow deleting drafts */}
                            {activeTab === 'my-claims' && c.status === 'Draft' && (
                              <button
                                onClick={() => handleDeleteDraft(c.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Finance Payment Process Actions - always visible, enabled/disabled based on status */}
                            {activeTab === 'finance-processing' && (
                              <>
                                <button
                                  onClick={() => setViewingClaim(c)}
                                  disabled={!(c.status === 'Pending Finance Approval' || c.status === 'Processing Payout')}
                                  className={`font-bold px-3 py-1.5 rounded-lg text-xs transition border shadow-sm ${
                                    c.status === 'Pending Finance Approval' || c.status === 'Processing Payout'
                                      ? 'bg-primary hover:bg-primary/80 text-white border-primary/20'
                                      : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                                  }`}
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => {
                                    setPaymentForm(prev => ({ ...prev, claimId: c.id }));
                                    setIsPaymentModalOpen(true);
                                  }}
                                  disabled={c.status === 'Paid' || c.status === 'Pending Payroll' || c.status === 'Rejected' || c.status === 'Cancelled'}
                                  className={`font-bold px-3 py-1.5 rounded-lg text-xs transition border shadow-sm ${
                                    c.status !== 'Paid' && c.status !== 'Pending Payroll' && c.status !== 'Rejected' && c.status !== 'Cancelled'
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/20'
                                      : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                                  }`}
                                >
                                  Pay Out
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: POLICIES CONFIGURATION
            ========================================== */}
        {activeTab === 'policies' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Reimbursement Policies Setup</h3>
                <p className="text-xs text-muted-foreground">Configure compliance criteria, allowance thresholds and approval hierarchies</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {policies.map(p => (
                <div key={p.id} className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between space-y-4 relative hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500 transition">
                  <div className="absolute right-4 top-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${p.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'}`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                      {p.code}
                    </span>
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 pt-1">{p.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2">{p.description}</p>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-500">Method Type:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{p.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-500">Max Limit:</span>
                      <span className="font-black text-slate-900 dark:text-slate-100">₹{p.maxLimit.toLocaleString()} / {p.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-500">Receipt Req:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{p.receiptRequired ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-500">Workflow:</span>
                      <span className="font-bold text-primary">{p.workflow.join(' → ')}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => startEditPolicy(p)}
                      className="text-primary/70 hover:text-primary p-1.5 rounded transition hover:bg-primary/10"
                      title="Edit Policy"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(p.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1.5 rounded transition hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Delete Policy"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: EXPENSE CATEGORIES SETUP
            ========================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="font-extrabold text-lg text-foreground">Global Expense Categories</h3>
              <p className="text-xs text-muted-foreground">Manage organizational cost center category buckets</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <Table className="min-w-[800px] border-collapse">
                <TableHeader className="bg-muted border-y border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Category Name</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Description</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Ceiling Max Limit</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Receipt Policy</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Tax Rules</TableHead>
                    <TableHead className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => (
                    <TableRow key={cat.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="px-6 py-4 text-sm font-semibold text-foreground">{cat.name}</TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">{cat.description}</TableCell>
                      <TableCell className="px-6 py-4 text-sm font-bold text-foreground">₹{cat.maxLimit.toLocaleString()}</TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${cat.receiptRequired ? 'bg-amber-50/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900/40' : 'bg-slate-50/60 text-slate-500 border-slate-200/60 dark:bg-slate-900/30 dark:border-slate-800/40'}`}>
                          {cat.receiptRequired ? 'Required' : 'Optional'}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {cat.taxApplicable ? `GST (${settings.taxRulesGst}%)` : 'Tax Exempt'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="text-primary/70 hover:text-primary p-1.5 hover:bg-primary/10 rounded transition"
                          title="Edit Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: REPORTS & AUDIT LOGS
            ========================================== */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* Reimbursement reports dashboard */}
            <div className="xl:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Reimbursement Reports</h3>
                  <p className="text-xs text-muted-foreground">Select criteria to download reimbursement records data</p>
                </div>
                <button
                  onClick={exportToCSV}
                  className="bg-primary hover:bg-primary/80 text-white font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download Full Report
                </button>
              </div>

              {/* Dynamic stats preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-100 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase block mb-1">Total Payout Outflow</span>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200">₹{stats.paidAmount.toLocaleString()}</p>
                  <span className="text-xs text-muted-foreground">For current financial year</span>
                </div>

                <div className="bg-primary/10 p-5 rounded-xl border border-primary/20">
                  <span className="text-[11px] font-bold text-primary uppercase block mb-1">Pending Ledger Volume</span>
                  <p className="text-2xl font-black text-primary">₹{stats.pendingAmount.toLocaleString()}</p>
                  <span className="text-xs text-primary/70">Ledger verification pipeline</span>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/30 p-5 rounded-xl border border-teal-100 dark:border-teal-800">
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase block mb-1">Approved Processing Queue</span>
                  <p className="text-2xl font-black text-teal-800 dark:text-teal-200">
                    {claims.filter(c => c.status === 'Approved').length} Claims
                  </p>
                  <span className="text-xs text-teal-600">Awaiting payout marking</span>
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-4">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100">Department Cost Center Distribution</h4>
                <div className="space-y-4">
                  {Object.entries(stats.deptBreakdown).map(([dept, val]) => (
                    <div key={dept} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{dept}</span>
                      </div>
                      <span className="font-black text-slate-800 dark:text-slate-200">₹{val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Audit log right column */}
            <div className="space-y-6">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Audit Log Trail</h3>
                <p className="text-xs text-muted-foreground">Historical actions logs for compliance reviews</p>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4 h-[600px] overflow-y-auto custom-scrollbar">
                {auditLogs.map(log => (
                  <div key={log.id} className="text-xs border-l-2 border-primary pl-3 py-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-500 font-medium">{log.newValue}</p>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>By: {log.user} ({log.role})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: ADMIN SETTINGS
            ========================================== */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-[1800px] space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="font-extrabold text-lg text-foreground">Reimbursement Module Settings</h3>
              <p className="text-xs text-muted-foreground">Configure claim submission timelines, attachment size constraints, default workflow triggers and compliance standards</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Claim Auto-Number Prefix</label>
                <input
                  type="text"
                  value={settings.autoClaimNumberPrefix}
                  onChange={e => setSettings(prev => ({ ...prev, autoClaimNumberPrefix: e.target.value }))}
                  className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Financial Year Range</label>
                <input
                  type="text"
                  value={settings.financialYear}
                  onChange={e => setSettings(prev => ({ ...prev, financialYear: e.target.value }))}
                  className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Submission Window Days (From Expense Date)</label>
                <input
                  type="number"
                  value={settings.claimWindowDays}
                  onChange={e => setSettings(prev => ({ ...prev, claimWindowDays: parseInt(e.target.value) || 30 }))}
                  className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Receipt Document Upload Max Size (MB)</label>
                <input
                  type="number"
                  value={settings.receiptSizeLimitMb}
                  onChange={e => setSettings(prev => ({ ...prev, receiptSizeLimitMb: parseInt(e.target.value) || 5 }))}
                  className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Default Tax Rule (GST %)</label>
                <input
                  type="number"
                  value={settings.taxRulesGst}
                  onChange={e => setSettings(prev => ({ ...prev, taxRulesGst: parseInt(e.target.value) || 18 }))}
                  className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Default System Currency</label>
                <input
                  type="text"
                  value={settings.defaultCurrency}
                  onChange={e => setSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                  className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="bg-primary hover:bg-primary/80 text-white font-bold px-6 py-2.5 rounded-lg shadow transition"
              >
                Save Settings Configuration
              </button>
            </div>
          </form>
        )}

      </div>





      {/* ==========================================
          MODAL: FINANCE PAYMENT RECORDINGS
          ========================================== */}
      {isPaymentModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Record Payout Details</h3>
                <p className="text-xs text-muted-foreground">Approve ledger status and log bank reference</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Payout Route Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Select Payout Route</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, method: 'Payroll' as any, integrateWithPayroll: true }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      paymentForm.method === 'Payroll'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 ring-2 ring-violet-200 dark:ring-violet-800'
                        : 'border-slate-200 dark:border-slate-700 bg-card hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark className="w-4 h-4 text-violet-600" />
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Payroll Integration</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">Add to next salary cycle. Employee gets it with their payslip.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, method: 'Bank Transfer' as any, integrateWithPayroll: false }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      paymentForm.method !== 'Payroll'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-200 dark:ring-emerald-800'
                        : 'border-slate-200 dark:border-slate-700 bg-card hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Direct Payout</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">Pay immediately via bank transfer, UPI, or cash.</p>
                  </button>
                </div>
              </div>

              {/* Direct Payout Options */}
              {paymentForm.method !== 'Payroll' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Payment Method</label>
                    <select
                      value={paymentForm.method}
                      onChange={e => setPaymentForm(prev => ({ ...prev, method: e.target.value as any }))}
                      className="w-full h-[35px] px-3 bg-card border border-border rounded-sm outline-none hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash Payout</option>
                      <option value="Other">Other Gateway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Transaction Reference / UTR Number <span className="text-red-500 dark:text-red-400">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UTR89327498"
                      value={paymentForm.reference}
                      onChange={e => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                      className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900"
                    />
                  </div>
                </>
              )}

              {/* Payroll Route Info */}
              {paymentForm.method === 'Payroll' && (
                <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 flex gap-3 text-xs">
                  <Landmark className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-violet-800 block">Payroll Integration Mode</span>
                    <p className="text-violet-600 mt-1">This claim will be tagged as <strong>"Pending Payroll"</strong> and the reimbursement amount will be automatically added as an earning line item in the employee's next payslip when you run payroll.</p>
                    <p className="text-violet-500 mt-1">No manual reference number is needed — the payroll run will auto-generate a reference (e.g., PAYROLL-[ID]).</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={processClaimPayment}
                className={`font-bold px-5 py-2.5 rounded-lg shadow transition ${
                  paymentForm.method === 'Payroll'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {paymentForm.method === 'Payroll' ? '📋 Send to Payroll' : '💰 Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Document Preview Overlay */}
      {isBatchModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Reconcile Batch Payment</h3>
                <p className="text-xs text-muted-foreground">Mark {selectedClaims.length} selected claims as Paid</p>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Master Transaction Reference / UTR</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BULK-UTR-89327498"
                  value={batchMasterUtr}
                  onChange={e => setBatchMasterUtr(e.target.value)}
                  className="w-full p-2 bg-card border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900"
                />
                <p className="text-xs text-muted-foreground mt-2">This UTR will be applied to all {selectedClaims.length} claims in this batch.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsBatchModalOpen(false)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-lg transition">
                Cancel
              </button>
              <button onClick={processBatchPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg shadow transition">
                Mark Batch as Paid
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {receiptPreviewPortal}

      <RejectReasonDialog
        isOpen={!!rejectClaimTarget}
        onClose={() => setRejectClaimTarget(null)}
        onConfirm={(reason) => {
          if (rejectClaimTarget) {
            rejectClaim(rejectClaimTarget.id, reason);
            setRejectClaimTarget(null);
          }
        }}
        title="Reject Reimbursement Claim"
        description={`Please state the reason for rejecting claim "${rejectClaimTarget?.title || 'Expense Claim'}".`}
      />

      <ConfirmationDialog
        isOpen={!!deletePolicyTarget}
        onClose={() => setDeletePolicyTarget(null)}
        onConfirm={confirmDeletePolicy}
        title="Delete Reimbursement Policy?"
        description={`Are you sure you want to delete policy "${deletePolicyTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete Policy"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationDialog
        isOpen={!!deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete Expense Category?"
        description={`Are you sure you want to delete category "${deleteCategoryTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        open={showCancelClaimConfirm}
        title="Discard Reimbursement Request?"
        message="Are you sure you want to cancel? Any receipt details and line items added to this claim will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelClaimConfirm(false);
          setIsCreateModalOpen(false);
          setEditingClaimId(null);
          setEditingItemIdx(null);
          setIsAddingNewItem(false);
          setNewClaim({ policyId: '', category: '', comments: '', items: [] });
        }}
        onCancel={() => setShowCancelClaimConfirm(false)}
      />

      <ConfirmDialog
        open={showCancelPolicyConfirm}
        title={editingPolicyId ? "Discard Policy Changes?" : "Discard New Reimbursement Policy?"}
        message="Are you sure you want to cancel? Any policy rules and threshold details entered in this form will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelPolicyConfirm(false);
          closePolicyEditor();
        }}
        onCancel={() => setShowCancelPolicyConfirm(false)}
      />

      <ConfirmDialog
        open={showCancelCategoryConfirm}
        title={editingCategoryId ? "Discard Category Changes?" : "Discard New Expense Category?"}
        message="Are you sure you want to cancel? Any category ceiling limit details entered in this form will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelCategoryConfirm(false);
          closeCategoryEditor();
        }}
        onCancel={() => setShowCancelCategoryConfirm(false)}
      />
    </div>
  );
}


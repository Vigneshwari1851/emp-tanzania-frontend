import { EditSalaryComponent } from './EditSalaryComponent';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { usePayroll, type SalaryComponent, type SalaryStructure } from '../context/PayrollContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/payroll-lib/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/payroll-lib/tabs';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Select as PayrollSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import Select from "@/shared/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/payroll-lib/table';
import { ArrowLeft, Plus, Trash2, Edit, Pencil, Receipt, Landmark, Save, Building2, Calculator, Download, FileText, BarChart3, Users, DollarSign, Lock, Briefcase, TrendingUp, Settings, Calendar, Search, Inbox, AlertTriangle, Loader2, Info, CheckCircle2, ChevronDown, ChevronUp, X, Eye, FileCheck} from 'lucide-react';
import { Badge } from '@/shared/components/ui/payroll-lib/badge';
import { toast } from 'sonner';
import { getRoles, type Role } from '@/features/rbac/services/roles';
import { getDepartments } from '@/features/organization/services/departments';
import * as payrollService from '../services/payroll';
import axiosInstance from '@/shared/services/axiosInstance';

import { PayrollReportsTab } from './PayrollReportsTab';
import { TaxDeclarationApprovalHub } from '../components/TaxDeclarationApprovalHub';
import PayeBandManager from '../components/PayeBandManager';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';
import { cn } from '@/shared/components/ui/utils';
import { PageHeader } from '@/shared/components/ui/PageHeader';

interface StatutoryInputFieldProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  focusColorClass?: string;
  isLockedDefault?: boolean;
  legalDefaultValue?: string;
  tooltipText?: string;
  readOnly?: boolean;
}

const StatutoryInputField = ({
  label,
  value,
  onChange,
  type = "number",
  step,
  placeholder,
  focusColorClass = "focus:border-primary",
  isLockedDefault = false,
  legalDefaultValue,
  tooltipText,
  readOnly = false
}: StatutoryInputFieldProps) => {
  return (
    <div className="space-y-1 text-left">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</Label>
          {tooltipText && (
            <span title={tooltipText}>
              <Info className="size-3.5 text-muted-foreground/60 cursor-help" />
            </span>
          )}
        </div>
        {isLockedDefault && legalDefaultValue && (
          <span className="text-[10px] font-semibold text-amber-700/80 dark:text-amber-300/80 flex items-center gap-1 bg-amber-50/50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
            <Lock className="size-3" /> {legalDefaultValue}
          </span>
        )}
      </div>
      <div className="relative group">
        <Input
          type={type}
          step={step}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "transition-all duration-200 text-sm h-9 font-medium",
            readOnly && "bg-muted/30 border-transparent shadow-none cursor-default opacity-80 focus:ring-0",
            !readOnly && (isLockedDefault ? "border-amber-200/60 bg-amber-50/10 hover:border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-200" : focusColorClass)
          )}
        />
      </div>
    </div>
  );
};

export function PayrollSetup() {
  const { currencySymbol, isTanzania, isIndia, isUSA, isSingapore, isUAE, country } = useCurrency();
  const navigate = useOrgNavigate();
  const {
    employees,
    salaryStructures,
    salaryComponents,
    groups: payrollGroups,
    taxSections,
    reimbTypes,
    categories,
    payCycle,
    addSalaryStructure,
    updateSalaryStructure,
    removeSalaryStructure,
    addSalaryComponent,
    addCategory,
    updateCategory,
    removeTaxSection,
    addTaxSection,
    updateTaxSection,
    removeReimbursementType,
    addReimbursementType,
    updateReimbursementType,
    removeSalaryComponent,
    removeCategory,
    updatePayCycle,
    removeGroup,
    addGroup,
    updateGroup,
    isLoading,
    setSalaryComponents,
  } = usePayroll();

  const [addingComponents, setAddingComponents] = useState<Record<string, boolean>>({});
  const [isPopulatingDefaults, setIsPopulatingDefaults] = useState(false);

  const [draftCycle, setDraftCycle] = useState(payCycle);
  useEffect(() => {
    setDraftCycle(payCycle);
  }, [payCycle]);

  const now = new Date();
  const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const maxCycleDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const clampCycleDay = (raw: string) => Math.min(Number(raw.replace(/\D/g, '').slice(0, 2)) || 0, maxCycleDay);

  const COUNTRY_DEFAULTS: Record<string, { name: string; type: 'earning' | 'deduction'; calculationType: 'fixed' | 'percentage'; value: number; isTaxable: boolean; isStatutory: boolean }[]> = {
    'india': [
      { name: 'Basic Salary', type: 'earning', calculationType: 'percentage', value: 50, isTaxable: true, isStatutory: true },
      { name: 'House Rent Allowance (HRA)', type: 'earning', calculationType: 'percentage', value: 40, isTaxable: true, isStatutory: false },
      { name: 'Special Allowance', type: 'earning', calculationType: 'percentage', value: 10, isTaxable: true, isStatutory: false },
      { name: 'Employee Provident Fund (EPF)', type: 'deduction', calculationType: 'percentage', value: 12, isTaxable: false, isStatutory: true },
      { name: 'Professional Tax', type: 'deduction', calculationType: 'fixed', value: 200, isTaxable: false, isStatutory: true }
    ],
    'usa': [
      { name: 'Basic Salary', type: 'earning', calculationType: 'percentage', value: 70, isTaxable: true, isStatutory: true },
      { name: 'Housing Allowance', type: 'earning', calculationType: 'fixed', value: 1000, isTaxable: true, isStatutory: false },
      { name: 'FICA Social Security', type: 'deduction', calculationType: 'percentage', value: 6.2, isTaxable: false, isStatutory: true },
      { name: 'FICA Medicare', type: 'deduction', calculationType: 'percentage', value: 1.45, isTaxable: false, isStatutory: true },
      { name: 'Federal Income Tax (FIT)', type: 'deduction', calculationType: 'percentage', value: 10, isTaxable: false, isStatutory: true }
    ],
    'singapore': [
      { name: 'Basic Salary', type: 'earning', calculationType: 'percentage', value: 80, isTaxable: true, isStatutory: true },
      { name: 'Transport Allowance', type: 'earning', calculationType: 'fixed', value: 200, isTaxable: false, isStatutory: false },
      { name: 'CPF Employee Share', type: 'deduction', calculationType: 'percentage', value: 20, isTaxable: false, isStatutory: true }
    ],
    'uae': [
      { name: 'Basic Salary', type: 'earning', calculationType: 'percentage', value: 60, isTaxable: false, isStatutory: false },
      { name: 'Housing Allowance', type: 'earning', calculationType: 'percentage', value: 30, isTaxable: false, isStatutory: false },
      { name: 'Transport Allowance', type: 'earning', calculationType: 'percentage', value: 10, isTaxable: false, isStatutory: false },
      { name: 'Health Insurance Premium', type: 'deduction', calculationType: 'fixed', value: 500, isTaxable: false, isStatutory: false }
    ],
    'uk': [
      { name: 'Basic Salary', type: 'earning', calculationType: 'percentage', value: 100, isTaxable: true, isStatutory: true },
      { name: 'PAYE Income Tax', type: 'deduction', calculationType: 'percentage', value: 20, isTaxable: false, isStatutory: true },
      { name: 'National Insurance', type: 'deduction', calculationType: 'percentage', value: 8, isTaxable: false, isStatutory: true }
    ],
    'tanzania': [
      { name: 'Basic Salary', type: 'earning', calculationType: 'percentage', value: 100, isTaxable: true, isStatutory: true },
      { name: 'PAYE Tax', type: 'deduction', calculationType: 'percentage', value: 9, isTaxable: false, isStatutory: true },
      { name: 'NSSF Pension', type: 'deduction', calculationType: 'percentage', value: 10, isTaxable: false, isStatutory: true }
    ]
  };

  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [structureName, setStructureName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const allRolesRef = React.useRef<Role[]>([]);
  const [structureLevel, setStructureLevel] = useState<'role' | 'employee'>('role');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [grade, setGrade] = useState('');
  const [annualCtc, setAnnualCtc] = useState('');

  const [catView, setCatView] = useState<'list' | 'form'>('list');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [componentView, setComponentView] = useState<'list' | 'form'>('list');
  const [structureView, setStructureView] = useState<'list' | 'form'>('list');
  const [structureSearch, setStructureSearch] = useState('');
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [selectedPTState, setSelectedPTState] = useState('Maharashtra');
  const [catForm, setCatForm] = useState({ name: '', frequency: 'Monthly', payDay: '1st of Month', status: true });
  const [customPayDay, setCustomPayDay] = useState('');
  const [viewingStructure, setViewingStructure] = useState<SalaryStructure | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);

  // Reports state
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportEmployeeId, setReportEmployeeId] = useState('');
  const [form16Data, setForm16Data] = useState<any>(null);
  const [loadingForm16, setLoadingForm16] = useState(false);
  const [componentSearch, setComponentSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupView, setGroupView] = useState<'list' | 'form'>('list');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    deptId: 'all',
    locationId: 'all',
    gender: 'all',
    employmentType: 'all',
    salaryStructure: '',
    paymentCategory: '',
  });
  const [groupOptions, setGroupOptions] = useState({
    roles: [] as any[],
    departments: [] as any[],
    locations: [] as any[],
  });
  const [groupOptionsLoaded, setGroupOptionsLoaded] = useState(false);

  const [taxView, setTaxView] = useState<'list' | 'form'>('list');
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState({ code: '', label: '', limit: 0 });
  const [taxInstruments, setTaxInstruments] = useState<string[]>([]);
  const [taxTagInput, setTaxTagInput] = useState('');
  const [isCustomTaxCode, setIsCustomTaxCode] = useState(false);
  const taxTagInputRef = useRef<HTMLInputElement>(null);

  const [reimbView, setReimbView] = useState<'list' | 'form'>('list');
  const [editingReimbId, setEditingReimbId] = useState<string | null>(null);
  const [reimbForm, setReimbForm] = useState({ name: '', limit: 0, frequency: 'Monthly', payrollGroupId: '' });

  // Reimbursement settings & queue state
  const [reimbDefaultPaymentMode, setReimbDefaultPaymentMode] = useState('Salary Payroll');
  const [reimbFinanceCanChange, setReimbFinanceCanChange] = useState('true');
  const [readyClaims, setReadyClaims] = useState<any[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [viewingClaimDetail, setViewingClaimDetail] = useState<any>(null);
  const [processingClaim, setProcessingClaim] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');

  const resetReimbForm = () => { setReimbForm({ name: '', limit: 0, frequency: 'Monthly', payrollGroupId: '' }); setEditingReimbId(null); };
  const openReimbForm = (rt?: any) => { if (rt) { setEditingReimbId(rt.id); setReimbForm({ name: rt.label || rt.type, limit: rt.limit, frequency: rt.period, payrollGroupId: rt.payrollGroupId || '' }); } else { resetReimbForm(); } setReimbView('form'); };
  const handleSaveReimb = async () => {
    if (!reimbForm.name.trim()) return toast.error('Reimbursement name is required');
    try {
      if (editingReimbId) { await updateReimbursementType(editingReimbId, { type: reimbForm.name.replace(/\s+/g, '_').toUpperCase(), label: reimbForm.name, limit: reimbForm.limit, period: reimbForm.frequency, payroll_group_id: reimbForm.payrollGroupId === 'all' || !reimbForm.payrollGroupId ? null : reimbForm.payrollGroupId }); toast.success('Reimbursement updated'); }
      else { await addReimbursementType({ type: reimbForm.name.replace(/\s+/g, '_').toUpperCase(), label: reimbForm.name, limit: reimbForm.limit, period: reimbForm.frequency, payroll_group_id: reimbForm.payrollGroupId === 'all' || !reimbForm.payrollGroupId ? null : reimbForm.payrollGroupId }); toast.success('Reimbursement created'); }
      resetReimbForm(); setReimbView('list');
    } catch { toast.error('Failed to save reimbursement'); }
  };

  const getLocations = async () => {
    const { getOrganizations } = await import('@/features/organization/services/organizations');
    const orgs = await getOrganizations();
    const normalizedOrgs = Array.isArray(orgs) ? orgs : (orgs ? [orgs] : []);
    const locations: any[] = [];
    normalizedOrgs.forEach((org: any) => {
      const branches = org.branches || org.branch || [];
      if (Array.isArray(branches)) {
        branches.forEach((b: any) => {
          locations.push({ id: b.id.toString(), name: b.branch_name || b.location_name });
        });
      }
    });
    return locations;
  };

  const loadGroupOptions = async () => {
    if (groupOptionsLoaded) return;
    try {
      const [r, d, l] = await Promise.all([getRoles(), getDepartments(), getLocations()]);
      const uniqueRolesList = (r || []).filter((role: any, idx: number, self: any[]) => {
        const name = (role.role_name || role.name || '').toLowerCase().trim();
        return self.findIndex(x => (x.role_name || x.name || '').toLowerCase().trim() === name) === idx;
      });
      setGroupOptions({ roles: uniqueRolesList, departments: d || [], locations: l || [] });
      setGroupOptionsLoaded(true);
    } catch (err) {
      console.error("Failed to load group options", err);
    }
  };

  const resetGroupForm = () => {
    setGroupForm({ name: '', deptId: 'all', locationId: 'all', gender: 'all', employmentType: 'all', salaryStructure: '', paymentCategory: '' });
    setEditingGroupId(null);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return toast.error('Group name is required');
    const isDuplicate = payrollGroups.some(g => g.name.toLowerCase() === groupForm.name.trim().toLowerCase() && g.id !== editingGroupId);
    if (isDuplicate) return toast.error(`Group "${groupForm.name}" already exists`);
    try {
      const criteria = { deptId: groupForm.deptId, locationId: groupForm.locationId, gender: groupForm.gender, employmentType: groupForm.employmentType };
      const data = { name: groupForm.name, criteria: JSON.stringify(criteria), salaryStructureId: groupForm.salaryStructure, paymentCategoryId: groupForm.paymentCategory };
      if (editingGroupId) {
        await updateGroup(editingGroupId, data);
        toast.success('Payroll group updated');
      } else {
        await addGroup(data);
        toast.success('Payroll group created');
      }
      resetGroupForm();
      setGroupView('list');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payroll group');
    }
  };

  const openGroupForm = (group?: any) => {
    loadGroupOptions();
    if (group) {
      let criteria: any = { deptId: 'all', locationId: 'all', gender: 'all', employmentType: 'all' };
      try {
        if (typeof group.criteria === 'string' && group.criteria.startsWith('{')) criteria = { ...criteria, ...JSON.parse(group.criteria) };
        else if (typeof group.criteria === 'object') criteria = { ...criteria, ...group.criteria };
      } catch (e) {}
      setGroupForm({
        name: group.name,
        deptId: criteria.deptId?.toString() || 'all',
        locationId: criteria.locationId?.toString() || 'all',
        gender: criteria.gender || 'all',
        employmentType: criteria.employmentType || 'all',
        salaryStructure: group.structureId || '',
        paymentCategory: group.paymentCategoryId || '',
      });
      setEditingGroupId(group.id);
    } else {
      resetGroupForm();
    }
    setGroupView('form');
  };

  interface DefaultTaxSection { code: string; label: string; limit: number; instruments: string[]; }
  const COUNTRY_TAX_SECTIONS: Record<string, DefaultTaxSection[]> = {
    'india': [
      { code: '80C', label: 'Savings & Investments', limit: 150000, instruments: ['PPF', 'ELSS', 'LIC Premium', 'Home Loan Principal', 'Tuition Fees', 'NSC', 'Tax Saver FD', 'Sukanya Samriddhi', 'ULIP'] },
      { code: '80CCD(1B)', label: 'NPS Contribution', limit: 50000, instruments: ['NPS – Tier I'] },
      { code: '80D', label: 'Health Insurance', limit: 50000, instruments: ['Health Insurance (Self/Family)', 'Health Insurance (Parents)', 'Preventive Health Check-up'] },
      { code: '80E', label: 'Education Loan Interest', limit: 0, instruments: ['Education Loan Interest'] },
      { code: '24B', label: 'Home Loan Interest', limit: 200000, instruments: ['Home Loan Interest'] },
      { code: '80G', label: 'Charitable Donations', limit: 0, instruments: ['PM Relief Fund', 'Approved Institutions', 'Other Donations'] },
      { code: '80TTA', label: 'Savings Bank Interest', limit: 10000, instruments: ['Savings Bank Interest'] },
      { code: '80GG', label: 'Rent Paid (No HRA)', limit: 0, instruments: ['Rent Paid'] },
      { code: '10(13A)', label: 'HRA Exemption', limit: 0, instruments: ['House Rent Allowance'] },
    ],
    'usa': [
      { code: '401(k)', label: '401(k) Contributions', limit: 23500, instruments: ['401(k) – Traditional', '401(k) – Roth'] },
      { code: 'IRA', label: 'IRA Contributions', limit: 7000, instruments: ['Traditional IRA', 'Roth IRA', 'SEP IRA'] },
      { code: 'HSA', label: 'Health Savings Account', limit: 4150, instruments: ['HSA – Individual', 'HSA – Family'] },
      { code: 'FSA', label: 'Flexible Spending Account', limit: 3200, instruments: ['Health FSA', 'Dependent Care FSA'] },
      { code: 'SLI', label: 'Student Loan Interest', limit: 2500, instruments: ['Student Loan Interest'] },
      { code: 'MI', label: 'Mortgage Interest', limit: 0, instruments: ['Mortgage Interest Deduction'] },
      { code: 'CHARITY', label: 'Charitable Contributions', limit: 0, instruments: ['Cash Donations', 'Non-Cash Donations'] },
    ],
    'singapore': [
      { code: 'CPF', label: 'CPF Contributions', limit: 0, instruments: ['CPF – Employee', 'CPF – Employer'] },
      { code: 'EIR', label: 'Earned Income Relief', limit: 0, instruments: ['Earned Income Relief'] },
      { code: 'CFR', label: 'Course Fees Relief', limit: 5500, instruments: ['Course Fees'] },
      { code: 'NSR', label: 'NSman Relief', limit: 0, instruments: ['NSman Relief'] },
      { code: 'SRS', label: 'Supplementary Retirement Scheme', limit: 15300, instruments: ['SRS Contribution'] },
    ],
    'uae': [{ code: 'N/A', label: 'No Income Tax', limit: 0, instruments: [] }],
    'uk': [
      { code: 'ISA', label: 'ISA Allowance', limit: 20000, instruments: ['Cash ISA', 'Stocks & Shares ISA', 'Lifetime ISA'] },
      { code: 'Pension', label: 'Pension Contributions', limit: 60000, instruments: ['Workplace Pension', 'Personal Pension', 'SIPP'] },
      { code: 'GIFTAID', label: 'Gift Aid', limit: 0, instruments: ['Gift Aid Donations'] },
      { code: 'MA', label: 'Marriage Allowance', limit: 1260, instruments: ['Marriage Allowance'] },
      { code: 'SLI', label: 'Student Loan Interest', limit: 0, instruments: ['Student Loan Repayment'] },
    ],
    'tanzania': [
      { code: 'PR', label: 'Personal Relief', limit: 0, instruments: ['Personal Relief'] },
      { code: 'IR', label: 'Insurance Relief', limit: 0, instruments: ['Life Insurance', 'Health Insurance'] },
      { code: 'MIR', label: 'Mortgage Interest Relief', limit: 0, instruments: ['Mortgage Interest'] },
      { code: 'DPR', label: 'Disabled Person Relief', limit: 0, instruments: ['Disability Certificate'] },
    ],
  };
  const taxDefaults = COUNTRY_TAX_SECTIONS[(country || 'india').toLowerCase()] || COUNTRY_TAX_SECTIONS['india'];

  const resetTaxForm = () => {
    setTaxForm({ code: '', label: '', limit: 0 });
    setTaxInstruments([]);
    setTaxTagInput('');
    setIsCustomTaxCode(false);
    setEditingTaxId(null);
  };

  const openTaxForm = (sec?: any) => {
    if (sec) {
      const isKnown = taxDefaults.some(d => d.code === sec.section);
      setIsCustomTaxCode(!isKnown);
      setTaxForm({ code: sec.section, label: sec.label, limit: sec.limit });
      setTaxInstruments(sec.instruments || []);
      setEditingTaxId(sec.id);
    } else {
      resetTaxForm();
    }
    setTaxView('form');
  };

  const handleTaxCodeSelect = (code: string) => {
    if (code === '__custom__') {
      setIsCustomTaxCode(true);
      setTaxForm({ code: '', label: '', limit: 0 });
      setTaxInstruments([]);
      return;
    }
    setIsCustomTaxCode(false);
    const match = taxDefaults.find(d => d.code === code);
    if (match) {
      setTaxForm({ code: match.code, label: match.label, limit: match.limit });
      setTaxInstruments(match.instruments);
    }
  };

  const addTaxTag = (value?: string) => {
    const raw = (value ?? taxTagInput).trim();
    if (!raw) return;
    const newTags = raw.split(',').map(t => t.trim()).filter(t => t.length > 0 && !taxInstruments.includes(t));
    if (newTags.length > 0) setTaxInstruments(prev => [...prev, ...newTags]);
    setTaxTagInput('');
  };

  const removeTaxTag = (tag: string) => {
    setTaxInstruments(prev => prev.filter(t => t !== tag));
  };

  const handleTaxTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTaxTag(); }
    if (e.key === 'Backspace' && !taxTagInput && taxInstruments.length > 0) removeTaxTag(taxInstruments[taxInstruments.length - 1]);
  };

  const handleSaveTaxSection = async () => {
    if (!taxForm.code || !taxForm.label) return toast.error('Code and Label are required');
    const isDuplicate = taxSections.some(s => s.section.toLowerCase() === taxForm.code.trim().toLowerCase() && s.id !== editingTaxId);
    if (isDuplicate) return toast.error(`Tax Section "${taxForm.code}" already exists`);
    try {
      const data = { section: taxForm.code, label: taxForm.label, limit: taxForm.limit, instruments: taxInstruments };
      if (editingTaxId) {
        await updateTaxSection(editingTaxId, data);
        toast.success('Tax section updated');
      } else {
        await addTaxSection(data);
        toast.success('Tax section created');
      }
      resetTaxForm();
      setTaxView('list');
    } catch (error) {
      toast.error('Failed to save tax section');
    }
  };

  // Statutory Settings state
  const [statutorySettings, setStatutorySettings] = useState<any[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEditingStatutory, setIsEditingStatutory] = useState(false);

  const fetchStatutorySettings = async () => {
    try {
      const response = await axiosInstance.get('/payroll/system-settings');
      if (response.data?.success) {
        const settings = response.data.data || [];
        setStatutorySettings(settings);
        
        const defaultModeSetting = settings.find((s: any) => s.key === 'reimb_default_payment_mode');
        if (defaultModeSetting) setReimbDefaultPaymentMode(defaultModeSetting.value);
        
        const financeCanChangeSetting = settings.find((s: any) => s.key === 'reimb_finance_can_change');
        if (financeCanChangeSetting) setReimbFinanceCanChange(financeCanChangeSetting.value);
      }
    } catch (err) {
      console.error("Failed to load statutory settings", err);
    }
  };

  const saveReimbSettings = async (defaultMode: string, financeCanChange: string) => {
    try {
      const updatedSettings = [...statutorySettings];
      
      const modeIdx = updatedSettings.findIndex(s => s.key === 'reimb_default_payment_mode');
      if (modeIdx > -1) {
        updatedSettings[modeIdx] = { ...updatedSettings[modeIdx], value: defaultMode };
      } else {
        updatedSettings.push({ key: 'reimb_default_payment_mode', value: defaultMode, group: 'Reimbursement' });
      }
      
      const changeIdx = updatedSettings.findIndex(s => s.key === 'reimb_finance_can_change');
      if (changeIdx > -1) {
        updatedSettings[changeIdx] = { ...updatedSettings[changeIdx], value: financeCanChange };
      } else {
        updatedSettings.push({ key: 'reimb_finance_can_change', value: financeCanChange, group: 'Reimbursement' });
      }
      
      setStatutorySettings(updatedSettings);
      
      const response = await axiosInstance.post('/payroll/system-settings', updatedSettings);
      if (response.data?.success) {
        toast.success('Reimbursement configuration saved successfully!');
      } else {
        toast.error(response.data?.message || 'Failed to save reimbursement settings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving reimbursement settings');
    }
  };

  const fetchReadyClaims = async () => {
    setIsLoadingClaims(true);
    try {
      const response = await axiosInstance.get('/payroll/reimbursements/ready-to-pay');
      if (response.data?.success) {
        setReadyClaims(response.data.data || []);
      }
    } catch (err: any) {
      toast.error('Failed to load ready to pay reimbursements');
    } finally {
      setIsLoadingClaims(false);
    }
  };

  const handleUpdatePaymentMode = async (claimId: number, mode: string) => {
    try {
      const response = await axiosInstance.patch(`/payroll/reimbursements/${claimId}/payment-mode`, { paymentMode: mode });
      if (response.data?.success) {
        toast.success('Payment mode updated successfully!');
        setReadyClaims(prev => prev.map(c => c.id === claimId ? { ...c, payment_mode: mode } : c));
      } else {
        toast.error(response.data?.message || 'Failed to update payment mode');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating payment mode');
    }
  };

  const handleProcessPayment = async () => {
    if (!processingClaim) return;
    try {
      const response = await axiosInstance.post(`/payroll/reimbursements/${processingClaim.id}/pay`, {
        paymentReference: paymentRef,
        paymentDate: paymentDate
      });
      if (response.data?.success) {
        toast.success('Payment recorded successfully!');
        setIsPayModalOpen(false);
        setProcessingClaim(null);
        fetchReadyClaims();
      } else {
        toast.error(response.data?.message || 'Failed to record payment');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing payment');
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setStatutorySettings(prev => {
      const index = prev.findIndex(s => s.key === key);
      if (index > -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], value };
        return updated;
      }
      return [...prev, { key, value }];
    });
  };

  const getSlabs = (key: string): [number, number | null, number][] => {
    const raw = statutorySettings.find(s => s.key === key)?.value;
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const handleSlabChange = (key: string, index: number, fieldIndex: number, value: string) => {
    const current = getSlabs(key);
    if (!current[index]) return;
    
    let parsed: any = parseFloat(value);
    if (fieldIndex === 1 && (value === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'infinity')) {
      parsed = null;
    } else if (isNaN(parsed)) {
      parsed = 0;
    }

    if (fieldIndex === 2) {
      parsed = parsed / 100;
    }

    current[index]![fieldIndex] = parsed;

    setStatutorySettings(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx]!, value: JSON.stringify(current) };
        return updated;
      }
      return [...prev, { key, value: JSON.stringify(current) }];
    });
  };

  const addSlab = (key: string) => {
    const current = getSlabs(key);
    const lastSlab = current[current.length - 1];
    const newMin = lastSlab ? (lastSlab[1] || 0) : 0;
    current.push([newMin, null, 0]);

    setStatutorySettings(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx]!, value: JSON.stringify(current) };
        return updated;
      }
      return [...prev, { key, value: JSON.stringify(current) }];
    });
  };

  const removeSlab = (key: string, index: number) => {
    const current = getSlabs(key);
    current.splice(index, 1);

    setStatutorySettings(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx]!, value: JSON.stringify(current) };
        return updated;
      }
      return prev;
    });
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await axiosInstance.post('/payroll/system-settings', statutorySettings);
      if (response.data?.success) {
        toast.success('Statutory settings saved successfully!');
        fetchStatutorySettings();
      } else {
        toast.error(response.data?.message || 'Failed to save settings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving');
    } finally {
      setIsSavingSettings(false);
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesData = await getRoles();
        allRolesRef.current = rolesData || [];
        const unique = (rolesData || []).filter((role, idx, self) => {
          if (!role.name) return false;
          const nameLower = role.name.toLowerCase().trim();
          return self.findIndex(x => x.name?.toLowerCase().trim() === nameLower) === idx;
        });
        setRoles(unique);
      } catch (err) {
        toast.error('Failed to fetch criteria data');
      }
    };
    fetchData();
    fetchStatutorySettings();
    fetchReadyClaims();
  }, []);


  if (isLoading) {
    return (
      <div className="w-full min-w-0 space-y-6 animate-pulse">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-72 bg-muted rounded-lg" />
            <div className="h-4 w-96 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-8 w-full">
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-5">
              <div className="space-y-3">
                {[1,2,3,4,5,6,7,8,9].map(i => (
                  <div key={i} className="h-9 bg-muted rounded-lg" />
                ))}
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {[1,2].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="h-16 bg-muted/40 border-b border-border" />
                <div className="p-6 space-y-4">
                  {[1,2,3].map(j => (
                    <div key={j} className="h-12 bg-muted rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setStructureName('');
    setRoleId('');
    setSelectedEmployee('');
    // Pre-select all default components for new structures
    const defaults = salaryComponents.filter(c => c.isDefault).map(c => ({ ...c, id: `struct-${Date.now()}-${c.id}` }));
    setComponents(defaults);
    setEditingId(null);
    setGrade('');
    setAnnualCtc('');
  };

  const handleEdit = (structure: SalaryStructure) => {
    setStructureName(structure.name);
    setStructureLevel(structure.level);
    if (structure.level === 'role') {
      const matchingUniqueRole = roles.find(r => r.id.toString() === structure.roleId?.toString()) 
        || roles.find(r => {
             const originalRoleName = allRolesRef.current.find(o => o.id.toString() === structure.roleId?.toString())?.name;
             return originalRoleName && r.name.toLowerCase().trim() === originalRoleName.toLowerCase().trim();
           });
      setRoleId(matchingUniqueRole?.id.toString() || structure.roleId || '');
      setSelectedEmployee('');
    } else {
      setSelectedEmployee(structure.employeeId || '');
      setRoleId('');
    }
    // Merge: existing structure components + any default components not already included
    const existing = structure.components || [];
    const defaults = salaryComponents.filter(c => c.isDefault);
    const merged = [...existing];
    for (const d of defaults) {
      if (!merged.some(c => c.name === d.name)) {
        merged.push({ ...d, id: `struct-${Date.now()}-${d.id}` });
      }
    }
    setComponents(merged);
    setEditingId(structure.id);
    setGrade(structure.grade || '');
    setAnnualCtc(structure.ctc?.toString() || '');

    setStructureView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Editing: ${structure.name}`);
  };


  const toggleComponent = (comp: SalaryComponent) => {
    const isSelected = components.some(c => c.name === comp.name);
    if (isSelected) {
      // Default components cannot be removed from a structure
      if (comp.isDefault) {
        toast.info('Default components are always included and cannot be removed.');
        return;
      }
      setComponents(components.filter(c => c.name !== comp.name));
      toast.info(`Removed ${comp.name}`);
    } else {
      setComponents([...components, { ...comp, id: `struct-${Date.now()}-${comp.id}` }]);
      toast.success(`Added ${comp.name}`);
    }
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id));
  };
  const handleSaveSalaryStructure = () => {

    const isDuplicate = salaryStructures.some(s =>
      s.name.toLowerCase().trim() === structureName.toLowerCase().trim() && s.id !== editingId
    );

    if (isDuplicate) {
      toast.error('A salary structure with this name already exists. Duplicate names are not allowed.');
      return;
    }

    const commonData = {
      name: structureName,
      components,
      grade,
      ctc: annualCtc ? parseFloat(annualCtc) : 0,
    };

    let structure: SalaryStructure;

    if (structureLevel === 'role') {
      if (!structureName || !roleId || components.length === 0) return;
      structure = {
        ...commonData,
        id: editingId || Date.now().toString(),
        roleId,
        level: 'role',
      };
    } else {
      if (!structureName || components.length === 0) return;
      structure = {
        ...commonData,
        id: editingId || Date.now().toString(),
        employeeId: selectedEmployee, // Still keeping the state value, but the UI is gone
        level: 'employee',
      };
    }

    if (editingId) {
      updateSalaryStructure(editingId, structure);
      toast.success('Salary structure updated successfully');
    } else {
      addSalaryStructure(structure);
      toast.success('Salary structure saved successfully');
    }
    resetForm();
  };

  const resetCatForm = () => { setCatForm({ name: '', frequency: 'Monthly', payDay: '1st of Month', status: true }); setCustomPayDay(''); setEditingCatId(null); };
  const openCatForm = (cat?: any) => { if (cat) { setEditingCatId(cat.id); setCatForm({ name: cat.name, frequency: cat.frequency || 'Monthly', payDay: cat.payDay || '1st of Month', status: cat.status !== false }); } else { resetCatForm(); } setCatView('form'); };

  const saveCategory = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    const payload = { ...catForm, payDay: catForm.payDay === 'Custom' ? customPayDay : catForm.payDay };
    if (catForm.payDay === 'Custom' && !customPayDay.trim()) { toast.error('Please enter a custom pay day'); return; }
    try {
      if (editingCatId) { await updateCategory(editingCatId, payload); toast.success('Category updated'); }
      else { await addCategory(payload); toast.success('Category created'); }
      resetCatForm(); setCatView('list');
    } catch { toast.error('Failed to save category'); }
  };


  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        title="Payroll Setup & Configuration"
        description="Define salary structures, components, and pay cycles"
        icon={<DollarSign className="size-8" />}
        action={
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 border border-border">
            <Info className="size-3.5" />
            <span className="font-medium">Configure each phase sequentially for best results</span>
          </div>
        }
      />

      <Tabs defaultValue="paycycle" className="grid grid-cols-12 gap-8 w-full items-start">
        {/* Left Side: Structured Steps Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-4 text-left select-none">
          <div className="bg-card border border-border rounded-xl p-4 shadow-md space-y-5">
            <div className="px-3 pb-2 border-b border-border">
              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">SETUP WORKFLOW</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Configure payroll sequentially.</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider px-3 block mb-2">Phase 1: Foundations</span>
              <TabsList className="flex flex-col items-stretch bg-transparent h-auto p-0 gap-1 border-none">
                <TabsTrigger 
                  value="paycycle" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <Calendar className="size-4 mr-2" /> 1. Pay Cycle Setup
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider px-3 block mb-2">Phase 2: Salary Engine</span>
              <TabsList className="flex flex-col items-stretch bg-transparent h-auto p-0 gap-1 border-none">
                <TabsTrigger 
                  value="components" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <Settings className="size-4 mr-2" /> 2. Salary Components
                </TabsTrigger>
                <TabsTrigger 
                  value="structures" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <Briefcase className="size-4 mr-2" /> 3. Salary Structures
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider px-3 block mb-2">Phase 3: Groups & Compliance</span>
              <TabsList className="flex flex-col items-stretch bg-transparent h-auto p-0 gap-1 border-none">
                <TabsTrigger 
                  value="groups" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <Users className="size-4 mr-2" /> 4. Payroll Groups
                </TabsTrigger>
                <TabsTrigger 
                  value="statutory-settings" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <Calculator className="size-4 mr-2" /> 5. Statutory & Limits
                </TabsTrigger>
                <TabsTrigger 
                  value="tax-rules" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <Landmark className="size-4 mr-2" /> 6. Tax Setup
                </TabsTrigger>
                <TabsTrigger 
                  value="tax-declarations" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <FileCheck className="size-4 mr-2" /> 7. Tax Verification Hub
                </TabsTrigger>

              </TabsList>
            </div>

            {/* <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider px-3 block mb-2">Phase 4: Policies & Reports</span>
              <TabsList className="flex flex-col items-stretch bg-transparent h-auto p-0 gap-1 border-none">
                <TabsTrigger 
                  value="reports" 
                  className="w-full justify-start text-left py-2.5 px-3 rounded-lg border-none after:hidden data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-l-2 data-[state=active]:border-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all text-xs"
                >
                  <BarChart3 className="size-4 mr-2" /> 8. Reports & Exports
                </TabsTrigger>
              </TabsList>
            </div> */}
          </div>
        </div>

        {/* Right Side: Active Workspace */}
        <div className="col-span-12 lg:col-span-9 space-y-6 min-w-0">

        <TabsContent value="structures" className="space-y-4 pt-1">
          {structureView === 'list' ? (
          <Card className="bg-card shadow-md border-border">
            <CardHeader className="border-b pb-4 text-left">
              <CardTitle className="text-lg flex items-center gap-2">
                Salary Structures
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded ml-2">{country || 'Global'}</span>
              </CardTitle>
              <CardDescription>Manage role and employee level salary structure templates</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-4 flex-1 max-w-md w-full">
                  <div className="relative w-full">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search structures..."
                      value={structureSearch}
                      onChange={(e) => setStructureSearch(e.target.value)}
                      className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border border-border h-10 shrink-0">
                    <Landmark className="size-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{country || 'Not configured'}</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto shrink-0">
                  <Button onClick={() => { resetForm(); setStructureView('form'); }} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg gap-2 cursor-pointer shadow-sm">
                    <Plus className="size-4" />
                    Create Structure
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden shadow-sm bg-card overflow-x-auto">
                <Table className="min-w-[700px] border-collapse">
                  <TableHeader className="bg-muted border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Structure Name</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Level</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Target</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Components</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!salaryStructures || salaryStructures.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-inner">
                              <Inbox className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">No salary structures yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Create your first structure to get started</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : salaryStructures.filter(s => !structureSearch || s.name.toLowerCase().includes(structureSearch.toLowerCase())).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-inner">
                              <Search className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">No matching structures</p>
                              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      salaryStructures.filter(s => !structureSearch || s.name.toLowerCase().includes(structureSearch.toLowerCase())).map((structure) => (
                        <TableRow key={structure.id} className="hover:bg-muted/40 transition-colors border-b">
                          <TableCell className="font-bold text-foreground px-6">{structure.name}</TableCell>
                          <TableCell>
                            <Badge variant={structure.level === 'role' ? 'default' : 'outline'} className={structure.level === 'role' ? 'bg-primary text-white' : 'text-primary border-blue-200 dark:border-blue-800'}>
                              {structure.level === 'role' ? 'Role' : 'Employee'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium text-sm">
                            {structure.level === 'role'
                              ? allRolesRef.current?.find(r => r.id?.toString() === structure.roleId?.toString())?.name || structure.roleId || 'N/A'
                              : employees?.find(e => e.id === structure.employeeId)?.name || structure.employeeId || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary-100">
                              {((structure.components || []).length + salaryComponents.filter(c => c.isDefault && !(structure.components || []).some(x => x.name === c.name)).length)} components
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="View structure"
                                onClick={() => {
                                  setViewingStructure(structure);
                                  setIsViewDrawerOpen(true);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-primaryhover:bg-blue-50 transition-colors"
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Edit structure"
                                onClick={() => handleEdit(structure)}
                                className="h-8 w-8 text-muted-foreground hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <Edit className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Delete structure"
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete the structure "${structure.name}"? This action cannot be undone.`)) {
                                    try {
                                      await removeSalaryStructure(structure.id);
                                      toast.success('Salary structure removed');
                                    } catch (err) {
                                      console.error('Delete error:', err);
                                      toast.error('Failed to remove structure');
                                    }
                                  }
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          ) : (
            <div className="bg-card shadow-md border border-border rounded-xl">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-2 text-left">
                  <button 
                    onClick={() => { resetForm(); setStructureView('list'); }}
                    className="icon-circle-btn"
                  >
                    <ArrowLeft />
                  </button>
                  <div>
                    <h1 className="text-2xl font-semibold text-foreground">{editingId ? 'Edit Structure' : 'Create Salary Structure'}</h1>
                    <p className="text-muted-foreground text-sm">Define a salary structure template for roles or employees</p>
                  </div>
                </div>

                <div className="bg-muted border border-primary-100 rounded-lg p-4 space-y-3 text-left">
                  <div className="relative flex w-full bg-primary rounded-full p-1 h-12 shadow-inner group overflow-hidden border border-blue-700/30">
                    <div
                      className={`absolute top-1 bottom-1 rounded-full bg-card transition-all duration-300 ease-in-out shadow-sm`}
                      style={{
                        width: 'calc(50% - 4px)',
                        left: structureLevel === 'role' ? '4px' : 'calc(50% )'
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (editingId !== null) {
                          toast.error('Level cannot be changed while editing an existing structure');
                          return;
                        }
                        setStructureLevel('role');
                        setSelectedEmployee('');
                      }}
                      className={`flex-1 relative z-10 font-bold text-sm h-full rounded-full transition-colors duration-300 ${structureLevel === 'role' ? 'text-blue-600 dark:text-blue-400' : 'text-white hover:text-white/80'
                        }`}
                    >
                      Role Level
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (editingId !== null) {
                          toast.error('Level cannot be changed while editing an existing structure');
                          return;
                        }
                        setStructureLevel('employee');
                        setRoleId('');
                      }}
                      className={`flex-1 relative z-10 font-bold text-sm h-full rounded-full transition-colors duration-300 ${structureLevel === 'employee' ? 'text-blue-600 dark:text-blue-400' : 'text-white hover:text-white/80'
                        }`}
                    >
                      Employee Level
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
<Card className="border-primary/20 dark:border-primary/40 shadow-sm">
                  <CardHeader className="text-left border-b border-border bg-muted/30">
                        <CardTitle className="text-lg">Basic Information</CardTitle>
                        <CardDescription>Fundamental settings for this salary structure</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4 text-left">
                        <div className="space-y-2">
                          <Label htmlFor="structureName" className="text-xs font-bold text-muted-foreground uppercase">Structure Name <span className="text-rose-500 dark:text-rose-400">*</span></Label>
                          <Input
                            id="structureName"
                            value={structureName}
                            onChange={(e) => setStructureName(e.target.value)}
                            placeholder={structureLevel === 'role' ? 'e.g., Standard Software Engineer' : 'e.g., Custom - Rajesh Kumar'}
                          />
                        </div>

                        {structureLevel === 'role' ? (
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Target Role <span className="text-rose-500 dark:text-rose-400">*</span></Label>
                            <PayrollSelect value={roleId} onValueChange={setRoleId}>
                              <SelectTrigger className="capitalize bg-card">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roles?.map((role) => (
                                  <SelectItem key={role.id} value={role.id?.toString() || '0'} className="capitalize">
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </PayrollSelect>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Target Employee</Label>
                            <PayrollSelect value={selectedEmployee} onValueChange={setSelectedEmployee}>
                              <SelectTrigger className="bg-card">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees?.map(emp => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </PayrollSelect>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="grade" className="text-xs font-bold text-muted-foreground uppercase">Salary Grade</Label>
                            <Input
                              id="grade"
                              value={grade}
                              onChange={(e) => setGrade(e.target.value)}
                              placeholder="e.g., A1, B2"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="annualCtc" className="text-xs font-bold text-muted-foreground uppercase">Annual CTC</Label>
                            <Input
                              id="annualCtc"
                              type="number"
                              value={annualCtc}
                              onChange={(e) => setAnnualCtc(e.target.value)}
                              placeholder="e.g., 600000"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {components.length > 0 && (
                      <Card className="border-primary-100 shadow-sm">
                        <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30 py-3">
                          <CardTitle className="text-base">Selected Components ({components.length})</CardTitle>
                          <CardDescription>Components included in this salary structure</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="rounded-lg border border-border overflow-x-auto shadow-sm bg-muted/50">
                            <Table className="min-w-[500px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12 text-center font-bold text-foreground">#</TableHead>
                                  <TableHead className="font-bold text-foreground">Component Name</TableHead>
                                  <TableHead className="font-bold text-foreground">Type</TableHead>
                                  <TableHead className="text-right font-bold text-foreground">Value</TableHead>
                                  <TableHead className="w-12"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {components?.map((comp, idx) => (
                                  <TableRow key={comp.id} className="group hover:bg-muted/50 border-none">
                                    <TableCell className="text-center font-medium text-muted-foreground text-xs">
                                      {idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">
                                      <div className="flex items-center gap-1.5">
                                        {comp.name}
                                        {comp.isDefault && (
                                          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">Auto</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{comp.calculationType}</p>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={comp.type === 'earning' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 
'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'}>
                                        {comp.type === 'earning' ? 'Earning' : 'Deduction'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-foreground">
                                      {comp.type === 'earning' ? '+' : '-'}{comp.calculationType === 'fixed' ? `${currencySymbol}${comp.value.toLocaleString()}` : `${comp.value}%`}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {comp.isDefault ? (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Locked</span>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeComponent(comp.id);
                                          }}
                                          className="mini-icon-btn-reject"
                                        >
                                          <Trash2 />
                                        </button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Column: Summary + Add Components */}
                  <div className="md:col-span-1 space-y-6">
                    <Card className="border-primary-100 shadow-sm">
                      <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30 py-3">
                        <CardTitle className="text-base">Add Components</CardTitle>
                        <CardDescription>Select custom components to include</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{components.filter(c => !c.isDefault).length} Custom Selected</span>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {(() => {
                            const manualComponents = (salaryComponents || []).filter(c => !c.isDefault);
                            if (manualComponents.length === 0) {
                              return (
                                <div className="text-center py-6">
                                  <p className="text-xs text-muted-foreground">No custom components. Create in Components tab.</p>
                                </div>
                              );
                            }
                            return manualComponents.map((comp) => {
                              const isSelected = components?.some(c => c.name === comp.name);
                              return (
                                <div
                                  key={comp.id}
                                  onClick={() => toggleComponent(comp)}
                                  className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-150 cursor-pointer ${isSelected
                                    ? 'bg-primary/10 border border-primary/30 shadow-sm'
                                    : 'bg-card hover:bg-accent/50 border border-border hover:border-primary/30'
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`size-5 rounded-full border-2 flex items-center justify-center ${isSelected
                                      ? 'bg-primary border-primary text-white'
                                      : 'bg-muted border-muted-foreground/30'
                                      }`}>
                                      {isSelected ? <CheckCircle2 className="size-3" /> : <Plus className="size-3" />}
                                    </div>
                                    <div>
                                      <p className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{comp.name}</p>
                                      <span className="text-[9px] text-muted-foreground">
                                        {comp.calculationType === 'fixed' ? `${currencySymbol}${comp.value}` : `${comp.value}%`} · {comp.type}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => { handleSaveSalaryStructure(); setStructureView('list'); }}
                        className="w-full bg-primary hover:bg-primary/95 py-6 text-base font-bold shadow-sm shadow-primary-100"
                        disabled={!structureName || (structureLevel === 'role' && !roleId) || components.length === 0}
                      >
                        <Save className="size-5 mr-2" />
                        {editingId ? 'Update Structure' : 'Create Structure'}
                      </Button>
                      <Button variant="outline" onClick={() => { resetForm(); setStructureView('list'); }} className="w-full">
                         Discard Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
        </TabsContent>
        <TabsContent value="components" className="space-y-6">
          {componentView === 'list' ? (
          <Card className="bg-card shadow-md border-border">
            <CardHeader className="border-b pb-4 text-left">
              <CardTitle className="text-lg flex items-center gap-2">
                Salary Component Library
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded ml-2">{country || 'Global'}</span>
              </CardTitle>
              <CardDescription>Manage your global library of earnings and deductions</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-4 flex-1 max-w-md w-full">
                  <div className="relative w-full">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search components..."
                      value={componentSearch}
                      onChange={(e) => setComponentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border border-border h-10 shrink-0">
                    <Landmark className="size-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{country || 'Not configured'}</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto shrink-0">
                  <Button onClick={() => { setEditingComponentId(null); setComponentView('form'); }} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg gap-2 cursor-pointer shadow-sm">
                    <Plus className="size-4" />
                    Create Component
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden shadow-sm bg-card overflow-x-auto">
                <Table className="min-w-[600px] border-collapse">
                  <TableHeader className="bg-muted border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Component Name</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Calculation</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxable</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Statutory</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!salaryComponents || salaryComponents.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-inner">
                              <Inbox className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">No salary components yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Create components or populate defaults for your country</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                disabled={isPopulatingDefaults}
                                onClick={async () => {
                                  setIsPopulatingDefaults(true);
                                  const defaults = COUNTRY_DEFAULTS[country] || [];
                                  let added = 0;
                                  for (const comp of defaults) {
                                    try {
                                      await addSalaryComponent({ ...comp, isDefault: true });
                                      added++;
                                    } catch (e) {
                                      // Already exists on backend, skip
                                    }
                                  }
                                  // Always re-fetch and sync state so the table shows what's in the DB
                                  try {
                                    const freshData = await payrollService.getSalaryComponents();
                                    const fresh = (freshData || []).map((c: any) => ({
                                      id: c.id?.toString() || '0',
                                      name: c.name || 'Unnamed',
                                      type: c.type || 'earning',
                                      calculationType: c.calculation_type || 'fixed',
                                      value: parseFloat(c.value) || 0,
                                      isTaxable: !!c.is_taxable,
                                      isStatutory: !!c.is_statutory,
                                      isDefault: !!c.is_default
                                    }));
                                    setSalaryComponents(fresh);
                                    const allExist = defaults.every(d => fresh.some((f: any) => f.name.toLowerCase() === d.name.toLowerCase()));
                                    setIsPopulatingDefaults(false);
                                    if (allExist) {
                                      toast.success(`Salary components for ${country || 'your country'} are ready!`);
                                    } else if (added > 0) {
                                      toast.success(`Added ${added} default components!`);
                                    } else {
                                      toast.error('Failed to populate components.');
                                    }
                                  } catch (e) {
                                    setIsPopulatingDefaults(false);
                                    if (added > 0) {
                                      toast.success(`Added ${added} default components!`);
                                    } else {
                                      toast.error('Failed to populate components.');
                                    }
                                  }
                                }}
                                variant="outline" size="sm" className="gap-2 text-primary-700 bg-primary-50 hover:bg-primary-100 border-primary-200"
                              >
                                {isPopulatingDefaults ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                                {isPopulatingDefaults ? 'Populating...' : 'Populate Defaults'}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : salaryComponents.filter(comp => !componentSearch || comp.name.toLowerCase().includes(componentSearch.toLowerCase()) || comp.type.toLowerCase().includes(componentSearch.toLowerCase())).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-inner">
                              <Search className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">No matching components</p>
                              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      salaryComponents.filter(comp => !componentSearch || comp.name.toLowerCase().includes(componentSearch.toLowerCase()) || comp.type.toLowerCase().includes(componentSearch.toLowerCase())).map((comp) => (
                        <TableRow key={comp.id} className="hover:bg-muted/40 transition-colors border-b">
                          <TableCell className="font-bold text-foreground px-6">
                            <div className="flex items-center gap-2">
                              {comp.name}
                              {comp.isDefault && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5">
                                  Default
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={comp.type === 'earning' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'}>
                              {comp.type === 'earning' ? 'Earning' : 'Deduction'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium text-sm whitespace-nowrap">
                            {comp.calculationType === 'fixed' ? `${currencySymbol}${comp.value.toLocaleString()}` : `${comp.value}% of base`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={comp.isTaxable ? "border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30" : "border-border text-muted-foreground"}>
                              {comp.isTaxable ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={comp.isStatutory ? "border-primary-200 text-primary-700 bg-primary-50" : "border-border text-muted-foreground"}>
                              {comp.isStatutory ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title={comp.isDefault ? "Edit component (requires approval)" : "Edit component"}
                                onClick={() => { setEditingComponentId(comp.id); setComponentView('form'); }}
                                className="h-8 w-8 text-muted-foreground hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <Edit className="size-4" />
                              </Button>
                              <span title={comp.isDefault ? "Default components cannot be deleted" : undefined}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={comp.isDefault}
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete the component "${comp.name}"? This action cannot be undone.`)) {
                                      try {
                                        await removeSalaryComponent(comp.id);
                                        toast.success('Component removed');
                                      } catch (err: any) {
                                        toast.error(err?.message || 'Failed to remove component');
                                      }
                                    }
                                  }}
                                  className={`h-8 w-8 transition-colors ${comp.isDefault ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-muted-foreground hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          ) : (
            <div className="bg-card shadow-md border border-border rounded-xl">
              <EditSalaryComponent componentId={editingComponentId} onBack={() => setComponentView('list')} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="paycycle" className="space-y-6">
          {catView === 'list' ? (
          <>
          <Card className="bg-card shadow-md border-border overflow-hidden flex flex-col">
            <CardHeader className="text-left border-b border-border sm:flex sm:flex-row sm:items-center sm:justify-between py-4 space-y-3 sm:space-y-0">
              <div>
                <CardTitle className="text-lg text-foreground">Payment Categories</CardTitle>
                <CardDescription className="text-muted-foreground">Configure separate logic and schedules for specific payment types</CardDescription>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/70 text-white shadow-sm gap-2 h-11 px-6" onClick={() => openCatForm()}>
                <Plus className="size-4" /> Add Category
              </Button>
            </CardHeader>
            <CardContent className="p-0 bg-card flex-1 relative overflow-x-auto mt-0">
              <Table className="min-w-[600px] border-collapse">
                <TableHeader className="bg-muted border-b border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequency</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Pay Day</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y-0">
                  {(!categories || categories.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Inbox className="size-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">No payment categories yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Add categories to organize different payment types</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : categories.map((cat) => (
                    <TableRow key={cat.id || cat.name} className="hover:bg-muted/80 transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-sm border flex items-center justify-center font-bold text-sm shadow-sm ${cat.color || 'bg-muted'}`}>
                            {cat.name ? cat.name.charAt(0) : '?'}
                          </div>
                          <span className="font-semibold text-foreground">{cat.name || 'Unnamed'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300 font-medium text-sm">{cat.frequency || 'Monthly'}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300 font-medium text-sm">{cat.payDay || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cat.status ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-muted text-muted-foreground border-border/60'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.status ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {cat.status ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" onClick={() => openCatForm(cat)}>
                            <Edit className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-300 dark:text-gray-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete the category "${cat.name}"? This will affect all groups using it.`)) {
                                try { await removeCategory(cat.id); toast.success('Category removed'); } catch { toast.error('Failed to remove category'); }
                              }
                            }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Global Pay Cycle Setup */}
          <Card className="bg-card shadow-md border-border overflow-hidden">
            <CardHeader className="text-left border-b border-border bg-gradient-to-r from-card to-primary/5 flex flex-row items-center justify-between py-4">
              <div className="text-left">
                <CardTitle className="text-lg text-foreground font-bold">Global Pay Cycle Configuration</CardTitle>
                <CardDescription className="text-muted-foreground">Define the default payroll schedule for the organization</CardDescription>
              </div>
              <Button
                onClick={async () => {
                  try { await updatePayCycle(draftCycle); toast.success('Pay cycle configuration updated'); } catch { toast.error('Failed to update pay cycle'); }
                }}
                className="bg-primary hover:bg-primary/95 shadow-sm gap-2 h-11 px-8 font-bold">
                <Save className="size-4" /> Save Schedule
              </Button>
            </CardHeader>
            <CardContent className="p-8 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3 p-4 rounded-lg border border-gray-50 dark:border-border dark:border-border bg-muted/30">
                  <Label className="text-xs font-black text-primary uppercase tracking-widest">Pay Frequency</Label>
                  <PayrollSelect value={draftCycle.frequency} onValueChange={(val) => setDraftCycle((c) => ({ ...c, frequency: val }))}>
                    <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi-monthly">Bi-monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </PayrollSelect>
                </div>
                <div className="space-y-3 p-4 rounded-lg border border-gray-50 dark:border-border dark:border-border bg-muted/30">
                  <Label className="text-xs font-black text-primary uppercase tracking-widest">Default Pay Day</Label>
                  <PayrollSelect value={draftCycle.payDay} onValueChange={(val) => setDraftCycle((c) => ({ ...c, payDay: val }))}>
                    <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st of Month</SelectItem>
                      <SelectItem value="5th">5th of Month</SelectItem>
                      <SelectItem value="10th">10th of Month</SelectItem>
                      <SelectItem value="last">Last Day of Month</SelectItem>
                    </SelectContent>
                  </PayrollSelect>
                </div>
                <div className="space-y-3 p-4 rounded-lg border border-gray-50 dark:border-border dark:border-border bg-muted/30 flex flex-col justify-center">
                  <Label className="text-xs font-black text-primary uppercase tracking-widest whitespace-nowrap truncate">Attendance Window</Label>
                  <div className="flex items-center gap-2 mt-3">
                    <Input type="number" className="bg-card border-border" value={draftCycle?.attendanceStart ? Number(draftCycle.attendanceStart.split('-').pop()) || '' : ''} onChange={(e) => setDraftCycle((c) => ({ ...c, attendanceStart: `${cycleMonth}-${String(clampCycleDay(e.target.value)).padStart(2, '0')}` }))} />
                    <span className="text-muted-foreground font-bold">to</span>
                    <Input type="number" className="bg-card border-border" value={draftCycle?.attendanceEnd ? Number(draftCycle.attendanceEnd.split('-').pop()) || '' : ''} onChange={(e) => setDraftCycle((c) => ({ ...c, attendanceEnd: `${cycleMonth}-${String(clampCycleDay(e.target.value)).padStart(2, '0')}` }))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
          ) : (
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4 mb-2 text-left">
              <button onClick={() => { resetCatForm(); setCatView('list'); }} className="icon-circle-btn"><ArrowLeft /></button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{editingCatId ? 'Edit Category' : 'Add Category'}</h1>
                <p className="text-muted-foreground text-sm">Manage payment category details</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card className="border-primary-100 shadow-sm">
                  <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30">
                    <CardTitle className="text-lg">Basic Configuration</CardTitle>
                    <CardDescription>Enter the category name and pay schedule</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-left">
                    <div className="space-y-2">
                      <Label>Category Name <span className="text-rose-500 dark:text-rose-400">*</span></Label>
                      <Input placeholder="e.g. All Departments , Engineering Department" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <PayrollSelect value={catForm.frequency} onValueChange={val => setCatForm({ ...catForm, frequency: val })}>
                          <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Bi-monthly">Bi-monthly</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                            <SelectItem value="Annually">Annually</SelectItem>
                          </SelectContent>
                        </PayrollSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>Pay Day</Label>
                        <PayrollSelect value={catForm.payDay} onValueChange={val => setCatForm({ ...catForm, payDay: val })}>
                          <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st of Month">1st of Month</SelectItem>
                            <SelectItem value="7th of Month">7th of Month</SelectItem>
                            <SelectItem value="15th of Month">15th of Month</SelectItem>
                            <SelectItem value="Last Day of Month">Last Day of Month</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectContent>
                        </PayrollSelect>
                        {catForm.payDay === 'Custom' && (
                          <Input placeholder="e.g. 10th of every month" value={customPayDay} onChange={e => setCustomPayDay(e.target.value)} className="mt-2" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div>
                        <Label className="text-sm font-semibold">Active Status</Label>
                        <p className="text-xs text-muted-foreground">Enable or disable this payment type</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={catForm.status} onChange={e => setCatForm({ ...catForm, status: e.target.checked })} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-primary/5 rounded-t-lg">
                    <CardTitle className="text-base font-bold text-primary">Summary Review</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-left">
                    <div className="p-4 rounded-lg bg-muted border border-border space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-bold text-foreground">{catForm.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Frequency</span>
                        <span className="font-bold text-foreground">{catForm.frequency}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Pay Day</span>
                        <span className="font-bold text-foreground">{catForm.payDay === 'Custom' ? customPayDay || '—' : catForm.payDay}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-bold ${catForm.status ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>{catForm.status ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <Button onClick={saveCategory} className="w-full bg-primary hover:bg-primary/95 py-6 text-base font-bold" disabled={!catForm.name.trim()}>
                      <Save className="size-5 mr-2" /> {editingCatId ? 'Update Category' : 'Create Category'}
                    </Button>
                    <Button variant="outline" onClick={() => { resetCatForm(); setCatView('list'); }} className="w-full">
                      Discard Changes
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
          )}
        </TabsContent>
        <TabsContent value="groups" className="space-y-4">
          {groupView === 'list' ? (
          <Card className="bg-card shadow-md border-border">
            <CardHeader className="text-left border-b flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg font-bold">Payroll Groups</CardTitle>
                <CardDescription>Assign employees to groups for bulk processing</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all text-foreground"
                  />
                </div>
                <Button onClick={() => openGroupForm()} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg gap-2 cursor-pointer shadow-sm">
                  <Plus className="size-4" />
                  Add Group
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[600px] border-collapse">
                  <TableHeader className="bg-muted border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Group Name</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Structure</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Category</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!payrollGroups || payrollGroups.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <Users className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">No payroll groups yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Create groups to assign employees for bulk payroll processing</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : payrollGroups.filter(group => !groupSearch || group.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <Search className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">No matching groups</p>
                              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : payrollGroups.filter(group => !groupSearch || group.name.toLowerCase().includes(groupSearch.toLowerCase())).map((group) => (
                      <TableRow key={group.id} className="hover:bg-muted transition-colors group">
                        <TableCell className="px-6 font-semibold text-foreground">{group.name}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-300">
                          {salaryStructures.find(s => s.id === group.structureId)?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-300">
                          {categories.find(c => c.id === group.paymentCategoryId)?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 transition-all hover:bg-card hover:text-primary" onClick={() => openGroupForm(group)}>
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-300 dark:text-gray-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete the group "${group.name}"? This will unassign all employees from this group.`)) {
                                  try {
                                    await removeGroup(group.id);
                                    toast.success('Group removed');
                                  } catch (err) {
                                    toast.error('Failed to remove group');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-2 text-left">
              <button onClick={() => { resetGroupForm(); setGroupView('list'); }} className="icon-circle-btn">
                <ArrowLeft />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{editingGroupId ? 'Edit Payroll Group' : 'Create Payroll Group'}</h1>
                <p className="text-muted-foreground text-sm">Define targeting criteria and assign a salary structure</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card className="border-primary-100 shadow-sm">
                  <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30">
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                    <CardDescription>Name and assign a salary structure for this group</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-left">
                    <div className="space-y-2">
                      <Label>Group Name</Label>
                      <Input placeholder="e.g. Mumbai - Engineering" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Assigned Salary Structure</Label>
                        <PayrollSelect value={groupForm.salaryStructure} onValueChange={(val) => setGroupForm({ ...groupForm, salaryStructure: val })}>
                          <SelectTrigger className="bg-card"><SelectValue placeholder="Select structure" /></SelectTrigger>
                          <SelectContent>
                            {salaryStructures.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </PayrollSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Category / Cycle</Label>
                        <PayrollSelect value={groupForm.paymentCategory} onValueChange={(val) => setGroupForm({ ...groupForm, paymentCategory: val })}>
                          <SelectTrigger className="bg-card"><SelectValue placeholder="Select pay cycle" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name} ({cat.frequency})</SelectItem>
                            ))}
                          </SelectContent>
                        </PayrollSelect>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary-100 shadow-sm">
                  <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30">
                    <CardTitle className="text-lg">Targeting Criteria</CardTitle>
                    <CardDescription>Filter which employees belong to this group</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Target Department</Label>
                        <PayrollSelect value={groupForm.deptId} onValueChange={(val) => setGroupForm({ ...groupForm, deptId: val })}>
                          <SelectTrigger className="bg-card"><SelectValue placeholder="All Departments" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {groupOptions.departments.map((d) => (
                              <SelectItem key={d.id} value={d.id.toString()}>{d.department_name || d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </PayrollSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Location / Branch</Label>
                        <PayrollSelect value={groupForm.locationId} onValueChange={(val) => setGroupForm({ ...groupForm, locationId: val })}>
                          <SelectTrigger className="bg-card"><SelectValue placeholder="All Locations" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            {groupOptions.locations.map((l) => (
                              <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </PayrollSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Gender</Label>
                        <PayrollSelect value={groupForm.gender} onValueChange={(val) => setGroupForm({ ...groupForm, gender: val })}>
                          <SelectTrigger className="bg-card"><SelectValue placeholder="All Genders" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Genders</SelectItem>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </PayrollSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>Employment Type</Label>
                        <PayrollSelect value={groupForm.employmentType} onValueChange={(val) => setGroupForm({ ...groupForm, employmentType: val })}>
                          <SelectTrigger className="bg-card"><SelectValue placeholder="All Types" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Full-Time">Full-Time</SelectItem>
                            <SelectItem value="Part-Time">Part-Time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Intern">Intern</SelectItem>
                          </SelectContent>
                        </PayrollSelect>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-primary/5 rounded-t-lg">
                    <CardTitle className="text-base font-bold text-primary">Summary Review</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-left">
                    <div className="flex items-center gap-3">
                       <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                          <Users className="size-5" />
                       </div>
                       <div>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Group</p>
                          <p className="font-bold text-foreground">{groupForm.name || '—'}</p>
                       </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted border border-border space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Structure</span>
                        <span className="font-bold text-foreground">{salaryStructures.find(s => s.id === groupForm.salaryStructure)?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Payment Cycle</span>
                        <span className="font-bold text-foreground">{categories.find(c => c.id === groupForm.paymentCategory)?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                        <span className="text-muted-foreground">Department</span>
                        <span className="font-bold text-foreground">{groupForm.deptId === 'all' ? 'All' : groupOptions.departments.find(d => d.id.toString() === groupForm.deptId)?.department_name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-bold text-foreground">{groupForm.locationId === 'all' ? 'All' : groupOptions.locations.find(l => l.id === groupForm.locationId)?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Gender</span>
                        <span className="font-bold text-foreground capitalize">{groupForm.gender === 'all' ? 'All' : groupForm.gender}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Employment</span>
                        <span className="font-bold text-foreground">{groupForm.employmentType === 'all' ? 'All' : groupForm.employmentType}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <Button onClick={handleSaveGroup} className="w-full bg-primary hover:bg-primary/95 py-6 text-base font-bold shadow-sm shadow-primary-100" disabled={!groupForm.name.trim()}>
                      <Save className="size-5 mr-2" />
                      {editingGroupId ? 'Update Group' : 'Create Group'}
                    </Button>
                    <Button variant="outline" onClick={() => { resetGroupForm(); setGroupView('list'); }} className="w-full">
                      Discard Changes
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
          )}
        </TabsContent>

        {/* ── TAX SETUP ────────────────────────────────────────────────────── */}
        <TabsContent value="tax-rules" className="space-y-4">
          {taxView === 'list' ? (
          <Card className="border-border shadow-md overflow-hidden">
            <CardHeader className="border-b border-emerald-100/50 py-4 flex flex-row items-center justify-between">
              <div className="text-left">
                <CardTitle className="text-xl font-bold text-foreground">Tax Declaration Sections</CardTitle>
                <CardDescription className="text-muted-foreground">Define available tax sections and their annual deduction limits</CardDescription>
              </div>
              <Button onClick={() => openTaxForm()} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg gap-2 cursor-pointer shadow-sm">
                <Plus className="size-4" /> Add Section
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[700px] border-collapse">
                  <TableHeader className="bg-muted border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Section Code</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Label</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Annual Limit</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Instruments</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!taxSections || taxSections.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                              <Landmark className="size-5 text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">No tax sections defined</p>
                              <p className="text-xs text-muted-foreground mt-1">Add sections to configure employee tax declarations</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : taxSections.map(sec => (
                      <TableRow key={sec.id} className="hover:bg-muted/5 group border-none">
                        <TableCell className="pl-6"><Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">{sec.section}</Badge></TableCell>
                        <TableCell className="font-semibold text-foreground">{sec.label}</TableCell>
                        <TableCell className="font-black text-emerald-700">{currencySymbol}{sec.limit.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {sec.instruments.map(ins => (
                              <span key={ins} className="text-[10px] bg-card border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-medium">{ins}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 transition-all hover:bg-card hover:text-primary" onClick={() => openTaxForm(sec)}>
                              <Edit className="size-4 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                            <Button
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this tax section? Employees with declarations for this section will be affected.')) {
                                  try { await removeTaxSection(sec.id); toast.success('Tax section removed'); } catch (err) { toast.error('Failed to remove tax section'); }
                                }
                              }}
                              variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-400 hover:text-rose-600 bg-transparent"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-2 text-left">
              <button onClick={() => { resetTaxForm(); setTaxView('list'); }} className="icon-circle-btn">
                <ArrowLeft />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{editingTaxId ? 'Edit Tax Section' : 'Add Tax Section'}</h1>
                <p className="text-muted-foreground text-sm">Configure investment limits and eligible instruments for tax declaration</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card className="border-primary-100 shadow-sm">
                  <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30">
                    <CardTitle className="text-lg">Section Details</CardTitle>
                    <CardDescription>Enter the legal code, exemption limits, and eligible instruments</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Section Code</Label>
                        <PayrollSelect value={isCustomTaxCode ? '__custom__' : taxForm.code} onValueChange={handleTaxCodeSelect}>
                          <SelectTrigger className="bg-card"><SelectValue placeholder="Select a default section..." /></SelectTrigger>
                          <SelectContent>
                            {taxDefaults.map((d) => (
                              <SelectItem key={d.code} value={d.code}>
                                <span className="font-bold">{d.code}</span>
                                <span className="ml-2 text-muted-foreground text-xs">— {d.label}</span>
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">
                              <span className="flex items-center gap-1.5"><Pencil className="size-3" /> Custom Section</span>
                            </SelectItem>
                          </SelectContent>
                        </PayrollSelect>
                        {isCustomTaxCode && (
                          <Input placeholder="e.g. 80D" value={taxForm.code} onChange={(e) => setTaxForm({ ...taxForm, code: e.target.value })} />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Annual Limit ({currencySymbol})</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">{currencySymbol}</span>
                          <Input type="number" placeholder="0" className={`${currencySymbol.length > 2 ? 'pl-14' : currencySymbol.length > 1 ? 'pl-10' : 'pl-8'} bg-muted border-border focus:bg-card transition-all`} value={taxForm.limit === 0 ? '' : taxForm.limit} onChange={(e) => setTaxForm({ ...taxForm, limit: e.target.value === '' ? 0 : Number(e.target.value) })} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Label</Label>
                      <Input placeholder="e.g. Medical Insurance" value={taxForm.label} onChange={(e) => setTaxForm({ ...taxForm, label: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Eligible Instruments</Label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Add instruments (press Enter)"
                          value={taxTagInput}
                          onChange={(e) => setTaxTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTaxTag(); } }}
                          className="w-full bg-muted/50 border border-border rounded-lg pl-4 pr-12 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors"
                        />
                        <button
                          onClick={() => addTaxTag()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      {taxInstruments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {taxInstruments.map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-muted text-slate-600 dark:text-slate-300 rounded-sm text-xs font-semibold flex items-center gap-1">
                              {tag}
                              <button onClick={() => removeTaxTag(tag)} className="hover:text-red-500 dark:hover:text-red-400"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground italic mt-1">Type a name and press Enter or click + to add</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-primary/5 rounded-t-lg">
                    <CardTitle className="text-base font-bold text-primary">Summary Review</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700"><FileText className="size-5" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Section</p>
                        <p className="font-bold text-foreground">{taxForm.code || '—'}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted border border-border space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Label</span>
                        <span className="font-bold text-foreground">{taxForm.label || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Annual Limit</span>
                        <span className="font-bold text-primary">{currencySymbol}{taxForm.limit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                        <span className="text-muted-foreground font-medium">Instruments</span>
                        <Badge variant="outline" className="font-bold">{taxInstruments.length}</Badge>
                      </div>
                    </div>
                    {taxInstruments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {taxInstruments.slice(0, 6).map((ins) => (
                          <span key={ins} className="text-[10px] bg-card border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-medium">{ins}</span>
                        ))}
                        {taxInstruments.length > 6 && <span className="text-[10px] text-muted-foreground font-medium">+{taxInstruments.length - 6} more</span>}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <Button onClick={handleSaveTaxSection} className="w-full bg-primary hover:bg-primary/95 py-6 text-base font-bold shadow-sm shadow-primary-100" disabled={!taxForm.code || !taxForm.label}>
                      <Save className="size-5 mr-2" />
                      {editingTaxId ? 'Update Section' : 'Save Section'}
                    </Button>
                    <Button variant="outline" onClick={() => { resetTaxForm(); setTaxView('list'); }} className="w-full">
                      Discard Changes
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="statutory-settings" className="space-y-5">
          <Card className="bg-card shadow-md border-border overflow-hidden">
            <CardHeader className="text-left border-b bg-gradient-to-r from-card to-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-foreground">Statutory Limits & Compliance Configuration</CardTitle>
                <CardDescription className="text-muted-foreground">Manage statutory contribution limits, EPF, ESI, Gratuity, and tax deduction rules for your organization</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border h-10">
                  <Landmark className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">{country || 'Not configured'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingStatutory ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditingStatutory(false)} className="h-10 px-4 font-semibold text-xs rounded-lg border-border bg-card hover:bg-muted text-foreground cursor-pointer shadow-sm gap-1.5">
                        <X className="size-4" /> Cancel
                      </Button>
                      <Button onClick={handleSaveSettings} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg gap-1.5 cursor-pointer shadow-sm">
                        <Save className="size-4" /> Save Settings
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditingStatutory(true)} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg gap-1.5 cursor-pointer shadow-sm">
                      <Edit className="size-4" /> Edit Configuration
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">

          {isIndia && (
            <div className="space-y-5">
              <div className="columns-1 lg:columns-2 gap-5 [&>div]:break-inside-avoid [&>div]:mb-5">
                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-card border-b border-border">
                    <div className="p-2 text-primary">
                      <Landmark className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Employees' Provident Fund (EPF)</h3>
                      <p className="text-[11px] text-muted-foreground">Statutory EPF contribution parameters</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <StatutoryInputField
                      label={`EPF Wage Ceiling (${currencySymbol})`}
                      value={statutorySettings.find(s => s.key === 'EPF_WAGE_CEILING')?.value || '15000'}
                      onChange={(val) => handleSettingChange('EPF_WAGE_CEILING', val)}
                      focusColorClass="focus:border-primary"
                      readOnly={!isEditingStatutory}
                    />
                    <StatutoryInputField
                      label="Employee Contribution Rate (%)"
                      value={parseFloat(statutorySettings.find(s => s.key === 'EPF_EMPLOYEE_RATE')?.value || '0.12') * 100}
                      onChange={(val) => handleSettingChange('EPF_EMPLOYEE_RATE', String(parseFloat(val) / 100))}
                      isLockedDefault={true}
                      legalDefaultValue="12%"
                      tooltipText="Statutory deduction from employee's basic salary"
                      readOnly={!isEditingStatutory}
                    />
                    <div className="space-y-3">
                      <StatutoryInputField
                        label="Employer EPS Rate (%)"
                        value={parseFloat(statutorySettings.find(s => s.key === 'EPF_EMPLOYER_EPS_RATE')?.value || '0.0833') * 100}
                        onChange={(val) => handleSettingChange('EPF_EMPLOYER_EPS_RATE', String(parseFloat(val) / 100))}
                        isLockedDefault={true}
                        legalDefaultValue="8.33%"
                        tooltipText="Pension scheme contribution from employer"
                        readOnly={!isEditingStatutory}
                      />
                      <StatutoryInputField
                        label="Employer EPF Rate (%)"
                        value={Number((parseFloat(statutorySettings.find(s => s.key === 'EPF_EMPLOYER_RATE')?.value || '0.0367') * 100).toFixed(2))}
                        onChange={(val) => handleSettingChange('EPF_EMPLOYER_RATE', String(parseFloat(val) / 100))}
                        isLockedDefault={true}
                        legalDefaultValue="3.67%"
                        tooltipText="Provident fund contribution from employer"
                        readOnly={!isEditingStatutory}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-card border-b border-border">
                    <div className="p-2 text-primary">
                      <Landmark className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Employee State Insurance (ESI)</h3>
                      <p className="text-[11px] text-muted-foreground">Statutory ESIC contribution parameters</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <StatutoryInputField
                      label={`ESI Wage Ceiling (${currencySymbol})`}
                      value={statutorySettings.find(s => s.key === 'ESI_WAGE_CEILING')?.value || '21000'}
                      onChange={(val) => handleSettingChange('ESI_WAGE_CEILING', val)}
                      focusColorClass="focus:border-primary"
                      readOnly={!isEditingStatutory}
                    />
                    <div className="space-y-3">
                      <StatutoryInputField
                        label="Employee Rate (%)"
                        value={parseFloat(statutorySettings.find(s => s.key === 'ESI_EMPLOYEE_RATE')?.value || '0.0075') * 100}
                        onChange={(val) => handleSettingChange('ESI_EMPLOYEE_RATE', String(parseFloat(val) / 100))}
                        isLockedDefault={true}
                        legalDefaultValue="0.75%"
                        tooltipText="Statutory deduction for medical insurance"
                        readOnly={!isEditingStatutory}
                      />
                      <StatutoryInputField
                        label="Employer Rate (%)"
                        value={parseFloat(statutorySettings.find(s => s.key === 'ESI_EMPLOYER_RATE')?.value || '0.0325') * 100}
                        onChange={(val) => handleSettingChange('ESI_EMPLOYER_RATE', String(parseFloat(val) / 100))}
                        isLockedDefault={true}
                        legalDefaultValue="3.25%"
                        tooltipText="Employer health contribution"
                        readOnly={!isEditingStatutory}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-card border-b border-border">
                    <div className="p-2 text-primary">
                      <Users className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Gratuity & Exit Settlement</h3>
                      <p className="text-[11px] text-muted-foreground">Offboarding calculation parameters</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <StatutoryInputField
                        label="Min. Service Years"
                        value={statutorySettings.find(s => s.key === 'GRATUITY_YEARS_THRESHOLD')?.value || '5'}
                        onChange={(val) => handleSettingChange('GRATUITY_YEARS_THRESHOLD', val)}
                        focusColorClass="focus:border-primary"
                        isLockedDefault={true}
                        legalDefaultValue="5 Years"
                        tooltipText="Minimum continuous service for Gratuity eligibility"
                        readOnly={!isEditingStatutory}
                      />
                      <StatutoryInputField
                        label="Days per Year of Service"
                        value={statutorySettings.find(s => s.key === 'GRATUITY_MULTIPLIER')?.value || '15'}
                        onChange={(val) => handleSettingChange('GRATUITY_MULTIPLIER', val)}
                        focusColorClass="focus:border-primary"
                        isLockedDefault={true}
                        legalDefaultValue="15 Days"
                        tooltipText="Days wages paid per completed year"
                        readOnly={!isEditingStatutory}
                      />
                      <StatutoryInputField
                        label="Working Days Divisor"
                        value={statutorySettings.find(s => s.key === 'GRATUITY_DIVISOR')?.value || '26'}
                        onChange={(val) => handleSettingChange('GRATUITY_DIVISOR', val)}
                        focusColorClass="focus:border-primary"
                        isLockedDefault={true}
                        legalDefaultValue="26 Days"
                        tooltipText="Standard working days for gratuity calc"
                        readOnly={!isEditingStatutory}
                      />
                      <StatutoryInputField
                        label="Leave Encashment Divisor"
                        value={statutorySettings.find(s => s.key === 'LEAVE_ENCASHMENT_DIVISOR')?.value || '30'}
                        onChange={(val) => handleSettingChange('LEAVE_ENCASHMENT_DIVISOR', val)}
                        focusColorClass="focus:border-primary"
                        isLockedDefault={true}
                        legalDefaultValue="30 Days"
                        tooltipText="Standard month days for leave encashment"
                        readOnly={!isEditingStatutory}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-card border-b border-border">
                    <div className="p-2 text-primary">
                      <Landmark className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Tax Exemptions & Standard Deductions</h3>
                      <p className="text-[11px] text-muted-foreground">Income tax parameters</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="space-y-3">
                      <StatutoryInputField
                        label={`Old Regime Std Ded (${currencySymbol})`}
                        value={statutorySettings.find(s => s.key === 'STANDARD_DEDUCTION_OLD')?.value || '50000'}
                        onChange={(val) => handleSettingChange('STANDARD_DEDUCTION_OLD', val)}
                        focusColorClass="focus:border-emerald-500"
                        isLockedDefault={true}
                        legalDefaultValue="50,000"
                        tooltipText="Standard deduction under Old Regime"
                        readOnly={!isEditingStatutory}
                      />
                      <StatutoryInputField
                        label={`New Regime Std Ded (${currencySymbol})`}
                        value={statutorySettings.find(s => s.key === 'STANDARD_DEDUCTION_NEW')?.value || '75000'}
                        onChange={(val) => handleSettingChange('STANDARD_DEDUCTION_NEW', val)}
                        focusColorClass="focus:border-emerald-500"
                        isLockedDefault={true}
                        legalDefaultValue="75,000"
                        tooltipText="Standard deduction under New Regime"
                        readOnly={!isEditingStatutory}
                      />
                    </div>
                    <StatutoryInputField
                      label={`Global Section 80C Limit (${currencySymbol})`}
                      value={statutorySettings.find(s => s.key === 'GLOBAL_80C_LIMIT')?.value || '150000'}
                      onChange={(val) => handleSettingChange('GLOBAL_80C_LIMIT', val)}
                      focusColorClass="focus:border-emerald-500"
                      isLockedDefault={true}
                      legalDefaultValue="1,50,000"
                      tooltipText="Maximum aggregate deduction under Section 80C"
                      readOnly={!isEditingStatutory}
                    />
                    <div className="border-t border-border pt-3 mt-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Section 87A Rebate</p>
                      <div className="space-y-3">
                        <StatutoryInputField
                          label={`Old Regime Threshold (${currencySymbol})`}
                          value={statutorySettings.find(s => s.key === 'REBATE_87A_LIMIT_OLD')?.value || '500000'}
                          onChange={(val) => handleSettingChange('REBATE_87A_LIMIT_OLD', val)}
                          focusColorClass="focus:border-emerald-500"
                          isLockedDefault={true}
                          legalDefaultValue="5,00,000"
                          tooltipText="Income threshold for Old Regime rebate"
                          readOnly={!isEditingStatutory}
                        />
                        <StatutoryInputField
                          label={`Old Regime Max Rebate (${currencySymbol})`}
                          value={statutorySettings.find(s => s.key === 'REBATE_87A_AMOUNT_OLD')?.value || '12500'}
                          onChange={(val) => handleSettingChange('REBATE_87A_AMOUNT_OLD', val)}
                          focusColorClass="focus:border-emerald-500"
                          isLockedDefault={true}
                          legalDefaultValue="12,500"
                          tooltipText="Maximum rebate under Old Regime"
                          readOnly={!isEditingStatutory}
                        />
                        <StatutoryInputField
                          label={`New Regime Threshold (${currencySymbol})`}
                          value={statutorySettings.find(s => s.key === 'REBATE_87A_LIMIT_NEW')?.value || '700000'}
                          onChange={(val) => handleSettingChange('REBATE_87A_LIMIT_NEW', val)}
                          focusColorClass="focus:border-emerald-500"
                          isLockedDefault={true}
                          legalDefaultValue="7,00,000"
                          tooltipText="Income threshold for New Regime rebate"
                          readOnly={!isEditingStatutory}
                        />
                        <StatutoryInputField
                          label={`New Regime Max Rebate (${currencySymbol})`}
                          value={statutorySettings.find(s => s.key === 'REBATE_87A_AMOUNT_NEW')?.value || '25000'}
                          onChange={(val) => handleSettingChange('REBATE_87A_AMOUNT_NEW', val)}
                          focusColorClass="focus:border-emerald-500"
                          isLockedDefault={true}
                          legalDefaultValue="25,000"
                          tooltipText="Maximum rebate under New Regime"
                          readOnly={!isEditingStatutory}
                        />
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 mt-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">HRA Exemption</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <StatutoryInputField
                            label="Metro (%)"
                            value={parseFloat(statutorySettings.find(s => s.key === 'HRA_METRO_PERCENT')?.value || '0.50') * 100}
                            onChange={(val) => handleSettingChange('HRA_METRO_PERCENT', String(parseFloat(val) / 100))}
                            focusColorClass="focus:border-emerald-500"
                            isLockedDefault={true}
                            legalDefaultValue="50%"
                            tooltipText="HRA limit for metro cities"
                            readOnly={!isEditingStatutory}
                          />
                          <StatutoryInputField
                            label="Non-Metro (%)"
                            value={parseFloat(statutorySettings.find(s => s.key === 'HRA_NON_METRO_PERCENT')?.value || '0.40') * 100}
                            onChange={(val) => handleSettingChange('HRA_NON_METRO_PERCENT', String(parseFloat(val) / 100))}
                            focusColorClass="focus:border-emerald-500"
                            isLockedDefault={true}
                            legalDefaultValue="40%"
                            tooltipText="HRA limit for non-metro cities"
                            readOnly={!isEditingStatutory}
                          />
                        </div>
                        <StatutoryInputField
                          label="Rent vs Basic (%)"
                          value={parseFloat(statutorySettings.find(s => s.key === 'HRA_RENT_BASIC_PERCENT')?.value || '0.10') * 100}
                          onChange={(val) => handleSettingChange('HRA_RENT_BASIC_PERCENT', String(parseFloat(val) / 100))}
                          focusColorClass="focus:border-emerald-500"
                          isLockedDefault={true}
                          legalDefaultValue="10%"
                          tooltipText="Rent minus 10% basic deduction"
                          readOnly={!isEditingStatutory}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 bg-card border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 text-primary">
                      <Landmark className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">State Professional Tax Slabs</h3>
                      <p className="text-[11px] text-muted-foreground">Select a state to view its Professional Tax slabs</p>
                    </div>
                  </div>
                  <div className="w-56">
                    <PayrollSelect value={selectedPTState} onValueChange={setSelectedPTState}>
                      <SelectTrigger className="h-9 text-xs bg-card border-border text-foreground">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                        <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
                        <SelectItem value="Assam">Assam</SelectItem>
                        <SelectItem value="Bihar">Bihar</SelectItem>
                        <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Goa">Goa</SelectItem>
                        <SelectItem value="Gujarat">Gujarat</SelectItem>
                        <SelectItem value="Haryana">Haryana</SelectItem>
                        <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
                        <SelectItem value="Jharkhand">Jharkhand</SelectItem>
                        <SelectItem value="Karnataka">Karnataka</SelectItem>
                        <SelectItem value="Kerala">Kerala</SelectItem>
                        <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                        <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                        <SelectItem value="Manipur">Manipur</SelectItem>
                        <SelectItem value="Meghalaya">Meghalaya</SelectItem>
                        <SelectItem value="Mizoram">Mizoram</SelectItem>
                        <SelectItem value="Nagaland">Nagaland</SelectItem>
                        <SelectItem value="Odisha">Odisha</SelectItem>
                        <SelectItem value="Punjab">Punjab</SelectItem>
                        <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                        <SelectItem value="Sikkim">Sikkim</SelectItem>
                        <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                        <SelectItem value="Telangana">Telangana</SelectItem>
                        <SelectItem value="Tripura">Tripura</SelectItem>
                        <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                        <SelectItem value="Uttarakhand">Uttarakhand</SelectItem>
                        <SelectItem value="West Bengal">West Bengal</SelectItem>
                      </SelectContent>
                    </PayrollSelect>
                  </div>
                </div>
                <div className="p-5 bg-card">
                  {(() => {
                    const ptData = [
                      { state: "Andhra Pradesh", color: "blue", slabs: ["Up to ₹15,000: ₹0", "₹15,001–₹20,000: ₹150/mo", "Above ₹20,000: ₹200/mo"] },
                      { state: "Arunachal Pradesh", color: "emerald", slabs: ["Up to ₹25,000: ₹0", "Above ₹25,000: ₹200/mo"] },
                      { state: "Assam", color: "violet", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹15,000: ₹140/mo", "₹15,001–₹25,000: ₹180/mo", "Above ₹25,000: ₹208/mo"] },
                      { state: "Bihar", color: "amber", slabs: ["Up to ₹3,000: ₹0", "₹3,001–₹5,000: ₹40/mo", "₹5,001–₹10,000: ₹80/mo", "₹10,001–₹20,000: ₹150/mo", "Above ₹20,000: ₹200/mo"] },
                      { state: "Chhattisgarh", color: "blue", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹15,000: ₹100/mo", "₹15,001–₹20,000: ₹150/mo", "Above ₹20,000: ₹200/mo"] },
                      { state: "Delhi", color: "emerald", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹15,000: ₹100/mo", "₹15,001–₹20,000: ₹150/mo", "Above ₹20,000: ₹200/mo"] },
                      { state: "Goa", color: "violet", slabs: ["Up to ₹15,000: ₹0", "₹15,001–₹25,000: ₹100/mo", "₹25,001–₹40,000: ₹150/mo", "Above ₹40,000: ₹200/mo"] },
                      { state: "Gujarat", color: "amber", slabs: ["Up to ₹6,000: ₹0", "₹6,001–₹9,000: ₹80/mo", "₹9,001–₹12,000: ₹150/mo", "Above ₹12,000: ₹200/mo"] },
                      { state: "Haryana", color: "blue", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹125/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Himachal Pradesh", color: "emerald", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Jharkhand", color: "violet", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Karnataka", color: "amber", slabs: ["Up to ₹25,000: ₹0", "Above ₹25,000: ₹200/mo"] },
                      { state: "Kerala", color: "blue", slabs: ["Up to ₹12,500: ₹0", "₹12,501–₹20,000: ₹120/mo", "₹20,001–₹30,000: ₹180/mo", "Above ₹30,000: ₹208/mo"] },
                      { state: "Madhya Pradesh", color: "emerald", slabs: ["Up to ₹12,500: ₹0", "₹12,501–₹25,000: ₹125/mo", "₹25,001–₹40,000: ₹166/mo", "Above ₹40,000: ₹208/mo"] },
                      { state: "Maharashtra", color: "violet", slabs: ["Up to ₹7,500: ₹0", "₹7,501–₹10,000: ₹175/mo", "Above ₹10,000: ₹200/mo (₹300 in Feb)"] },
                      { state: "Manipur", color: "amber", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹15,000: ₹100/mo", "₹15,001–₹20,000: ₹150/mo", "Above ₹20,000: ₹200/mo"] },
                      { state: "Meghalaya", color: "blue", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹15,000: ₹100/mo", "₹15,001–₹25,000: ₹150/mo", "Above ₹25,000: ₹200/mo"] },
                      { state: "Mizoram", color: "emerald", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Nagaland", color: "violet", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹15,000: ₹100/mo", "₹15,001–₹25,000: ₹150/mo", "Above ₹25,000: ₹200/mo"] },
                      { state: "Odisha", color: "amber", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Punjab", color: "blue", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Rajasthan", color: "emerald", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹80/mo", "₹20,001–₹30,000: ₹120/mo", "Above ₹30,000: ₹150/mo"] },
                      { state: "Sikkim", color: "violet", slabs: ["Up to ₹20,000: ₹0", "Above ₹20,000: ₹200/mo"] },
                      { state: "Tamil Nadu", color: "amber", slabs: ["Up to ₹21,000: ₹0", "₹21,001–₹30,000: ₹22.50/mo", "₹30,001–₹45,000: ₹52.50/mo", "₹45,001–₹60,000: ₹115/mo", "₹60,001–₹75,000: ₹171/mo", "Above ₹75,000: ₹208/mo"] },
                      { state: "Telangana", color: "blue", slabs: ["Up to ₹15,000: ₹0", "₹15,001–₹20,000: ₹150/mo", "Above ₹20,000: ₹200/mo"] },
                      { state: "Tripura", color: "emerald", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Uttar Pradesh", color: "violet", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "Uttarakhand", color: "amber", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹20,000: ₹100/mo", "₹20,001–₹30,000: ₹150/mo", "Above ₹30,000: ₹200/mo"] },
                      { state: "West Bengal", color: "blue", slabs: ["Up to ₹10,000: ₹0", "₹10,001–₹15,000: ₹110/mo", "₹15,001–₹25,000: ₹130/mo", "₹25,001–₹40,000: ₹160/mo", "Above ₹40,000: ₹200/mo"] },
                    ].find(item => item.state === selectedPTState);

                    if (!ptData) return null;

                    const colors: Record<string, { border: string; bg: string; text: string; dot: string }> = {
                      blue: { border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50/60 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500 dark:bg-blue-400' },
                      emerald: { border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500 dark:bg-emerald-400' },
                      violet: { border: 'border-violet-200 dark:border-violet-800', bg: 'bg-violet-50/60 dark:bg-violet-950/20', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500 dark:bg-violet-400' },
                      amber: { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50/60 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500 dark:bg-amber-400' },
                    };
                    const c = colors[ptData.color];

                    return (
                      <div className={`border ${c.border} rounded-lg p-4 ${c.bg} transition-colors`}>
                        <p className={`text-sm font-bold ${c.text} mb-3`}>{ptData.state} Professional Tax Slabs</p>
                        <ul className="space-y-2">
                          {ptData.slabs.map((slab, sIdx) => (
                            <li key={sIdx} className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                              {slab}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
          
          {isTanzania && (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-primary/5 border-b border-border">
                <div className="p-2 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">National Social Security Fund (NSSF)</h3>
                  <p className="text-[11px] text-muted-foreground">Tanzania statutory parameters</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatutoryInputField
                    label="Employee Contribution (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'TZ_NSSF_EMPLOYEE_RATE')?.value || '0.10') * 100}
                    onChange={(val) => handleSettingChange('TZ_NSSF_EMPLOYEE_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="10%"
                    tooltipText="NSSF employee contribution"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label="Employer Contribution (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'TZ_NSSF_EMPLOYER_RATE')?.value || '0.10') * 100}
                    onChange={(val) => handleSettingChange('TZ_NSSF_EMPLOYER_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="10%"
                    tooltipText="NSSF employer contribution"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label="WCF Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'TZ_WCF_RATE')?.value || '0.006') * 100}
                    onChange={(val) => handleSettingChange('TZ_WCF_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="0.6%"
                    tooltipText="Workers Compensation Fund"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label="SDL Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'TZ_SDL_RATE')?.value || '0.035') * 100}
                    onChange={(val) => handleSettingChange('TZ_SDL_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="3.5%"
                    tooltipText="Skills Development Levy (employer-only, 10+ employees)"
                    readOnly={!isEditingStatutory}
                  />
                </div>
              </div>
            </div>
          )}

          {isTanzania && (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-primary/5 border-b border-border">
                <div className="p-2 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">PAYE Tax Bands (Progressive)</h3>
                  <p className="text-[11px] text-muted-foreground">Configure progressive income tax brackets for resident employees</p>
                </div>
              </div>
              <div className="p-5">
                <PayeBandManager />
              </div>
            </div>
          )}

          {isUSA && (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-50/80 border-b border-border">
                <div className="p-2 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">US FICA & Social Security</h3>
                  <p className="text-[11px] text-muted-foreground">United States statutory parameters</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatutoryInputField
                    label="FICA Social Security Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'US_FICA_SS_RATE')?.value || '0.062') * 100}
                    onChange={(val) => handleSettingChange('US_FICA_SS_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="6.2%"
                    tooltipText="Federal Insurance Contributions Act Social Security rate"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label={`SS Wage Ceiling (${currencySymbol})`}
                    value={statutorySettings.find(s => s.key === 'US_FICA_SS_CEILING')?.value || '168600'}
                    onChange={(val) => handleSettingChange('US_FICA_SS_CEILING', val)}
                    focusColorClass="focus:border-blue-500"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label="Medicare Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'US_FICA_MED_RATE')?.value || '0.0145') * 100}
                    onChange={(val) => handleSettingChange('US_FICA_MED_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="1.45%"
                    tooltipText="Federal Medicare contribution rate"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label={`Standard Deduction (${currencySymbol})`}
                    value={statutorySettings.find(s => s.key === 'US_STD_DEDUCTION')?.value || '15000'}
                    onChange={(val) => handleSettingChange('US_STD_DEDUCTION', val)}
                    focusColorClass="focus:border-blue-500"
                    readOnly={!isEditingStatutory}
                  />
                </div>
              </div>
            </div>
          )}

          {isSingapore && (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50/80 border-b border-border">
                <div className="p-2 text-emerald-600 dark:text-emerald-400">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Singapore CPF & SDL</h3>
                  <p className="text-[11px] text-muted-foreground">Singapore statutory parameters</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatutoryInputField
                    label="CPF Employee Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'SG_CPF_EMPLOYEE_RATE')?.value || '0.20') * 100}
                    onChange={(val) => handleSettingChange('SG_CPF_EMPLOYEE_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="20%"
                    tooltipText="Central Provident Fund employee contribution"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label="CPF Employer Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'SG_CPF_EMPLOYER_RATE')?.value || '0.17') * 100}
                    onChange={(val) => handleSettingChange('SG_CPF_EMPLOYER_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="17%"
                    tooltipText="Central Provident Fund employer contribution"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label={`OW Ceiling (${currencySymbol})`}
                    value={statutorySettings.find(s => s.key === 'SG_CPF_OW_CEILING')?.value || '6800'}
                    onChange={(val) => handleSettingChange('SG_CPF_OW_CEILING', val)}
                    focusColorClass="focus:border-emerald-500"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label="SDL Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'SG_SDL_RATE')?.value || '0.0025') * 100}
                    onChange={(val) => handleSettingChange('SG_SDL_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="0.25%"
                    tooltipText="Skills Development Levy rate"
                    readOnly={!isEditingStatutory}
                  />
                </div>
              </div>
            </div>
          )}

          {isUAE && (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-border">
                <div className="p-2 text-amber-600 dark:text-amber-400">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">UAE GPSSA Pension</h3>
                  <p className="text-[11px] text-muted-foreground">United Arab Emirates statutory parameters</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatutoryInputField
                    label="Employee GPSSA Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'AE_GPSSA_EMPLOYEE_RATE')?.value || '0.05') * 100}
                    onChange={(val) => handleSettingChange('AE_GPSSA_EMPLOYEE_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="5%"
                    tooltipText="GPSSA employee contribution"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label="Employer GPSSA Rate (%)"
                    value={parseFloat(statutorySettings.find(s => s.key === 'AE_GPSSA_EMPLOYER_RATE')?.value || '0.125') * 100}
                    onChange={(val) => handleSettingChange('AE_GPSSA_EMPLOYER_RATE', String(parseFloat(val) / 100))}
                    isLockedDefault={true}
                    legalDefaultValue="12.5%"
                    tooltipText="GPSSA employer contribution"
                    readOnly={!isEditingStatutory}
                  />
                  <StatutoryInputField
                    label={`GPSSA Wage Ceiling (${currencySymbol})`}
                    value={statutorySettings.find(s => s.key === 'AE_GPSSA_CEILING')?.value || '50000'}
                    onChange={(val) => handleSettingChange('AE_GPSSA_CEILING', val)}
                    focusColorClass="focus:border-amber-500"
                    readOnly={!isEditingStatutory}
                  />
                </div>
              </div>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        

                <TabsContent value="reimb-ready-to-pay" className="space-y-4">
          <Card className="bg-card shadow-md border-border">
            <CardHeader className="text-left border-b bg-gradient-to-r from-card to-primary/5 py-4">
              <CardTitle className="text-lg font-bold">Reimbursement Payment Configuration</CardTitle>
              <CardDescription>Configure global default payment settings and permission settings</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Default Payment Mode</Label>
                  <PayrollSelect 
                    value={reimbDefaultPaymentMode} 
                    onValueChange={async (value) => {
                      setReimbDefaultPaymentMode(value);
                      await saveReimbSettings(value, reimbFinanceCanChange);
                    }}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select default payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Salary Payroll">Salary Payroll (Pay along with monthly salary)</SelectItem>
                      <SelectItem value="Separate Reimbursement Payment">Separate Reimbursement Payment (Independent settle)</SelectItem>
                    </SelectContent>
                  </PayrollSelect>
                  <p className="text-[11px] text-muted-foreground italic">
                    Newly approved claims will default to this payment option.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Finance Payment Mode Modifications</Label>
                  <PayrollSelect 
                    value={reimbFinanceCanChange} 
                    onValueChange={async (value) => {
                      setReimbFinanceCanChange(value);
                      await saveReimbSettings(reimbDefaultPaymentMode, value);
                    }}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Allowed (Finance can switch modes before processing)</SelectItem>
                      <SelectItem value="false">Restricted (Lock payment mode to the configured default)</SelectItem>
                    </SelectContent>
                  </PayrollSelect>
                  <p className="text-[11px] text-muted-foreground italic">
                    Allow or restrict finance officers from switching payment methods before settling claims.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-md border-border">
            <CardHeader className="text-left border-b flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg font-bold">Reimbursement Payment Queue</CardTitle>
                <CardDescription>Process separate reimbursement payments or track salary payroll claims</CardDescription>
              </div>
              <Button onClick={() => fetchReadyClaims()} variant="outline" size="sm" className="h-10 px-4 font-semibold text-xs rounded-lg border-border bg-card hover:bg-muted text-foreground cursor-pointer shadow-sm gap-2">
                Refresh Queue
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingClaims ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="size-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading reimbursement queue...</p>
                </div>
              ) : readyClaims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <DollarSign className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reimbursement queue is empty</p>
                    <p className="text-xs text-muted-foreground mt-1">Approved claims ready for payment will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px] border-collapse">
                    <TableHeader className="bg-muted border-b border-border">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee Name</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Claim ID</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Claim Date</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved Amount</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Mode</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readyClaims.map((claim) => {
                        const employeeName = claim.user
                          ? `${claim.user.details?.first_name || ''} ${claim.user.details?.last_name || claim.user.username || ''}`.trim()
                          : `Employee #${claim.user_id}`;
                        const isPaid = claim.status === 'Paid' || claim.payment_status === 'Paid';
                        
                        return (
                          <TableRow key={claim.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="px-6 font-medium text-foreground">{employeeName}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">#CLM-{claim.id}</TableCell>
                            <TableCell className="text-foreground">{claim.type}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(claim.expense_date || claim.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="font-black text-primary">
                              {currencySymbol}{Number(claim.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {isPaid ? (
                                <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                                  {claim.payment_mode}
                                </Badge>
                              ) : reimbFinanceCanChange === 'true' ? (
                                <PayrollSelect
                                  value={claim.payment_mode || 'Salary Payroll'}
                                  onValueChange={(val) => handleUpdatePaymentMode(claim.id, val)}
                                >
                                  <SelectTrigger className="h-8 w-[180px] bg-card">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Salary Payroll">Salary Payroll</SelectItem>
                                    <SelectItem value="Separate Reimbursement Payment">Separate Payment</SelectItem>
                                  </SelectContent>
                                </PayrollSelect>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  {claim.payment_mode || 'Salary Payroll'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                isPaid
                                  ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/30 border-none"
                                  : claim.payment_mode === 'Salary Payroll'
                                    ? "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/30 border-none"
                                    : "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/30 border-none"
                              }>
                                {isPaid ? 'Paid' : claim.payment_mode === 'Salary Payroll' ? 'Ready to Pay (Salary)' : 'Pending Settlement'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2.5 font-semibold gap-1 text-primary hover:bg-primary/10"
                                  onClick={() => setViewingClaimDetail(claim)}
                                >
                                  <Eye className="size-3.5" /> Details
                                </Button>
                                
                                {!isPaid && claim.payment_mode !== 'Salary Payroll' && (
                                  <Button
                                    size="sm"
                                    className="h-8 px-3 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    onClick={() => {
                                      setProcessingClaim(claim);
                                      setIsPayModalOpen(true);
                                      setPaymentDate(new Date().toISOString().split('T')[0]);
                                      setPaymentRef('');
                                    }}
                                  >
                                    <FileCheck className="size-3.5 mr-1" /> Pay Now
                                  </Button>
                                )}
                                
                                {!isPaid && claim.payment_mode === 'Salary Payroll' && (
                                  <div className="text-xs text-muted-foreground italic flex items-center pr-2">
                                    Payslip Run
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Process Separate Payment Dialog */}
        {isPayModalOpen && processingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="bg-card w-full max-w-md shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
              <CardHeader className="text-left border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Process Reimbursement Payment</CardTitle>
                  <CardDescription>Enter payment transaction details below</CardDescription>
                </div>
                <button 
                  onClick={() => { setIsPayModalOpen(false); setProcessingClaim(null); }}
                  className="rounded-full p-1.5 hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-left">
                <div className="rounded-lg bg-muted p-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Claim ID:</span>
                    <span className="font-semibold text-foreground font-mono">#CLM-{processingClaim.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Employee:</span>
                    <span className="font-semibold text-foreground">
                      {processingClaim.user
                        ? `${processingClaim.user.details?.first_name || ''} ${processingClaim.user.details?.last_name || processingClaim.user.username || ''}`.trim()
                        : `Employee #${processingClaim.user_id}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {currencySymbol}{Number(processingClaim.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_ref" className="text-sm font-semibold">Payment Reference / UTR Number</Label>
                  <Input 
                    id="payment_ref"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. UTR12903810239 or TXN-99812"
                    className="h-10 bg-card border border-input focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_date" className="text-sm font-semibold">Payment Date</Label>
                  <StandardDatePicker
                    value={paymentDate}
                    onChange={setPaymentDate}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2 bg-muted/30">
                <Button 
                  variant="outline" 
                  onClick={() => { setIsPayModalOpen(false); setProcessingClaim(null); }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleProcessPayment} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  disabled={!paymentRef.trim()}
                >
                  Submit Payment
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* View Details Dialog */}
        {viewingClaimDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="bg-card w-full max-w-lg shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
              <CardHeader className="text-left border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    Claim Details
                    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground uppercase">#CLM-{viewingClaimDetail.id}</Badge>
                  </CardTitle>
                  <CardDescription>Submitted by {viewingClaimDetail.user
                    ? `${viewingClaimDetail.user.details?.first_name || ''} ${viewingClaimDetail.user.details?.last_name || viewingClaimDetail.user.username || ''}`.trim()
                    : `Employee #${viewingClaimDetail.user_id}`}
                  </CardDescription>
                </div>
                <button 
                  onClick={() => setViewingClaimDetail(null)}
                  className="rounded-full p-1.5 hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-left max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Category</span>
                    <span className="font-medium text-foreground text-sm">{viewingClaimDetail.type}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Amount</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {currencySymbol}{Number(viewingClaimDetail.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Claim Date</span>
                    <span className="text-foreground text-sm">
                      {new Date(viewingClaimDetail.expense_date || viewingClaimDetail.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Submission Date</span>
                    <span className="text-foreground text-sm">
                      {new Date(viewingClaimDetail.submitted_on || viewingClaimDetail.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 border-t pt-3">
                  <span className="text-xs text-muted-foreground block">Description</span>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {viewingClaimDetail.description || 'No description provided.'}
                  </p>
                </div>

                {viewingClaimDetail.remarks && (
                  <div className="space-y-1 border-t pt-3">
                    <span className="text-xs text-muted-foreground block">Approval Remarks</span>
                    <p className="text-sm text-foreground bg-muted p-3 rounded-lg leading-relaxed italic">
                      {viewingClaimDetail.remarks}
                    </p>
                  </div>
                )}

                {viewingClaimDetail.payment_reference && (
                  <div className="space-y-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider text-primary">Payment Information</span>
                    <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-emerald-800 dark:text-emerald-300">Reference/UTR:</span>
                        <span className="font-semibold text-emerald-900 dark:text-emerald-200 font-mono">{viewingClaimDetail.payment_reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-800 dark:text-emerald-300">Date Paid:</span>
                        <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                          {new Date(viewingClaimDetail.payment_date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {viewingClaimDetail.proof_url && (
                  <div className="space-y-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground block">Receipt Proof</span>
                    <div className="border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center p-2 min-h-[150px]">
                      <img 
                        src={viewingClaimDetail.proof_url} 
                        alt="Receipt Proof" 
                        className="max-h-[300px] object-contain rounded-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const noImageText = document.createElement('div');
                            noImageText.className = 'text-center p-4 text-xs text-muted-foreground flex flex-col items-center gap-1';
                            noImageText.innerHTML = '<span class="font-bold">Unable to display preview</span><span>Proof URL is external or not an image.</span>';
                            parent.appendChild(noImageText);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end bg-muted/30">
                <Button 
                  onClick={() => setViewingClaimDetail(null)}
                  className="bg-primary hover:bg-primary/95 text-white"
                >
                  Close
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

<TabsContent value="tax-declarations" className="space-y-4">
          <TaxDeclarationApprovalHub />
        </TabsContent>

        {/* <TabsContent value="reports" className="space-y-4">
          <PayrollReportsTab payrollGroups={payrollGroups} salaryStructures={salaryStructures} employees={employees} currencySymbol={currencySymbol} />
        </TabsContent> */}

      </div>
    </Tabs>

      {/* Centered Modal for Viewing Structure */}
      {isViewDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 select-none">
          {/* Backdrop click (close) */}
          <div
            className="absolute inset-0"
            onClick={() => {
              setIsViewDrawerOpen(false);
              setViewingStructure(null);
            }}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-foreground">View Salary Structure</h2>
                <p className="text-xs text-muted-foreground mt-1">Detailed configurations of the selected structure</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsViewDrawerOpen(false);
                  setViewingStructure(null);
                }}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-hidden p-6 space-y-4 text-left flex flex-col min-h-0">
              {viewingStructure && (() => {
                const activeStructure = salaryStructures.find(s => s.id === viewingStructure.id) || viewingStructure;
                const viewComponents = (() => {
                  const existing = activeStructure.components || [];
                  const defaults = salaryComponents.filter(c => c.isDefault);
                  const merged = [...existing];
                  for (const d of defaults) {
                    if (!merged.some(c => c.name === d.name)) {
                      merged.push({ ...d, id: `struct-view-stable-${d.id}` });
                    }
                  }
                  return merged;
                })();

                return (
                  <>
                    {/* Basic Information */}
                    <Card className="border-primary-100 shadow-sm shrink-0">
                      <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30 py-3">
                        <CardTitle className="text-base font-bold text-primary">Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-muted-foreground uppercase block">Structure Name</span>
                          <span className="text-sm font-semibold text-foreground block pt-0.5">{activeStructure.name}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase block">Structure Level</span>
                            <Badge variant={activeStructure.level === 'role' ? 'default' : 'outline'} className={activeStructure.level === 'role' ? 'bg-primary text-white mt-0.5' : 'text-primary border-blue-200 dark:border-blue-800 mt-0.5'}>
                              {activeStructure.level === 'role' ? 'Role Level' : 'Employee Level'}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase block">Target</span>
                            <span className="text-sm font-semibold text-foreground block pt-0.5">
                              {activeStructure.level === 'role'
                                ? allRolesRef.current?.find(r => r.id?.toString() === activeStructure.roleId?.toString())?.name || activeStructure.roleId || 'N/A'
                                : employees?.find(e => e.id === activeStructure.employeeId)?.name || activeStructure.employeeId || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase block">Salary Grade</span>
                            <span className="text-sm font-semibold text-foreground block pt-0.5">{activeStructure.grade || 'N/A'}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase block">Annual CTC</span>
                            <span className="text-sm font-bold text-primary block pt-0.5">
                              {activeStructure.ctc !== undefined ? `${currencySymbol} ${activeStructure.ctc.toLocaleString()}` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Selected Components */}
                    <Card className="border-primary-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
                      <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30 py-3 shrink-0">
                        <CardTitle className="text-base font-bold text-primary">Selected Components ({viewComponents.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto bg-muted/50 rounded-b-lg custom-scrollbar">
                          <Table className="min-w-[500px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12 text-center font-bold text-foreground">#</TableHead>
                                <TableHead className="font-bold text-foreground">Component Name</TableHead>
                                <TableHead className="font-bold text-foreground">Type</TableHead>
                                <TableHead className="text-right font-bold text-foreground">Value</TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewComponents.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground italic">
                                    No components configured in this structure.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                viewComponents.map((comp, idx) => (
                                  <TableRow key={comp.id || idx} className="group hover:bg-muted/50 border-none">
                                    <TableCell className="text-center font-medium text-muted-foreground text-xs">
                                      {idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">
                                      <div className="flex items-center gap-1.5">
                                        {comp.name}
                                        {comp.isDefault && (
                                          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">Auto</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{comp.calculationType}</p>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={comp.type === 'earning' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 
'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'}>
                                        {comp.type === 'earning' ? 'Earning' : 'Deduction'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-foreground">
                                      {comp.type === 'earning' ? '+' : '-'}{comp.calculationType === 'fixed' ? `${currencySymbol}${comp.value.toLocaleString()}` : `${comp.value}%`}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {comp.isDefault ? (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Locked</span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-muted-foreground">Custom</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/20 shrink-0">
              <Button
                onClick={() => {
                  setIsViewDrawerOpen(false);
                  setViewingStructure(null);
                }}
                className="bg-primary hover:bg-primary/95 px-6 font-semibold shadow-md"
              >
                Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div >
  );
}

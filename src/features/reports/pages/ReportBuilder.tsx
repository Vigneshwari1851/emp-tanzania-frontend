import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet, Download, RefreshCw, Plus, Trash2,
  Search, FileText, ChevronLeft, ChevronRight, Loader2, Save, FolderOpen,
  Calendar, BarChart3, Eye, ChevronDown, Settings, X, Printer,
  PlusCircle, Mail, Clock, Play, MoreVertical, Check, Info, FileEdit,
  Activity, CheckCircle2, Pause
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import api from '@/shared/services/axiosInstance';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import Select from '@/shared/components/ui/Select';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import { useCurrency } from '@/shared/hooks/useCurrency';
import { maskSensitiveValue } from '../utils/masking';

// Define TS Interfaces
interface FieldSchema {
  key: string;
  label: string;
  category: string;
  isCategorical?: boolean;
  isNumeric?: boolean;
}

interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SortRule {
  id: string;
  field: string;
  direction: 'Asc' | 'Desc';
}

interface SavedReport {
  id: string;
  name: string;
  description: string;
  module: string;
  columns: string[];
  filters: FilterRule[];
  sorts: SortRule[];
  layout: 'table' | 'chart' | 'summary';
  chartSettings?: {
    type: string;
    xAxis: string;
    yAxis: string;
    colorPalette: string;
    showLegend: boolean;
    dataLabels: boolean;
  };
  created_at: string;
  last_run?: string;
  run_count: number;
}

interface ScheduledReport {
  id: string;
  templateId?: string;
  name: string;
  frequency: string;
  time: string;
  recipients: string;
  format: string;
  status: 'Active' | 'Paused';
  next_run: string;
}

const MODULES = [
  { value: 'employees', label: 'Employee Directory' },
  { value: 'leaves', label: 'Leave Records' },
  { value: 'exits', label: 'Exit Management' },
  { value: 'loans', label: 'Loans and Advances' },
  { value: 'reimbursements', label: 'Reimbursements' },
  { value: 'payroll', label: 'Payroll' },
];

const COMMON_EMPLOYEE_FIELDS: FieldSchema[] = [
  // Personal Details
  { key: 'details.employee_id', label: 'Employee ID', category: 'Professional Details' },
  { key: 'name', label: 'Full Name', category: 'Personal Details' },
  { key: 'email', label: 'Email Address', category: 'Personal Details' },
  { key: 'details.phone', label: 'Phone Number', category: 'Personal Details' },
  { key: 'details.gender', label: 'Gender', category: 'Personal Details', isCategorical: true },
  { key: 'details.date_of_birth', label: 'Date of Birth', category: 'Personal Details' },
  { key: 'details.blood_group', label: 'Blood Group', category: 'Personal Details', isCategorical: true },

  // Professional Details
  { key: 'details.department.department_name', label: 'Department', category: 'Professional Details', isCategorical: true },
  { key: 'details.designation.designation_name', label: 'Designation', category: 'Professional Details', isCategorical: true },
  { key: 'details.role.role_name', label: 'Job Role', category: 'Professional Details', isCategorical: true },
  { key: 'details.employment_type', label: 'Employment Type', category: 'Professional Details', isCategorical: true },
  { key: 'details.work_location', label: 'Work Location', category: 'Professional Details', isCategorical: true },
  { key: 'details.start_date', label: 'Joining Date', category: 'Professional Details' },
  { key: 'details.probation_period', label: 'Probation Period', category: 'Professional Details' },
  { key: 'details.reporting_manager.username', label: 'Reporting Manager', category: 'Professional Details' },
  { key: 'details.team.team_name', label: 'Team', category: 'Professional Details', isCategorical: true },
  { key: 'details.payroll_group.name', label: 'Payroll Group', category: 'Professional Details', isCategorical: true },
  { key: 'details.user_types.name', label: 'User Type', category: 'Professional Details', isCategorical: true },
  { key: 'details.shift_id', label: 'Shift', category: 'Professional Details', isCategorical: true },

  // Address Details
  { key: 'details.address', label: 'Address', category: 'Address Details' },
  { key: 'details.city', label: 'City', category: 'Address Details', isCategorical: true },
  { key: 'details.state', label: 'State', category: 'Address Details', isCategorical: true },
  { key: 'details.country', label: 'Country', category: 'Address Details', isCategorical: true },

  // Financial Details & Compliance
  { key: 'details.base_salary', label: 'Base Salary', category: 'Financial Details', isNumeric: true },
  { key: 'details.bank_name', label: 'Bank Name', category: 'Financial Details', isCategorical: true },
  { key: 'details.account_number', label: 'Account Number', category: 'Financial Details' },
  { key: 'details.ifsc_code', label: 'IFSC Code', category: 'Financial Details' },
  { key: 'details.pan_number', label: 'PAN Number', category: 'Compliance' },
  { key: 'details.aadhaar_number', label: 'Aadhaar Number', category: 'Compliance' },
  { key: 'details.passport_number', label: 'Passport Number', category: 'Compliance' },
  { key: 'details.passport_expiry_date', label: 'Passport Expiry Date', category: 'Compliance' },
  { key: 'details.driving_license_number', label: 'Driving License Number', category: 'Compliance' },
  { key: 'details.license_expiry_date', label: 'License Expiry Date', category: 'Compliance' },
  { key: 'details.esi_number', label: 'ESI Number', category: 'Compliance' },
  { key: 'details.pf_uan', label: 'PF UAN', category: 'Compliance' },
  { key: 'details.tax_regime', label: 'Tax Regime', category: 'Compliance', isCategorical: true },
  { key: 'details.is_nri', label: 'Is NRI?', category: 'Compliance', isCategorical: true },
  { key: 'details.is_senior_citizen', label: 'Is Senior Citizen?', category: 'Compliance', isCategorical: true },
  { key: 'details.emergency_contact', label: 'Emergency Contact Name', category: 'Emergency Contact' },
  { key: 'details.emergency_relationship', label: 'Emergency Relationship', category: 'Emergency Contact', isCategorical: true },
  { key: 'details.emergency_phone', label: 'Emergency Phone', category: 'Emergency Contact' },
  { key: 'details.emergency_email', label: 'Emergency Email', category: 'Emergency Contact' },
];

const SHARED_USER_FIELDS: FieldSchema[] = COMMON_EMPLOYEE_FIELDS
  .filter(f => f.key.startsWith('details.') || f.key === 'email')
  .map(f => ({
    ...f,
    key: f.key === 'email' ? 'user.email' : `user.${f.key}`
  }));

const ASSET_USER_FIELDS: FieldSchema[] = [
  { key: 'department', label: 'Department', category: 'Assigned Employee', isCategorical: true },
  { key: 'employee_id', label: 'Employee ID', category: 'Assigned Employee' },
  { key: 'designation', label: 'Designation', category: 'Assigned Employee', isCategorical: true },
  { key: 'job_role', label: 'Job Role', category: 'Assigned Employee', isCategorical: true },
  { key: 'employment_type', label: 'Employment Type', category: 'Assigned Employee', isCategorical: true },
  { key: 'work_location', label: 'Work Location', category: 'Assigned Employee', isCategorical: true },
  { key: 'joining_date', label: 'Joining Date', category: 'Assigned Employee' },
  { key: 'probation_period', label: 'Probation Period', category: 'Assigned Employee' },
  { key: 'reporting_manager', label: 'Reporting Manager', category: 'Assigned Employee' },
  { key: 'team', label: 'Team', category: 'Assigned Employee', isCategorical: true },
  { key: 'payroll_group', label: 'Payroll Group', category: 'Assigned Employee', isCategorical: true },
  { key: 'user_type', label: 'User Type', category: 'Assigned Employee', isCategorical: true },
  { key: 'shift', label: 'Shift', category: 'Assigned Employee', isCategorical: true },
  { key: 'email', label: 'Email Address', category: 'Assigned Employee' },
  { key: 'phone', label: 'Phone Number', category: 'Assigned Employee' },
  { key: 'gender', label: 'Gender', category: 'Assigned Employee', isCategorical: true },
  { key: 'date_of_birth', label: 'Date of Birth', category: 'Assigned Employee' },
  { key: 'blood_group', label: 'Blood Group', category: 'Assigned Employee', isCategorical: true },
  { key: 'address', label: 'Address', category: 'Assigned Employee' },
  { key: 'city', label: 'City', category: 'Assigned Employee', isCategorical: true },
  { key: 'state', label: 'State', category: 'Assigned Employee', isCategorical: true },
  { key: 'country', label: 'Country', category: 'Assigned Employee', isCategorical: true },
  { key: 'base_salary', label: 'Base Salary', category: 'Assigned Employee', isNumeric: true },
  { key: 'bank_name', label: 'Bank Name', category: 'Assigned Employee', isCategorical: true },
  { key: 'account_number', label: 'Account Number', category: 'Assigned Employee' },
  { key: 'ifsc_code', label: 'IFSC Code', category: 'Assigned Employee' },
  { key: 'pan_number', label: 'PAN Number', category: 'Assigned Employee' },
  { key: 'aadhaar_number', label: 'Aadhaar Number', category: 'Assigned Employee' },
  { key: 'passport_number', label: 'Passport Number', category: 'Assigned Employee' },
  { key: 'passport_expiry_date', label: 'Passport Expiry Date', category: 'Assigned Employee' },
  { key: 'driving_license_number', label: 'Driving License Number', category: 'Assigned Employee' },
  { key: 'license_expiry_date', label: 'License Expiry Date', category: 'Assigned Employee' },
  { key: 'esi_number', label: 'ESI Number', category: 'Assigned Employee' },
  { key: 'pf_uan', label: 'PF UAN', category: 'Assigned Employee' },
  { key: 'tax_regime', label: 'Tax Regime', category: 'Assigned Employee', isCategorical: true },
  { key: 'is_nri', label: 'Is NRI?', category: 'Assigned Employee', isCategorical: true },
  { key: 'is_senior_citizen', label: 'Is Senior Citizen?', category: 'Assigned Employee', isCategorical: true },
  { key: 'emergency_contact', label: 'Emergency Contact Name', category: 'Assigned Employee' },
  { key: 'emergency_relationship', label: 'Emergency Relationship', category: 'Assigned Employee', isCategorical: true },
  { key: 'emergency_phone', label: 'Emergency Phone', category: 'Assigned Employee' },
  { key: 'emergency_email', label: 'Emergency Email', category: 'Assigned Employee' },
];

const MODULE_SCHEMAS: Record<string, FieldSchema[]> = {
  employees: [
    ...COMMON_EMPLOYEE_FIELDS,
    { key: 'status', label: 'Status', category: 'Professional Details', isCategorical: true },
  ],
  leaves: [
    { key: 'id', label: 'Request ID', category: 'Request Info' },
    { key: 'leave_type', label: 'Leave Type', category: 'Request Info', isCategorical: true },
    { key: 'status', label: 'Status', category: 'Request Info', isCategorical: true },
    { key: 'start_date', label: 'Start Date', category: 'Duration' },
    { key: 'end_date', label: 'End Date', category: 'Duration' },
    { key: 'duration', label: 'Duration (Days)', category: 'Duration', isNumeric: true },
    { key: 'employee_name', label: 'Employee Name', category: 'Applicant & Details' },
    { key: 'reason', label: 'Reason', category: 'Applicant & Details' },
    ...SHARED_USER_FIELDS,
  ],
  exits: [
    { key: 'id', label: 'Exit ID', category: 'Exit Info' },
    { key: 'exit_type', label: 'Exit Type', category: 'Exit Info', isCategorical: true },
    { key: 'status', label: 'Status', category: 'Exit Info', isCategorical: true },
    { key: 'last_working_day', label: 'Last Working Day', category: 'Timeline' },
    { key: 'notice_period', label: 'Notice Period (Days)', category: 'Timeline', isNumeric: true },
    { key: 'employee_name', label: 'Employee Name', category: 'Details' },
    { key: 'reason', label: 'Reason', category: 'Details' },
    { key: 'progress_percentage', label: 'Progress (%)', category: 'Details', isNumeric: true },
    ...SHARED_USER_FIELDS,
  ],
  assets: [
    { key: 'id', label: 'Asset ID', category: 'Asset Info' },
    { key: 'asset_code', label: 'Asset Code', category: 'Asset Info' },
    { key: 'asset_tag', label: 'Asset Tag', category: 'Asset Info' },
    { key: 'name', label: 'Asset Name', category: 'Asset Info' },
    { key: 'description', label: 'Description', category: 'Asset Info' },
    { key: 'manufacturer', label: 'Manufacturer', category: 'Asset Info', isCategorical: true },
    { key: 'model', label: 'Model', category: 'Asset Info', isCategorical: true },
    { key: 'serial_number', label: 'Serial Number', category: 'Asset Info' },
    { key: 'barcode', label: 'Barcode', category: 'Asset Info' },
    { key: 'category.name', label: 'Category', category: 'Asset Info', isCategorical: true },
    { key: 'location.name', label: 'Location', category: 'Asset Info', isCategorical: true },
    { key: 'status', label: 'Status', category: 'Asset Info', isCategorical: true },
    { key: 'purchase_price', label: 'Purchase Price', category: 'Financial Details', isNumeric: true },
    { key: 'purchase_date', label: 'Purchase Date', category: 'Financial Details' },
    { key: 'current_value', label: 'Current Value', category: 'Financial Details', isNumeric: true },
    { key: 'warranty_expiry', label: 'Warranty Expiry', category: 'Financial Details' },
    { key: 'depreciation_rate', label: 'Depreciation Rate (%)', category: 'Financial Details', isNumeric: true },
    { key: 'created_at', label: 'Added Date', category: 'System Info' },
    { key: 'updated_at', label: 'Last Updated', category: 'System Info' },
    { key: 'employee_name', label: 'Assigned Employee Name', category: 'Assigned Employee' },
    ...ASSET_USER_FIELDS,
  ],
  loans: [
    { key: 'id', label: 'Loan ID', category: 'Basic Details' },
    { key: 'principalAmount', label: 'Principal Amount', category: 'Basic Details', isNumeric: true },
    { key: 'disbursed_at', label: 'Disbursed Date', category: 'Basic Details' },
    { key: 'status', label: 'Status', category: 'Basic Details', isCategorical: true },
    { key: 'monthlyRecovery', label: 'EMI Amount', category: 'Repayment Info', isNumeric: true },
    { key: 'outstandingBalance', label: 'Balance Amount', category: 'Repayment Info', isNumeric: true },
    { key: 'reason', label: 'Reason/Type', category: 'Approval Details' },
    { key: 'created_at', label: 'Requested Date', category: 'Approval Details' },
    { key: 'manager_approved_at', label: 'Manager Approved', category: 'Approval Details' },
    { key: 'hr_approved_at', label: 'HR Approved', category: 'Approval Details' },
    { key: 'finance_approved_at', label: 'Finance Approved', category: 'Approval Details' },
    { key: 'employee_name', label: 'Employee Name', category: 'Employee Info' },
    ...ASSET_USER_FIELDS,
  ],
  reimbursements: [
    { key: 'id', label: 'Claim ID', category: 'Claim Details' },
    { key: 'type', label: 'Claim Type', category: 'Claim Details', isCategorical: true },
    { key: 'expense_date', label: 'Expense Date', category: 'Claim Details' },
    { key: 'amount', label: 'Claim Amount', category: 'Claim Details', isNumeric: true },
    { key: 'status', label: 'Status', category: 'Status & Payment', isCategorical: true },
    { key: 'payment_status', label: 'Payment Status', category: 'Status & Payment', isCategorical: true },
    { key: 'payment_date', label: 'Payment Date', category: 'Status & Payment' },
    { key: 'payment_mode', label: 'Payment Mode', category: 'Status & Payment', isCategorical: true },
    { key: 'proof_url', label: 'Receipt Provided', category: 'Supporting Docs', isCategorical: true },
    { key: 'remarks', label: 'Remarks', category: 'Supporting Docs' },
    { key: 'employee_name', label: 'Employee Name', category: 'Employee Info' },
    ...ASSET_USER_FIELDS,
  ],
  payroll: [
    { key: 'id', label: 'Payslip ID', category: 'Payroll Details' },
    { key: 'month', label: 'Payroll Month', category: 'Payroll Details', isCategorical: true },
    { key: 'gross_amount', label: 'Gross Amount', category: 'Payroll Details', isNumeric: true },
    { key: 'deduction_amount', label: 'Deductions', category: 'Payroll Details', isNumeric: true },
    { key: 'net_amount', label: 'Net Amount', category: 'Payroll Details', isNumeric: true },
    { key: 'status', label: 'Status', category: 'Payroll Details', isCategorical: true },
    { key: 'employee_name', label: 'Employee Name', category: 'Employee Info' },
    ...ASSET_USER_FIELDS,
  ],
};

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
];

export const ReportBuilder: React.FC = () => {
  const { currencyCode, config } = useCurrency();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedModule, setSelectedModule] = useState<string>('employees');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const appliedFields = selectedFields;
  const setAppliedFields = (f: any) => {};

  // Save Report Modal States
  const [showSaveReportModal, setShowSaveReportModal] = useState<boolean>(false);
  const [saveReportTitle, setSaveReportTitle] = useState<string>('');
  const [saveReportDescription, setSaveReportDescription] = useState<string>('');

  // Save Template Modal States
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);
  const [saveTemplateTitle, setSaveTemplateTitle] = useState<string>('');
  const [saveTemplateDescription, setSaveTemplateDescription] = useState<string>('');

  // Saved report snapshots states
  const [savedInstances, setSavedInstances] = useState<any[]>([]);
  const [snapshotSearchTerm, setSnapshotSearchTerm] = useState<string>('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);
  const [snapshotPreviewOpen, setSnapshotPreviewOpen] = useState<boolean>(false);
  const [snapshotDropdownId, setSnapshotDropdownId] = useState<string | null>(null);
  const [templateExportDropdownId, setTemplateExportDropdownId] = useState<string | null>(null);
  const [snapshotCurrentPage, setSnapshotCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);

  // Layout Options
  const [reportLayout, setReportLayout] = useState<'table' | 'chart' | 'summary'>('table');
  const [chartType, setChartType] = useState<string>('Column Chart');
  const [chartXAxis, setChartXAxis] = useState<string>('');
  const [chartYAxis, setChartYAxis] = useState<string>('Count');
  const [chartShowLegend, setChartShowLegend] = useState<boolean>(true);
  const [chartDataLabels, setChartDataLabels] = useState<boolean>(true);
  const [chartColorPalette, setChartColorPalette] = useState<string>('blue');

  // Search & Metadata
  const [fieldSearch, setFieldSearch] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [reportName, setReportName] = useState<string>('');
  const [reportDescription, setReportDescription] = useState<string>('');

  // Loaded/Mock Saved Data
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportLibrary, setReportLibrary] = useState<SavedReport[]>([]);

  // Data State
  const [rawSourceData, setRawSourceData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [dataLimit, setDataLimit] = useState<number>(1000);

  // Modals & Popovers
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [selectedTemplateForSchedule, setSelectedTemplateForSchedule] = useState<SavedReport | null>(null);

  // Schedule Form State
  const [scheduleFrequency, setScheduleFrequency] = useState<string>('Daily');
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');
  const [scheduleRecipients, setScheduleRecipients] = useState<string>('');
  const [scheduleFormat, setScheduleFormat] = useState<string>('PDF');

  // Export Container Ref for PNG
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (selectedModule === 'employees') endpoint = `/employees?limit=${dataLimit}`;
      else if (selectedModule === 'leaves') endpoint = `/leaves/history?limit=${dataLimit}`;
      else if (selectedModule === 'exits') endpoint = `/exit/all-requests?limit=${dataLimit}`;
      else if (selectedModule === 'assets') endpoint = `/assets?limit=${dataLimit}`;
      else if (selectedModule === 'loans') endpoint = `/loans-advances/loans?limit=${dataLimit}`;
      else if (selectedModule === 'reimbursements') endpoint = `/payroll/reimbursements/all-claims?limit=${dataLimit}`;
      else if (selectedModule === 'payroll') endpoint = `/payroll/payslips`;

      if (endpoint) {
        const res = await api.get(endpoint);
        let items = [];
        if (selectedModule === 'employees' || selectedModule === 'leaves' || selectedModule === 'exits') {
          items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
        } else if (selectedModule === 'assets') {
          items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.assets || res.data.data?.data || []);
        } else {
          items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data || res.data.data?.items || res.data.data?.loans || res.data.data?.claims || res.data.data?.reimbursements || res.data.data?.payslips || []);
        }
        setRawSourceData(items);
        setHasGenerated(true);
        setCurrentPage(1);
      }
    } catch (e: any) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize fields on module switch
  useEffect(() => {
    const fields = MODULE_SCHEMAS[selectedModule] || [];
    const defaultFields = fields.slice(0, 5).map(f => f.key);
    setSelectedFields(defaultFields);
    setAppliedFields(defaultFields);

    // Auto-populate XAxis and YAxis for charting
    const numericField = fields.find(f => f.key.includes('salary') || f.key.includes('price') || f.key.includes('days'));
    const firstCategorical = fields.find(f => f.key.includes('department') && f.isCategorical) || fields.find(f => f.isCategorical) || fields[0];
    setChartXAxis(firstCategorical?.key || '');
    setChartYAxis(numericField?.key || 'Count');

    // Reset runtime states
    setFilters([]);
    setSorts([]);
    setRawSourceData([]);

    // Expand categories by default
    const uniqueCats = Array.from(new Set(fields.map(f => f.category)));
    setExpandedCategories(uniqueCats);

    // Auto-fetch data for live preview
    handleGenerateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModule]);

  // Migrate old nested keys to flat keys automatically
  useEffect(() => {
    if (['assets', 'loans', 'reimbursements'].includes(selectedModule)) {
      const migrateKeys = (keys: string[]) => {
        const migrationMap: Record<string, string> = {
          'user.details.department.department_name': 'department',
          'user.details.employee_id': 'employee_id',
          'user.details.designation.designation_name': 'designation',
          'user.details.role.role_name': 'job_role',
          'user.details.employment_type': 'employment_type',
          'user.details.work_location': 'work_location',
          'user.details.start_date': 'joining_date',
          'user.details.probation_period': 'probation_period',
          'user.details.reporting_manager.username': 'reporting_manager',
          'user.details.team.team_name': 'team',
          'user.details.payroll_group.name': 'payroll_group',
          'user.details.user_types.name': 'user_type',
          'user.details.shift_id': 'shift',
          'user.email': 'email',
          'user.details.phone': 'phone',
          'user.details.gender': 'gender',
          'user.details.date_of_birth': 'date_of_birth',
          'user.details.blood_group': 'blood_group',
          'user.details.address': 'address',
          'user.details.city': 'city',
          'user.details.state': 'state',
          'user.details.country': 'country',
          'user.details.aadhaar_number': 'aadhaar_number',
          'user.details.base_salary': 'base_salary',
          'user.details.bank_name': 'bank_name',
          'user.details.account_number': 'account_number',
          'user.details.ifsc_code': 'ifsc_code',
          'user.details.pan_number': 'pan_number',
          'user.details.passport_number': 'passport_number',
          'user.details.passport_expiry_date': 'passport_expiry_date',
          'user.details.driving_license_number': 'driving_license_number',
          'user.details.license_expiry_date': 'license_expiry_date',
          'user.details.esi_number': 'esi_number',
          'user.details.pf_uan': 'pf_uan',
          'user.details.tax_regime': 'tax_regime',
          'user.details.is_nri': 'is_nri',
          'user.details.is_senior_citizen': 'is_senior_citizen',
          'user.details.emergency_contact': 'emergency_contact',
          'user.details.emergency_relationship': 'emergency_relationship',
          'user.details.emergency_phone': 'emergency_phone',
          'user.details.emergency_email': 'emergency_email'
        };
        return keys.map(k => migrationMap[k] || k);
      };

      const newSelected = migrateKeys(selectedFields);
      const newApplied = migrateKeys(appliedFields);

      if (JSON.stringify(newSelected) !== JSON.stringify(selectedFields)) {
        setSelectedFields(newSelected);
      }
      if (JSON.stringify(newApplied) !== JSON.stringify(appliedFields)) {
        setAppliedFields(newApplied);
      }
    }
  }, [selectedFields, appliedFields, selectedModule]);

  // Load persistence states
  useEffect(() => {
    const saved = localStorage.getItem('emp_xp_reports_configs');
    if (saved) {
      try {
        setSavedReports(JSON.parse(saved));
      } catch (e) { }
    } else {
      // Default Mock Saved configs
      const defaultSaved: SavedReport[] = [
        {
          id: 'mock-1',
          name: 'Employee Salary Distribution',
          description: 'Overview of salary budgets across departments.',
          module: 'employees',
          columns: ['details.employee_id', 'name', 'details.department.department_name', 'details.job_role', 'details.base_salary'],
          filters: [],
          sorts: [{ id: 's1', field: 'details.base_salary', direction: 'Desc' }],
          layout: 'chart',
          chartSettings: {
            type: 'Column Chart',
            xAxis: 'details.department.department_name',
            yAxis: 'details.base_salary',
            colorPalette: 'blue',
            showLegend: true,
            dataLabels: true
          },
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleString(),
          run_count: 14
        },
        {
          id: 'mock-2',
          name: 'Active Leave Details',
          description: 'A tracking table of all active or pending leaves.',
          module: 'leaves',
          columns: ['id', 'employee_name', 'leave_type', 'start_date', 'end_date', 'total_days', 'status'],
          filters: [{ id: 'f1', field: 'status', operator: 'equals', value: 'approved' }],
          sorts: [],
          layout: 'table',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleString(),
          run_count: 8
        }
      ];
      setSavedReports(defaultSaved);
      localStorage.setItem('emp_xp_reports_configs', JSON.stringify(defaultSaved));
    }

    const schedules = localStorage.getItem('emp_xp_reports_schedules');
    if (schedules) {
      try {
        setScheduledReports(JSON.parse(schedules));
      } catch (e) { }
    } else {
      const defaultSchedules: ScheduledReport[] = [
        {
          id: 'sched-1',
          templateId: 'mock-2',
          name: 'Active Leave Details',
          frequency: 'Weekly on Monday',
          time: '09:00 AM',
          recipients: 'hr@lattium.com, manager@lattium.com',
          format: 'Excel',
          status: 'Active',
          next_run: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      ];
      setScheduledReports(defaultSchedules);
      localStorage.setItem('emp_xp_reports_schedules', JSON.stringify(defaultSchedules));
    }

    const snapshots = localStorage.getItem('emp_xp_saved_reports_snapshots');
    if (snapshots) {
      try {
        setSavedInstances(JSON.parse(snapshots));
      } catch (e) {}
    }
  }, []);

  // Helper to extract nested values
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj) return '';

    // Alias mapping for flattened Asset user fields
    const aliasMap: Record<string, string> = {
      'department': 'user.details.department.department_name',
      'employee_id': 'user.details.employee_id',
      'designation': 'user.details.designation.designation_name',
      'job_role': 'user.details.role.role_name',
      'employment_type': 'user.details.employment_type',
      'work_location': 'user.details.work_location',
      'joining_date': 'user.details.start_date',
      'probation_period': 'user.details.probation_period',
      'reporting_manager': 'user.details.reporting_manager.username',
      'team': 'user.details.team.team_name',
      'payroll_group': 'user.details.payroll_group.name',
      'user_type': 'user.details.user_types.name',
      'shift': 'user.details.shift_id',
      'email': 'user.email',
      'phone': 'user.details.phone',
      'gender': 'user.details.gender',
      'date_of_birth': 'user.details.date_of_birth',
      'blood_group': 'user.details.blood_group',
      'address': 'user.details.address',
      'city': 'user.details.city',
      'state': 'user.details.state',
      'country': 'user.details.country',
      'aadhaar_number': 'user.details.aadhaar_number',
      'base_salary': 'user.details.base_salary',
      'bank_name': 'user.details.bank_name',
      'account_number': 'user.details.account_number',
      'ifsc_code': 'user.details.ifsc_code',
      'pan_number': 'user.details.pan_number',
      'passport_number': 'user.details.passport_number',
      'passport_expiry_date': 'user.details.passport_expiry_date',
      'driving_license_number': 'user.details.driving_license_number',
      'license_expiry_date': 'user.details.license_expiry_date',
      'esi_number': 'user.details.esi_number',
      'pf_uan': 'user.details.pf_uan',
      'tax_regime': 'user.details.tax_regime',
      'is_nri': 'user.details.is_nri',
      'is_senior_citizen': 'user.details.is_senior_citizen',
      'emergency_contact': 'user.details.emergency_contact',
      'emergency_relationship': 'user.details.emergency_relationship',
      'emergency_phone': 'user.details.emergency_phone',
      'emergency_email': 'user.details.emergency_email'
    };

    if ((obj.assignments || selectedModule === 'loans' || selectedModule === 'reimbursements' || selectedModule === 'payroll') && aliasMap[path]) {
      path = aliasMap[path];
    }

    // Handle Asset module nested user resolution (for assignments)
    if (obj.assignments && Array.isArray(obj.assignments) && obj.assignments.length > 0) {
      obj = { ...obj, user: obj.assignments[0]?.user };
    } else if (selectedModule === 'loans' || selectedModule === 'reimbursements') {
      // Normalize user object for new modules if not present
      if (!obj.user && (obj.userDetail || obj.employee)) {
        const ud = obj.userDetail || obj.employee?.details;
        const usr = obj.userDetail?.user || obj.employee;
        obj = { ...obj, user: { ...usr, details: ud } };
      }
    }

    if (path === 'name') {
      if (obj.name) return obj.name;
      const first = obj.details?.first_name || '';
      const last = obj.details?.last_name || '';
      return `${first} ${last}`.trim() || obj.username || '';
    }
    if (path === 'employee_name') {
      const first = obj.user?.details?.first_name || '';
      const last = obj.user?.details?.last_name || '';
      return `${first} ${last}`.trim() || obj.user?.username || '';
    }
    if (path === 'details.job_role' || path === 'user.details.job_role') {
      const details = path.startsWith('user.') ? obj.user?.details : obj.details;
      return details?.designation?.designation_name || details?.role?.role_name || '';
    }
    if (path === 'leave_type') {
      return obj.leave_policy?.policy_name || obj.leave_policy?.leave_type || '';
    }
    if (path === 'notice_period') {
      return obj.notice_period_days !== undefined ? obj.notice_period_days : obj.notice_period;
    }
    if (path === 'reason') {
      return obj.reason || obj.primary_reason || obj.explanation || '';
    }
    return path.split('.').reduce((acc, part) => {
      return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
  };

  const formatDisplayValue = (val: any, path: string): string => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (path.includes('base_salary') || path.includes('purchase_price') || path.includes('current_value')) {
      return new Intl.NumberFormat(config?.locale || 'en-US', { style: 'currency', currency: currencyCode || 'USD', maximumFractionDigits: 0 }).format(parseFloat(val));
    }

    const dateFields = ['date', 'day', '_at'];
    const isDateField = dateFields.some(df => path.toLowerCase().includes(df));
    if (isDateField || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val))) {
      if (!val) return '-';
      return new Date(val).toLocaleDateString(config?.locale || 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    return String(val);
  };

  const handleToggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleFieldToggle = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const handleAddFilter = () => {
    const fields = MODULE_SCHEMAS[selectedModule] || [];
    if (fields.length === 0) return;
    setFilters(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        field: fields[0].key,
        operator: 'contains',
        value: '',
      }
    ]);
  };

  const handleAddSort = () => {
    const fields = MODULE_SCHEMAS[selectedModule] || [];
    if (fields.length === 0) return;
    setSorts(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        field: fields[0].key,
        direction: 'Asc',
      }
    ]);
  };

  // Run Report Functionality
  const handleRefreshData = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one column before refreshing data.");
      return;
    }
    setLoading(true);
    try {
      let endpoint = '';
      if (selectedModule === 'employees') endpoint = `/employees?limit=${dataLimit}`;
      else if (selectedModule === 'leaves') endpoint = `/leaves/history?limit=${dataLimit}`;
      else if (selectedModule === 'exits') endpoint = `/exit/all-requests?limit=${dataLimit}`;
      else if (selectedModule === 'assets') endpoint = `/assets?limit=${dataLimit}`;
      else if (selectedModule === 'loans') endpoint = `/loans-advances/loans?limit=${dataLimit}`;
      else if (selectedModule === 'reimbursements') endpoint = `/payroll/reimbursements/all-claims?limit=${dataLimit}`;
      else if (selectedModule === 'payroll') endpoint = `/payroll/payslips`;

      const res = await api.get(endpoint);
      let items = [];
      if (selectedModule === 'employees') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
      } else if (selectedModule === 'leaves') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
      } else if (selectedModule === 'exits') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
      } else if (selectedModule === 'assets') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.assets || res.data.data?.data || []);
      } else {
        // Fallback for new modules (loans, reimbursements, payroll)
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data || res.data.data?.items || res.data.data?.loans || res.data.data?.claims || res.data.data?.reimbursements || res.data.data?.payslips || []);
      }

      setRawSourceData(items);
      setHasGenerated(true);
      setCurrentPage(1);
      toast.success(`Refreshed preview with ${items.length} base items loaded.`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load backend dataset.");
    } finally {
      setLoading(false);
    }
  };

  // Saved Config management
  const handleSaveConfig = () => {
    if (!saveTemplateTitle.trim()) {
      toast.error("Please specify a template name to save this configuration.");
      return;
    }

    const newConfig: SavedReport = {
      id: Math.random().toString(36).substring(2, 9),
      name: saveTemplateTitle,
      description: saveTemplateDescription || 'Custom structured template',
      module: selectedModule,
      columns: selectedFields,
      filters,
      sorts,
      layout: reportLayout,
      chartSettings: reportLayout === 'chart' ? {
        type: chartType,
        xAxis: chartXAxis,
        yAxis: chartYAxis,
        colorPalette: chartColorPalette,
        showLegend: chartShowLegend,
        dataLabels: chartDataLabels
      } : undefined,
      created_at: new Date().toLocaleString(),
      run_count: 0
    };

    const updated = [newConfig, ...savedReports];
    setSavedReports(updated);
    localStorage.setItem('emp_xp_reports_configs', JSON.stringify(updated));
    setSaveTemplateTitle('');
    setSaveTemplateDescription('');
    setShowSaveTemplateModal(false);
    toast.success(`Successfully saved "${newConfig.name}" template.`);
  };

  const handleSaveReport = () => {
    if (!saveReportTitle.trim()) {
      toast.error("Please specify a report snapshot name.");
      return;
    }

    const newSnapshot = {
      id: Math.random().toString(36).substring(2, 9),
      title: saveReportTitle,
      description: saveReportDescription || 'Archived snapshot data',
      module: selectedModule,
      columns: selectedFields,
      data_snapshot: finalProcessedData,
      total_records: finalProcessedData.length,
      created_by: 'Current User',
      created_at: new Date().toLocaleString()
    };

    const updated = [newSnapshot, ...savedInstances];
    setSavedInstances(updated);
    localStorage.setItem('emp_xp_saved_reports_snapshots', JSON.stringify(updated));
    setSaveReportTitle('');
    setSaveReportDescription('');
    setShowSaveReportModal(false);
    toast.success(`Successfully saved "${newSnapshot.title}" report snapshot.`);
  };

  const handleSnapshotDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this saved report snapshot?")) {
      const updated = savedInstances.filter(x => x.id !== id);
      setSavedInstances(updated);
      localStorage.setItem('emp_xp_saved_reports_snapshots', JSON.stringify(updated));
      toast.success("Saved report snapshot deleted.");
      if (selectedSnapshot?.id === id) {
        setSnapshotPreviewOpen(false);
      }
    }
  };

  const handleUseTemplate = (tpl: SavedReport) => {
    setSelectedModule(tpl.module);
    setTimeout(() => {
      setSelectedFields(tpl.columns);
      setAppliedFields(tpl.columns);
      setFilters(tpl.filters);
      setSorts(tpl.sorts);
      setReportLayout(tpl.layout);
      if (tpl.chartSettings) {
        setChartType(tpl.chartSettings.type);
        setChartXAxis(tpl.chartSettings.xAxis);
        setChartYAxis(tpl.chartSettings.yAxis);
        setChartColorPalette(tpl.chartSettings.colorPalette);
        setChartShowLegend(tpl.chartSettings.showLegend);
        setChartDataLabels(tpl.chartSettings.dataLabels);
      }
      toast.info(`Loaded report configuration: "${tpl.name}"`);
      setActiveTab('build');
    }, 100);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem('emp_xp_reports_configs', JSON.stringify(updated));
    toast.info("Deleted configuration template.");
  };

  // Scheduling Configuration
  const handleOpenScheduleModal = (tpl: SavedReport) => {
    setSelectedTemplateForSchedule(tpl);
    setScheduleRecipients('admin@lattium.com');
    setShowScheduleModal(true);
  };

  const handleCreateSchedule = () => {
    if (!selectedTemplateForSchedule) return;
    const newSchedule: ScheduledReport = {
      id: Math.random().toString(36).substring(2, 9),
      templateId: selectedTemplateForSchedule.id,
      name: selectedTemplateForSchedule.name,
      frequency: scheduleFrequency,
      time: scheduleTime,
      recipients: scheduleRecipients,
      format: scheduleFormat,
      status: 'Active',
      next_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()
    };

    const updated = [newSchedule, ...scheduledReports];
    setScheduledReports(updated);
    localStorage.setItem('emp_xp_reports_schedules', JSON.stringify(updated));
    setShowScheduleModal(false);
    setSelectedTemplateForSchedule(null);
    toast.success("Schedule created successfully!");
  };

  const handleToggleSchedule = (id: string) => {
    const updated = scheduledReports.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Active' ? 'Paused' : 'Active';
        return { ...s, status: nextStatus as 'Active' | 'Paused' };
      }
      return s;
    });
    setScheduledReports(updated);
    localStorage.setItem('emp_xp_reports_schedules', JSON.stringify(updated));
    toast.success("Schedule status toggled.");
  };

  const handleDeleteSchedule = (id: string) => {
    const updated = scheduledReports.filter(s => s.id !== id);
    setScheduledReports(updated);
    localStorage.setItem('emp_xp_reports_schedules', JSON.stringify(updated));
    toast.info("Deleted schedule profile.");
  };

  const handleTriggerScheduleRun = async (schedule: ScheduledReport) => {
    const template = savedReports.find(r => r.id === schedule.templateId || r.name === schedule.name);
    if (!template) {
      toast.error("Underlying template for this schedule could not be found.");
      return;
    }

    toast.info(`Executing scheduled job for "${schedule.name}"...`);

    try {
      let endpoint = '';
      if (template.module === 'employees') endpoint = '/employees';
      else if (template.module === 'leaves') endpoint = '/leaves/history';
      else if (template.module === 'exits') endpoint = '/exit/all-requests';
      else if (template.module === 'assets') endpoint = '/assets';

      const res = await api.get(endpoint);
      let items = [];
      if (template.module === 'employees') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
      } else if (template.module === 'leaves') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
      } else if (template.module === 'exits') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
      } else if (template.module === 'assets') {
        items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.assets || res.data.data?.data || []);
      }

      // Filter & Sort data client-side
      let processed = [...items];
      if (template.filters && template.filters.length > 0) {
        processed = processed.filter(item => {
          return template.filters.every(f => {
            const val = String(getNestedValue(item, f.field) || '').toLowerCase();
            const checkVal = String(f.value || '').toLowerCase();

            switch (f.operator) {
              case 'equals': return val === checkVal;
              case 'contains': return val.includes(checkVal);
              case 'starts_with': return val.startsWith(checkVal);
              case 'greater_than': return parseFloat(val) > parseFloat(checkVal);
              case 'less_than': return parseFloat(val) < parseFloat(checkVal);
              default: return true;
            }
          });
        });
      }

      if (template.sorts && template.sorts.length > 0) {
        processed.sort((a, b) => {
          for (const sort of template.sorts) {
            const valA = getNestedValue(a, sort.field);
            const valB = getNestedValue(b, sort.field);

            if (valA === valB) continue;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            const multiplier = sort.direction === 'Asc' ? 1 : -1;

            if (typeof valA === 'number' && typeof valB === 'number') {
              return (valA - valB) * multiplier;
            }
            return String(valA).localeCompare(String(valB)) * multiplier;
          }
          return 0;
        });
      }

      // Export to file
      const format = schedule.format.toUpperCase();
      const fields = template.columns;
      const schemas = MODULE_SCHEMAS[template.module] || [];
      const headers = fields.map(f => schemas.find(s => s.key === f)?.label || f);

      if (format === 'CSV') {
        const rows = processed.map(item =>
          fields.map(f => {
            const val = getNestedValue(item, f);
            return String(val !== undefined && val !== null ? val : '').replace(/"/g, '""');
          })
        );
        const csvContent = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `scheduled_report_${schedule.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
        link.click();
      } else if (format === 'EXCEL') {
        const dataRows = processed.map(item => {
          const row: Record<string, any> = {};
          fields.forEach(f => {
            const label = schemas.find(s => s.key === f)?.label || f;
            row[label] = getNestedValue(item, f);
          });
          return row;
        });
        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report Preview");
        XLSX.writeFile(workbook, `scheduled_report_${schedule.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
      } else if (format === 'PDF') {
        const doc = new jsPDF('landscape');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text(`Scheduled Delivery: ${schedule.name}`, 14, 15);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Executed on ${new Date().toLocaleString()}`, 14, 20);

        let y = 30;
        const colWidth = 260 / Math.max(headers.length, 1);

        // Draw Headers
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 260, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        headers.forEach((col, i) => {
          doc.text(col, 16 + (i * colWidth), y + 6);
        });

        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);

        processed.slice(0, 20).forEach((item) => {
          if (y > 185) {
            doc.addPage();
            y = 15;
          }
          doc.rect(14, y, 260, 7);
          fields.forEach((f, i) => {
            const raw = getNestedValue(item, f);
            const txt = formatDisplayValue(raw, f);
            const truncated = txt.length > 20 ? txt.substring(0, 18) + '..' : txt;
            doc.text(truncated, 16 + (i * colWidth), y + 5);
          });
          y += 7;
        });

        doc.save(`scheduled_report_${schedule.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      }

      // Update next run time
      const updatedSchedules = scheduledReports.map(s => {
        if (s.id === schedule.id) {
          return {
            ...s,
            next_run: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
          };
        }
        return s;
      });
      setScheduledReports(updatedSchedules);
      localStorage.setItem('emp_xp_reports_schedules', JSON.stringify(updatedSchedules));

      toast.success(`Scheduled job executed successfully! Sent to: [${schedule.recipients}]`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Scheduled run failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Computed & Filtered Dataset
  const finalProcessedData = useMemo(() => {
    let result = Array.isArray(rawSourceData) ? [...rawSourceData] : [];

    // 1. Process client-side Filters
    if (filters.length > 0) {
      result = result.filter(item => {
        return filters.every(f => {
          const val = String(getNestedValue(item, f.field) || '').toLowerCase();
          const checkVal = String(f.value || '').toLowerCase();

          switch (f.operator) {
            case 'equals': return val === checkVal;
            case 'contains': return val.includes(checkVal);
            case 'starts_with': return val.startsWith(checkVal);
            case 'greater_than': return parseFloat(val) > parseFloat(checkVal);
            case 'less_than': return parseFloat(val) < parseFloat(checkVal);
            default: return true;
          }
        });
      });
    }

    // 2. Process client-side Sorts
    if (sorts.length > 0) {
      result.sort((a, b) => {
        for (const sort of sorts) {
          const valA = getNestedValue(a, sort.field);
          const valB = getNestedValue(b, sort.field);

          if (valA === valB) continue;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;

          const multiplier = sort.direction === 'Asc' ? 1 : -1;

          if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * multiplier;
          }
          return String(valA).localeCompare(String(valB)) * multiplier;
        }
        return 0;
      });
    }

    return result;
  }, [rawSourceData, filters, sorts]);

  // Pagination bounds
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return finalProcessedData.slice(start, start + rowsPerPage);
  }, [finalProcessedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(finalProcessedData.length / rowsPerPage);

  // Recharts Helper for Chart rendering
  const chartGroupedData = useMemo(() => {
    if (finalProcessedData.length === 0 || !chartXAxis) return [];

    const groupedMap: Record<string, { name: string; value: number; count: number }> = {};
    finalProcessedData.forEach(item => {
      const rawX = getNestedValue(item, chartXAxis);
      const xVal = (rawX !== undefined && rawX !== null && rawX !== '') ? formatDisplayValue(rawX, chartXAxis) : 'Unknown';

      if (!groupedMap[xVal]) {
        groupedMap[xVal] = { name: xVal, value: 0, count: 0 };
      }

      groupedMap[xVal].count += 1;

      if (chartYAxis !== 'Count') {
        const rawY = getNestedValue(item, chartYAxis);
        const yVal = parseFloat(String(rawY).replace(/[^\d.-]/g, ''));
        if (!isNaN(yVal)) {
          groupedMap[xVal].value += yVal;
        }
      }
    });

    return Object.values(groupedMap).map(g => ({
      name: g.name,
      value: chartYAxis === 'Count' ? g.count : g.value,
    }));
  }, [finalProcessedData, chartXAxis, chartYAxis]);

  const chartColors = useMemo(() => {
    switch (chartColorPalette) {
      case 'blue': return ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];
      case 'purple': return ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'];
      case 'sunset': return ['#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA'];
      case 'forest': return ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];
      default: return ['#3B82F6', '#8B5CF6', '#F97316', '#10B981', '#EC4899'];
    }
  }, [chartColorPalette]);

  // Export Engines
  const handleExportCSV = () => {
    if (finalProcessedData.length === 0) return;
    const schemas = MODULE_SCHEMAS[selectedModule] || [];
    const headers = appliedFields.map(f => schemas.find(s => s.key === f)?.label || f);
    const rows = finalProcessedData.map(item =>
      appliedFields.map(f => {
        const val = getNestedValue(item, f);
        const masked = maskSensitiveValue(formatDisplayValue(val, f), f);
        return String(masked !== undefined && masked !== null ? masked : '').replace(/"/g, '""');
      })
    );

    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${selectedModule}_${Date.now()}.csv`;
    link.click();
    toast.success("CSV report exported successfully with PII masking.");
  };

  const handleExportExcel = () => {
    if (finalProcessedData.length === 0) return;
    const schemas = MODULE_SCHEMAS[selectedModule] || [];
    const headers = appliedFields.map(f => schemas.find(s => s.key === f)?.label || f);
    const dataRows = finalProcessedData.map(item => {
      const row: Record<string, any> = {};
      appliedFields.forEach(f => {
        const label = schemas.find(s => s.key === f)?.label || f;
        const val = getNestedValue(item, f);
        row[label] = maskSensitiveValue(formatDisplayValue(val, f), f);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Preview");
    XLSX.writeFile(workbook, `report_${selectedModule}_${Date.now()}.xlsx`);
    toast.success("Excel report exported successfully with PII masking.");
  };

  const handleExportPDF = () => {
    if (finalProcessedData.length === 0) return;
    const doc = new jsPDF('landscape');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text(`${MODULES.find(m => m.value === selectedModule)?.label} - Export Summary`, 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 20);

    const schemas = MODULE_SCHEMAS[selectedModule] || [];
    const columns = appliedFields.map(f => schemas.find(s => s.key === f)?.label || f);

    let y = 30;
    const colWidth = 260 / Math.max(columns.length, 1);

    // Draw Headers
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 260, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    columns.forEach((col, i) => {
      doc.text(col, 16 + (i * colWidth), y + 6);
    });

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    finalProcessedData.slice(0, 30).forEach((item) => {
      if (y > 185) {
        doc.addPage();
        y = 15;
      }
      doc.rect(14, y, 260, 7);
      appliedFields.forEach((f, i) => {
        const raw = getNestedValue(item, f);
        const txt = formatDisplayValue(raw, f);
        const masked = maskSensitiveValue(txt, f);
        const truncated = masked.length > 20 ? masked.substring(0, 18) + '..' : masked;
        doc.text(truncated, 16 + (i * colWidth), y + 5);
      });
      y += 7;
    });

    doc.save(`report_${selectedModule}_${Date.now()}.pdf`);
    toast.success("PDF exported successfully with PII masking (first 30 rows).");
  };

  const handleExportWord = () => {
    if (finalProcessedData.length === 0) return;
    const schemas = MODULE_SCHEMAS[selectedModule] || [];
    const headers = appliedFields.map(f => schemas.find(s => s.key === f)?.label || f);

    let tableHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>`;
    tableHTML += `<head><meta charset='utf-8'></head><body><h2>Report Summary</h2><table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr style="background: #f1f5f9;">`;
    headers.forEach(h => {
      tableHTML += `<th className="font-semibold text-sm text-black" style="padding: 6px; font-size: 11px;">${h}</th>`;
    });
    tableHTML += `</tr></thead><tbody>`;
    finalProcessedData.forEach(item => {
      tableHTML += `<tr>`;
      appliedFields.forEach(f => {
        const val = getNestedValue(item, f);
        const masked = maskSensitiveValue(formatDisplayValue(val, f), f);
        tableHTML += `<td style="padding: 5px; font-size: 11px;">${masked}</td>`;
      });
      tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table></body></html>`;

    const blob = new Blob(['\ufeff', tableHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${selectedModule}_${Date.now()}.doc`;
    link.click();
    toast.success("Word report exported successfully with PII masking.");
  };

  const handleExportJSON = () => {
    if (finalProcessedData.length === 0) return;
    const maskedData = finalProcessedData.map(item => {
      const row: Record<string, any> = {};
      appliedFields.forEach(f => {
        const val = getNestedValue(item, f);
        row[f] = maskSensitiveValue(formatDisplayValue(val, f), f);
      });
      return row;
    });
    const dataStr = JSON.stringify(maskedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${selectedModule}_${Date.now()}.json`;
    link.click();
    toast.success("JSON exported successfully with PII masking.");
  };

  // Snapshot Export Handlers with PII Masking
  const handleSnapshotExportCSV = (snap: any) => {
    const schemas = MODULE_SCHEMAS[snap.module] || [];
    const headers = snap.columns.map((f: string) => schemas.find(s => s.key === f)?.label || f);
    const rows = snap.data_snapshot.map((item: any) =>
      snap.columns.map((f: string) => {
        const val = getNestedValue(item, f);
        const masked = maskSensitiveValue(formatDisplayValue(val, f), f);
        return String(masked !== undefined && masked !== null ? masked : '').replace(/"/g, '""');
      })
    );

    const csvContent = [headers, ...rows].map((r: any) => r.map((cell: any) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snapshot_${snap.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`;
    link.click();
    toast.success("CSV snapshot exported successfully with PII masking.");
  };

  const handleSnapshotExportExcel = (snap: any) => {
    const schemas = MODULE_SCHEMAS[snap.module] || [];
    const dataRows = snap.data_snapshot.map((item: any) => {
      const row: Record<string, any> = {};
      snap.columns.forEach((f: string) => {
        const label = schemas.find(s => s.key === f)?.label || f;
        const val = getNestedValue(item, f);
        row[label] = maskSensitiveValue(formatDisplayValue(val, f), f);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Snapshot Data");
    XLSX.writeFile(workbook, `snapshot_${snap.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
    toast.success("Excel snapshot exported successfully with PII masking.");
  };

  const handleSnapshotExportPDF = (snap: any) => {
    const doc = new jsPDF('landscape');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text(`Snapshot: ${snap.title}`, 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Description: ${snap.description} | Frozen: ${snap.created_at}`, 14, 20);

    const schemas = MODULE_SCHEMAS[snap.module] || [];
    const headers = snap.columns.map((f: string) => schemas.find(s => s.key === f)?.label || f);

    let y = 28;
    const colWidth = 260 / Math.max(headers.length, 1);

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 260, 8, 'F');
    doc.setFont("helvetica", "bold");
    headers.forEach((h: string, i: number) => {
      const truncatedHeader = h.length > 20 ? h.substring(0, 18) + '..' : h;
      doc.text(truncatedHeader, 16 + (i * colWidth), y + 5);
    });
    y += 8;

    doc.setFont("helvetica", "normal");
    snap.data_snapshot.slice(0, 30).forEach((item: any) => {
      if (y > 185) {
        doc.addPage();
        y = 15;
      }
      doc.rect(14, y, 260, 7);
      snap.columns.forEach((f: string, i: number) => {
        const raw = getNestedValue(item, f);
        const txt = formatDisplayValue(raw, f);
        const masked = maskSensitiveValue(txt, f);
        const truncated = masked.length > 20 ? masked.substring(0, 18) + '..' : masked;
        doc.text(truncated, 16 + (i * colWidth), y + 5);
      });
      y += 7;
    });

    doc.save(`snapshot_${snap.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    toast.success("PDF snapshot exported successfully (first 30 rows).");
  };

  const handleSnapshotExportWord = (snap: any) => {
    const schemas = MODULE_SCHEMAS[snap.module] || [];
    const headers = snap.columns.map((f: string) => schemas.find(s => s.key === f)?.label || f);

    let tableHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>`;
    tableHTML += `<head><meta charset='utf-8'></head><body><h2>Snapshot: ${snap.title}</h2><p>${snap.description}</p><table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr style="background: #f1f5f9;">`;
    headers.forEach((h: string) => {
      tableHTML += `<th style="padding: 6px; font-size: 11px;">${h}</th>`;
    });
    tableHTML += `</tr></thead><tbody>`;
    snap.data_snapshot.forEach((row: any) => {
      tableHTML += `<tr>`;
      snap.columns.forEach((f: string) => {
        const val = getNestedValue(row, f);
        const masked = maskSensitiveValue(formatDisplayValue(val, f), f);
        tableHTML += `<td style="padding: 5px; font-size: 11px;">${masked}</td>`;
      });
      tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table></body></html>`;

    const blob = new Blob(['\ufeff', tableHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snapshot_${snap.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.doc`;
    link.click();
    toast.success("Word snapshot exported successfully with PII masking.");
  };

  // Template Export Handlers
  const fetchAndFilterTemplateData = async (tpl: SavedReport) => {
    let endpoint = '';
    if (tpl.module === 'employees') endpoint = `/employees?limit=${dataLimit}`;
    else if (tpl.module === 'leaves') endpoint = `/leaves/history?limit=${dataLimit}`;
    else if (tpl.module === 'exits') endpoint = `/exit/all-requests?limit=${dataLimit}`;
    else if (tpl.module === 'assets') endpoint = `/assets?limit=${dataLimit}`;
    else if (tpl.module === 'loans') endpoint = `/loans-advances/loans?limit=${dataLimit}`;
    else if (tpl.module === 'reimbursements') endpoint = `/payroll/reimbursements/all-claims?limit=${dataLimit}`;
    else if (tpl.module === 'payroll') endpoint = `/payroll/payslips`;

    if (!endpoint) return [];

    const res = await api.get(endpoint);
    let items = [];
    if (tpl.module === 'employees' || tpl.module === 'leaves' || tpl.module === 'exits') {
      items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data ?? []);
    } else if (tpl.module === 'assets') {
      items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.assets || res.data.data?.data || []);
    } else {
      items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data || res.data.data?.items || res.data.data?.loans || res.data.data?.claims || res.data.data?.reimbursements || res.data.data?.payslips || []);
    }

    // Apply Filters
    let processed = items.filter((item: any) => {
      return tpl.filters.every(rule => {
        if (!rule.field || !rule.operator) return true;
        const raw = getNestedValue(item, rule.field);
        const val = String(raw).toLowerCase();
        const criterion = rule.value.toLowerCase();
        switch (rule.operator) {
          case 'equals': return val === criterion;
          case 'contains': return val.includes(criterion);
          case 'starts_with': return val.startsWith(criterion);
          case 'greater_than': return Number(raw) > Number(rule.value);
          case 'less_than': return Number(raw) < Number(rule.value);
          default: return true;
        }
      });
    });

    // Apply Sorts
    if (tpl.sorts.length > 0) {
      processed = [...processed].sort((a: any, b: any) => {
        for (const sort of tpl.sorts) {
          if (!sort.field) continue;
          const valA = getNestedValue(a, sort.field);
          const valB = getNestedValue(b, sort.field);
          const isAsc = sort.direction === 'Asc';

          if (valA === valB) continue;

          if (typeof valA === 'number' && typeof valB === 'number') {
            return isAsc ? valA - valB : valB - valA;
          }
          return isAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
        return 0;
      });
    }

    return processed;
  };

  const handleTemplateExportExcel = async (tpl: SavedReport) => {
    const loadToast = toast.loading(`Fetching dataset for "${tpl.name}" template...`);
    try {
      const data = await fetchAndFilterTemplateData(tpl);
      if (data.length === 0) {
        toast.error("No data matching this template was found to export.");
        return;
      }
      const schemas = MODULE_SCHEMAS[tpl.module] || [];
      const dataRows = data.map((item: any) => {
        const row: Record<string, any> = {};
        tpl.columns.forEach(f => {
          const label = schemas.find(s => s.key === f)?.label || f;
          const val = getNestedValue(item, f);
          row[label] = maskSensitiveValue(formatDisplayValue(val, f), f);
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template Report");
      XLSX.writeFile(workbook, `report_template_${tpl.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
      toast.success(`Excel report exported successfully with PII masking.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export template report.");
    } finally {
      toast.dismiss(loadToast);
    }
  };

  const handleTemplateExportCSV = async (tpl: SavedReport) => {
    const loadToast = toast.loading(`Fetching dataset for "${tpl.name}" template...`);
    try {
      const data = await fetchAndFilterTemplateData(tpl);
      if (data.length === 0) {
        toast.error("No data matching this template was found to export.");
        return;
      }
      const schemas = MODULE_SCHEMAS[tpl.module] || [];
      const rows = data.map((item: any) =>
        tpl.columns.map(f => {
          const val = getNestedValue(item, f);
          const masked = maskSensitiveValue(formatDisplayValue(val, f), f);
          return String(masked !== undefined && masked !== null ? masked : '').replace(/"/g, '""');
        })
      );
      const headers = tpl.columns.map(f => schemas.find(s => s.key === f)?.label || f);

      const csvContent = [headers, ...rows].map((r: any) => r.map((cell: any) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report_template_${tpl.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`;
      link.click();
      toast.success("CSV report exported successfully with PII masking.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export template report.");
    } finally {
      toast.dismiss(loadToast);
    }
  };

  const handleTemplateExportPDF = async (tpl: SavedReport) => {
    const loadToast = toast.loading(`Fetching dataset for "${tpl.name}" template...`);
    try {
      const data = await fetchAndFilterTemplateData(tpl);
      if (data.length === 0) {
        toast.error("No data matching this template was found to export.");
        return;
      }
      const doc = new jsPDF('landscape');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text(`Template Report: ${tpl.name}`, 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Description: ${tpl.description} | Generated: ${new Date().toLocaleString()}`, 14, 20);

      const schemas = MODULE_SCHEMAS[tpl.module] || [];
      const columns = tpl.columns.map(f => schemas.find(s => s.key === f)?.label || f);

      let y = 28;
      const colWidth = 260 / Math.max(columns.length, 1);

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 260, 8, 'F');
      doc.setFont("helvetica", "bold");
      columns.forEach((col, i) => {
        doc.text(col, 16 + (i * colWidth), y + 6);
      });

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      data.slice(0, 30).forEach((item: any) => {
        if (y > 185) {
          doc.addPage();
          y = 15;
        }
        doc.rect(14, y, 260, 7);
        tpl.columns.forEach((f, i) => {
          const raw = getNestedValue(item, f);
          const masked = maskSensitiveValue(formatDisplayValue(raw, f), f);
          const truncated = masked.length > 20 ? masked.substring(0, 18) + '..' : masked;
          doc.text(truncated, 16 + (i * colWidth), y + 5);
        });
        y += 7;
      });

      doc.save(`report_template_${tpl.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      toast.success("PDF report exported successfully with PII masking (top 30 rows).");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export template report.");
    } finally {
      toast.dismiss(loadToast);
    }
  };

  const handleTemplateExportWord = async (tpl: SavedReport) => {
    const loadToast = toast.loading(`Fetching dataset for "${tpl.name}" template...`);
    try {
      const data = await fetchAndFilterTemplateData(tpl);
      if (data.length === 0) {
        toast.error("No data matching this template was found to export.");
        return;
      }
      const schemas = MODULE_SCHEMAS[tpl.module] || [];
      const headers = tpl.columns.map(f => schemas.find(s => s.key === f)?.label || f);

      let tableHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>`;
      tableHTML += `<head><meta charset='utf-8'></head><body><h2>Template Report: ${tpl.name}</h2><p>${tpl.description}</p><table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr style="background: #f1f5f9;">`;
      headers.forEach(h => {
        tableHTML += `<th style="padding: 6px; font-size: 11px;">${h}</th>`;
      });
      tableHTML += `</tr></thead><tbody>`;
      data.forEach((item: any) => {
        tableHTML += `<tr>`;
        tpl.columns.forEach(f => {
          const val = getNestedValue(item, f);
          const masked = maskSensitiveValue(formatDisplayValue(val, f), f);
          tableHTML += `<td style="padding: 5px; font-size: 11px;">${masked}</td>`;
        });
        tableHTML += `</tr>`;
      });
      tableHTML += `</tbody></table></body></html>`;

      const blob = new Blob(['\ufeff', tableHTML], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report_template_${tpl.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.doc`;
      link.click();
      toast.success("Word report exported successfully with PII masking.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export template report.");
    } finally {
      toast.dismiss(loadToast);
    }
  };

  // Close dropdown helper
  useEffect(() => {
    const handleClose = () => {
      setOpenDropdownId(null);
      setSnapshotDropdownId(null);
      setTemplateExportDropdownId(null);
    };
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, []);

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">

      {/* ── Sub Header / Title Bar ──────────────────────────────────────── */}
      <PageHeader
        title="Custom Report Workspace"
        icon={<FileSpreadsheet className="size-8" />}
      />

      {/* ── Dynamic Tab Selector Menu ────────────────────────────────────────── */}
      <div className="flex border-b border-border gap-6 w-full mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'build', label: 'Report Builder', icon: Settings },
          { id: 'snapshots', label: 'Saved Reports', icon: FileSpreadsheet },
          { id: 'saved', label: 'Saved Templates', icon: FolderOpen },
          { id: 'scheduled', label: 'Scheduled Runs', icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer ${isActive
                  ? 'text-primary border-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 1. Overview Tab ────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary KPIs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Saved Templates', count: savedReports.length, icon: FolderOpen, desc: 'Configured query templates' },
              { label: 'Saved Reports', count: savedInstances.length, icon: FileSpreadsheet, desc: 'Archived data snapshots' },
              { label: 'Pending Delivery Lists', count: scheduledReports.length, icon: Clock, desc: 'Scheduled delivery runs' },
              { label: 'Latest Execution Log', count: '98%', icon: Activity, desc: 'Success Rate' },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div key={idx} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    {kpi.label === 'Latest Execution Log' && (
                      <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
                        Active <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {kpi.count}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                      {kpi.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions Panel - Commented Out
          <div className="bg-card border-t border-b border-l border-r-0 border-border/80 p-6 rounded-l-xl rounded-r-none shadow-xs">
            <h3 className="font-bold text-sm text-foreground mb-4 uppercase tracking-wider">Launch Workspace Tools</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => { setSelectedModule('employees'); setActiveTab('build'); }}
                className="flex items-center gap-3 p-4 border border-border hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all rounded-lg text-left"
              >
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-foreground">Custom Employee Report</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Build list with filters & groups</p>
                </div>
              </button>

              <button
                onClick={() => { setSelectedModule('leaves'); setActiveTab('build'); }}
                className="flex items-center gap-3 p-4 border border-border hover:border-primary-500 hover:bg-primary-50/20 dark:hover:bg-primary-950/20 transition-all rounded-lg text-left"
              >
                <Calendar className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-foreground">Leave Utilization Tracker</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Analyze durations and types</p>
                </div>
              </button>

              <button
                onClick={() => { setSelectedModule('assets'); setActiveTab('build'); }}
                className="flex items-center gap-3 p-4 border border-border hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all rounded-lg text-left"
              >
                <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-foreground">Asset Audit Sheets</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Filter category distribution charts</p>
                </div>
              </button>
            </div>
          </div>
          */}

          {/* Saved Templates Quick Access */}
          <div className="bg-card border-t border-b border-l border-r-0 border-border/80 rounded-l-xl rounded-r-none overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border/50 flex justify-between items-center">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Recently Configured Templates</h3>
              <button onClick={() => setActiveTab('saved')} className="text-xs font-bold text-primary hover:underline">View All</button>
            </div>
            <div className="divide-y divide-border/50">
              {savedReports.map((row, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{row.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{row.description} &bull; Created {row.created_at}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-primary rounded-full capitalize">{row.module}</span>
                    <button
                      onClick={() => handleUseTemplate(row)}
                      className="p-1 hover:bg-muted/80 rounded text-muted-foreground transition-colors cursor-pointer"
                      title="Open in Builder"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Report Builder Tab ───────────────────────────────────────────── */}
      {activeTab === 'build' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start animate-in fade-in duration-300">

          {/* Left Column Controls */}
          <div className="xl:col-span-1 flex flex-col gap-6">

            {/* Box 1: Data Source */}
            <div className="bg-card border border-border/80 p-5 rounded-xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> 1. Select Dataset
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Select Module</label>
                  <Select
                    value={selectedModule}
                    onChange={setSelectedModule}
                    options={MODULES}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Fetch Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={dataLimit}
                    onChange={(e) => setDataLimit(Number(e.target.value) || 1000)}
                    className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Field Selector */}
            <div className="bg-card border border-border/80 p-5 rounded-xl shadow-xs flex flex-col flex-1 min-h-[480px] space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" /> 2. Choose Columns
                </h3>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search field names..."
                  value={fieldSearch}
                  onChange={e => setFieldSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500/30 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Grouped Accordions */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
                {Object.entries(
                  (MODULE_SCHEMAS[selectedModule] || []).reduce((acc, field) => {
                    if (fieldSearch && !field.label.toLowerCase().includes(fieldSearch.toLowerCase())) return acc;
                    if (!acc[field.category]) acc[field.category] = [];
                    acc[field.category].push(field);
                    return acc;
                  }, {} as Record<string, FieldSchema[]>)
                ).map(([category, items]) => (
                  <div key={category} className="border border-border/50 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => handleToggleCategory(category)}
                      className="w-full flex justify-between items-center bg-muted/30 p-2.5 text-[11px] font-bold text-muted-foreground hover:bg-muted/50"
                    >
                      <span>{category} ({items.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedCategories.includes(category) ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedCategories.includes(category) && (
                      <div className="p-2 bg-card space-y-1.5 border-t border-border/50">
                        <label className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs font-bold text-primary mb-1 pb-1.5 border-b border-border/50">
                          <input 
                            type="checkbox"
                            checked={items.every(item => selectedFields.includes(item.key))}
                            ref={el => {
                              if (el) {
                                const checkedCount = items.filter(item => selectedFields.includes(item.key)).length;
                                el.indeterminate = checkedCount > 0 && checkedCount < items.length;
                              }
                            }}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              const itemKeys = items.map(i => i.key);
                              if (isChecked) {
                                setSelectedFields(prev => Array.from(new Set([...prev, ...itemKeys])));
                              } else {
                                setSelectedFields(prev => prev.filter(key => !itemKeys.includes(key)));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary-500 w-3.5 h-3.5"
                          />
                          Select All
                        </label>
                        {items.map(item => (
                          <label key={item.key} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs font-medium text-foreground">
                            <input 
                              type="checkbox"
                              checked={selectedFields.includes(item.key)}
                              onChange={() => handleFieldToggle(item.key)}
                              className="rounded border-border text-primary focus:ring-primary-500 w-3.5 h-3.5"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column Preview */}
          <div className="xl:col-span-3 space-y-6">

            {/* Workspace Controls Header */}
            <div className="bg-card border border-border/80 p-6 rounded-xl shadow-xs">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Workspace Controls</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5 tracking-wider">
                    Fetch live source items or commit current filters to templates & snapshot archives
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0 justify-end items-center">
                  <Button
                    onClick={handleRefreshData}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/70 text-white font-bold h-9 text-xs border-0 shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1.5 fill-current" /> Refresh Data
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      if (finalProcessedData.length === 0) {
                        toast.error("Please fetch report data before saving a report snapshot.");
                        return;
                      }
                      setShowSaveReportModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs border-0 shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Save Report
                  </Button>

                  <Button
                    onClick={() => setShowSaveTemplateModal(true)}
                    variant="outline"
                    className="border-border hover:bg-muted/50 font-bold h-9 text-xs"
                  >
                    <Save className="w-4 h-4 mr-1.5 text-muted-foreground" /> Save Template
                  </Button>
                </div>
              </div>
            </div>

              {/* Live Data Preview */}
              <div className="bg-card border-t border-b border-l border-r-0 border-border/80 rounded-l-xl rounded-r-none shadow-sm overflow-hidden min-h-[480px] flex flex-col">

                <div className="p-4 border-b border-border/50 bg-muted/30 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Live Report Preview</h3>
                    {hasGenerated && (
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5 tracking-wider">
                        Dataset size: {finalProcessedData.length} records matching rule configs
                      </p>
                    )}
                  </div>
                  {hasGenerated && (
                    <button
                      onClick={handleGenerateReport}
                      className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-x-auto" ref={reportContainerRef}>
                  {loading ? (
                    <div className="h-full py-32 flex flex-col items-center justify-center text-center px-6">
                      <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">Loading Preview...</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1 mx-auto leading-relaxed">
                        Fetching live data for the selected module.
                      </p>
                    </div>
                  ) : finalProcessedData.length === 0 ? (
                    <div className="h-full py-32 flex flex-col items-center justify-center text-center px-6">
                      <Info className="w-8 h-8 text-amber-500 mb-2" />
                      <h4 className="text-sm font-bold text-foreground">No Records Found</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Try modifying or clearing your filter requirements.</p>
                    </div>
                  ) : (
                    <>
                      {/* Render TABLE layout */}
                      {reportLayout === 'table' && (
                        <div className="rounded-l-xl border-t border-b border-l border-r-0 border-border bg-card overflow-x-auto shadow-sm">
                          <Table className="min-w-[800px] border-collapse">
                            <TableHeader className="bg-muted border-b border-border">
                              <TableRow className="hover:bg-transparent">
                                {appliedFields.map(f => (
                                  <TableHead key={f} className={`px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider ${f === 'reason' ? 'whitespace-normal' : 'whitespace-nowrap'}`}>
                                    {MODULE_SCHEMAS[selectedModule]?.find(m => m.key === f)?.label || f}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedData.map((item, idx) => (
                                <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                                  {appliedFields.map(f => {
                                    const raw = getNestedValue(item, f);
                                    const text = formatDisplayValue(raw, f);

                                    return (
                                      <TableCell key={f} className={`px-6 py-4 text-sm font-medium text-foreground align-top ${f === 'reason' ? 'max-w-[400px] whitespace-normal' : 'whitespace-nowrap'}`}>
                                        {f === 'status' ? (
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${['active', 'approved', 'available'].includes(text.toLowerCase())
                                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                              : ['pending', 'initiated', 'pending approval'].includes(text.toLowerCase())
                                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                            }`}>
                                            {text}
                                          </span>
                                        ) : (
                                          <div className={f === 'reason' ? "whitespace-normal break-words leading-relaxed" : ""} title={text.length > 60 ? text : undefined}>
                                            {text}
                                          </div>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Render CHART layout */}
                      {reportLayout === 'chart' && (
                        <div className="p-6 h-[380px] w-full flex flex-col justify-between">
                          {chartGroupedData.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                              Please select a numeric aggregative target.
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height={320}>
                              {chartType === 'Line Chart' ? (
                                <LineChart data={chartGroupedData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                  <Tooltip />
                                  {chartShowLegend && <Legend />}
                                  <Line type="monotone" dataKey="value" name={chartYAxis === 'Count' ? 'Row Count' : 'Total Value'} stroke={chartColors[0]} strokeWidth={3} activeDot={{ r: 6 }} />
                                </LineChart>
                              ) : chartType === 'Pie Chart' || chartType === 'Donut Chart' ? (
                                <PieChart>
                                  <Tooltip />
                                  {chartShowLegend && <Legend />}
                                  <Pie
                                    data={chartGroupedData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    innerRadius={chartType === 'Donut Chart' ? 60 : 0}
                                    label={chartDataLabels ? ({ name, value }) => `${name} (${value})` : false}
                                  >
                                    {chartGroupedData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              ) : (
                                <BarChart data={chartGroupedData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }} layout={chartType === 'Bar Chart' ? 'vertical' : 'horizontal'}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={chartType === 'Bar Chart'} horizontal={chartType !== 'Bar Chart'} />
                                  {chartType === 'Bar Chart' ? (
                                    <>
                                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    </>
                                  ) : (
                                    <>
                                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    </>
                                  )}
                                  <Tooltip />
                                  {chartShowLegend && <Legend />}
                                  <Bar dataKey="value" name={chartYAxis === 'Count' ? 'Row Count' : 'Total Value'} fill={chartColors[0]} radius={4}>
                                    {chartGroupedData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              )}
                            </ResponsiveContainer>
                          )}
                        </div>
                      )}

                      {/* Render SUMMARY layouts */}
                      {reportLayout === 'summary' && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {finalProcessedData.slice(0, 12).map((item, idx) => (
                            <div key={idx} className="bg-muted/50 border border-border p-4 rounded-lg flex flex-col justify-between space-y-3">
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Card #{idx + 1}</span>
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-primary rounded">Active</span>
                              </div>
                              <div className="space-y-1.5">
                                {appliedFields.map(f => {
                                  const val = getNestedValue(item, f);
                                  const label = MODULE_SCHEMAS[selectedModule]?.find(m => m.key === f)?.label || f;
                                  return (
                                    <div key={f} className="flex justify-between text-xs">
                                      <span className="text-muted-foreground font-medium">{label}:</span>
                                      <span className="text-foreground font-semibold truncate max-w-[120px]">{formatDisplayValue(val, f)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Preview Pagination Controls */}
                {hasGenerated && reportLayout === 'table' && finalProcessedData.length > rowsPerPage && (
                  <div className="px-5 py-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center sm:text-left">
                      Showing {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, finalProcessedData.length)} of {finalProcessedData.length} records • Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-[10px] font-bold border border-border rounded-lg bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Prev
                      </button>
                      {(() => {
                        let startPage = Math.max(1, currentPage - 2);
                        let endPage = Math.min(totalPages, currentPage + 2);

                        if (endPage - startPage < 4) {
                          if (startPage === 1) {
                            endPage = Math.min(totalPages, 5);
                          } else if (endPage === totalPages) {
                            startPage = Math.max(1, totalPages - 4);
                          }
                        }

                        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 text-[10px] font-bold rounded-lg border transition-all ${page === currentPage
                                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                                : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                              }`}
                          >
                            {page}
                          </button>
                        ));
                      })()}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-[10px] font-bold border border-border rounded-lg bg-card hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3 & 4 Sub Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Box 3: Advanced Rules */}
                <div className="bg-card border border-border/80 p-5 rounded-xl shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-border/50 pb-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" /> 3. Advanced Rules
                    </h3>
                  </div>

                  {/* Filters */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Filters ({filters.length})</span>
                      <button onClick={handleAddFilter} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Rule
                      </button>
                    </div>
                    {filters.map((filter, index) => (
                      <div key={filter.id} className="p-2.5 border border-border/50 rounded-lg bg-muted/30 space-y-2 relative">
                        <button
                          onClick={() => setFilters(prev => prev.filter(f => f.id !== filter.id))}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="pr-5 space-y-1">
                          <Select
                            value={filter.field}
                            onChange={val => setFilters(prev => prev.map(f => f.id === filter.id ? { ...f, field: val } : f))}
                            options={MODULE_SCHEMAS[selectedModule]?.map(s => ({ value: s.key, label: s.label })) || []}
                          />
                          <Select
                            value={filter.operator}
                            onChange={val => setFilters(prev => prev.map(f => f.id === filter.id ? { ...f, operator: val } : f))}
                            options={OPERATORS}
                          />
                          <input
                            type="text"
                            placeholder="Value..."
                            value={filter.value}
                            onChange={e => setFilters(prev => prev.map(f => f.id === filter.id ? { ...f, value: e.target.value } : f))}
                            className="w-full px-2.5 py-1 bg-card border border-border rounded-md text-xs focus:outline-none text-foreground"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sorts */}
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sort Priority ({sorts.length})</span>
                      <button onClick={handleAddSort} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Sort
                      </button>
                    </div>
                    {sorts.map((sort) => (
                      <div key={sort.id} className="flex gap-2 items-center bg-muted/30 p-2 border border-border/50 rounded-lg relative pr-8">
                        <button
                          onClick={() => setSorts(prev => prev.filter(s => s.id !== sort.id))}
                          className="absolute right-2 text-muted-foreground hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1">
                          <Select
                            value={sort.field}
                            onChange={val => setSorts(prev => prev.map(s => s.id === sort.id ? { ...s, field: val } : s))}
                            options={MODULE_SCHEMAS[selectedModule]?.map(s => ({ value: s.key, label: s.label })) || []}
                          />
                        </div>
                        <div className="w-24">
                          <Select
                            value={sort.direction}
                            onChange={val => setSorts(prev => prev.map(s => s.id === sort.id ? { ...s, direction: val as 'Asc' | 'Desc' } : s))}
                            options={[
                              { value: "Asc", label: "Asc" },
                              { value: "Desc", label: "Desc" }
                            ]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Box 4: Layout Mode */}
                <div className="bg-card border border-border/80 p-5 rounded-xl shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> 4. Layout Mode
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['table', 'chart', 'summary'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setReportLayout(mode)}
                        className={`py-2 px-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${reportLayout === mode
                            ? 'bg-primary/5 border-primary text-primary'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                          }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* Chart configurations */}
                  {reportLayout === 'chart' && (
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">Chart Type</label>
                        <Select
                          value={chartType}
                          onChange={setChartType}
                          options={[
                            { value: "Column Chart", label: "Column Chart" },
                            { value: "Bar Chart", label: "Bar Chart" },
                            { value: "Line Chart", label: "Line Chart" },
                            { value: "Pie Chart", label: "Pie Chart" },
                            { value: "Donut Chart", label: "Donut Chart" }
                          ]}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">X-Axis Group Field</label>
                        <Select
                          value={chartXAxis}
                          onChange={setChartXAxis}
                          options={MODULE_SCHEMAS[selectedModule]?.filter(s => s.isCategorical).map(s => ({ value: s.key, label: s.label })) || []}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">Y-Axis Values</label>
                        <Select
                          value={chartYAxis}
                          onChange={setChartYAxis}
                          options={[
                            { value: "Count", label: "Row Count" },
                            ...(MODULE_SCHEMAS[selectedModule]?.filter(f => f.isNumeric).map(f => ({ value: f.key, label: `Sum of ${f.label}` })) || [])
                          ]}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Show Legend</span>
                        <input
                          type="checkbox"
                          checked={chartShowLegend}
                          onChange={e => setChartShowLegend(e.target.checked)}
                          className="rounded border-border text-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1.5">Color Theme</label>
                        <div className="flex gap-2">
                          {['blue', 'purple', 'sunset', 'forest'].map(theme => (
                            <button
                              key={theme}
                              onClick={() => setChartColorPalette(theme)}
                              className={`w-6 h-6 rounded-full border transition-all ${chartColorPalette === theme ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70'
                                }`}
                              style={{
                                background: theme === 'blue' ? '#3B82F6' : theme === 'purple' ? '#8B5CF6' : theme === 'sunset' ? '#F97316' : '#10B981'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

          {/* ── Saved Reports (Snapshots) Tab ───────────────────────────────────── */}
          {activeTab === 'snapshots' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                {/* <div className="relative w-full sm:max-w-md">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search saved reports by title, author..."
                    value={snapshotSearchTerm}
                    onChange={e => { setSnapshotSearchTerm(e.target.value); setSnapshotCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  />
                </div> */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {savedInstances
                  .filter(inst => {
                    const q = snapshotSearchTerm.toLowerCase();
                    const title = (inst?.title || inst?.name || '').toLowerCase();
                    const desc = (inst?.description || '').toLowerCase();
                    return title.includes(q) || desc.includes(q);
                  })
                  .map(snap => {
                    return (
                      <div key={snap.id} className="bg-card p-6 border border-border/80 rounded-xl hover:shadow-md transition-shadow flex flex-col justify-between relative group">
                        <div className="absolute top-4 right-4">
                          <button
                            onClick={() => handleSnapshotDelete(snap.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground tracking-tight">{snap.title}</h4>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5 tracking-wider">
                              {snap.module} &bull; {snap.total_records} rows
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{snap.description}</p>
                        </div>

                        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border/50">
                          <button
                            onClick={() => { setSelectedSnapshot(snap); setSnapshotPreviewOpen(true); }}
                            className="flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            Preview
                          </button>

                          <div className="relative flex-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSnapshotDropdownId(snapshotDropdownId === snap.id ? null : snap.id);
                              }}
                              className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              Export <ChevronDown className="w-3 h-3" />
                            </button>

                            {snapshotDropdownId === snap.id && (
                              <div className="absolute right-0 top-9 bg-card border border-border shadow-lg rounded-lg py-1 z-50 text-left animate-in slide-in-from-top duration-100 w-36">
                                <button
                                  onClick={() => handleSnapshotExportExcel(snap)}
                                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 flex items-center gap-1.5"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (.xlsx)
                                </button>
                                <button
                                  onClick={() => handleSnapshotExportPDF(snap)}
                                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-1.5"
                                >
                                  <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF (.pdf)
                                </button>
                                <button
                                  onClick={() => handleSnapshotExportCSV(snap)}
                                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-1.5"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600" /> CSV (.csv)
                                </button>
                                <button
                                  onClick={() => handleSnapshotExportWord(snap)}
                                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-1.5"
                                >
                                  <FileEdit className="w-3.5 h-3.5 text-indigo-600" /> Word (.docx)
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── 3. Saved Templates Tab ─────────────────────────────────────────── */}
          {activeTab === 'saved' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {savedReports.length > 0 ? (
                  savedReports.map((tpl) => (
                    <div key={tpl.id} className="bg-card p-6 border border-border/80 rounded-xl hover:shadow-md transition-shadow flex flex-col justify-between relative group">

                      {/* Options overlay dropdown */}
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === tpl.id ? null : tpl.id);
                          }}
                          className="p-1 hover:bg-muted/80 rounded text-muted-foreground hover:text-muted-foreground transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openDropdownId === tpl.id && (
                          <div className="absolute right-0 top-7 w-40 bg-card border border-border shadow-lg rounded-lg py-1 z-50 text-left">
                            <button
                              onClick={() => handleUseTemplate(tpl)}
                              className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 flex items-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 text-muted-foreground fill-current" /> Run Report
                            </button>
                            <button
                              onClick={() => handleOpenScheduleModal(tpl)}
                              className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-1.5"
                            >
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Set Schedule
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-t border-border/50 flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Delete Template
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-center text-primary">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground tracking-tight">{tpl.name}</h4>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5 tracking-wider">{tpl.module} dataset</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{tpl.description}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border/50">
                        <button
                          onClick={() => handleUseTemplate(tpl)}
                          className="flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          Preview
                        </button>

                        <div className="relative flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateExportDropdownId(templateExportDropdownId === tpl.id ? null : tpl.id);
                            }}
                            className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Export <ChevronDown className="w-3 h-3" />
                          </button>

                          {templateExportDropdownId === tpl.id && (
                            <div className="absolute right-0 top-9 bg-card border border-border shadow-lg rounded-lg py-1 z-50 text-left animate-in slide-in-from-top duration-100 w-36">
                              <button
                                onClick={() => handleTemplateExportExcel(tpl)}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 flex items-center gap-1.5"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (.xlsx)
                              </button>
                              <button
                                onClick={() => handleTemplateExportPDF(tpl)}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF (.pdf)
                              </button>
                              <button
                                onClick={() => handleTemplateExportCSV(tpl)}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" /> CSV (.csv)
                              </button>
                              <button
                                onClick={() => handleTemplateExportWord(tpl)}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-1.5"
                              >
                                <FileEdit className="w-3.5 h-3.5 text-indigo-600" /> Word (.docx)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center bg-card rounded-xl border border-border border-dashed">
                    <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-bold text-foreground">No saved templates</h4>
                    <p className="text-xs text-muted-foreground mt-1">Select fields on the builder tab and click Save Template to build shortcut cards.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 4. Scheduled Runs Tab ────────────────────────────────────────── */}
          {activeTab === 'scheduled' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Header Title Section */}
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Active Automated Delivery Lists</h3>
                <button
                  onClick={() => {
                    setActiveTab('saved');
                    toast.info("Select Schedule from the overlay menu of any template card.");
                  }}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/70 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> New Delivery Schedule
                </button>
              </div>

              {/* Table Container Card */}
              <div className="bg-card border-t border-b border-l border-r-0 border-border/80 rounded-l-xl rounded-r-none overflow-hidden shadow-xs p-0">
                <div className="rounded-l-xl border-t border-b border-l border-r-0 border-border bg-card overflow-x-auto shadow-sm">
                  <Table className="min-w-[800px] border-collapse">
                    <TableHeader className="bg-muted border-b border-border">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Target</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Freq</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Delivery Slot</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recipients List</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output Format</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Status</TableHead>
                        <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduledReports.length > 0 ? (
                        scheduledReports.map((row) => (
                          <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="px-6 py-4 text-sm font-bold text-foreground">{row.name}</TableCell>
                            <TableCell className="px-6 py-4 text-sm font-semibold text-muted-foreground">{row.frequency}</TableCell>
                            <TableCell className="px-6 py-4 text-xs text-muted-foreground font-medium">{row.time} &bull; {row.next_run}</TableCell>
                            <TableCell className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[200px]" title={row.recipients}>{row.recipients}</TableCell>
                            <TableCell className="px-6 py-4 font-semibold"><span className="px-2 py-0.5 bg-muted rounded text-muted-foreground font-mono text-[10px]">{row.format}</span></TableCell>
                            <TableCell className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${row.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}>{row.status}</span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1 items-center">
                                <button
                                  onClick={() => handleTriggerScheduleRun(row)}
                                  className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                  title="Run Now"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleSchedule(row.id)}
                                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title={row.status === 'Active' ? 'Pause' : 'Resume'}
                                >
                                  {row.status === 'Active' ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4 text-emerald-600" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(row.id)}
                                  className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-medium italic">No cron scheduling profiles configured yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* ── Scheduled Setup Modal Drawer ────────────────────────────────────────── */}
          {showScheduleModal && selectedTemplateForSchedule && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
              <div className="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-border/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-foreground uppercase">Set Delivery Schedule</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Profile: {selectedTemplateForSchedule.name}</p>
                  </div>
                  <button
                    onClick={() => { setShowScheduleModal(false); setSelectedTemplateForSchedule(null); }}
                    className="p-1 hover:bg-muted/80 rounded text-muted-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Job Frequency</label>
                    <Select
                      value={scheduleFrequency}
                      onChange={setScheduleFrequency}
                      options={[
                        { value: "Daily", label: "Daily" },
                        { value: "Weekly on Monday", label: "Weekly on Monday" },
                        { value: "Weekly on Friday", label: "Weekly on Friday" },
                        { value: "Monthly on 1st", label: "Monthly on 1st" }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Execution Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full text-xs p-2 border border-border bg-card rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Recipient Emails (comma separated)</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="hr@company.com, team@company.com..."
                        value={scheduleRecipients}
                        onChange={e => setScheduleRecipients(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Output Format</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Excel', 'PDF', 'CSV'].map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setScheduleFormat(fmt)}
                          className={`py-2 px-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${scheduleFormat === fmt
                              ? 'bg-primary/5 border-primary text-primary'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                            }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border/50 bg-muted/50 flex justify-end gap-2.5">
                  <Button
                    onClick={() => { setShowScheduleModal(false); setSelectedTemplateForSchedule(null); }}
                    variant="outline"
                    className="h-9 text-xs border-border text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSchedule}
                    className="bg-primary hover:bg-primary/70 text-white font-bold h-9 text-xs border-0 shadow-sm"
                  >
                    Create Delivery Job
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Save Report Snapshot Modal ────────────────────────────────────────── */}
          {showSaveReportModal && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
              <div className="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-border/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-foreground uppercase">Save Report Snapshot</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Archive frozen query dataset values on current database state</p>
                  </div>
                  <button
                    onClick={() => setShowSaveReportModal(false)}
                    className="p-1 hover:bg-muted/80 rounded text-muted-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Snapshot Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Q3 Active Payroll Summary..."
                      value={saveReportTitle}
                      onChange={e => setSaveReportTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Description</label>
                    <textarea
                      placeholder="Enter description of this snapshot..."
                      value={saveReportDescription}
                      onChange={e => setSaveReportDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-foreground"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-border/50 bg-muted/50 flex justify-end gap-2.5">
                  <Button
                    onClick={() => setShowSaveReportModal(false)}
                    variant="outline"
                    className="h-9 text-xs border-border text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveReport}
                    className="bg-primary hover:bg-primary/70 text-white font-bold h-9 text-xs border-0 shadow-sm"
                  >
                    Save Snapshot
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Save Template Config Modal ────────────────────────────────────────── */}
          {showSaveTemplateModal && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
              <div className="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-border/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-foreground uppercase">Save Query Template</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Save current query column selection and filters for future runs</p>
                  </div>
                  <button
                    onClick={() => setShowSaveTemplateModal(false)}
                    className="p-1 hover:bg-muted/80 rounded text-muted-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Template Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly Exit Log..."
                      value={saveTemplateTitle}
                      onChange={e => setSaveTemplateTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Description</label>
                    <textarea
                      placeholder="Enter description of this template..."
                      value={saveTemplateDescription}
                      onChange={e => setSaveTemplateDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-foreground"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-border/50 bg-muted/50 flex justify-end gap-2.5">
                  <Button
                    onClick={() => setShowSaveTemplateModal(false)}
                    variant="outline"
                    className="h-9 text-xs border-border text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveConfig}
                    className="bg-primary hover:bg-primary/70 text-white font-bold h-9 text-xs border-0 shadow-sm"
                  >
                    Save Template
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Snapshot Data Preview Modal ───────────────────────────────────────── */}
          {snapshotPreviewOpen && selectedSnapshot && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-6 z-50 backdrop-blur-xs">
              <div className="bg-card border border-border rounded-xl max-w-5xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-border/50 flex justify-between items-center bg-muted/20">
                  <div>
                    <h3 className="font-bold text-sm text-foreground uppercase flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      Snapshot: {selectedSnapshot.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedSnapshot.description} &bull; Frozen at: {selectedSnapshot.created_at} ({selectedSnapshot.total_records} rows)
                    </p>
                  </div>
                  <button
                    onClick={() => { setSnapshotPreviewOpen(false); setSelectedSnapshot(null); }}
                    className="p-1.5 hover:bg-muted/80 rounded-lg text-muted-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-muted/10">
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                    <Table className="min-w-full border-collapse">
                      <TableHeader className="bg-muted border-b border-border">
                        <TableRow>
                          {selectedSnapshot.columns.map((f: string) => (
                            <TableHead key={f} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              {MODULE_SCHEMAS[selectedSnapshot.module]?.find(m => m.key === f)?.label || f}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSnapshot.data_snapshot.length > 0 ? (
                          selectedSnapshot.data_snapshot.map((row: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                              {selectedSnapshot.columns.map((f: string) => {
                                const raw = getNestedValue(row, f);
                                const txt = formatDisplayValue(raw, f);
                                const masked = maskSensitiveValue(txt, f);
                                return (
                                  <TableCell key={f} className="px-6 py-4 text-xs text-foreground font-medium whitespace-nowrap">
                                    {masked}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={selectedSnapshot.columns.length} className="text-center py-12 text-muted-foreground font-medium italic">
                              No data records archived in this snapshot.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="p-4 border-t border-border/50 bg-muted/50 flex justify-between items-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Module: {selectedSnapshot.module.toUpperCase()} &bull; Total records: {selectedSnapshot.total_records}
                  </p>
                  <Button
                    onClick={() => { setSnapshotPreviewOpen(false); setSelectedSnapshot(null); }}
                    className="bg-primary hover:bg-primary/70 text-white font-bold h-9 text-xs border-0 shadow-sm"
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      );
};

      export default ReportBuilder;

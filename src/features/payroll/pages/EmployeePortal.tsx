import { useCurrency } from "@/shared/hooks/useCurrency";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { usePayroll } from '../context/PayrollContext';
import { getActiveTzTaxPolicy } from '@/features/payroll/services/payroll';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/payroll-lib/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/payroll-lib/tabs';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Select as PayrollSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import Select from "@/shared/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/payroll-lib/table';
import { Textarea } from '@/shared/components/ui/payroll-lib/textarea';
import {
  Download, Upload, Receipt,
  CheckCircle2, Clock, XCircle, Trash2, FileText,
  Home, AlertCircle, ChevronDown,
  ChevronUp, Plus, Eye, X as XIcon,
  DollarSign, TrendingUp, TrendingDown, FileCheck, History, Shield
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import * as payrollService from '../services/payroll';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { LoansAdvancesPortal } from '@/features/loans-advances/pages/LoansAdvancesPortal';
import { ReimbursementModule } from '@/features/reimbursements/pages/ReimbursementModule';

type ProofStatus = 'submitted' | 'pending' | 'approved' | 'rejected';

interface Investment {
  id: string;
  section: string;
  instrument: string;
  amount: number;
  proofStatus: ProofStatus;
  fileName?: string;
  file?: File;
  submittedOn: string;
}

interface ExpenseClaim {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: ProofStatus;
  fileName?: string;
  file?: File;
  submittedOn: string;
}

const currencyInputPad = (symbol: string) =>
  symbol.length > 2 ? 'pl-14' : symbol.length > 1 ? 'pl-10' : 'pl-8';

function FilePreviewModal({ file, fileUrl, onClose }: { file?: File | null; fileUrl?: string | null; onClose: () => void }) {
  let isImage = false;
  let isPdf = false;
  let url = '';
  let name = 'Uploaded Proof';
  let sizeText = '';

  if (file) {
    isImage = file.type.startsWith('image/');
    isPdf = file.type === 'application/pdf';
    url = URL.createObjectURL(file);
    name = file.name;
    sizeText = `${(file.size / 1024).toFixed(1)} KB`;
  } else if (fileUrl) {
    const filename = fileUrl.split('/').pop() || 'Uploaded Proof';
    name = filename;
    isPdf = fileUrl.toLowerCase().endsWith('.pdf');
    isImage = fileUrl.toLowerCase().endsWith('.jpg') || fileUrl.toLowerCase().endsWith('.jpeg') || fileUrl.toLowerCase().endsWith('.png');
    url = fileUrl.startsWith('/') ? `${window.location.origin}${fileUrl}` : fileUrl;
  }

  if (isPdf) {
    window.open(url, '_blank');
    onClose();
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <FileText className="size-4 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground truncate max-w-xs">{name}</p>
              {sizeText && <p className="text-xs text-muted-foreground">{sizeText}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="overflow-auto max-h-[75vh] p-6 bg-muted/50 flex items-center justify-center">
          {isImage ? (
            <img
              src={url}
              alt={name}
              className="max-w-full max-h-[68vh] rounded-xl shadow-sm object-contain"
            />
          ) : (
            <div className="text-center py-16">
              <div className="size-20 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                <FileText className="size-10 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-sm text-foreground">Cannot preview this file type</p>
              <p className="text-xs text-muted-foreground mt-1">Click below to open it in a new tab</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-primary/95 transition-colors shadow-sm"
              >
                <Eye className="size-4" /> Open File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PortalTaxSection { key: string; label: string; limit: number; instruments: string[]; }
interface PortalReimbType { id: number; type: string; label: string; limit: number; period: string; }
interface PortalCtx {
  userDetailId?: number;
  baseSalary: number;
  payrollGroup: { id: number; name: string } | null;
  salaryStructure: { id: number; name: string } | null;
  computedPayslip: { grossSalary: number; netSalary: number; totalDeductions: number; earnings: { label: string; value: number }[]; deductions: { label: string; value: number }[] };
  taxSections: PortalTaxSection[];
  reimbursementTypes: PortalReimbType[];
  activeLoans?: any[];
  activeAdvances?: any[];
}

const FALLBACK_SECTIONS: Record<string, { label: string; limit: number; instruments: string[] }> = {
  '80C': { label: 'Savings & Investments', limit: 150000, instruments: ['PPF', 'ELSS', 'LIC Premium', 'Home Loan Principal', 'Tuition Fees', 'NSC', 'Tax Saver FD', 'Sukanya Samriddhi', 'ULIP'] },
  '80CCD(1B)': { label: 'NPS Contribution', limit: 50000, instruments: ['NPS – Tier I'] },
  '80D': { label: 'Health Insurance', limit: 50000, instruments: ['Health Insurance (Self/Family)', 'Health Insurance (Parents)', 'Preventive Health Check-up'] },
  '80E': { label: 'Education Loan Interest', limit: 0, instruments: ['Education Loan Interest'] },
  '24B': { label: 'Home Loan Interest', limit: 200000, instruments: ['Home Loan Interest'] },
  '80G': { label: 'Charitable Donations', limit: 0, instruments: ['PM Relief Fund', 'Approved Institutions', 'Other Donations'] },
  '80TTA': { label: 'Savings Bank Interest', limit: 10000, instruments: ['Savings Bank Interest'] },
};

const FALLBACK_EXPENSE_TYPES: Record<string, { label: string; limit: number; period: 'monthly' | 'annual' }> = {
  'Travel': { label: 'Travel Expenses', limit: 10000, period: 'monthly' },
  'Food': { label: 'Food & Beverage', limit: 3000, period: 'monthly' },
  'Medical': { label: 'Medical (Annual)', limit: 15000, period: 'annual' },
  'Mobile': { label: 'Mobile / Internet', limit: 2000, period: 'monthly' },
  'Other': { label: 'Other Business Exp', limit: 5000, period: 'monthly' },
};

interface PayslipData {
  month: string;
  gross: number;
  deductions: number;
  net: number;
  earnings: { label: string; value: number }[];
  deductionDetails: { label: string; value: number }[];
  employerContributions?: { label: string; value: number }[];
  attendance?: { workingDays: number; lopDays: number; paidLeaves: number };
}

const STATUS_CONFIG: Record<ProofStatus, { icon: React.JSX.Element; cls: string; label: string }> = {
  approved: { icon: <CheckCircle2 className="size-3" />, cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60', label: 'Approved' },
  submitted: { icon: <FileText className="size-3" />, cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60', label: 'Submitted' },
  pending: { icon: <Clock className="size-3" />, cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60', label: 'Pending' },
  rejected: { icon: <XCircle className="size-3" />, cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60', label: 'Rejected' },
};

function StatusPill({ status }: { status: string | ProofStatus }) {
  const sLower = (status || '').toString().toLowerCase();
  let cfg = STATUS_CONFIG[sLower as ProofStatus];

  if (!cfg) {
    if (sLower.includes('appr')) cfg = STATUS_CONFIG.approved;
    else if (sLower.includes('rej')) cfg = STATUS_CONFIG.rejected;
    else if (sLower.includes('subm')) cfg = STATUS_CONFIG.submitted;
    else cfg = STATUS_CONFIG.pending;
  }

  const { icon, cls, label } = cfg;
  const displayLabel = status ? (status.charAt(0).toUpperCase() + status.slice(1)) : label;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
      {icon}{displayLabel}
    </span>
  );
}

function DropZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDrop={pick}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3.5 cursor-pointer transition-all
        ${over ? 'border-primary bg-primary/10 scale-[1.01]' :
          file ? 'border-emerald-400 bg-emerald-50/40' :
            'border-border bg-muted hover:border-primary-300 hover:bg-primary/10/30'}`}
    >
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      {file ? (
        <>
          <div className="size-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="size-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700 truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · click to change</p>
          </div>
          <CheckCircle2 className="size-4 text-emerald-500 ml-auto shrink-0" />
        </>
      ) : (
        <>
          <div className="size-9 bg-muted rounded-xl flex items-center justify-center shrink-0">
            <Upload className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Upload proof document</p>
            <p className="text-xs text-muted-foreground">PDF, JPG or PNG · max 10 MB</p>
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-muted rounded-lg w-1/3" />
      <div className="h-8 bg-muted rounded-lg w-1/2" />
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="h-4 bg-muted rounded-lg flex-1" style={{ width: `${30 + (i % 3) * 10}%` }} />
          <div className="h-4 bg-muted rounded-lg w-20" />
          <div className="h-4 bg-muted rounded-lg w-20" />
          <div className="h-4 bg-muted rounded-lg w-20" />
        </div>
      ))}
    </div>
  );
}

function StatutoryDetailsTab({ employeeDetails }: { employeeDetails?: any }) {
  const { currencySymbol } = useCurrency();
  const detail = employeeDetails || {};
  const [activePolicy, setActivePolicy] = useState<any>(null);

  useEffect(() => {
    getActiveTzTaxPolicy().then(p => { if (p) setActivePolicy(p); }).catch(() => {});
  }, []);

  const personalReliefAnnual = activePolicy ? parseFloat(activePolicy.personal_relief_annual?.toString() || '270000') : 270000;
  const disabilityReliefAnnual = activePolicy ? parseFloat(activePolicy.disability_relief_annual?.toString() || '270000') : 270000;
  const empNssfRate = activePolicy ? (parseFloat(activePolicy.employee_nssf_rate?.toString() || '0.10') * 100) : 10;
  const empyrNssfRate = activePolicy ? (parseFloat(activePolicy.employer_nssf_rate?.toString() || '0.10') * 100) : 10;
  const sdlRate = activePolicy ? (parseFloat(activePolicy.sdl_rate?.toString() || '0.035') * 100) : 3.5;
  const wcfRate = activePolicy ? (parseFloat(activePolicy.wcf_rate?.toString() || '0.005') * 100) : 0.5;
  const heslbRate = activePolicy ? (parseFloat(activePolicy.heslb_rate?.toString() || '0.15') * 100) : 15;

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Tanzania Statutory Details
          </CardTitle>
          <CardDescription>Your statutory registration and relief information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">NSSF Number</label>
              <p className="text-sm font-semibold text-foreground py-2 px-3 bg-muted/50 rounded border border-border">
                {detail.nssf_number || "—"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">HESLB Loan Beneficiary</label>
              <p className="text-sm font-semibold text-foreground py-2 px-3 bg-muted/50 rounded border border-border">
                {detail.is_heslb_beneficiary ? "Yes" : "No"}
              </p>
            </div>
            {detail.is_heslb_beneficiary && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">HESLB Index Number</label>
                <p className="text-sm font-semibold text-foreground py-2 px-3 bg-muted/50 rounded border border-border">
                  {detail.heslb_index_number || "—"}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Disability Status</label>
              <p className="text-sm font-semibold text-foreground py-2 px-3 bg-muted/50 rounded border border-border">
                {detail.is_disabled ? "Yes — Disability Relief Applicable" : "No"}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h4 className="text-[12px] font-bold text-foreground mb-3">Tax Reliefs (Applied Automatically)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Personal Relief</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{currencySymbol} {personalReliefAnnual.toLocaleString()}<span className="text-[11px] font-medium">/year</span></p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-1">Automatic for all employees — reduces your PAYE tax</p>
              </div>
              <div className={`rounded-lg p-4 border ${detail.is_disabled ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50' : 'bg-muted/30 border-border'}`}>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Disability Relief</p>
                {detail.is_disabled ? (
                  <>
                    <p className="text-xl font-black text-blue-700 dark:text-blue-400">{currencySymbol} {disabilityReliefAnnual.toLocaleString()}<span className="text-[11px] font-medium">/year</span></p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-500 mt-1">Applied — additional relief on top of personal relief</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-black text-muted-foreground/50">—</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Not applicable — contact HR if you have a disability</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h4 className="text-[12px] font-bold text-foreground mb-3">Statutory Deductions (Auto-Calculated)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Employee NSSF</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">{empNssfRate}% of Gross Salary</p>
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-100 dark:border-blue-900/50">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">PAYE Tax</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">Progressive slabs (0-30%)</p>
              </div>
              <div className="bg-violet-50/50 dark:bg-violet-950/20 rounded-lg p-4 border border-violet-100 dark:border-violet-900/50">
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Employer Contributions</p>
                <p className="text-[11px] text-violet-700 dark:text-violet-400 font-medium">NSSF {empyrNssfRate}% + SDL {sdlRate}% + WCF {wcfRate}%</p>
              </div>
            </div>
          </div>

          {detail.is_heslb_beneficiary && (
            <div className="border-t border-border pt-5">
              <h4 className="text-[12px] font-bold text-foreground mb-3">HESLB Repayment</h4>
              <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-100 dark:border-amber-900/50">
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {heslbRate}% of Gross Salary is deducted monthly for your HESLB loan repayment ({currencySymbol} {((parseFloat(detail.nssf_number) || 0) * heslbRate / 100).toFixed(0)} estimated).
                </p>
              </div>
            </div>
          )}

          <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-100 dark:border-amber-900/50">
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
              All statutory deductions and reliefs are automatically calculated based on your gross salary and the organization's active tax policy. No manual declaration required. For disability relief, please contact HR.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaxDeclarationsTab({ taxSections, savedRegime, regimeChangedAt }: { taxSections: PortalTaxSection[]; savedRegime?: string | null; regimeChangedAt?: string | null }) {
  const { currencySymbol, isTanzania } = useCurrency();
  const SECTIONS: Record<string, { label: string; limit: number; instruments: string[] }> =
    taxSections.length > 0
      ? Object.fromEntries(taxSections.map(ts => [ts.key, { label: ts.label, limit: ts.limit, instruments: ts.instruments }]))
      : FALLBACK_SECTIONS;
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [fy, setFy] = useState('2025-26');
  const [hraOpen, setHraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentFyStartYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const fyStartDate = new Date(currentFyStartYear, 3, 1);
  const now = new Date();
  const changedAt = regimeChangedAt ? new Date(regimeChangedAt) : null;
  const isRegimeLocked = !!changedAt && changedAt >= fyStartDate;

  const [taxRegime, setTaxRegime] = useState<'Old' | 'New'>(
    savedRegime === 'Old' ? 'Old' : 'New'
  );

  useEffect(() => {
    const fetchDeclarations = async () => {
      try {
        const data = await payrollService.getMyDeclarations();
        setInvestments(data.map((d: any) => ({
          ...d,
          id: d.id.toString(),
          amount: Number(d.amount),
          proofStatus: d.status,
          fileName: d.proofUrl || d.proof_url || null,
          file: null,
          submittedOn: d.submitted_on?.split('T')[0] || d.created_at?.split('T')[0] || ''
        })));
      } catch (err) {
        toast.error('Failed to load declarations');
      }
    };
    fetchDeclarations();
  }, []);

  const [fSection, setFSection] = useState('');
  const [fInstrument, setFInstrument] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);

  const [hRent, setHRent] = useState('');
  const [hName, setHName] = useState('');
  const [hPan, setHPan] = useState('');
  const [hCity, setHCity] = useState<'metro' | 'non-metro'>('metro');
  const [hFrom, setHFrom] = useState('');
  const [hTo, setHTo] = useState('');
  const [hFile, setHFile] = useState<File | null>(null);

  const totalBySec = investments.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.section] = (acc[inv.section] ?? 0) + inv.amount;
    return acc;
  }, {});
  const grandTotal = Object.values(totalBySec).reduce((s, v) => s + v, 0);
  const taxSaved = Math.round(grandTotal * 0.30);
  const pendingCount = investments.filter(i => i.proofStatus === 'pending' || i.proofStatus === 'submitted').length;
  const approvedCount = investments.filter(i => i.proofStatus === 'approved').length;

  const instruments = fSection ? SECTIONS[fSection]?.instruments ?? [] : [];

  const sectionLimit = fSection ? SECTIONS[fSection].limit : 0;
  const sectionUsed = fSection ? (totalBySec[fSection] ?? 0) : 0;
  const afterAdd = sectionUsed + Number(fAmount || 0);
  const limitPct = sectionLimit > 0 ? Math.min((afterAdd / sectionLimit) * 100, 100) : 0;
  const exceedsLimit = sectionLimit > 0 && afterAdd > sectionLimit;

  const handleSubmit = async () => {
    if (!fSection || !fInstrument || !fAmount) { toast.error('Fill in all required fields'); return; }
    if (Number(fAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!fFile) { toast.error('Upload a proof document'); return; }
    if (exceedsLimit) { toast.error(`Exceeds Section ${fSection} limit of ${currencySymbol}${sectionLimit.toLocaleString()}`); return; }

    try {
      setSaving(true);
      // Upload the file first
      const uploadRes = await payrollService.uploadFile(fFile);
      if (!uploadRes || !uploadRes.success) {
        throw new Error('Upload failed');
      }
      const uploadedUrl = uploadRes.url;

      const res = await payrollService.submitDeclaration({
        section: fSection,
        instrument: fInstrument,
        amount: Number(fAmount),
        financialYear: fy,
        proofUrl: uploadedUrl
      });

      setInvestments(prev => [{
        ...res,
        id: res.id.toString(),
        amount: Number(res.amount),
        proofStatus: res.status,
        submittedOn: res.submitted_on.split('T')[0],
        fileName: fFile.name,
        file: fFile
      }, ...prev]);

      setFSection(''); setFInstrument(''); setFAmount(''); setFFile(null);
      toast.success('Declaration submitted — under review');
    } catch (err) {
      toast.error('Failed to submit declaration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const inv = investments.find(i => i.id === id);
      if (inv?.proofStatus === 'approved') { toast.error('Approved declarations cannot be removed'); return; }
      await payrollService.deleteDeclaration(parseInt(id));
      setInvestments(prev => prev.filter(i => i.id !== id));
      toast.success('Declaration removed');
    } catch (err) {
      toast.error('Failed to delete declaration');
    }
  };

  const handleHraSubmit = async () => {
    if (!hRent || !hName || !hPan) { toast.error('Fill all required HRA fields'); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(hPan)) { toast.error('Invalid PAN format'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success('HRA declaration submitted successfully');
  };

  const handleRegimeChange = async (regime: 'Old' | 'New') => {
    if (isRegimeLocked) {
      toast.error('Regime is locked for this financial year. Changes allowed only before April 1st.');
      return;
    }
    try {
      setTaxRegime(regime);
      await payrollService.updateTaxRegime(regime);
      toast.success(`Tax Regime updated to ${regime} Regime`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update Tax Regime');
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Tax Declarations</h3>
          <p className="text-sm text-muted-foreground">FY {fy} · Submit proofs to reduce your monthly TDS</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={fy} onChange={(val) => setFy(val)} options={[{ value: "2025-26", label: "FY 2025–26" }, { value: "2024-25", label: "FY 2024–25" }]} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Declared', value: `${currencySymbol}${grandTotal.toLocaleString()}`, icon: DollarSign },
          { label: 'Est. Tax Saved', value: `${currencySymbol}${taxSaved.toLocaleString()}`, icon: CheckCircle2 },
          { label: 'Docs Approved', value: approvedCount, icon: FileText },
          { label: 'Under Review', value: pendingCount, icon: Clock },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <k.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{k.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <Card className="border-primary-100 shadow-sm bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-foreground">Tax Regime Selection</h4>
              {isRegimeLocked ? (
                <p className="text-xs text-amber-600 mt-1 leading-relaxed max-w-lg font-medium">
                  You've already selected your regime for FY {currentFyStartYear}-{(currentFyStartYear + 1).toString().slice(-2)}. You can change it again next financial year.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-lg">Choose between Old and New tax regimes. New regime offers lower rates but no exemptions under Section 80C, HRA, etc.</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {taxRegime === 'Old' ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900">80C Deductions</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900">HRA Exemption</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900">80D Medical</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900">All Exemptions</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-100 dark:border-blue-900">Lower Tax Rates</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-100 dark:border-blue-900">No Proof Needed</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-100 dark:border-blue-900">Standard Deduction</span>
                  </>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 w-full sm:w-auto shrink-0 bg-card p-1.5 rounded-2xl border border-border ${isRegimeLocked ? 'shadow-none opacity-60' : 'shadow-inner'}`}>
              <button
                onClick={() => handleRegimeChange('Old')}
                disabled={isRegimeLocked}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${taxRegime === 'Old' ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-muted-foreground hover:text-foreground hover:bg-muted'} ${isRegimeLocked ? 'cursor-not-allowed' : ''}`}
              >
                Old Regime
              </button>
              <button
                onClick={() => handleRegimeChange('New')}
                disabled={isRegimeLocked}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${taxRegime === 'New' ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-muted-foreground hover:text-foreground hover:bg-muted'} ${isRegimeLocked ? 'cursor-not-allowed' : ''}`}
              >
                New Regime
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <div className="lg:col-span-3">
          <Card className="border-border shadow-sm h-full overflow-hidden">
            <CardHeader className="pb-4 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="size-5 text-primary shrink-0" />
                My Declarations
              </CardTitle>
              <CardDescription>{investments.length} item{investments.length !== 1 ? 's' : ''} · FY {fy}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">

              {investments.length === 0 && (
                <div className="py-20 text-center">
                  <FileText className="size-8 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm font-bold text-foreground">No declarations yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Start by selecting a tax section and uploading your investment proof using the form on the right</p>
                </div>
              )}

              <div className="divide-y divide-border/50">
                {investments.map(inv => {
                  const used = totalBySec[inv.section] ?? 0;
                  const limit = SECTIONS[inv.section]?.limit ?? 0;
                  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
                  const isOpen = expandedId === inv.id;
                  const secLabel = SECTIONS[inv.section]?.label ?? inv.section;
                  const statusMsg: Record<ProofStatus, string> = {
                    approved: 'Your document has been verified by the payroll team. This deduction will reflect in your TDS.',
                    submitted: 'Document received. Payroll team will review it within 5–7 working days.',
                    pending: 'Awaiting your proof document upload. Please upload the required document.',
                    rejected: 'Document was rejected. Please re-submit with a valid proof document.',
                  };
                  return (
                    <div key={inv.id}>
                      <button
                        onClick={() => setExpandedId(isOpen ? null : inv.id)}
                        className={`w-full text-left flex items-center gap-4 px-5 py-4 transition-all
                            ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                      >
                        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all
                            ${isOpen ? 'bg-primary border-primary shadow-sm shadow-primary/20' : 'bg-primary/10 border-primary/10'}`}>
                          <span className={`text-[10px] font-black ${isOpen ? 'text-white' : 'text-primary'}`}>
                            {inv.section.slice(0, 3)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{inv.instrument}</p>
                            <p className="text-sm font-black text-foreground shrink-0">{currencySymbol}{inv.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{inv.section}</span>
                            <span className="text-gray-200">·</span>
                            <StatusPill status={inv.proofStatus} />
                          </div>
                        </div>

                        <ChevronDown className={`size-4 text-gray-300 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-2 bg-primary/5 border-t border-primary/10 space-y-4">

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-card rounded-xl p-3.5 border border-border">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Section</p>
                              <p className="text-sm font-bold text-foreground">{inv.section}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{secLabel}</p>
                            </div>
                            <div className="bg-card rounded-xl p-3.5 border border-border">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Declared Amount</p>
                              <p className="text-xl font-black text-primary">{currencySymbol}{inv.amount.toLocaleString()}</p>
                              {limit > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">of {currencySymbol}{(limit / 1000).toFixed(0)}K limit</p>
                              )}
                            </div>
                            <div className="bg-card rounded-xl p-3.5 border border-border">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Submitted On</p>
                              <p className="text-sm font-bold text-foreground">{inv.submittedOn}</p>
                            </div>
                            <div className="bg-card rounded-xl p-3.5 border border-border">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Proof Document</p>
                              {inv.fileName ? (
                                <button
                                  onClick={() => setPreviewFile(inv.file || inv.fileName || null)}
                                  className="flex items-center gap-1.5 group/file cursor-pointer"
                                >
                                  <FileText className="size-3.5 shrink-0 text-primary-400 group-hover/file:text-primary" />
                                  <span className="text-xs font-semibold truncate text-foreground group-hover/file:text-primary group-hover/file:underline">
                                    {inv.fileName.split('/').pop()}
                                  </span>
                                  <Eye className="size-3 text-primary-300 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                                </button>
                              ) : (
                                <span className="text-xs text-amber-500 font-semibold">No file uploaded</span>
                              )}
                            </div>
                          </div>

                          {limit > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-muted-foreground">Section {inv.section} utilisation</span>
                                <span className="text-primary">{currencySymbol}{used.toLocaleString()} / {currencySymbol}{limit.toLocaleString()}</span>
                              </div>
                              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${pct >= 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-primary to-primary/80'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {pct >= 100 ? 'Limit reached' : `${currencySymbol}${(limit - used).toLocaleString()} remaining`}
                              </p>
                            </div>
                          )}

                          {(() => {
                            const stLower = (inv.proofStatus || '').toString().toLowerCase();
                            const isAppr = stLower.includes('appr');
                            const isRej = stLower.includes('rej');
                            const isSubm = stLower.includes('subm');

                            const bannerStyle = isAppr
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : isSubm
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : isRej
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100';

                            const bannerMsg = isAppr
                              ? 'Your document has been verified by the payroll team. This deduction will reflect in your TDS.'
                              : isSubm
                              ? 'Document received. Payroll team will review it within 5–7 working days.'
                              : isRej
                              ? 'Document was rejected. Please re-submit with a valid proof document.'
                              : `Status: ${inv.proofStatus || 'Under Review'}. Awaiting verification.`;

                            return (
                              <div className={`flex items-start gap-2.5 rounded-xl p-3 text-xs font-medium ${bannerStyle}`}>
                                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                                {bannerMsg}
                              </div>
                            );
                          })()}

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setExpandedId(null)}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                ↑ Collapse
                              </button>
                              {(inv.file || inv.fileName) && (
                                <button
                                  onClick={() => setPreviewFile(inv.file || inv.fileName || null)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-all"
                                >
                                  <Eye className="size-3.5" /> View Document
                                </button>
                              )}
                            </div>
                            {!((inv.proofStatus || '').toString().toLowerCase().includes('appr')) && (
                              <button
                                onClick={() => { handleDelete(inv.id); setExpandedId(null); }}
                                className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all"
                              >
                                <Trash2 className="size-3.5" /> Remove
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {investments.length > 0 && (
                <div className="mx-5 my-4 flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl px-4 py-3 border border-primary/10">
                  <span className="text-xs font-bold text-primary/60 uppercase tracking-wider">Grand Total</span>
                  <span className="text-xl font-black text-primary">{currencySymbol}{grandTotal.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-border shadow-sm sticky top-6 overflow-hidden">
            <CardHeader className="pb-4 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="size-5 text-primary shrink-0" />
                Add Declaration
              </CardTitle>
              <CardDescription>Upload investment proof for validation</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tax Section *</Label>
                <PayrollSelect value={fSection} onValueChange={v => { setFSection(v); setFInstrument(''); setFAmount(''); }}>
                  <SelectTrigger className="rounded-xl border-border text-sm">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(SECTIONS).map(([key, cfg]) => {
                      const used = totalBySec[key] ?? 0;
                      const full = cfg.limit > 0 && used >= cfg.limit;
                      return (
                        <SelectItem key={key} value={key} disabled={full}>
                          <span className="font-bold">{key}</span>
                          <span className="ml-2 text-muted-foreground text-xs">
                            {cfg.limit > 0
                              ? `${(used / 1000).toFixed(0)}K / ${(cfg.limit / 1000).toFixed(0)}K`
                              : 'No limit'}
                            {full && ' · Full'}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </PayrollSelect>
                {fSection && (
                  <p className="text-xs text-muted-foreground px-1">{SECTIONS[fSection].label}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Instrument *</Label>
                <PayrollSelect value={fInstrument} onValueChange={setFInstrument} disabled={!fSection}>
                  <SelectTrigger className="rounded-xl border-border text-sm">
                    <SelectValue placeholder={fSection ? 'Select instrument' : '— select section first —'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {instruments.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </PayrollSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Amount ({currencySymbol}) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">{currencySymbol}</span>
                  <Input
                    type="number" min={1} placeholder="e.g. 50000"
                    value={fAmount} onChange={e => setFAmount(e.target.value)}
                    className={`${currencyInputPad(currencySymbol)} rounded-xl text-sm ${exceedsLimit ? 'border-rose-400 ring-1 ring-rose-300' : 'border-border'}`}
                  />
                </div>
                {fSection && sectionLimit > 0 && fAmount && (
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${exceedsLimit ? 'bg-rose-500' : 'bg-gradient-to-r from-primary to-primary/80'}`}
                        style={{ width: `${limitPct}%` }}
                      />
                    </div>
                    <p className={`text-xs font-semibold ${exceedsLimit ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      {exceedsLimit
                        ? `Exceeds limit by ${currencySymbol}${(afterAdd - sectionLimit).toLocaleString()}`
                        : `${currencySymbol}${(sectionLimit - afterAdd).toLocaleString()} remaining of ${currencySymbol}${(sectionLimit / 1000).toFixed(0)}K limit`}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Proof Document *</Label>
                <DropZone file={fFile} onFile={setFFile} />
              </div>

              <Button
                onClick={handleSubmit} disabled={saving || exceedsLimit}
                className="w-full bg-primary hover:bg-primary/95 rounded-xl py-5 text-sm font-bold shadow-sm shadow-primary/20 gap-2"
              >
                {saving
                  ? <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
                  : <><CheckCircle2 className="size-4" />Submit Declaration</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className={`border-emerald-100 dark:border-emerald-900/50 shadow-sm overflow-hidden transition-all ${hraOpen ? '' : 'hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-md'}`}>
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
          onClick={() => setHraOpen(o => !o)}
        >
          <div className="flex items-center gap-3">
            <Home className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">HRA Exemption Declaration</p>
              <p className="text-xs text-muted-foreground">Claim House Rent Allowance exemption on rent paid</p>
            </div>
          </div>
          <div className={`size-8 rounded-lg flex items-center justify-center transition-colors ${hraOpen ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-muted'}`}>
            {hraOpen
              ? <ChevronUp className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
          </div>
        </button>

        {hraOpen && (
          <div className="px-6 pb-6 border-t border-emerald-100 dark:border-emerald-900/50 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Monthly Rent ({currencySymbol}) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                  <Input type="number" placeholder="15,000" value={hRent}
                    onChange={e => setHRent(e.target.value)}
                    className={`${currencyInputPad(currencySymbol)} rounded-xl border-border text-sm`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Landlord Name *</Label>
                <Input placeholder="Full name" value={hName}
                  onChange={e => setHName(e.target.value)}
                  className="rounded-xl border-border text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Landlord PAN *</Label>
                <Input
                  placeholder="ABCDE1234F" maxLength={10}
                  value={hPan} onChange={e => setHPan(e.target.value.toUpperCase())}
                  className={`rounded-xl text-sm font-mono tracking-widest ${hPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(hPan) ? 'border-rose-400' : 'border-border'}`}
                />
                {hPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(hPan) && (
                  <p className="text-[11px] text-rose-500 font-semibold">Invalid PAN format</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">City Type</Label>
                <div className="flex gap-2">
                  {(['metro', 'non-metro'] as const).map(ct => (
                    <button key={ct} onClick={() => setHCity(ct)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all
                          ${hCity === ct ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/50' : 'bg-card text-gray-600 dark:text-gray-400 border-border hover:border-emerald-300 dark:hover:border-emerald-700'}`}
                    >
                      {ct === 'metro' ? 'Metro (50%)' : 'Non-Metro (40%)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Rent From</Label>
                <Input type="month" value={hFrom} onChange={e => setHFrom(e.target.value)}
                  className="rounded-xl border-border text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Rent To</Label>
                <Input type="month" value={hTo} onChange={e => setHTo(e.target.value)}
                  className="rounded-xl border-border text-sm" />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Rent Agreement / Receipts</Label>
                <DropZone file={hFile} onFile={setHFile} />
              </div>

              <div className="flex flex-col justify-end gap-3">
                {hRent && Number(hRent) > 0 && (
                  <div className="bg-gradient-to-br from-emerald-50 dark:from-emerald-950/30 to-emerald-50/50 dark:to-emerald-950/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/50 text-center">
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Annual Rent</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{currencySymbol}{(Number(hRent) * 12).toLocaleString()}</p>
                    <p className="text-[11px] text-emerald-500 dark:text-emerald-400 mt-1">
                      {hCity === 'metro' ? '50%' : '40%'} HRA exempt from tax
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleHraSubmit} disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl py-5 text-sm font-bold gap-2 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/50"
                >
                  {saving
                    ? <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
                    : <><Home className="size-4" />Submit HRA Declaration</>}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl px-3 py-2.5 border border-amber-100/50 dark:border-amber-900/50">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>If annual rent exceeds {currencySymbol}1,00,000, landlord&apos;s PAN is mandatory by law.</span>
            </div>
          </div>
        )}
      </Card>


      {previewFile && (
        <FilePreviewModal
          file={typeof previewFile !== 'string' ? previewFile : null}
          fileUrl={typeof previewFile === 'string' ? previewFile : null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

function ReimbursementsTab({ reimbursementTypes }: { reimbursementTypes: PortalReimbType[] }) {
  const { currencySymbol, isTanzania } = useCurrency();
  const EXPENSE_TYPES: Record<string, { label: string; limit: number; period: string }> =
    reimbursementTypes.length > 0
      ? Object.fromEntries(reimbursementTypes.map(r => [r.type, { label: r.label, limit: r.limit, period: r.period }]))
      : FALLBACK_EXPENSE_TYPES;
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | string | null>(null);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const data = await payrollService.getMyClaims();
        setClaims(data.map((c: any) => ({
          ...c,
          id: c.id.toString(),
          amount: Number(c.amount),
          status: c.status,
          fileName: c.proof_url || null,
          file: null,
          date: c.expense_date?.split('T')[0] || c.created_at?.split('T')[0] || '',
          submittedOn: c.submitted_on?.split('T')[0] || c.created_at?.split('T')[0] || ''
        })));
      } catch (err) {
        toast.error('Failed to load claims');
      }
    };
    fetchClaims();
  }, []);

  const [fType, setFType] = useState('');
  const [fDate, setFDate] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);

  const typeLimit = fType ? EXPENSE_TYPES[fType]?.limit ?? 0 : 0;
  const exceedsLimit = typeLimit > 0 && Number(fAmount || 0) > typeLimit;
  const limitPct = typeLimit > 0 ? Math.min((Number(fAmount || 0) / typeLimit) * 100, 100) : 0;

  const totalClaimed = claims.reduce((s, c) => s + c.amount, 0);
  const totalApproved = claims.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
  const totalPending = claims.filter(c => c.status === 'submitted' || c.status === 'pending').reduce((s, c) => s + c.amount, 0);

  const handleSubmit = async () => {
    if (!fType || !fDate || !fAmount || !fFile) { toast.error('Fill in all fields and attach invoice'); return; }
    setSaving(true);
    try {
      // Upload the file first
      const uploadRes = await payrollService.uploadFile(fFile);
      if (!uploadRes || !uploadRes.success) {
        throw new Error('Upload failed');
      }
      const uploadedUrl = uploadRes.url;

      const saved = await payrollService.submitClaim({
        type: fType,
        amount: Number(fAmount),
        date: fDate,
        description: fDesc,
        proofUrl: uploadedUrl
      });
      setClaims(prev => [{
        id: String(saved.id),
        type: fType,
        amount: Number(fAmount),
        date: fDate,
        description: fDesc,
        status: 'submitted' as ProofStatus,
        fileName: uploadedUrl,
        file: fFile,
        submittedOn: new Date().toISOString().split('T')[0]
      }, ...prev]);
      setFType(''); setFDate(''); setFAmount(''); setFDesc(''); setFFile(null);
      toast.success('Claim submitted successfully');
    } catch { toast.error('Failed to submit claim'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const claim = claims.find(c => c.id === id);
      if (claim?.status === 'approved') { toast.error('Approved claims cannot be removed'); return; }
      await payrollService.deleteClaim(parseInt(id));
      setClaims(prev => prev.filter(c => c.id !== id));
      toast.success('Claim removed');
    } catch (err) {
      toast.error('Failed to delete claim');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Reimbursements</h3>
          <p className="text-sm text-muted-foreground">Submit and track your expense claims</p>
        </div>
        <Button onClick={() => document.getElementById('claim-form')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-primary hover:bg-primary/95 rounded-xl gap-2 font-bold shadow-sm shadow-primary/20">
          <Receipt className="size-4" />New Claim
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-5">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {claims.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="size-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                      <Receipt className="size-8 text-muted-foreground/30" />
                    </div>
                    <p className="font-bold text-sm text-foreground">No claims found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Submit your first expense claim using the form on the right</p>
                  </div>
                )}
                {claims.map(claim => {
                  const isOpen = expandedId === claim.id;
                  const typeConfig = EXPENSE_TYPES[claim.type];
                  return (
                    <div key={claim.id}>
                      <button
                        onClick={() => setExpandedId(isOpen ? null : claim.id)}
                        className={`w-full flex items-center gap-4 px-6 py-4 transition-all text-left
                          ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                      >
                        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all
                          ${isOpen ? 'bg-primary border-primary shadow-sm shadow-primary/20' : 'bg-muted border-border'}`}>
                          <Receipt className={`size-5 ${isOpen ? 'text-white' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <p className="font-bold text-foreground">{claim.type}</p>
                            <p className="font-black text-primary">{currencySymbol}{claim.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">{claim.date}</span>
                            <span className="text-gray-200">·</span>
                            <StatusPill status={claim.status} />
                          </div>
                        </div>
                        <ChevronDown className={`size-4 text-gray-300 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="px-6 pb-6 pt-2 bg-primary/5 border-t border-primary/10 space-y-4">
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-card rounded-xl p-3.5 border border-border">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Expense Date</p>
                              <p className="text-sm font-bold text-foreground">{claim.date}</p>
                            </div>
                            <div className="bg-card rounded-xl p-3.5 border border-border">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                              <p className="text-sm font-black text-primary">{currencySymbol}{claim.amount.toLocaleString()}</p>
                              {typeConfig && <p className="text-[10px] text-muted-foreground mt-0.5">Limit: {currencySymbol}{typeConfig.limit.toLocaleString()} / {typeConfig.period}</p>}
                            </div>
                            <div className="bg-card rounded-xl p-3.5 border border-border col-span-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                              <p className="text-sm text-foreground">{claim.description || 'No description provided'}</p>
                            </div>
                            <div className="bg-card rounded-xl p-3.5 border border-border col-span-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Invoice attachment</p>
                              {claim.fileName ? (
                                <button
                                  onClick={() => setPreviewFile(claim.file || claim.fileName || null)}
                                  className="flex items-center gap-2 group/file w-full cursor-pointer"
                                >
                                  <FileText className="size-4 shrink-0 text-primary-400" />
                                  <span className="text-xs font-semibold truncate flex-1 text-left text-foreground group-hover/file:text-primary">
                                    {claim.fileName.split('/').pop()}
                                  </span>
                                  <Eye className="size-3.5 text-primary-400 opacity-0 group-hover/file:opacity-100" />
                                </button>
                              ) : (
                                <span className="text-xs text-rose-400 font-semibold italic">Missing invoice proof</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-3">
                              <button onClick={() => setExpandedId(null)} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">↑ Collapse</button>
                              {(claim.file || claim.fileName) && (
                                <button onClick={() => setPreviewFile(claim.file || claim.fileName || null)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary px-3 py-1.5 bg-primary/10 rounded-xl transition-all">
                                  <Eye className="size-3.5" /> View Invoice
                                </button>
                              )}
                            </div>
                            {claim.status !== 'approved' && (
                              <button onClick={() => { handleDelete(claim.id); setExpandedId(null); }} className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all">
                                <Trash2 className="size-3.5" /> Remove
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Total Claimed', value: `${currencySymbol}${totalClaimed.toLocaleString()}`, icon: Receipt },
              { label: 'Approved Claims', value: `${currencySymbol}${totalApproved.toLocaleString()}`, icon: CheckCircle2 },
              { label: 'Pending Claims', value: `${currencySymbol}${totalPending.toLocaleString()}`, icon: Clock },
            ].map(k => (
              <div key={k.label} className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
                <div className="flex items-center justify-between mb-2">
                  <k.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{k.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <Card id="claim-form" className="border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Receipt className="size-5 text-primary shrink-0" />
                Submit New Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Expense Type</Label>
                <PayrollSelect value={fType} onValueChange={setFType}>
                  <SelectTrigger className="rounded-xl border-border text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(EXPENSE_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label} (Max {currencySymbol}{v.limit.toLocaleString()})</SelectItem>
                    ))}
                  </SelectContent>
                </PayrollSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Expense Date</Label>
                <ModernDatePicker
                  value={fDate}
                  onChange={(date) => setFDate(date)}
                  placeholder="Select Date"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Amount ({currencySymbol})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">{currencySymbol}</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={fAmount}
                    onChange={e => setFAmount(e.target.value)}
                    className={`${currencyInputPad(currencySymbol)} rounded-xl text-sm font-bold ${exceedsLimit ? 'border-rose-400 ring-1 ring-rose-300' : 'border-border'}`}
                  />
                </div>
                {fType && typeLimit > 0 && (
                  <div className="space-y-1">
                    {fAmount && (
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${exceedsLimit ? 'bg-rose-500' : 'bg-gradient-to-r from-primary to-primary/80'}`}
                          style={{ width: `${limitPct}%` }}
                        />
                      </div>
                    )}
                    <p className={`text-[10px] font-semibold ${exceedsLimit ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      {fAmount
                        ? exceedsLimit
                          ? `Exceeds ${fType} limit by ${currencySymbol}${(Number(fAmount) - typeLimit).toLocaleString()}`
                          : `${currencySymbol}${(typeLimit - Number(fAmount)).toLocaleString()} remaining of ${currencySymbol}${typeLimit.toLocaleString()} limit`
                        : `Limit: ${currencySymbol}${typeLimit.toLocaleString()} (${EXPENSE_TYPES[fType]?.period || 'Claim'})`}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Description</Label>
                <Textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="What was this for?" rows={2} className="rounded-xl border-border text-sm resize-none" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Invoice Attachment</Label>
                <DropZone file={fFile} onFile={setFFile} />
              </div>

              <Button
                onClick={handleSubmit} disabled={saving}
                className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl py-5 font-bold text-sm shadow-sm"
              >
                {saving ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-muted/30 overflow-hidden">
            <CardContent className="py-4 space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Monthly Allowance Limits</p>
              {Object.entries(EXPENSE_TYPES).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center bg-card p-2.5 rounded-xl border border-border shadow-sm">
                  <span className="text-xs text-muted-foreground font-medium">{v.label}</span>
                  <span className="text-xs font-bold text-primary">{currencySymbol}{v.limit.toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {previewFile && (
        <FilePreviewModal
          file={typeof previewFile !== 'string' ? previewFile : null}
          fileUrl={typeof previewFile === 'string' ? previewFile : null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

function Form12BTab() {
  const { currencySymbol, isTanzania } = useCurrency();
  const [employerName, setEmployerName] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [tdsDeducted, setTdsDeducted] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!employerName || !grossSalary || !tdsDeducted || !file) {
      toast.error('Please fill all required fields and upload Form 12B PDF.');
      return;
    }
    setSaving(true);
    try {
      // Upload the file first
      const uploadRes = await payrollService.uploadFile(file);
      if (!uploadRes || !uploadRes.success) {
        throw new Error('Upload failed');
      }
      const uploadedUrl = uploadRes.url;

      await payrollService.submitForm12B({
        employerName,
        grossSalary: Number(grossSalary),
        tdsDeducted: Number(tdsDeducted),
        financialYear: '2025-26',
        proofUrl: uploadedUrl
      });
      setSubmitted(true);
      toast.success('Form 12B submitted successfully! It is now under review.');
    } catch (error) {
      toast.error('Failed to submit Form 12B');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm overflow-hidden">
        <CardContent className="py-20 text-center">
          <div className="size-20 rounded-2xl bg-emerald-100 mx-auto flex items-center justify-center mb-5">
            <CheckCircle2 className="size-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Form 12B Submitted Successfully!</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm leading-relaxed">Your previous employment tax details have been securely submitted. Our payroll team will review and update your cumulative tax profile shortly.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border pb-5">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-3">
            <FileText className="size-5 text-primary shrink-0" />
            Previous Employment Details
          </CardTitle>
          <CardDescription>Declare income from your previous employer to ensure accurate TDS calculation for the rest of this financial year.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-5 text-left">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Previous Employer Name *</Label>
            <Input placeholder="e.g., TCS, Infosys" value={employerName} onChange={e => setEmployerName(e.target.value)} className="rounded-xl border-border text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Gross Salary Paid ({currencySymbol}) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
              <Input type="number" placeholder="450000" value={grossSalary} onChange={e => setGrossSalary(e.target.value)} className={`${currencyInputPad(currencySymbol)} rounded-xl border-border text-sm`} />
            </div>
            <p className="text-[11px] text-muted-foreground">Total salary before any tax deductions by previous employer</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">TDS Deducted ({currencySymbol}) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
              <Input type="number" placeholder="15000" value={tdsDeducted} onChange={e => setTdsDeducted(e.target.value)} className={`${currencyInputPad(currencySymbol)} rounded-xl border-border text-sm`} />
            </div>
            <p className="text-[11px] text-muted-foreground">Total tax already deposited by previous employer</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Form 12B Document *</Label>
            <DropZone file={file} onFile={setFile} />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full bg-primary hover:bg-primary/95 rounded-xl py-6 font-bold shadow-sm shadow-primary/20 mt-4 text-white">
            {saving ? 'Submitting...' : 'Submit Form 12B'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="bg-gradient-to-br from-amber-50 dark:from-amber-950/40 to-amber-50/30 dark:to-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-6 text-amber-800 dark:text-amber-300 shadow-sm">
          <div className="flex items-start gap-4 text-left">
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Why is this important?</h4>
              <p className="text-xs mt-2 leading-relaxed text-amber-700 dark:text-amber-300 font-medium">If you joined us in the middle of the financial year, we need to know your previous salary to calculate your cumulative tax correctly. Without Form 12B, your tax might be under-deducted right now, resulting in a massive penalty and tax demand from the Income Tax Department at the end of the year!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Loans & Advances Tab ──────────────────────────────────────────────────
function LoansAndAdvancesTab({ activeLoans, activeAdvances, userId, refresh, payslips }: { activeLoans: any[], activeAdvances: any[], userId: number, refresh: () => void, payslips: PayslipData[] }) {
  const { currencySymbol } = useCurrency();

  const formatMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('loan');
  const [principal, setPrincipal] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemType, setItemType] = useState<'loan' | 'advance'>('loan');

  const history = useMemo(() => {
    if (!selectedItem) return [];

    const sorted = [...(payslips || [])].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return sorted.filter(p => {
      const deductionLabel = itemType === 'loan' ? 'Loan Recovery' : 'Advance Recovery';
      const hasDeduction = p.deductionDetails?.find((d: any) => d.label === deductionLabel);
      return hasDeduction && hasDeduction.value > 0;
    }).map(p => {
      const deductionLabel = itemType === 'loan' ? 'Loan Recovery' : 'Advance Recovery';
      const amount = p.deductionDetails?.find((d: any) => d.label === deductionLabel)?.value || 0;
      return {
        month: p.month,
        amount
      };
    });
  }, [selectedItem, itemType, payslips]);

  const handleRequestSubmit = async () => {
    if (!principal || !duration || !reason) {
      toast.error('Please fill in all fields (Amount, Duration, Reason)');
      return;
    }
    const monthlyRecovery = Math.ceil(Number(principal) / Number(duration));
    const payload = {
      userDetailId: userId,
      principalAmount: Number(principal),
      monthlyRecovery,
      status: 'PENDING',
      reason
    };

    setIsSubmitting(true);
    try {
      if (requestType === 'loan') {
        await payrollService.requestLoan(payload);
        toast.success('Loan requested successfully. Pending HR approval.');
      } else {
        await payrollService.requestAdvance(payload);
        toast.success('Advance requested successfully. Pending HR approval.');
      }
      setIsRequestModalOpen(false);
      setPrincipal(''); setDuration(''); setReason('');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsRequestModalOpen(true)} className="bg-primary hover:bg-primary/95 text-white rounded-lg shadow-sm gap-2">
          <Plus className="size-4" /> Request Loan / Advance
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/50 border-b border-border pb-5">
          <CardTitle className="text-lg font-bold text-foreground">Your Financial Aids</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(!activeLoans.length && !activeAdvances.length) ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No active loans or salary advances.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-muted border-y border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Type</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Total Amount</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Monthly EMI</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Paid Amount</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Outstanding</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...activeLoans.map(l => ({ ...l, _type: 'loan' })), ...activeAdvances.map(a => ({ ...a, _type: 'advance' }))].map((item: any) => (
                    <TableRow key={`${item._type}-${item.id}`} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="px-6 py-4 font-semibold text-foreground">
                        {item._type === 'loan' ? 'Company Loan' : 'Salary Advance'}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-bold text-foreground font-mono">{currencySymbol}{Number(item.principalAmount).toLocaleString()}</TableCell>
                      <TableCell className="px-6 py-4 text-primary font-bold font-mono">{currencySymbol}{Number(item.monthlyRecovery).toLocaleString()}/mo</TableCell>
                      <TableCell className="px-6 py-4 text-emerald-600 font-bold font-mono">{currencySymbol}{Number(item.principalAmount - item.outstandingBalance).toLocaleString()}</TableCell>
                      <TableCell className="px-6 py-4 text-rose-600 font-black font-mono">{currencySymbol}{Number(item.outstandingBalance).toLocaleString()}</TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                          item.status === 'PENDING' ? 'bg-amber-55/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900/40' :
                          item.status === 'REJECTED' ? 'bg-rose-55/60 text-rose-700 border-rose-200/60 dark:bg-rose-950/30 dark:border-rose-900/40' :
                          'bg-emerald-55/60 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-900/40'
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {item.status === 'APPROVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary font-bold hover:bg-primary/10 rounded-lg"
                            onClick={() => {
                              setSelectedItem(item);
                              setItemType(item._type);
                            }}
                          >
                            View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Modal */}
      {selectedItem && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-card rounded-lg shadow-sm max-w-lg w-full overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">Repayment History</h3>
              <button onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-gray-600">
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="bg-muted rounded-lg p-4 mb-4 border border-border flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Total Paid</p>
                <p className="font-black text-emerald-600 text-lg">{currencySymbol}{Number(selectedItem.principalAmount - selectedItem.outstandingBalance).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground uppercase">Remaining</p>
                <p className="font-black text-rose-600 text-lg">{currencySymbol}{Number(selectedItem.outstandingBalance).toLocaleString()}</p>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground italic py-8">No deductions have been made yet.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-card border border-border rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 dark:bg-emerald-950/40 p-2 rounded-full text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <span className="font-bold text-foreground">{formatMonthName(h.month)}</span>
                    </div>
                    <span className="font-black text-foreground font-mono">{currencySymbol}{h.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={() => setSelectedItem(null)} className="w-full bg-muted hover:bg-muted/80 text-foreground py-6 mt-6 rounded-lg font-bold">
              Close
            </Button>
          </div>
        </div>,
        document.body
      )}

      {/* Request Modal */}
      {isRequestModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-card rounded-lg shadow-sm max-w-md w-full overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">Request Financial Aid</h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-muted-foreground hover:text-gray-600">
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Request Type</Label>
                <PayrollSelect value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Company Loan</SelectItem>
                    <SelectItem value="advance">Salary Advance</SelectItem>
                  </SelectContent>
                </PayrollSelect>
              </div>

              <div className="space-y-2">
                <Label>Amount Required ({currencySymbol})</Label>
                <Input type="number" placeholder="e.g. 50000" value={principal} onChange={e => setPrincipal(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Expected Recovery Duration (Months)</Label>
                <Input type="number" placeholder="e.g. 10" value={duration} onChange={e => setDuration(e.target.value)} />
                {principal && duration && Number(duration) > 0 && (
                  <p className="text-xs text-primary font-semibold mt-1">Expected EMI: {currencySymbol}{Math.ceil(Number(principal) / Number(duration)).toLocaleString()}/month</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reason for Request</Label>
                <Textarea placeholder="Briefly explain why you need this advance/loan" value={reason} onChange={e => setReason(e.target.value)} className="resize-none h-24" />
              </div>

              <Button onClick={handleRequestSubmit} disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/95 text-white py-6 mt-4 rounded-lg font-bold">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function EmployeePortal() {
  const { currencySymbol, isTanzania, config, formatCurrencyAbbr } = useCurrency();
  const { user } = useAuth();
  const { employees } = usePayroll();
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<PayslipData | null>(null);
  const [loadingSlips, setLoadingSlips] = useState(true);
  const [portalCtx, setPortalCtx] = useState<PortalCtx | null>(null);

  const fetchPortalData = useCallback(async () => {
    if (!user) return;
    setLoadingSlips(true);
    try {
      const [ctx, rawSlips] = await Promise.all([
        payrollService.getEmployeePortalData(),
        payrollService.getMyPayslips()
      ]);
      setPortalCtx(ctx);
      if (ctx && (ctx as any).employeeDetails) {
        setSelectedEmployee({ ...user, details: (ctx as any).employeeDetails });
      } else {
        const empMatch = employees.find(e => e.id.toString() === user.id.toString());
        if (empMatch) setSelectedEmployee(empMatch);
      }

      if (rawSlips && rawSlips.length > 0) {
        const normalize = (data: any) => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          return Object.entries(data).map(([label, value]) => ({ label, value: Number(value) }));
        };

        const mapped = rawSlips.map((s: any) => ({
          month: s.month,
          gross: parseFloat(s.gross_amount),
          deductions: parseFloat(s.deduction_amount),
          net: parseFloat(s.net_amount),
          earnings: normalize(s.breakdown?.earnings || ctx?.computedPayslip?.earnings),
          deductionDetails: normalize(s.breakdown?.deductions || ctx?.computedPayslip?.deductions),
          employerContributions: normalize(s.breakdown?.employerContributions || ctx?.computedPayslip?.employerContributions),
          attendance: s.breakdown?.attendance || { workingDays: 30, lopDays: 0, paidLeaves: 0 }
        }));
        setPayslips(mapped);
        setSelectedSlip(mapped[0]);
      } else if (ctx?.computedPayslip?.grossSalary > 0) {
        const normalize = (data: any) => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          return Object.entries(data).map(([label, value]) => ({ label, value: Number(value) }));
        };

        const computed: PayslipData = {
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          gross: ctx.computedPayslip.grossSalary,
          deductions: ctx.computedPayslip.totalDeductions,
          net: ctx.computedPayslip.netSalary,
          earnings: normalize(ctx.computedPayslip.earnings),
          deductionDetails: normalize(ctx.computedPayslip.deductions),
          employerContributions: normalize((ctx.computedPayslip as any).employerContributions),
          attendance: { workingDays: 30, lopDays: 0, paidLeaves: 0 }
        };
        setPayslips([computed]);
        setSelectedSlip(computed);
      }
    } catch {
      toast.error('Failed to load payroll data');
    } finally {
      setLoadingSlips(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  useEffect(() => {
    if (user) {
      if (employees && employees.length > 0) {
        const found = employees.find((e: any) => e.id === user.id || e.email === user.email);
        if (found) {
          setSelectedEmployee(found);
          return;
        }
      }

      setSelectedEmployee({
        ...user,
        id: user.id,
        username: (user as any).username || user.email.split('@')[0],
        email: user.email,
        details: (user as any).details || {}
      });
    }
  }, [employees, user]);

  const numberToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const isIndia = config?.code === 'INR';
    
    if (isIndia) {
      const numStr = num.toString();
      if (numStr.length > 9) return 'overflow';
      const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return '';
      let str = '';
      str += (n[1] !== '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
      str += (n[2] !== '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
      str += (n[3] !== '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
      str += (n[4] !== '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
      str += (n[5] !== '00') ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
      return str.trim() + ' Only';
    } else {
      if (num === 0) return 'Zero Only';
      
      const formatHundreds = (n: number): string => {
        let str = '';
        if (n >= 100) {
          str += a[Math.floor(n / 100)] + 'Hundred ';
          n %= 100;
        }
        if (n > 0) {
          if (n < 20) {
            str += a[n];
          } else {
            str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
          }
        }
        return str;
      };
      
      let str = '';
      let temp = num;
      const billions = Math.floor(temp / 1000000000);
      temp %= 1000000000;
      const millions = Math.floor(temp / 1000000);
      temp %= 1000000;
      const thousands = Math.floor(temp / 1000);
      temp %= 1000;
      const remainder = temp;
      
      if (billions > 0) {
        str += formatHundreds(billions) + 'Billion ';
      }
      if (millions > 0) {
        str += formatHundreds(millions) + 'Million ';
      }
      if (thousands > 0) {
        str += formatHundreds(thousands) + 'Thousand ';
      }
      if (remainder > 0) {
        str += formatHundreds(remainder);
      }
      return str.trim() + ' Only';
    }
  };

  const formatMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    if (monthStr.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = monthStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return monthStr;
  };

  const handleDownload = (slip: PayslipData) => {
    try {
      const doc = new jsPDF();

      const borderGray = [226, 232, 240];
      const textDark = [30, 41, 59];
      const textLight = [100, 116, 139];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 138);
      doc.text('ABC ENTERPRISES', 105, 25, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.text(`Salary Slip for ${formatMonthName(slip.month)}`, 105, 33, { align: 'center' });

      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.5);
      doc.line(14, 40, 196, 40);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(14, 48, 182, 28, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      doc.setFont('helvetica', 'bold');
      doc.text('Employee Code:', 18, 56);
      doc.text('Designation:', 18, 64);
      doc.text('Bank Account:', 18, 72);

      doc.setFont('helvetica', 'normal');
      doc.text(selectedEmployee?.details?.employee_id || 'N/A', 55, 56);
      doc.text(selectedEmployee?.details?.role?.role_name || selectedEmployee?.position || selectedEmployee?.role || 'Staff', 55, 64);
      doc.text(selectedEmployee?.details?.account_number || 'N/A', 55, 72);

      doc.setFont('helvetica', 'bold');
      doc.text('Employee Name:', 110, 56);
      doc.text('PF Number:', 110, 64);
      doc.text('Payment Mode:', 110, 72);

      doc.setFont('helvetica', 'normal');
      doc.text(`${selectedEmployee?.details?.first_name || ''} ${selectedEmployee?.details?.last_name || selectedEmployee?.name || ''}`.trim() || 'N/A', 145, 56);
      doc.text(selectedEmployee?.details?.pf_uan || 'N/A', 145, 64);
      doc.text('Bank Transfer', 145, 72);

      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(186, 230, 253);
      doc.roundedRect(14, 82, 182, 28, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216);
      doc.text('Attendance Summary', 18, 88);

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, 93, 174, 12, 1, 1, 'FD');

      doc.setFontSize(8);
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.text('Working Days:', 20, 101);
      doc.text('Days Absent (LOP):', 75, 101);
      doc.text('Paid Leaves:', 135, 101);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216);
      doc.text((slip.attendance?.workingDays || 30).toString(), 60, 101, { align: 'right' });
      doc.text((slip.attendance?.lopDays || 0).toString(), 120, 101, { align: 'right' });
      doc.text((slip.attendance?.paidLeaves || 0).toString(), 185, 101, { align: 'right' });

      let startY = 118;

      doc.setFillColor(220, 252, 231);
      doc.rect(14, startY, 91, 10, 'F');

      doc.setFillColor(254, 226, 226);
      doc.rect(105, startY, 91, 10, 'F');

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.2);
      doc.rect(14, startY, 182, 95);
      doc.line(105, startY, 105, startY + 95);
      doc.line(14, startY + 10, 196, startY + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(21, 128, 61);
      doc.text('EARNINGS', 18, startY + 6.5);

      doc.setTextColor(185, 28, 28);
      doc.text('DEDUCTIONS', 110, startY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      let y = startY + 16;
      const earns = slip.earnings || [];
      const deds = slip.deductionDetails || [];
      const employerContribs = slip.employerContributions || [];

      const maxRows = Math.max(earns.length, deds.length);

      for (let i = 0; i < maxRows; i++) {
        if (i > 0) {
          doc.setDrawColor(241, 245, 249);
          doc.line(14, y - 4, 196, y - 4);
        }

        if (earns[i]) {
          doc.text(earns[i].label, 18, y);
          doc.setFont('helvetica', 'bold');
          doc.text(`${currencySymbol} ${earns[i].value.toLocaleString(config?.locale || 'en-US')}`, 98, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        }
        if (deds[i]) {
          doc.text(deds[i].label, 112, y);
          doc.setFont('helvetica', 'bold');
          doc.text(`${currencySymbol} ${deds[i].value.toLocaleString(config?.locale || 'en-US')}`, 192, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        }
        y += 7.5;
      }

      let totalY = startY + 95;
      doc.setFillColor(248, 250, 252);
      doc.rect(14, totalY, 182, 10, 'FD');
      doc.line(105, totalY, 105, totalY + 10);

      doc.setFont('helvetica', 'bold');
      doc.text('Gross Earnings', 18, totalY + 6.5);
      doc.text(`${currencySymbol} ${slip.gross.toLocaleString(config?.locale || 'en-US')}`, 98, totalY + 6.5, { align: 'right' });

      doc.text('Total Deductions', 112, totalY + 6.5);
      doc.text(`${currencySymbol} ${slip.deductions.toLocaleString(config?.locale || 'en-US')}`, 192, totalY + 6.5, { align: 'right' });

      if (employerContribs.length > 0) {
        let ecY = totalY + 14;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.text('EMPLOYER CONTRIBUTIONS', 18, ecY);
        ecY += 6;
        doc.setFontSize(9);
        for (const ec of employerContribs) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(textDark[0], textDark[1], textDark[2]);
          doc.text(ec.label, 18, ecY);
          doc.setFont('helvetica', 'bold');
          doc.text(`${currencySymbol} ${ec.value.toLocaleString(config?.locale || 'en-US')}`, 98, ecY, { align: 'right' });
          ecY += 6;
        }
        totalY = ecY + 4;
      }

      const netVal = Math.round(slip.net);
      const words = numberToWords(netVal);

      doc.setFillColor(168, 85, 247);
      doc.roundedRect(14, totalY + 16, 182, 24, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Net Salary Payable:', 18, totalY + 24);

      doc.setFontSize(18);
      doc.text(`${currencySymbol} ${slip.net.toLocaleString(config?.locale || 'en-US')}`, 188, totalY + 25, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`In Words: ${words}`, 18, totalY + 32);

      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('This is a computer-generated salary slip.', 14, 280);
      doc.text('Generated by EmpXP Payroll', 14, 284);
      doc.text('Authorized Signatory', 192, 284, { align: 'right' });

      doc.save(`Payslip_${(selectedEmployee?.details?.first_name || 'employee')}_${slip.month.replace(' ', '_')}.pdf`);
      toast.success(`Payslip downloaded successfully!`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  };

  const ytdGross = payslips.reduce((s, p) => s + p.gross, 0);
  const ytdDeductions = payslips.reduce((s, p) => s + p.deductions, 0);
  const ytdNet = payslips.reduce((s, p) => s + p.net, 0);
  const projectedCTC = portalCtx?.baseSalary ? Number(portalCtx.baseSalary) : (selectedEmployee?.baseSalary || 0);

  const formatShort = (val: number) => {
    return formatCurrencyAbbr(val);
  };

  if (!selectedEmployee) {
    return (
      <div className="p-6 -m-6 rounded-lg min-h-screen bg-card">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded-lg w-40 animate-pulse" />
              <div className="h-4 bg-muted rounded-lg w-64 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <SkeletonTable rows={4} />
            </div>
            <div className="space-y-4">
              <div className="bg-muted rounded-xl h-48 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-muted rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left min-h-screen bg-card p-6 -m-6 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center text-primary shrink-0">
            <Receipt className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight text-left">
              My Payroll
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5 text-left">
              Access payslips and submit declarations
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="payslips" className="w-full">
        <TabsList className="mb-6 w-full overflow-x-auto justify-start h-auto flex-nowrap rounded-none bg-transparent border-b border-border pb-0 gap-6 shadow-none p-0">
          <TabsTrigger value="payslips" className="px-1 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-primary-foreground border-b-2 border-transparent data-[state=active]:border-primary after:hidden shadow-none text-muted-foreground hover:text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span>Payslips</span>
          </TabsTrigger>
          {!isTanzania && (
            <TabsTrigger value="declarations" className="px-1 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-primary-foreground border-b-2 border-transparent data-[state=active]:border-primary after:hidden shadow-none text-muted-foreground hover:text-foreground flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              <span>Tax Declarations</span>
            </TabsTrigger>
          )}
          {isTanzania && (
            <TabsTrigger value="statutory" className="px-1 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-primary-foreground border-b-2 border-transparent data-[state=active]:border-primary after:hidden shadow-none text-muted-foreground hover:text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Statutory Details</span>
            </TabsTrigger>
          )}
          {/* HIDDEN — Previous Income (Form 12B) — re-enable when ready
          <TabsTrigger value="form12b" className="px-1 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-primary-foreground border-b-2 border-transparent data-[state=active]:border-primary after:hidden shadow-none text-muted-foreground hover:text-foreground flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Previous Income (Form 12B)</span>
          </TabsTrigger>
          */}
          <TabsTrigger value="loans_advances" className="px-1 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-primary-foreground border-b-2 border-transparent data-[state=active]:border-primary after:hidden shadow-none text-muted-foreground hover:text-foreground">Loans & Advances</TabsTrigger>
          <TabsTrigger value="reimbursements" className="px-1 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-primary-foreground border-b-2 border-transparent data-[state=active]:border-primary after:hidden shadow-none text-muted-foreground hover:text-foreground">Reimbursements</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="space-y-5 mt-2">
          {loadingSlips ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-muted/80 rounded-xl h-24 animate-pulse" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SkeletonTable rows={5} />
                </div>
                <div className="bg-muted/80 rounded-xl h-96 animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'YTD Gross', value: formatShort(ytdGross), icon: DollarSign },
                  { label: 'YTD Deductions', value: formatShort(ytdDeductions), icon: TrendingDown },
                  { label: 'YTD Net', value: formatShort(ytdNet), icon: CheckCircle2 },
                  { label: 'Projected CTC', value: formatShort(projectedCTC), icon: TrendingUp },
                ].map(k => (
                  <div key={k.label} className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <k.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{k.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">{k.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="bg-card border-b border-border px-6 py-5 flex items-center gap-3">
                    <FileText className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xl font-bold text-foreground">Salary Slips</p>
                      <p className="text-sm text-muted-foreground mt-0.5">View and download your monthly payslips</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted border-y border-border">
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">Month</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">Gross</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">Deductions</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">Net</th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-black">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payslips.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-20 text-center">
                              <div className="size-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                                <Receipt className="size-8 text-muted-foreground/30" />
                              </div>
                              <p className="font-bold text-sm text-foreground">No payslips generated yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Your payslips will appear here once processed</p>
                            </td>
                          </tr>
                        )}
                         {payslips.map((slip, i) => (
                          <tr
                            key={i}
                            className="cursor-pointer transition-colors bg-white hover:bg-muted/50 border-b border-border"
                            onClick={() => setSelectedSlip(slip)}
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">{slip.month}</td>
                            <td className="px-6 py-4 text-sm font-medium text-foreground">{currencySymbol}{slip.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-rose-600">{currencySymbol}{slip.deductions.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-bold text-primary">{currencySymbol}{slip.net.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary gap-1.5 rounded-xl"
                                onClick={e => { e.stopPropagation(); handleDownload(slip); }}>
                                <Download className="size-3.5" />Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedSlip ? (
                  <Card className="border-border h-fit sticky top-6 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b border-border">
                      <p className="text-lg font-bold text-foreground">{selectedSlip.month}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Salary breakdown</p>
                    </div>
                    <CardContent className="space-y-5 pt-5 px-6 pb-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Earnings</p>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                          {selectedSlip.earnings.map((item, id) => (
                            <div key={id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">{currencySymbol}{item.value.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2.5 border-t border-emerald-200 dark:border-emerald-800/60 font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                            <span>Gross</span><span>{currencySymbol}{selectedSlip.gross.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Deductions</p>
                        <div className="bg-rose-50/30 dark:bg-rose-950/30 rounded-xl p-4 border border-rose-100 dark:border-rose-900/50 space-y-2">
                          {selectedSlip.deductionDetails.map((item, id) => (
                            <div key={id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">{currencySymbol}{item.value.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2.5 border-t border-rose-200 dark:border-rose-800/60 font-bold text-rose-600 dark:text-rose-400 text-sm">
                            <span>Total</span><span>{currencySymbol}{selectedSlip.deductions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      {selectedSlip.employerContributions && selectedSlip.employerContributions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Employer Contributions</p>
                          <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50 space-y-2">
                            {selectedSlip.employerContributions.map((item, id) => (
                              <div key={id} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{currencySymbol}{item.value.toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-2.5 border-t border-blue-200 dark:border-blue-800/60 font-bold text-blue-600 dark:text-blue-400 text-sm">
                              <span>Total</span><span>{currencySymbol}{selectedSlip.employerContributions.reduce((sum, c) => sum + c.value, 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 text-center border border-primary/10">
                        <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mb-1">Net Salary</p>
                        <p className="text-3xl font-black text-primary">{currencySymbol}{selectedSlip.net.toLocaleString()}</p>
                      </div>
                      <Button className="w-full bg-primary hover:bg-primary/95 py-5 font-bold gap-2 rounded-xl shadow-sm shadow-primary/20" onClick={() => handleDownload(selectedSlip)}>
                        <Download className="size-4" />Download Payslip
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border h-[400px] flex items-center justify-center overflow-hidden">
                    <div className="text-center px-6">
                      <div className="size-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                        <FileText className="size-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Select a payslip</p>
                      <p className="text-xs text-muted-foreground mt-1">Click on any row to view the detailed salary breakdown</p>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {!isTanzania && (
          <TabsContent value="declarations" className="mt-2">
            <TaxDeclarationsTab taxSections={portalCtx?.taxSections || []} savedRegime={(portalCtx as any)?.employeeDetails?.tax_regime} regimeChangedAt={(portalCtx as any)?.employeeDetails?.tax_regime_changed_at} />
          </TabsContent>
        )}

        {isTanzania && (
          <TabsContent value="statutory" className="mt-2">
            <StatutoryDetailsTab employeeDetails={(portalCtx as any)?.employeeDetails} />
          </TabsContent>
        )}

        {/* HIDDEN — Previous Income (Form 12B) — re-enable when ready
        <TabsContent value="form12b" className="mt-2">
          <Form12BTab />
        </TabsContent>
        */}

        <TabsContent value="loans_advances" className="mt-2">
          <LoansAdvancesPortal />
        </TabsContent>

        <TabsContent value="reimbursements" className="mt-2">
          <ReimbursementModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}

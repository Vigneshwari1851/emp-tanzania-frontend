import { useState, useEffect } from 'react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { getPayrollRuns, updatePayrollRun } from '../services/payroll';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/components/ui/card";
import { Button } from "../../../shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/components/ui/table";
import { Badge } from "../../../shared/components/ui/Badge";
import { Download, Search, Trash2, ArrowLeft, Calendar as CalendarIcon, DollarSign, Users, TrendingUp, CheckCircle2, XCircle, Clock, FileText, Eye, Filter, ChevronRight } from 'lucide-react';
import { Input } from "../../../shared/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/components/ui/Tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/payroll-lib/select";
import { toast } from 'sonner';
import { PayrollCalculation } from './PayrollCalculation';
import { jsPDF } from 'jspdf';
import axiosInstance from '../../../shared/services/axiosInstance';
import { Dialog } from '../../../shared/components/ui/dialog';
import { PageHeader } from '@/shared/components/ui/PageHeader';

export function PayrollRuns() {
  const { currencySymbol, formatCurrency, formatCurrencyAbbr } = useCurrency();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRunMonth, setSelectedRunMonth] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [previewRun, setPreviewRun] = useState<any>(null);

  const APPROVAL_PIPELINE = ['DRAFT', 'HR_REVIEW', 'FINANCE_APPROVED', 'PAID'];
  const STATUS_LABELS: Record<string, string> = {
    'DRAFT': 'Draft',
    'HR_REVIEW': 'HR Review',
    'FINANCE_APPROVED': 'Finance Approved',
    'PAID': 'Paid',
    'REJECTED': 'Rejected',
    'PROCESSED': 'Processed',
    'APPROVED': 'Approved',
    'PENDING': 'Pending'
  };

  const DEFAULT_STATUS_STYLE = {
    bg: 'bg-primary/10 dark:bg-primary/20',
    text: 'text-primary dark:text-primary',
    border: 'border-primary/20 dark:border-primary/40',
    dot: 'bg-primary',
    pill: 'bg-primary/20 text-primary font-bold'
  };

  const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; pill: string }> = {
    'PAID': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', pill: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' },
    'FINANCE_APPROVED': DEFAULT_STATUS_STYLE,
    'HR_REVIEW': DEFAULT_STATUS_STYLE,
    'DRAFT': { bg: 'bg-muted dark:bg-muted/40', text: 'text-foreground', border: 'border-border', dot: 'bg-slate-400', pill: 'bg-muted-foreground/10 text-foreground font-bold' },
    'REJECTED': { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500', pill: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300' },
    'APPROVED': DEFAULT_STATUS_STYLE,
    'PROCESSED': DEFAULT_STATUS_STYLE,
    'PENDING': DEFAULT_STATUS_STYLE,
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status?.toUpperCase()] || STATUS_COLORS['DRAFT'];
  };

  const advanceStatus = async (run: any) => {
    const currentStatus = run.status?.toUpperCase() || 'DRAFT';
    const currentIdx = APPROVAL_PIPELINE.indexOf(currentStatus);
    if (currentIdx === -1 || currentIdx >= APPROVAL_PIPELINE.length - 1) return;
    const nextStatus = APPROVAL_PIPELINE[currentIdx + 1];
    setUpdatingId(run.id);
    try {
      await updatePayrollRun(run.id, { status: nextStatus });
      toast.success(`Payslip for ${run.user?.details?.first_name} moved to "${STATUS_LABELS[nextStatus]}"`);
      await fetchRuns();
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectRun = async (run: any) => {
    if (!window.confirm('Reject this payslip? It will be sent back to Draft status.')) return;
    setUpdatingId(run.id);
    try {
      await updatePayrollRun(run.id, { status: 'DRAFT' });
      toast.success('Payslip sent back to Draft for review');
      await fetchRuns();
    } catch (e) {
      toast.error('Failed to reject payslip');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const data = await getPayrollRuns();
      setRuns(data);
    } catch (error) {
      console.error("Failed to fetch payroll runs", error);
    } finally {
      setLoading(false);
    }
  };

  const numberToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
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
  };

  const generatePDF = (run: any) => {
    const doc = new jsPDF();
    const employee = run.user?.details || {};
    const breakdown = run.breakdown || {};

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
    doc.text(`Salary Slip for ${run.month}`, 105, 33, { align: 'center' });

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
    doc.text(employee.employee_id || 'N/A', 55, 56);
    doc.text(employee.role?.role_name || 'Staff', 55, 64);
    doc.text(employee.account_number || 'N/A', 55, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('Employee Name:', 110, 56);
    doc.text('PF Number:', 110, 64);
    doc.text('Payment Mode:', 110, 72);

    doc.setFont('helvetica', 'normal');
    doc.text(`${employee.first_name} ${employee.last_name}`, 145, 56);
    doc.text(employee.uan_number || 'N/A', 145, 64);
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
    doc.text(`${run.working_days || '30'}`, 60, 101, { align: 'right' });
    doc.text(`${breakdown.lopDays || '0'}`, 120, 101, { align: 'right' });
    doc.text('0', 185, 101, { align: 'right' });

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
    const earnings = breakdown.earnings || {};
    const deds = breakdown.deductions || {};

    const earnKeys = Object.keys(earnings);
    const dedKeys = Object.keys(deds);
    if (breakdown.lopDeductionAmount > 0) dedKeys.push('Loss of Pay (LOP)');

    const maxRows = Math.max(earnKeys.length, dedKeys.length);

    for (let i = 0; i < maxRows; i++) {
      if (i > 0) {
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y - 4, 196, y - 4);
      }

      if (earnKeys[i]) {
        doc.text(earnKeys[i], 18, y);
        const amt = earnings[earnKeys[i]] || 0;
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs. ${amt.toLocaleString('en-IN')}`, 98, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      }
      if (dedKeys[i]) {
        if (dedKeys[i] === 'Loss of Pay (LOP)') {
          doc.text(`LOP (${breakdown.lopDays} Days)`, 112, y);
          doc.setFont('helvetica', 'bold');
          doc.text(`Rs. ${breakdown.lopDeductionAmount.toLocaleString('en-IN')}`, 192, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        } else {
          doc.text(dedKeys[i], 112, y);
          const amt = deds[dedKeys[i]] || 0;
          doc.setFont('helvetica', 'bold');
          doc.text(`Rs. ${amt.toLocaleString('en-IN')}`, 192, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        }
      }
      y += 7.5;
    }

    let totalY = startY + 95;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, totalY, 182, 10, 'FD');
    doc.line(105, totalY, 105, totalY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Gross Earnings', 18, totalY + 6.5);
    doc.text(`Rs. ${parseFloat(run.gross_amount).toLocaleString('en-IN')}`, 98, totalY + 6.5, { align: 'right' });

    doc.text('Total Deductions', 112, totalY + 6.5);
    doc.text(`Rs. ${parseFloat(run.deduction_amount).toLocaleString('en-IN')}`, 192, totalY + 6.5, { align: 'right' });

    const netVal = Math.round(parseFloat(run.net_amount));
    const words = numberToWords(netVal);

    doc.setFillColor(168, 85, 247);
    doc.roundedRect(14, totalY + 16, 182, 24, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Salary Payable:', 18, totalY + 24);

    doc.setFontSize(18);
    doc.text(`Rs. ${parseFloat(run.net_amount).toLocaleString('en-IN')}`, 188, totalY + 25, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`In Words: ${words}`, 18, totalY + 32);

    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated salary slip.', 14, 280);
    doc.text('Generated by EmpXP Payroll', 14, 284);

    doc.text('Authorized Signatory', 192, 284, { align: 'right' });

    doc.save(`Payslip_${employee.first_name}_${run.month.replace(' ', '_')}.pdf`);
    toast.success('Payslip downloaded successfully!');
  };

  const groupedMonths = runs.reduce((acc: { [key: string]: any }, run) => {
    const month = run.month;
    if (!acc[month]) {
      acc[month] = {
        month,
        employees: 0,
        gross: 0,
        deductions: 0,
        net: 0,
        status: 'PAID',
        rawRuns: []
      };
    }
    acc[month].employees += 1;
    acc[month].gross += parseFloat(run.gross_amount) || 0;
    acc[month].deductions += parseFloat(run.deduction_amount) || 0;
    acc[month].net += parseFloat(run.net_amount) || 0;
    acc[month].rawRuns.push(run);

    if (run.status?.toLowerCase() !== 'paid') {
      acc[month].status = 'PROCESSING';
    }
    return acc;
  }, {});

  const groupedMonthsList = Object.values(groupedMonths).sort((a: any, b: any) => {
    return b.month.localeCompare(a.month);
  });

  const monthlyRuns = selectedRunMonth
    ? runs.filter(run => run.month === selectedRunMonth)
    : [];

  const filteredRuns = monthlyRuns.filter(run => {
    const fullName = `${run.user?.details?.first_name} ${run.user?.details?.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || run.status?.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalStatusCounts: Record<string, number> = {};
  runs.forEach(run => {
    const status = run.status?.toUpperCase() || 'DRAFT';
    totalStatusCounts[status] = (totalStatusCounts[status] || 0) + 1;
  });

  if (selectedRunMonth === null) {
    const totalGrossYTD = runs.reduce((sum, run) => sum + (parseFloat(run.gross_amount) || 0), 0);
    const totalNetYTD = runs.reduce((sum, run) => sum + (parseFloat(run.net_amount) || 0), 0);
    const uniqueMonths = Array.from(new Set(runs.map(run => run.month)));
    const avgMonthlyNet = uniqueMonths.length > 0 ? totalNetYTD / uniqueMonths.length : 0;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <PageHeader
          title="Payroll Run History"
          description="Review historical payout cycles and month-by-month aggregated breakdowns"
          icon={<Clock className="size-8" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <DollarSign className="w-5 h-5 text-primary shrink-0" />
            </div>
            <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrencyAbbr(totalGrossYTD)}
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                YTD Gross Spending
              </span>
            </div>
          </div>

          <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <DollarSign className="w-5 h-5 text-primary shrink-0" />
            </div>
            <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrencyAbbr(totalNetYTD)}
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                YTD Net Take-home
              </span>
            </div>
          </div>

          <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <CalendarIcon className="w-5 h-5 text-primary shrink-0" />
            </div>
            <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {uniqueMonths.length}
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                Processed Cycles
              </span>
            </div>
          </div>

          <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Users className="w-5 h-5 text-primary shrink-0" />
            </div>
            <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrencyAbbr(avgMonthlyNet)}
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                Avg Monthly Payout
              </span>
            </div>
          </div>
        </div>

        <Card className="rounded shadow-sm border border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px] border-collapse">
                <TableHeader className="bg-muted border-y border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 pr-4 py-4 text-left text-sm font-semibold text-muted-foreground">Period</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Processed Employees</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Gross Salary</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Deductions</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Net Outflow</TableHead>
                    <TableHead className="pr-6 pl-4 py-4 text-right text-sm font-semibold text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={`skeleton-${i}`} className="border-b border-border/50">
                        <TableCell className="pl-6 py-5">
                          <div className="h-4 bg-gradient-to-r from-muted via-muted/60 to-muted rounded animate-pulse w-24" style={{ animationDelay: `${i * 120}ms` }} />
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="h-5 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-full animate-pulse w-20" style={{ animationDelay: `${i * 120 + 60}ms` }} />
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="h-4 bg-gradient-to-r from-muted via-muted/60 to-muted rounded animate-pulse w-28" style={{ animationDelay: `${i * 120 + 120}ms` }} />
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="h-4 bg-gradient-to-r from-muted via-muted/60 to-muted rounded animate-pulse w-28" style={{ animationDelay: `${i * 120 + 180}ms` }} />
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="h-4 bg-gradient-to-r from-muted via-muted/60 to-muted rounded animate-pulse w-28" style={{ animationDelay: `${i * 120 + 240}ms` }} />
                        </TableCell>
                        <TableCell className="text-right pr-6 py-5">
                          <div className="h-5 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-full animate-pulse w-16 ml-auto" style={{ animationDelay: `${i * 120 + 300}ms` }} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : groupedMonthsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-4 bg-muted/40 rounded-2xl">
                            <FileText className="size-10 text-muted-foreground/40" />
                          </div>
                          <div>
                            <p className="text-muted-foreground font-bold text-sm">No payroll cycles processed yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Processed payroll runs will appear here once generated.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : groupedMonthsList.map((monthData: any, idx) => (
                    <TableRow
                      key={monthData.month}
                      className="hover:bg-muted/40 even:bg-muted/10 group transition-all duration-150 border-b border-border/50 cursor-pointer"
                      onClick={() => {
                        setSelectedRunMonth(monthData.month);
                        setSearchTerm('');
                        setStatusFilter('ALL');
                      }}
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <CalendarIcon className="size-3.5 text-primary" />
                          </div>
                          <span className="font-bold text-foreground text-sm tracking-tight">{monthData.month}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="bg-muted/50 text-slate-600 dark:text-slate-400 font-semibold px-2.5 py-0.5 border-border">
                            {monthData.employees}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {currencySymbol}{monthData.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4 font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                        {currencySymbol}{monthData.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4 font-mono font-extrabold text-primary text-[14px]">
                        {currencySymbol}{monthData.net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <Badge
                          className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase gap-1.5 ${monthData.status === 'PAID'
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          variant="outline"
                        >
                          <span className={`size-1.5 rounded-full ${monthData.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {monthData.status === 'PAID' ? 'PAID' : 'PROCESSING'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedMonthGross = monthlyRuns.reduce((sum, run) => sum + (parseFloat(run.gross_amount) || 0), 0);
  const selectedMonthDeductions = monthlyRuns.reduce((sum, run) => sum + (parseFloat(run.deduction_amount) || 0), 0);
  const selectedMonthNet = monthlyRuns.reduce((sum, run) => sum + (parseFloat(run.net_amount) || 0), 0);

  const statusCounts: Record<string, number> = {};
  monthlyRuns.forEach(run => {
    const status = run.status?.toUpperCase() || 'DRAFT';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => { setSelectedRunMonth(null); setStatusFilter('ALL'); setSearchTerm(''); }}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-primary hover:text-primary-800 dark:text-primary transition-colors mb-2 tracking-widest"
          >
            <ArrowLeft className="size-4" /> Back to Run History
          </button>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Payroll Runs for {selectedRunMonth}</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Review, approve or reject individual payslips before final bank disbursal</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 gap-2 font-bold text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white text-xs rounded-lg shadow-sm"
            onClick={async () => {
              const toastId = toast.loading('Generating and downloading PF ECR...');
              try {
                const response = await axiosInstance.get(`/payroll/reports/pf-ecr`, {
                  params: { month: selectedRunMonth },
                  responseType: 'blob'
                });

                const blob = new Blob([response.data], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `PF_ECR_${selectedRunMonth}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.dismiss(toastId);
                toast.success('PF ECR downloaded successfully!');
              } catch (err) {
                toast.dismiss(toastId);
                console.error("Failed to download ECR file", err);
                toast.error('Failed to download PF ECR file. Make sure payroll is processed for this month.');
              }
            }}
          >
            <FileText className="size-4" /> Download PF ECR
          </Button>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder="Search employee name..."
              className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
            <SelectTrigger className="h-10 w-44 rounded-lg bg-card border-border text-xs font-semibold">
              <Filter className="size-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {APPROVAL_PIPELINE.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-0 bg-card border border-border rounded-xl px-5 py-3 w-fit shadow-sm">
        {APPROVAL_PIPELINE.map((s, i) => {
          const count = statusCounts[s] || 0;
          const isActive = count > 0;
          return (
            <div key={s} className="flex items-center">
              <span className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border transition-all duration-200 ${isActive
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-sm font-extrabold'
                  : 'bg-muted/30 text-muted-foreground border-border/60 font-semibold'
                }`}>
                {isActive ? <CheckCircle2 className="size-3.5 text-primary" /> : <Clock className="size-3.5 text-muted-foreground/60" />}
                <span className="text-xs">{STATUS_LABELS[s]}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {count}
                </span>
              </span>
              {i < APPROVAL_PIPELINE.length - 1 && (
                <div className="flex items-center mx-1.5">
                  <div className="w-5 h-px bg-border" />
                  <ChevronRight className="size-3 text-muted-foreground/40 -ml-0.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <DollarSign className="w-5 h-5 text-primary shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-primary tabular-nums">
            {currencySymbol}{selectedMonthNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Monthly Net Outflow
            </span>
          </div>
        </div>

        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {currencySymbol}{selectedMonthGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Monthly Gross
            </span>
          </div>
        </div>

        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <XCircle className="w-5 h-5 text-primary shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-rose-500 dark:text-rose-400 tabular-nums">
            {currencySymbol}{selectedMonthDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Monthly Deductions
            </span>
          </div>
        </div>

        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-primary shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {monthlyRuns.length}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Processed Staff
            </span>
          </div>
        </div>
      </div>

      <Card className="rounded shadow-sm border border-border">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Processed Employee Payslips</CardTitle>
              <CardDescription className="text-xs">Detailed individual processed salary runs for the period {selectedRunMonth}</CardDescription>
            </div>
            <Badge variant="outline" className="bg-muted/50 text-slate-600 dark:text-slate-400 font-semibold px-3 py-1 border-border text-xs">
              {filteredRuns.length} of {monthlyRuns.length} shown
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px] border-collapse">
              <TableHeader className="bg-muted border-y border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 pr-4 py-4 text-left text-sm font-semibold text-muted-foreground">Employee</TableHead>
                  <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Gross</TableHead>
                  <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Deductions</TableHead>
                  <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Net Pay</TableHead>
                  <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="pr-6 pl-4 py-4 text-right text-sm font-semibold text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-muted/40 rounded-2xl">
                          <Search className="size-10 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="text-muted-foreground font-bold text-sm">
                            {searchTerm || statusFilter !== 'ALL' ? 'No matching payslip records found' : 'No payslip records for this month'}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {searchTerm || statusFilter !== 'ALL' ? 'Try adjusting your search or filter criteria.' : 'Payslips will appear here once processed.'}
                          </p>
                        </div>
                        {(searchTerm || statusFilter !== 'ALL') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-bold text-primary gap-1.5"
                            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRuns.map((run, idx) => {
                  const sc = getStatusColor(run.status?.toUpperCase());
                  return (
                    <TableRow key={run.id} className="hover:bg-muted/30 even:bg-muted/10 transition-all duration-150 border-b border-border/50 group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 text-xs font-bold text-primary">
                            {run.user?.details?.first_name?.[0]}{run.user?.details?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">
                              {run.user?.details?.first_name} {run.user?.details?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-semibold">{run.user?.details?.employee_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {currencySymbol}{parseFloat(run.gross_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4 font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                        {currencySymbol}{parseFloat(run.deduction_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4 font-mono font-extrabold text-primary text-[14px]">
                        {currencySymbol}{parseFloat(run.net_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4">
                        <Select
                          value={run.status?.toUpperCase() || 'DRAFT'}
                          onValueChange={async (newStatus) => {
                            setUpdatingId(run.id);
                            try {
                              await updatePayrollRun(run.id, { status: newStatus });
                              toast.success(`Status updated to ${STATUS_LABELS[newStatus] || newStatus}`);
                              await fetchRuns();
                            } catch (e) {
                              toast.error('Failed to update status');
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                        >
                          <SelectTrigger className={`h-7 px-3 rounded-full text-[10px] font-extrabold tracking-wider uppercase border gap-1.5 w-auto cursor-pointer focus:ring-0 shadow-none ${sc.bg} ${sc.text} ${sc.border}`}>
                            <span className={`size-1.5 rounded-full ${sc.dot}`} />
                            <SelectValue>{STATUS_LABELS[run.status?.toUpperCase()] || run.status}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key} className="text-xs font-bold">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {run.status?.toUpperCase() !== 'PAID' && run.status?.toUpperCase() !== 'REJECTED' && (
                            <Button
                              size="sm"
                              disabled={updatingId === run.id}
                              onClick={() => advanceStatus(run)}
                              className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1.5 shadow-sm transition-all"
                            >
                              <CheckCircle2 className="size-3.5" />
                              {updatingId === run.id ? 'Saving...' :
                                run.status?.toUpperCase() === 'DRAFT' ? 'Send to HR' :
                                  run.status?.toUpperCase() === 'HR_REVIEW' ? 'Finance Approve' :
                                    run.status?.toUpperCase() === 'FINANCE_APPROVED' ? 'Mark Paid' : 'Advance'
                              }
                            </Button>
                          )}
                          {run.status?.toUpperCase() === 'PAID' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === run.id}
                              onClick={async () => {
                                setUpdatingId(run.id);
                                try {
                                  await updatePayrollRun(run.id, { status: 'DRAFT' });
                                  toast.success('Status reset to Draft');
                                  await fetchRuns();
                                } catch (e) {
                                  toast.error('Failed to reset status');
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                              className="h-8 px-3 text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg gap-1.5 transition-all"
                            >
                              <Clock className="size-3.5" /> Re-open Draft
                            </Button>
                          )}
                          {run.status?.toUpperCase() !== 'DRAFT' && run.status?.toUpperCase() !== 'REJECTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === run.id}
                              onClick={() => rejectRun(run)}
                              className="h-8 px-3 text-xs font-bold border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 rounded-lg gap-1.5 transition-all"
                            >
                              <XCircle className="size-3.5" /> Reject
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            onClick={() => setPreviewRun(run)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 rounded-lg border-blue-200 dark:border-blue-800 text-primary hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 font-bold text-xs gap-1.5 transition-all"
                            onClick={() => generatePDF(run)}
                          >
                            <Download className="size-3.5" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog isOpen={!!previewRun} onClose={() => setPreviewRun(null)} title="Payslip Preview" maxWidth="max-w-2xl">
          {previewRun && (
            <p className="text-sm text-muted-foreground -mt-3 mb-4">
              {previewRun.month} — {previewRun.user?.details?.first_name} {previewRun.user?.details?.last_name}
            </p>
          )}
          {previewRun && (() => {
            const emp = previewRun.user?.details || {};
            const bd = previewRun.breakdown || {};
            const earns = bd.earnings || {};
            const deds = bd.deductions || {};
            const sc = getStatusColor(previewRun.status?.toUpperCase());
            return (
              <div className="space-y-5 pt-2">
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10 rounded-xl p-5 text-center">
                  <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Payslip</p>
                  <p className="text-xl font-extrabold text-primary mt-1">{previewRun.month}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm bg-muted/30 rounded-xl p-4 border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Employee Name</p>
                    <p className="font-bold text-foreground mt-0.5">{emp.first_name} {emp.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Employee ID</p>
                    <p className="font-bold text-foreground mt-0.5">{emp.employee_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Designation</p>
                    <p className="font-bold text-foreground mt-0.5">{emp.role?.role_name || 'Staff'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Mode</p>
                    <p className="font-bold text-foreground mt-0.5">Bank Transfer</p>
                  </div>
                  {emp.account_number && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bank Account</p>
                      <p className="font-bold text-foreground mt-0.5">{emp.account_number}</p>
                    </div>
                  )}
                  {emp.uan_number && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PF / UAN</p>
                      <p className="font-bold text-foreground mt-0.5">{emp.uan_number}</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-primaryuppercase tracking-widest mb-3">Attendance Summary</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/80 dark:bg-card rounded-lg p-2.5 text-center border border-blue-100 dark:border-blue-900">
                      <p className="text-[10px] text-muted-foreground font-medium">Working Days</p>
                      <p className="text-sm font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">{previewRun.working_days || '30'}</p>
                    </div>
                    <div className="bg-white/80 dark:bg-card rounded-lg p-2.5 text-center border border-blue-100 dark:border-blue-900">
                      <p className="text-[10px] text-muted-foreground font-medium">Days Absent (LOP)</p>
                      <p className="text-sm font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">{bd.lopDays || '0'}</p>
                    </div>
                    <div className="bg-white/80 dark:bg-card rounded-lg p-2.5 text-center border border-blue-100 dark:border-blue-900">
                      <p className="text-[10px] text-muted-foreground font-medium">Paid Leaves</p>
                      <p className="text-sm font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">0</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">Earnings</p>
                    <div className="space-y-2">
                      {Object.entries(earns).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium">{key}</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{currencySymbol}{Number(val).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      {Object.keys(earns).length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No earnings data</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/60 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-3">Deductions</p>
                    <div className="space-y-2">
                      {Object.entries(deds).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium">{key}</span>
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{currencySymbol}{Number(val).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      {bd.lopDeductionAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium">LOP ({bd.lopDays} days)</span>
                          <span className="font-mono font-bold text-rose-700">{currencySymbol}{bd.lopDeductionAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {Object.keys(deds).length === 0 && bd.lopDeductionAmount <= 0 && (
                        <p className="text-xs text-muted-foreground italic">No deductions</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between px-1">
                    <span className="text-muted-foreground font-bold">Gross Earnings</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{currencySymbol}{parseFloat(previewRun.gross_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-muted-foreground font-bold">Total Deductions</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{currencySymbol}{parseFloat(previewRun.deduction_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl p-5 shadow-lg shadow-primary/20">
                  <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Net Salary Payable</p>
                  <p className="text-3xl font-black font-mono mt-1">{currencySymbol}{parseFloat(previewRun.net_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs font-medium opacity-60 mt-1 italic">In Words: {numberToWords(Math.round(parseFloat(previewRun.net_amount)))}</p>
                </div>

                <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 border border-border/50">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                  <Badge
                    className={`rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase border gap-1.5 ${sc.bg} ${sc.text} ${sc.border}`}
                    variant="outline"
                  >
                    <span className={`size-1.5 rounded-full ${sc.dot}`} />
                    {STATUS_LABELS[previewRun.status?.toUpperCase()] || previewRun.status}
                  </Badge>
                </div>
              </div>
            );
          })()}
      </Dialog>
    </div>
  );
}

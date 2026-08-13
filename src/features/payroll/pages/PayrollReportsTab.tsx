import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/payroll-lib/table';
import { Select as PayrollSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { FileText, FileCheck, Landmark, Building2, Users, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/shared/services/axiosInstance';

interface Props {
  payrollGroups: any[];
  salaryStructures: any[];
  employees: any[];
  currencySymbol: string;
}

export function PayrollReportsTab({ payrollGroups, salaryStructures, employees, currencySymbol }: Props) {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportFy, setReportFy] = useState('2025-26');
  const [reportForm16UserId, setReportForm16UserId] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportForm16Data, setReportForm16Data] = useState<any>(null);

  const formatMonth = (ym: string) => {
    const [year, month] = ym.split('-');
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const downloadBlob = (data: any, filename: string, mime: string) => {
    const blob = new Blob([data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePayRegister = async () => {
    setReportLoading(true);
    try {
      const monthStr = formatMonth(reportMonth);
      const res = await axiosInstance.get('/payroll/reports/payroll-register', { params: { month: monthStr }, responseType: 'blob' });
      downloadBlob(res.data, `Payroll_Register_${reportMonth}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      toast.success('Pay Register downloaded');
    } catch { toast.error('Failed to generate Pay Register'); }
    setReportLoading(false);
  };

  const handleBankAdvice = async () => {
    setReportLoading(true);
    try {
      const monthStr = formatMonth(reportMonth);
      const res = await axiosInstance.get('/payroll/reports/bank-disbursement', { params: { month: monthStr }, responseType: 'blob' });
      downloadBlob(res.data, `Bank_Advice_${reportMonth}.csv`, 'text/csv');
      toast.success('Bank Advice downloaded');
    } catch { toast.error('Failed to generate Bank Advice'); }
    setReportLoading(false);
  };

  const handlePFECR = async () => {
    setReportLoading(true);
    try {
      const monthStr = formatMonth(reportMonth);
      const res = await axiosInstance.get('/payroll/reports/pf-ecr', { params: { month: monthStr }, responseType: 'blob' });
      downloadBlob(res.data, `PF_ECR_${reportMonth}.txt`, 'text/plain');
      toast.success('PF ECR downloaded');
    } catch { toast.error('Failed to generate PF ECR'); }
    setReportLoading(false);
  };

  const handleForm16 = async () => {
    if (!reportForm16UserId) return toast.error('Select an employee');
    setReportLoading(true);
    try {
      const res = await axiosInstance.get('/payroll/reports/form-16', { params: { userId: reportForm16UserId, financialYear: reportFy } });
      setReportForm16Data(res.data?.data || res.data);
      toast.success('Form 16 data loaded');
    } catch { toast.error('Failed to fetch Form 16 data'); }
    setReportLoading(false);
  };

  const handleCustomExport = async () => {
    setReportLoading(true);
    try {
      const monthStr = formatMonth(reportMonth);
      const res = await axiosInstance.get('/payroll/reports/payroll-register', { params: { month: monthStr }, responseType: 'blob' });
      downloadBlob(res.data, `Payroll_Export_${reportMonth}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      toast.success('Export downloaded');
    } catch { toast.error('Failed to export data'); }
    setReportLoading(false);
  };

  const reports = [
    { id: 'pay-register', label: 'Pay Register', desc: 'Complete salary register for a pay period', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', action: handlePayRegister, format: 'Excel (.xlsx)' },
    { id: 'bank-advice', label: 'Bank Advice', desc: 'NEFT/RTGS file for salary transfers', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50', action: handleBankAdvice, format: 'CSV (.csv)' },
    { id: 'pf-ecr', label: 'PF ECR', desc: 'EPF Electronic Challan Return file', icon: Landmark, color: 'text-violet-600', bg: 'bg-violet-50', action: handlePFECR, format: 'Text (.txt)' },
    { id: 'form16', label: 'Form 16 / 12BA', desc: 'Annual tax deduction certificates', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', action: handleForm16, format: 'JSON (view)' },
    { id: 'headcount', label: 'Headcount Report', desc: 'Employee count by department and group', icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', action: null, format: '—' },
    { id: 'custom-export', label: 'Custom Export', desc: 'Download payroll data as spreadsheet', icon: Download, color: 'text-cyan-600', bg: 'bg-cyan-50', action: handleCustomExport, format: 'Excel (.xlsx)' },
  ];

  const selectedReport = reports.find(r => r.id === activeReport);

  return (
    <>
      <Card className="bg-card shadow-md border-border">
        <CardHeader className="text-left border-b bg-gradient-to-r from-card to-primary/5 py-4">
          <CardTitle className="text-lg font-bold">Reports & Exports</CardTitle>
          <CardDescription>Generate payroll reports and export data for accounting or compliance</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <Card
                key={r.id}
                className={`border transition-all cursor-pointer group ${activeReport === r.id ? 'border-primary/40 shadow-md ring-1 ring-primary/10' : 'border-border/50 hover:border-primary/30 hover:shadow-md'}`}
                onClick={() => { setActiveReport(activeReport === r.id ? null : r.id); setReportForm16Data(null); }}
              >
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg w-fit ${r.bg} group-hover:scale-110 transition-transform`}>
                      <r.icon className={`size-5 ${r.color}`} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">{r.format}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeReport && activeReport !== 'headcount' && (
        <Card className="bg-card shadow-md border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Pay Period</Label>
                <Input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="max-w-[200px]" />
              </div>
              {activeReport === 'form16' && (
                <>
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Employee</Label>
                    <PayrollSelect value={reportForm16UserId} onValueChange={setReportForm16UserId}>
                      <SelectTrigger className="max-w-[260px]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {(employees || []).filter((e: any) => e.status === 'active').map((emp: any) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.name || emp.employeeCode || `Emp #${emp.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </PayrollSelect>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Financial Year</Label>
                    <PayrollSelect value={reportFy} onValueChange={setReportFy}>
                      <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-25">2024-25</SelectItem>
                        <SelectItem value="2025-26">2025-26</SelectItem>
                        <SelectItem value="2026-27">2026-27</SelectItem>
                      </SelectContent>
                    </PayrollSelect>
                  </div>
                </>
              )}
              <Button onClick={selectedReport?.action || (() => {})} disabled={reportLoading} className="bg-primary hover:bg-primary/95 h-11 px-6 font-bold gap-2">
                {reportLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeReport === 'headcount' && (
        <Card className="bg-card shadow-md border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Headcount breakdown shows employee distribution across payroll groups, departments, and locations.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Employees</p>
                <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{payrollGroups.reduce((acc: number, g: any) => acc + (g.employeeCount || 0), 0)}</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Active Groups</p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{payrollGroups.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Salary Structures</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{salaryStructures.length}</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Group Name</TableHead>
                    <TableHead className="font-bold">Employees</TableHead>
                    <TableHead className="font-bold">Structure</TableHead>
                    <TableHead className="font-bold">Payment Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollGroups.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No payroll groups configured</TableCell></TableRow>
                  ) : payrollGroups.map((g: any) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-semibold">{g.name}</TableCell>
                      <TableCell>{g.employeeCount || 0}</TableCell>
                      <TableCell>{salaryStructures.find((s: any) => s.id === g.salaryStructureId)?.name || '—'}</TableCell>
                      <TableCell>{g.paymentCategory || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeReport === 'form16' && reportForm16Data?.ytdTotals && (
        <Card className="bg-card shadow-md border-border">
          <CardHeader className="text-left border-b bg-emerald-50 py-3">
            <CardTitle className="text-sm font-bold text-emerald-700">Form 16 Data — FY {reportForm16Data.financialYear}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Gross Salary', value: reportForm16Data.ytdTotals.grossSalary, color: 'text-foreground' },
                { label: 'Standard Deduction', value: reportForm16Data.ytdTotals.standardDeduction, color: 'text-muted-foreground' },
                { label: 'Chapter VI-A', value: reportForm16Data.ytdTotals.chapterVIADeductions, color: 'text-muted-foreground' },
                { label: 'Net Taxable', value: reportForm16Data.ytdTotals.netTaxableIncome, color: 'text-primary' },
                { label: 'PF Deducted', value: reportForm16Data.ytdTotals.providentFund, color: 'text-muted-foreground' },
                { label: 'Prof. Tax', value: reportForm16Data.ytdTotals.professionalTax, color: 'text-muted-foreground' },
                { label: 'TDS Deducted', value: reportForm16Data.ytdTotals.taxDeductedAtSource, color: 'text-rose-600' },
                { label: 'Ch. VI-A Items', value: reportForm16Data.declarations.length, color: 'text-muted-foreground' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className={`text-lg font-black mt-1 ${item.color}`}>{currencySymbol}{Number(item.value).toLocaleString()}</p>
                </div>
              ))}
            </div>
            {reportForm16Data.declarations.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Chapter VI-A Declarations</p>
                <Table>
                  <TableHeader><TableRow><TableHead className="font-bold">Section</TableHead><TableHead className="font-bold text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {reportForm16Data.declarations.map((d: any, i: number) => (
                      <TableRow key={i}><TableCell>{d.section}</TableCell><TableCell className="text-right font-bold">{currencySymbol}{Number(d.amount).toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

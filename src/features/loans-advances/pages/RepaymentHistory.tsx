import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/payroll-lib/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/payroll-lib/table';
import {
  Sparkles, Banknote, TrendingUp, ArrowLeft, CalendarClock,
  CalendarRange, HandCoins, Wallet, PieChart, FileText, Layers, ArrowRight
} from 'lucide-react';
import * as loanConfig from '../services/loan-config';
import * as loansAdvancesService from '../services/loans-advances';
import { getStatusLabel, getStatusColor } from '../components/ApprovalTimeline';

const monthKey = (date: Date | string) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const buildEstimatedSchedule = (rec: any, kind: 'loan' | 'advance') => {
  const principal = Number(rec.principalAmount) || 0;
  const emi = Number(rec.monthlyRecovery) || 0;
  if (!principal || !emi) return [];
  const months = Math.max(1, Math.ceil(principal / emi));
  const ref = new Date(rec.disbursed_at || rec.finance_approved_at || rec.manager_approved_at || rec.created_at || new Date());
  const start = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  let paid = Math.max(0, principal - Number(rec.outstandingBalance || 0));
  let remaining = principal;
  const rows: any[] = [];
  for (let i = 1; i <= months; i++) {
    const amount = Math.min(emi, remaining);
    const due = new Date(start.getFullYear(), start.getMonth() + i - 1, 1);
    const installmentPaid = Math.min(paid, amount);
    paid -= installmentPaid;
    remaining -= amount;
    rows.push({
      installmentNo: i,
      dueDate: due,
      amount,
      principalPortion: amount,
      interestPortion: 0,
      paidAmount: installmentPaid,
      status: installmentPaid >= amount ? 'PAID' : (installmentPaid > 0 ? 'PARTIAL' : 'PENDING'),
      isEstimated: true,
    });
    if (remaining <= 0) break;
  }
  return rows;
};

export function RepaymentHistory() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const kind = (searchParams.get('kind') as 'app' | 'loan' | 'advance') || 'app';
  const { currencySymbol } = useCurrency();
  const navigate = useOrgNavigate();

  const [item, setItem] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (kind === 'app') {
          const app = await loanConfig.getApplicationById(Number(id));
          if (cancelled) return;
          setItem({ ...app, isApplication: true });
          setSchedule((app.repaymentSchedule || []).map((s: any) => ({ ...s })));
        } else {
          const data = kind === 'loan' ? await loansAdvancesService.getLoans() : await loansAdvancesService.getAdvances();
          const rec = (data || []).find((l: any) => String(l.id) === String(id));
          if (cancelled) return;
          if (!rec) { setError('Record not found'); setItem(null); setSchedule([]); return; }
          setItem({ ...rec, isApplication: false });
          setSchedule(buildEstimatedSchedule(rec, kind));
        }
      } catch {
        if (!cancelled) { setError('Failed to load repayment history'); setItem(null); setSchedule([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, kind]);

  const isApp = kind === 'app';

  const principal = isApp ? Number(item?.approvedAmount ?? item?.requestedAmount ?? 0) : Number(item?.principalAmount || 0);
  const emi = isApp ? Number(item?.monthlyEmi || 0) : Number(item?.monthlyRecovery || 0);
  const paid = isApp ? Number(item?.paidAmount || 0) : Math.max(0, principal - Number(item?.outstandingBalance || 0));
  const outstanding = Number(item?.outstandingBalance || 0);
  const refDate = isApp ? item?.startDate : (item?.disbursed_at || item?.finance_approved_at || item?.manager_approved_at || item?.created_at);
  const startDate = isApp ? (item?.startDate || schedule[0]?.dueDate) : schedule[0]?.dueDate;
  const endDate = isApp ? (item?.endDate || schedule[schedule.length - 1]?.dueDate) : schedule[schedule.length - 1]?.dueDate;

  const totalEmi = schedule.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalScheduledPaid = schedule.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
  const paidMonths = schedule.filter(r => String(r.status) === 'PAID').length;
  const remainingMonths = schedule.filter(r => String(r.status) !== 'PAID').length;
  const firstDue = schedule.find(r => String(r.status) !== 'PAID')?.dueDate;

  const summary: { label: string; value: string; accent?: boolean; color?: string }[] = [
    { label: 'Type', value: isApp ? (item?.loanType?.name || 'Financial Aid') : (kind === 'loan' ? 'Company Loan' : 'Salary Advance') },
    { label: 'Principal', value: `${currencySymbol}${principal.toLocaleString()}` },
    { label: 'EMI / Month', value: `${currencySymbol}${emi.toLocaleString()}` },
    ...(isApp && item?.interestRate ? [{ label: 'Interest', value: `${item.interestRate}%` }] : []),
    ...(isApp && item?.tenure ? [{ label: 'Tenure', value: `${item.tenure} months` }] : []),
    ...(isApp && item?.totalPayable ? [{ label: 'Total Payable', value: `${currencySymbol}${Number(item.totalPayable).toLocaleString()}` }] : []),
    { label: 'Total Paid', value: `${currencySymbol}${paid.toLocaleString()}`, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Outstanding', value: `${currencySymbol}${outstanding.toLocaleString()}`, color: 'text-rose-600 dark:text-rose-400' },
    { label: 'Status', value: getStatusLabel(item?.status) },
  ];

  return (
    <div className="space-y-6 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="icon-circle-btn">
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Repayment History</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Month-by-month repayment schedule for this {isApp ? 'application' : kind}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Loading repayment schedule...</p>
        </div>
      ) : error || !item ? (
        <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <FileText className="mx-auto size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-bold text-foreground">{error || 'Record not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to Loans &amp; Advances
          </button>
        </div>
      ) : (
        <>
          {/* Loan Summary */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="h-1.5 bg-primary w-full" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {isApp ? <FileText className="w-5 h-5 text-primary" /> : (kind === 'loan' ? <Banknote className="w-5 h-5 text-primary" /> : <TrendingUp className="w-5 h-5 text-primary" />)}
                {isApp ? (item?.loanType?.name || 'Loan / Advance') : (kind === 'loan' ? 'Company Loan' : 'Salary Advance')}
                {isApp && item?.applicationNumber && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted text-muted-foreground ml-1">{item.applicationNumber}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {summary.map(s => (
                  <div key={s.label} className="bg-muted/40 dark:bg-zinc-900 border border-border rounded-xl p-3.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className={`font-black text-sm mt-1 ${s.color || 'text-foreground'}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* EMI timeline info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-start gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg"><CalendarClock className="size-5 text-primary" /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">EMI Starts From</p>
                <p className="text-lg font-black text-foreground mt-0.5">{startDate ? monthLabel(startDate) : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Deductions begin the month after approval</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-start gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg"><HandCoins className="size-5 text-emerald-600 dark:text-emerald-400" /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Until</p>
                <p className="text-lg font-black text-foreground mt-0.5">{endDate ? monthLabel(endDate) : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Final repayment month of this {kind === 'advance' ? 'advance' : 'loan'}</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-start gap-3">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg"><Wallet className="size-5 text-amber-600 dark:text-amber-400" /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progress</p>
                <p className="text-lg font-black text-foreground mt-0.5">{paidMonths} of {schedule.length} months paid</p>
                <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${schedule.length ? (paidMonths / schedule.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Full Repayment Schedule
                <span className="text-xs font-semibold text-muted-foreground ml-auto">
                  {totalEmi > 0 && `${currencySymbol}${totalEmi.toLocaleString()} total scheduled`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {schedule.length === 0 ? (
                <div className="py-16 text-center">
                  <CalendarRange className="mx-auto size-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-bold text-foreground">No schedule available yet</p>
                  <p className="text-xs text-muted-foreground mt-1">The repayment schedule is generated once the application is approved.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[820px] border-collapse">
                    <TableHeader>
                      <TableRow className="bg-muted/40 border-b border-border/80 hover:bg-transparent">
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Month</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</TableHead>
                        <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">EMI Amount</TableHead>
                        <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Principal</TableHead>
                        <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interest</TableHead>
                        <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((row: any) => {
                        const rowPaid = Number(row.paidAmount || 0);
                        const rowStatus = String(row.status || 'PENDING');
                        const isPaidRow = rowStatus === 'PAID';
                        const isCurrent = !isPaidRow && String(firstDue || '') !== '' && monthKey(row.dueDate) === monthKey(firstDue);
                        return (
                          <TableRow key={row.id ?? `est-${row.installmentNo}`} className={`hover:bg-muted/50 transition-colors ${isPaidRow ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}>
                            <TableCell className="px-6 py-3.5 font-mono text-xs font-bold text-muted-foreground">#{row.installmentNo}</TableCell>
                            <TableCell className="px-6 py-3.5 font-bold text-sm text-foreground">{monthLabel(row.dueDate)}</TableCell>
                            <TableCell className="px-6 py-3.5 text-xs text-muted-foreground">{new Date(row.dueDate).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell className="px-6 py-3.5 text-right font-mono text-sm font-bold text-foreground">{currencySymbol}{Number(row.amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="px-6 py-3.5 text-right font-mono text-sm text-muted-foreground">{currencySymbol}{Number(row.principalPortion || 0).toLocaleString()}</TableCell>
                            <TableCell className="px-6 py-3.5 text-right font-mono text-sm text-muted-foreground">{currencySymbol}{Number(row.interestPortion || 0).toLocaleString()}</TableCell>
                            <TableCell className="px-6 py-3.5 text-right font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{currencySymbol}{rowPaid.toLocaleString()}</TableCell>
                            <TableCell className="px-6 py-3.5">
                              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${isPaidRow ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' : isCurrent ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900' : 'bg-muted text-muted-foreground border-border'}`}>
                                {getStatusLabel(rowStatus)}
                              </span>
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

          {/* Footer legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500 inline-block" /> Paid months</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-500 inline-block" /> Next due (upcoming)</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Pending months</span>
            <span className="flex items-center gap-1.5"><PieChart className="size-3.5" /> Total deducted so far: <b className="text-foreground">{currencySymbol}{totalScheduledPaid.toLocaleString()}</b></span>
          </div>

          {!isApp && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
              <ArrowRight className="size-3.5" />
              Legacy {kind}s don&rsquo;t carry an interest schedule &mdash; months shown are estimated from the recovery plan. Approved via the application flow, the exact schedule appears automatically.
            </p>
          )}
        </>
      )}
    </div>
  );
}

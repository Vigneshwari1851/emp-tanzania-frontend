import { useCurrency } from "@/shared/hooks/useCurrency";
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/payroll-lib/table';
import { toast } from 'sonner';
import {
  Plus, Clock, CheckCircle2, Sparkles, Banknote, TrendingUp,
  HandCoins, Activity, Layers, CircleDollarSign, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { ApprovalTimeline, getStatusLabel, getStatusColor } from '../components/ApprovalTimeline';
import * as loanConfig from '../services/loan-config';

interface LoansAdvancesPortalProps {
    userId?: number;
    payslips?: any[];
    refresh?: () => void;
}

export function LoansAdvancesPortal({ userId, payslips = [], refresh }: LoansAdvancesPortalProps) {
    const { currencySymbol } = useCurrency();
    const { user } = useAuth();
    const resolvedUserId = userId || (user?.id ? Number(user.id) : 0);
    const [activeLoans, setActiveLoans] = useState<any[]>([]);
    const [activeAdvances, setActiveAdvances] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<'all' | 'loans' | 'advances'>('all');

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [policies, setPolicies] = useState<any[]>([]);
    const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
    const [requestType, setRequestType] = useState('loan');
    const [principal, setPrincipal] = useState('');
    const [duration, setDuration] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const data = await loanConfig.getLoanTypes();
                setPolicies((data || []).filter((p: any) => p.isActive));
            } catch { /* silent */ }
        };
        fetchPolicies();
    }, []);

    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemType, setItemType] = useState<'loan' | 'advance'>('loan');

    const fetchData = async () => {
        try {
            setLoading(true);
            const portalData = await (await import('@/features/payroll/services/payroll')).getEmployeePortalData();
            setActiveLoans(portalData?.activeLoans || []);
            setActiveAdvances(portalData?.activeAdvances || []);
        } catch {
            setActiveLoans([]);
            setActiveAdvances([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [resolvedUserId]);

    const history = useMemo(() => {
        if (!selectedItem) return [];
        const sorted = [...payslips].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        const deductionLabel = itemType === 'loan' ? 'Loan Recovery' : 'Advance Recovery';
        return sorted.filter(p => {
            const hasDeduction = p.deductionDetails?.find((d: any) => d.label === deductionLabel);
            return hasDeduction && hasDeduction.value > 0;
        }).map(p => ({
            month: p.month,
            amount: p.deductionDetails?.find((d: any) => d.label === deductionLabel)?.value || 0
        }));
    }, [selectedItem, itemType, payslips]);

    const formatMonthName = (monthStr: string) => {
        if (!monthStr) return '';
        try {
            const [year, month] = monthStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return date.toLocaleString('default', { month: 'long', year: 'numeric' });
        } catch { return monthStr; }
    };

    const activePolicy = useMemo(() => {
        return policies.find(p => String(p.id) === selectedPolicyId);
    }, [policies, selectedPolicyId]);

    const calculatedEMI = useMemo(() => {
        const p = parseFloat(principal);
        const d = parseFloat(duration);
        if (isNaN(p) || isNaN(d) || d <= 0) return null;

        const rate = activePolicy ? Number(activePolicy.interestRate) || 0 : 0;
        const method = activePolicy ? activePolicy.repaymentMethod || 'EMI' : 'EMI';

        if (method === 'ONE_TIME') return p;

        const ratePerMonth = rate / 12 / 100;
        if (ratePerMonth > 0) {
            const emiVal = (p * ratePerMonth * Math.pow(1 + ratePerMonth, d)) / (Math.pow(1 + ratePerMonth, d) - 1);
            return Math.ceil(emiVal);
        }
        return Math.ceil(p / d);
    }, [principal, duration, activePolicy]);

    const handleRequestSubmit = async () => {
        if (!selectedPolicyId || !principal || !duration) {
            toast.error('Please select a policy and enter the required amount and recovery duration.');
            return;
        }

        const pVal = Number(principal);
        const dVal = Number(duration);

        if (activePolicy) {
            if (pVal < Number(activePolicy.minAmount)) {
                toast.error(`Minimum amount for ${activePolicy.name} is ${currencySymbol}${Number(activePolicy.minAmount).toLocaleString()}`);
                return;
            }
            if (pVal > Number(activePolicy.maxAmount)) {
                toast.error(`Maximum amount for ${activePolicy.name} is ${currencySymbol}${Number(activePolicy.maxAmount).toLocaleString()}`);
                return;
            }
            if (dVal > Number(activePolicy.maxTenure)) {
                toast.error(`Maximum tenure for ${activePolicy.name} is ${activePolicy.maxTenure} months`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const payload = {
                loanTypeId: Number(selectedPolicyId),
                requestedAmount: pVal,
                tenure: dVal,
                reason: reason
            };
            await loanConfig.createApplication(payload);
            toast.success(`${activePolicy ? activePolicy.name : 'Request'} submitted successfully!`);
            setIsRequestModalOpen(false);
            setSelectedPolicyId('');
            setPrincipal(''); setDuration(''); setReason('');
            fetchData();
            refresh?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const allItems = [...activeLoans.map(l => ({ ...l, _type: 'loan' })), ...activeAdvances.map(a => ({ ...a, _type: 'advance' }))];
    const filteredItems = activeTab === 'loans' ? allItems.filter(i => i._type === 'loan') :
                          activeTab === 'advances' ? allItems.filter(i => i._type === 'advance') : allItems;

    const stats = useMemo(() => {
        const loanItems = allItems.filter(i => i._type === 'loan');
        const advItems = allItems.filter(i => i._type === 'advance');
        const totalOutstanding = allItems.reduce((s, i) => s + Number(i.outstandingBalance || 0), 0);
        const totalPaid = allItems.reduce((s, i) => s + (Number(i.principalAmount || 0) - Number(i.outstandingBalance || 0)), 0);
        return {
            loanCount: loanItems.length,
            advanceCount: advItems.length,
            totalOutstanding,
            totalPaid,
            totalActive: allItems.filter(i => i.status === 'APPROVED').length,
            pendingCount: allItems.filter(i => i.status !== 'APPROVED' && i.status !== 'REJECTED' && i.status !== 'SETTLED').length,
        };
    }, [allItems]);

    if (isRequestModalOpen) {
        return (
            <div className="space-y-6 text-left w-full animate-in fade-in duration-300">
                {/* Navigation & Breadcrumbs */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setIsRequestModalOpen(false);
                            setPrincipal('');
                            setDuration('');
                            setReason('');
                        }}
                        className="icon-circle-btn"
                    >
                        <ArrowLeft />
                    </button>
                    <div>
                        <h2 className="text-xl font-medium text-foreground leading-none">Request Financial Aid</h2>
                        <p className="text-sm text-muted-foreground mt-1">Submit your request for a loan or salary advance</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start mt-6">
                    {/* Main Form Area */}
                    <div className="w-full lg:w-[70%] space-y-6">
                        <Card className="border border-border shadow-sm overflow-hidden">
                            <div className="h-1.5 bg-primary w-full"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <HandCoins className="w-5 h-5 text-primary" />
                                    Request Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Select Policy *</Label>
                                    <Select value={selectedPolicyId} onValueChange={(val) => {
                                        setSelectedPolicyId(val);
                                        const policy = policies.find(p => String(p.id) === val);
                                        if (policy) {
                                            setPrincipal(String(policy.maxAmount));
                                            setDuration(String(policy.maxTenure));
                                        }
                                    }}>
                                        <SelectTrigger className="rounded-xl border-border bg-card text-foreground"><SelectValue placeholder="Select Loan / Advance Policy" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-border bg-card text-foreground max-h-64 overflow-y-auto">
                                            {policies.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                    {p.name} ({p.code}) &middot; {p.category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {activePolicy && (
                                    <div className="bg-slate-50 dark:bg-zinc-900 border border-border rounded-xl p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-200">
                                        <div>
                                            <span className="text-muted-foreground font-semibold">Category</span>
                                            <p className="font-bold text-foreground mt-0.5 capitalize">{activePolicy.category.toLowerCase()}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground font-semibold">Allowed Limits</span>
                                            <p className="font-bold text-foreground mt-0.5">{currencySymbol}{Number(activePolicy.minAmount).toLocaleString()} - {currencySymbol}{Number(activePolicy.maxAmount).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground font-semibold">Interest Rate</span>
                                            <p className="font-bold text-foreground mt-0.5">{activePolicy.interestRate}%</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground font-semibold">Max Term</span>
                                            <p className="font-bold text-foreground mt-0.5">{activePolicy.maxTenure} mos ({activePolicy.repaymentMethod})</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Amount Required ({currencySymbol}) *</Label>
                                    <Input type="number" placeholder="e.g. 50000" value={principal} onChange={e => setPrincipal(e.target.value)} className="rounded-xl border-border bg-card text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Recovery Duration (Months) *</Label>
                                    <Input type="number" placeholder="e.g. 10" value={duration} onChange={e => setDuration(e.target.value)} className="rounded-xl border-border bg-card text-foreground" />
                                    {calculatedEMI !== null && (
                                        <p className="text-xs text-primary dark:text-primary-foreground font-semibold mt-2 bg-primary/10 dark:bg-primary/20 border border-primary/20 px-3 py-2 rounded-xl">
                                            Expected Monthly EMI: {currencySymbol}{calculatedEMI.toLocaleString()}/month
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Reason</Label>
                                    <textarea placeholder="Briefly explain why you need this" value={reason} onChange={e => setReason(e.target.value)} className="w-full resize-none h-24 rounded-xl border border-border bg-muted/20 text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                </div>
                                <div className="pt-4 border-t border-border flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="px-8 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl"
                                        onClick={() => {
                                            setIsRequestModalOpen(false);
                                            setPrincipal('');
                                            setDuration('');
                                            setReason('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleRequestSubmit}
                                        disabled={isSubmitting}
                                        className="px-10 font-medium tracking-wide shadow-sm transition-all bg-primary hover:bg-primary/95 text-white rounded-xl"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Area */}
                    <div className="w-full lg:w-[30%] space-y-4">
                        <div className="p-6 bg-primary/10 border border-primary-100 dark:border-primary-900/50 rounded-sm flex items-start gap-4">
                            <div className="p-2 bg-card rounded shadow-sm">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-primary-900 dark:text-primary-200">What happens next?</p>
                                <p className="text-xs text-primary/80 dark:text-primary-300/80 mt-1 leading-relaxed">
                                    Your request will be routed to your manager and finance department for review and approval. Once approved, the amount will be processed for disbursement.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border border-dashed border-border dark:border-border/60 rounded-sm">
                            <h4 className="text-[12px] font-medium text-muted-foreground mb-3">Policy Reminders</h4>
                            <ul className="space-y-2.5">
                                {[
                                    "Ensure your requested recovery duration aligns with organizational guidelines.",
                                    "Total outstanding financial aids cannot exceed policy limits.",
                                    "Submit necessary documents if required by the finance desk."
                                ].map((text, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                        <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0"></div>
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
            {/* Page Header */}
            <div>
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 sm:gap-5">
                            <div className="flex items-center justify-center shrink-0 text-primary">
                                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Loans & Advances Hub</h1>
                                <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Request financial aid, track approvals, and view repayment history</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsRequestModalOpen(true)}
                            className="bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 text-sm w-fit"
                        >
                            <Plus className="w-4 h-4" />
                            Request Loan / Advance
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-6 mt-6 border-b border-border pb-0.5 overflow-x-auto scrollbar-none">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`group py-3 px-1 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Layers className={`w-4 h-4 transition-colors ${activeTab === 'all' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                            <span>All ({allItems.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('loans')}
                            className={`py-3 px-1 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === 'loans' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Banknote className="w-4 h-4" />
                            Loans ({stats.loanCount})
                        </button>
                        <button
                            onClick={() => setActiveTab('advances')}
                            className={`py-3 px-1 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === 'advances' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Advances ({stats.advanceCount})
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mt-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <Banknote className="w-5 h-5 text-primary shrink-0" />
                        </div>
                        <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                            {stats.loanCount}
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                                Active Loans
                            </span>
                        </div>
                    </div>

                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                        </div>
                        <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                            {stats.advanceCount}
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                                Active Advances
                            </span>
                        </div>
                    </div>

                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        </div>
                        <div className="my-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {currencySymbol}{stats.totalPaid.toLocaleString()}
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                                Total Recovered
                            </span>
                        </div>
                    </div>

                    <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <CircleDollarSign className="w-5 h-5 text-primary shrink-0" />
                        </div>
                        <div className="my-1 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
                            {currencySymbol}{stats.totalOutstanding.toLocaleString()}
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                                Outstanding
                            </span>
                        </div>
                    </div>
                </div>

                {/* Records Table */}
                <div className="bg-card rounded-xl border border-border shadow-sm">
                    <div className="p-6 border-b border-border">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Layers className="size-4 text-primary" />
                            Your Financial Aids
                        </h3>
                    </div>
                    <div className="p-0">
                        {filteredItems.length === 0 && !loading ? (
                            <div className="py-16 text-center">
                                <HandCoins className="mx-auto size-10 text-muted-foreground/40 mb-3" />
                                <p className="text-sm font-bold text-foreground">No active loans or advances</p>
                                <p className="text-xs text-muted-foreground mt-1">Click &ldquo;Request Loan / Advance&rdquo; to get started</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="min-w-[800px] border-collapse">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 border-b border-border/80 hover:bg-transparent">
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                                            <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                                            <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">EMI</TableHead>
                                            <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</TableHead>
                                            <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approval</TableHead>
                                            <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map((item: any) => (
                                            <TableRow key={`${item._type}-${item.id}`} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`size-8 rounded-lg flex items-center justify-center ${item._type === 'loan' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                                            {item._type === 'loan' ? <Banknote className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                                                        </div>
                                                        <span className="text-sm font-semibold text-foreground">{item._type === 'loan' ? 'Company Loan' : 'Salary Advance'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right font-mono text-sm font-bold text-foreground">{currencySymbol}{Number(item.principalAmount).toLocaleString()}</TableCell>
                                                <TableCell className="px-6 py-4 text-right font-mono text-sm text-primary font-bold">{currencySymbol}{Number(item.monthlyRecovery).toLocaleString()}/mo</TableCell>
                                                <TableCell className="px-6 py-4 text-right font-mono text-sm text-emerald-600 font-bold">{currencySymbol}{Number(item.principalAmount - item.outstandingBalance).toLocaleString()}</TableCell>
                                                <TableCell className="px-6 py-4 text-right font-mono text-sm text-rose-600 font-black">{currencySymbol}{Number(item.outstandingBalance).toLocaleString()}</TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${getStatusColor(item.status)}`}>
                                                        {getStatusLabel(item.status)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    {item.status !== 'APPROVED' && item.status !== 'REJECTED' && item.status !== 'SETTLED' && (
                                                        <div className="scale-75 origin-left">
                                                            <ApprovalTimeline
                                                                currentStatus={item.status}
                                                                managerName={item.reporting_manager ? `${item.reporting_manager.details?.first_name || ''} ${item.reporting_manager.details?.last_name || ''}`.trim() : undefined}
                                                                hrApprover={item.hr_approver?.details}
                                                                financeApprover={item.finance_approver?.details}
                                                                managerApprovedAt={item.manager_approved_at}
                                                                hrApprovedAt={item.hr_approved_at}
                                                                financeApprovedAt={item.finance_approved_at}
                                                            />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    {item.status === 'APPROVED' && (
                                                        <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/10 rounded-xl gap-1.5"
                                                            onClick={() => { setSelectedItem(item); setItemType(item._type); }}>
                                                            <Activity className="size-3.5" /> View History
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Repayment History Modal */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-primary-800 text-white px-6 py-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold">Repayment History</h3>
                                    <p className="text-primary-200/80 text-xs mt-0.5">{itemType === 'loan' ? 'Company Loan' : 'Salary Advance'} &middot; {currencySymbol}{Number(selectedItem.principalAmount).toLocaleString()}</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="size-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white">&times;</button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/50">
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Paid</p>
                                    <p className="font-black text-emerald-700 dark:text-emerald-300 text-xl mt-1">{currencySymbol}{Number(selectedItem.principalAmount - selectedItem.outstandingBalance).toLocaleString()}</p>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl p-4 border border-rose-100 dark:border-rose-900/50">
                                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Remaining</p>
                                    <p className="font-black text-rose-700 dark:text-rose-300 text-xl mt-1">{currencySymbol}{Number(selectedItem.outstandingBalance).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* History List */}
                            {history.length === 0 ? (
                                <div className="text-center py-10">
                                    <Clock className="mx-auto size-8 text-muted-foreground/40 mb-3" />
                                    <p className="text-sm font-bold text-foreground">No deductions yet</p>
                                    <p className="text-xs text-muted-foreground mt-1">Repayment deductions will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {history.map((h, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-muted/50 border border-border rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                    <CheckCircle2 className="size-3.5" />
                                                </div>
                                                <span className="font-bold text-sm text-foreground">{formatMonthName(h.month)}</span>
                                            </div>
                                            <span className="font-black font-mono text-sm text-foreground">{currencySymbol}{h.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button onClick={() => setSelectedItem(null)} className="w-full bg-muted hover:bg-muted/80 text-foreground py-6 mt-6 rounded-xl font-bold">Close</Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}

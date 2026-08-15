import { useParams, useSearchParams } from 'react-router-dom';
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/payroll-lib/table';
import { toast } from 'sonner';
import { usePayroll } from '@/features/payroll/context/PayrollContext';
import {
  CheckCircle2, XCircle, Clock, FileText, Plus,
  DollarSign, TrendingUp, Banknote, Layers, Landmark, Shield, LayoutDashboard, HandCoins, Settings, Edit
} from 'lucide-react';
import { LoanTypeConfig } from './LoanTypeConfig';
import * as loansAdvancesService from '../services/loans-advances';
import * as loanConfig from '../services/loan-config';
import { ApprovalTimeline, getStatusLabel, getStatusColor } from '../components/ApprovalTimeline';
import { ConfirmationDialog } from '@/shared/components/ui/ConfirmationDialog';
import { Card, CardContent } from '@/shared/components/ui/card';
import RejectReasonDialog from '@/shared/components/ui/RejectReasonDialog';

export function LoansAdvancesSetup() {
    const [searchParams] = useSearchParams();
    const { id } = useParams();
    const { currencySymbol } = useCurrency();
    const navigate = useOrgNavigate();
    const { employees } = usePayroll();
    const [loans, setLoans] = useState<any[]>([]);
    const [advances, setAdvances] = useState<any[]>([]);
    const [pendingLoans, setPendingLoans] = useState<any[]>([]);
    const [pendingAdvances, setPendingAdvances] = useState<any[]>([]);
    const [pendingApps, setPendingApps] = useState<any[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get('tab');
        if (tab) return tab;
        if (id) return 'pending';
        return 'dashboard';
    });
    const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
    const [isEditing, setIsEditing] = useState(false);

    const [settings, setSettings] = useState({
        autoRequestNumberPrefix: 'LA-',
        financialYear: '2026-2027',
        maxLoanAmount: 1000000,
        maxAdvanceAmount: 100000,
        maxLoanTenure: 60,
        defaultInterestRate: 8.5,
        defaultCurrency: 'INR',
        approvalWorkflow: ['MANAGER', 'HR', 'FINANCE'],
    });

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await loansAdvancesService.saveSettings(settings);
            if (data) {
                setSettings(data);
            }
            toast.success('Settings updated successfully!');
            setIsEditing(false);
        } catch {
            toast.error('Failed to save settings');
        }
    };

    // Settle Confirmation State
    const [settleTarget, setSettleTarget] = useState<{ id: number; type: 'loan' | 'advance' } | null>(null);

    // Reject Dialog State
    const [rejectTarget, setRejectTarget] = useState<{ id: number; type: 'loan' | 'advance' } | null>(null);

    const fetchRecords = async () => {
        try {
            const [loanRes, advRes, pendingLoanRes, pendingAdvRes, pendingAppRes, appRes] = await Promise.all([
                loansAdvancesService.getLoans().catch(() => []),
                loansAdvancesService.getAdvances().catch(() => []),
                loansAdvancesService.getLoansForApproval().catch(() => []),
                loansAdvancesService.getAdvancesForApproval().catch(() => []),
                loanConfig.getPendingApprovals().catch(() => []),
                loanConfig.getApplications().catch(() => [])
            ]);
            setLoans(loanRes || []);
            setAdvances(advRes || []);
            setPendingLoans(pendingLoanRes || []);
            setPendingAdvances(pendingAdvRes || []);
            setPendingApps(pendingAppRes || []);
            setApplications(appRes || []);
        } catch {
            toast.error('Failed to load loans and advances');
        }
    };

    const fetchSettings = async () => {
        try {
            const data = await loansAdvancesService.getSettings();
            if (data) setSettings(data);
        } catch {
            // Fallback silently to default settings state
        }
    };

    useEffect(() => { 
        fetchRecords(); 
        fetchSettings();
    }, []);

    const handleApprove = async (id: number, loanType: 'loan' | 'advance') => {
        const remarks = remarksMap[`${loanType}-${id}`] || '';
        try {
            const isApp = pendingApps.some(app => app.id === id && app.loanType?.category?.toLowerCase() === loanType);
            if (isApp) {
                await loanConfig.approveApplicationStep(id, remarks);
            } else {
                if (loanType === 'loan') {
                    await loansAdvancesService.approveLoanStep(id, remarks);
                } else {
                    await loansAdvancesService.approveAdvanceStep(id, remarks);
                }
            }
            toast.success(`${loanType === 'loan' ? 'Loan' : 'Advance'} approved at current step`);
            setRemarksMap(prev => { const n = { ...prev }; delete n[`${loanType}-${id}`]; return n; });
            fetchRecords();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to approve');
        }
    };

    const handleReject = async (id: number, loanType: 'loan' | 'advance', reason: string) => {
        try {
            const isApp = pendingApps.some(app => app.id === id && app.loanType?.category?.toLowerCase() === loanType);
            if (isApp) {
                await loanConfig.rejectApplicationStep(id, reason);
            } else {
                if (loanType === 'loan') {
                    await loansAdvancesService.rejectLoanStep(id, reason);
                } else {
                    await loansAdvancesService.rejectAdvanceStep(id, reason);
                }
            }
            toast.success(`${loanType === 'loan' ? 'Loan' : 'Advance'} rejected`);
            setRejectTarget(null);
            fetchRecords();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to reject');
        }
    };

    const handleSettle = async () => {
        if (!settleTarget) return;
        try {
            if (settleTarget.type === 'loan') {
                await loansAdvancesService.settleLoan(settleTarget.id);
            } else {
                await loansAdvancesService.settleAdvance(settleTarget.id);
            }
            toast.success(`${settleTarget.type === 'loan' ? 'Loan' : 'Advance'} settled`);
            setSettleTarget(null);
            fetchRecords();
        } catch {
            toast.error('Failed to settle');
        }
    };

    const mappedApps = pendingApps.map(app => ({
        ...app,
        _type: app.loanType?.category?.toLowerCase() === 'loan' ? 'loan' : 'advance',
        principalAmount: app.requestedAmount,
        monthlyRecovery: app.monthlyEmi,
        isApplication: true
    }));

    const mappedApplications = applications.map(app => ({
        ...app,
        _type: app.loanType?.category?.toLowerCase() === 'advance' ? 'advance' : 'loan',
        principalAmount: app.approvedAmount ?? app.requestedAmount,
        monthlyRecovery: app.monthlyEmi,
        isApplication: true
    }));

    const allPending = [
        ...pendingLoans.map(l => ({ ...l, _type: 'loan' })),
        ...pendingAdvances.map(a => ({ ...a, _type: 'advance' })),
        ...mappedApps
    ];
    const allRecords = [
        ...loans.map(l => ({ ...l, _type: 'loan' })),
        ...advances.map(a => ({ ...a, _type: 'advance' })),
        ...mappedApplications
    ];

    const stats = useMemo(() => {
        const totalLoanAmount = loans.reduce((s, l) => s + Number(l.principalAmount || 0), 0);
        const totalAdvanceAmount = advances.reduce((s, a) => s + Number(a.principalAmount || 0), 0);
        const totalOutstanding = allRecords.reduce((s, r) => s + Number(r.outstandingBalance || 0), 0);
        const totalPaid = allRecords.reduce((s, r) => s + (Number(r.principalAmount || 0) - Number(r.outstandingBalance || 0)), 0);
        return {
            loanCount: loans.length,
            advanceCount: advances.length,
            totalLoanAmount,
            totalAdvanceAmount,
            totalOutstanding,
            totalPaid,
            pendingCount: allPending.length,
            approvedCount: allRecords.filter(r => r.status === 'APPROVED').length,
        };
    }, [loans, advances, allPending, allRecords]);

    return (
        <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <PageHeader
                    title="Financial Aids Management"
                    description="Issue loans, process multi-level approvals, and track settlements"
                    icon={<Landmark className="size-8" />}
                    action={
                        <button
                            onClick={() => navigate('/loans-advances/create')}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            Issue Loan / Advance
                        </button>
                    }
                />

                {/* Tab Navigation */}
                <div className="flex border-b border-border gap-6 w-full mt-6 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`group px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 ${activeTab === 'dashboard' ? 'text-primary border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <LayoutDashboard className={`w-4 h-4 transition-colors ${activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`group px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 ${activeTab === 'pending' ? 'text-primary border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <HandCoins className={`w-4 h-4 transition-colors ${activeTab === 'pending' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span>Pending Approval</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`group px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 ${activeTab === 'all' ? 'text-primary border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Landmark className={`w-4 h-4 transition-colors ${activeTab === 'all' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span>All Records</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`group px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 ${activeTab === 'policies' ? 'text-primary border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <FileText className={`w-4 h-4 transition-colors ${activeTab === 'policies' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span>Policies Setup</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`group px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 ${activeTab === 'settings' ? 'text-primary border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Settings className={`w-4 h-4 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span>Settings</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="mt-6">

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <Banknote className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{stats.loanCount}</p>
                                <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Total Loans</p>
                            </div>

                            <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{stats.advanceCount}</p>
                                <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Total Advances</p>
                            </div>

                            <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <span className="text-[11px] font-medium text-amber-600 flex items-center gap-0.5">
                                        Pending
                                    </span>
                                </div>
                                <p className="text-[24px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">{stats.pendingCount}</p>
                                <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Pending Approval</p>
                            </div>

                            <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <DollarSign className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[24px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">{currencySymbol}{stats.totalOutstanding.toLocaleString()}</p>
                                <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Total Outstanding</p>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-card rounded-xl border border-border shadow-sm">
                            <div className="p-6 border-b border-border">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Layers className="size-4 text-primary" />
                                    Recent Activity
                                </h3>
                            </div>
                            <div className="p-0">
                                {allRecords.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <FileText className="mx-auto size-8 text-muted-foreground/40 mb-3" />
                                        <p className="text-sm font-bold text-foreground">No records yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">Issue a loan or advance to get started</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {allRecords.slice(0, 5).map((item: any) => (
                                            <div key={`recent-${item._type}-${item.isApplication ? 'app-' : ''}${item.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-9 rounded-xl flex items-center justify-center ${item._type === 'loan' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                                        {item._type === 'loan' ? <Banknote className="size-4" /> : <TrendingUp className="size-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">{item.userDetail?.first_name} {item.userDetail?.last_name}</p>
                                                        <p className="text-xs text-muted-foreground">{item._type === 'loan' ? 'Company Loan' : 'Salary Advance'} &middot; {currencySymbol}{Number(item.principalAmount).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${getStatusColor(item.status)}`}>
                                                        {getStatusLabel(item.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Approval Tab */}
                {activeTab === 'pending' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Header Title Section */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Clock className="size-4 text-amber-500 animate-pulse" />
                                Pending Your Approval
                            </h3>
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                {allPending.length} pending
                            </span>
                        </div>

                        {/* Table Card wrapper */}
                        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <Table className="min-w-[1000px] border-collapse">
                                    <TableHeader>
                                        <TableRow className="border-b border-border/80 hover:bg-transparent">
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[18%]">Employee</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[10%]">Type</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[12%]">Principal</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[10%]">EMI</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[22%]">Workflow Status</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[18%]">Approval Remarks</TableHead>
                                            <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[10%]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allPending.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-16">
                                                    <CheckCircle2 className="mx-auto size-8 text-emerald-400 dark:text-emerald-500 mb-3 animate-bounce" />
                                                    <p className="text-sm font-bold text-foreground">All caught up!</p>
                                                    <p className="text-xs text-muted-foreground mt-1">No requests are currently pending your approval</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : allPending.map((item: any) => (
                                            <TableRow key={`pending-${item._type}-${item.id}`} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="px-6 py-4">
                                                    <div className="font-semibold text-foreground">{item.userDetail?.first_name} {item.userDetail?.last_name}</div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${item._type === 'loan' ? 'bg-primary/10 text-primary' : 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'}`}>
                                                        {item._type === 'loan' ? 'Loan' : 'Advance'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 font-mono text-sm font-bold text-foreground">
                                                    {currencySymbol}{Number(item.principalAmount).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">
                                                    {currencySymbol}{Number(item.monthlyRecovery).toLocaleString()}/mo
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <ApprovalTimeline
                                                        currentStatus={item.status}
                                                        managerName={item.reporting_manager ? `${item.reporting_manager.details?.first_name || ''} ${item.reporting_manager.details?.last_name || ''}`.trim() : undefined}
                                                        hrApprover={item.hr_approver?.details}
                                                        financeApprover={item.finance_approver?.details}
                                                        managerApprovedAt={item.manager_approved_at}
                                                        hrApprovedAt={item.hr_approved_at}
                                                        financeApprovedAt={item.finance_approved_at}
                                                        compact={true}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <Input
                                                        placeholder="Remarks (optional)"
                                                        value={remarksMap[`${item._type}-${item.id}`] || ''}
                                                        onChange={e => setRemarksMap(prev => ({ ...prev, [`${item._type}-${item.id}`]: e.target.value }))}
                                                        className="h-10 text-xs rounded-lg w-full bg-card"
                                                    />
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition"
                                                            onClick={() => handleApprove(item.id, item._type)}
                                                            title="Approve"
                                                        >
                                                            <CheckCircle2 className="size-4" />
                                                        </button>
                                                        <button
                                                            className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition"
                                                            onClick={() => setRejectTarget({ id: item.id, type: item._type })}
                                                            title="Reject"
                                                        >
                                                            <XCircle className="size-4" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}

                {/* All Records Tab */}
                {activeTab === 'all' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Header Title Section */}
                        <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <FileText className="size-4 text-primary" />
                                All Loans & Advances
                            </h3>
                        </div>

                        {/* Table Card wrapper */}
                        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <Table className="min-w-[800px] border-collapse">
                                    <TableHeader>
                                        <TableRow className="border-b border-border/80 hover:bg-transparent">
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">EMI</TableHead>
                                            <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-16">
                                                    <FileText className="mx-auto size-8 text-muted-foreground/40 mb-3" />
                                                    <p className="text-sm font-bold text-foreground">No records found</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Records will appear here once loans or advances are created</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : allRecords.map((item: any) => (
                                            <TableRow key={`${item._type}-all-${item.isApplication ? 'app-' : ''}${item.id}`} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-foreground">{item.userDetail?.first_name} {item.userDetail?.last_name}</p>
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded-full border bg-primary/10 text-primary border-primary/20">
                                                        {item._type === 'loan' ? 'Loan' : 'Advance'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-left font-mono text-sm font-bold text-foreground">{currencySymbol}{Number(item.principalAmount).toLocaleString()}</TableCell>
                                                <TableCell className="px-6 py-4 text-left font-mono text-sm text-emerald-600 dark:text-emerald-400 font-bold">{currencySymbol}{Number(item.principalAmount - item.outstandingBalance).toLocaleString()}</TableCell>
                                                <TableCell className="px-6 py-4 text-left font-mono text-sm text-rose-600 dark:text-rose-400 font-bold">{currencySymbol}{Number(item.outstandingBalance).toLocaleString()}</TableCell>
                                                <TableCell className="px-6 py-4 text-left font-mono text-sm text-primary font-bold">{currencySymbol}{Number(item.monthlyRecovery).toLocaleString()}/mo</TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${getStatusColor(item.status)}`}>
                                                        {getStatusLabel(item.status)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    {item.status === 'APPROVED' && !item.isApplication && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8 rounded-lg border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                            onClick={() => setSettleTarget({ id: item.id, type: item._type })}
                                                        >
                                                            Settle
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
                {/* Policies Setup Tab */}
                {activeTab === 'policies' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <LoanTypeConfig />
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <form onSubmit={handleSaveSettings} className="bg-card p-6 rounded-lg border border-border shadow-sm max-w-4xl space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center border-b border-border pb-4">
                            <div>
                                <h3 className="font-extrabold text-lg text-foreground">Loan & Advance Module Settings</h3>
                                <p className="text-xs text-muted-foreground">Configure request prefix, maximum tenure limits, and default interest rate configurations</p>
                            </div>
                            {!isEditing ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border transition-all cursor-pointer shadow-sm"
                                >
                                    <Edit className="w-3.5 h-3.5 text-primary" />
                                    Edit Settings
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            fetchSettings();
                                        }}
                                        className="px-3.5 py-2 border border-border hover:bg-muted text-foreground text-xs font-bold rounded-lg transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                                    >
                                        Save Settings
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Request Auto-Number Prefix</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={settings.autoRequestNumberPrefix}
                                    onChange={e => setSettings(prev => ({ ...prev, autoRequestNumberPrefix: e.target.value }))}
                                    className="w-full px-3 py-2 bg-card disabled:bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Financial Year Range</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={settings.financialYear}
                                    onChange={e => setSettings(prev => ({ ...prev, financialYear: e.target.value }))}
                                    className="w-full px-3 py-2 bg-card disabled:bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Max Loan Amount Limit</label>
                                <input
                                    type="number"
                                    disabled={!isEditing}
                                    value={settings.maxLoanAmount}
                                    onChange={e => setSettings(prev => ({ ...prev, maxLoanAmount: parseInt(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-card disabled:bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Max Advance Amount Limit</label>
                                <input
                                    type="number"
                                    disabled={!isEditing}
                                    value={settings.maxAdvanceAmount}
                                    onChange={e => setSettings(prev => ({ ...prev, maxAdvanceAmount: parseInt(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-card disabled:bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Maximum Loan Tenure (Months)</label>
                                <input
                                    type="number"
                                    disabled={!isEditing}
                                    value={settings.maxLoanTenure}
                                    onChange={e => setSettings(prev => ({ ...prev, maxLoanTenure: parseInt(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-card disabled:bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-2">Default Interest Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    disabled={!isEditing}
                                    value={settings.defaultInterestRate}
                                    onChange={e => setSettings(prev => ({ ...prev, defaultInterestRate: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-card disabled:bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed transition"
                                />
                            </div>
                        </div>

                    </form>
                )}
            </div>

            {/* Settle Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!settleTarget}
                onClose={() => setSettleTarget(null)}
                onConfirm={handleSettle}
                title="Settle this record?"
                description={`This will mark the ${settleTarget?.type === 'loan' ? 'loan' : 'advance'} as fully settled. This action cannot be undone.`}
                confirmText="Settle"
                cancelText="Cancel"
                variant="warning"
            />

            {/* Reject Reason Dialog */}
            <RejectReasonDialog
                isOpen={!!rejectTarget}
                onClose={() => setRejectTarget(null)}
                onConfirm={(reason) => rejectTarget && handleReject(rejectTarget.id, rejectTarget.type, reason)}
                title={`Reject ${rejectTarget?.type === 'loan' ? 'Loan' : 'Advance'}`}
            />
        </div>
    );
}

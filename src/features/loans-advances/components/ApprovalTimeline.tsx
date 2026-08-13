import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface ApprovalStep {
    label: string;
    status: 'completed' | 'current' | 'pending' | 'rejected';
    approver?: string;
    remarks?: string;
    date?: string;
}

interface ApprovalTimelineProps {
    currentStatus: string;
    managerName?: string;
    hrApprover?: { first_name?: string; last_name?: string };
    financeApprover?: { first_name?: string; last_name?: string };
    managerRemarks?: string;
    hrRemarks?: string;
    financeRemarks?: string;
    managerApprovedAt?: string;
    hrApprovedAt?: string;
    financeApprovedAt?: string;
    compact?: boolean;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
}

function getSteps(props: ApprovalTimelineProps): ApprovalStep[] {
    const { currentStatus } = props;

    if (currentStatus === 'REJECTED') {
        return [
            { label: 'Manager', status: props.managerApprovedAt ? 'completed' : 'rejected', approver: props.managerName, remarks: props.managerRemarks, date: props.managerApprovedAt },
            ...(props.hrApprovedAt ? [{ label: 'HR', status: 'rejected' as const, approver: props.hrApprover ? `${props.hrApprover.first_name || ''} ${props.hrApprover.last_name || ''}`.trim() : undefined, remarks: props.hrRemarks, date: props.hrApprovedAt }] : []),
            ...(!props.hrApprovedAt && !props.managerApprovedAt ? [{ label: 'HR', status: 'pending' as const }] : []),
            { label: 'Finance', status: 'pending' as const },
        ];
    }

    if (currentStatus === 'SETTLED' || currentStatus === 'APPROVED') {
        return [
            { label: 'Manager', status: 'completed', approver: props.managerName, remarks: props.managerRemarks, date: props.managerApprovedAt },
            { label: 'HR', status: 'completed', approver: props.hrApprover ? `${props.hrApprover.first_name || ''} ${props.hrApprover.last_name || ''}`.trim() : undefined, remarks: props.hrRemarks, date: props.hrApprovedAt },
            { label: 'Finance', status: 'completed', approver: props.financeApprover ? `${props.financeApprover.first_name || ''} ${props.financeApprover.last_name || ''}`.trim() : undefined, remarks: props.financeRemarks, date: props.financeApprovedAt },
        ];
    }

    const steps: ApprovalStep[] = [];
    steps.push({
        label: 'Manager',
        status: currentStatus === 'PENDING_MANAGER' ? 'current' : 'completed',
        approver: currentStatus !== 'PENDING_MANAGER' ? props.managerName : undefined,
        remarks: props.managerRemarks,
        date: props.managerApprovedAt
    });
    steps.push({
        label: 'HR',
        status: currentStatus === 'PENDING_HR' ? 'current' : currentStatus === 'PENDING_FINANCE' || currentStatus === 'APPROVED' ? 'completed' : 'pending',
        approver: currentStatus === 'PENDING_FINANCE' || currentStatus === 'APPROVED' ? (props.hrApprover ? `${props.hrApprover.first_name || ''} ${props.hrApprover.last_name || ''}`.trim() : undefined) : undefined,
        remarks: props.hrRemarks,
        date: props.hrApprovedAt
    });
    steps.push({
        label: 'Finance',
        status: currentStatus === 'PENDING_FINANCE' ? 'current' : 'pending'
    });

    return steps;
}

const stepConfig = {
    completed: {
        circle: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
        label: 'text-emerald-700',
        line: 'bg-emerald-400',
    },
    current: {
        circle: 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 ring-4 ring-primary/10',
        label: 'text-primary font-bold',
        line: 'bg-border',
    },
    pending: {
        circle: 'bg-muted border-2 border-border text-muted-foreground',
        label: 'text-muted-foreground',
        line: 'bg-border',
    },
    rejected: {
        circle: 'bg-rose-500 text-white shadow-sm shadow-rose-200',
        label: 'text-rose-600',
        line: 'bg-rose-300',
    },
};

const statusIcons = {
    completed: <CheckCircle2 className="size-3.5" />,
    current: <Clock className="size-3.5" />,
    pending: <div className="size-2 rounded-full bg-current" />,
    rejected: <XCircle className="size-3.5" />,
};

export function ApprovalTimeline(props: ApprovalTimelineProps) {
    const steps = getSteps(props);

    if (props.compact) {
        return (
            <div className="flex items-center gap-1.5 flex-wrap">
                {steps.map((step, i) => {
                    let dotColor = 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600';
                    if (step.status === 'completed') dotColor = 'bg-emerald-500 text-white';
                    if (step.status === 'current') dotColor = 'bg-amber-500 text-white animate-pulse';
                    if (step.status === 'rejected') dotColor = 'bg-rose-500 text-white';

                    return (
                        <div key={step.label} className="flex items-center gap-1" title={`${step.label}: ${step.status}${step.approver ? ` (${step.approver})` : ''}`}>
                            <div className={`size-4 rounded-full flex items-center justify-center text-[8px] font-black ${dotColor}`}>
                                {step.status === 'completed' ? '✓' : step.status === 'rejected' ? '✗' : ''}
                            </div>
                            <span className={`text-[11px] font-bold ${step.status === 'current' ? 'text-amber-600 dark:text-amber-400' : step.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {step.label}
                            </span>
                            {i < steps.length - 1 && <span className="text-muted-foreground/30 text-[10px]">&rarr;</span>}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="flex items-start">
            {steps.map((step, i) => {
                const config = stepConfig[step.status];
                return (
                    <React.Fragment key={step.label}>
                        <div className="flex flex-col items-center gap-1 min-w-[72px]">
                            <div className={`size-7 rounded-full flex items-center justify-center transition-all ${config.circle}`}>
                                {statusIcons[step.status]}
                            </div>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.label}`}>
                                {step.label}
                            </span>
                            {step.approver && (
                                <span className="text-[9px] text-muted-foreground text-center leading-tight max-w-[72px] truncate" title={step.approver}>
                                    {step.approver}
                                </span>
                            )}
                            {step.date && (
                                <span className="text-[8px] text-muted-foreground/60 text-center leading-tight">
                                    {formatDate(step.date)}
                                </span>
                            )}
                            {step.remarks && (
                                <span className="text-[8px] text-muted-foreground/60 text-center leading-tight max-w-[72px] truncate italic" title={step.remarks}>
                                    &ldquo;{step.remarks}&rdquo;
                                </span>
                            )}
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-[2px] min-w-[16px] mt-[10px] rounded-full ${config.line}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        PENDING_MANAGER: 'Pending Manager',
        PENDING_HR: 'Pending HR',
        PENDING_FINANCE: 'Pending Finance',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        SETTLED: 'Settled',
        PENDING: 'Pending',
    };
    return labels[status] || status;
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        PENDING_MANAGER: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        PENDING_HR: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        PENDING_FINANCE: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        APPROVED: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        REJECTED: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        SETTLED: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        PENDING: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return colors[status] || 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-muted text-muted-foreground border-border';
}

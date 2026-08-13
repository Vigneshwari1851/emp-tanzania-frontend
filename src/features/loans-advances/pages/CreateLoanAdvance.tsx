import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { usePayroll } from '@/features/payroll/context/PayrollContext';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { ArrowLeft, Banknote, TrendingUp, HandCoins } from 'lucide-react';
import * as loanConfig from '../services/loan-config';

export function CreateLoanAdvance() {
    const { currencySymbol } = useCurrency();
    const { employees } = usePayroll();
    const navigate = useOrgNavigate();

    const [policies, setPolicies] = useState<any[]>([]);
    const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
    const [employeeId, setEmployeeId] = useState('');
    const [type, setType] = useState('loan');
    const [principal, setPrincipal] = useState('');
    const [monthly, setMonthly] = useState('');
    const [duration, setDuration] = useState('');
    const [bypassWorkflow, setBypassWorkflow] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const data = await loanConfig.getLoanTypes();
                // Filter active policies
                setPolicies((data || []).filter((p: any) => p.isActive));
            } catch {
                toast.error('Failed to load loan policies');
            }
        };
        fetchPolicies();
    }, []);

    const activePolicy = policies.find(p => String(p.id) === selectedPolicyId);

    const calculateEMI = (amountStr: string, durationStr: string) => {
        const p = parseFloat(amountStr);
        const d = parseFloat(durationStr);
        if (isNaN(p) || isNaN(d) || d <= 0) {
            setMonthly('');
            return;
        }

        const rate = activePolicy ? Number(activePolicy.interestRate) : 0;
        const method = activePolicy ? activePolicy.repaymentMethod : 'EMI';

        let emiVal: number;
        if (method === 'ONE_TIME') {
            emiVal = p;
        } else {
            const ratePerMonth = rate / 12 / 100;
            if (ratePerMonth > 0) {
                emiVal = (p * ratePerMonth * Math.pow(1 + ratePerMonth, d)) / (Math.pow(1 + ratePerMonth, d) - 1);
            } else {
                emiVal = p / d;
            }
        }
        setMonthly(Math.ceil(emiVal).toString());
    };

    const handlePrincipalChange = (val: string) => {
        setPrincipal(val);
        calculateEMI(val, duration);
    };

    const handleDurationChange = (val: string) => {
        setDuration(val);
        calculateEMI(principal, val);
    };

    const handleSubmit = async () => {
        if (!employeeId || !selectedPolicyId || !principal || !monthly) {
            toast.error('Please fill in all required fields');
            return;
        }

        const pVal = Number(principal);
        const dVal = Number(duration);

        if (activePolicy) {
            if (pVal < Number(activePolicy.minAmount)) {
                toast.error(`Minimum amount for this policy is ${currencySymbol}${Number(activePolicy.minAmount).toLocaleString()}`);
                return;
            }
            if (pVal > Number(activePolicy.maxAmount)) {
                toast.error(`Maximum amount for this policy is ${currencySymbol}${Number(activePolicy.maxAmount).toLocaleString()}`);
                return;
            }
            if (dVal > Number(activePolicy.maxTenure)) {
                toast.error(`Maximum tenure for this policy is ${activePolicy.maxTenure} months`);
                return;
            }
        }

        try {
            setSubmitting(true);
            const payload = {
                loanTypeId: Number(selectedPolicyId),
                requestedAmount: pVal,
                tenure: dVal,
                reason: `Issued by Admin (Bypass Workflow: ${bypassWorkflow})`,
                userDetailId: Number(employeeId),
                bypassWorkflow: bypassWorkflow
            };
            await loanConfig.createApplication(payload);
            toast.success(`${activePolicy ? activePolicy.name : 'Financial aid'} issued successfully!`);
            navigate('/loans-advances');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to issue loan/advance');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50/50 p-3 sm:p-5 dark:bg-gray-950 flex flex-col gap-4">
            {/* Header */}
            <div className="pt-2 flex justify-between items-center w-full mb-2">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
                        <HandCoins className="h-5 w-5 text-primary shrink-0" />
                        <span>Issue New Loan / Advance</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-xs font-medium">Issue financial aids to employees using configured loan policies</p>
                </div>
                <button
                    onClick={() => navigate('/loans-advances')}
                    className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" /> Back to Financial Aids
                </button>
            </div>

            {/* Form */}
            <div className="mt-2">
                <div className="w-full rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
                    <div className="flex items-center gap-3 mb-2 pb-3 border-b border-border">
                        <div className="p-2 rounded-xl">
                            {type === 'loan' ? <Banknote className="size-5 text-primary" /> : <TrendingUp className="size-5 text-primary" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Policy & Recipient</h2>
                            <p className="text-xs text-muted-foreground">Select policy and recipient employee details below</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Section 1: Policy Selection & Employee */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-1.5 mb-1">
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-500">
                                    Classification & Recipient
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="flex flex-col justify-end space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Select Policy *</Label>
                                    <Select value={selectedPolicyId} onValueChange={(val) => {
                                        setSelectedPolicyId(val);
                                        const policy = policies.find(p => String(p.id) === val);
                                        if (policy) {
                                            setType(policy.category.toLowerCase());
                                            setPrincipal(String(policy.maxAmount));
                                            setDuration(String(policy.maxTenure));
                                            // Calculate monthly emi
                                            const p = Number(policy.maxAmount);
                                            const d = Number(policy.maxTenure);
                                            const rate = Number(policy.interestRate) || 0;
                                            const method = policy.repaymentMethod || 'EMI';
                                            let emiVal: number;
                                            if (method === 'ONE_TIME') {
                                                emiVal = p;
                                            } else {
                                                const ratePerMonth = rate / 12 / 100;
                                                if (ratePerMonth > 0) {
                                                    emiVal = (p * ratePerMonth * Math.pow(1 + ratePerMonth, d)) / (Math.pow(1 + ratePerMonth, d) - 1);
                                                } else {
                                                    emiVal = p / d;
                                                }
                                            }
                                            setMonthly(Math.ceil(emiVal).toString());
                                        }
                                    }}>
                                        <SelectTrigger className="rounded-lg h-11 border-border bg-card shadow-sm"><SelectValue placeholder="Select Loan/Advance Policy" /></SelectTrigger>
                                        <SelectContent className="rounded-xl max-h-64 overflow-y-auto" side="bottom" align="start" sideOffset={6}>
                                            {policies.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.code})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col justify-end space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Employee *</Label>
                                    <Select value={employeeId} onValueChange={setEmployeeId}>
                                        <SelectTrigger className="rounded-lg h-11 border-border bg-card shadow-sm"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                        <SelectContent className="rounded-xl max-h-64 overflow-y-auto" side="bottom" align="start" sideOffset={6}>
                                            {employees.map((emp: any) => (
                                                <SelectItem key={emp.id} value={emp.details?.id?.toString() || emp.id.toString()}>{emp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col justify-end space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Category</Label>
                                    <Input value={type === 'loan' ? 'Loan' : 'Salary Advance'} disabled className="rounded-lg h-11 border-border bg-muted text-muted-foreground capitalize" />
                                </div>
                            </div>

                            {activePolicy && (
                                <div className="bg-slate-50 dark:bg-zinc-900 border border-border rounded-xl p-4 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in duration-200 mt-2">
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Repayment Method</p>
                                        <p className="font-bold text-foreground mt-0.5">{activePolicy.repaymentMethod.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Allowed Amount Limits</p>
                                        <p className="font-bold text-foreground mt-0.5">{currencySymbol}{Number(activePolicy.minAmount).toLocaleString()} - {currencySymbol}{Number(activePolicy.maxAmount).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Interest Rate</p>
                                        <p className="font-bold text-foreground mt-0.5">{activePolicy.interestRate}%</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Max Term</p>
                                        <p className="font-bold text-foreground mt-0.5">{activePolicy.maxTenure} months</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 2 (Repayment & Financial Terms): Requested Amount, Tenure Months, Monthly EMI */}
                        <div className="space-y-3 pt-4 border-t border-border">
                            <div className="flex items-center gap-1.5 mb-1">
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-500">
                                    Requested Amount & Tenure
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="flex flex-col justify-end space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Requested Amount ({currencySymbol}) *</Label>
                                    <Input type="number" placeholder="e.g. 10000" value={principal} onChange={(e) => handlePrincipalChange(e.target.value)} className="rounded-lg h-11 border-border bg-card" />
                                </div>

                                <div className="flex flex-col justify-end space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tenure Months *</Label>
                                    <Input type="number" placeholder="e.g. 5" value={duration} onChange={(e) => handleDurationChange(e.target.value)} className="rounded-lg h-11 border-border bg-card" />
                                </div>

                                <div className="flex flex-col justify-end space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Monthly Recovery EMI ({currencySymbol})</Label>
                                    <Input type="number" placeholder="Auto-calculated" value={monthly} disabled className="rounded-lg h-11 border-border bg-muted text-muted-foreground" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3 (Bypass Workflow Checkbox) */}
                        <div className="flex items-center gap-2.5 py-2.5 px-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/10">
                            <input
                                type="checkbox"
                                id="bypassWorkflow"
                                checked={bypassWorkflow}
                                onChange={(e) => setBypassWorkflow(e.target.checked)}
                                className="rounded border-slate-300 dark:border-zinc-700 text-primary focus:ring-primary/20 size-4 cursor-pointer"
                            />
                            <Label htmlFor="bypassWorkflow" className="text-xs font-bold text-foreground cursor-pointer uppercase tracking-wider select-none">
                                Issue directly as Approved (bypasses multi-level approval steps)
                            </Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/loans-advances')}
                            className="px-6 h-11 rounded-xl font-bold border-border"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-6 bg-primary hover:bg-primary/95 text-primary-foreground h-11 rounded-xl font-bold"
                        >
                            {submitting ? 'Creating...' : `Issue ${type === 'loan' ? 'Loan' : 'Advance'}`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

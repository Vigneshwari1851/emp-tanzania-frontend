import { useMemo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Info, Calculator, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CompensationSplit } from '../pages/AddEmployee';
import Select from "@/shared/components/ui/Select";
import { useCurrency } from '@/shared/hooks/useCurrency';
import { getActiveTzTaxPolicy } from '@/features/payroll/services/payroll';

interface CompensationSectionProps {
  formData: any;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isEmployee: boolean;
  id: string | undefined;
  compensationSplits: CompensationSplit[];
  setCompensationSplits: React.Dispatch<React.SetStateAction<CompensationSplit[]>>;
  payrollGroups?: any[];
  isSuperAdmin?: boolean;
  canManagePayroll?: boolean;
  readOnly?: boolean;
}

const CompensationSection: React.FC<CompensationSectionProps> = ({
  formData,
  formErrors,
  setFormErrors,
  handleInputChange,
  isEmployee,
  id,
  compensationSplits,
  setCompensationSplits,
  payrollGroups = [],
  canManagePayroll = true,
  readOnly = false }) => {
  const { currencySymbol: orgSymbol, isTanzania: orgIsTanzania } = useCurrency();
  const [activePolicy, setActivePolicy] = useState<any>(null);

  useEffect(() => {
    if (!orgIsTanzania) return;
    getActiveTzTaxPolicy().then(policy => {
      if (policy) setActivePolicy(policy);
    }).catch(() => {});
  }, [orgIsTanzania]);

  const computedSplitsFromGroup = useMemo(() => {
    if (compensationSplits.length > 0 || !isEmployee || !id) return null;
    const ctc = parseFloat(formData.baseSalary) || 0;
    if (ctc <= 0) return null;

    const groupId = formData.payrollGroupId;
    const activeGroup = payrollGroups.find(g => g.id?.toString() === groupId?.toString());
    if (!activeGroup?.salary_structure || !Array.isArray(activeGroup.salary_structure.components)) return null;

    let currentSum = 0;
    const calculatedSplits = activeGroup.salary_structure.components.map((c: any) => {
      const comp = c.salary_component || c;
      const calcType = comp.calculation_type || comp.calculationType;
      const val = parseFloat(comp.value || c.value) || 0;
      const amount = calcType === 'percentage' || calcType === 'Percentage' ? (ctc * val) / 100 : val;
      const finalAmount = amount > 0 ? Math.round(amount) : 0;
      currentSum += finalAmount;
      return {
        componentType: comp.name || c.name || "Unknown",
        amount: finalAmount.toString(),
        frequency: "Monthly",
        type: (comp.type || c.type) as 'earning' | 'deduction'
      };
    });

    const remainingCTC = ctc - currentSum;
    if (remainingCTC > 0) {
      const specialIndex = calculatedSplits.findIndex((s: any) => s.componentType.toLowerCase().includes('special allowance'));
      if (specialIndex >= 0) {
        calculatedSplits[specialIndex].amount = (parseInt(calculatedSplits[specialIndex].amount) + remainingCTC).toString();
      } else {
        calculatedSplits.push({
          componentType: "Special Allowance",
          amount: Math.round(remainingCTC).toString(),
          frequency: "Monthly",
          type: 'earning'
        });
      }
    }
    return calculatedSplits;
  }, [compensationSplits, formData.baseSalary, formData.payrollGroupId, isEmployee, id, payrollGroups]);

  const effectiveBaseSplits = computedSplitsFromGroup || compensationSplits;

  const effectiveCompensationSplits = useMemo(() => {
    if (!orgIsTanzania) return effectiveBaseSplits;
    const gross = parseFloat(formData.baseSalary) || 0;
    if (gross <= 0) return compensationSplits;

    const empNssfRate = activePolicy ? parseFloat(activePolicy.employee_nssf_rate?.toString() || '0.10') : 0.10;
    const personalReliefMonthly = activePolicy ? Math.round(parseFloat(activePolicy.personal_relief_annual?.toString() || '270000') / 12) : Math.round(270000 / 12);
    const disabilityReliefMonthly = formData.isDisabled ? personalReliefMonthly : 0;
    const employeeNSSF = Math.round(gross * empNssfRate);
    const taxableIncome = Math.max(0, gross - employeeNSSF);

    const payeSlabs = activePolicy?.paye_slabs || [
      { lowerLimit: 0, upperLimit: 270000, rate: 0, fixedAmount: 0 },
      { lowerLimit: 270001, upperLimit: 520000, rate: 8, fixedAmount: 0 },
      { lowerLimit: 520001, upperLimit: 760000, rate: 20, fixedAmount: 20000 },
      { lowerLimit: 760001, upperLimit: 1000000, rate: 25, fixedAmount: 68000 },
      { lowerLimit: 1000001, upperLimit: null, rate: 30, fixedAmount: 128000 },
    ];

    let payeBeforeRelief = 0;
    const matchedSlab = payeSlabs.find((s: any) => {
      const max = s.upperLimit === null || s.upperLimit === undefined ? Infinity : s.upperLimit;
      return taxableIncome >= s.lowerLimit && taxableIncome <= max;
    });
    if (matchedSlab) {
      const excessBase = matchedSlab.lowerLimit > 0 ? matchedSlab.lowerLimit - 1 : 0;
      payeBeforeRelief = Math.round(matchedSlab.fixedAmount + (taxableIncome - excessBase) * (matchedSlab.rate / 100));
    }
    const totalRelief = personalReliefMonthly + disabilityReliefMonthly;
    const correctPAYE = Math.max(0, payeBeforeRelief - totalRelief);

    return effectiveBaseSplits.map((split: CompensationSplit) => {
      const name = (split.componentType || '').toLowerCase();
      if (name.includes('paye') || name.includes('tax')) {
        return { ...split, amount: correctPAYE.toString() };
      }
      if (name.includes('nssf') && split.type === 'deduction') {
        return { ...split, amount: employeeNSSF.toString() };
      }
      return split;
    });
  }, [effectiveBaseSplits, formData.baseSalary, formData.isDisabled, orgIsTanzania, activePolicy]);

  const totalCompensationBreakdown = useMemo(() => {
    return effectiveCompensationSplits.reduce((sum: number, split: CompensationSplit) => {
      const amount = parseFloat(split.amount) || 0;
      return split.type === 'deduction' ? sum - amount : sum + amount;
    }, 0);
  }, [effectiveCompensationSplits]);
  const currentSymbol = orgSymbol;

  const ctcPaddingClass = useMemo(() => {
    if (!currentSymbol) return "pl-8";
    if (currentSymbol.length > 2) return "pl-14";
    if (currentSymbol.length > 1) return "pl-11";
    return "pl-8";
  }, [currentSymbol]);

  const splitPaddingClass = useMemo(() => {
    if (!currentSymbol) return "pl-7";
    if (currentSymbol.length > 2) return "pl-12";
    if (currentSymbol.length > 1) return "pl-9";
    return "pl-7";
  }, [currentSymbol]);

  const tzTaxPreview = useMemo(() => {
    if (!orgIsTanzania) return null;
    const gross = parseFloat(formData.baseSalary) || 0;
    if (gross <= 0) return null;

    const empNssfRate = activePolicy ? parseFloat(activePolicy.employee_nssf_rate?.toString() || '0.10') : 0.10;
    const empyrNssfRate = activePolicy ? parseFloat(activePolicy.employer_nssf_rate?.toString() || '0.10') : 0.10;
    const sdlRate = activePolicy ? parseFloat(activePolicy.sdl_rate?.toString() || '0.035') : 0.035;
    const wcfRate = activePolicy ? parseFloat(activePolicy.wcf_rate?.toString() || '0.005') : 0.005;
    const heslbRate = activePolicy ? parseFloat(activePolicy.heslb_rate?.toString() || '0.15') : 0.15;
    const personalReliefMonthly = activePolicy ? Math.round(parseFloat(activePolicy.personal_relief_annual?.toString() || '270000') / 12) : Math.round(270000 / 12);
    const disabilityReliefMonthly = formData.isDisabled ? personalReliefMonthly : 0;

    const payeSlabs = activePolicy?.paye_slabs || [
      { lowerLimit: 0, upperLimit: 270000, rate: 0, fixedAmount: 0 },
      { lowerLimit: 270001, upperLimit: 520000, rate: 8, fixedAmount: 0 },
      { lowerLimit: 520001, upperLimit: 760000, rate: 20, fixedAmount: 20000 },
      { lowerLimit: 760001, upperLimit: 1000000, rate: 25, fixedAmount: 68000 },
      { lowerLimit: 1000001, upperLimit: null, rate: 30, fixedAmount: 128000 },
    ];

    const employeeNSSF = Math.round(gross * empNssfRate);
    const employerNSSF = Math.round(gross * empyrNssfRate);
    const taxableIncome = Math.max(0, gross - employeeNSSF);

    let payeBeforeRelief = 0;
    const matchedSlab = payeSlabs.find((s: any) => {
      const max = s.upperLimit === null || s.upperLimit === undefined ? Infinity : s.upperLimit;
      return taxableIncome >= s.lowerLimit && taxableIncome <= max;
    });
    if (matchedSlab) {
      const excessBase = matchedSlab.lowerLimit > 0 ? matchedSlab.lowerLimit - 1 : 0;
      payeBeforeRelief = Math.round(matchedSlab.fixedAmount + (taxableIncome - excessBase) * (matchedSlab.rate / 100));
    }
    const totalRelief = personalReliefMonthly + disabilityReliefMonthly;
    const paye = Math.max(0, payeBeforeRelief - totalRelief);

    const heslb = formData.isHeslbBeneficiary ? Math.round(gross * heslbRate) : 0;
    const sdl = Math.round(gross * sdlRate);
    const wcf = Math.round(gross * wcfRate);

    const totalEmployeeDeductions = employeeNSSF + paye + heslb;
    const netPay = gross - totalEmployeeDeductions;
    const totalEmployerCost = gross + employerNSSF + sdl + wcf;

    return {
      gross, employeeNSSF, employerNSSF, taxableIncome, payeBeforeRelief,
      personalReliefMonthly, disabilityReliefMonthly, totalRelief, paye,
      heslb, sdl, wcf, totalEmployeeDeductions, netPay, totalEmployerCost,
      slab: matchedSlab, empNssfRate, empyrNssfRate, sdlRate, wcfRate,
    };
  }, [formData.baseSalary, formData.isHeslbBeneficiary, formData.isDisabled, orgIsTanzania, activePolicy]);


  const updateCompensationSplit = (index: number, field: keyof CompensationSplit, value: string) => {
    const updated = [...compensationSplits];
    (updated[index] as any)[field] = value;
    setCompensationSplits(updated);

    if (field === "amount" || field === "componentType") {
      // Clear potential breakdown errors when user is fixing them
      if (formErrors.compensationBreakdown) {
        setFormErrors(prev => {
          const { compensationBreakdown, ...rest } = prev;
          return rest;
        });
      }
    }
  };


  return (
    <div id="compensation" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24`}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-base font-semibold text-foreground">Earnings & Payroll Assignment</h3>
        {!isEmployee && !id && (
          <span className="text-[10px] font-bold text-primarybg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-tighter">
            Group Based
          </span>
        )}
      </div>

      {isEmployee && id ? (
        <div className="bg-card rounded border border-border shadow-sm overflow-hidden min-w-[400px]">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 items-start relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-50">
                <div className="flex items-center gap-2 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-[14px] font-semibold">Earnings</span>
                </div>
                <span className="text-[14px] font-semibold text-emerald-600">
                  {currentSymbol} {effectiveCompensationSplits
                    .filter((s: CompensationSplit) => s.type === 'earning' && parseFloat(s.amount) > 0)
                    .reduce((sum: number, s: CompensationSplit) => sum + parseFloat(s.amount), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="space-y-1.5">
                {effectiveCompensationSplits
                  .filter((s: CompensationSplit) => s.type === 'earning' && parseFloat(s.amount) > 0)
                  .map((item: CompensationSplit, idx: number) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 bg-[#f0fdf4] dark:bg-emerald-950/30 rounded group transition-all hover:bg-[#e6fcf0] dark:hover:bg-emerald-950/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                        <div>
                          <p className="text-[13px] font-medium text-foreground leading-tight">{item.componentType}</p>
                          <p className="text-[11px] text-muted-foreground font-medium">Monthly Earning</p>
                        </div>
                      </div>
                      <span className="text-[14px] font-medium text-emerald-700 dark:text-emerald-400">{currentSymbol} {parseFloat(item.amount).toLocaleString()}</span>
                    </div>
                  ))}
                {effectiveCompensationSplits.filter((s: CompensationSplit) => s.type === 'earning').length === 0 && (
                   <p className="text-[11px] text-muted-foreground text-center py-4 italic">No earning components found</p>
                )}
              </div>
            </div>
            <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-muted -translate-x-1/2" />
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-rose-50 dark:border-rose-950">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-[14px] font-semibold">Deductions</span>
                </div>
                <span className="text-[14px] font-semibold text-rose-600 dark:text-rose-400">
                  {currentSymbol} {effectiveCompensationSplits
                    .filter((s: CompensationSplit) => s.type === 'deduction' && parseFloat(s.amount) > 0)
                    .reduce((sum: number, s: CompensationSplit) => sum + parseFloat(s.amount), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="space-y-1.5">
                {effectiveCompensationSplits
                  .filter((s: CompensationSplit) => s.type === 'deduction' && parseFloat(s.amount) > 0)
                  .map((item: CompensationSplit, idx: number) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 bg-[#fef2f2] dark:bg-rose-950/30 rounded group transition-all hover:bg-[#fff1f1] dark:hover:bg-rose-950/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                        <div>
                          <p className="text-[13px] font-medium text-foreground leading-tight">{item.componentType}</p>
                          <p className="text-[11px] text-muted-foreground font-medium">Monthly Deduction</p>
                        </div>
                      </div>
                      <span className="text-[14px] font-medium text-rose-600 dark:text-rose-400">{currentSymbol} {parseFloat(item.amount).toLocaleString()}</span>
                    </div>
                  ))}
                {effectiveCompensationSplits.filter((s: CompensationSplit) => s.type === 'deduction').length === 0 && (
                   <p className="text-[11px] text-muted-foreground text-center py-4 italic">No specific deductions found</p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-[#EEF2FF] dark:bg-primary-950/50 px-6 py-5 flex items-center justify-between border-t border-primary-100 dark:border-primary-900/40">
            <div>
              <p className="text-[13px] font-semibold text-primary-800 dark:text-primary-200">Net Take Home Salary</p>
              <p className="text-[11px] text-primary-400 dark:text-primary-400 font-medium">Total Earnings - Total Deductions</p>
            </div>
            <div className="text-[20px] font-semibold text-blue-800 dark:text-primary-300">
              {currentSymbol} {(
                effectiveCompensationSplits
                  .filter((s: CompensationSplit) => s.type === 'earning')
                  .reduce((sum: number, s: CompensationSplit) => sum + parseFloat(s.amount), 0) -
                effectiveCompensationSplits
                  .filter((s: CompensationSplit) => s.type === 'deduction')
                  .reduce((sum: number, s: CompensationSplit) => sum + parseFloat(s.amount), 0)
              ).toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card p-5 rounded border border-border shadow-sm space-y-6">
          {/* Header with Group Info */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h4 className="text-[12px] font-medium text-foreground">Compensation Details</h4>
              <p className="text-xs text-muted-foreground">{orgIsTanzania ? 'Manage Gross Salary and earnings breakdown' : 'Manage CTC and earnings breakdown'}</p>
            </div>
            {formData.payrollGroupId && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded border border-blue-100">
                <span className="text-[10px] font-black text-primaryuppercase tracking-wider">Group:</span>
                <span className="text-[11px] font-bold text-blue-700">
                  {payrollGroups.find(g => g.id.toString() === formData.payrollGroupId.toString())?.name}
                </span>
              </div>
            )}
          </div>

          <div className="max-w-md">
            <label className="block text-[13px] font-bold text-foreground mb-2">
              {orgIsTanzania ? 'Gross Salary (Base)' : 'CTC (Cost to Company)'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">{currentSymbol}</span>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleInputChange}
                onBlur={() => {
                  const val = parseFloat(formData.baseSalary);
                  if (formData.baseSalary && val < 699000) {
                    setFormErrors(prev => ({ ...prev, baseSalary: 'Base salary must be at least TZS 699,000' }));
                  } else {
                    setFormErrors(prev => { const { baseSalary, ...rest } = prev; return rest; });
                  }
                }}
                readOnly={readOnly}
                min="699000"
                className={`w-full ${ctcPaddingClass} pr-4 py-2.5 bg-card border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all ${formErrors.baseSalary ? 'border-red-400' : 'border-border'} ${readOnly ? 'cursor-default opacity-90' : ''}`}
                placeholder={orgIsTanzania ? "Min TZS 699,000" : "Enter CTC"}
              />
            </div>
            {formErrors.baseSalary && <p className="text-xs text-red-500 mt-1">{formErrors.baseSalary}</p>}
          </div>

          {!formData.payrollGroupId && payrollGroups.length === 0 ? (
            readOnly ? null : (
              <div className="pt-6 text-center">
                <p className="text-[13px] font-bold text-foreground">Salary Breakdown Not Set Up</p>
                <p className="text-[12px] text-muted-foreground mt-1">Configure your Payroll Groups and structures to automatically display the earnings and deductions breakdown here.</p>
              </div>
            )
          ) : (
            <div className="pt-4 space-y-6">
              {/* Earnings Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 px-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Earnings</span>
                </div>
                <div className="space-y-2">
                  {effectiveCompensationSplits
                    .filter((s: CompensationSplit) => s.type === 'earning')
                    .map((split: CompensationSplit, idx: number) => {
                      // Find actual index in original array for potential updates
                      const originalIndex = compensationSplits.findIndex(s => s === split);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50/40 rounded border border-emerald-100/50 group transition-all hover:bg-emerald-50/60">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={split.componentType}
                              readOnly
                              className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-bold text-foreground cursor-default"
                              placeholder="Component Name"
                            />
                            <p className="text-[10px] text-emerald-600/70 font-medium px-0.5 mt-0.5">Salary Earning</p>
                          </div>
                          <div className="w-44 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-bold">{currentSymbol}</span>
                            <input
                              type="number"
                              value={split.amount}
                              readOnly
                              className={`w-full ${splitPaddingClass} pr-3 py-2 bg-emerald-50/50 border border-emerald-100/60 rounded text-sm text-right font-black text-emerald-700 cursor-default`}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-600 px-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Deductions</span>
                </div>
                <div className="space-y-2">
                  {effectiveCompensationSplits
                    .filter((s: CompensationSplit) => s.type === 'deduction')
                    .map((split: CompensationSplit, idx: number) => {
                      const originalIndex = compensationSplits.findIndex(s => s === split);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-rose-50/30 rounded border border-rose-100/50 group transition-all hover:bg-rose-50/50">
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={split.componentType}
                              readOnly
                              className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-bold text-foreground cursor-default"
                              placeholder="Component Name"
                            />
                            <p className="text-[10px] text-rose-600/70 font-medium px-0.5 mt-0.5">Monthly Deduction</p>
                          </div>
                          <div className="w-44 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">{currentSymbol}</span>
                            <input
                              type="number"
                              value={split.amount}
                              readOnly
                              className={`w-full ${splitPaddingClass} pr-3 py-2 bg-rose-50/50 border border-rose-100/60 rounded text-sm text-right font-black text-rose-700 cursor-default`}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      );
                    })}
                  {effectiveCompensationSplits.filter((s: CompensationSplit) => s.type === 'deduction').length === 0 && (
                     <p className="text-center py-4 text-xs text-muted-foreground italic bg-muted/50 rounded border border-dashed border-border">No deductions assigned to this group</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between overflow-hidden relative gap-4">
            <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-10">
              <TrendingUp className="size-48 text-blue-600" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{orgIsTanzania ? 'Total Gross Salary Summary' : 'Total CTC Summary'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-800 dark:text-blue-200">{currentSymbol} {parseFloat(formData.baseSalary || "0").toLocaleString()}</span>
              </div>
            </div>
            <div className="relative z-10 text-right">
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Sum of Breakdown</p>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
                {currentSymbol} {totalCompensationBreakdown.toLocaleString()}
              </p>
            </div>
          </div>

          {tzTaxPreview && (
            <div className="mt-6 border border-border rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-border flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span className="text-[12px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Statutory Deduction Preview</span>
                <span className="text-[10px] font-medium text-blue-500 dark:text-blue-400 ml-1">(Estimated — not saved)</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Employee Deductions</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-3 py-2 bg-emerald-50/40 rounded border border-emerald-100/50">
                        <span className="text-[12px] font-medium text-foreground">Employee NSSF (10%)</span>
                        <span className="text-[13px] font-bold text-emerald-700">{currentSymbol} {tzTaxPreview.employeeNSSF.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2 bg-emerald-50/40 rounded border border-emerald-100/50">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-medium text-foreground">PAYE Tax</span>
                          {tzTaxPreview.paye === 0 && tzTaxPreview.gross > 0 && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">EXEMPT</span>
                          )}
                        </div>
                        <span className="text-[13px] font-bold text-emerald-700">{currentSymbol} {tzTaxPreview.paye.toLocaleString()}</span>
                      </div>
                      {formData.isDisabled && tzTaxPreview.disabilityReliefMonthly > 0 && (
                        <div className="flex justify-between items-center px-3 py-2 bg-blue-50/40 rounded border border-blue-100/50">
                          <span className="text-[11px] font-medium text-blue-600">↳ Disability Relief</span>
                          <span className="text-[12px] font-bold text-blue-600">-{currentSymbol} {tzTaxPreview.disabilityReliefMonthly.toLocaleString()}</span>
                        </div>
                      )}
                      {tzTaxPreview.heslb > 0 && (
                        <div className="flex justify-between items-center px-3 py-2 bg-emerald-50/40 rounded border border-emerald-100/50">
                          <span className="text-[12px] font-medium text-foreground">HESLB Loan (15%)</span>
                          <span className="text-[13px] font-bold text-emerald-700">{currentSymbol} {tzTaxPreview.heslb.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center px-3 py-2 bg-rose-50/60 rounded border border-rose-200/60 mt-2">
                        <span className="text-[12px] font-bold text-foreground">Total Employee Deductions</span>
                        <span className="text-[14px] font-black text-rose-700">{currentSymbol} {tzTaxPreview.totalEmployeeDeductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Employer Contributions</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-3 py-2 bg-blue-50/40 rounded border border-blue-100/50">
                        <span className="text-[12px] font-medium text-foreground">Employer NSSF ({(tzTaxPreview.empyrNssfRate * 100).toFixed(1)}%)</span>
                        <span className="text-[13px] font-bold text-blue-700">{currentSymbol} {tzTaxPreview.employerNSSF.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2 bg-blue-50/40 rounded border border-blue-100/50">
                        <span className="text-[12px] font-medium text-foreground">SDL ({(tzTaxPreview.sdlRate * 100).toFixed(1)}%)</span>
                        <span className="text-[13px] font-bold text-blue-700">{currentSymbol} {tzTaxPreview.sdl.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2 bg-blue-50/40 rounded border border-blue-100/50">
                        <span className="text-[12px] font-medium text-foreground">WCF ({(tzTaxPreview.wcfRate * 100).toFixed(1)}%)</span>
                        <span className="text-[13px] font-bold text-blue-700">{currentSymbol} {tzTaxPreview.wcf.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center border border-emerald-100 dark:border-emerald-900/50">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Estimated Net Pay</p>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{currentSymbol} {tzTaxPreview.netPay.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center border border-blue-100 dark:border-blue-900/50">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Employer Cost</p>
                      <p className="text-xl font-black text-blue-700 dark:text-blue-400">{currentSymbol} {tzTaxPreview.totalEmployerCost.toLocaleString()}</p>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-4 text-center border border-violet-100 dark:border-violet-900/50">
                      <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Tax Slab Applied</p>
                      <p className="text-[13px] font-bold text-violet-700 dark:text-violet-400">
                        {tzTaxPreview.paye === 0 && tzTaxPreview.gross > 0
                          ? '0% (Under Threshold)'
                          : tzTaxPreview.slab
                            ? `${tzTaxPreview.slab.rate}%`
                            : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CompensationSection;

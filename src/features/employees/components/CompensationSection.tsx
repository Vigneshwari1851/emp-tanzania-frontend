import { useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import type { CompensationSplit } from '../pages/AddEmployee';
import Select from "@/shared/components/ui/Select";
import { useCurrency } from '@/shared/hooks/useCurrency';

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
  const totalCompensationBreakdown = useMemo(() => {
    return compensationSplits.reduce((sum, split) => {
      const amount = parseFloat(split.amount) || 0;
      return split.type === 'deduction' ? sum - amount : sum + amount;
    }, 0);
  }, [compensationSplits]);
  
  const { currencySymbol: currentSymbol } = useCurrency(formData.currency);

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
                  {currentSymbol} {compensationSplits
                    .filter(s => s.type === 'earning' && parseFloat(s.amount) > 0)
                    .reduce((sum, s) => sum + parseFloat(s.amount), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="space-y-1.5">
                {compensationSplits
                  .filter(s => s.type === 'earning' && parseFloat(s.amount) > 0)
                  .map((item, idx) => (
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
                {compensationSplits.filter(s => s.type === 'earning').length === 0 && (
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
                  {currentSymbol} {compensationSplits
                    .filter(s => s.type === 'deduction' && parseFloat(s.amount) > 0)
                    .reduce((sum, s) => sum + parseFloat(s.amount), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="space-y-1.5">
                {compensationSplits
                  .filter(s => s.type === 'deduction' && parseFloat(s.amount) > 0)
                  .map((item, idx) => (
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
                {compensationSplits.filter(s => s.type === 'deduction').length === 0 && (
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
                compensationSplits
                  .filter(s => s.type === 'earning')
                  .reduce((sum, s) => sum + parseFloat(s.amount), 0) -
                compensationSplits
                  .filter(s => s.type === 'deduction')
                  .reduce((sum, s) => sum + parseFloat(s.amount), 0)
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
              <p className="text-xs text-muted-foreground">Manage CTC and earnings breakdown</p>
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
              CTC (Cost to Company) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">{currentSymbol}</span>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleInputChange}
                readOnly={readOnly}
                className={`w-full ${ctcPaddingClass} pr-4 py-2.5 bg-card border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all ${formErrors.baseSalary ? 'border-red-400' : 'border-border'} ${readOnly ? 'cursor-default opacity-90' : ''}`}
                placeholder="Enter CTC"
              />
            </div>
            {formErrors.baseSalary && <p className="text-xs text-red-500 mt-1">{formErrors.baseSalary}</p>}
          </div>

          {!formData.payrollGroupId ? (
            <div className="pt-6 text-center">
              <p className="text-[13px] font-bold text-foreground">Salary Breakdown Not Set Up</p>
              <p className="text-[12px] text-muted-foreground mt-1">Configure your Payroll Groups and structures to automatically display the earnings and deductions breakdown here.</p>
            </div>
          ) : (
            <div className="pt-4 space-y-6">
              {/* Earnings Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 px-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Earnings</span>
                </div>
                <div className="space-y-2">
                  {compensationSplits
                    .filter(s => s.type === 'earning')
                    .map((split, idx) => {
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
                  {compensationSplits
                    .filter(s => s.type === 'deduction')
                    .map((split, idx) => {
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
                  {compensationSplits.filter(s => s.type === 'deduction').length === 0 && (
                     <p className="text-center py-4 text-xs text-muted-foreground italic bg-muted/50 rounded border border-dashed border-border">No deductions assigned to this group</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-6 bg-primary rounded shadow-sm shadow-primary-100 flex flex-col sm:flex-row items-center justify-between text-white overflow-hidden relative gap-4">
            <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-10">
              <TrendingUp className="size-48" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-primary-100 uppercase tracking-widest mb-1">Total CTC Summary</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{formData.currency} {parseFloat(formData.baseSalary || "0").toLocaleString()}</span>
              </div>
            </div>
            <div className="relative z-10 text-right">
              <p className="text-[11px] font-bold text-primary-100 uppercase tracking-widest mb-1">Sum of Breakdown</p>
              <p className="text-2xl font-black text-white/90">
                {formData.currency} {totalCompensationBreakdown.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CompensationSection;

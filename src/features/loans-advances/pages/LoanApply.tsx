import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useAuth } from '@/shared/context/AuthContext';
import {
  Sparkles, Banknote, TrendingUp, CheckCircle2, XCircle, Shield, Clock,
  ArrowLeft, AlertCircle, Info, ChevronRight, FileText
} from 'lucide-react';
import * as loanConfig from '../services/loan-config';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';

export function LoanApply() {
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const [eligibleTypes, setEligibleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [step, setStep] = useState<'browse' | 'apply'>('browse');
  const [formData, setFormData] = useState({ requestedAmount: '', tenure: '', reason: '' });
  const [emiPreview, setEmiPreview] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loanConfig.checkAllEligibility();
      setEligibleTypes(data || []);
    } catch { toast.error('Failed to load loan types'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const calculateEMI = (amount: number, tenure: number, rate: number) => {
    const ratePerMonth = rate / 12 / 100;
    if (ratePerMonth === 0) return Math.ceil(amount / tenure);
    return Math.ceil((amount * ratePerMonth * Math.pow(1 + ratePerMonth, tenure)) / (Math.pow(1 + ratePerMonth, tenure) - 1));
  };

  useEffect(() => {
    if (selectedType && formData.requestedAmount && formData.tenure) {
      const emi = calculateEMI(Number(formData.requestedAmount), Number(formData.tenure), Number(selectedType.loanType.interestRate));
      setEmiPreview(emi);
    } else {
      setEmiPreview(null);
    }
  }, [selectedType, formData.requestedAmount, formData.tenure]);

  const handleSelect = (item: any) => {
    setSelectedType(item);
    setFormData({ requestedAmount: String(item.loanType.maxAmount), tenure: String(item.loanType.maxTenure), reason: '' });
    setStep('apply');
  };

  const handleSubmit = async () => {
    if (!formData.requestedAmount || !formData.tenure || !formData.reason) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      setIsSubmitting(true);
      await loanConfig.createApplication({
        loanTypeId: selectedType.loanType.id,
        requestedAmount: Number(formData.requestedAmount),
        tenure: Number(formData.tenure),
        reason: formData.reason
      });
      toast.success('Application submitted successfully!');
      setStep('browse');
      setSelectedType(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex-1 bg-slate-50/50 min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-primary-800 text-white shadow-xl shadow-blue-500/5">
        <div className="py-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full w-fit backdrop-blur-sm border border-white/5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold tracking-wider uppercase">Apply for Financial Aid</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Loan & Advance Marketplace</h1>
            <p className="text-primary-100/90 text-sm">Browse available loan types, check eligibility, and apply</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {step === 'browse' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {loading ? (
              <div className="text-center py-16"><p className="text-sm text-muted-foreground">Loading loan types...</p></div>
            ) : eligibleTypes.length === 0 ? (
              <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
                <Banknote className="mx-auto size-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-bold text-foreground">No loan types available</p>
                <p className="text-xs text-muted-foreground mt-1">Contact your HR to configure loan types</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eligibleTypes.map((item: any) => {
                  const lt = item.loanType;
                  return (
                    <div key={lt.id} className={`bg-card rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${!item.eligible ? 'opacity-60' : ''}`}>
                      <div className={`px-6 py-4 ${lt.category === 'LOAN' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`size-8 rounded-lg flex items-center justify-center ${lt.category === 'LOAN' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                              {lt.category === 'LOAN' ? <Banknote className="size-4" /> : <TrendingUp className="size-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{lt.name}</p>
                              <p className="text-[10px] text-muted-foreground">{lt.code}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${lt.category === 'LOAN' ? 'bg-blue-200 text-blue-700' : 'bg-purple-200 text-purple-700'}`}>{lt.category}</span>
                        </div>
                      </div>
                      <div className="p-6 space-y-3">
                        {lt.description && <p className="text-xs text-muted-foreground">{lt.description}</p>}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Range:</span> <span className="font-bold">{currencySymbol}{Number(lt.minAmount).toLocaleString()} — {currencySymbol}{Number(lt.maxAmount).toLocaleString()}</span></div>
                          <div><span className="text-muted-foreground">Interest:</span> <span className="font-bold">{lt.interestRate}%</span></div>
                          <div><span className="text-muted-foreground">Max Tenure:</span> <span className="font-bold">{lt.maxTenure} months</span></div>
                          <div><span className="text-muted-foreground">Repayment:</span> <span className="font-bold">{lt.repaymentMethod.replace('_', ' ')}</span></div>
                        </div>
                        {item.eligible ? (
                          <button onClick={() => handleSelect(item)}
                            className="w-full bg-primary hover:bg-primary/95 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                            Apply Now <ChevronRight className="size-4" />
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                              <p className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1"><Shield className="size-3" /> Not Eligible</p>
                              {item.reasons?.map((r: string, i: number) => (
                                <p key={i} className="text-[11px] text-rose-600/80 mt-0.5">• {r}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 'apply' && selectedType && (
          <div className="max-w-lg mx-auto animate-in fade-in duration-300">
            <button onClick={() => setShowCancelConfirm(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="size-4" /> Back to Browse
            </button>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-primary-800 text-white px-6 py-4">
                <h3 className="text-lg font-bold">Apply for {selectedType.loanType.name}</h3>
                <p className="text-primary-200/80 text-xs mt-0.5">Fill in the details below</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Requested Amount ({currencySymbol})</label>
                  <input type="number" value={formData.requestedAmount} onChange={e => setFormData({ ...formData, requestedAmount: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <p className="text-[10px] text-muted-foreground">Range: {currencySymbol}{Number(selectedType.loanType.minAmount).toLocaleString()} — {currencySymbol}{Number(selectedType.loanType.maxAmount).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Repayment Period (Months)</label>
                  <input type="number" value={formData.tenure} onChange={e => setFormData({ ...formData, tenure: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <p className="text-[10px] text-muted-foreground">Maximum: {selectedType.loanType.maxTenure} months</p>
                </div>
                {emiPreview && (
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs font-bold text-primary">Estimated Monthly EMI</span>
                    <span className="text-lg font-black text-primary">{currencySymbol}{emiPreview.toLocaleString()}/mo</span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Reason / Comments</label>
                  <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
                    placeholder="Briefly explain why you need this..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCancelConfirm(true)}
                    className="flex-1 bg-white hover:bg-slate-50 text-red-500 border border-slate-200 py-3.5 rounded-xl font-bold text-sm transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSubmit} disabled={isSubmitting}
                    className="flex-1 bg-primary hover:bg-primary/95 text-white py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Discard Loan Application?"
        message="Are you sure you want to cancel? Any application details entered in this form will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelConfirm(false);
          setStep('browse');
          setSelectedType(null);
          setFormData({ requestedAmount: '', tenure: '', reason: '' });
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import * as loanConfig from '../services/loan-config';
import {
  Sparkles, ArrowLeft, CheckCircle2, Banknote, TrendingUp, Clock,
  CircleDollarSign, Send, FileText, X, Loader2
} from 'lucide-react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';

export function IssueLoan() {
  const { currencySymbol } = useCurrency();
  const navigate = useOrgNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ready' | 'issued'>('ready');
  const [issuingId, setIssuingId] = useState<number | null>(null);
  const [disbursingId, setDisbursingId] = useState<number | null>(null);
  const [disbursing, setDisbursing] = useState(false);

  const [disbursementForm, setDisbursementForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const apps = await loanConfig.getApplications();
      setApplications(apps || []);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approvedApps = applications.filter(a => a.status === 'APPROVED');
  const disbursedApps = applications.filter(a => a.status === 'DISBURSED');

  const totalReadyAmount = approvedApps.reduce(
    (sum, app) => sum + Number(app.approvedAmount || app.requestedAmount || 0), 0
  );
  const totalIssuedAmount = disbursedApps.reduce(
    (sum, app) => sum + Number(app.approvedAmount || app.requestedAmount || 0), 0
  );

  const handleIssueClick = (app: any) => {
    setIssuingId(app.id);
    setDisbursingId(null);
    setDisbursementForm({
      amount: String(app.approvedAmount || app.requestedAmount || ''),
      date: new Date().toISOString().split('T')[0],
      method: 'BANK_TRANSFER',
      reference: '',
      notes: '',
    });
  };

  const handleCancelIssue = () => {
    setIssuingId(null);
    setDisbursingId(null);
  };

  const handleConfirmIssue = async (app: any) => {
    try {
      setDisbursing(true);
      await loanConfig.issueLoan(app.id, {
        disbursementAmount: Number(disbursementForm.amount),
        disbursementDate: disbursementForm.date,
        disbursementMethod: disbursementForm.method,
        bankReference: disbursementForm.reference,
        paymentNotes: disbursementForm.notes,
      });
      toast.success(`Loan disbursed successfully for ${app.applicationNumber}`);
      setIssuingId(null);
      setDisbursingId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to disburse loan');
    } finally {
      setDisbursing(false);
    }
  };

  return (
    <div className="flex-1 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <button
          onClick={() => navigate('/loans-advances/dashboard')}
          className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4 text-primary" /> Back to Dashboard
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full w-fit border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-primary">Loan Management</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Issue Loans</h1>
          <p className="text-muted-foreground text-sm">Disburse approved loan applications</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-6 w-full mt-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {(['ready', 'issued'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 capitalize ${
                activeTab === tab
                  ? 'text-primary border-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'ready' && <CheckCircle2 className="size-4" />}
              {tab === 'issued' && <Banknote className="size-4" />}
              {tab === 'ready' ? `Ready to Issue (${approvedApps.length})` : `Already Issued (${disbursedApps.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ready to Issue</span>
              <p className="text-3xl font-black text-emerald-600">{approvedApps.length}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-6 h-6" /></div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Already Issued</span>
              <p className="text-3xl font-black text-blue-600">{disbursedApps.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-primaryrounded-xl"><Banknote className="w-6 h-6" /></div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Amount Ready</span>
              <p className="text-3xl font-black text-foreground">{currencySymbol}{totalReadyAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><CircleDollarSign className="w-6 h-6" /></div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Issued</span>
              <p className="text-3xl font-black text-foreground">{currencySymbol}{totalIssuedAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-primary-50 text-primary-600 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="mx-auto size-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading applications...</p>
          </div>
        )}

        {/* Ready to Issue Tab */}
        {!loading && activeTab === 'ready' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {approvedApps.length === 0 ? (
              <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
                <CheckCircle2 className="mx-auto size-10 text-emerald-400 mb-3" />
                <p className="text-sm font-bold text-foreground">No loans ready to issue</p>
                <p className="text-xs text-muted-foreground mt-1">All approved loans have been disbursed or none are pending</p>
              </div>
            ) : approvedApps.map((app: any) => {
              const isExpanded = issuingId === app.id;
              return (
                <div key={app.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${app.loanType?.category === 'LOAN' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {app.loanType?.category === 'LOAN' ? <Banknote className="size-5" /> : <TrendingUp className="size-5" />}
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-foreground">
                              {app.userDetail?.user?.first_name} {app.userDetail?.user?.last_name}
                            </p>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted text-muted-foreground">
                              {app.userDetail?.employee_id || 'N/A'}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-700">
                              APPROVED
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {app.userDetail?.department?.department_name && (
                              <span className="text-[10px] text-muted-foreground">{app.userDetail.department.department_name}</span>
                            )}
                            {app.userDetail?.designation?.designation_name && (
                              <>
                                <span className="text-[10px] text-muted-foreground">&middot;</span>
                                <span className="text-[10px] text-muted-foreground">{app.userDetail.designation.designation_name}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">Loan Type</span>
                              <p className="text-xs font-bold text-foreground">{app.loanType?.name} <span className="text-muted-foreground font-normal">({app.loanType?.code})</span></p>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">Application #</span>
                              <p className="text-xs font-bold text-foreground">{app.applicationNumber}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                            <div className="bg-muted/50 rounded-lg p-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Requested</p>
                              <p className="text-sm font-black text-foreground">{currencySymbol}{Number(app.requestedAmount).toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-2">
                              <p className="text-[10px] font-bold text-emerald-600 uppercase">Approved</p>
                              <p className="text-sm font-black text-emerald-700">{currencySymbol}{Number(app.approvedAmount || app.requestedAmount).toLocaleString()}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Tenure</p>
                              <p className="text-sm font-black text-foreground">{app.tenure} months</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">EMI</p>
                              <p className="text-sm font-black text-foreground">{currencySymbol}{Number(app.monthlyEmi || 0).toLocaleString()}/mo</p>
                            </div>
                          </div>
                          {app.loanType?.interestRate !== undefined && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] text-muted-foreground">Interest Rate:</span>
                              <span className="text-[10px] font-bold text-foreground">{app.loanType.interestRate}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {!isExpanded ? (
                          <button
                            onClick={() => handleIssueClick(app)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <Send className="size-3.5" /> Issue
                          </button>
                        ) : (
                          <button
                            onClick={handleCancelIssue}
                            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <X className="size-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Disbursement Form */}
                  {isExpanded && (
                    <div className="border-t border-border bg-emerald-50/30 p-5 animate-in fade-in duration-200">
                      <div className="max-w-2xl">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <CircleDollarSign className="size-4 text-emerald-600" /> Disbursement Details
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground uppercase">
                                Disbursement Amount ({currencySymbol})
                              </label>
                              <input
                                type="number"
                                value={disbursementForm.amount}
                                onChange={e => setDisbursementForm({ ...disbursementForm, amount: e.target.value })}
                                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground uppercase">Disbursement Date</label>
                              <StandardDatePicker
                                value={disbursementForm.date}
                                onChange={date => setDisbursementForm({ ...disbursementForm, date })}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Disbursement Method</label>
                            <select
                              value={disbursementForm.method}
                              onChange={e => setDisbursementForm({ ...disbursementForm, method: e.target.value })}
                              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                            >
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CASH">Cash</option>
                              <option value="SALARY_ADVANCE_ADJUSTMENT">Salary Advance Adjustment</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Bank Reference / Transaction ID</label>
                            <input
                              type="text"
                              value={disbursementForm.reference}
                              onChange={e => setDisbursementForm({ ...disbursementForm, reference: e.target.value })}
                              placeholder="e.g. UTR123456789"
                              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Payment Notes</label>
                            <textarea
                              value={disbursementForm.notes}
                              onChange={e => setDisbursementForm({ ...disbursementForm, notes: e.target.value })}
                              placeholder="Any additional notes about this disbursement..."
                              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 bg-card"
                            />
                          </div>
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => handleConfirmIssue(app)}
                              disabled={disbursing || !disbursementForm.amount || !disbursementForm.date}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {disbursing ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" /> Processing...
                                </>
                              ) : (
                                <>
                                  <Send className="size-3.5" /> Confirm Issue
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleCancelIssue}
                              disabled={disbursing}
                              className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Already Issued Tab */}
        {!loading && activeTab === 'issued' && (
          <div className="bg-card rounded-xl border border-border shadow-sm animate-in fade-in duration-300">
            {disbursedApps.length === 0 ? (
              <div className="py-16 text-center">
                <Banknote className="mx-auto size-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-bold text-foreground">No loans issued yet</p>
                <p className="text-xs text-muted-foreground mt-1">Disbursed loans will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-black">Application #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Loan Type</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-black">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Disbursed Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-black">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {disbursedApps.map((app: any) => (
                      <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-3 text-sm font-bold text-foreground">{app.applicationNumber}</td>
                        <td className="px-4 py-3 text-sm">
                          {app.userDetail?.user?.first_name} {app.userDetail?.user?.last_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${app.loanType?.category === 'LOAN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {app.loanType?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold">
                          {currencySymbol}{Number(app.approvedAmount || app.requestedAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {app.disbursedDate
                            ? new Date(app.disbursedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground font-mono">
                          {app.bankReference || app.disbursementReference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

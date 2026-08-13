import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import {
  Sparkles, Banknote, TrendingUp, Clock, CheckCircle2, XCircle, Eye,
  Calendar, ArrowUpRight, FileText, Layers
} from 'lucide-react';
import * as loanConfig from '../services/loan-config';
import { ApprovalTimeline, getStatusLabel, getStatusColor } from '../components/ApprovalTimeline';

export function MyApplications() {
  const { currencySymbol } = useCurrency();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loanConfig.getMyApplications();
      setApplications(data || []);
    } catch { toast.error('Failed to load applications'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = activeTab === 'all' ? applications :
    activeTab === 'pending' ? applications.filter(a => a.status.startsWith('PENDING') || a.status === 'SUBMITTED') :
    activeTab === 'approved' ? applications.filter(a => a.status === 'APPROVED' || a.status === 'DISBURSED') :
    applications.filter(a => a.status === activeTab.toUpperCase());

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status.startsWith('PENDING') || a.status === 'SUBMITTED').length,
    approved: applications.filter(a => a.status === 'APPROVED' || a.status === 'DISBURSED').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length,
    settled: applications.filter(a => a.status === 'SETTLED').length,
  };

  return (
    <div className="flex-1 bg-slate-50/50 min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-primary-800 text-white shadow-xl shadow-blue-500/5">
        <div className="py-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full w-fit backdrop-blur-sm border border-white/5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold tracking-wider uppercase">My Applications</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Loan & Advance History</h1>
            <p className="text-primary-100/90 text-sm">Track your applications, approvals, and repayment progress</p>
          </div>
          <div className="flex items-center gap-1.5 mt-8 border-b border-white/10 pb-0.5">
            {[
              { key: 'all', label: `All (${stats.total})` },
              { key: 'pending', label: `Pending (${stats.pending})` },
              { key: 'approved', label: `Approved (${stats.approved})` },
              { key: 'rejected', label: `Rejected (${stats.rejected})` },
              { key: 'settled', label: `Settled (${stats.settled})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-t-lg text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab.key ? 'text-white border-b-2 border-white bg-white/5' : 'text-primary-200 hover:text-white'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-primaryrounded-lg"><Layers className="size-4" /></div>
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p><p className="text-xl font-black text-foreground">{stats.total}</p></div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="size-4" /></div>
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Pending</p><p className="text-xl font-black text-amber-600">{stats.pending}</p></div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="size-4" /></div>
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Approved</p><p className="text-xl font-black text-emerald-600">{stats.approved}</p></div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><XCircle className="size-4" /></div>
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Rejected</p><p className="text-xl font-black text-rose-600">{stats.rejected}</p></div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filtered.length === 0 && !loading ? (
            <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
              <FileText className="mx-auto size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-bold text-foreground">No applications found</p>
              <p className="text-xs text-muted-foreground mt-1">Apply for a loan or advance to get started</p>
            </div>
          ) : filtered.map((app: any) => (
            <div key={app.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${app.loanType?.category === 'LOAN' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {app.loanType?.category === 'LOAN' ? <Banknote className="size-5" /> : <TrendingUp className="size-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{app.loanType?.name}</p>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted text-muted-foreground">{app.applicationNumber}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">{currencySymbol}{Number(app.requestedAmount).toLocaleString()}</span>
                        {app.monthlyEmi && <span>&middot; {currencySymbol}{Number(app.monthlyEmi).toLocaleString()}/mo EMI</span>}
                        <span>&middot; {app.tenure} months</span>
                      </div>
                      {!app.status.startsWith('APPROVED') && !app.status.startsWith('REJECTED') && !app.status.startsWith('SETTLED') && !app.status.startsWith('WITHDRAWN') && app.approvals?.length > 0 && (
                        <div className="mt-3">
                          <ApprovalTimeline
                            currentStatus={app.status}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${getStatusColor(app.status)}`}>{getStatusLabel(app.status)}</span>
                    <button onClick={() => setSelectedApp(app)}
                      className="text-primary text-xs font-bold hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                      <Eye className="size-3.5" /> View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedApp && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-card rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-primary-800 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">{selectedApp.applicationNumber}</h3>
                  <p className="text-primary-200/80 text-xs mt-0.5">{selectedApp.loanType?.name}</p>
                </div>
                <button onClick={() => setSelectedApp(null)} className="size-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/80">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3"><p className="text-[10px] font-bold text-muted-foreground uppercase">Requested</p><p className="font-black text-foreground">{currencySymbol}{Number(selectedApp.requestedAmount).toLocaleString()}</p></div>
                <div className="bg-emerald-50 rounded-xl p-3"><p className="text-[10px] font-bold text-emerald-600 uppercase">Paid</p><p className="font-black text-emerald-700">{currencySymbol}{Number(selectedApp.paidAmount).toLocaleString()}</p></div>
                <div className="bg-rose-50 rounded-xl p-3"><p className="text-[10px] font-bold text-rose-600 uppercase">Outstanding</p><p className="font-black text-rose-700">{currencySymbol}{Number(selectedApp.outstandingBalance).toLocaleString()}</p></div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${getStatusColor(selectedApp.status)}`}>{getStatusLabel(selectedApp.status)}</span>
                <span className="text-xs text-muted-foreground">Applied {new Date(selectedApp.createdAt).toLocaleDateString('en-IN')}</span>
              </div>

              {selectedApp.reason && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs font-bold text-muted-foreground mb-1">Reason</p><p className="text-sm">{selectedApp.reason}</p></div>}

              {/* Approval Timeline */}
              {selectedApp.approvals?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-3">Approval Progress</p>
                  <div className="space-y-2">
                    {selectedApp.approvals.map((a: any, i: number) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <div className={`size-7 rounded-full flex items-center justify-center text-white text-[10px] font-black ${a.status === 'APPROVED' ? 'bg-emerald-500' : a.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-400'}`}>{i + 1}</div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">Step {a.stepOrder} — {a.approver?.details ? `${a.approver.details.first_name || ''} ${a.approver.details.last_name || ''}`.trim() : 'Unassigned'}</p>
                          {a.remarks && <p className="text-[10px] text-muted-foreground italic">"{a.remarks}"</p>}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${a.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : a.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Repayment Schedule */}
              {selectedApp.repaymentSchedule?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-3">Repayment Schedule</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedApp.repaymentSchedule.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span className="font-bold">#{s.installmentNo}</span>
                          <span className="text-muted-foreground">{new Date(s.dueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                        </div>
                        <span className="font-mono font-bold">{currencySymbol}{Number(s.amount).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${s.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

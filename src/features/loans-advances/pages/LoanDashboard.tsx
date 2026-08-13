import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import {
  Sparkles, DollarSign, Clock, CheckCircle2, XCircle, TrendingUp, Banknote,
  Layers, AlertCircle, Eye, CheckCircle, X, Filter, FileText
} from 'lucide-react';
import * as loanConfig from '../services/loan-config';
import { ApprovalTimeline, getStatusLabel, getStatusColor } from '../components/ApprovalTimeline';
import RejectReasonDialog from '@/shared/components/ui/RejectReasonDialog';

export function LoanDashboard() {
  const { currencySymbol } = useCurrency();
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'all'>('overview');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, apps, pending] = await Promise.all([
        loanConfig.getDashboardStats(),
        loanConfig.getApplications(),
        loanConfig.getPendingApprovals()
      ]);
      setStats(statsData);
      setApplications(apps || []);
      setPendingApprovals(pending || []);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: number) => {
    try {
      await loanConfig.approveApplicationStep(id);
      toast.success('Application approved');
      fetchData();
      if (selectedApp?.id === id) { const updated = await loanConfig.getApplicationById(id); setSelectedApp(updated); }
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to approve'); }
  };

  const handleReject = async (remarks: string) => {
    if (!rejectTarget) return;
    try {
      await loanConfig.rejectApplicationStep(rejectTarget.id, remarks);
      toast.success('Application rejected');
      setRejectTarget(null);
      fetchData();
      if (selectedApp?.id === rejectTarget.id) { const updated = await loanConfig.getApplicationById(rejectTarget.id); setSelectedApp(updated); }
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to reject'); }
  };

  const filteredApps = statusFilter === 'all' ? applications : applications.filter(a => a.status === statusFilter);
  const allRecords = [...applications];

  return (
    <div className="flex-1 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full w-fit border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-primary">Admin Dashboard</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Loan & Advance Overview</h1>
          <p className="text-muted-foreground text-sm">Track applications, approvals, and repayment progress</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-6 w-full mt-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {(['overview', 'pending', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 capitalize ${
                activeTab === tab
                  ? 'text-primary border-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'pending' && <Clock className="size-4" />}
              {tab === 'all' && <FileText className="size-4" />}
              {tab === 'overview' ? 'Overview' : tab === 'pending' ? `Pending (${pendingApprovals.length})` : 'All Applications'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Layers className="w-5 h-5 text-primary shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {stats.totalApplications}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Total Applications
                  </span>
                </div>
              </div>
              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-amber-600 tabular-nums">
                  {stats.pendingApplications}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Pending
                  </span>
                </div>
              </div>
              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
                  {stats.approvedApplications}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Approved
                  </span>
                </div>
              </div>
              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <DollarSign className="w-5 h-5 text-rose-600 shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-rose-600 tabular-nums">
                  {currencySymbol}{stats.totalOutstanding.toLocaleString()}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Outstanding
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {pendingApprovals.length === 0 ? (
              <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
                <CheckCircle2 className="mx-auto size-10 text-emerald-400 mb-3" />
                <p className="text-sm font-bold text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No applications pending your approval</p>
              </div>
            ) : pendingApprovals.map((app: any) => (
              <div key={app.id} className="bg-card rounded-xl border border-border shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${app.loanType?.category === 'LOAN' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {app.loanType?.category === 'LOAN' ? <Banknote className="size-5" /> : <TrendingUp className="size-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{app.userDetail?.first_name} {app.userDetail?.last_name}</p>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted text-muted-foreground">{app.applicationNumber}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{app.loanType?.name} &middot; {currencySymbol}{Number(app.requestedAmount).toLocaleString()}</p>
                      <div className="mt-3">
                        <ApprovalTimeline
                          currentStatus={app.status}
                          managerName={app.approvals?.[0]?.approver?.details ? `${app.approvals[0].approver.details.first_name || ''} ${app.approvals[0].approver.details.last_name || ''}`.trim() : undefined}
                          hrApprover={app.approvals?.[1]?.approver?.details}
                          financeApprover={app.approvals?.[2]?.approver?.details}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 lg:min-w-[200px]">
                    <button onClick={() => handleApprove(app.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <CheckCircle className="size-3.5" /> Approve
                    </button>
                    <button onClick={() => setRejectTarget(app)}
                      className="flex-1 border border-rose-300 text-rose-600 hover:bg-rose-50 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <XCircle className="size-3.5" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All Applications Tab */}
        {activeTab === 'all' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">All Applications</h3>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-bold bg-card cursor-pointer">
                <option value="all">All Status</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SETTLED">Settled</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>

            {/* Table Container Card */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-black">Application</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Type</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-black">Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-black">EMI</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-black">Outstanding</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black">Status</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredApps.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-16 text-sm text-muted-foreground">No applications found</td></tr>
                    ) : filteredApps.map((app: any) => (
                      <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-3 text-sm font-bold text-foreground">{app.applicationNumber}</td>
                        <td className="px-4 py-3 text-sm">{app.userDetail?.first_name} {app.userDetail?.last_name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${app.loanType?.category === 'LOAN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{app.loanType?.name}</span></td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold">{currencySymbol}{Number(app.requestedAmount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-primary font-bold">{currencySymbol}{Number(app.monthlyEmi || 0).toLocaleString()}/mo</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-rose-600 font-bold">{currencySymbol}{Number(app.outstandingBalance).toLocaleString()}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${getStatusColor(app.status)}`}>{getStatusLabel(app.status)}</span></td>
                        <td className="px-6 py-3 text-right">
                          <button onClick={() => setSelectedApp(app)} className="text-primary text-xs font-bold hover:underline">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApp && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-card rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-primary-800 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">{selectedApp.applicationNumber}</h3>
                  <p className="text-primary-200/80 text-xs mt-0.5">{selectedApp.loanType?.name} &middot; {selectedApp.userDetail?.first_name} {selectedApp.userDetail?.last_name}</p>
                </div>
                <button onClick={() => setSelectedApp(null)} className="size-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/80">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3"><p className="text-[10px] font-bold text-muted-foreground uppercase">Requested</p><p className="font-black text-foreground">{currencySymbol}{Number(selectedApp.requestedAmount).toLocaleString()}</p></div>
                <div className="bg-emerald-50 rounded-xl p-3"><p className="text-[10px] font-bold text-emerald-600 uppercase">EMI</p><p className="font-black text-emerald-700">{currencySymbol}{Number(selectedApp.monthlyEmi || 0).toLocaleString()}/mo</p></div>
                <div className="bg-rose-50 rounded-xl p-3"><p className="text-[10px] font-bold text-rose-600 uppercase">Outstanding</p><p className="font-black text-rose-700">{currencySymbol}{Number(selectedApp.outstandingBalance).toLocaleString()}</p></div>
              </div>
              <div className="flex items-center gap-2"><span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${getStatusColor(selectedApp.status)}`}>{getStatusLabel(selectedApp.status)}</span></div>
              {selectedApp.reason && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs font-bold text-muted-foreground">Reason</p><p className="text-sm mt-1">{selectedApp.reason}</p></div>}
              {selectedApp.approvals?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2">Approval History</p>
                  <div className="space-y-2">
                    {selectedApp.approvals.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <span className="text-xs font-bold text-muted-foreground w-20">Step {a.stepOrder}</span>
                        <span className="text-xs">{a.approver?.details?.first_name} {a.approver?.details?.last_name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ml-auto ${a.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : a.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedApp.repaymentSchedule?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2">Repayment Schedule</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedApp.repaymentSchedule.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-xs">
                        <span className="font-bold">#{s.installmentNo} &middot; {new Date(s.dueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
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

      <RejectReasonDialog isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={handleReject} title={`Reject ${rejectTarget?.applicationNumber}`} />
    </div>
  );
}

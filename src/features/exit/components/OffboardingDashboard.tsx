import React, { useState } from 'react';
import {
  CheckCircle2, Clock, FileText, Shield, DollarSign,
  MessageSquare, TrendingUp, AlertCircle, Calendar,
  Loader2, UploadCloud, XCircle, ClipboardCheck,
  CheckCheck, Info, AlertTriangle, FileUp,
  Download
} from 'lucide-react';
import { EXIT_STATUS } from './InitiateExitForm';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { Button } from '@/shared/components/ui/button';

interface OffboardingDashboardProps { request: any; }

export function getOffboardingPhases(request?: any) {
  const isAssetTrackingEnabled = localStorage.getItem("asset_tracking_enabled") !== "false";
  const hasAssets = Boolean(isAssetTrackingEnabled && request?.assets && request.assets.length > 0);
  return [
    { id: EXIT_STATUS.PENDING_ACCEPTANCE,   label: 'Submitted',      icon: FileText,       color: '#6366F1' },
    { id: EXIT_STATUS.RESIGNATION_ACCEPTED, label: 'Acknowledged',   icon: CheckCircle2,   color: '#10B981' },
    { id: EXIT_STATUS.OFFBOARDING,          label: 'KT Phase',       icon: ClipboardCheck, color: '#8B5CF6' },
    ...(hasAssets ? [{ id: EXIT_STATUS.ASSET_HANDOVER, label: 'Assets', icon: Shield, color: '#F59E0B' }] : []),
    { id: EXIT_STATUS.IT_CLEARANCE,         label: 'Clearance & Approvals',   icon: ClipboardCheck, color: '#3B82F6' },
    { id: EXIT_STATUS.EXIT_INTERVIEW,       label: 'Interview',      icon: MessageSquare,  color: '#EC4899' },
    { id: EXIT_STATUS.FINAL_SETTLEMENT,     label: 'Settlement',     icon: DollarSign,     color: '#059669' },
    { id: EXIT_STATUS.COMPLETED,            label: 'Completed',      icon: CheckCheck,     color: '#16A34A' },
  ];
}

const phaseDescriptions: Record<string, string> = {
  [EXIT_STATUS.PENDING_ACCEPTANCE]: "Your resignation request is under initial review. The HR and reporting manager are evaluating notice period commitments.",
  [EXIT_STATUS.RESIGNATION_ACCEPTED]: "Your resignation has been formally acknowledged. Handovers, transition planning, and final audits will begin shortly.",
  [EXIT_STATUS.OFFBOARDING]: "Knowledge Transfer process is active. Please complete transition documentation and share with the assigned team member.",
  [EXIT_STATUS.ASSET_HANDOVER]: "Please schedule physical asset handovers. Return company-issued laptops, accessories, and security badges to IT/admin.",
  [EXIT_STATUS.IT_CLEARANCE]: "IT access clearance and data backup is in progress. Your corporate accounts and emails are being securely archived.",
  [EXIT_STATUS.EXIT_INTERVIEW]: "Your exit interview is pending. Please take a few minutes to share your valuable thoughts, feedback, and experiences.",
  [EXIT_STATUS.FINAL_SETTLEMENT]: "Finance is calculating your Full & Final (F&F) settlement. Payouts, tax adjustments, and statements will release soon.",
  [EXIT_STATUS.COMPLETED]: "Offboarding process successfully finalized. Relieving letters and final statements have been generated.",
};

const OffboardingDashboard: React.FC<OffboardingDashboardProps> = ({ request }) => {
  const { formatCurrency } = useCurrency();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'Overview' | 'KT' | 'Assets'>('Overview');

  const totalTasks = request.clearance_tasks?.length || 0;
  const doneTasks = request.clearance_tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  let completionProgress = request.progress_percentage || taskPct || 0;
  if (request.kt_status === 'Completed' && completionProgress < 35) {
    completionProgress = 35;
  }
  const phases = getOffboardingPhases(request);
  let currentPhaseIdx = phases.findIndex(p => p.id === request.status);
  if (request.kt_status === 'Completed' && currentPhaseIdx <= 1) {
    currentPhaseIdx = 2;
  }

  const handleDownloadDoc = async (type: 'RELIEVING' | 'EXPERIENCE') => {
    try {
      toast.loading('Generating & downloading document...', { id: 'download-doc' });
      const response = await axiosInstance.post(`/exit/${request.id}/generate-docs`);
      if (response.data.success) {
        toast.success('Document loaded successfully', { id: 'download-doc' });
        const baseUrl = axiosInstance.defaults.baseURL?.replace('/employee-api', '') || '';
        const url = type === 'RELIEVING' ? response.data.data.relievingUrl : response.data.data.experienceUrl;
        window.open(`${baseUrl}${url}`, '_blank');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load document', { id: 'download-doc' });
    }
  };

  const handlePrintSettlement = () => {
    const printContent = document.getElementById('fnf-statement-print-area');
    if (!printContent) return;

    const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!winPrint) return;

    winPrint.document.write(`
      <html>
        <head>
          <title>Full & Final Settlement Statement</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            h3 { color: #0f766e; margin-bottom: 5px; font-size: 20px; }
            .subtitle { font-size: 11px; color: #64748b; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
            .card-title { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .card-val { font-size: 15px; font-weight: 800; margin-top: 5px; color: #334155; }
            .net-card { background: #f0fdfa; border-color: #ccfbf1; }
            .net-card .card-title { color: #0d9488; }
            .net-card .card-val { color: #0f766e; }
            .section-title { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; }
            .breakdown { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; color: #475569; }
            .row:not(:last-child) { border-bottom: 1px dashed #e2e8f0; }
            .val { font-weight: bold; color: #1e293b; }
            .deduction { color: #e11d48; }
            .divider { border-top: 1px solid #e2e8f0; margin: 15px 0; }
            .total-row { display: flex; justify-content: space-between; background: #0f766e; color: white; padding: 15px; border-radius: 12px; margin-top: 20px; font-weight: bold; font-size: 14px; }
            .total-row span { color: #ccfbf1; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 30px;">
            <h3>{request.user?.details?.company?.name || 'Company'} Human Resources</h3>
            <div class="subtitle">Full & Final Settlement Statement</div>
          </div>
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title">Employee Details</div>
            <div class="card-val" style="font-size: 13px; font-weight: 500; color: #475569; margin-top: 8px;">
              <span style="font-weight: bold; color: #1e293b;">Employee Name:</span> ${request.user?.details?.first_name} ${request.user?.details?.last_name}<br/>
              <span style="font-weight: bold; color: #1e293b;">Employee ID:</span> ${request.user?.details?.employee_id || 'N/A'}<br/>
              <span style="font-weight: bold; color: #1e293b;">Last Working Day:</span> ${new Date(request.last_working_day).toLocaleDateString()}
            </div>
          </div>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    winPrint.document.close();
    winPrint.focus();
  };

  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      const res = await axiosInstance.post(`/exit/${request.id}/withdraw`);
      if (res.data.success) {
        toast.success('Resignation withdrawn successfully');
        window.location.reload();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to withdraw resignation');
    } finally {
      setIsWithdrawing(false);
      setShowWithdrawConfirm(false);
    }
  };

  const handleProofUpload = async (taskId: number, file: File) => {
    try {
      setIsUploading(taskId);
      // Create a promise toast for file upload simulation
      const uploadPromise = new Promise(async (resolve, reject) => {
        try {
          const res = await axiosInstance.patch(`/exit/clearance-task/${taskId}/status`, {
            status: 'COMPLETED',
            proofUrl: 'https://placeholder-proof-url.com/asset.jpg',
            proofType: file.type
          });
          if (res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error('Failed to update'));
          }
        } catch (e) {
          reject(e);
        }
      });

      toast.promise(uploadPromise, {
        loading: 'Uploading completion proof...',
        success: () => {
          setTimeout(() => window.location.reload(), 1000);
          return 'Proof uploaded & task completed successfully!';
        },
        error: 'Failed to upload proof. Please try again.'
      });

    } catch (e: any) {
      console.error(e);
    } finally {
      setIsUploading(null);
    }
  };

  const circumference = 2 * Math.PI * 48;
  const dashoffset = circumference - (circumference * completionProgress) / 100;
  const canWithdraw = [EXIT_STATUS.PENDING_ACCEPTANCE, EXIT_STATUS.NEGOTIATION_PENDING].includes(request.status);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const handleEmployeeLwdDecision = async (decision: 'ACCEPT' | 'DECLINE') => {
    try {
      setIsSubmittingDecision(true);
      const targetStatus = decision === 'ACCEPT' ? EXIT_STATUS.RESIGNATION_ACCEPTED : EXIT_STATUS.PENDING_ACCEPTANCE;
      const res = await axiosInstance.put(`/exit/${request.id}/status`, {
        status: targetStatus
      });
      if (res.data.success) {
        toast.success(decision === 'ACCEPT' ? 'Accepted manager proposed Last Working Day' : 'Declined proposed date, reverting to pending review');
        window.location.reload();
      }
    } catch (err: any) {
      console.error('LWD decision error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit decision');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* LWD Negotiation Banner for Employee */}
      {request.status === EXIT_STATUS.NEGOTIATION_PENDING && (
        <div className="p-6 bg-amber-50/80 border border-amber-200/90 rounded-xl shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Manager Proposed Revised LWD</h4>
                <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-xl">
                  Your reporting manager has proposed a revised Last Working Day of{' '}
                  <span className="font-extrabold text-amber-950 underline">
                    {request?.negotiated_lwd 
                      ? new Date(request.negotiated_lwd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                      : request?.last_working_day 
                        ? new Date(request.last_working_day).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Selected Date'}
                  </span>
                  . Please accept the proposed date or decline to keep your original notice period schedule.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-end">
              <Button
                variant="outline"
                onClick={() => handleEmployeeLwdDecision('DECLINE')}
                disabled={isSubmittingDecision}
                className="h-10 px-5 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Decline (Keep Original)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleEmployeeLwdDecision('ACCEPT')}
                disabled={isSubmittingDecision}
                className="h-10 px-6 border-teal-200 text-teal-600 hover:bg-teal-50 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isSubmittingDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accept Proposed LWD
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="border-b border-border flex items-center gap-8 mb-4">
        {[
          { id: 'Overview', label: 'Overview', icon: FileText },
          { id: 'KT', label: 'Knowledge Transfer', icon: ClipboardCheck },
          ...(Boolean(localStorage.getItem("asset_tracking_enabled") !== "false" && request?.assets && request.assets.length > 0) ? [{ id: 'Assets', label: 'Assets Returned', icon: Shield }] : [])
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 px-1 transition-all relative border-0 bg-transparent cursor-pointer ${
              activeTab === tab.id ? 'text-foreground font-bold' : 'text-slate-400 font-semibold hover:text-foreground'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-foreground' : 'text-gray-300'}`} />
            <span className="text-xs">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-left-2" />
            )}
          </button>
        ))}
      </div>

      {/* ── TOP ROW: Progress + Phase strip ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Progress Hero */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-sm transition-all duration-300">
          <div className="absolute top-0 right-0 w-44 h-44 bg-blue-50/40 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Overview</p>
            <h2 className="text-lg font-bold text-foreground leading-tight">Offboarding Status</h2>

            <div className="flex items-center gap-6 mt-5">
              {/* Ring */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0d9488" />
                      <stop offset="100%" stopColor="#0f766e" />
                    </linearGradient>
                  </defs>
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#F1F5F9" strokeWidth="8"/>
                  <circle cx="56" cy="56" r="48" fill="none"
                    stroke="url(#progressGradient)" strokeWidth="8"
                    strokeDasharray={circumference} strokeDashoffset={dashoffset}
                    strokeLinecap="round" className="transition-all duration-1000"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-foreground">{completionProgress}%</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Done</span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2.5 flex-1">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Clearances</p>
                  <p className="text-base font-extrabold text-foreground">
                    {doneTasks} <span className="text-xs font-normal text-muted-foreground">/ {totalTasks} complete</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Current Phase</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mt-0.5">
                    {request.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LWD Badges */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/50 border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Requested LWD</p>
                <p className="text-xs font-extrabold text-foreground">
                  {request.last_working_day ? new Date(request.last_working_day).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                </p>
              </div>
            </div>

            {request.negotiated_lwd && (
              <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Manager Proposed LWD</p>
                  <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                    {new Date(request.negotiated_lwd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phase Timeline (2-col span) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg shadow-sm p-6 overflow-hidden flex flex-col justify-between hover:shadow-sm transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                Journey Timeline
              </p>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                Phase {currentPhaseIdx + 1} of {phases.length}
              </span>
            </div>

            {/* Active Phase Explanation Banner */}
            {currentPhaseIdx >= 0 && (
              <div className="mb-6 p-4 bg-muted/50 border border-border/60 rounded-lg flex items-start gap-3">
                <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-lg flex-shrink-0">
                  {React.createElement(phases[currentPhaseIdx].icon, { className: "w-4 h-4 text-primary" })}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-foreground uppercase tracking-wider">
                    Active Stage: {phases[currentPhaseIdx].label}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                    {phaseDescriptions[request.status] || "Your offboarding process is underway."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop view stepper: circle → line → circle pattern */}
          <div className="hidden sm:block py-2">
            <div className="flex items-start w-full">
              {phases.map((ph, idx) => {
                const done = idx < currentPhaseIdx;
                const active = idx === currentPhaseIdx;
                const Icon = ph.icon;
                const isLast = idx === phases.length - 1;
                return (
                  <React.Fragment key={idx}>
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        done   ? 'bg-primary-600 border-primary-600 shadow-sm shadow-primary-100 text-white'
                        : active? 'bg-primary-600 border-primary shadow-sm shadow-primary-100 text-white'
                                : 'bg-card border-border text-slate-300'
                      }`}>
                        {done ? <CheckCircle2 className="w-4.5 h-4.5 text-white animate-in zoom-in" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="mt-2.5 text-center px-1">
                        <p className={`text-[10px] font-bold leading-tight ${active ? 'text-primary font-extrabold' : done ? 'text-primary-700' : 'text-muted-foreground'}`}>
                          {ph.label}
                        </p>
                        <p className="text-[7.5px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Phase {idx + 1}</p>
                      </div>
                    </div>
                    {!isLast && (
                      <div className="flex-1 flex items-start pt-[18px]">
                        <div className="relative w-full h-0.5 bg-muted rounded">
                          {done && (
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded" />
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Mobile view stepper: vertical step-by-step list */}
          <div className="block sm:hidden space-y-4">
            {phases.map((ph, idx) => {
              const done = idx < currentPhaseIdx;
              const active = idx === currentPhaseIdx;
              const Icon = ph.icon;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 transition-all ${
                    done   ? 'bg-primary-50 border-primary-100 text-primary-600'
                    : active? 'bg-primary-50 border-primary-100 text-primary animate-pulse'
                            : 'bg-muted/50 border-border text-muted-foreground'
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-primary-600" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold ${active ? 'text-primary-600' : done ? 'text-primary-700' : 'text-muted-foreground'}`}>{ph.label}</p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        done ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : active ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : 'bg-muted/50 text-muted-foreground border-border'
                      }`}>{done ? 'Done' : active ? 'Active' : 'Upcoming'}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Phase {idx + 1} of offboarding process</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: Tasks + Sidebar ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'Overview' && (
            <>
              {/* Clearance Tasks */}
              <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                        <Shield className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Clearance Checklist</h3>
                    </div>
                    {totalTasks > 0 && (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full">
                        {doneTasks} / {totalTasks} Completed
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {totalTasks > 0 && (
                    <div className="px-6 pt-5 pb-1">
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-primary-600 rounded-full transition-all duration-1000"
                          style={{ width: `${completionProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="p-6 space-y-3">
                    {request.clearance_tasks?.length > 0 ? request.clearance_tasks.map((task: any, idx: number) => {
                      const isDone = task.status === 'COMPLETED';
                      return (
                        <div key={idx} className={`group flex items-center justify-between px-5 py-4 rounded-lg border transition-all ${isDone ? 'bg-blue-50/30 border-blue-100' : 'bg-muted/50 border-border hover:border-slate-300 hover:bg-muted/50'}`}>
                          <div className="flex items-center gap-3.5">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? 'bg-emerald-100 text-blue-600' : 'bg-card border border-border text-muted-foreground'}`}>
                              {isDone ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Clock className="w-4.5 h-4.5" />}
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${isDone ? 'text-muted-foreground line-through decoration-slate-300' : 'text-foreground'}`}>{task.task_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{task.department}</span>
                                {task.sla_deadline && !isDone && (
                                  <span className="text-[9px] text-rose-500 font-bold flex items-center gap-0.5 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                                    <Calendar className="w-2.5 h-2.5" /> Due {new Date(task.sla_deadline).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5 flex-shrink-0">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {isDone ? 'Cleared' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 bg-muted/50 border border-border rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-600 mb-1">Clearance Tasks Scheduled</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                          Checklist items will populate here as soon as your exit is officially accepted by your manager.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Exit Request Details Card */}
              <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden hover:shadow-sm transition-all duration-300 p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="p-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Exit Request Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Primary Exit Reason</p>
                    <div className="inline-flex items-center px-4 py-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 rounded-lg shadow-2xs">
                      <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">{request.primary_reason || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Detailed Explanation</p>
                    <div className="p-4 bg-muted/40 border border-border/80 border-l-4 border-l-blue-600 rounded-r-lg shadow-2xs">
                      <p className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-line">
                        {request.explanation || 'No detailed explanation provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'KT' && (
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden hover:shadow-sm transition-all duration-300 p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="p-1.5 bg-purple-50 border border-purple-100 rounded-lg">
                  <ClipboardCheck className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Knowledge Transfer (KT) Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 border border-border rounded-lg p-4">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">KT Assignee</p>
                  <p className="text-xs font-bold text-foreground">
                    {request.kt_assignee?.details 
                      ? `${request.kt_assignee.details.first_name || ''} ${request.kt_assignee.details.last_name || ''}`.trim()
                      : (request.kt_assignee?.username || 'N/A')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">KT Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                    request.kt_status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    request.kt_status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {request.kt_status || 'Not Started'}
                  </span>
                </div>
                {request.kt_description && (
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Transition Description</p>
                    <p className="text-xs text-foreground bg-card border border-border/60 rounded px-3 py-2 whitespace-pre-wrap">{request.kt_description}</p>
                  </div>
                )}
                {request.kt_completion_date && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Planned Completion Date</p>
                    <p className="text-xs font-bold text-foreground">
                      {new Date(request.kt_completion_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {request.kt_status === 'Completed' && request.kt_verified_by && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Verified By</p>
                    <p className="text-xs font-bold text-foreground">
                      {request.kt_verified_by?.details 
                        ? `${request.kt_verified_by.details.first_name || ''} ${request.kt_verified_by.details.last_name || ''}`.trim()
                        : (request.kt_verified_by?.username || 'N/A')}
                    </p>
                  </div>
                )}
                {request.kt_remarks && (
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">KT Remarks</p>
                    <p className="text-xs text-foreground bg-card border border-border/60 rounded px-3 py-2 whitespace-pre-wrap">{request.kt_remarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Assets' && (
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden hover:shadow-sm transition-all duration-300 p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Assets Checklist to be Returned</h3>
              </div>
              {(() => {
                const assetsList = request.assets || request.company_assets_returned || [];
                return assetsList.length > 0 ? (
                  <div className="space-y-3">
                    {assetsList.map((asset: any, idx: number) => {
                      const isReturned = asset.return_status === true || asset.return_status === 'Returned';
                      return (
                        <div key={idx} className="flex items-center justify-between px-5 py-4 rounded-lg border border-border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isReturned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              <Shield className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{asset.asset_name || asset.name}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {asset.category || 'IT Equipment'} {(asset.asset_serial_no || asset.id) ? `• S/N: ${asset.asset_serial_no || asset.id}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${isReturned ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {isReturned ? 'Returned' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No assets assigned or listed for return.
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Action Box (Classy & Intentional Hazard State) */}
          <div className="bg-card border border-border rounded-lg shadow-sm p-6 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Request Actions</h3>
            </div>
            
            {showWithdrawConfirm ? (
              <div className="bg-rose-50/40 border border-rose-100 rounded-lg p-4 animate-in zoom-in-95 duration-200">
                <p className="text-xs font-bold text-rose-900 mb-1">Are you absolutely sure?</p>
                <p className="text-[10px] text-rose-700 leading-relaxed mb-3">
                  This action will permanently cancel your exit initiation. Your manager will be notified of your withdrawal request.
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowWithdrawConfirm(false)}
                    className="px-3 py-1.5 bg-card border border-border text-slate-600 rounded-lg text-[10px] font-bold hover:bg-muted/50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 transition-all cursor-pointer flex items-center gap-1"
                  >
                    {isWithdrawing && <Loader2 className="w-3 h-3 animate-spin" />}
                    Confirm Withdrawal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                  Initiated exit requests can only be withdrawn during the manager acceptance/negotiation phase.
                </p>
                <button 
                  onClick={() => setShowWithdrawConfirm(true)} 
                  disabled={!canWithdraw}
                  className={`w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
                    !canWithdraw
                      ? 'border-border bg-muted/50 text-slate-300 cursor-not-allowed'
                      : 'border-border bg-card text-slate-600 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/20 active:scale-[0.98]'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Withdraw Exit Request
                </button>
                {!canWithdraw && (
                  <p className="text-[9px] text-muted-foreground text-center mt-2.5 flex items-center justify-center gap-1 font-semibold">
                    <Info className="w-3 h-3 text-slate-300" /> Action unavailable at this workflow stage
                  </p>
                )}
              </>
            )}
          </div>

          {/* Exit Documents (Intentional Details list) */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden hover:shadow-sm transition-all duration-300">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Expected Deliverables</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { 
                  id: 'relieving',
                  name: 'Relieving & Settlement Letter', 
                  when: 'Post Clearance',
                  action: () => handleDownloadDoc('RELIEVING')
                },
                { 
                  id: 'experience',
                  name: 'Official Experience Certificate', 
                  when: 'Post Clearance',
                  action: () => handleDownloadDoc('EXPERIENCE')
                },
                { 
                  id: 'settlement',
                  name: 'Full & Final Account Statement', 
                  when: 'Final Settlement',
                  action: () => {
                    if (request.settlement_data) {
                      setShowSettlementModal(true);
                    } else {
                      toast.info('Settlement calculations are currently being finalized by Finance.');
                    }
                  }
                },
              ].map((doc, i) => {
                const ready = doc.id === 'settlement' 
                  ? (request.status === 'COMPLETED' || request.status === 'FINAL_SETTLEMENT')
                  : request.status === 'COMPLETED';

                return (
                  <button
                    key={i}
                    onClick={() => ready && doc.action()}
                    disabled={!ready}
                    className={`w-full flex items-center justify-between px-5 py-3.5 border-0 bg-transparent text-left transition-colors ${
                      ready 
                        ? 'hover:bg-blue-50/40 cursor-pointer group' 
                        : 'opacity-75 cursor-not-allowed'
                    }`}
                  >
                    <span className={`text-xs font-semibold ${ready ? 'text-foreground group-hover:text-primary font-bold' : 'text-muted-foreground'}`}>
                      {doc.name}
                    </span>
                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-all ${
                      ready 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-100' 
                        : 'bg-muted/50 text-muted-foreground border-border'
                    }`}>
                      {ready ? 'Download / View' : doc.when}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Full & Final Settlement Modal */}
      {showSettlementModal && request.settlement_data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card rounded-lg shadow-sm border border-border max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                  <DollarSign className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Full & Final Statement</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Calculated & finalized by payroll department</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettlementModal(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-muted-foreground transition-colors cursor-pointer border-0 bg-transparent"
              >
                <XCircle className="w-5 h-5 text-muted-foreground hover:text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div id="fnf-statement-print-area" className="p-6 space-y-6">
              {/* Company Logo and Header */}
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-black text-foreground tracking-tight">{request.user?.details?.company?.name || 'Company'}</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Full & Final Settlement Payslip</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    OFFICIAL STATEMENT
                  </span>
                </div>
              </div>

              {/* Employee & Resignation Metadata */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px] bg-muted/50 rounded-lg border border-border p-4">
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span className="text-muted-foreground font-medium">Employee Name:</span>
                  <span className="text-foreground font-bold">{request.user?.details?.first_name} {request.user?.details?.last_name}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span className="text-muted-foreground font-medium">Employee ID:</span>
                  <span className="text-foreground font-bold">{request.user?.details?.employee_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span className="text-muted-foreground font-medium">Department:</span>
                  <span className="text-foreground font-bold">{request.user?.details?.department?.department_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span className="text-muted-foreground font-medium">Designation:</span>
                  <span className="text-foreground font-bold">{(typeof request.user?.details?.designation === 'string' ? request.user?.details?.designation : request.user?.details?.designation?.designation_name) || request.user?.details?.role?.role_name || 'Employee'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Last Working Day:</span>
                  <span className="text-foreground font-bold">{new Date(request.last_working_day).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Exit Reason:</span>
                  <span className="text-foreground font-bold">{request.reason || 'Resignation'}</span>
                </div>
              </div>

              {/* Side-by-Side Earnings and Deductions Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings Column */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Earnings Description</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</span>
                  </div>
                  <div className="p-4 space-y-3 min-h-[140px] flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Basic & Allowances</span>
                        <span className="text-foreground font-semibold">{formatCurrency(request.settlement_data.total_earnings)}</span>
                      </div>
                      {Number(request.settlement_data.gratuity || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Gratuity</span>
                          <span className="text-foreground font-semibold">{formatCurrency(request.settlement_data.gratuity)}</span>
                        </div>
                      )}
                      {Number(request.settlement_data.leave_encashment || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Leave Encashment</span>
                          <span className="text-foreground font-semibold">{formatCurrency(request.settlement_data.leave_encashment)}</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-dashed border-border pt-2.5 flex justify-between text-xs font-bold text-foreground">
                      <span>Gross Earnings (A)</span>
                      <span>{formatCurrency(
                        Number(request.settlement_data.total_earnings || 0) +
                        Number(request.settlement_data.gratuity || 0) +
                        Number(request.settlement_data.leave_encashment || 0)
                      )}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deductions Description</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</span>
                  </div>
                  <div className="p-4 space-y-3 min-h-[140px] flex flex-col justify-between">
                    <div className="space-y-2.5">
                      {Number(request.settlement_data.notice_pay || 0) < 0 ? (
                        <div className="flex justify-between text-xs text-rose-600">
                          <span>Notice Shortfall Recovery</span>
                          <span>-{formatCurrency(Math.abs(Number(request.settlement_data.notice_pay)))}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground italic">No notice recovery required</div>
                      )}
                      {Number(request.settlement_data.data?.salaryAdvanceRecovery || 0) > 0 && (
                        <div className="flex justify-between text-xs text-rose-600">
                          <span>Salary Advance Recovery</span>
                          <span>-{formatCurrency(request.settlement_data.data.salaryAdvanceRecovery)}</span>
                        </div>
                      )}
                      {Number(request.settlement_data.data?.loanRecovery || 0) > 0 && (
                        <div className="flex justify-between text-xs text-rose-600">
                          <span>Outstanding Loan Recovery</span>
                          <span>-{formatCurrency(request.settlement_data.data.loanRecovery)}</span>
                        </div>
                      )}
                      {Number(request.settlement_data.data?.additionalDeductions || 0) > 0 && (
                        <div className="flex justify-between text-xs text-rose-600">
                          <span>Other Deductions / Assets</span>
                          <span>-{formatCurrency(request.settlement_data.data.additionalDeductions)}</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-dashed border-border pt-2.5 flex justify-between text-xs font-bold text-rose-600">
                      <span>Gross Deductions (B)</span>
                      <span>{formatCurrency(request.settlement_data.total_deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Net Payout Banner */}
              <div className="bg-primary text-white rounded-lg p-4 flex justify-between items-center shadow-sm shadow-blue-900/10">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-blue-100">Net Payable Amount (A - B)</p>
                  <p className="text-[11px] text-blue-50/80 mt-0.5">Calculated Net payout to employee bank account</p>
                </div>
                <span className="text-xl font-black">{formatCurrency(request.settlement_data.net_payable)}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-muted/50 border-t border-border flex justify-end gap-3">
              <button 
                onClick={handlePrintSettlement}
                className="px-4 py-2 bg-primary hover:bg-primary/70 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button 
                onClick={() => setShowSettlementModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-foreground text-xs font-bold rounded-lg transition-colors cursor-pointer border-0"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffboardingDashboard;

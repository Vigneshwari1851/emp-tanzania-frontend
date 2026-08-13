import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { ShieldCheck, UserCheck, Clock, FileCheck, AlertTriangle, CheckCircle, XCircle, ArrowLeft, CheckCircle2, FileText, Activity } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';

const RiskBadge: React.FC<{ category: string }> = ({ category }) => {
  let color = 'bg-muted text-foreground border-border';
  if (category === 'LOW') color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (category === 'MEDIUM') color = 'bg-amber-50 text-amber-700 border-amber-100';
  if (category === 'HIGH') color = 'bg-orange-50 text-orange-700 border-orange-100';
  if (category === 'CRITICAL') color = 'bg-rose-50 text-rose-700 border-rose-100';

  const formatText = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      Risk level: {formatText(category)}
    </span>
  );
};

const formatStatusText = (status: string) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const BgvCaseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();

  const [bgvDetails, setBgvDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');

  useEffect(() => {
    if (id) {
      loadBgvDetails(Number(id));
    }
  }, [id]);

  const loadBgvDetails = async (applicationId: number) => {
    try {
      setLoadingDetails(true);
      const res = await axiosInstance.get(`/recruitment/bgv/case/${applicationId}`);
      if (res.data.success) {
        setBgvDetails(res.data.data);
      }
    } catch (err) {
      toast.error('Could not load case details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateVerification = async (verificationId: string, status: string, remarks: string) => {
    try {
      const res = await axiosInstance.post('/recruitment/bgv/verification/update', {
        verification_id: verificationId,
        status,
        remarks
      });
      if (res.data.success) {
        toast.success(`Verification marked as ${formatStatusText(status)}`);
        if (id) loadBgvDetails(Number(id));
      }
    } catch (err) {
      toast.error('Failed to update verification');
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewRemarks) return toast.error('Remarks are required to submit a decision');
    try {
      const res = await axiosInstance.post('/recruitment/bgv/review', {
        bgv_case_id: bgvDetails.id,
        decision: reviewDecision,
        remarks: reviewRemarks
      });
      if (res.data.success) {
        toast.success('Review submitted successfully');
        setShowReviewModal(false);
        setReviewRemarks('');
        if (id) loadBgvDetails(Number(id));
      }
    } catch (err) {
      toast.error('Failed to submit review');
    }
  };

  if (loadingDetails) {
    return (
      <div className="flex justify-center items-center h-screen w-full bg-muted/50/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!bgvDetails) {
    return (
      <div className="p-4 md:p-8 w-full max-w-full min-h-screen bg-muted/50/30">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 font-medium text-slate-600 hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="text-center text-muted-foreground py-16 bg-card rounded-lg shadow-sm border border-border/60">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No records found</h3>
          <p className="text-sm text-muted-foreground mt-1">We couldn't locate the background verification case for this application.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 w-full max-w-full mx-auto min-h-screen bg-muted/50/30 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="rounded-lg h-10 w-10 p-0 flex items-center justify-center border-border hover:bg-muted/50 shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:text-white" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Candidate Verification Details</h1>
            <p className="text-sm text-muted-foreground mt-1">Tracking ID: {bgvDetails.id.split('-')[0]}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Overview and Actions */}
        <div className="lg:col-span-1 space-y-6">

          {/* Summary Card */}
          <div className="bg-card p-6 rounded-lg border border-border/60 shadow-sm flex flex-col gap-5 hover:shadow-sm transition-all duration-300">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Current Status</p>
              <h2 className="text-xl font-semibold text-foreground">{formatStatusText(bgvDetails.status)}</h2>
            </div>
            <div className="border-t border-border pt-5">
              <p className="text-sm text-muted-foreground font-medium mb-2.5">Risk Assessment</p>
              <RiskBadge category={bgvDetails.risk_category} />
            </div>
            <div className="border-t border-border pt-5">
              <p className="text-sm text-muted-foreground font-medium mb-1.5">SLA Timeline</p>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Due by {new Date(bgvDetails.sla_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Intervention Required Card */}
          {bgvDetails.status === 'REVIEW_REQUIRED' && (
            <div className="bg-rose-50/50 border border-rose-200 p-6 rounded-lg shadow-sm">
              <h4 className="text-[12px] font-medium text-rose-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" /> Intervention Required
              </h4>
              <p className="text-sm text-rose-700/90 mb-6 leading-relaxed">
                Adverse records or verification failures were identified. Please review the findings and record your decision to proceed.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => { setReviewDecision('OVERRIDE_CLEAR'); setShowReviewModal(true); }}
                  className="bg-card text-emerald-700 hover:bg-emerald-50 border border-emerald-200 h-11 px-4 rounded-lg font-medium w-full justify-center transition-all"
                >
                  Clear and Proceed
                </Button>
                <Button
                  onClick={() => { setReviewDecision('REJECT'); setShowReviewModal(true); }}
                  className="bg-rose-600 text-white hover:bg-rose-700 h-11 px-4 rounded-lg font-medium shadow-sm w-full justify-center transition-all"
                >
                  Reject Candidate
                </Button>
              </div>
            </div>
          )}

          {/* Risk Flags summary */}
          <div className="bg-card border border-border/60 rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-foreground text-base mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" /> Discrepancy Flags
            </h3>
            {bgvDetails.risk_flags.length === 0 ? (
              <div className="text-center py-6">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm text-muted-foreground font-medium">No discrepancies detected</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {bgvDetails.risk_flags.map((rf: any) => (
                  <div key={rf.id} className="bg-orange-50/50 border border-orange-100 p-3.5 rounded-lg flex justify-between items-center transition-all hover:bg-orange-50">
                    <span className="text-sm font-medium text-orange-900">{formatStatusText(rf.rule_name)}</span>
                    <span className="text-xs text-orange-700 font-medium bg-orange-100/70 px-2.5 py-1 rounded-lg">
                      Impact: {rf.score_impact}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Verification Checks */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-foreground text-lg mb-2">Verification Pipeline</h3>
          <div className="grid gap-4">
            {bgvDetails.verifications.map((v: any) => (
              <div key={v.id} className="bg-card border border-border/60 rounded-lg p-5 sm:p-6 shadow-sm hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg flex items-center justify-center ${v.status === 'VERIFIED' ? 'bg-emerald-50' :
                      v.status === 'FAILED' ? 'bg-rose-50' : 'bg-muted/50'
                      }`}>
                      {v.status === 'VERIFIED' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                        v.status === 'FAILED' ? <XCircle className="w-5 h-5 text-rose-600" /> :
                          <Clock className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground block">{formatStatusText(v.type)} Check</span>
                      <span className="text-xs text-muted-foreground mt-0.5 block">Record ID: {v.id.substring(0, 8)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${v.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    v.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-muted/50 text-slate-600 border-border'
                    }`}>
                    {formatStatusText(v.status)}
                  </span>
                </div>

                {v.remarks && (
                  <div className="mt-3 bg-muted/50/80 border border-border p-3.5 rounded-lg">
                    <p className="text-sm text-slate-600 italic">"{v.remarks}"</p>
                  </div>
                )}

                {v.status === 'PENDING' && (
                  <div className="mt-5 pt-4 border-t border-border flex gap-3 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg font-medium px-4 transition-all"
                      onClick={() => handleUpdateVerification(v.id, 'VERIFIED', 'Verified internally by HR team')}
                    >
                      Approve Check
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg font-medium px-4 transition-all"
                      onClick={() => handleUpdateVerification(v.id, 'FAILED', 'Adverse records identified')}
                    >
                      Flag Check
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg w-full max-w-lg shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-border">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {reviewDecision === 'OVERRIDE_CLEAR' ? 'Clear Background Verification' : 'Reject Application'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are about to {reviewDecision === 'OVERRIDE_CLEAR' ? 'approve this candidate despite the identified discrepancies' : 'decline this candidate due to the adverse findings'}. This action is permanent and will be recorded in the audit logs.
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-muted/50/50 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Justification Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="w-full border border-border rounded-lg p-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm bg-card"
                  rows={4}
                  placeholder="Provide comprehensive reasoning for this decision to comply with compliance policies..."
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-lg font-medium border-border hover:bg-muted/50 transition-all text-foreground"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 h-11 rounded-lg font-medium text-white shadow-sm transition-all ${reviewDecision === 'OVERRIDE_CLEAR' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  onClick={handleReviewSubmit}
                >
                  Confirm Decision
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BgvCaseDetails;


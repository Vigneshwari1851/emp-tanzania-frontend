import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  Users, Briefcase, Plus, Clock, CheckCircle2, XCircle, Search,
  FileText, Loader2, Filter, MapPin, Sparkles, ChevronRight, X,
  ExternalLink, Download, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight,
  Activity, ArrowLeft, DownloadCloud, Calendar, User, Copy, Check, Linkedin, Github, Globe
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import Select from '@/shared/components/ui/Select';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';

const PIPELINE_STAGES = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'SELECTED',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'BGV_IN_PROGRESS',
  'BGV_CLEARED',
  'ONBOARDING',
  'EMPLOYEE_CREATED'
];

const TERMINAL_STAGES = ['REJECTED', 'WITHDRAWN', 'NO_SHOW', 'EXPIRED'];
const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

const isOptionDisabled = (currentStatus: string, optionStatus: string) => {
  if (currentStatus === optionStatus) return false;
  if (TERMINAL_STAGES.includes(currentStatus)) return true; // Cannot move out of terminal state
  if (TERMINAL_STAGES.includes(optionStatus)) return false; // Can always move to terminal

  const currentIndex = PIPELINE_STAGES.indexOf(currentStatus);
  const optionIndex = PIPELINE_STAGES.indexOf(optionStatus);

  if (currentIndex === -1) return false;
  return optionIndex < currentIndex;
};

const CandidateReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const { currencyCode, currencySymbol } = useCurrency();

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStage, setUpdatingStage] = useState<boolean>(false);

  // Data States
  const [applicationDetail, setApplicationDetail] = useState<any>(null);
  const [selectedStage, setSelectedStage] = useState<string>('');

  // Modal States
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawReason, setWithdrawReason] = useState<string>('');

  // Offer States
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [offerData, setOfferData] = useState({
    base_salary: '',
    joining_date: '',
    expiry_date: '',
    work_mode: 'Hybrid'
  });
  const [generatingOffer, setGeneratingOffer] = useState<boolean>(false);
  const [managerDetails, setManagerDetails] = useState<string>('Loading...');

  // Timeline States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch application detail function
  const fetchApplicationData = async () => {
    try {
      const res = await axiosInstance.get(`/recruitment/applications/${id}`);
      if (res.data.success) {
        setApplicationDetail(res.data.data);
        setSelectedStage(res.data.data.status);
      } else {
        toast.error('Failed to load application profile details.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error loading application profile.');
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (id) {
        setLoading(true);
        await fetchApplicationData();
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id]);

  // Promote / Update Stage Status
  const handleUpdateStatus = async (appId: number, status: string, remarks?: string) => {
    try {
      if (status === 'OFFER_SENT') {
        setShowOfferModal(true);

        // Pre-fetch manager details
        const managerId = applicationDetail?.application?.job?.hiring_manager_id;
        const dept = applicationDetail?.application?.job?.department || '';
        if (managerId) {
          axiosInstance.get(`/employees/${managerId}`).then(res => {
            const emp = res.data.data;
            const name = `${emp?.details?.first_name || ''} ${emp?.details?.last_name || ''}`.trim() || emp?.username || `Manager #${managerId}`;
            setManagerDetails(`${name} - ${dept}`);
          }).catch(() => {
            setManagerDetails(`Manager #${managerId} - ${dept}`);
          });
        } else {
          setManagerDetails(`System - ${dept}`);
        }
        return;
      }

      setUpdatingStage(true);
      const res = await axiosInstance.put(`/recruitment/applications/${appId}/status`, {
        status,
        comments: remarks
      });
      if (res.data.success) {
        toast.success(`Application stage successfully promoted to ${status.replace(/_/g, ' ')}`);
        await fetchApplicationData();
      }
    } catch (err) {
      toast.error('Failed to update application Candidate stage.');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Generate Offer Flow
  const handleGenerateOffer = async () => {
    try {
      if (!offerData.base_salary || !offerData.joining_date || !offerData.expiry_date) {
        toast.error('Please fill all mandatory offer details.');
        return;
      }

      setGeneratingOffer(true);
      const application = applicationDetail.application;

      const payload = {
        candidate_id: application.candidate.id,
        job_id: application.job.id,
        application_id: application.id,
        joining_date: new Date(offerData.joining_date).toISOString(),
        expiry_date: new Date(offerData.expiry_date).toISOString(),
        work_location: application.job.location,
        work_mode: offerData.work_mode,
        probation_period: 6,
        reporting_manager: managerDetails,
        compensation: [
          {
            type: 'Base Salary',
            amount: Number(offerData.base_salary),
            currency: currencyCode || 'INR',
            frequency: 'ANNUAL'
          }
        ]
      };

      // 1. Create Draft
      const createRes = await axiosInstance.post('/recruitment/offers', payload);
      const offerId = createRes.data.data.id;

      // 2. Publish
      await axiosInstance.post(`/recruitment/offers/${offerId}/publish`);

      // 3. Approve
      await axiosInstance.post(`/recruitment/offers/${offerId}/approve`);

      // 4. Release (This sets status to OFFER_SENT and emails candidate)
      await axiosInstance.post(`/recruitment/offers/${offerId}/release`);

      toast.success('Offer successfully generated and dispatched to the candidate!');
      setShowOfferModal(false);
      await fetchApplicationData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate and dispatch offer');
    } finally {
      setGeneratingOffer(false);
    }
  };

  // Reject action
  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Please enter rejection comments.');
    try {
      setUpdatingStage(true);
      const res = await axiosInstance.post(`/recruitment/applications/${id}/reject`, {
        reason: rejectReason
      });
      if (res.data.success) {
        toast.success('Candidate application rejected successfully.');
        setShowRejectModal(false);
        setRejectReason('');
        await fetchApplicationData();
      }
    } catch (err) {
      toast.error('Rejection submission failed.');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Withdraw action
  const handleWithdraw = async () => {
    if (!withdrawReason.trim()) return toast.error('Please enter withdrawal remarks.');
    try {
      setUpdatingStage(true);
      const res = await axiosInstance.post(`/recruitment/applications/${id}/withdraw`, {
        reason: withdrawReason
      });
      if (res.data.success) {
        toast.success('Candidate application withdrawn successfully.');
        setShowWithdrawModal(false);
        setWithdrawReason('');
        await fetchApplicationData();
      }
    } catch (err) {
      toast.error('Withdrawal submission failed.');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Status Badge Mapper
  const getStatusBadge = (status: string) => {
    const styles: any = {
      'APPLIED': 'bg-muted text-foreground border-border',
      'SCREENING': 'bg-primary/10 text-primary border-primary-200',
      'INTERVIEW_SCHEDULED': 'bg-blue-50 text-blue-700 border-blue-200',
      'INTERVIEW_COMPLETED': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'SELECTED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'OFFER_SENT': 'bg-purple-50 text-purple-700 border-purple-200',
      'OFFER_ACCEPTED': 'bg-teal-50 text-teal-700 border-teal-200',
      'BGV_IN_PROGRESS': 'bg-primary/10 text-primary border-primary-200',
      'BGV_CLEARED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'ONBOARDING': 'bg-sky-50 text-sky-700 border-sky-200',
      'EMPLOYEE_CREATED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'REJECTED': 'bg-rose-50 text-rose-700 border-rose-200',
      'WITHDRAWN': 'bg-muted text-muted-foreground border-border',
      'NO_SHOW': 'bg-orange-50 text-orange-700 border-orange-200',
      'EXPIRED': 'bg-amber-50 text-amber-700 border-amber-200'
    };
    return styles[status] || 'bg-muted text-foreground border-border';
  };

  // Parse candidate skills
  const parseSkills = (skillsStr: string): string[] => {
    if (!skillsStr) return [];
    return skillsStr.split(',').map(s => s.trim()).filter(Boolean);
  };

  const handleCopyTrace = (traceId: string) => {
    if (!traceId) return;
    navigator.clipboard.writeText(traceId);
    setCopiedId(traceId);
    toast.success('Trace correlation ID copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Timeline Filtering
  const filteredEvents = applicationDetail?.timeline?.filter((event: any) => {
    const matchesSearch =
      event.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.correlation_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActor = actorFilter ? event.actor_type === actorFilter : true;
    const matchesAction = actionFilter ? event.action_type === actionFilter : true;
    return matchesSearch && matchesActor && matchesAction;
  }) || [];

  const actionTypes = Array.from(
    new Set((applicationDetail?.timeline || []).map((e: any) => e.action_type))
  ) as string[];

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50 flex flex-col justify-center items-center space-y-4 font-sans">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Candidate Profile details...</p>
      </div>
    );
  }

  if (!applicationDetail) {
    return (
      <div className="min-h-screen bg-muted/50 flex flex-col justify-center items-center space-y-4 font-sans">
        <p className="text-sm font-semibold text-rose-500">Failed to load candidate application profile details.</p>
        <Button onClick={() => navigate('/recruitment')} className="bg-primary hover:bg-primary/95 text-white rounded-lg">
          Back to Recruiter Dashboard
        </Button>
      </div>
    );
  }

  const { application } = applicationDetail;
  const { candidate, job } = application;
  const initials = `${candidate.first_name?.[0] ?? ''}${candidate.last_name?.[0] ?? ''}`;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-muted/50/50 min-h-screen text-foreground font-sans w-full">

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground leading-tight">Candidate Profile Review</h1>
            <p className="text-sm text-muted-foreground">Recruitment Application details</p>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <Button
            onClick={() => navigate('/recruitment')}
            variant="outline"
            className="border-border text-foreground hover:bg-muted/50 hover:text-primary rounded-lg h-10 px-4 text-sm font-medium transition-all shadow-sm active:scale-95 flex items-center gap-2 bg-card"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Back to Candidates
          </Button>
        </div>
      </div>

      {/* ── Full-width Profile Summary Card ─────────────────────────── */}
      <Card className="rounded-lg border border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-semibold shadow-sm shrink-0">
              {initials.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-semibold text-foreground">
                  {candidate.first_name} {candidate.last_name}
                </h2>
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(application.status)}`}>
                  {application.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Requisition Position: <span className="font-semibold text-foreground">{job?.title}</span> &bull; App ID: <span className="font-semibold text-primary">#{application.id}</span>
              </p>

              {/* Skills */}
              {candidate.skills && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {parseSkills(candidate.skills).map((skill, i) => (
                    <span key={i} className="bg-card text-foreground px-3 py-1 rounded-lg border border-border text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mt-6 pt-5 border-t border-border">
            {[
              { label: 'Email address', value: candidate.email },
              { label: 'Notice period', value: candidate.notice_period_days ? `${candidate.notice_period_days} Days` : 'N/A' },
              { label: 'Current CTC', value: candidate.current_ctc ? `${Number(candidate.current_ctc).toLocaleString()} ${currencyCode}` : 'Undisclosed' },
              { label: 'Phone number', value: candidate.phone || 'N/A' },
              { label: 'Experience years', value: candidate.experience_years ? `${candidate.experience_years} Years` : 'N/A' },
              { label: 'Expected CTC', value: candidate.expected_ctc ? `${Number(candidate.expected_ctc).toLocaleString()} ${currencyCode}` : 'Undisclosed' },
              { label: 'Target position', value: job?.title || 'N/A' },
              { label: 'DEPARTMENT', value: job?.department || 'N/A' },
              { label: 'LOCATION', value: job?.location || 'Remote' },
            ].map((item, idx) => (
              <div key={idx} className="min-w-0">
                <p className="text-[12px] font-semibold text-muted-foreground">{item.label}</p>
                <p className="text-sm font-normal text-foreground mt-0.5 truncate" title={String(item.value)}>{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 2-Column Body Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT COLUMN (2/3): Timeline + Questionnaire + CV */}
        <div className="lg:col-span-2 space-y-6">

          {/* Activity Timeline */}
          <Card className="rounded-lg border border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/50/50 py-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary shrink-0" />
                  Activity Timeline
                </CardTitle>
              </div>
              {/* Minimal Filters */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Select
                  value={actorFilter}
                  onChange={(val) => setActorFilter(val)}
                  placeholder="All Actors"
                  className="flex-1 sm:flex-none min-w-[120px]"
                  options={[
                    { value: "", label: "All Actors" },
                    { value: "RECRUITER", label: "Recruiter" },
                    { value: "HR_OPS", label: "HR Ops" },
                    { value: "SYSTEM", label: "System" }
                  ]}
                />
                <Select
                  value={actionFilter}
                  onChange={(val) => setActionFilter(val)}
                  placeholder="All Events"
                  className="flex-1 sm:flex-none min-w-[120px]"
                  options={[
                    { value: "", label: "All Events" },
                    ...actionTypes.map(act => ({ value: act, label: act.replace(/_/g, ' ') }))
                  ]}
                />
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {filteredEvents.length > 0 ? (
                <div className="relative border-l-2 border-border ml-3 space-y-8 py-2">
                  {filteredEvents.map((event: any, index: number) => {
                    const eventDate = new Date(event.timestamp);
                    const isSystem = event.actor_type === 'SYSTEM' || !event.actor_type;
                    const isStatusChange = !!(event.previous_state && event.new_state);
                    const actionName = event.action_type.replace(/_/g, ' ');

                    // Determine dot color based on action
                    let dotColor = "bg-slate-400";
                    let ringColor = "ring-slate-100";
                    if (isStatusChange) {
                      dotColor = "bg-primary";
                      ringColor = "ring-primary-50";
                    } else if (actionName.includes('CREATED') || actionName.includes('ADDED')) {
                      dotColor = "bg-emerald-500";
                      ringColor = "ring-emerald-50";
                    } else if (actionName.includes('REJECT') || actionName.includes('WITHDRAW')) {
                      dotColor = "bg-red-500";
                      ringColor = "ring-red-50";
                    }

                    return (
                      <div key={event.id} className="relative pl-6 group">
                        {/* Timeline Node */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${dotColor} ring-4 ${ringColor}`}></div>

                        <div className="space-y-1.5">
                          {/* Header: Action & Time */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="text-[12px] font-medium text-[13px] text-foreground flex items-center gap-2">
                              {isStatusChange ? `Moved to ${event.new_state.replace(/_/g, ' ')}` : actionName}
                            </h4>
                            <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Actor Info */}
                          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                            by {isSystem ? 'System' : <span className="font-semibold text-foreground">{event.actor_type}</span>}
                          </p>

                          {/* Content / Comments */}
                          {event.comments && (
                            <div className="mt-2 text-xs text-foreground leading-relaxed bg-muted/50/50 p-3 rounded-lg border border-border whitespace-pre-wrap">
                              {event.comments}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3 bg-muted/50/50 rounded-lg border border-border border-dashed">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-muted-foreground">No timeline history matches your filters.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questionnaire Responses */}
          {application.answers && (
            <Card className="rounded-lg border border-border shadow-sm bg-card overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Application Questionnaire Responses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5 text-xs font-semibold">
                <div>
                  <span className="text-muted-foreground block mb-1">Why do you believe you are a good fit for this role?</span>
                  <p className="text-foreground font-medium leading-relaxed bg-muted/50 p-3.5 rounded-lg border border-border whitespace-pre-line">
                    {application.answers.why_join || 'N/A'}
                  </p>
                </div>
                {application.answers.primary_skill_exp && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Domain/Skill Experience details</span>
                    <p className="text-foreground font-semibold bg-muted/50 p-3.5 rounded-lg border border-border">{application.answers.primary_skill_exp}</p>
                  </div>
                )}
                <div className="flex justify-between items-center py-2.5 border-b border-border">
                  <span className="text-muted-foreground">Salary expectations aligned?</span>
                  <span className="font-semibold bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary-100">{application.answers.salary_confirmed ? 'Yes, Confirmed' : 'Not explicitly set'}</span>
                </div>
                {application.answers.remarks && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Additional remarks</span>
                    <p className="text-slate-600 font-medium italic bg-muted/50 p-3 rounded-lg border border-border">{application.answers.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CV Download */}
          {candidate.resume_url && (
            <Card className="rounded-lg border border-border shadow-sm bg-card overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold text-foreground">Candidate Attachments & CV</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-muted/50 border border-border rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 border border-primary-100 text-primary rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Uploaded Resume PDF Attachment</div>
                      <div className="text-[10px] text-muted-foreground font-semibold">Scan status: <span className="text-emerald-600 font-semibold">VIRUS_SCAN_CLEAN</span></div>
                    </div>
                  </div>
                  <a
                    href={`http://localhost:3000${candidate.resume_url}`}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="bg-primary hover:bg-primary/95 text-white rounded-lg px-5 py-2.5 text-xs font-semibold shadow-sm flex items-center gap-2 transition duration-200 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Download Resume PDF
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN (1/3): Control Panel + Social + Notes */}
        <div className="space-y-5">

          {/* Recruitment Control Panel */}
          {!['REJECTED', 'EMPLOYEE_CREATED', 'WITHDRAWN'].includes(application.status) && (
            <Card className="rounded-lg border border-border shadow-sm bg-card overflow-hidden">
              <div className="bg-muted/50 border-b border-border px-5 py-4 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-foreground" />
                <span className="text-sm font-semibold text-foreground">RECRUITMENT CONTROL PANEL</span>
              </div>
              <CardContent className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground block">Promote Pipeline Stage</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={String(selectedStage)}
                      onChange={(val) => setSelectedStage(val)}
                      disabled={updatingStage}
                      className="w-full sm:flex-1"
                      options={ALL_STAGES.map(s => ({
                        value: s,
                        label: s.replace(/_/g, ' ')
                      }))}
                    />
                    <Button
                      onClick={() => handleUpdateStatus(application.id, selectedStage)}
                      disabled={updatingStage || selectedStage === application.status}
                      className="w-full sm:w-auto h-11 rounded-lg bg-primary hover:bg-primary/95 text-white px-5 shadow-sm shadow-primary-200 text-xs font-bold transition-all"
                    >
                      {updatingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={updatingStage}
                    className="border-border text-slate-600 hover:bg-muted/50 font-semibold text-xs h-10 rounded-lg"
                  >
                    Withdraw
                  </Button>
                  <Button
                    onClick={() => setShowRejectModal(true)}
                    disabled={updatingStage}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 rounded-lg"
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Social Profiles & Portals */}
          <Card className="rounded-lg border border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/50/50 py-3 px-5">
              <CardTitle className="text-[10px] font-semibold text-muted-foreground">Social Profiles & Portals</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {candidate.linkedin_url || candidate.portfolio_url || candidate.github_url ? (
                <div className="flex gap-3 flex-wrap">
                  {candidate.linkedin_url && (
                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"
                      className="w-11 h-11 rounded-lg bg-muted border border-border flex items-center justify-center text-[#0A66C2] hover:bg-[#0A66C2]/10 hover:border-[#0A66C2]/30 transition"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {candidate.github_url && (
                    <a href={candidate.github_url} target="_blank" rel="noreferrer"
                      className="w-11 h-11 rounded-lg bg-muted border border-border flex items-center justify-center text-[#181717] hover:bg-[#181717]/10 hover:border-[#181717]/30 transition"
                      title="GitHub"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  {candidate.portfolio_url && (
                    <a href={candidate.portfolio_url} target="_blank" rel="noreferrer"
                      className="w-11 h-11 rounded-lg bg-muted border border-border flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition"
                      title="Portfolio"
                    >
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-medium italic">No external profiles provided for this applicant.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Rejection Modal */}
      {showRejectModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Reject Candidate Application</h3>
              <p className="text-xs text-muted-foreground font-semibold mt-1">This operation is logged as an immutable state transition.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">Rejection Remarks <span className="text-rose-500">*</span></label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Provide professional reasons or remarks..." rows={3}
                className="w-full bg-muted/50 border border-border text-xs rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold" />
            </div>
            <div className="flex gap-3 justify-end pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} className="rounded-lg text-xs">Cancel</Button>
              <Button onClick={handleReject} disabled={updatingStage} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs">
                {updatingStage ? 'Submitting...' : 'Reject Application'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Withdraw Application</h3>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Mark candidate as withdrawn from the recruitment pipeline.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">Withdrawal Remarks <span className="text-rose-500">*</span></label>
              <textarea value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} placeholder="Provide remarks or reason..." rows={3}
                className="w-full bg-muted/50 border border-border text-xs rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold" />
            </div>
            <div className="flex gap-3 justify-end pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowWithdrawModal(false)} className="rounded-lg text-xs">Cancel</Button>
              <Button onClick={handleWithdraw} disabled={updatingStage} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs">
                {updatingStage ? 'Submitting...' : 'Withdraw Application'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Offer Generation Modal */}
      {showOfferModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card rounded-lg p-7 max-w-2xl w-full shadow-sm my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Generate Official Offer
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Configure the employment offer parameters. A formal PDF will be generated and dispatched.
                </p>
              </div>
              <button onClick={() => setShowOfferModal(false)} className="p-2 hover:bg-muted rounded-full transition">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Base Salary ({currencyCode || 'INR'}/Year) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">{currencySymbol}</span>
                  <Input
                    type="number"
                    value={offerData.base_salary}
                    onChange={e => setOfferData({ ...offerData, base_salary: e.target.value })}
                    placeholder="e.g. 1200000"
                    className="pl-7 bg-muted/50 border-border"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Reporting Manager</label>
                <div className="min-h-[40px] py-2 bg-muted/50 border border-border rounded-lg px-3 flex items-center text-sm text-foreground font-medium whitespace-normal break-words">
                  {managerDetails}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Joining Date <span className="text-rose-500">*</span></label>
                <ModernDatePicker
                  value={offerData.joining_date}
                  onChange={date => setOfferData({ ...offerData, joining_date: date })}
                  placeholder="Select Joining Date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Offer Expiry Date <span className="text-rose-500">*</span></label>
                <ModernDatePicker
                  value={offerData.expiry_date}
                  onChange={date => setOfferData({ ...offerData, expiry_date: date })}
                  placeholder="Select Expiry Date"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Work Location</label>
                <div className="min-h-[40px] py-2 bg-muted/50 border border-border rounded-lg px-3 flex items-center text-sm text-foreground font-medium whitespace-normal break-words">
                  {application?.job?.location || 'Not Specified'}
                </div>
              </div>
              <div className="space-y-1.5">
                <Select
                  label="Work Mode"
                  value={offerData.work_mode}
                  onChange={(val) => setOfferData({ ...offerData, work_mode: val })}
                  required
                  options={[
                    { value: "Hybrid", label: "Hybrid" },
                    { value: "On-site", label: "On-site" },
                    { value: "Remote", label: "Remote" }
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowOfferModal(false)} className="rounded-lg font-semibold">
                Cancel
              </Button>
              <Button
                onClick={handleGenerateOffer}
                disabled={generatingOffer}
                className="bg-primary hover:bg-primary/95 text-white rounded-lg px-6 font-semibold shadow-sm shadow-primary-200 flex items-center gap-2 transition"
              >
                {generatingOffer ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating & Dispatching...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate & Send Offer</>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default CandidateReview;

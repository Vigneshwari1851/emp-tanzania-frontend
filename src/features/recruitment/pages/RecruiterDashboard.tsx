import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Briefcase, Plus, Clock, CheckCircle2, XCircle, Search,
  FileText, Loader2, Filter, MapPin, Sparkles, ChevronRight, X,
  ExternalLink, Download, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight,
  Activity, Edit
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import Select from '@/shared/components/ui/Select';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
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

const RecruiterDashboard: React.FC = () => {
  const navigate = useOrgNavigate();
  const { currencyCode, currencySymbol } = useCurrency();

  // Get initial job_id from URL query search params if present
  const queryParams = new URLSearchParams(window.location.search);
  const initialJobId = queryParams.get('job_id') || '';

  // Data State
  const [applications, setApplications] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Modals & Action States
  const [activeApplication, setActiveApplication] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawReason, setWithdrawReason] = useState<string>('');

  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [offerData, setOfferData] = useState({
    base_salary: '',
    joining_date: '',
    expiry_date: '',
    work_mode: 'Hybrid'
  });
  const [generatingOffer, setGeneratingOffer] = useState<boolean>(false);
  const [managerDetails, setManagerDetails] = useState<string>('Loading...');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [jobFilter, setJobFilter] = useState(initialJobId);
  const [experienceFilter, setExperienceFilter] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApps, setTotalApps] = useState(0);

  // Table selection & hover state (matches EmployeeManagement pattern)
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const isAllSelected = applications.length > 0 && applications.every(a => selectedIds.has(a.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map(a => a.id)));
    }
  };

  const toggleSelectApp = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [searchTerm, stageFilter, jobFilter, experienceFilter, page]);

  const fetchJobs = async () => {
    try {
      const res = await axiosInstance.get('/recruitment/jobs');
      if (res.data.success) {
        setJobsList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load jobs list', err);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 8
      };
      if (searchTerm) params.search = searchTerm;
      if (stageFilter) params.status = stageFilter;
      if (jobFilter) params.job_id = jobFilter;
      if (experienceFilter) params.experience = experienceFilter;

      const res = await axiosInstance.get('/recruitment/applications', { params });
      if (res.data.success) {
        setApplications(res.data.applications);
        setTotalApps(res.data.pagination.total);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (err) {
      toast.error('Failed to fetch candidate applications list.');
    } finally {
      setLoading(false);
    }
  };

  // Promote / Update Stage Status
  const handleUpdateStatus = async (appId: number, status: string, remarks?: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    if (status === 'REJECTED') {
      setActiveApplication(app);
      setShowRejectModal(true);
      return;
    }
    if (status === 'WITHDRAWN') {
      setActiveApplication(app);
      setShowWithdrawModal(true);
      return;
    }
    if (status === 'OFFER_SENT') {
      setActiveApplication(app);
      setShowOfferModal(true);

      const managerId = app.job?.hiring_manager_id;
      const dept = app.job?.department || '';
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

    try {
      setUpdatingStage(true);
      const res = await axiosInstance.put(`/recruitment/applications/${appId}/status`, {
        status,
        comments: remarks
      });
      if (res.data.success) {
        toast.success(`Application promoted to ${status.replace(/_/g, ' ')} successfully!`);
        // Sync local stats
        fetchApplications();
      }
    } catch (err) {
      toast.error('Failed to update application Candidate stage.');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Reject action
  const handleReject = async () => {
    if (!activeApplication) return;
    if (!rejectReason.trim()) return toast.error('Please enter rejection comments.');
    try {
      setUpdatingStage(true);
      const res = await axiosInstance.post(`/recruitment/applications/${activeApplication.id}/reject`, {
        reason: rejectReason
      });
      if (res.data.success) {
        toast.success('Candidate application rejected successfully.');
        setShowRejectModal(false);
        setRejectReason('');
        setActiveApplication(null);
        await fetchApplications();
      }
    } catch (err) {
      toast.error('Rejection submission failed.');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Withdraw action
  const handleWithdraw = async () => {
    if (!activeApplication) return;
    if (!withdrawReason.trim()) return toast.error('Please enter withdrawal remarks.');
    try {
      setUpdatingStage(true);
      const res = await axiosInstance.post(`/recruitment/applications/${activeApplication.id}/withdraw`, {
        reason: withdrawReason
      });
      if (res.data.success) {
        toast.success('Candidate application withdrawn successfully.');
        setShowWithdrawModal(false);
        setWithdrawReason('');
        setActiveApplication(null);
        await fetchApplications();
      }
    } catch (err) {
      toast.error('Withdrawal submission failed.');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Generate Offer Flow
  const handleGenerateOffer = async () => {
    if (!activeApplication) return;
    try {
      if (!offerData.base_salary || !offerData.joining_date || !offerData.expiry_date) {
        toast.error('Please fill all mandatory offer details.');
        return;
      }

      setGeneratingOffer(true);
      const payload = {
        candidate_id: activeApplication.candidate.id,
        job_id: activeApplication.job.id,
        application_id: activeApplication.id,
        joining_date: new Date(offerData.joining_date).toISOString(),
        expiry_date: new Date(offerData.expiry_date).toISOString(),
        work_location: activeApplication.job.location,
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
      setActiveApplication(null);
      await fetchApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate and dispatch offer');
    } finally {
      setGeneratingOffer(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStageFilter('');
    setJobFilter('');
    setExperienceFilter('');
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      'APPLIED': 'bg-muted text-foreground border-border',
      'SCREENING': 'bg-primary/10 text-primary border-primary-150',
      'INTERVIEW_SCHEDULED': 'bg-blue-50 text-blue-700 border-blue-200/50',
      'INTERVIEW_COMPLETED': 'bg-cyan-50 text-cyan-700 border-cyan-200/50',
      'SELECTED': 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
      'OFFER_SENT': 'bg-purple-50 text-purple-700 border-purple-200/50',
      'OFFER_ACCEPTED': 'bg-teal-50 text-teal-700 border-teal-200/50',
      'BGV_IN_PROGRESS': 'bg-primary/10 text-primary border-primary-200/50',
      'BGV_CLEARED': 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
      'ONBOARDING': 'bg-sky-50 text-sky-700 border-sky-200/50',
      'EMPLOYEE_CREATED': 'bg-emerald-100 text-emerald-700 border-emerald-200/80 font-semibold',
      'REJECTED': 'bg-rose-50 text-rose-700 border-rose-200/50',
      'WITHDRAWN': 'bg-muted text-muted-foreground border-border',
      'NO_SHOW': 'bg-orange-50 text-orange-700 border-orange-200/50',
      'EXPIRED': 'bg-amber-50 text-amber-700 border-amber-200/50'
    };
    return styles[status] || 'bg-muted text-foreground border-border';
  };

  // Parse candidate skills CSV to string array
  const parseSkills = (skillsStr: string): string[] => {
    if (!skillsStr) return [];
    return skillsStr.split(',').map(s => s.trim()).filter(Boolean);
  };

  // Formats bytes to MB
  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="p-2 space-y-8 bg-muted/50/50 min-h-screen text-foreground font-sans w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Candidates</h1>
              <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary-100/50 px-2.5 py-0.5 rounded-full">
                {totalApps} total
              </span>
            </div>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Monitor candidate applications, stage promotions, audit traces, and convert selects to hires
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted/50 hover:text-primary rounded-lg h-11 px-5 text-sm font-medium transition-all shadow-sm active:scale-95 w-full sm:w-auto flex items-center justify-center cursor-pointer"
            onClick={() => navigate('/recruitment/jobs')}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Job Management
          </Button>
          <Button
            className="bg-primary hover:bg-primary/95 text-white rounded-lg h-11 px-6 shadow-sm shadow-primary-100 hover:shadow-primary-200 hover:-translate-y-0.5 active:scale-95 transition-all w-full sm:w-auto flex items-center justify-center cursor-pointer font-semibold"
            onClick={() => navigate('/recruitment/add-candidate')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Candidate applications', value: totalApps, icon: Users, color: 'text-primary', bg: 'bg-primary/10 border-primary-100/30' },
          { label: 'Offers Released', value: applications.filter(a => a.status === 'OFFER_SENT').length, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100/30' },
          { label: 'Pending BGV Checks', value: applications.filter(a => a.status === 'BGV_IN_PROGRESS').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100/30' },
          { label: 'Onboarding Converts', value: applications.filter(a => a.status === 'EMPLOYEE_CREATED').length, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100/30' }
        ].map((stat, i) => (
          <Card key={i} className="border border-border/60 shadow-sm hover:shadow-sm transition-all rounded-lg bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-normal text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-semibold text-foreground mt-2">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-lg ${stat.bg} border`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Accordion Panel */}
      <Card className="border border-border/60 shadow-sm rounded-lg bg-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Filter className="w-4.5 h-4.5 text-primary" />
            Candidate Search Filters
          </span>
          {(searchTerm || stageFilter || jobFilter || experienceFilter) && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-primary hover:text-primary-800 transition flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Multi-Dimensional Query Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
          {/* Keyword Search */}
          <div>
            <label className="block text-muted-foreground mb-2">Keyword match</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Name, email, job title..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 h-10 border-border rounded-lg"
              />
            </div>
          </div>

          {/* Job Filter */}
          <div>
            <Select
              label="Job Requisition"
              value={jobFilter}
              onChange={(val) => { setJobFilter(val); setPage(1); }}
              placeholder="All Job Positions"
              options={[
                { value: "", label: "All Job Positions" },
                ...jobsList.map(j => ({ value: String(j.job_id), label: j.title }))
              ]}
            />
          </div>

          {/* Stage filter */}
          <div>
            <Select
              label="Candidate Stage"
              value={stageFilter}
              onChange={(val) => { setStageFilter(val); setPage(1); }}
              placeholder="All Candidate Stages"
              options={[
                { value: "", label: "All Candidate Stages" },
                ...['APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'BGV_IN_PROGRESS', 'BGV_CLEARED', 'ONBOARDING', 'EMPLOYEE_CREATED', 'REJECTED', 'WITHDRAWN', 'NO_SHOW', 'EXPIRED'].map(s => ({ value: s, label: s.replace(/_/g, ' ') }))
              ]}
            />
          </div>

          {/* Experience Filter */}
          <div>
            <Select
              label="Years of Experience"
              value={experienceFilter}
              onChange={(val) => { setExperienceFilter(val); setPage(1); }}
              placeholder="Any Experience"
              options={[
                { value: "", label: "Any Experience" },
                { value: "0-1", label: "Entry (0-1 Year)" },
                { value: "1-3", label: "Junior (1-3 Years)" },
                { value: "3-5", label: "Mid-level (3-5 Years)" },
                { value: "5-10", label: "Senior (5-10 Years)" },
                { value: "10+", label: "Architect (10+ Years)" }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* ── Main Applications Table ─────────────────────────────── */}
      <Card className="rounded-sm shadow-sm border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead className="bg-muted border-b border-border">
                <tr>
                  {/* Checkbox col */}
                  <th className="pl-4 pr-3 py-3 text-left w-10 font-semibold text-sm text-black">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className={`rounded border-gray-300 text-primary focus:ring-primary transition-opacity duration-200 ${selectedIds.size > 0 || hoveredId !== null ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    />
                  </th>
                  {[
                    { label: 'Candidate', cls: '' },
                    { label: 'Job', cls: 'hidden sm:table-cell' },
                    { label: 'Stage', cls: '' },
                    { label: 'Applied', cls: 'hidden md:table-cell' },
                    { label: 'Actions', cls: 'text-right' },
                  ].map(col => (
                    <th key={col.label} className={`px-4 py-3 text-left text-sm font-semibold text-black ${col.cls}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-card divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto text-primary" />
                      <span className="block text-xs font-semibold text-muted-foreground mt-2">Loading applications...</span>
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <span className="block text-sm font-semibold">No applications found.</span>
                      <span className="text-xs text-muted-foreground">Try adjusting your filters or search term.</span>
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => {
                    const isHovered = hoveredId === app.id;
                    const isSelected = selectedIds.has(app.id);
                    const hasSelections = selectedIds.size > 0;
                    const showCheckbox = isHovered || isSelected || hasSelections;
                    const initials = `${app.candidate?.first_name?.[0] ?? ''}${app.candidate?.last_name?.[0] ?? ''}`;

                    return (
                      <tr
                        key={app.id}
                        className={`hover:bg-muted transition-colors cursor-pointer ${isSelected ? 'bg-primary/10/30' : ''
                          }`}
                        onMouseEnter={() => setHoveredId(app.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => navigate(`/recruitment/applications/${app.id}/review`)}
                      >
                        {/* Checkbox */}
                        <td className="pl-4 pr-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectApp(app.id)}
                            className={`rounded border-gray-300 text-primary focus:ring-primary transition-opacity duration-200 ${showCheckbox ? 'opacity-100' : 'opacity-0 pointer-events-none'
                              }`}
                          />
                        </td>

                        {/* Candidate name + email + phone */}
                        <td className="pl-3 pr-6 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {initials.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">
                                {app.candidate?.first_name} {app.candidate?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {app.candidate?.email} {app.candidate?.phone ? `• ${app.candidate.phone}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Job title + department + location */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-sm font-medium text-foreground truncate">{app.job?.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{[app.job?.department, app.job?.location].filter(Boolean).join(' • ')}</p>
                        </td>

                        {/* Stage badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(app.status)
                            }`}>
                            {app.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Applied date */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {new Date(app.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={String(app.status)}
                              onChange={(val) => handleUpdateStatus(app.id, val)}
                              disabled={updatingStage}
                              className="min-w-[140px]"
                              options={ALL_STAGES.map(s => ({
                                value: s,
                                label: s.replace(/_/g, ' ')
                              }))}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/recruitment/edit-candidate/${app.candidate_id}`)}
                              className="text-muted-foreground hover:bg-muted rounded-lg h-8 px-2 text-xs font-semibold"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/recruitment/applications/${app.id}/review`)}
                              className="text-primary hover:bg-primary/10 rounded-lg h-8 px-3 text-xs font-semibold"
                            >
                              Review
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* Pager */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
            <p className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of {totalPages} &mdash; {totalApps} total records
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="bg-card border border-border text-gray-600 hover:bg-muted text-xs rounded-lg px-4 h-8"
              >
                Previous
              </Button>
              <Button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="bg-card border border-border text-gray-600 hover:bg-muted text-xs rounded-lg px-4 h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>


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
              <Button variant="outline" onClick={() => { setShowRejectModal(false); setActiveApplication(null); }} className="rounded-lg text-xs">Cancel</Button>
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
              <Button variant="outline" onClick={() => { setShowWithdrawModal(false); setActiveApplication(null); }} className="rounded-lg text-xs">Cancel</Button>
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
              <button onClick={() => { setShowOfferModal(false); setActiveApplication(null); }} className="p-2 hover:bg-muted rounded-full transition">
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
                    className={`${currencySymbol.length > 2 ? 'pl-14' : currencySymbol.length > 1 ? 'pl-10' : 'pl-8'} bg-muted/50 border-border`}
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
                  {activeApplication?.job?.location || 'Not Specified'}
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
              <Button variant="ghost" onClick={() => { setShowOfferModal(false); setActiveApplication(null); }} className="rounded-lg font-semibold">
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

export default RecruiterDashboard;

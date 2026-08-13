import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Plus, Search, MapPin, Users, Briefcase, Filter,
  Edit, Eye, Clock, TrendingUp, Copy, Archive, CheckCircle2, FileText, ChevronDown,
  X, Mail, Phone, Calendar, ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import Select from '@/shared/components/ui/Select';

export const JobManagement: React.FC = () => {
  const navigate = useOrgNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [typeFilter, setTypeFilter] = useState('All Types');

  // Quick Action States
  const [activeStatusMenu, setActiveStatusMenu] = useState<number | null>(null);

  // Candidates Drawer State
  const [selectedJobForCandidates, setSelectedJobForCandidates] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('All Stages');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/recruitment/jobs');
      if (res.data.success) {
        setJobs(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const activeJobsCount = jobs.filter(j => j.status === 'OPEN').length;

  const filteredJobs = jobs.filter(job => {
    if (searchTerm && !job.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== 'All Status' && job.status !== (statusFilter === 'Active' ? 'OPEN' : statusFilter.toUpperCase())) return false;
    if (deptFilter !== 'All Departments' && job.department !== deptFilter) return false;
    if (typeFilter !== 'All Types' && job.employment_type !== typeFilter) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'DRAFT': return 'bg-muted/50 text-foreground border-border';
      case 'CLOSED': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'ON_HOLD': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-primary/10 text-primary border-primary-100';
    }
  };

  const formatStatusText = (status: string) => {
    if (status === 'OPEN') return 'Active';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ');
  };

  // Enterprise Dynamic Actions
  const handlePublishJob = async (jobId: number, title: string) => {
    try {
      const promise = axiosInstance.post(`/recruitment/jobs/${jobId}/publish`);
      toast.promise(promise, {
        loading: `Publishing ${title}...`,
        success: () => {
          setJobs(prevJobs => prevJobs.map(job =>
            job.job_id === jobId ? { ...job, status: 'OPEN' } : job
          ));
          return `"${title}" has been published and is now Active!`;
        },
        error: 'Failed to publish job posting'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveJob = async (jobId: number, title: string) => {
    try {
      const promise = axiosInstance.post(`/recruitment/jobs/${jobId}/archive`);
      toast.promise(promise, {
        loading: `Archiving ${title}...`,
        success: () => {
          setJobs(prevJobs => prevJobs.map(job =>
            job.job_id === jobId ? { ...job, status: 'CLOSED' } : job
          ));
          return `"${title}" has been closed and archived successfully.`;
        },
        error: 'Failed to archive job posting'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDraft = async (jobId: number, title: string) => {
    try {
      const promise = axiosInstance.post(`/recruitment/jobs/${jobId}/save-draft`);
      toast.promise(promise, {
        loading: `Saving ${title} to drafts...`,
        success: () => {
          setJobs(prevJobs => prevJobs.map(job =>
            job.job_id === jobId ? { ...job, status: 'DRAFT' } : job
          ));
          return `"${title}" has been set to Draft status.`;
        },
        error: 'Failed to save draft'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = (jobId: number, title: string) => {
    const url = `${window.location.origin}/careers/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
    toast.success(`Application link copied to clipboard!`, {
      description: url,
      duration: 3000
    });
  };

  const fetchCandidates = async (jobId: number) => {
    try {
      setLoadingCandidates(true);
      const res = await axiosInstance.get(`/recruitment/jobs/${jobId}/candidates`);
      if (res.data.success) {
        setCandidates(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load candidate applications');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleUpdateCandidateStatus = async (applicationId: number, newStatus: string) => {
    try {
      const promise = axiosInstance.put(`/recruitment/applications/${applicationId}/status`, {
        status: newStatus
      });
      toast.promise(promise, {
        loading: 'Updating stage status...',
        success: () => {
          setCandidates(prev => prev.map(app =>
            app.id === applicationId ? { ...app, status: newStatus } : app
          ));
          // Refresh jobs list to update counts/stats reactively on cards
          fetchJobs();
          return 'Candidate stage updated successfully!';
        },
        error: 'Failed to update candidate stage status'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getStageBadgeColor = (status: string) => {
    switch (status) {
      case 'APPLIED': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'SCREENING': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_COMPLETED': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'SELECTED':
      case 'OFFER_ACCEPTED':
      case 'BGV_CLEARED':
      case 'ONBOARDING': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'EMPLOYEE_CREATED': return 'bg-primary/10 text-primary border-primary-100';
      case 'REJECTED':
      case 'WITHDRAWN':
      case 'NO_SHOW': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-muted/50 text-foreground border-border';
    }
  };

  const filteredCandidates = candidates.filter((app: any) => {
    const candidateName = `${app.candidate?.first_name || ''} ${app.candidate?.last_name || ''}`.toLowerCase();
    const candidateEmail = (app.candidate?.email || '').toLowerCase();
    const query = candidateSearch.toLowerCase();
    
    const matchesSearch = candidateName.includes(query) || candidateEmail.includes(query);
    const matchesStage = candidateStatusFilter === 'All Stages' || app.status === candidateStatusFilter;
    
    return matchesSearch && matchesStage;
  });

  useEffect(() => {
    if (selectedJobForCandidates) {
      fetchCandidates(selectedJobForCandidates.job_id);
    } else {
      setCandidates([]);
    }
  }, [selectedJobForCandidates]);

  return (
    <div className="p-2 md:p-4 w-full max-w-full mx-auto animate-in fade-in duration-500 bg-muted/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Job Postings</h1>
              <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary-100/50 px-2.5 py-0.5 rounded-full">
                {activeJobsCount} active
              </span>
            </div>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Manage, edit, and track applicant stages for open roles
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/recruitment/jobs/new')}
          className="bg-primary hover:bg-primary/95 text-white rounded-lg h-11 px-6 shadow-sm shadow-primary-100 hover:shadow-primary-200 hover:-translate-y-0.5 active:scale-95 transition-all w-full sm:w-auto sm:ml-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Job Posting
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-border/60 shadow-sm mb-8 flex flex-col xl:flex-row gap-4 items-center w-full">
        {/* Search Input */}
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search job titles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 w-full border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all shadow-sm text-sm"
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto xl:flex-shrink-0">
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder="All Status"
            options={[
              { value: "All Status", label: "All Status" },
              { value: "Active", label: "Active" },
              { value: "Draft", label: "Draft" },
              { value: "Closed", label: "Closed" }
            ]}
          />
          <Select
            value={deptFilter}
            onChange={(val) => setDeptFilter(val)}
            placeholder="All Departments"
            options={[
              { value: "All Departments", label: "All Departments" },
              { value: "Engineering", label: "Engineering" },
              { value: "Product", label: "Product" },
              { value: "Design", label: "Design" },
              { value: "Marketing", label: "Marketing" },
              { value: "Sales", label: "Sales" }
            ]}
          />
          <Select
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            placeholder="All Types"
            options={[
              { value: "All Types", label: "All Types" },
              { value: "Full-time", label: "Full-time" },
              { value: "Part-time", label: "Part-time" },
              { value: "Contract", label: "Contract" }
            ]}
          />
        </div>
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-card p-12 text-center rounded-lg border border-border/60 shadow-sm max-w-md mx-auto mt-12 animate-in fade-in duration-300">
          <Briefcase className="w-12 h-12 text-primary-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No job postings found</h3>
          <p className="text-sm text-muted-foreground mt-1.5">Try adjusting your filters or create a new job posting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
          {filteredJobs.map((job) => (
            <div
              key={job.job_id}
              className="bg-card hover:bg-muted/50/10 rounded-lg border border-border/60 shadow-sm hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 p-5 sm:p-6 flex flex-col group relative overflow-hidden h-full"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 w-full">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug break-words pr-1 flex items-center gap-1.5">
                      {job.title}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(job.job_id, job.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-all flex-shrink-0 cursor-pointer"
                        title="Copy Application Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </h2>
                    <div className="flex items-center gap-1 flex-wrap">
                      {job.remote_option === 'Remote' && (
                        <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">Remote</span>
                      )}
                      {job.remote_option === 'Hybrid' && (
                        <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Hybrid</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{job.location}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full flex-shrink-0"></span>
                    <span className="truncate max-w-[120px]">{job.department}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStatusMenu(activeStatusMenu === job.job_id ? null : job.job_id);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1 ${getStatusColor(job.status)}`}
                  >
                    <span>{formatStatusText(job.status)}</span>
                    <ChevronDown className="w-3 h-3 text-current opacity-70" />
                  </button>

                  {/* Status Change Dropdown Menu */}
                  {activeStatusMenu === job.job_id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setActiveStatusMenu(null)} />
                      <div className="absolute right-0 top-full mt-1.5 w-44 bg-card rounded-lg border border-border/80 shadow-sm z-30 p-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">Change Status</p>
                        {job.status !== 'OPEN' && (
                          <button
                            onClick={() => {
                              handlePublishJob(job.job_id, job.title);
                              setActiveStatusMenu(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Set Active</span>
                          </button>
                        )}
                        {job.status !== 'DRAFT' && (
                          <button
                            onClick={() => {
                              handleSaveDraft(job.job_id, job.title);
                              setActiveStatusMenu(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Move to Draft</span>
                          </button>
                        )}
                        {job.status !== 'CLOSED' && (
                          <button
                            onClick={() => {
                              handleArchiveJob(job.job_id, job.title);
                              setActiveStatusMenu(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Archive className="w-3.5 h-3.5 text-rose-500" />
                            <span>Close Posting</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6 text-xs sm:text-sm">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Employment Type</p>
                  <p className="font-medium text-foreground break-words leading-tight">{job.employment_type}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Experience Level</p>
                  <p className="font-medium text-foreground break-words leading-tight">{job.experience_level}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Salary Range</p>
                  <p className="font-medium text-foreground break-words leading-tight">
                    {job.salary_type === 'RANGE'
                      ? `${job.currency} ${job.min_salary} - ${job.max_salary}`
                      : job.salary_type === 'FIXED'
                        ? `${job.currency} ${job.fixed_salary}`
                        : 'Undisclosed'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Openings</p>
                  <p className="font-medium text-foreground break-words leading-tight">{job.openings_count} positions</p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="border-t border-b border-border py-3.5 mb-6 grid grid-cols-4 gap-1 sm:gap-2 w-full">
                <div className="text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base font-bold text-foreground">{job._count?.applications || 0}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">Applied</p>
                </div>
                <div className="text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base font-bold text-foreground">{job.screening_count || 0}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">Screening</p>
                </div>
                <div className="text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base font-bold text-foreground">{job.interviews_count || 0}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">Interviews</p>
                </div>
                <div className="text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-bold text-emerald-600">{job.offers_count || 0}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">Offers</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 mb-4 mt-auto w-full">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/recruitment/jobs/edit/${job.job_id}`)}
                  className="w-full h-10 text-foreground border-border hover:bg-muted/50 hover:text-primary transition-all text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center shadow-sm"
                >
                  <Edit className="w-4 h-4 mr-1.5 flex-shrink-0" />
                  <span className="truncate">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/recruitment?job_id=${job.job_id}`)}
                  className="w-full h-10 text-foreground border-border hover:bg-muted/50 hover:text-primary transition-all text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center shadow-sm"
                >
                  <Eye className="w-4 h-4 mr-1.5 flex-shrink-0" />
                  <span className="truncate">Candidates</span>
                </Button>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center text-[10px] sm:text-xs text-muted-foreground mt-2 border-t border-gray-50 pt-2.5 w-full">
                <span>Posted: {new Date(job.created_at).toISOString().split('T')[0]}</span>
                <span>By: {job.hiring_manager_id ? `Manager #${job.hiring_manager_id}` : 'System'}</span>
              </div>

            </div>
          ))}
        </div>
      )}


    </div>
  );
};

export default JobManagement;

import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { 
  MapPin, Briefcase, Clock, Sparkles, ArrowLeft, Share2, 
  CheckCircle2, DollarSign, Calendar, HelpCircle, FileText, ChevronRight
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';

const formatJobSalary = (amount: any, currencyCode: string) => {
  if (!amount) return '';
  const num = Number(amount);
  if (isNaN(num)) return '';
  const cleanCode = (currencyCode || '').trim().match(/^[A-Z]{3}/i)?.[0]?.toUpperCase() || 'USD';
  try {
    return num.toLocaleString('en-US', { style: 'currency', currency: cleanCode, maximumFractionDigits: 0 });
  } catch {
    return `${cleanCode} ${num.toLocaleString()}`;
  }
};

export const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/recruitment/careers/jobs/${id}`);
      if (res.data.success) {
        setJob(res.data.data);
      } else {
        toast.error('Job details could not be found.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load job listing details.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Job link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Could not copy link.');
    }
  };

  const parseJsonList = (val: any): string[] => {
    if (!val) return [];
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return [val];
      }
    }
    if (Array.isArray(val)) return val;
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl bg-card border border-border rounded-lg p-12 space-y-6 animate-pulse">
          <div className="h-6 w-1/4 bg-slate-200 rounded"></div>
          <div className="h-10 w-2/3 bg-slate-200 rounded-lg"></div>
          <div className="flex gap-4">
            <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
            <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
          </div>
          <div className="h-40 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-muted/50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-card border border-border rounded-lg p-12 max-w-md shadow-sm">
          <HelpCircle className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Role Not Found</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            This job listing is either closed, deleted, or the URL you entered is incorrect.
          </p>
          <Button onClick={() => navigate('/careers')} className="bg-primary hover:bg-primary/95 text-white font-semibold">
            Return to Careers
          </Button>
        </div>
      </div>
    );
  }

  const responsibilitiesList = parseJsonList(job.responsibilities);
  const requirementsList = parseJsonList(job.requirements);
  const skillsList = parseJsonList(job.required_skills);
  const benefitsList = parseJsonList(job.benefits);

  return (
    <div className="min-h-screen bg-muted/50 text-foreground pb-16 font-sans">
      {/* Dynamic Header Area */}
      <div className="bg-slate-900 text-white pt-12 pb-24 px-6 sm:px-12 lg:px-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_50%)]"></div>
        <div className="relative max-w-6xl mx-auto flex flex-col gap-6">
          {/* Back button */}
          <button 
            onClick={() => navigate('/careers')}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition text-sm font-semibold self-start group"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Openings
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="bg-primary-500/10 border border-primary-500/30 text-primary-300 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                {job.department}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                {job.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-slate-300 pt-2">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-400" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-primary-400" />
                  {job.employment_type}
                </span>
                <span className="flex items-center gap-1.5 bg-card/5 border border-white/10 px-2.5 py-0.5 rounded-full text-xs text-primary-200">
                  {job.remote_option}
                </span>
              </div>
            </div>

            {/* Sharing and Action Buttons */}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleShare}
                className="bg-card/10 border border-white/20 hover:bg-card/15 text-white p-3 rounded-lg transition flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                title="Copy Link to Clipboard"
              >
                <Share2 className="w-4 h-4" />
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>
              
              <Button 
                onClick={() => navigate(`/careers/jobs/${job.uuid}/apply`)}
                className="bg-primary hover:bg-primary/95 text-white font-bold px-8 py-3 rounded-lg shadow-sm hover:shadow-primary-600/25 transition flex items-center gap-2"
              >
                Apply Now
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Job Details Layout */}
      <div className="w-full sm:px-12 lg:px-24 -mt-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Description (Left 2 columns) */}
          <div className="lg:col-span-2 bg-card border border-border/80 rounded-lg p-8 sm:p-10 shadow-sm space-y-8">
            
            {/* Overview */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Role Overview
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {job.job_summary}
              </p>
            </div>

            {/* Full description */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-lg font-bold text-foreground">Job Description</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </div>

            {/* Key Responsibilities */}
            {responsibilitiesList.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Key Responsibilities
                </h2>
                <ul className="grid grid-cols-1 gap-3 text-slate-600 text-sm">
                  {responsibilitiesList.map((resp, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0"></span>
                      <span className="leading-relaxed">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {requirementsList.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Requirements & Qualifications
                </h2>
                <ul className="grid grid-cols-1 gap-3 text-slate-600 text-sm">
                  {requirementsList.map((req, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0"></span>
                      <span className="leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {benefitsList.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Benefits & Perks
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-sm">
                  {benefitsList.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2.5 bg-muted/50 p-3 rounded-lg border border-border">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Job Overview Sidebar (Right column) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick Summary widget */}
            <div className="bg-card border border-border/80 rounded-lg p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-foreground text-lg border-b border-border pb-3">Role Details</h3>
              
              <div className="space-y-4 text-sm">
                
                {/* Location */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary-100 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase">Job Location</div>
                    <div className="font-semibold text-foreground">{job.location}</div>
                  </div>
                </div>

                {/* Employment Type */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary-100 shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase">Employment Type</div>
                    <div className="font-semibold text-foreground">{job.employment_type}</div>
                  </div>
                </div>

                {/* Experience Required */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary-100 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase">Experience Level</div>
                    <div className="font-semibold text-foreground">{job.experience_level}</div>
                  </div>
                </div>

                {/* Salary details */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary-100 shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase">Compensation Package</div>
                    <div className="font-semibold text-foreground">
                      {job.salary_type === 'RANGE' && job.min_salary && job.max_salary ? (
                        <span>
                          {formatJobSalary(job.min_salary, job.currency)} - {formatJobSalary(job.max_salary, job.currency)} {job.salary_period && `(${job.salary_period})`}
                        </span>
                      ) : job.salary_type === 'FIXED' && job.fixed_salary ? (
                        <span>{formatJobSalary(job.fixed_salary, job.currency)} {job.salary_period && `(${job.salary_period})`}</span>
                      ) : (
                        <span>Undisclosed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deadline */}
                {job.application_deadline && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary-100 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase">Apply Before</div>
                      <div className="font-semibold text-rose-600">{new Date(job.application_deadline).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Skills required tags inside card */}
              {skillsList.length > 0 && (
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Key Skill Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((skill, index) => (
                      <span key={index} className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-lg border border-border/50">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick application card sidebar */}
            <div className="bg-gradient-to-tr from-slate-900 via-primary-950 to-primary-900 border border-primary-950 text-white rounded-lg p-6 shadow-sm text-center space-y-4">
              <h4 className="text-[12px] font-medium">Interested in this role?</h4>
              <p className="text-xs text-primary-200 leading-relaxed">
                Submit your CV today and our talent acquisition team will review your application within 48 hours.
              </p>
              <Button 
                onClick={() => navigate(`/careers/jobs/${job.uuid}/apply`)}
                className="w-full bg-card text-primary-950 hover:bg-muted font-bold py-3 rounded-lg shadow-sm transition"
              >
                Apply for this Position
              </Button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

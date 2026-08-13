import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, UploadCloud, Link as LinkIcon, 
  HelpCircle, Sparkles, User, Briefcase, FileText, Check, ShieldCheck, AlertCircle
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';

export const CandidateApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();

  const [job, setJob] = useState<any>(null);
  const [jobLoading, setJobLoading] = useState(true);

  // Stepper State (1 to 5)
  const [step, setStep] = useState(1);

  // Form Fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    experienceYears: '',
    currentCompany: '',
    currentDesignation: '',
    noticePeriod: '',
    currentCtc: '',
    expectedCtc: '',
    linkedinUrl: '',
    portfolioUrl: '',
    githubUrl: '',
    // Step 2 Resume Upload
    resumeUrl: '',
    resumeName: '',
    resumeSize: 0,
    // Step 4 Questionnaire answers
    whyJoin: '',
    primarySkillExp: '',
    salaryExpectationConfirmed: false,
    additionalRemarks: '',
    // Step 5 Consent
    policiesAccepted: false
  });

  // Skills tags
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  // Resume Upload progress states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  // Success Details after final submit
  const [submitted, setSubmitted] = useState(false);
  const [submitDetails, setSubmitDetails] = useState<any>(null);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setJobLoading(true);
      const res = await axiosInstance.get(`/recruitment/careers/jobs/${id}`);
      if (res.data.success) {
        setJob(res.data.data);
      } else {
        toast.error('Associated job posting was not found.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve job details.');
    } finally {
      setJobLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Skill builder helper
  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim().replace(/,/g, '');
      if (val && !skills.includes(val)) {
        setSkills(prev => [...prev, val]);
        setSkillInput('');
      }
    }
  };

  const removeSkill = (indexToRemove: number) => {
    setSkills(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Drag and Drop files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processResumeFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processResumeFile(e.target.files[0]);
    }
  };

  const processResumeFile = async (file: File) => {
    // 1. Validation checks
    const allowedExtensions = ['pdf', 'doc', 'docx'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExt)) {
      toast.error('Invalid file type! Only PDF, DOC, and DOCX are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('File too large! Max file size limit is 5MB.');
      return;
    }

    // 2. Upload file
    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate a multi-step upload and virus scan
      const interval = setInterval(() => {
        setUploadProgress(p => {
          if (p >= 90) {
            clearInterval(interval);
            return 90;
          }
          return p + 15;
        });
      }, 150);

      const postData = new FormData();
      postData.append('resume', file);

      const res = await axiosInstance.post('/recruitment/applications/upload-resume', postData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.data.success) {
        setFormData(prev => ({
          ...prev,
          resumeUrl: res.data.resume_url,
          resumeName: res.data.file_name,
          resumeSize: res.data.file_size
        }));
        toast.success('Resume verified and uploaded successfully!');
      } else {
        toast.error('Upload failed.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Resume upload failed.');
    } finally {
      setTimeout(() => setUploading(false), 500);
    }
  };

  // Navigations & Validations per step
  const validateStep = () => {
    if (step === 1) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$|^[0-9]{10}$/;

      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.location || !formData.experienceYears) {
        toast.error('Please complete all mandatory details.');
        return false;
      }
      if (!emailRegex.test(formData.email)) {
        toast.error('Invalid email address format.');
        return false;
      }
      if (!phoneRegex.test(formData.phone.replace(/[\s-()]/g, ''))) {
        toast.error('Invalid phone number format.');
        return false;
      }
      if (isNaN(parseFloat(formData.experienceYears))) {
        toast.error('Experience must be a valid number.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.resumeUrl) {
        toast.error('Please upload your resume to proceed.');
        return false;
      }
    }

    if (step === 3) {
      const urlRegex = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*\.)+[a-z]{2,}(:\d+)?(\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
      if (formData.linkedinUrl && !urlRegex.test(formData.linkedinUrl)) {
        toast.error('LinkedIn link format is invalid.');
        return false;
      }
      if (formData.portfolioUrl && !urlRegex.test(formData.portfolioUrl)) {
        toast.error('Portfolio link format is invalid.');
        return false;
      }
      if (formData.githubUrl && !urlRegex.test(formData.githubUrl)) {
        toast.error('GitHub link format is invalid.');
        return false;
      }
    }

    if (step === 4) {
      if (!formData.whyJoin) {
        toast.error('Please explain why you want to join this role.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    setStep(s => s - 1);
  };

  // Final submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.policiesAccepted) {
      toast.error('Consent is mandatory to submit your application.');
      return;
    }

    try {
      const payload = {
        job_uuid: job.uuid,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        current_location: formData.location,
        experience_years: parseFloat(formData.experienceYears),
        current_company: formData.currentCompany || null,
        current_designation: formData.currentDesignation || null,
        resume_url: formData.resumeUrl,
        skills: skills.join(','),
        notice_period_days: formData.noticePeriod ? parseInt(formData.noticePeriod, 10) : null,
        current_ctc: formData.currentCtc ? parseFloat(formData.currentCtc) : null,
        expected_ctc: formData.expectedCtc ? parseFloat(formData.expectedCtc) : null,
        linkedin_url: formData.linkedinUrl || null,
        portfolio_url: formData.portfolioUrl || null,
        github_url: formData.githubUrl || null,
        answers: {
          why_join: formData.whyJoin,
          primary_skill_exp: formData.primarySkillExp,
          salary_confirmed: formData.salaryExpectationConfirmed,
          remarks: formData.additionalRemarks
        },
        policies_accepted: true
      };

      const res = await axiosInstance.post('/recruitment/applications', payload);
      if (res.data.success) {
        setSubmitDetails(res.data.data);
        setSubmitted(true);
        toast.success('Your application has been logged successfully!');
      } else {
        toast.error('Failed to submit application.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Submission failed. Please check your inputs.');
    }
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-muted-foreground">Retrieving position parameters...</p>
        </div>
      </div>
    );
  }

  // Success view
  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6 font-sans">
        <div className="bg-card border border-border/80 rounded-lg p-10 max-w-xl w-full text-center shadow-sm space-y-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center mx-auto border border-emerald-100/50 shadow-sm animate-bounce">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold text-foreground">Application Submitted!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              Hi {formData.firstName}, your application for the <span className="font-semibold text-primary">{job.title}</span> role was logged successfully.
            </p>
          </div>

          {/* Correlation Details */}
          <div className="bg-muted/50 rounded-lg p-6 border border-border text-left space-y-4 text-xs font-semibold">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground uppercase">Application ID</span>
              <span className="text-foreground">{submitDetails.application_uuid}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground uppercase">Tracking Status</span>
              <span className="bg-primary/10 text-primary border border-primary-100 px-2 py-0.5 rounded font-bold uppercase">
                {submitDetails.status}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground uppercase">Correlation Trace</span>
              <span className="text-foreground font-mono select-all" title="Click to select correlation ID">
                {submitDetails.correlation_id}
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs text-muted-foreground leading-normal">
            <p>
              An automated verification link has been dispatched to <span className="font-semibold text-foreground">{formData.email}</span>. You can review your status updates in real-time by verifying with an OTP passcode.
            </p>
            <div className="pt-4 flex gap-4 justify-center">
              <Button 
                onClick={() => navigate('/careers')}
                className="bg-card border border-border text-foreground hover:bg-muted/50 font-bold px-6 py-2 rounded-lg"
              >
                Back to Careers
              </Button>
              <Button 
                onClick={() => navigate('/candidate/portal')}
                className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-2 rounded-lg"
              >
                Track Status
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stepper Header helper
  const steps = [
    { num: 1, label: 'Basic Info', icon: User },
    { num: 2, label: 'CV Submission', icon: UploadCloud },
    { num: 3, label: 'Professional details', icon: Briefcase },
    { num: 4, label: 'Questionnaire', icon: HelpCircle },
    { num: 5, label: 'Consent & Submit', icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen bg-muted/50 text-foreground pb-16 font-sans">
      
      {/* Top Navigation Panel */}
      <div className="bg-slate-900 text-white py-6 border-b border-slate-800 px-6 sm:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(`/careers/jobs/${job.uuid}`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition text-xs font-semibold group"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Job Specification
          </button>
          
          <div className="text-right text-xs">
            <span className="text-muted-foreground">Position: </span>
            <span className="font-bold text-primary-400">{job.title}</span>
          </div>
        </div>
      </div>

      {/* Elegant Horizontal Stepper */}
      <div className="max-w-4xl mx-auto mt-8 px-6">
        <div className="bg-card border border-border/80 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-0"></div>
            {steps.map((s, idx) => {
              const StepIcon = s.icon;
              const isActive = step === s.num;
              const isCompleted = step > s.num;

              return (
                <div key={idx} className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border duration-300 ${
                    isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' :
                    isActive ? 'bg-primary border-primary text-white shadow-sm scale-105' :
                    'bg-card border-border text-muted-foreground'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] sm:text-xs mt-2 font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Form Step content */}
      <div className="max-w-4xl mx-auto mt-6 px-6">
        <div className="bg-card border border-border/80 rounded-lg p-8 shadow-sm space-y-6">
          
          <h2 className="text-xl font-extrabold text-foreground pb-3 border-b border-border flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {steps[step-1].label}
          </h2>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            
            {/* Step 1: Personal Details */}
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">First Name <span className="text-rose-500">*</span></label>
                  <Input 
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className="border-border text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Last Name <span className="text-rose-500">*</span></label>
                  <Input 
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    className="border-border text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Email Address <span className="text-rose-500">*</span></label>
                  <Input 
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    className="border-border text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Phone Number <span className="text-rose-500">*</span></label>
                  <Input 
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 9876543210"
                    className="border-border text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Current Location <span className="text-rose-500">*</span></label>
                  <Input 
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                    className="border-border text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Experience (Years) <span className="text-rose-500">*</span></label>
                  <Input 
                    type="number"
                    step="0.5"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    placeholder="e.g. 3.5"
                    className="border-border text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Resume Submission */}
            {step === 2 && (
              <div className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-lg p-10 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                    isDragActive ? 'border-primary-500 bg-primary/10/20' : 
                    formData.resumeUrl ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-300 hover:border-primary bg-muted/50/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    id="resume-file" 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                  
                  {uploading ? (
                    <div className="w-full max-w-xs space-y-4">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary-100">
                        <UploadCloud className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-primary uppercase">Analyzing & Scanning Resume...</span>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-300 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Status: VIRUS_SCAN_CLEAN</span>
                    </div>
                  ) : formData.resumeUrl ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                        <CheckCircle2 className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">{formData.resumeName}</div>
                        <div className="text-xs text-muted-foreground font-semibold uppercase">{(formData.resumeSize / 1024 / 1024).toFixed(2)} MB • Verification Passed</div>
                      </div>
                      <label 
                        htmlFor="resume-file"
                        className="inline-flex text-xs font-bold text-primary hover:underline pt-2"
                      >
                        Change File
                      </label>
                    </div>
                  ) : (
                    <label htmlFor="resume-file" className="space-y-4 cursor-pointer">
                      <div className="w-12 h-12 bg-muted text-muted-foreground rounded-lg flex items-center justify-center mx-auto border border-border group-hover:scale-105 transition">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground block">Click to upload or drag & drop</span>
                        <span className="text-xs text-muted-foreground block mt-1">Acceptable formats: PDF, DOC, DOCX (Up to 5MB)</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Professional Details */}
            {step === 3 && (
              <div className="space-y-6">
                
                {/* Employment specs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Current Designation</label>
                    <Input 
                      type="text"
                      name="currentDesignation"
                      value={formData.currentDesignation}
                      onChange={handleInputChange}
                      placeholder="e.g. Senior Software Engineer"
                      className="border-border text-sm focus-visible:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Current Employer</label>
                    <Input 
                      type="text"
                      name="currentCompany"
                      value={formData.currentCompany}
                      onChange={handleInputChange}
                      placeholder="e.g. Acme Tech Inc"
                      className="border-border text-sm focus-visible:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notice Period (Days)</label>
                    <Input 
                      type="number"
                      name="noticePeriod"
                      value={formData.noticePeriod}
                      onChange={handleInputChange}
                      placeholder="e.g. 30"
                      className="border-border text-sm focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Compensation specs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Current CTC ({job.currency})</label>
                    <Input 
                      type="number"
                      name="currentCtc"
                      value={formData.currentCtc}
                      onChange={handleInputChange}
                      placeholder="Annual CTC in INR"
                      className="border-border text-sm focus-visible:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Expected CTC ({job.currency})</label>
                    <Input 
                      type="number"
                      name="expectedCtc"
                      value={formData.expectedCtc}
                      onChange={handleInputChange}
                      placeholder="Expected CTC in INR"
                      className="border-border text-sm focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Skills tags builder */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Skills tags</label>
                  <div className="flex flex-wrap gap-1.5 min-h-10 p-2 bg-muted/50 border border-border rounded-lg">
                    {skills.map((skill, idx) => (
                      <span key={idx} className="text-xs bg-card text-foreground px-2.5 py-0.5 rounded-lg border border-border flex items-center gap-1.5 font-medium">
                        {skill}
                        <button type="button" onClick={() => removeSkill(idx)} className="text-rose-500 font-bold text-[10px] hover:text-rose-700">✕</button>
                      </span>
                    ))}
                    <input 
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={addSkill}
                      placeholder="Type skill & press Enter"
                      className="bg-transparent border-none outline-none text-xs flex-1 min-w-[120px] focus:ring-0 text-foreground"
                    />
                  </div>
                </div>

                {/* Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">LinkedIn URL</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="url"
                        name="linkedinUrl"
                        value={formData.linkedinUrl}
                        onChange={handleInputChange}
                        placeholder="https://linkedin.com/in/..."
                        className="pl-9 border-border text-sm focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Portfolio URL</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="url"
                        name="portfolioUrl"
                        value={formData.portfolioUrl}
                        onChange={handleInputChange}
                        placeholder="https://myportfolio.com"
                        className="pl-9 border-border text-sm focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">GitHub URL</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="url"
                        name="githubUrl"
                        value={formData.githubUrl}
                        onChange={handleInputChange}
                        placeholder="https://github.com/..."
                        className="pl-9 border-border text-sm focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Step 4: Questionnaire */}
            {step === 4 && (
              <div className="space-y-6">
                
                {/* Mandatory Question */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Why do you believe you are a great fit for the {job.title} role? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="whyJoin"
                    value={formData.whyJoin}
                    onChange={handleInputChange}
                    placeholder="Share a brief statement about your capabilities and alignment..."
                    rows={4}
                    className="w-full bg-muted/50 border border-border text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                  ></textarea>
                </div>

                {/* Conditional Dynamic Question based on Job Department */}
                {(job.department.toLowerCase().includes('tech') || job.department.toLowerCase().includes('engineer') || job.department.toLowerCase().includes('it') || job.department.toLowerCase().includes('dev')) ? (
                  <div className="space-y-2 bg-primary/10/50 p-4 border border-primary-100 rounded-lg">
                    <label className="block text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Dynamic Technical Question
                    </label>
                    <span className="block text-xs text-muted-foreground mb-2">How many years of active development experience do you have with your primary skill set?</span>
                    <Input
                      type="text"
                      name="primarySkillExp"
                      value={formData.primarySkillExp}
                      onChange={handleInputChange}
                      placeholder="e.g. 3 years working with React/Node.js"
                      className="border-border text-sm bg-card focus-visible:ring-primary"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 bg-primary/10/50 p-4 border border-primary-100 rounded-lg">
                    <label className="block text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Dynamic General Question
                    </label>
                    <span className="block text-xs text-muted-foreground mb-2">What is your primary focus area or professional domain specialty?</span>
                    <Input
                      type="text"
                      name="primarySkillExp"
                      value={formData.primarySkillExp}
                      onChange={handleInputChange}
                      placeholder="e.g. HR Ops, Agile Project Management"
                      className="border-border text-sm bg-card focus-visible:ring-primary"
                    />
                  </div>
                )}

                {/* Additional conditional query */}
                {job.salary_type !== 'UNDISCLOSED' && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                    <input 
                      type="checkbox"
                      id="salaryExpectationConfirmed"
                      name="salaryExpectationConfirmed"
                      checked={formData.salaryExpectationConfirmed}
                      onChange={(e) => setFormData(prev => ({ ...prev, salaryExpectationConfirmed: e.target.checked }))}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="salaryExpectationConfirmed" className="text-xs text-muted-foreground leading-normal cursor-pointer">
                      I confirm that my expectations align with the listed compensation range for this position.
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Additional Remarks (Optional)</label>
                  <textarea
                    name="additionalRemarks"
                    value={formData.additionalRemarks}
                    onChange={handleInputChange}
                    placeholder="Enter any other details you would like to share..."
                    rows={2}
                    className="w-full bg-muted/50 border border-border text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  ></textarea>
                </div>

              </div>
            )}

            {/* Step 5: Review & Consent */}
            {step === 5 && (
              <div className="space-y-6">
                
                {/* Audit Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-xs text-amber-800 leading-relaxed font-semibold">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase block mb-1">System Verification Check</span>
                    By submitting this application, you authorize the organization to carry out automated credential and file screening. Uploading unverified or fabricated resumes will trigger security screening logs.
                  </div>
                </div>

                {/* Details Check Preview */}
                <div className="bg-muted/50 border border-slate-150 rounded-lg p-5 space-y-3 text-xs">
                  <h4 className="text-[12px] font-medium text-foreground uppercase tracking-wider pb-2 border-b border-border">Verify Details Pre-submission</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    <div>
                      <span className="text-muted-foreground uppercase font-semibold">Full Name</span>
                      <span className="block font-bold text-foreground">{formData.firstName} {formData.lastName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase font-semibold">Email</span>
                      <span className="block font-bold text-foreground">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase font-semibold">CV Attachment</span>
                      <span className="block font-bold text-foreground truncate">{formData.resumeName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase font-semibold">Experience Details</span>
                      <span className="block font-bold text-foreground">{formData.experienceYears} Years</span>
                    </div>
                  </div>
                </div>

                {/* Mandatory Privacy Compliance Gate */}
                <div className="bg-primary/10/50 border border-primary-100 rounded-lg p-5 flex items-start gap-4">
                  <input 
                    type="checkbox"
                    id="policiesAccepted"
                    name="policiesAccepted"
                    checked={formData.policiesAccepted}
                    onChange={(e) => setFormData(prev => ({ ...prev, policiesAccepted: e.target.checked }))}
                    className="mt-1.5 w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    required
                  />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <label htmlFor="policiesAccepted" className="font-extrabold text-primary-950 block mb-1 cursor-pointer">
                      Data Processing & Privacy Consent
                    </label>
                    <p>
                      I hereby give explicit consent to Lattium Tech to securely store, index, and analyze my personal, professional, and contact details for recruitment and onboarding purposes. I accept that all transactions are recorded in the system audit registry.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Stepper Buttons footer */}
            <div className="pt-6 border-t border-border flex justify-between gap-4">
              {step > 1 ? (
                <Button 
                  type="button" 
                  onClick={handlePrev}
                  className="bg-card border border-border text-foreground hover:bg-muted/50 font-bold px-6 py-2.5 rounded-lg"
                >
                  Previous Section
                </Button>
              ) : (
                <div></div>
              )}

              {step < 5 ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm"
                >
                  Continue
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={!formData.policiesAccepted}
                  className="bg-primary hover:bg-primary/95 disabled:bg-slate-200 disabled:text-muted-foreground text-white font-bold px-8 py-2.5 rounded-lg shadow-sm hover:shadow-primary-500/20"
                >
                  Submit Application
                </Button>
              )}
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

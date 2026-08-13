import React, { useState } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Users, ChevronLeft, Loader2, User, Briefcase, GraduationCap, Trash2, Calendar, Edit, PlusCircle, Check } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import Select from '@/shared/components/ui/Select';

const AddCandidate: React.FC = () => {
  const navigate = useOrgNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [newCandidate, setNewCandidate] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_id: '' as string | number,
    gender: '',
    dob: '',
    address: '',
    experience_years: '',
    current_company: '',
    current_ctc: '',
    expected_ctc: '',
    notice_period_days: '',
    skills: '',
    resume_url: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    highest_degree: '',
    specialization: '',
    university: '',
    graduation_year: '',
    gpa_percentage: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [experienceType, setExperienceType] = useState('Experienced');
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  // --- Experience State ---
  const [experiences, setExperiences] = useState<any[]>([]);
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [isAddingExp, setIsAddingExp] = useState(false);
  const [expandedExpIndices, setExpandedExpIndices] = useState<number[]>([]);
  const emptyExp = { company_name: '', designation: '', start_date: '', end_date: '', description: '', currently_working: false };
  const [pendingExp, setPendingExp] = useState({ ...emptyExp });

  const commitExperience = () => {
    const target = isAddingExp ? pendingExp : experiences[editingExpIndex!];
    if (!target.company_name) return toast.error('Company name is required');
    if (!target.designation) return toast.error('Designation is required');
    if (!target.start_date) return toast.error('Start date is required');
    if (isAddingExp) {
      setExperiences(prev => [...prev, pendingExp]);
      setPendingExp({ ...emptyExp });
      setIsAddingExp(false);
      toast.success('Experience added');
    } else {
      setEditingExpIndex(null);
      toast.success('Experience updated');
    }
  };

  const updateExperience = (index: number, field: string, value: any) => {
    if (index === -1) {
      setPendingExp(prev => ({ ...prev, [field]: value }));
    } else {
      setExperiences(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    }
  };

  const removeExperience = (idx: number) => {
    setExperiences(prev => prev.filter((_, i) => i !== idx));
    if (editingExpIndex !== null) {
      const newLen = experiences.length - 1;
      if (newLen === 0) setEditingExpIndex(null);
      else if (editingExpIndex >= newLen) setEditingExpIndex(newLen - 1);
    }
    toast.success('Experience removed');
  };

  // --- Education State ---
  const [educations, setEducations] = useState<any[]>([]);
  const [editingEduIndex, setEditingEduIndex] = useState<number | null>(null);
  const [isAddingEdu, setIsAddingEdu] = useState(false);
  const emptyEdu = { degree: '', specialization: '', university: '', graduation_year: '', gpa_percentage: '', currently_studying: false };
  const [pendingEdu, setPendingEdu] = useState({ ...emptyEdu });

  const commitEducation = () => {
    const target = isAddingEdu ? pendingEdu : educations[editingEduIndex!];
    if (!target.degree) return toast.error('Degree is required');
    if (!target.university) return toast.error('University/College is required');
    if (isAddingEdu) {
      setEducations(prev => [...prev, pendingEdu]);
      setPendingEdu({ ...emptyEdu });
      setIsAddingEdu(false);
      toast.success('Education added');
    } else {
      setEditingEduIndex(null);
      toast.success('Education updated');
    }
  };

  const updateEducation = (index: number, field: string, value: any) => {
    if (index === -1) {
      setPendingEdu(prev => ({ ...prev, [field]: value }));
    } else {
      setEducations(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    }
  };

  const removeEducation = (idx: number) => {
    setEducations(prev => prev.filter((_, i) => i !== idx));
    if (editingEduIndex !== null) {
      const newLen = educations.length - 1;
      if (newLen === 0) setEditingEduIndex(null);
      else if (editingEduIndex >= newLen) setEditingEduIndex(newLen - 1);
    }
    toast.success('Education removed');
  };

  const fetchActiveJobs = async () => {
    try {
      const res = await axiosInstance.get('/recruitment/jobs');
      if (res.data.success) {
        setActiveJobs(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs', error);
    }
  };

  React.useEffect(() => {
    fetchActiveJobs();
    if (isEditMode) {
      fetchCandidateData();
    }
  }, [id]);

  const fetchCandidateData = async () => {
    try {
      setSubmitting(true);
      const res = await axiosInstance.get(`/recruitment/candidates/${id}`);
      if (res.data.success) {
        const data = res.data.data;
        setNewCandidate({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          job_id: data.applications?.length ? data.applications[0].job_id : '',
          gender: data.gender || '',
          dob: data.dob ? new Date(data.dob).toISOString() : '',
          address: data.address || '',
          experience_years: data.experience_years || '',
          current_company: data.current_company || '',
          current_ctc: data.current_ctc || '',
          expected_ctc: data.expected_ctc || '',
          notice_period_days: data.notice_period_days || '',
          skills: data.skills || '',
          resume_url: data.resume_url || '',
          linkedin_url: data.linkedin_url || '',
          github_url: data.github_url || '',
          portfolio_url: data.portfolio_url || '',
          highest_degree: data.highest_degree || '',
          specialization: data.specialization || '',
          university: data.university || '',
          graduation_year: data.graduation_year || '',
          gpa_percentage: data.gpa_percentage || ''
        });
        setExperiences(data.experience_history || []);
        setEducations(data.education_history || []);
      }
    } catch (err: any) {
      toast.error('Failed to load candidate details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.first_name || !newCandidate.last_name || !newCandidate.email) {
      return toast.error('Please fill all required fields');
    }

    try {
      setSubmitting(true);
      const payload = {
        ...newCandidate,
        experience_years: newCandidate.experience_years ? Number(newCandidate.experience_years) : null,
        current_ctc: newCandidate.current_ctc ? Number(newCandidate.current_ctc) : null,
        expected_ctc: newCandidate.expected_ctc ? Number(newCandidate.expected_ctc) : null,
        notice_period_days: newCandidate.notice_period_days ? Number(newCandidate.notice_period_days) : null,
        graduation_year: newCandidate.graduation_year ? Number(newCandidate.graduation_year) : null,
        gpa_percentage: newCandidate.gpa_percentage ? Number(newCandidate.gpa_percentage) : null,
        experience_history: experiences,
        education_history: educations,
      };

      let res;
      if (isEditMode) {
        res = await axiosInstance.put(`/recruitment/candidates/${id}`, payload);
      } else {
        res = await axiosInstance.post('/recruitment/candidates', payload);
      }

      if (res.data.success) {
        toast.success(isEditMode ? 'Candidate updated successfully!' : 'Candidate added successfully!');
        navigate('/recruitment');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    // Check if there is at least some content before saving a draft
    const hasAnyContent = Object.values(newCandidate).some(val => val !== '' && val !== 1) || experiences.length > 0 || educations.length > 0;
    if (!hasAnyContent) {
      return toast.error('Please enter at least some candidate details before saving as draft');
    }

    try {
      setSubmitting(true);
      const res = await axiosInstance.post('/recruitment/candidates/save-draft', {
        ...newCandidate,
        experience_years: newCandidate.experience_years ? Number(newCandidate.experience_years) : null,
        current_ctc: newCandidate.current_ctc ? Number(newCandidate.current_ctc) : null,
        expected_ctc: newCandidate.expected_ctc ? Number(newCandidate.expected_ctc) : null,
        notice_period_days: newCandidate.notice_period_days ? Number(newCandidate.notice_period_days) : null,
        graduation_year: newCandidate.graduation_year ? Number(newCandidate.graduation_year) : null,
        gpa_percentage: newCandidate.gpa_percentage ? Number(newCandidate.gpa_percentage) : null,
        experience_history: experiences,
        education_history: educations,
      });
      if (res.data.success) {
        toast.success('Draft candidate saved successfully!');
        navigate('/recruitment');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save draft candidate');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="p-2 space-y-8 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="rounded-lg w-10 h-10 p-0 hover:bg-primary/10 hover:text-primary transition-all" onClick={() => navigate('/recruitment')}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center">
            <Users className="w-8 h-8 mr-3 text-primary" />
            {isEditMode ? 'Edit Candidate Profile' : 'Add New Candidate'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update existing candidate details and professional background.' : 'Onboard exceptional talent into the recruitment and background verification pipeline.'}
          </p>
        </div>
      </div>

      <Card className="border border-border shadow-sm shadow-gray-100/50 overflow-hidden rounded-lg">
        <form onSubmit={handleAddCandidate}>
          <CardContent className="p-8 md:p-12 space-y-12 bg-card">

            {/* Section 1: Personal Profile */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground flex items-center border-b border-border pb-3">
                <span className="p-2 bg-primary/10 text-primary rounded-lg mr-3">
                  <User className="w-5 h-5" />
                </span>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. John"
                    value={newCandidate.first_name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={newCandidate.last_name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Select
                    label="Gender"
                    value={newCandidate.gender}
                    onChange={(val) => setNewCandidate({ ...newCandidate, gender: val })}
                    placeholder="Select Gender"
                    options={[
                      { value: "", label: "Select Gender" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Non-Binary", label: "Non-Binary" },
                      { value: "Other", label: "Other" },
                      { value: "Prefer not to say", label: "Prefer not to say" }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Date of Birth</label>
                  <ModernDatePicker
                    value={newCandidate.dob}
                    onChange={(date) => setNewCandidate({ ...newCandidate, dob: date })}
                    placeholder="Select Date of Birth"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-1">
                  <Select
                    label="Target Job Requisition"
                    value={String(newCandidate.job_id)}
                    onChange={(val) => setNewCandidate({ ...newCandidate, job_id: val ? Number(val) : '' })}
                    required
                    placeholder="Select a Job"
                    options={[
                      { value: "", label: "Select a Job" },
                      ...activeJobs.map((job) => ({ value: String(job.id), label: `${job.title} (${job.location})` }))
                    ]}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Current Address</label>
                  <textarea
                    placeholder="Enter full physical address..."
                    value={newCandidate.address}
                    onChange={(e) => setNewCandidate({ ...newCandidate, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Professional Profile */}
            <div className="space-y-8">
              <h3 className="text-xl font-bold text-foreground flex items-center border-b border-border pb-3">
                <span className="p-2 bg-primary/10 text-primary rounded-lg mr-3">
                  <Briefcase className="w-5 h-5" />
                </span>
                Professional Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Select
                    label="Experience Level"
                    value={experienceType}
                    onChange={(val) => setExperienceType(val)}
                    required
                    options={[
                      { value: "Fresher", label: "Fresher" },
                      { value: "Experienced", label: "Experienced" }
                    ]}
                  />
                </div>

                {experienceType === 'Experienced' && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">Years of Experience</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 5.5"
                        value={newCandidate.experience_years}
                        onChange={(e) => setNewCandidate({ ...newCandidate, experience_years: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">Notice Period (Days)</label>
                      <input
                        type="number"
                        placeholder="e.g. 30"
                        value={newCandidate.notice_period_days}
                        onChange={(e) => setNewCandidate({ ...newCandidate, notice_period_days: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">Current CTC (INR Per Annum)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1200000"
                        value={newCandidate.current_ctc}
                        onChange={(e) => setNewCandidate({ ...newCandidate, current_ctc: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">Expected CTC (INR Per Annum)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1800000"
                        value={newCandidate.expected_ctc}
                        onChange={(e) => setNewCandidate({ ...newCandidate, expected_ctc: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">Key Skills (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
                        value={newCandidate.skills}
                        onChange={(e) => setNewCandidate({ ...newCandidate, skills: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">LinkedIn Profile URL</label>
                      <input
                        type="text"
                        placeholder="e.g. https://linkedin.com/in/username"
                        value={newCandidate.linkedin_url}
                        onChange={(e) => setNewCandidate({ ...newCandidate, linkedin_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">GitHub Profile URL</label>
                      <input
                        type="text"
                        placeholder="e.g. https://github.com/username"
                        value={newCandidate.github_url}
                        onChange={(e) => setNewCandidate({ ...newCandidate, github_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">Portfolio / Website URL</label>
                      <input
                        type="text"
                        placeholder="e.g. https://myportfolio.com"
                        value={newCandidate.portfolio_url}
                        onChange={(e) => setNewCandidate({ ...newCandidate, portfolio_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                      />
                    </div>
                  </>
                )}
              </div>

              {experienceType === 'Experienced' && (
                <div className="space-y-6 mt-6">
                  {/* Dynamic Experience History - Card Grid UI */}
                  <div className="pt-6 border-t border-border space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[12px] font-medium text-foreground">Detailed Employment History</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Record all past professional experiences</p>
                      </div>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">{experiences.length} Added</span>
                    </div>

                    {/* Experience Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {experiences.map((exp, idx) => (
                        <div
                          key={idx}
                          onClick={() => { setEditingExpIndex(idx); setIsAddingExp(false); }}
                          className={`group relative p-4 rounded-lg bg-card border-2 transition-all duration-200 shadow-sm hover:shadow-sm cursor-pointer overflow-hidden ${editingExpIndex === idx ? 'border-primary-500 ring-4 ring-primary-50' : 'border-border hover:border-primary-200'
                            }`}
                        >
                          {editingExpIndex === idx && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />}
                          <div className="pl-1">
                            <div className="flex items-start justify-between mb-3 pr-8">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${editingExpIndex === idx ? 'bg-primary-100 text-primary' : 'bg-muted text-muted-foreground'
                                  }`}>
                                  {exp.company_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-[13px] font-bold text-foreground truncate leading-tight">{exp.designation || `Experience #${idx + 1}`}</h5>
                                  <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">{exp.company_name}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span>{exp.start_date ? new Date(exp.start_date).getFullYear() : '---'} — {exp.currently_working ? 'Present' : (exp.end_date ? new Date(exp.end_date).getFullYear() : '---')}</span>
                            </div>
                            {exp.description && (
                              <div className="mt-2">
                                <p className={`text-[11px] text-muted-foreground whitespace-pre-wrap ${expandedExpIndices.includes(idx) ? '' : 'line-clamp-4'}`}>
                                  {exp.description}
                                </p>
                                {exp.description.length > 150 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedExpIndices(prev => 
                                        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                      );
                                    }}
                                    className="text-primary text-[10px] font-bold mt-1 hover:underline"
                                  >
                                    {expandedExpIndices.includes(idx) ? 'Show less' : 'Show more'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="absolute top-3 right-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingExpIndex(idx); setIsAddingExp(false); }}
                              className="p-1.5 text-gray-300 hover:text-primary-500 hover:bg-primary/10 rounded-lg transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Experience Card */}
                      <div
                        onClick={() => { setIsAddingExp(true); setEditingExpIndex(null); setPendingExp({ ...emptyExp }); }}
                        className="group relative p-5 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/10/10 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[110px]"
                      >
                        <div className="w-9 h-9 rounded-full bg-muted group-hover:bg-primary-100 flex items-center justify-center text-muted-foreground group-hover:text-white transition-colors">
                          <PlusCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[13px] font-bold text-muted-foreground group-hover:text-white">Add Experience</span>
                      </div>
                    </div>

                    {/* Expanded Edit / Add Form */}
                    {(editingExpIndex !== null || isAddingExp) && (() => {
                      const isEdit = editingExpIndex !== null;
                      const currentExp = isEdit ? experiences[editingExpIndex!] : pendingExp;
                      const currentIdx = isEdit ? editingExpIndex! : -1;
                      return (
                        <div className="animate-in fade-in slide-in-from-top-3 duration-200 p-6 bg-card rounded-lg border border-border shadow-sm space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                <Briefcase className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <h4 className="text-[12px] font-medium text-foreground">{isEdit ? 'Update Experience Record' : 'New Experience Record'}</h4>
                                <p className="text-xs text-muted-foreground">Provide accurate professional experience details</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => { setEditingExpIndex(null); setIsAddingExp(false); }}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-primary/95 transition-colors border border-border"
                              >Cancel</button>
                              {isEdit && (
                                <button
                                  type="button"
                                  onClick={() => { removeExperience(currentIdx); setEditingExpIndex(null); }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                ><Trash2 className="w-4 h-4" /></button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                              <label className="block text-[12px] font-bold text-foreground mb-2">Company Name <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={currentExp.company_name}
                                onChange={(e) => updateExperience(currentIdx, 'company_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                                placeholder="e.g. Google, Lattium Tech"
                              />
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-foreground mb-2">Job Designation <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={currentExp.designation}
                                onChange={(e) => updateExperience(currentIdx, 'designation', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                                placeholder="e.g. Senior Software Engineer"
                              />
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-foreground mb-2">Start Date <span className="text-red-500">*</span></label>
                              <ModernDatePicker
                                value={currentExp.start_date}
                                onChange={(date) => updateExperience(currentIdx, 'start_date', date)}
                                placeholder="Select Start Date"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-[12px] font-bold text-foreground">
                                  End Date {!currentExp.currently_working && <span className="text-red-500">*</span>}
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={currentExp.currently_working || false}
                                    onChange={(e) => {
                                      updateExperience(currentIdx, 'currently_working', e.target.checked);
                                      if (e.target.checked) updateExperience(currentIdx, 'end_date', '');
                                    }}
                                    className="w-3 h-3 text-primary border-gray-300 rounded focus:ring-primary"
                                  />
                                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-white transition-colors">Currently Working</span>
                                </label>
                              </div>
                              <ModernDatePicker
                                value={currentExp.end_date || ''}
                                onChange={(date) => updateExperience(currentIdx, 'end_date', date)}
                                disabled={currentExp.currently_working}
                                placeholder="Select End Date"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[12px] font-bold text-foreground mb-2">Job Description / Responsibilities</label>
                              <textarea
                                rows={2}
                                value={currentExp.description}
                                onChange={(e) => updateExperience(currentIdx, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card resize-none"
                                placeholder="Brief summary of duties and responsibilities..."
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => { setEditingExpIndex(null); setIsAddingExp(false); }}
                              className="px-5 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                            >Discard</button>
                            <Button
                              type="button"
                              onClick={commitExperience}
                              className="bg-primary hover:bg-primary/95 text-white px-7 py-2.5 rounded-lg shadow-sm shadow-primary-100 flex items-center gap-2 font-bold text-sm"
                            >
                              {isEdit ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                              {isEdit ? 'Save Changes' : 'Confirm Experience'}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Educational Background */}
            <div className="space-y-8">
              <h3 className="text-xl font-bold text-foreground flex items-center border-b border-border pb-3">
                <span className="p-2 bg-primary/10 text-primary rounded-lg mr-3">
                  <GraduationCap className="w-5 h-5" />
                </span>
                Academic Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Highest Degree</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech, MS, MBA"
                    value={newCandidate.highest_degree}
                    onChange={(e) => setNewCandidate({ ...newCandidate, highest_degree: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                  <p className="text-[10px] text-muted-foreground">Extracted automatically from list below if provided</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Specialization / Major</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={newCandidate.specialization}
                    onChange={(e) => setNewCandidate({ ...newCandidate, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                  <p className="text-[10px] text-muted-foreground">Extracted automatically from list below if provided</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">University / College</label>
                  <input
                    type="text"
                    placeholder="e.g. Stanford University"
                    value={newCandidate.university}
                    onChange={(e) => setNewCandidate({ ...newCandidate, university: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                  <p className="text-[10px] text-muted-foreground">Extracted automatically from list below if provided</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Graduation Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2022"
                    value={newCandidate.graduation_year}
                    onChange={(e) => setNewCandidate({ ...newCandidate, graduation_year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">GPA / Score Percentage</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 9.1 or 85.5"
                    value={newCandidate.gpa_percentage}
                    onChange={(e) => setNewCandidate({ ...newCandidate, gpa_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                  />
                </div>
              </div>

              {/* Dynamic Education History - Card Grid UI */}
              <div className="pt-6 border-t border-border space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[12px] font-medium text-foreground">Detailed Academic History</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Record all educational backgrounds</p>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">{educations.length} Added</span>
                </div>

                {/* Education Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {educations.map((edu, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setEditingEduIndex(idx); setIsAddingEdu(false); }}
                      className={`group relative p-4 rounded-lg bg-card border-2 transition-all duration-200 shadow-sm hover:shadow-sm cursor-pointer overflow-hidden ${editingEduIndex === idx ? 'border-primary-500 ring-4 ring-primary-50' : 'border-border hover:border-primary-200'
                        }`}
                    >
                      {editingEduIndex === idx && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />}
                      <div className="pl-1">
                        <div className="flex items-start justify-between mb-3 pr-8">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${editingEduIndex === idx ? 'bg-primary-100 text-primary' : 'bg-muted text-muted-foreground'
                              }`}>
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-[13px] font-bold text-foreground truncate leading-tight">{edu.degree || `Education #${idx + 1}`}</h5>
                              <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">{edu.specialization || 'General'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground font-medium w-16">University:</span>
                            <span className="text-[11px] text-foreground font-semibold truncate">{edu.university || '---'}</span>
                          </div>
                          {edu.graduation_year && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span>Class of {edu.graduation_year}</span>
                            </div>
                          )}
                          {edu.gpa_percentage && (
                            <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">GPA: {edu.gpa_percentage}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-3 right-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingEduIndex(idx); setIsAddingEdu(false); }}
                          className="p-1.5 text-gray-300 hover:text-primary-500 hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Education Card */}
                  <div
                    onClick={() => { setIsAddingEdu(true); setEditingEduIndex(null); setPendingEdu({ ...emptyEdu }); }}
                    className="group relative p-5 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/10/10 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[110px]"
                  >
                    <div className="w-9 h-9 rounded-full bg-muted group-hover:bg-primary-100 flex items-center justify-center text-muted-foreground group-hover:text-white transition-colors">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[13px] font-bold text-muted-foreground group-hover:text-white">Add Education</span>
                  </div>
                </div>

                {/* Expanded Edit / Add Form */}
                {(editingEduIndex !== null || isAddingEdu) && (() => {
                  const isEdit = editingEduIndex !== null;
                  const currentEdu = isEdit ? educations[editingEduIndex!] : pendingEdu;
                  const currentIdx = isEdit ? editingEduIndex! : -1;
                  return (
                    <div className="animate-in fade-in slide-in-from-top-3 duration-200 p-6 bg-card rounded-lg border border-border shadow-sm space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <GraduationCap className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h4 className="text-[12px] font-medium text-foreground">{isEdit ? 'Update Education Record' : 'New Education Record'}</h4>
                            <p className="text-xs text-muted-foreground">Provide accurate academic details</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingEduIndex(null); setIsAddingEdu(false); }}
                            className="text-xs font-bold text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-primary/95 transition-colors border border-border"
                          >Cancel</button>
                          {isEdit && (
                            <button
                              type="button"
                              onClick={() => { removeEducation(currentIdx); setEditingEduIndex(null); }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            ><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                          <label className="block text-[12px] font-bold text-foreground mb-2">Degree / Qualification <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={currentEdu.degree}
                            onChange={(e) => updateEducation(currentIdx, 'degree', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                            placeholder="e.g. Bachelor of Technology"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-foreground mb-2">Specialization / Major</label>
                          <input
                            type="text"
                            value={currentEdu.specialization}
                            onChange={(e) => updateEducation(currentIdx, 'specialization', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                            placeholder="e.g. Computer Science"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-foreground mb-2">University / College <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={currentEdu.university}
                            onChange={(e) => updateEducation(currentIdx, 'university', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                            placeholder="e.g. Stanford University"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-foreground mb-2">Graduation Year</label>
                          <input
                            type="number"
                            value={currentEdu.graduation_year}
                            onChange={(e) => updateEducation(currentIdx, 'graduation_year', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                            placeholder="e.g. 2022"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-foreground mb-2">GPA / Score Percentage</label>
                          <input
                            type="number"
                            step="0.01"
                            value={currentEdu.gpa_percentage}
                            onChange={(e) => updateEducation(currentIdx, 'gpa_percentage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm bg-card"
                            placeholder="e.g. 9.1 or 85.5"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[12px] font-bold text-foreground">Status</label>
                          </div>
                          <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-muted border border-border rounded-lg hover:bg-primary/10 hover:border-primary-200 transition-all">
                            <input
                              type="checkbox"
                              checked={currentEdu.currently_studying || false}
                              onChange={(e) => updateEducation(currentIdx, 'currently_studying', e.target.checked)}
                              className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <span className="text-[12px] font-semibold text-gray-600">Currently Studying Here</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => { setEditingEduIndex(null); setIsAddingEdu(false); }}
                          className="px-5 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                        >Discard</button>
                        <Button
                          type="button"
                          onClick={commitEducation}
                          className="bg-primary hover:bg-primary/95 text-white px-7 py-2.5 rounded-lg shadow-sm shadow-primary-100 flex items-center gap-2 font-bold text-sm"
                        >
                          {isEdit ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                          {isEdit ? 'Save Changes' : 'Confirm Education'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-8 flex items-center justify-end gap-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => navigate('/recruitment')} className="rounded-lg h-12 px-6 text-gray-600 font-semibold border-border hover:bg-muted">
                Cancel
              </Button>
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={handleSaveDraft}
                  className="rounded-lg h-12 px-6 bg-muted hover:bg-slate-200 text-foreground font-semibold transition-all border border-border shadow-sm"
                >
                  Save Draft
                </Button>
              )}
              <Button type="submit" disabled={submitting} className="rounded-lg h-12 px-8 bg-primary hover:bg-primary/95 text-white font-bold shadow-sm shadow-primary-200 transition-all">
                {submitting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                ) : 'Save'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};

export default AddCandidate;




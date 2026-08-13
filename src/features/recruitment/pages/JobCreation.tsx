import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams, useBlocker } from 'react-router-dom';
import { 
  Briefcase, Save, UploadCloud, ArrowLeft, Plus, X, User, 
  DollarSign, FileText, CheckSquare, Target, Settings, Calendar,
  CheckCircle2, MapPin, Building2, Tag, Gift
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import Select from '@/shared/components/ui/Select';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';
import { useCurrency } from '@/shared/hooks/useCurrency';

export const JobCreation: React.FC = () => {
  const navigate = useOrgNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { currencyCode, currencySymbol } = useCurrency();

  const currencyOptions = React.useMemo(() => {
    const defaults = [
      { value: "INR", label: "INR (₹)" },
      { value: "USD", label: "USD ($)" },
      { value: "EUR", label: "EUR (€)" },
      { value: "GBP", label: "GBP (£)" }
    ];
    if (currencyCode && !defaults.some(d => d.value === currencyCode)) {
      defaults.unshift({ value: currencyCode, label: `${currencyCode} (${currencySymbol})` });
    }
    return defaults;
  }, [currencyCode, currencySymbol]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirtyState] = useState(false);
  const isDirtyRef = React.useRef(false);

  const setIsDirty = (value: boolean) => {
    isDirtyRef.current = value;
    setIsDirtyState(value);
  };

  // Intercept React Router navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  // Intercept browser tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Required for legacy browsers
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const [formData, setFormData] = useState<any>({
    title: '', department: '', location: '', employment_type: 'Full-time',
    experience_level: 'Mid Level (2-5 years)', openings_count: 1, remote_option: 'Hybrid',
    salary_type: 'RANGE', currency: 'INR', min_salary: '', max_salary: '',
    fixed_salary: '', salary_period: 'Annual', job_summary: '', description: '',
    responsibilities: ['e.g., Design and develop scalable backend systems'], 
    requirements: ['e.g., Bachelor\'s degree in Computer Science or related field'], 
    required_skills: [], preferred_skills: [],
    benefits: ['e.g., Health insurance, Flexible working hours, Professional development budget'], 
    hiring_manager_id: '', assigned_recruiter_id: '', application_deadline: '', target_start_date: '',
    interview_rounds: '3 Rounds', travel_required: 'None', status: 'DRAFT'
  });

  useEffect(() => {
    if (!isEdit && currencyCode) {
      setFormData((prev: any) => ({ ...prev, currency: currencyCode }));
    }
  }, [isEdit, currencyCode]);

  const [reqSkillInput, setReqSkillInput] = useState('');
  const [prefSkillInput, setPrefSkillInput] = useState('');
  const [managers, setManagers] = useState<{ id: number; name: string; designation: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  // Ref so async functions always read fresh departments list (avoids stale closure)
  const departmentsRef = React.useRef<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetchManagers();
    fetchDepartments();
    fetchLocations();
  }, []);

  const fetchManagers = async () => {
    try {
      const res = await axiosInstance.get('/employees?limit=1000');
      const employees = res.data.data?.data ?? res.data.data ?? [];
      const list = employees.map((emp: any) => ({
        id: emp.id,
        name: `${emp.details?.first_name ?? ''} ${emp.details?.last_name ?? ''}`.trim() || emp.email,
        designation: emp.details?.role?.role_name ?? emp.roles?.[0]?.role?.role_name ?? ''
      }));
      setManagers(list);
    } catch {
      // Non-critical – silently fail
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axiosInstance.get('/departments');
      const depts = res.data.data ?? [];
      const mapped = depts.map((d: any) => ({ id: d.id, name: d.department_name ?? d.name }));
      departmentsRef.current = mapped; // keep ref in sync
      setDepartments(mapped);
    } catch {
      // Non-critical – silently fail
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await axiosInstance.get('/branches');
      const branches = res.data.data ?? [];
      const mapped = branches.map((b: any) => ({
        id: b.id,
        name: `${b.location_name ?? b.branch_name ?? ''} ${b.city ? `- ${b.city}` : ''}`.trim() || 'Unknown Location'
      }));
      setLocations(mapped);
    } catch {
      // Non-critical
    }
  };

  const fetchManagerByDept = async (departmentName: string) => {
    // Use ref so we always get the latest departments list (avoids stale closure)
    const dept = departmentsRef.current.find(d => d.name === departmentName);
    if (!dept) {
      // Dept not found in ref – fall back to all employees
      fetchManagers();
      return;
    }
    try {
      setLoadingManagers(true);
      setManagers([]); // Clear previous selection
      const res = await axiosInstance.get(`/departments/manager?departmentId=${dept.id}`);
      const mgr = res.data.data;
      if (mgr && (mgr.id || mgr.employee_id)) {
        setManagers([{
          id: mgr.id ?? mgr.employee_id,
          name: `${mgr.details?.first_name ?? mgr.first_name ?? ''} ${mgr.details?.last_name ?? mgr.last_name ?? ''}`.trim() || mgr.email || mgr.username,
          designation: mgr.details?.role?.role_name ?? mgr.role?.role_name ?? ''
        }]);
      } else {
        // No dedicated manager — show all employees as fallback
        fetchManagers();
      }
    } catch {
      fetchManagers();
    } finally {
      setLoadingManagers(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      fetchJobDetails();
    }
  }, [id]);

  const normalizeCurrencyCode = (curr: string) => {
    if (!curr) return 'USD';
    const match = curr.match(/^[A-Z]{3}/i);
    return match ? match[0].toUpperCase() : 'USD';
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/recruitment/jobs/${id}`);
      if (res.data.success) {
        const jobData = res.data.data;
        const normalizedCurrency = normalizeCurrencyCode(jobData.currency);
        setFormData({
          ...jobData,
          currency: normalizedCurrency,
          application_deadline: jobData.application_deadline 
            ? new Date(jobData.application_deadline).toISOString().split('T')[0] 
            : '',
          target_start_date: jobData.target_start_date 
            ? new Date(jobData.target_start_date).toISOString().split('T')[0] 
            : ''
        });
      }
    } catch (err) {
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setIsDirty(true);
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    // When department changes, auto-load the dept manager
    if (name === 'department') {
      setFormData((prev: any) => ({ ...prev, department: value, hiring_manager_id: '' }));
      if (value) fetchManagerByDept(value);
      else fetchManagers();
    }
  };

  const handleArrayChange = (index: number, field: string, value: string) => {
    setIsDirty(true);
    const newArr = [...formData[field]];
    newArr[index] = value;
    setFormData({ ...formData, [field]: newArr });
  };

  const addArrayItem = (field: string) => {
    setIsDirty(true);
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (index: number, field: string) => {
    setIsDirty(true);
    const newArr = formData[field].filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, [field]: newArr });
  };

  const addSkill = (type: 'required' | 'preferred') => {
    const field = type === 'required' ? 'required_skills' : 'preferred_skills';
    const input = type === 'required' ? reqSkillInput : prefSkillInput;
    const setInput = type === 'required' ? setReqSkillInput : setPrefSkillInput;

    if (input.trim() && !formData[field].includes(input.trim())) {
      setIsDirty(true);
      setFormData({ ...formData, [field]: [...formData[field], input.trim()] });
      setInput('');
    }
  };

  const removeSkill = (skill: string, type: 'required' | 'preferred') => {
    const field = type === 'required' ? 'required_skills' : 'preferred_skills';
    setIsDirty(true);
    setFormData({
      ...formData,
      [field]: formData[field].filter((s: string) => s !== skill)
    });
  };

  const saveJob = async (action: 'DRAFT' | 'PUBLISH', redirectPath?: string) => {
    if (!formData.title || !formData.department || !formData.location) {
      return toast.error('Please fill in all required fields marked with *');
    }
    
    try {
      setSaving(true);
      let endpoint = '';
      let method = 'post';

      if (action === 'DRAFT') {
        endpoint = isEdit ? `/recruitment/jobs/${id}/save-draft` : '/recruitment/jobs/save-draft';
        method = 'post';
      } else {
        endpoint = isEdit ? `/recruitment/jobs/${id}` : '/recruitment/jobs';
        method = isEdit ? 'put' : 'post';
      }

      const payload = { ...formData, status: action === 'PUBLISH' ? 'OPEN' : 'DRAFT' };
      const res = await axiosInstance[method as 'post'|'put'](endpoint, payload);
      
      if (res.data.success) {
        toast.success(action === 'PUBLISH' ? 'Job Published Successfully!' : 'Draft Saved!');
        setIsDirty(false); // Reset dirty state since we saved
        if (redirectPath) {
          navigate(redirectPath);
        } else {
          navigate('/recruitment/jobs');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stepperItems = ['Basic Information', 'Job Details', 'Requirements', 'Review & Publish'];

  return (
    <div className="min-h-screen bg-muted/50 p-2 md:p-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate('/recruitment/jobs')}
          className="p-2 hover:bg-primary/95 rounded-sm transition-colors flex-shrink-0 group"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-white" />
        </button>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">
            {isEdit ? "Edit Job Posting" : "Create New Job Posting"}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm font-medium">
            Fill in the details below to post a new job opening
          </p>
        </div>
      </div>

      <div className="w-full space-y-4">
        {/* Basic Information */}
        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <Briefcase className="w-5 h-5 text-primary flex-shrink-0" />
            <h2 className="text-base font-semibold text-foreground">Basic Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Job Title <span className="text-red-500">*</span></label>
                <Input 
                  name="title" value={formData.title} onChange={handleChange} 
                  placeholder="e.g. Senior Software Engineer" 
                  className="w-full h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Select
                  label="Department"
                  value={formData.department}
                  onChange={(val) => handleChange({ target: { name: 'department', value: val } } as any)}
                  required
                  placeholder="Select Department"
                  options={departments.length > 0
                    ? departments.map(d => ({ value: d.name, label: d.name }))
                    : [
                        { value: "Engineering", label: "Engineering" },
                        { value: "Product", label: "Product" },
                        { value: "Design", label: "Design" },
                        { value: "Marketing", label: "Marketing" },
                        { value: "Sales", label: "Sales" },
                        { value: "HR", label: "HR" }
                      ]
                  }
                />
              </div>
              <div className="space-y-2">
                <Select
                  label="Location"
                  value={formData.location}
                  onChange={(val) => handleChange({ target: { name: 'location', value: val } } as any)}
                  required
                  placeholder="Select Location"
                  options={locations.length > 0
                    ? locations.map(loc => ({ value: loc.name, label: loc.name }))
                    : [
                        { value: "Bangalore, India", label: "Bangalore, India" },
                        { value: "Mumbai, India", label: "Mumbai, India" },
                        { value: "New York, USA", label: "New York, USA" },
                        { value: "Remote", label: "Remote" }
                      ]
                  }
                />
              </div>
              <div className="space-y-2">
                <Select
                  label="Employment Type"
                  value={formData.employment_type}
                  onChange={(val) => handleChange({ target: { name: 'employment_type', value: val } } as any)}
                  required
                  options={[
                    { value: "Full-time", label: "Full-time" },
                    { value: "Part-time", label: "Part-time" },
                    { value: "Contract", label: "Contract" },
                    { value: "Internship", label: "Internship" }
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Select
                  label="Experience Level"
                  value={formData.experience_level}
                  onChange={(val) => handleChange({ target: { name: 'experience_level', value: val } } as any)}
                  required
                  options={[
                    { value: "Entry Level (0-2 years)", label: "Entry Level (0-2 years)" },
                    { value: "Mid Level (2-5 years)", label: "Mid Level (2-5 years)" },
                    { value: "Senior (5-8 years)", label: "Senior (5-8 years)" },
                    { value: "Lead (8+ years)", label: "Lead (8+ years)" }
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Number of Positions <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number" min="1" name="openings_count" value={formData.openings_count} onChange={handleChange} 
                    className="pl-10 h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Select
                  label="Remote Work Option"
                  value={formData.remote_option}
                  onChange={(val) => handleChange({ target: { name: 'remote_option', value: val } } as any)}
                  options={[
                    { value: "Hybrid", label: "Hybrid" },
                    { value: "On-site", label: "On-site" },
                    { value: "Remote", label: "Remote" }
                  ]}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Salary & Compensation */}
        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
            <h2 className="text-base font-semibold text-foreground">Salary & Compensation</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input 
                  type="radio" name="salary_type" value="RANGE" 
                  checked={formData.salary_type === 'RANGE'} onChange={handleChange}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                Salary Range
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input 
                  type="radio" name="salary_type" value="FIXED" 
                  checked={formData.salary_type === 'FIXED'} onChange={handleChange}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                Fixed Salary
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input 
                  type="radio" name="salary_type" value="UNDISCLOSED" 
                  checked={formData.salary_type === 'UNDISCLOSED'} onChange={handleChange}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                Undisclosed
              </label>
            </div>

            {formData.salary_type !== 'UNDISCLOSED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Select
                    label="Currency"
                    value={formData.currency}
                    onChange={(val) => handleChange({ target: { name: 'currency', value: val } } as any)}
                    options={currencyOptions}
                  />
                </div>
                {formData.salary_type === 'RANGE' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Minimum</label>
                      <Input 
                        type="number" name="min_salary" value={formData.min_salary} onChange={handleChange} 
                        placeholder="e.g. 800000" className="h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Maximum</label>
                      <Input 
                        type="number" name="max_salary" value={formData.max_salary} onChange={handleChange} 
                        placeholder="e.g. 1200000" className="h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Fixed Salary</label>
                    <Input 
                      type="number" name="fixed_salary" value={formData.fixed_salary} onChange={handleChange} 
                      placeholder="e.g. 1000000" className="h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Select
                    label="Period"
                    value={formData.salary_period}
                    onChange={(val) => handleChange({ target: { name: 'salary_period', value: val } } as any)}
                    options={[
                      { value: "Annual", label: "Annual" },
                      { value: "Monthly", label: "Monthly" },
                      { value: "Hourly", label: "Hourly" }
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Job Description */}
        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h2 className="text-base font-semibold text-foreground">Job Description</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Job Summary <span className="text-red-500">*</span></label>
              <textarea 
                name="job_summary" value={formData.job_summary} onChange={handleChange} 
                rows={3}
                placeholder="Brief overview of the role (2-3 sentences)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary text-sm focus:outline-none resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{formData.job_summary.length} characters</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Detailed Description <span className="text-red-500">*</span></label>
              <textarea 
                name="description" value={formData.description} onChange={handleChange} 
                rows={6}
                placeholder="Provide a comprehensive description of the role, team, and work environment..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary text-sm focus:outline-none resize-y"
              />
              <p className="text-xs text-muted-foreground text-right">{formData.description.length} characters</p>
            </div>
          </div>
        </Card>

        {/* Two Column Grid for Responsibilities and Requirements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Key Responsibilities */}
          <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Key Responsibilities</h2>
              <Button 
                onClick={() => addArrayItem('responsibilities')} 
                className="bg-primary hover:bg-primary/95 text-white rounded-lg h-9 px-4 text-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Responsibility
              </Button>
            </div>
            <div className="space-y-3">
              {formData.responsibilities.map((resp: string, idx: number) => (
                <div key={idx} className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <Input 
                    value={resp} onChange={(e) => handleArrayChange(idx, 'responsibilities', e.target.value)} 
                    placeholder="e.g., Design and develop scalable backend systems" 
                    className="flex-1 h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                  />
                  <button onClick={() => removeArrayItem(idx, 'responsibilities')} className="text-red-400 hover:text-red-600 p-2 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Requirements & Qualifications */}
        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Requirements & Qualifications</h2>
              <Button 
                onClick={() => addArrayItem('requirements')} 
                className="bg-primary hover:bg-primary/95 text-white rounded-lg h-9 px-4 text-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Requirement
              </Button>
            </div>
            <div className="space-y-3">
              {formData.requirements.map((req: string, idx: number) => (
                <div key={idx} className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <Input 
                    value={req} onChange={(e) => handleArrayChange(idx, 'requirements', e.target.value)} 
                    placeholder="e.g., Bachelor's degree in Computer Science or related field" 
                    className="flex-1 h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                  />
                  <button onClick={() => removeArrayItem(idx, 'requirements')} className="text-red-400 hover:text-red-600 p-2 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
        </div>

        {/* Required Skills & Competencies */}
        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Skills & Competencies</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Required Skills <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <Input 
                  value={reqSkillInput} onChange={(e) => setReqSkillInput(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill('required'); } }}
                  placeholder="Type a skill and press Enter" 
                  className="flex-1 h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                />
                <Button onClick={() => addSkill('required')} className="bg-primary hover:bg-primary/95 text-white rounded-lg h-11 px-6">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
              {formData.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.required_skills.map((skill: string) => (
                    <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground border border-border rounded-full text-sm font-medium">
                      {skill}
                      <button onClick={() => removeSkill(skill, 'required')} className="text-muted-foreground hover:text-gray-600 focus:outline-none">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preferred Skills (Nice to Have)</label>
              <div className="flex gap-2">
                <Input 
                  value={prefSkillInput} onChange={(e) => setPrefSkillInput(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill('preferred'); } }}
                  placeholder="Type a skill and press Enter" 
                  className="flex-1 h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                />
                <Button onClick={() => addSkill('preferred')} className="bg-primary hover:bg-primary/95 text-white rounded-lg h-11 px-6">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
              {formData.preferred_skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.preferred_skills.map((skill: string) => (
                    <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground border border-border rounded-full text-sm font-medium">
                      {skill}
                      <button onClick={() => removeSkill(skill, 'preferred')} className="text-muted-foreground hover:text-gray-600 focus:outline-none">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </Card>

        {/* Benefits & Perks */}
        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Benefits & Perks</h2>
              <Button 
                onClick={() => addArrayItem('benefits')} 
                className="bg-primary hover:bg-primary/95 text-white rounded-lg h-9 px-4 text-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Benefit
              </Button>
            </div>
            <div className="space-y-3">
              {formData.benefits.map((benefit: string, idx: number) => (
                <div key={idx} className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <Input 
                    value={benefit} onChange={(e) => handleArrayChange(idx, 'benefits', e.target.value)} 
                    placeholder="e.g., Health insurance, Flexible working hours" 
                    className="flex-1 h-11 border-gray-300 focus:border-primary focus:ring-primary rounded-lg"
                  />
                  <button onClick={() => removeArrayItem(idx, 'benefits')} className="text-red-400 hover:text-red-600 p-2 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Additional Details */}
        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Additional Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Select
                label="Hiring Manager"
                value={String(formData.hiring_manager_id)}
                onChange={(val) => handleChange({ target: { name: 'hiring_manager_id', value: val } } as any)}
                required
                disabled={loadingManagers}
                placeholder={loadingManagers ? 'Loading managers...' : 'Select Hiring Manager'}
                options={[
                  { value: "", label: loadingManagers ? 'Loading managers...' : 'Select Hiring Manager' },
                  ...managers.map(m => ({ value: String(m.id), label: `${m.name}${m.designation ? ` (${m.designation})` : ''}` }))
                ]}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Application Deadline</label>
              <div className="relative">
                <StandardDatePicker 
                  value={formData.application_deadline} 
                  onChange={(date) => handleChange({ target: { name: 'application_deadline', value: date } } as any)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Target Start Date</label>
              <div className="relative">
                <StandardDatePicker 
                  value={formData.target_start_date} 
                  onChange={(date) => handleChange({ target: { name: 'target_start_date', value: date } } as any)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Select
                label="Number of Interview Rounds"
                value={formData.interview_rounds}
                onChange={(val) => handleChange({ target: { name: 'interview_rounds', value: val } } as any)}
                options={[
                  { value: "1 Round", label: "1 Round" },
                  { value: "2 Rounds", label: "2 Rounds" },
                  { value: "3 Rounds", label: "3 Rounds" },
                  { value: "4+ Rounds", label: "4+ Rounds" }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Select
                label="Travel Required"
                value={formData.travel_required}
                onChange={(val) => handleChange({ target: { name: 'travel_required', value: val } } as any)}
                options={[
                  { value: "None", label: "None" },
                  { value: "Occasional (less than 25%)", label: "Occasional (less than 25%)" },
                  { value: "Frequent (up to 50%)", label: "Frequent (up to 50%)" },
                  { value: "Extensive (more than 50%)", label: "Extensive (more than 50%)" }
                ]}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-end gap-3 sm:gap-4 pt-6 pb-12">
        <Button variant="outline" onClick={() => navigate('/recruitment/jobs')} className="w-full sm:w-auto px-6 h-11 font-medium">
          Cancel
        </Button>
        <Button 
          variant="outline" onClick={() => saveJob('DRAFT')} disabled={saving}
          className="w-full sm:w-auto px-6 h-11 rounded-lg border-gray-300 text-foreground hover:bg-muted font-medium"
        >
          <Save className="w-4 h-4 mr-2 text-muted-foreground" />
          Save as Draft
        </Button>
        <Button 
          onClick={() => saveJob('PUBLISH')} disabled={saving}
          className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-8 h-11 rounded-lg font-medium shadow-sm shadow-primary-200"
        >
          <UploadCloud className="w-4 h-4 mr-2" />
          {isEdit ? 'Update Job Posting' : 'Publish Job Posting'}
        </Button>
      </div>

      {/* Unsaved Changes Modal (React Router Blocker) */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-lg shadow-sm w-full max-w-md p-6 space-y-6 relative">
            <button 
              onClick={() => blocker.reset()} 
              className="absolute top-4 right-4 text-muted-foreground hover:text-gray-600 hover:bg-muted p-1.5 rounded-full transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-2 pr-8">
              <h3 className="text-xl font-bold text-foreground">Unsaved Changes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to leave? Any unsaved details will be lost.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => blocker.reset()} className="w-full sm:w-auto px-5 h-10 font-medium">
                Cancel
              </Button>
              <Button 
                variant="outline"
                disabled={saving}
                onClick={() => {
                  if (blocker.location) {
                    saveJob('DRAFT', blocker.location.pathname);
                  }
                }} 
                className="w-full sm:w-auto px-5 h-10 font-medium border-primary-200 text-primary hover:bg-primary/10 transition-colors"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button 
                onClick={() => blocker.proceed()} 
                className="w-full sm:w-auto px-5 h-10 bg-red-600 hover:bg-red-700 text-white font-medium border-transparent shadow-sm transition-colors"
              >
                Leave Page
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCreation;



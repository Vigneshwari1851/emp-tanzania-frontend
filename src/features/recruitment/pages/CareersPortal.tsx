import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { 
  Search, MapPin, Briefcase, Clock, Sparkles, Filter, 
  ArrowRight, Landmark, BadgeAlert, Layers, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import Select from '@/shared/components/ui/Select';

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

export const CareersPortal: React.FC = () => {
  const navigate = useOrgNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [remoteOption, setRemoteOption] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  // Available options for filters
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    fetchJobs();
  }, [search, department, location, employmentType, experienceLevel, remoteOption, page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 6,
      };
      if (search) params.search = search;
      if (department) params.department = department;
      if (location) params.location = location;
      if (employmentType) params.employment_type = employmentType;
      if (experienceLevel) params.experience_level = experienceLevel;
      if (remoteOption) params.remote_option = remoteOption;

      // Call public careers endpoint
      const res = await axiosInstance.get('/recruitment/careers/jobs', { params });
      if (res.data.success) {
        setJobs(res.data.data);
        setTotalJobs(res.data.pagination.total);
        setTotalPages(res.data.pagination.pages);

        // Dynamically build filter list from all jobs once if not already done
        if (departments.length === 0 || locations.length === 0) {
          const allRes = await axiosInstance.get('/recruitment/careers/jobs', { params: { limit: 100 } });
          if (allRes.data.success) {
            const depts: string[] = Array.from(new Set(allRes.data.data.map((j: any) => j.department)));
            const locs: string[] = Array.from(new Set(allRes.data.data.map((j: any) => j.location)));
            setDepartments(depts.filter(Boolean));
            setLocations(locs.filter(Boolean));
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Unable to retrieve active job openings.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setLocation('');
    setEmploymentType('');
    setExperienceLevel('');
    setRemoteOption('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-muted/50 text-foreground font-sans">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-tr from-slate-900 via-primary-950 to-slate-900 text-white py-20 px-6 sm:px-12 lg:px-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]"></div>
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2"></div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 text-primary-300 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Empowering Careers
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-primary-200 bg-clip-text text-transparent mb-6">
            Build the Future of Enterprise Solutions
          </h1>
          
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join a high-performance culture where innovation thrives. Explore our open roles and find your next breakthrough opportunity.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-12 mt-4 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-400" />
              <span>{totalJobs} Open Positions</span>
            </div>
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary-400" />
              <span>Premium Workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span>Dynamic Growth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Browse Section */}
      <div className="w-full sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sticky Filter Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-lg border border-border/80 p-6 shadow-sm sticky top-6">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <span className="font-bold text-foreground flex items-center gap-2 text-base">
                  <Filter className="w-4 h-4 text-primary" />
                  Filter Roles
                </span>
                {(search || department || location || employmentType || experienceLevel || remoteOption) && (
                  <button 
                    onClick={clearFilters}
                    className="text-xs font-semibold text-primary hover:text-primary-800 transition flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset All
                  </button>
                )}
              </div>

              {/* Filters Form */}
              <div className="space-y-5">
                {/* Search */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Keyword Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="text"
                      placeholder="e.g. React, Manager..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="pl-9 bg-muted/50 border-border text-sm focus-visible:ring-primary rounded-lg"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <Select
                    label="Department"
                    value={department}
                    onChange={(val) => { setDepartment(val); setPage(1); }}
                    placeholder="All Departments"
                    options={[
                      { value: "", label: "All Departments" },
                      ...departments.map((dept) => ({ value: dept, label: dept }))
                    ]}
                  />
                </div>

                {/* Location */}
                <div>
                  <Select
                    label="Location"
                    value={location}
                    onChange={(val) => { setLocation(val); setPage(1); }}
                    placeholder="All Locations"
                    options={[
                      { value: "", label: "All Locations" },
                      ...locations.map((loc) => ({ value: loc, label: loc }))
                    ]}
                  />
                </div>

                {/* Remote Option */}
                <div>
                  <Select
                    label="Work Setup"
                    value={remoteOption}
                    onChange={(val) => { setRemoteOption(val); setPage(1); }}
                    placeholder="All Setups"
                    options={[
                      { value: "", label: "All Setups" },
                      { value: "Remote", label: "Remote" },
                      { value: "Hybrid", label: "Hybrid" },
                      { value: "On-site", label: "On-site" }
                    ]}
                  />
                </div>

                {/* Employment Type */}
                <div>
                  <Select
                    label="Employment Type"
                    value={employmentType}
                    onChange={(val) => { setEmploymentType(val); setPage(1); }}
                    placeholder="All Types"
                    options={[
                      { value: "", label: "All Types" },
                      { value: "Full-time", label: "Full-time" },
                      { value: "Part-time", label: "Part-time" },
                      { value: "Contract", label: "Contract" },
                      { value: "Internship", label: "Internship" }
                    ]}
                  />
                </div>

                {/* Experience Level */}
                <div>
                  <Select
                    label="Experience Level"
                    value={experienceLevel}
                    onChange={(val) => { setExperienceLevel(val); setPage(1); }}
                    placeholder="All Levels"
                    options={[
                      { value: "", label: "All Levels" },
                      { value: "Entry Level", label: "Entry Level" },
                      { value: "Mid Level", label: "Mid Level" },
                      { value: "Senior Level", label: "Senior Level" },
                      { value: "Lead / Manager", label: "Lead / Manager" }
                    ]}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Right Open Jobs Grid */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Top Bar Summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 border border-border/80 rounded-lg shadow-sm">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{jobs.length}</span> of <span className="font-semibold text-foreground">{totalJobs}</span> matching job listings
              </div>
              <div className="flex gap-2 text-xs">
                {remoteOption && <span className="bg-primary/10 border border-primary-100 text-primary px-2.5 py-1 rounded-full font-medium">{remoteOption}</span>}
                {department && <span className="bg-primary/10 border border-primary-100 text-primary px-2.5 py-1 rounded-full font-medium">{department}</span>}
                {location && <span className="bg-primary/10 border border-primary-100 text-primary px-2.5 py-1 rounded-full font-medium">{location}</span>}
              </div>
            </div>

            {/* Jobs List */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card border border-border p-6 rounded-lg space-y-4 animate-pulse">
                    <div className="h-6 w-2/3 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded-lg"></div>
                    <div className="flex gap-2">
                      <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
                      <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-between items-center">
                      <div className="h-5 w-24 bg-slate-200 rounded-lg"></div>
                      <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-card border border-border/80 rounded-lg p-12 text-center shadow-sm max-w-xl mx-auto my-12">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-6 text-primary border border-primary-100">
                  <BadgeAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No Matching Roles Found</h3>
                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                  We couldn't find any open positions matching your search filters. Try widening your criteria or check back later!
                </p>
                <Button 
                  onClick={clearFilters}
                  className="bg-primary hover:bg-primary/95 text-white font-semibold shadow-sm px-6"
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.map((job) => (
                  <div 
                    key={job.job_id}
                    className="group bg-card border border-border/85 hover:border-primary hover:shadow-sm transition-all duration-300 rounded-lg p-6 flex flex-col justify-between cursor-pointer"
                    onClick={() => navigate(`/careers/jobs/${job.uuid}`)}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <span className="bg-primary/10 border border-primary-100 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                          {job.department}
                        </span>
                        <div className="flex items-center text-xs text-muted-foreground gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-foreground group-hover:text-white transition-colors mb-2 line-clamp-1">
                        {job.title}
                      </h3>

                      <p className="text-muted-foreground text-sm mb-5 line-clamp-2 leading-relaxed">
                        {job.job_summary}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="inline-flex items-center gap-1 text-xs bg-muted text-slate-600 px-2.5 py-1 rounded-lg">
                          <MapPin className="w-3 h-3 text-primary-500" />
                          {job.location}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-muted text-slate-600 px-2.5 py-1 rounded-lg">
                          <Briefcase className="w-3 h-3 text-primary-500" />
                          {job.employment_type}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary-100/50 px-2.5 py-1 rounded-lg font-medium">
                          {job.remote_option}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <div className="text-xs font-semibold text-foreground">
                        {job.salary_type === 'RANGE' && job.min_salary && job.max_salary ? (
                          <span>
                            {formatJobSalary(job.min_salary, job.currency)} - {formatJobSalary(job.max_salary, job.currency)}
                          </span>
                        ) : job.salary_type === 'FIXED' && job.fixed_salary ? (
                          <span>{formatJobSalary(job.fixed_salary, job.currency)}</span>
                        ) : (
                          <span className="text-muted-foreground font-medium">Undisclosed CTC</span>
                        )}
                      </div>
                      
                      <button className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-800 transition">
                        View Details
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="bg-card border border-border text-slate-600 hover:bg-muted/50 hover:text-foreground text-xs px-4 py-2"
                >
                  Previous
                </Button>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  Page <span className="text-foreground font-bold">{page}</span> of {totalPages}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="bg-card border border-border text-slate-600 hover:bg-muted/50 hover:text-foreground text-xs px-4 py-2"
                >
                  Next
                </Button>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};


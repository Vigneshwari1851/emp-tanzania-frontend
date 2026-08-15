import React, { useState } from 'react';
import { 
  PlayCircle, Clock, Award, TrendingUp, Loader2, BookOpen, 
  Users, Building2, UserCheck, ShieldCheck, ArrowUpRight, 
  Download, Filter, MoreHorizontal, Calendar, LayoutDashboard,
  Target, Zap, AlertCircle, Layers, Search, Activity, Globe, CreditCard,
  Server, Shield, Trash2, Edit3, UserPlus, FileSpreadsheet, Info, Bell, GraduationCap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { useLearnerDashboard, useCourses, useAdminStats, useManagerStats } from '../api/lmsApi';
import { CourseCard } from '../components/CourseCard';
import { useAuth } from '@/shared/context/AuthContext';
import { useLocation } from 'react-router-dom';
import { UserRole } from '@/shared/types/rbac';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { AssignmentHub } from './AssignmentHub';
import { LearningPathList } from './LearningPathList';
import { AdminCourseList } from './AdminCourseList';
import { LmsNotifications } from './LmsNotifications';

// --- Learner Dashboard Component ---
const LearnerDashboard: React.FC<{ 
  assignments: any[], 
  availableCourses: any[], 
  isLoading: boolean, 
  assignedCourseIds: Set<number> 
}> = ({ assignments, availableCourses, isLoading, assignedCourseIds }) => {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const { user } = useAuth();

  const filteredAssignments = assignments?.filter((a: any) => {
    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesSearch = !searchQuery || a.course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredCatalog = availableCourses?.filter((c: any) => {
    const matchesLevel = !levelFilter || c.level === levelFilter;
    const matchesSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const totalProgress = assignments?.reduce((acc: number, curr: any) => acc + (curr.progress?.percentage || 0), 0) || 0;
  const avgProgress = assignments?.length > 0 ? Math.round(totalProgress / assignments.length) : 0;

  const stats = [
    { label: 'In Progress', value: assignments?.filter((a: any) => a.status === 'IN_PROGRESS').length || 0, icon: Clock },
    { label: 'Completed', value: assignments?.filter((a: any) => a.status === 'COMPLETED').length || 0, icon: Award },
    { label: 'Assigned', value: assignments?.length || 0, icon: BookOpen },
    { label: 'Overall Progress', value: `${avgProgress}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium tracking-wide">{stat.label}</p>
            <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Personalization & Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Recommended for your Career Path</h3>
                <Button variant="ghost" className="text-xs font-bold text-primary">Explore Catalog</Button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'Executive Leadership 2.0', duration: '4h 30m', level: 'Advanced', students: '1.2k' },
                  { title: 'Cloud Infrastructure Design', duration: '6h 15m', level: 'Intermediate', students: '850' },
                ].map((rec, i) => (
                  <div key={i} className="group p-4 rounded-lg bg-muted/40 border border-border dark:border-border/60 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                     <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                           <Target size={20} />
                        </div>
                        <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-sm">{rec.level}</span>
                     </div>
                     <h4 className="text-[12px] font-medium text-foreground mb-1 group-hover:text-primary transition-colors">{rec.title}</h4>
                     <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Clock size={10} /> {rec.duration}</span>
                        <span className="flex items-center gap-1"><Users size={10} /> {rec.students} peers</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {filterStatus === 'DISCOVERY' ? 'Professional Catalog' : 'Your Learning Tracks'}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">
                  {filterStatus === 'DISCOVERY' ? 'Strategic discovery of new competencies' : 'Continue where you left off'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                 <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search courses..." 
                      className="pl-9 pr-4 py-1.5 bg-muted border border-border rounded-lg text-xs font-bold focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none w-full md:w-48"
                    />
                 </div>
                 
                 <div className="flex gap-0 border-b border-border">
                     <button onClick={() => setFilterStatus(null)} className={`px-4 py-2 text-xs font-bold transition-all relative whitespace-nowrap ${!filterStatus ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px'}`}>All</button>
                     <button onClick={() => setFilterStatus('IN_PROGRESS')} className={`px-4 py-2 text-xs font-bold transition-all relative whitespace-nowrap ${filterStatus === 'IN_PROGRESS' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px'}`}>Active</button>
                     <button onClick={() => setFilterStatus('COMPLETED')} className={`px-4 py-2 text-xs font-bold transition-all relative whitespace-nowrap ${filterStatus === 'COMPLETED' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px'}`}>Completed</button>
                     <button onClick={() => setFilterStatus('DISCOVERY')} className={`px-4 py-2 text-xs font-bold transition-all relative whitespace-nowrap ${filterStatus === 'DISCOVERY' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px'}`}>Discover</button>
                 </div>
              </div>
            </div>

            {filterStatus === 'DISCOVERY' ? (
              filteredCatalog?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                  {filteredCatalog.map((course: any) => (
                    <CourseCard 
                      key={course.id} 
                      course={course} 
                      isLearner={true} 
                      assignedCourseIds={assignedCourseIds}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 bg-muted rounded-[40px] text-center border-2 border-dashed border-border">
                  <div className="w-16 h-16 bg-card rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4 text-gray-300">
                     <Layers size={32} />
                  </div>
                  <p className="text-sm font-black text-foreground tracking-tight">No match found</p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Refine your search parameters or check back later</p>
                </div>
              )
            ) : (
              (filteredAssignments?.length > 0 || (!filterStatus && filteredCatalog?.length > 0)) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                  {/* Show Assignments */}
                  {filteredAssignments?.map((assignment: any) => (
                    <CourseCard 
                      key={`asn-${assignment.id}`} 
                      course={{ ...assignment.course, progress: assignment.progress }} 
                      isLearner={true} 
                      assignedCourseIds={assignedCourseIds}
                    />
                  ))}
                  {/* Show Catalog only when 'All' is selected */}
                  {!filterStatus && filteredCatalog?.map((course: any) => (
                    <CourseCard 
                      key={`cat-${course.id}`} 
                      course={course} 
                      isLearner={true} 
                      assignedCourseIds={assignedCourseIds}
                    />
                  ))}
                </div>
              ) : !isLoading ? (
                <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-muted text-gray-300 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <PlayCircle size={32} />
                  </div>
                  <h3 className="text-base font-bold text-foreground">No matching tracks</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 font-medium">Try changing your filters or check the discovery section.</p>
                </div>
              ) : null
            )}
          </div>

          <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Recently Viewed</h3>
                <Button variant="ghost" className="text-xs font-bold text-primary">View History</Button>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { title: 'Advanced React Patterns', progress: 45, icon: <Layers size={14} /> },
                  { title: 'System Security 101', progress: 12, icon: <Shield size={14} /> },
                  { title: 'Project Management', progress: 88, icon: <Target size={14} /> },
                ].map((item, i) => (
                  <div key={i} className="min-w-[180px] p-3 rounded-lg bg-muted/40 border border-border dark:border-border/60 hover:bg-card hover:shadow-sm transition-all cursor-pointer group">
                     <div className="w-8 h-8 flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                        {item.icon}
                     </div>
                     <p className="text-[11px] font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.title}</p>
                     <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${item.progress}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground">{item.progress}%</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           {/* Achievement Vault */}
           <div className="bg-primary rounded-lg p-6 text-white shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-white/10 rotate-12"><Award size={180} /></div>
              <div className="relative z-10 space-y-4">
                 <h4 className="text-[12px] font-medium opacity-80">ACHIEVEMENT VAULT</h4>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center border-none">
                       <Award size={24} />
                    </div>
                    <div>
                       <p className="text-2xl font-black">12</p>
                       <p className="text-[10px] font-medium opacity-70 ">Badges Earned</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-2 pt-2">
                    {[1, 2, 3, 4].map(i => (
                       <div key={i} className="w-8 h-8 rounded-lg bg-card/20 border border-white/10 flex items-center justify-center hover:bg-card/30 transition-colors cursor-pointer">
                          <Zap size={14} className={i === 1 ? 'text-amber-300' : 'text-white'} />
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Next Deadline */}
           <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 flex items-center justify-center text-rose-500 dark:text-rose-400">
                    <Calendar size={20} />
                 </div>
                 <div>
                    <h4 className="text-[12px] font-medium text-foreground">Upcoming Deadline</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Mandatory Compliance Training</p>
                 </div>
              </div>
              <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
                 <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">2 Days</span>
                    <span className="text-[10px] font-bold text-rose-400 dark:text-rose-300">Remaining</span>
                 </div>
                 <div className="h-1.5 w-full bg-rose-100 dark:bg-rose-900/40 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 dark:bg-rose-400" style={{ width: '80%' }} />
                 </div>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/95 text-white font-black h-11 rounded-lg text-xs transition-all shadow-sm shadow-primary/20">Complete Now</Button>
           </div>

           {/* Skill Progress */}
           <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
              <h4 className="text-[12px] font-medium text-foreground">Skill Acquisition</h4>
              <div className="space-y-4">
                 {[
                   { skill: 'System Design', level: 65, color: 'bg-primary' },
                   { skill: 'React Architecture', level: 82, color: 'bg-emerald-500' },
                   { skill: 'Team Leadership', level: 40, color: 'bg-amber-500' },
                 ].map((s, i) => (
                    <div key={i} className="space-y-1.5">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground">{s.skill}</span>
                          <span className="text-[10px] font-black text-foreground">{s.level}%</span>
                       </div>
                       <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${s.color}`} style={{ width: `${s.level}%` }} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Certification Vault */}
      <div className="bg-card p-8 rounded-2xl border border-border shadow-sm space-y-8 mt-12">
         <div className="flex items-center justify-between">
            <div>
               <h3 className="text-2xl font-black text-foreground">Certification Vault</h3>
               <p className="text-sm text-muted-foreground font-medium">Your verified professional credentials</p>
            </div>
            <Button variant="outline" className="rounded-lg font-bold text-xs h-10 border-border px-6">Verify Certificate</Button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Enterprise Architecture Professional', date: 'Oct 24, 2025', id: 'CRT-9842-X', color: 'primary' },
              { title: 'Full Stack Development (L3)', date: 'Aug 12, 2025', id: 'CRT-2145-A', color: 'emerald' },
            ].map((cert, i) => (
               <div key={i} className="group relative bg-muted/40 rounded-lg p-6 border border-border dark:border-border/60 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-500 cursor-pointer overflow-hidden">
                  <div className={`absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12`}>
                     <Award size={120} />
                  </div>
                  <div className="relative z-10 space-y-6">
                     <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 flex items-center justify-center text-${cert.color}-600 dark:text-${cert.color}-400`}>
                           <Award size={24} />
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground tracking-widest">{cert.id}</span>
                     </div>
                     <div>
                        <h4 className="text-[12px] font-medium text-foreground leading-tight group-hover:text-primary transition-colors">{cert.title}</h4>
                        <p className="text-xs text-muted-foreground font-medium mt-1">Issued on {cert.date}</p>
                     </div>
                     <div className="flex gap-2 pt-2">
                        <Button className="flex-1 bg-primary hover:bg-primary/95 text-white font-black text-[10px] h-9 rounded-lg shadow-sm shadow-primary/20">Download PDF</Button>
                        <Button variant="ghost" className="w-10 h-9 p-0 bg-card border border-border rounded-lg"><Globe size={14} className="text-muted-foreground" /></Button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      <div className="pt-8 border-t border-border space-y-6">
        <div>
           <h2 className="text-xl font-bold text-foreground">Your Credentials</h2>
           <p className="text-xs text-muted-foreground font-medium">Verified certificates and achievements</p>
        </div>
        {assignments?.filter((a: any) => a.status === 'COMPLETED').length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.filter((a: any) => a.status === 'COMPLETED').map((a: any, i: number) => (
              <div key={i} className="p-5 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg text-white shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Award size={80} /></div>
                 <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <ShieldCheck size={14} className="text-primary-200" />
                       <span className="text-[9px] font-black">Official Certification</span>
                    </div>
                     <div>
                        <h4 className="text-[12px] font-medium leading-tight">{a.course.title}</h4>
                        <p className="text-[10px] text-primary-100 mt-1 font-medium italic">Issued on {new Date(a.updated_at).toLocaleDateString()}</p>
                     </div>
                     <Button 
                       onClick={() => setSelectedCert(a)}
                       variant="ghost" 
                       className="w-full bg-card/10 hover:bg-card/20 text-white border border-white/20 h-9 rounded-lg font-bold text-[10px] flex items-center gap-2"
                     >
                        <Award size={14} /> View Certificate
                     </Button>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 bg-muted rounded-lg text-center border border-dashed border-border">
             <p className="text-[10px] font-bold text-muted-foreground">No certificates earned yet</p>
          </div>
        )}
      </div>



      {/* Premium Certificate Preview Modal */}
      <Dialog 
        isOpen={!!selectedCert} 
        onClose={() => setSelectedCert(null)} 
        title="Official Credential Preview"
        maxWidth="max-w-2xl"
      >
        <div className="bg-gradient-to-br from-primary-950 via-primary-900 to-slate-950 -m-6 p-12 text-white relative overflow-hidden text-center min-h-[500px] flex flex-col items-center justify-center">
           {/* Decorative Elements */}
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 bg-card/20 blur-[100px] -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-500/20 blur-[100px] translate-x-1/2 translate-y-1/2" />
           </div>
           
           <div className="relative z-10 space-y-8 max-w-lg">
              <div className="flex flex-col items-center gap-4">
                 <div className="w-20 h-20 flex items-center justify-center text-primary-300">
                    <Award size={40} />
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary-400">Official Certification</p>
                    <h2 className="text-3xl font-black tracking-tight">{selectedCert?.course?.title}</h2>
                 </div>
              </div>

              <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />

              <div className="space-y-2">
                 <p className="text-xs font-medium text-primary-200">This certifies that</p>
                 <p className="text-4xl font-serif italic font-light tracking-wide">{user?.name}</p>
                 <p className="text-xs font-medium text-primary-200 pt-2">has successfully demonstrated proficiency and mastery of the core competencies defined in the curriculum.</p>
              </div>

              <div className="pt-8 grid grid-cols-2 gap-12 text-left">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-primary-400">Issue Date</p>
                    <p className="text-sm font-bold">{selectedCert?.updated_at ? new Date(selectedCert.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
                 </div>
                 <div className="text-right space-y-1">
                    <p className="text-[9px] font-black text-primary-400">Credential ID</p>
                    <p className="text-sm font-bold font-mono">LMS-{selectedCert?.id?.toString().padStart(6, '0')}</p>
                 </div>
              </div>

              <div className="pt-10">
                 <Button className="bg-card text-primary-900 hover:bg-primary/10 font-black px-12 h-12 rounded-lg shadow-sm flex items-center gap-3 group">
                    <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> 
                    Secure PDF Export
                 </Button>
              </div>
           </div>
        </div>
      </Dialog>
    </div>
  );
};


// --- Enterprise LMS Context Switcher ---

export const LmsDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isSelfView = localStorage.getItem('sidebar_view_mode') === 'self' || location.state?.selfView === true;
  const isAdminRole = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  const showAdminTabs = isAdminRole && !isSelfView;
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COURSES' | 'PATHS' | 'ASSIGNMENTS' | 'NOTIFICATIONS'>(
    showAdminTabs ? 'COURSES' : 'OVERVIEW'
  );
  
  const { data: assignments, isLoading: loadingAssignments } = useLearnerDashboard();
  const { data: allCourses, isLoading: loadingCourses } = useCourses();
  const { data: adminStats, isLoading: loadingAdmin } = useAdminStats();
  const { data: managerStats, isLoading: loadingManager } = useManagerStats();

  const isLoading = loadingAssignments || loadingCourses || loadingAdmin || loadingManager;

  // Filter out courses that are already assigned to the user
  const assignedCourseIds = new Set<number>(assignments?.map((a: any) => a.course_id) || []);
  const availableCourses = allCourses?.filter((c: any) => !assignedCourseIds.has(c.id) && c.status === 'PUBLISHED');



  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6 font-poppins w-full max-w-full mx-auto px-0 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Talent & Growth
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Empower your professional journey, track courses, and master new skills
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      {showAdminTabs && (
        <div className="relative border-b border-border -mx-2 px-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-6 min-w-max">
            {[
              { id: 'COURSES', label: 'Course Library', icon: BookOpen },
              { id: 'PATHS', label: 'Learning Paths', icon: Layers },
              { id: 'ASSIGNMENTS', label: 'Assignment Hub', icon: Zap },
              { id: 'NOTIFICATIONS', label: 'Alerts', icon: Bell },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-1 relative transition-all duration-300 group ${
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-slate-600"}`} />
                <span className="text-sm font-normal tracking-tight">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unified Canvas Switcher */}
      {(() => {
        if (activeTab === 'COURSES') return <AdminCourseList />;
        if (activeTab === 'PATHS') return <LearningPathList />;
        if (activeTab === 'ASSIGNMENTS') return <AssignmentHub />;
        if (activeTab === 'NOTIFICATIONS') return <LmsNotifications />;

        return (
          <LearnerDashboard 
            assignments={assignments || []} 
            availableCourses={availableCourses || []} 
            isLoading={isLoading} 
            assignedCourseIds={assignedCourseIds} 
          />
        );
      })()}
    </div>
  );
};


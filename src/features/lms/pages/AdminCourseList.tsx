import React, { useState } from 'react';
import { Plus, Search, Filter, Loader2, BookOpen, Users, CheckCircle, ShieldCheck } from 'lucide-react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useCourses, useAdminStats } from '../api/lmsApi';
import { CourseCard } from '../components/CourseCard';
import { Button } from '@/shared/components/ui/button';

export const AdminCourseList: React.FC = () => {
  const navigate = useOrgNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('ALL');
  const { data: courses, isLoading } = useCourses();
  const { data: stats } = useAdminStats();

  const filteredCourses = courses?.filter((course: any) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor?.details?.first_name && `${course.instructor.details.first_name} ${course.instructor.details.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || course.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Learning Command Center</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Strategic oversight of organization-wide intellectual capital</p>
          </div>
        </div>
        <Button 
          variant="primary" 
          className="bg-primary hover:bg-primary/95 text-white font-black text-[10px]  tracking-widest h-11 px-8 rounded-lg shadow-sm shadow-primary-100 transition-all flex items-center gap-2 w-full md:w-auto justify-center active:scale-95"
          onClick={() => navigate('/lms/courses/new')}
        >
          <Plus size={18} /> Create New Course
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Total Catalog', value: stats?.totalCourses || 0, icon: BookOpen, color: 'text-primary bg-primary/10', sub: 'Active Courses' },
           { label: 'Enrollments', value: stats?.totalEnrollments || 0, icon: Users, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30', sub: 'Total Assigned' },
            { label: 'Completion Rate', value: `${stats?.completionRate || 0}%`, icon: CheckCircle, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30', sub: 'Performance' },
            { label: 'Active Learners', value: stats?.activeUsers || 0, icon: ShieldCheck, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30', sub: 'This Month' },
         ].map((stat, i) => (
           <div key={i} className="bg-card p-6 rounded-lg border border-border shadow-sm flex items-center justify-between group hover:border-primary-100 hover:shadow-sm hover:shadow-primary-500/5 transition-all">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{stat.label}</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight">{stat.value}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">{stat.sub}</span>
                 </div>
              </div>
              <div className={`w-14 h-14 rounded-lg ${stat.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                 <stat.icon size={28} />
              </div>
           </div>
         ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-3 rounded-lg shadow-sm border border-border">
        <div className="flex-1 w-full relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary-500 transition-colors" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-medium transition-all outline-none" 
            placeholder="Search courses by title or instructor..." 
          />
        </div>
        <div className="w-full overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg border border-border w-max min-w-full justify-start">
            {['All', 'Draft', 'Published', 'Archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status.toUpperCase() as any)}
                className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
                  statusFilter === status.toUpperCase() 
                    ? 'bg-card text-primary shadow-sm border border-border' 
                    : 'text-muted-foreground hover:text-gray-600 hover:bg-muted'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredCourses?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredCourses.map((course: any) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : !isLoading ? (
        <div className="bg-card border border-dashed border-border rounded-lg p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-muted text-gray-300 rounded-lg flex items-center justify-center mb-6 border border-border">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">No courses found</h3>
          <p className="text-muted-foreground text-sm max-w-sm font-medium">Get started by creating your first course to share knowledge with your team.</p>
          <Button 
            variant="primary" 
            className="mt-8 bg-primary hover:bg-primary/95 font-semibold h-11 px-8 rounded-lg shadow-sm"
            onClick={() => navigate('/lms/courses/new')}
          >
            Create Your First Course
          </Button>
        </div>
      ) : null}
    </div>
  );
};

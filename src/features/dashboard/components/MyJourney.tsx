import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  Users, 
  Briefcase, 
  Target, 
  MessageSquare, 
  Calendar,
  Award,
  ArrowUpRight
} from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';

interface MyJourneyProps {
  employeeDetails?: any;
  lmsDashboard?: any[];
}

export const MyJourney: React.FC<MyJourneyProps> = ({ employeeDetails, lmsDashboard }) => {
  const navigate = useOrgNavigate();
  const details = employeeDetails?.details || employeeDetails;

  // Dynamic: Calculate days since joining
  const startDate = details?.start_date ? new Date(details.start_date) : null;
  const today = new Date();
  const daysSinceJoining = startDate 
    ? Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;
  const joinDateFormatted = startDate 
    ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : 'N/A';

  // Dynamic: reporting manager
  const managerName = details?.reporting_manager 
    ? `${details.reporting_manager.details?.first_name || ''} ${details.reporting_manager.details?.last_name || ''}`.trim() || details.reporting_manager.username
    : null;
  const managerInitials = managerName 
    ? managerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'NA';
  const managerTitle = details?.reporting_manager?.details?.designation?.designation_name || 'Manager';

  // Dynamic: milestones based on actual start_date
  const onboardingMilestones = startDate ? [
    { title: "Joined the Company", status: "completed", date: joinDateFormatted },
    { title: "HR Onboarding Complete", status: daysSinceJoining >= 3 ? "completed" : "upcoming", date: new Date(startDate.getTime() + 3 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    { title: "Meet Team Members", status: daysSinceJoining >= 7 ? "completed" : "upcoming", date: new Date(startDate.getTime() + 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    { title: "30-Day Review", status: daysSinceJoining >= 30 ? "completed" : "upcoming", date: new Date(startDate.getTime() + 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    { title: "60-Day Check-in", status: daysSinceJoining >= 60 ? "completed" : "upcoming", date: new Date(startDate.getTime() + 60 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    { title: "90-Day Performance Review", status: daysSinceJoining >= 90 ? "completed" : "upcoming", date: new Date(startDate.getTime() + 90 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
  ] : [
    { title: "Joined the Company", status: "completed", date: "N/A" },
    { title: "HR Onboarding Complete", status: "upcoming", date: "Pending" },
  ];

  const completedMilestones = onboardingMilestones.filter(m => m.status === 'completed').length;
  const totalMilestones = onboardingMilestones.length;
  const progressPercent = Math.round((completedMilestones / totalMilestones) * 100);

  // Dynamic: learning path from LMS dashboard API
  const learningPath = lmsDashboard && lmsDashboard.length > 0
    ? lmsDashboard.map((item: any) => ({
        title: item.course?.title || 'Course',
        progress: item.progress?.percentage || 0,
        status: (item.progress?.percentage || 0) >= 100 ? 'Completed' : (item.progress?.percentage || 0) > 0 ? 'In Progress' : 'Not Started',
      }))
    : [
        { title: "No assigned courses yet", progress: 0, status: "Not Started" },
      ];

  // Dynamic career milestones
  const careerMilestones = [
    { title: "Joined Company", date: joinDateFormatted, icon: Users, color: "bg-blue-100 text-blue-600" },
    ...(daysSinceJoining >= 30 ? [{ title: "30-Day Review", date: new Date((startDate?.getTime() || 0) + 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Target, color: "bg-purple-100 text-purple-600" }] : []),
    ...(daysSinceJoining >= 90 ? [{ title: "Probation Complete", date: new Date((startDate?.getTime() || 0) + 90 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Award, color: "bg-emerald-100 text-emerald-600" }] : []),
    ...(daysSinceJoining < 90 ? [{ title: "Probation Completion", date: "Upcoming", icon: Award, color: "bg-amber-100 text-amber-600" }] : []),
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Row 1: Onboarding Journey — full width */}
      <div className="bg-card rounded-sm border border-border shadow-sm overflow-hidden">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-sm">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">My Onboarding Journey</h3>
                <p className="text-[11px] text-muted-foreground font-normal">
                  {daysSinceJoining > 0 ? `Day ${daysSinceJoining} since you joined` : 'Welcome aboard!'}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {progressPercent}% Complete
            </span>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Overall Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Overall Progress</p>
              <p className="text-xs font-medium text-primary">
                {daysSinceJoining > 0 ? `Day ${daysSinceJoining} of 90` : 'Getting started'}
              </p>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all duration-1000" 
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground font-normal">
              {completedMilestones} of {totalMilestones} milestones completed
            </p>
          </div>

          {/* Milestones Timeline */}
          <div className="space-y-5">
            <h4 className="text-[12px] font-medium text-foreground">Milestones</h4>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-muted">
              {onboardingMilestones.map((milestone, idx) => (
                <div key={idx} className="relative flex items-center gap-4 group">
                  <div className="flex items-center justify-center bg-card z-10 shrink-0">
                    {milestone.status === 'completed' ? (
                      <div className="w-8 h-8 bg-[#00D261] rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center border-2 border-border">
                        <Circle className="w-4 h-4 text-slate-300 fill-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="items-center justify-between gap-4">
                    <h5 className={`text-sm font-medium ${milestone.status === 'completed' ? 'text-foreground line-through decoration-slate-300' : 'text-foreground'}`}>
                      {milestone.title}
                    </h5>
                    <p className="text-xs text-muted-foreground font-normal shrink-0">
                      {milestone.status === 'completed' ? 'Completed: ' : 'Target: '}
                      {milestone.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Learning Path + Career Milestones + Mentor — 3 equal columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Learning Path */}
        <div className="bg-card rounded-sm border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-sm">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Learning Path</h3>
            </div>
            <button 
              onClick={() => navigate('/lms')}
              className="flex items-center gap-1 text-xs font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline transition-colors py-1 px-2 hover:bg-blue-50 rounded-lg group/link"
            >
              View All
            </button>
          </div>

          <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[320px]">
            {learningPath.map((item, idx) => {
              const statusStyles: any = {
                "Completed": "bg-emerald-50 text-emerald-600 border-emerald-100",
                "In Progress": "bg-amber-50 text-amber-600 border-amber-100",
                "Not Started": "bg-muted/50 text-muted-foreground border-border"
              };

              return (
                <div key={idx} className="p-3 border border-slate-50 dark:border-transparent rounded-lg bg-muted/50/20 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-foreground group-hover:text-white transition-colors line-clamp-1">
                      {item.title}
                    </h5>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-medium border shrink-0 ${statusStyles[item.status]}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(79,70,229,0.3)] transition-all duration-1000 ease-out" 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground tracking-wide">
                      {item.progress}% Complete
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Career Milestones */}
        <div className="bg-card rounded-sm border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-transparent rounded-sm">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Career Milestones</h3>
            </div>
          </div>
          <div className="p-4 space-y-4 flex-1">
            {careerMilestones.map((milestone, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-muted/50/50 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                <div className={`w-10 h-10 rounded-lg ${milestone.color} flex items-center justify-center shrink-0`}>
                  <milestone.icon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-foreground">{milestone.title}</h5>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">{milestone.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Reporting Manager */}
        <div className="bg-card rounded-sm border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-transparent rounded-sm">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Your Manager</h3>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-medium text-lg shadow-sm">
                {managerInitials}
              </div>
              <div>
                <h5 className="text-sm font-medium text-foreground line-clamp-1">{managerName || 'Not Assigned'}</h5>
                <p className="text-xs text-muted-foreground font-normal tracking-wide">{managerTitle}</p>
              </div>
            </div>
            
            <div className="space-y-3 mt-auto">
              <Button variant="outline" className="w-full h-10 border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-all active:scale-[0.98]">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Send Message
              </Button>
              <Button variant="outline" className="w-full h-10 border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-all active:scale-[0.98]">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};


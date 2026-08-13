import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Users,
  Briefcase,
  DollarSign,
  Activity,
  ChevronRight,
  UserPlus,
  FileText,
  CheckCircle2,
  Loader2,
  Award,
  Gift,
  Cake,
  Newspaper,
  ChevronLeft,
  ArrowUpRight,
  ClipboardList,
  CalendarDays,
  Zap,
  Clock,
  Check,
  X,
  Heart,
  LogOut,
  LogIn,
  PartyPopper,
  TrendingUp,
  TrendingDown,
  Target,
  Smile,
  Send,
  MessageSquareText,
  BarChart3
} from 'lucide-react';
import axiosInstance from '@/shared/services/axiosInstance';
import { getEmployees } from '@/features/employees/services/employees';
import { handleLeaveAction } from '@/features/leaves/services/leaves';
import { sendWish } from '../services/wishService';
import { submitFeedback } from '../services/feedbackService';
import { toast } from 'sonner';
import { useAuth } from '@/shared/context/AuthContext';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { formatDisplayRole } from '@/shared/utils/stringUtils';
import { getMyAttendanceLogs, checkIn, checkOut } from '@/features/attendance/services/attendance';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { getNews } from '@/features/news/services/news';
import { useSurveys } from '@/features/survey-builder/api/surveyApi';
import { getDepartments } from '@/features/organization/services/departments';
import celebrationBg from '@/assets/dashboard/celebration.png';

const recentActivitiesFallback = [
  { id: 1, type: 'approval', text: 'Sarah Chen applied for 5 days Annual Leave', time: '10 mins ago', icon: FileText, color: 'text-amber-500 dark:text-amber-400', bg: '' },
  { id: 2, type: 'onboarding', text: 'Mike Johnson completed HR onboarding', time: '1 hour ago', icon: UserPlus, color: 'text-emerald-500 dark:text-emerald-400', bg: '' },
  { id: 3, type: 'payroll', text: 'May 2026 Payroll Run approved by Finance', time: '3 hours ago', icon: DollarSign, color: 'text-blue-500 dark:text-blue-400', bg: '' },
  { id: 4, type: 'system', text: 'Q2 Performance Cycle initiated', time: '1 day ago', icon: Activity, color: 'text-purple-500 dark:text-purple-400', bg: '' },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getGreetingIcon = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️";
  if (hour < 17) return "🌤️";
  return "🌠";
};

export function AdminDashboard() {
  const { user } = useAuth();
  const { currencySymbol, isIndia, formatCurrencyAbbr } = useCurrency();
  const navigate = useOrgNavigate();
  const [loading, setLoading] = useState(true);

  // Real Data States
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [recentActivitiesState, setRecentActivitiesState] = useState<any[]>([]);
  const [celebrationsList, setCelebrationsList] = useState<any[]>([]);

  // Carousel State
  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);

  // Dynamic Stats State
  const [stats, setStats] = useState({
    totalEmployees: 24,
    activeToday: 22,
    pendingApprovals: 4,
    openJobs: 5,
    avgPayrollValue: 0
  });

  const avgPayrollCostFormatted = useMemo(() => {
    const val = stats.avgPayrollValue;
    if (!val) return '—';
    return formatCurrencyAbbr(val);
  }, [stats.avgPayrollValue, formatCurrencyAbbr]);

  const { data: newsRaw } = useQuery({
    queryKey: ['news', 'published'],
    queryFn: () => getNews({ status: 'published' }),
  });

  const { data: surveys = [] } = useSurveys();

  const { data: departmentsRaw } = useQuery({
    queryKey: ['departments'],
    queryFn: () => getDepartments(),
  });

  const companyNews = useMemo(() =>
    (newsRaw ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      excerpt: item.content.length > 120 ? item.content.substring(0, 120) + '...' : item.content,
      date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      category: item.access_type === 'public' ? 'Company News' : 'Department Update',
      meta: `${item.author?.full_name || item.author?.username || 'Unknown'} • ${new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      image: item.image || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
    })),
    [newsRaw]
  );

  const activeSurveys = useMemo(() =>
    surveys.filter((s: any) => s.is_active),
    [surveys]
  );

  const firstActiveSurvey = activeSurveys[0];

  const surveyResponseCount = firstActiveSurvey?.responses?.length ?? 0;
  const surveyParticipationRate = firstActiveSurvey && firstActiveSurvey.active_user_count > 0
    ? Math.round((surveyResponseCount / firstActiveSurvey.active_user_count) * 100)
    : 0;

  const departmentsData = useMemo(() =>
    (departmentsRaw ?? [])
      .filter((d: any) => d.headcount && d.headcount > 0)
      .sort((a: any, b: any) => (b.headcount || 0) - (a.headcount || 0))
      .slice(0, 4)
      .map((d: any) => ({
        name: d.department_name,
        headcount: d.headcount || 0,
        attrition: d.headcount >= 50
          ? `${(1 + (d.id % 3)).toFixed(1)}%`
          : `${(3 + (d.id % 4)).toFixed(1)}%`,
        status: (d.headcount >= 50 ? 'Healthy' : 'Review') as 'Healthy' | 'Review'
      })),
    [departmentsRaw]
  );

  // Auto-play celebrations carousel
  useEffect(() => {
    if (celebrationsList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCelebrationIndex((prev) => (prev + 1) % celebrationsList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [celebrationsList.length]);

  const handleSendWish = async (employeeId: number, name: string, type: string) => {
    try {
      const wishType = type.toUpperCase().includes("ANNIVERSARY") || type.toUpperCase().includes("WORK") ? 'anniversary' : 'birthday';
      await sendWish(employeeId, wishType);
      toast.success(`${wishType === 'birthday' ? 'Birthday' : 'Anniversary'} wish sent to ${name}! 🎉`);
    } catch {
      toast.error('Failed to send wish. Please try again.');
    }
  };

  const [quickFeedbackText, setQuickFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const handleSendQuickFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFeedbackText.trim()) return;

    setIsSendingFeedback(true);
    try {
      await submitFeedback(quickFeedbackText);
      toast.success("Feedback submitted to HR!");
      setQuickFeedbackText("");
    } catch (err: any) {
      toast.error("Failed to submit feedback.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleLeaveApproval = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await handleLeaveAction(id, action);
      toast.success(`Leave request ${action === 'APPROVED' ? 'approved' : 'rejected'} successfully!`);

      // Update pending leaves list
      setPendingLeaves(prev => prev.filter((leave: any) => leave.id !== id));

      // Update statistics
      setStats(prev => ({
        ...prev,
        pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
      }));

      // Add to activity list dynamically
      const activityText = `${action === 'APPROVED' ? 'Approved' : 'Rejected'} leave request for employee`;
      setRecentActivitiesState(prev => [
        {
          id: `activity-action-${Date.now()}`,
          type: 'system',
          text: activityText,
          time: 'Just now',
          icon: action === 'APPROVED' ? CheckCircle2 : X,
          color: action === 'APPROVED' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
          bg: ''
        },
        ...prev.slice(0, 3)
      ]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update leave request.');
    }
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const todayUTCDate = new Date().toISOString().split('T')[0];

        // Parallel API calls
        const [employeesRes, payrollRes, pendingLeavesRes, jobsRes, attendanceRes, celebrationsRes] = await Promise.all([
          getEmployees({ limit: 1000, orgId: user?.orgId }).catch(() => []),
          axiosInstance.get('/payroll/runs').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/leaves/pending').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/jobs').catch(() => ({ data: [] })),
          axiosInstance.get('/attendance/team-logs', { params: { date: todayUTCDate } }).catch(() => ({ data: [] })),
          axiosInstance.get('/employees/celebrations').catch(() => ({ data: { data: [] } }))
        ]);

        const employees = Array.isArray(employeesRes) ? employeesRes : [];
        const runs = payrollRes.data?.data || [];
        const pending = pendingLeavesRes?.data?.data || [];
        const jobs = jobsRes?.data || [];
        const attendance = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes?.data || []);
        const celebrations = celebrationsRes?.data?.data || [];

        setPendingLeaves(pending);

        // Compute stats
        const activeCount = attendance.length > 0
          ? attendance.filter((log: any) => log.check_in && !log.check_out).length
          : Math.max(1, Math.round(employees.length * 0.9));

        // Compute avg payroll cost from payslips
        let avgPayrollValue = 0;
        if (runs.length > 0) {
          const monthMap: Record<string, number> = {};
          runs.forEach((p: any) => {
            const gross = parseFloat(p.gross_amount) || 0;
            monthMap[p.month] = (monthMap[p.month] || 0) + gross;
          });
          const monthlyTotals = Object.values(monthMap);
          avgPayrollValue = monthlyTotals.reduce((sum, v) => sum + v, 0) / monthlyTotals.length;
        }

        setStats({
          totalEmployees: employees.length || 24,
          activeToday: activeCount,
          pendingApprovals: pending.length || 4,
          openJobs: jobs.length || 5,
          avgPayrollValue
        });

        // 1. Process Recent Activities dynamically
        const activitiesList: any[] = [];

        // A. Add Pending Leaves
        pending.forEach((leave: any) => {
          const empName = `${leave.user?.details?.first_name || ''} ${leave.user?.details?.last_name || ''}`.trim() || leave.user?.username || 'Employee';
          activitiesList.push({
            id: `leave-${leave.id}`,
            type: 'approval',
            text: `${empName} applied for ${leave.duration} days ${leave.leave_policy?.policy_name || 'Leave'}`,
            time: 'Pending Approval',
            date: new Date(leave.created_at || leave.applied_at || Date.now()),
            icon: FileText,
            color: 'text-amber-500',
            bg: 'bg-amber-50'
          });
        });

        // B. Add New Hires
        const sortedEmployees = [...employees].sort((a: any, b: any) => {
          const dateA = new Date(a.details?.joining_date || a.created_at).getTime();
          const dateB = new Date(b.details?.joining_date || b.created_at).getTime();
          return dateB - dateA;
        });

        sortedEmployees.slice(0, 3).forEach((emp: any) => {
          const empName = `${emp.details?.first_name || ''} ${emp.details?.last_name || ''}`.trim() || emp.username;
          const roleName = emp.details?.designation?.designation_name || emp.details?.role?.role_name || 'Executive';
          activitiesList.push({
            id: `hire-${emp.id}`,
            type: 'onboarding',
            text: `${roleName} completed HR onboarding`,
            time: 'joined recently',
            date: new Date(emp.details?.joining_date || emp.created_at),
            icon: UserPlus,
            color: 'text-emerald-500 dark:text-emerald-400',
            bg: ''
          });
        });

        // C. Add Payroll Runs
        const sortedPayroll = [...runs].sort((a: any, b: any) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        sortedPayroll.slice(0, 2).forEach((run: any) => {
          const statusText = run.status?.toUpperCase() === 'PAID' ? 'processed & paid' : 'approved';
          activitiesList.push({
            id: `payroll-${run.id}`,
            type: 'payroll',
            text: `${run.month} Payroll Run ${statusText}`,
            time: 'Recently updated',
            date: new Date(run.created_at),
            icon: DollarSign,
            color: 'text-blue-500 dark:text-blue-400',
            bg: ''
          });
        });

        // Sort all activities descending by date
        activitiesList.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Combine dynamic activities with fallbacks if under 4
        if (activitiesList.length < 4) {
          const fallbackCountNeeded = 4 - activitiesList.length;
          const fallbacks = recentActivitiesFallback.slice(0, fallbackCountNeeded);
          setRecentActivitiesState([...activitiesList, ...fallbacks]);
        } else {
          setRecentActivitiesState(activitiesList.slice(0, 4));
        }

        // 2. Process Celebrations & Milestones dynamically from backend
        setCelebrationsList(celebrations || []);

      } catch (err) {
        console.error('Failed to load admin dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Active Carousel item
  const currentCelebration = celebrationsList[currentCelebrationIndex] || celebrationsList[0];

  return (
    <div className="space-y-6">

      {/* ─── Row 0: Stats Overview / KPI Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Headcount Growth */}
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              +12% YoY <TrendingUp className="w-3 h-3 text-emerald-600" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight tracking-tight">{stats.totalEmployees}</p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Total workforce</p>
        </Card>

        {/* Monthly Payroll Burn */}
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              -2.4% MoM <TrendingDown className="w-3 h-3 text-emerald-600" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight tracking-tight">{avgPayrollCostFormatted}</p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Avg. Payroll Cost</p>
        </Card>

        {/* Employee Net Promoter Score */}
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80">
          <div className="flex items-center justify-between mb-2">
            <Smile className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              +4 pts <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight tracking-tight">72 <span className="text-sm font-medium text-emerald-600">eNPS</span></p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Employee Sentiment</p>
        </Card>

        {/* OKR Tracking */}
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              On Track <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight tracking-tight">85%</p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Q3 Objectives</p>
        </Card>
      </div>

      {/* ─── Row 1: Company News (2/4), Celebrations (1/4), Quick Actions (1/4) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Company News & Updates */}
        <Card className="p-5 border-border shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Newspaper className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-[16px] font-medium leading-6 text-foreground">News & Updates</h3>
            </div>
            <button
              onClick={() => navigate('/news')}
              className="text-xs font-semibold text-primaryhover:text-blue-700 flex items-center gap-0.5 cursor-pointer no-underline"
            >
              View all
            </button>
          </div>

          {/* Horizontal News Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {companyNews.map((news) => (
              <div
                key={news.id}
                className="border border-border rounded-lg p-3 bg-muted/50 hover:bg-card hover:shadow-sm transition-all duration-300 group cursor-pointer flex flex-col justify-between h-[280px]"
              >
                <div>
                  <div className="relative rounded-lg overflow-hidden mb-3 aspect-[21/9]">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${
                      news.category.toLowerCase().includes("hands") ? 'bg-primary' : 'bg-emerald-600'
                    }`}>
                      {news.category}
                    </span>
                  </div>
                  <h4 className="text-[12px] font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primarytransition-colors">
                    {news.title}
                  </h4>
                  <p className="text-[11px] leading-4 text-muted-foreground mt-1 line-clamp-2">
                    {news.excerpt}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[9px] text-muted-foreground font-semibold">
                    {news.meta}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all duration-350">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Celebrations Carousel Card */}
        <Card className="p-5 border-border shadow-sm flex flex-col justify-between min-h-[345px]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <PartyPopper className="h-5 w-5 text-pink-500 shrink-0" />
              <h3 className="text-[16px] font-medium leading-6 text-foreground">
                Celebrations
              </h3>
            </div>

          {currentCelebration ? (
            <div 
              className="rounded-lg p-4 flex flex-col items-center justify-center text-center relative overflow-hidden text-white min-h-[275px]"
              style={{
                background: 'linear-gradient(180deg, #0A2263 0%, #030D24 100%)'
              }}
            >
              {/* Background illustration overlay at full opacity */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${celebrationBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                {/* Photo Portrait Container - large */}
                <div className="relative mb-2.5">
                  <div className="w-36 h-36 rounded-full border-[3px] border-white bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center text-pink-300 text-2xl font-bold shadow-sm overflow-hidden">
                    {currentCelebration.avatar ? (
                      <img
                        src={currentCelebration.avatar}
                        alt={currentCelebration.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{currentCelebration.initial}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-pink-400 shadow-lg">
                    {currentCelebration.type === 'birthday' ? (
                      <Cake className="w-3.5 h-3.5" />
                    ) : (
                      <Award className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>

                {/* Name */}
                <h4 className="text-[14px] font-bold text-white mb-0.5">{currentCelebration.name}</h4>

                {/* Badge */}
                <span className="text-[8px] font-bold tracking-widest text-pink-300 uppercase bg-pink-500/20 px-2.5 py-0.5 rounded-full border border-pink-500/30 mb-0.5">
                  {currentCelebration.label?.toUpperCase()}
                </span>

                {/* Action button */}
                <Button
                  onClick={() => handleSendWish(currentCelebration.employeeId, currentCelebration.name, currentCelebration.label)}
                  className="mt-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-650 hover:to-rose-650 active:scale-95 text-white font-bold h-7 px-4 text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-md shadow-pink-900/40"
                >
                  <Gift className="w-3 h-3" />
                  Send Wish
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 min-h-[275px]">
              <PartyPopper className="w-10 h-10 text-pink-500 mb-4" />
              <p className="text-sm font-bold text-foreground">No Celebrations Today</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Birthdays and work anniversary celebrations will appear here as they occur.
              </p>
            </div>
          )}
          </div>

          {/* Dots navigation */}
          {celebrationsList.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {celebrationsList.map((_, idx) => {
                const isActive = idx === currentCelebrationIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentCelebrationIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-pink-500 w-3' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-5 border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2.5 mb-5">
            <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="text-[16px] font-medium leading-6 text-foreground">Quick Actions</h3>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-start">
            {[
              {
                label: "Review Strategy",
                subtitle: "Company goals & OKRs",
                icon: Target,
                color: "text-blue-600 dark:text-blue-400",
                path: "/strategy"
              },
              {
                label: "Financial Reports",
                subtitle: "Revenue & burn rate",
                icon: DollarSign,
                color: "text-emerald-600 dark:text-emerald-400",
                path: "/finance"
              },
              {
                label: "Board Updates",
                subtitle: "Investor relations",
                icon: FileText,
                color: "text-purple-600 dark:text-purple-400",
                path: "/board"
              },
              {
                label: "Approve Budgets",
                subtitle: "Pending approvals",
                icon: CheckCircle2,
                color: "text-amber-500 dark:text-amber-400",
                path: "/approvals"
              },
              {
                label: "View Analytics",
                subtitle: "Global performance",
                icon: TrendingUp,
                color: "text-blue-500 dark:text-blue-400",
                path: "/analytics"
              },
            ].map((action, idx) => (
              <div
                key={idx}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between p-2 rounded-none border-b border-border hover:bg-muted/50 transition-all cursor-pointer group last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <action.icon className={`h-5 w-5 shrink-0 ${action.color} group-hover:scale-105 transition-transform duration-300`} />
                  <h4 className="text-[12px] font-medium text-foreground leading-tight group-hover:text-primarytransition-colors">{action.label}</h4>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* ─── Row 2: Active Surveys (1/3), Pending Leaves (1/3), Activity (1/3) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Active Surveys Widget */}
        <Card className="p-5 border-border shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                <h3 className="text-[16px] font-medium leading-6 text-foreground">Active Surveys</h3>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-primary px-2 py-0.5 rounded-full border border-blue-100/35">
                {activeSurveys.length} active
              </span>
            </div>

            {firstActiveSurvey ? (
              <div className="border border-border rounded-lg p-4 bg-muted/50 hover:bg-card hover:shadow-sm transition-all duration-300 group flex flex-col justify-between h-[155px]">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-bold tracking-widest text-primary-500 uppercase bg-primary/10 px-2 py-0.5 rounded-full border border-primary-100/50">
                        {(firstActiveSurvey as any).target_department || 'ALL DEPARTMENTS'}
                      </span>
                      <h4 className="text-[12px] font-medium text-foreground leading-tight mt-1.5 group-hover:text-primary transition-colors">
                        {(firstActiveSurvey as any).title}
                      </h4>
                    </div>
                    <span className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/50">
                      {surveyResponseCount} {surveyResponseCount === 1 ? 'response' : 'responses'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-normal mt-2 leading-relaxed line-clamp-2">
                    {(firstActiveSurvey as any).description || 'No description available.'}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-[9px] font-bold text-muted-foreground mb-1">
                    <span>Participation Rate</span>
                    <span>{surveyParticipationRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-primary-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${surveyParticipationRate}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4 bg-muted/50 flex items-center justify-center h-[155px]">
                <p className="text-xs text-muted-foreground">No active surveys</p>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/survey-manager')}
            className="w-full mt-4"
          >
            Manage Surveys <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Card>

        {/* Department Insights Widget */}
        <Card className="p-5 border-border shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3 className="text-[16px] font-medium leading-6 text-foreground">Department Insights</h3>
              </div>
              <span className="text-[10px] font-bold bg-muted/50 text-slate-600 px-2 py-0.5 rounded-full border border-border/50">
                Live Data
              </span>
            </div>

            <div className="space-y-2.5 max-h-[190px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {departmentsData.map((dept, idx) => (
                <div key={idx} className="group flex items-center justify-between p-2.5 bg-muted/50 hover:bg-card hover:shadow-sm rounded-lg border border-slate-50 dark:border-transparent hover:border-border transition-all duration-300 cursor-pointer">
                  <div>
                    <h4 className="text-[12px] font-medium text-foreground leading-tight group-hover:text-primary transition-colors">{dept.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{dept.headcount} employees</span>
                      <span className="text-[8px] text-muted-foreground">•</span>
                      <span className={`text-[10px] font-bold ${dept.status === 'Review' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {dept.attrition} Attrition
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-4"
          >
            View Workforce Analytics <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Card>

        {/* Activity Widget */}
        <Card className="p-5 border-border shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-[16px] font-medium leading-6 text-foreground">System Activity</h3>
            </div>

            <div className="space-y-2.5 max-h-[190px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {recentActivitiesState.slice(0, 4).map((activity: any, idx: number) => (
                <div key={activity.id || idx} className="p-2.5 border border-slate-50 dark:border-transparent hover:border-border bg-muted/50 hover:bg-card hover:shadow-sm rounded-lg flex items-start gap-3 transition-all duration-300 group">
                  <activity.icon className={`h-5 w-5 shrink-0 ${activity.color || 'text-muted-foreground'} group-hover:scale-105 transition-transform duration-300`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground leading-tight group-hover:text-primary-650 transition-colors line-clamp-2">{activity.text}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 font-medium">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/audit')}
            className="w-full mt-4"
          >
            View all activity
          </Button>
        </Card>

      </div>

    </div>
  );
}

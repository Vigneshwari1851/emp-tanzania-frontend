import React, { useState, useEffect, useCallback } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Users, UserPlus, FileText, CheckCircle2, Clock,
  Star, BarChart3, Upload, Ticket, Award,
  CalendarCheck, AlertTriangle, DollarSign,
  TrendingUp, Loader2, Plus, Trash2, Check, ChevronDown,
  LogIn, LogOut, PartyPopper, Cake, Gift, Briefcase, Send
} from 'lucide-react';
import { checkIn, checkOut, getMyAttendanceLogs, getAttendanceStats, getTeamAttendanceLogs } from '@/features/attendance/services/attendance';
import { sendWish } from '../services/wishService';
import { submitFeedback } from '../services/feedbackService';
import { toast } from 'sonner';
import celebrationBg from '@/assets/dashboard/celebration.png';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { useAuth } from '@/shared/context/AuthContext';
import { useCurrency } from '@/shared/hooks/useCurrency';
import axiosInstance from '@/shared/services/axiosInstance';
import { getEmployees } from '@/features/employees/services/employees';
import { getPendingRequests } from '@/features/leaves/services/leaves';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import { useHRDashboardRealtime } from '../hooks/useHRDashboardRealtime';

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

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
  return "🌙";
};

const quickActions = [
  { label: "Add new employee", icon: UserPlus, color: "text-primary-500 bg-primary/10", path: "/employee-management" },
  { label: "Process leave", icon: CalendarCheck, color: "text-emerald-500 bg-emerald-50", path: "/leave-management/requests" },
  { label: "Issue letter", icon: Award, color: "text-amber-500 bg-amber-50", path: "/letters" },
  { label: "Mark attendance", icon: Clock, color: "text-rose-500 bg-rose-50", path: "/time-attendance" },
  { label: "Upload document", icon: Upload, color: "text-sky-500 bg-sky-50", path: "/documents" },
  { label: "Raise ticket", icon: Ticket, color: "text-purple-500 bg-purple-50", path: "/support" },
];

export function HRManagerDashboard() {
  const navigate = useOrgNavigate();
  const [showQuickActions, setShowQuickActions] = useState(true);
  const { user } = useAuth();
  const { currencySymbol, formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [celebrationsList, setCelebrationsList] = useState<any[]>([]);
  const [onboardingCandidates, setOnboardingCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);

  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  // Auto-play celebrations carousel
  useEffect(() => {
    if (celebrationsList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCelebrationIndex((prev) => (prev + 1) % celebrationsList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [celebrationsList.length]);

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

  const handleSendWish = async (employeeId: number, name: string, type: string) => {
    try {
      const wishType = type.toUpperCase().includes("ANNIVERSARY") || type.toUpperCase().includes("WORK") ? 'anniversary' : 'birthday';
      await sendWish(employeeId, wishType);
      toast.success(`${wishType === 'birthday' ? 'Birthday' : 'Anniversary'} wish sent to ${name}! 🎉`);
    } catch {
      toast.error('Failed to send wish. Please try again.');
    }
  };

  useEffect(() => {
    getMyAttendanceLogs()
      .then(res => {
        setAttendanceLogs(res.data || []);
      })
      .catch(err => console.error("Failed to load attendance logs", err));
  }, []);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    let dotColor = "bg-primary";
    if (newTaskPriority === 'High') dotColor = "bg-rose-500";
    if (newTaskPriority === 'Low') dotColor = "bg-slate-400";
    
    setTasks([{ id: Date.now(), dot: dotColor, text: newTask, meta: `${newTaskPriority} Priority`, completed: false }, ...tasks]);
    setNewTask('');
    setNewTaskPriority('Medium');
  };

  const fetchCelebrations = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/employees/celebrations');
      setCelebrationsList(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch celebrations", err);
      setCelebrationsList([]);
    }
  }, []);

  const fetchAllStats = useCallback(async () => {
    const [emps, leaves, stats, logs, claims, candidatesRaw, jobsRaw] = await Promise.all([
      getEmployees().catch(() => [] as any[]),
      getPendingRequests().then(r => r.data || r || []).catch(() => []),
      getAttendanceStats().then(r => r.data || r).catch(() => null),
      getTeamAttendanceLogs({}).then(r => r.data || r || []).catch(() => []),
      axiosInstance.get('/payroll/my-claims').then(r => r.data.data || []).catch(() => []),
      axiosInstance.get('/recruitment/candidates').then(res => res.data.success ? res.data.data : []).catch(() => []),
      axiosInstance.get('/recruitment/jobs').then(res => res.data.success ? res.data.data : []).catch(() => []),
    ]);

    setEmployees(emps);
    setPendingLeaves(Array.isArray(leaves) ? leaves : []);
    setAttendanceStats(stats);
    setAttendanceLogs(Array.isArray(logs) ? logs : []);
    setExpenses(Array.isArray(claims) ? claims.slice(0, 4) : []);

    const onboarding = (candidatesRaw || [])
      .map((c: any) => {
        const app = c.applications?.[0] || {};
        return { ...c, status: app.status || 'APPLIED', application_id: app.id, bgv_case: app.bgv_case || null };
      })
      .filter((c: any) =>
        ['OFFER_ACCEPTED', 'BGV_INITIATED', 'DOCUMENTS_PENDING', 'VERIFICATION_IN_PROGRESS', 'PARTIALLY_VERIFIED', 'REVIEW_REQUIRED', 'ADVERSE_FOUND', 'BGV_IN_PROGRESS', 'BGV_CLEARED', 'BGV_FAILED', 'ONBOARDING'].includes(c.status)
      );
    setOnboardingCandidates(onboarding);
    setJobs((jobsRaw || []).filter((j: any) => j.status === 'OPEN'));
    fetchCelebrations();
  }, [fetchCelebrations]);

  const refetchPendingLeaves = useCallback(async () => {
    const leaves = await getPendingRequests().then(r => r.data || r || []).catch(() => []);
    setPendingLeaves(Array.isArray(leaves) ? leaves : []);
  }, []);

  const refetchEmployees = useCallback(async () => {
    const emps = await getEmployees().catch(() => [] as any[]);
    setEmployees(emps);
    fetchCelebrations();
  }, [fetchCelebrations]);

  const refetchAttendance = useCallback(async () => {
    const [stats, logs] = await Promise.all([
      getAttendanceStats().then(r => r.data || r).catch(() => null),
      getTeamAttendanceLogs({}).then(r => r.data || r || []).catch(() => []),
    ]);
    setAttendanceStats(stats);
    setAttendanceLogs(Array.isArray(logs) ? logs : []);
  }, []);

  const refetchOnboarding = useCallback(async () => {
    const candidatesRaw = await axiosInstance.get('/recruitment/candidates').then(res => res.data.success ? res.data.data : []).catch(() => []);
    const onboarding = (candidatesRaw || [])
      .map((c: any) => {
        const app = c.applications?.[0] || {};
        return { ...c, status: app.status || 'APPLIED', application_id: app.id, bgv_case: app.bgv_case || null };
      })
      .filter((c: any) =>
        ['OFFER_ACCEPTED', 'BGV_INITIATED', 'DOCUMENTS_PENDING', 'VERIFICATION_IN_PROGRESS', 'PARTIALLY_VERIFIED', 'REVIEW_REQUIRED', 'ADVERSE_FOUND', 'BGV_IN_PROGRESS', 'BGV_CLEARED', 'BGV_FAILED', 'ONBOARDING'].includes(c.status)
      );
    setOnboardingCandidates(onboarding);
  }, []);

  const refetchRecruitment = useCallback(async () => {
    const jobsRaw = await axiosInstance.get('/recruitment/jobs').then(res => res.data.success ? res.data.data : []).catch(() => []);
    setJobs((jobsRaw || []).filter((j: any) => j.status === 'OPEN'));
  }, []);

  const refetchExpenses = useCallback(async () => {
    const claims = await axiosInstance.get('/payroll/my-claims').then(r => r.data.data || []).catch(() => []);
    setExpenses(Array.isArray(claims) ? claims.slice(0, 4) : []);
  }, []);

  const pollCallbacks = React.useMemo(() => [
    refetchEmployees,
    refetchAttendance,
    refetchOnboarding,
    refetchRecruitment,
    refetchExpenses,
  ], [refetchEmployees, refetchAttendance, refetchOnboarding, refetchRecruitment, refetchExpenses]);

  useHRDashboardRealtime({ onLeaveEvent: refetchPendingLeaves, pollCallbacks });

  useEffect(() => {
    let cancelled = false;
    fetchAllStats().finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
    };
  }, [fetchAllStats]);

  const teamHeadcount = employees.length;
  const presentToday = attendanceStats?.presentToday ?? attendanceStats?.present_count ?? 0;
  const totalToday = attendanceStats?.totalEmployees ?? attendanceStats?.total_count ?? teamHeadcount;
  const attendancePct = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;
  const pendingCount = pendingLeaves.length;

  const leaveList = pendingLeaves.slice(0, 4).map((l: any) => ({
    name: `${l.user?.details?.first_name || ''} ${l.user?.details?.last_name || ''}`.trim() || l.user?.username || 'Employee',
    dept: l.user?.details?.department?.department_name || '',
    initials: ((l.user?.details?.first_name?.[0] || '') + (l.user?.details?.last_name?.[0] || '')).toUpperCase() || 'EM',
    avatarColor: 'bg-primary-100 text-primary',
    type: l.leave_type?.name || l.leaveType || 'Leave',
    typeColor: 'bg-blue-50 text-blue-600',
    dates: l.start_date ? `${new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '',
    days: l.days || l.total_days || 1,
    id: l.id,
  }));

  const attDayMap: Record<string, number> = {};
  attendanceLogs.forEach((log: any) => {
    const d = new Date(log.date || log.created_at);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    attDayMap[dayName] = (attDayMap[dayName] || 0) + 1;
  });
  const maxAtt = Math.max(...Object.values(attDayMap), 1);

  const expenseList = expenses.map((e: any) => ({
    name: e.user?.details?.first_name || e.employee_name || 'Employee',
    category: e.category || e.expense_type || 'General',
    amount: formatCurrency(Number(e.amount || 0)),
    review: (e.status || '').toLowerCase() === 'pending_review',
  }));

  const currentCelebration = celebrationsList[currentCelebrationIndex] || celebrationsList[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              {employees.filter((e: any) => {
                const sd = e.details?.start_date;
                return sd && new Date(sd) > new Date(Date.now() - 90 * 86400000);
              }).length} joined <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div className="my-1">
            <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{teamHeadcount}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Team headcount
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">Active employees</span>
          </div>
        </div>
        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              {pendingCount} pending <AlertTriangle className="w-3 h-3" />
            </span>
          </div>
          <div className="my-1">
            <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{pendingCount}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Pending approvals
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">Leaves & expenses</span>
          </div>
        </div>
        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <CalendarCheck className="w-5 h-5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              {presentToday} present <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>
          <div className="my-1">
            <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{attendancePct}%</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Attendance today
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">Out of {totalToday}</span>
          </div>
        </div>
        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Star className="w-5 h-5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              Q2 cycle <Clock className="w-3 h-3" />
            </span>
          </div>
          <div className="my-1">
            <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">-</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Reviews pending
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">Due this cycle</span>
          </div>
        </div>
      </div>

      <div>
        <div 
          className="flex items-center justify-between mb-3 cursor-pointer group"
          onClick={() => setShowQuickActions(!showQuickActions)}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-hover:text-foreground transition-colors">
            <span className="w-4 h-0.5 rounded-full bg-gradient-to-r from-primary-500 to-purple-500" /> Quick actions
          </p>
        </div>
        
        {showQuickActions && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 transition-all duration-300 origin-top animate-in slide-in-from-top-2 fade-in-50">
            {quickActions.map((a, i) => (
              <div
                key={i}
                onClick={() => navigate(a.path)}
                className="bg-card rounded-lg border border-border/70 shadow-sm p-5 flex flex-col items-center gap-2.5 hover:border-primary-200 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.color} dark:bg-transparent shadow-sm group-hover:shadow-sm transition-all group-hover:scale-110`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-slate-600 text-center leading-tight font-medium">{a.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Leave requests — requires action</h3>
            <span className="text-[11px] font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline transition-colors">
              View all {pendingCount > 0 ? pendingCount : ''}
            </span>
          </div>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {leaveList.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold ${r.avatarColor}`}>{r.initials}</div>
                      <div>
                        <p className="text-[12px] font-medium text-foreground">{r.name}</p>
                        <p className="text-[9px] text-muted-foreground">{r.dept}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.typeColor}`}>{r.type}</span>
                  </TableCell>
                  <TableCell className="text-[12px] text-slate-600">{r.dates}</TableCell>
                  <TableCell className="text-[12px] text-slate-600">{r.days}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <button className="px-2 py-1 text-[9px] font-medium bg-emerald-50 text-emerald-700 rounded-sm border border-emerald-200 hover:bg-emerald-100 transition-colors">Approve</button>
                      <button className="px-2 py-1 text-[9px] font-medium bg-rose-50 text-rose-700 rounded-sm border border-rose-200 hover:bg-rose-100 transition-colors">Reject</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Attendance this week</h3>
          </div>
          <div className="flex-1 min-h-[160px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daysOfWeek.map(day => ({ day, count: attDayMap[day] || 0 }))} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(v: any) => [v, 'Present']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 11 }}
                />
                <Line
                  type="monotone" dataKey="count"
                  stroke="#10b981" strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Onboarding Status</h3>
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">
                {onboardingCandidates.length} in progress
              </span>
            </div>
            {onboardingCandidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-[11px]">No active onboarding checklists</div>
            ) : (
              <div className="space-y-3 min-h-[88px] flex flex-col justify-center">
                {onboardingCandidates.slice(0, 2).map((candidate, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{candidate.first_name} {candidate.last_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{candidate.email}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase ml-2 flex-shrink-0">
                      {candidate.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/onboarding')}
            className="w-full mt-4 py-2 bg-muted/50 text-slate-600 font-medium rounded-lg border border-border text-[11px] hover:bg-muted transition-colors"
          >
            View All Checklists
          </button>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Recruitment Pipeline</h3>
              <span 
                onClick={() => navigate('/recruitment/jobs')}
                className="text-[11px] font-medium text-primary hover:text-primary cursor-pointer transition-colors"
              >
                Open roles ({jobs.length})
              </span>
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-[11px]">No active recruitment data</div>
            ) : (
              <div className="space-y-3 min-h-[88px] flex flex-col justify-center">
                {jobs.slice(0, 2).map((job, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {job.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{job.department} • {job.location}</p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {job._count?.applications ?? job.applications?.length ?? 0} apps
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/recruitment/add-candidate')}
            className="w-full mt-4 py-2 bg-muted/50 text-slate-600 font-medium rounded-lg border border-border text-[11px] hover:bg-muted transition-colors"
          >
            Add New Candidate
          </button>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Expense approvals pending</h3>
            <span className="text-[11px] font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline transition-colors">View all</span>
          </div>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
              {expenseList.map((e: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-[12px] font-medium text-foreground">{e.name}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{e.category}</TableCell>
                  <TableCell className="text-[12px] text-foreground text-right font-medium">{e.amount}</TableCell>
                  <TableCell className="text-right">
                    <button className={`px-2 py-1 text-[9px] font-medium rounded-sm border transition-colors ${e.review ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                      {e.review ? 'Review' : 'Approve'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between relative overflow-hidden min-h-[345px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">
                {currentCelebration ? (
                  <>
                    <PartyPopper className="w-4 h-4 text-pink-500" /> Celebrations & Milestones
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-pink-500" /> Share Feedback
                  </>
                )}
              </h3>
              {currentCelebration && <span className="text-[11px] font-medium text-primary hover:text-primary cursor-pointer transition-colors">View calendar</span>}
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
                  <button
                    onClick={() => handleSendWish(currentCelebration.employeeId, currentCelebration.name, currentCelebration.label)}
                    className="mt-3 px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-650 hover:to-rose-650 active:scale-95 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1 shadow-md shadow-pink-900/40"
                  >
                    <Gift className="w-3 h-3" />
                    Send Wish
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendQuickFeedback} className="flex flex-col justify-between h-[270px]">
                <div className="flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {['General', 'Workplace', 'Culture', 'Management'].map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="relative flex-1">
                    <textarea
                      value={quickFeedbackText}
                      onChange={(e) => setQuickFeedbackText(e.target.value)}
                      placeholder="Share your thoughts, suggestions, or ideas..."
                      className="w-full h-full min-h-[145px] p-3 bg-muted/20 hover:bg-muted/30 focus:bg-card border border-input rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary focus:border-primary resize-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingFeedback || !quickFeedbackText.trim()}
                    className="w-full h-[36px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-sm text-[13px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingFeedback ? 'Submitting...' : 'Send Feedback'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

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
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col max-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">My task list — today</h3>
          </div>
          <form onSubmit={addTask} className="mb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1 text-[12px] px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-0"
              />
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                  className="w-24 text-[11px] px-2 py-2 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-between text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${newTaskPriority === 'High' ? 'bg-rose-500' : newTaskPriority === 'Low' ? 'bg-slate-400' : 'bg-primary-500'}`}></span>
                    {newTaskPriority}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
                {isPriorityOpen && (
                  <div className="absolute top-full right-0 mt-1 w-28 bg-card border border-border shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] rounded-lg py-1.5 z-50 overflow-hidden">
                    {['High', 'Medium', 'Low'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setNewTaskPriority(p); setIsPriorityOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-slate-600 hover:bg-muted/50 flex items-center gap-2 transition-colors"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p === 'High' ? 'bg-rose-500' : p === 'Low' ? 'bg-slate-400' : 'bg-primary-500'}`}></span>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={!newTask.trim()} className="w-8 h-8 flex-shrink-0 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary-100 disabled:opacity-50 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
          <div className="space-y-0 flex-1 overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-[11px]">All caught up! 🎉</div>
            ) : (
              tasks.map((t) => (
               <div key={t.id} className="group flex items-center gap-3 py-2.5 border-b border-border/70 last:border-0 hover:bg-muted/50/40 transition-colors">
                 <button onClick={() => toggleTask(t.id)} className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${t.completed ? 'bg-emerald-500 text-white border-emerald-500' : 'border border-slate-300 hover:border-primary-500'}`}>
                   {t.completed && <Check className="w-3 h-3" />}
                 </button>
                 <div className="flex-1 min-w-0">
                   <p className={`text-[12px] truncate transition-colors ${t.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{t.text}</p>
                   <p className="text-[10px] text-muted-foreground mt-0.5">{t.meta}</p>
                 </div>
                 <button onClick={() => deleteTask(t.id)} className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                   <Trash2 className="w-3.5 h-3.5" />
                 </button>
               </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

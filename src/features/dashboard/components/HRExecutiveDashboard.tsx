import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Users, UserPlus, FileText, CheckCircle2, Clock, Zap,
  ChevronRight, Upload, Ticket, Award, CalendarCheck,
  AlertTriangle, TrendingUp, Loader2, Plus, Trash2, Check, ChevronDown, ChevronUp,
  LogIn, LogOut, Cake, Gift, PartyPopper
} from 'lucide-react';
import axiosInstance from '@/shared/services/axiosInstance';
import { getEmployees } from '@/features/employees/services/employees';
import { getPendingRequests, getLeaveStatistics } from '@/features/leaves/services/leaves';
import { getDocuments } from '@/features/documents/services/documents';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/shared/context/AuthContext';
import { checkIn, checkOut, getMyAttendanceLogs } from '@/features/attendance/services/attendance';
import Select from "@/shared/components/ui/Select";
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import { useHRDashboardRealtime } from '../hooks/useHRDashboardRealtime';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import celebrationBg from '@/assets/dashboard/celebration.png';
import { sendWish } from '../services/wishService';

const quickActions = [
  { label: "Add new employee", icon: UserPlus, color: "text-primary-500 bg-primary/10", path: "/employee-management" },
  { label: "Process leave", icon: CalendarCheck, color: "text-emerald-500 bg-emerald-50", path: "/leave-management/requests" },
  { label: "Issue letter", icon: Award, color: "text-amber-500 bg-amber-50", path: "/letters" },
  { label: "Mark attendance", icon: Clock, color: "text-rose-500 bg-rose-50", path: "/time-attendance" },
  { label: "Upload document", icon: Upload, color: "text-sky-500 bg-sky-50", path: "/documents" },
  { label: "Raise ticket", icon: Ticket, color: "text-purple-500 bg-purple-50", path: "/support" },
];

const letterGenItems = [
  { label: "Offer letters (June)", value: "14 issued", urgent: false },
  { label: "Experience letters", value: "3 pending", urgent: true },
  { label: "Relieving letters", value: "2 pending", urgent: true },
  { label: "Salary certificates", value: "8 issued", urgent: false },
  { label: "Appointment letters", value: "6 issued", urgent: false },
];

const taskList = [
  { dot: "bg-primary", text: "Verify Karthik Menon's educational docs", meta: "Due today · High" },
  { dot: "bg-rose-600", text: "Process payslip for Vikram K. — ticket overdue", meta: "Due today · Urgent" },
  { dot: "bg-amber-600", text: "Update address for Pooja I. in HRMS", meta: "Due tomorrow" },
  { dot: "bg-emerald-600", text: "Issue relieving letter — Sanjay Pillai", meta: "Jun 16" },
  { dot: "bg-slate-400", text: "PF filing checklist — June cycle", meta: "Jun 25 deadline" },
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
  return "🌙";
};

export function HRExecutiveDashboard() {
  const navigate = useOrgNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [leaveStats, setLeaveStats] = useState<any>(null);
  const [tasks, setTasks] = useState(taskList.map((t, i) => ({ ...t, id: i, completed: false })));
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [exitRequests, setExitRequests] = useState<any[]>([]);
  const [interviewCandidates, setInterviewCandidates] = useState<any[]>([]);
  const [lmsStats, setLmsStats] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [celebrations, setCelebrations] = useState<any[]>([]);
  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);

  useEffect(() => {
    if (celebrations.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCelebrationIndex((prev) => (prev + 1) % celebrations.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [celebrations.length]);

  const currentCelebration = celebrations[currentCelebrationIndex] || celebrations[0];

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

  const handleSendWish = async (employeeId: number, name: string, type: string) => {
    if (employeeId === -1) return;
    try {
      const wishType = type.toUpperCase().includes("ANNIVERSARY") || type.toUpperCase().includes("WORK") ? 'anniversary' : 'birthday';
      await sendWish(employeeId, wishType);
      toast.success(`${wishType === 'birthday' ? 'Birthday' : 'Anniversary'} wish sent to ${name}!`);
    } catch {
      toast.error('Failed to send wish. Please try again.');
    }
  };

  const computeCelebrations = useCallback((emps: any[]) => {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const list: any[] = [];

    emps.forEach((emp) => {
      const details = emp.details;
      if (!details) return;
      const name = `${details.first_name || ''} ${details.last_name || ''}`.trim() || emp.username;
      const initial = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

      if (details.date_of_birth) {
        const dob = new Date(details.date_of_birth);
        let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < todayDate) next.setFullYear(today.getFullYear() + 1);
        const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 3) {
          list.push({
            id: `dob-${emp.id}`,
            employeeId: emp.id,
            name,
            type: 'Birthday',
            date: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dateText: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            icon: 'cake',
            avatar: getProfilePictureUrl(details.profile_picture),
            initial,
          });
        }
      }

      if (details.start_date) {
        const start = new Date(details.start_date);
        let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
        if (next < todayDate) next.setFullYear(today.getFullYear() + 1);
        const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const years = today.getFullYear() - start.getFullYear();
        if (diff >= 0 && diff <= 3) {
          list.push({
            id: `anniv-${emp.id}`,
            employeeId: emp.id,
            name,
            type: 'Work Anniversary',
            date: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dateText: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            icon: 'heart',
            avatar: getProfilePictureUrl(details.profile_picture),
            initial,
          });
        }
      }
    });

    list.sort((a, b) => {
      if (a.date === 'Today') return -1;
      if (b.date === 'Today') return 1;
      if (a.date === 'Tomorrow') return -1;
      if (b.date === 'Tomorrow') return 1;
      return 0;
    });

    setCelebrations(list);
  }, []);

  const fetchExitRequests = useCallback(async () => {
    const res = await axiosInstance.get('/exit/all-requests').then(r => r.data?.data || []).catch(() => []);
    setExitRequests(Array.isArray(res) ? res : []);
  }, []);

  const fetchInterviews = useCallback(async () => {
    const res = await axiosInstance.get('/recruitment/applications', { params: { status: 'INTERVIEW_SCHEDULED', limit: 50 } }).then(r => r.data?.applications || []).catch(() => []);
    setInterviewCandidates(Array.isArray(res) ? res : []);
  }, []);

  const fetchLmsStats = useCallback(async () => {
    const res = await axiosInstance.get('/lms/admin/stats').then(r => r.data?.data || null).catch(() => null);
    setLmsStats(res);
  }, []);

  const fetchDocuments = useCallback(async () => {
    const res = await getDocuments().catch(() => []);
    setDocuments(Array.isArray(res) ? res : []);
  }, []);

  const fetchAllStats = useCallback(async () => {
    const [emps, leaves, stats, exitRes, appsRes, lmsRes, docs] = await Promise.all([
      getEmployees().catch(() => [] as any[]),
      getPendingRequests().then(r => r.data || r || []).catch(() => []),
      getLeaveStatistics().then(r => r.data || r || null).catch(() => null),
      axiosInstance.get('/exit/all-requests').then(r => r.data?.data || []).catch(() => []),
      axiosInstance.get('/recruitment/applications', { params: { status: 'INTERVIEW_SCHEDULED', limit: 50 } }).then(r => r.data?.applications || []).catch(() => []),
      axiosInstance.get('/lms/admin/stats').then(r => r.data?.data || null).catch(() => null),
      getDocuments().catch(() => []),
    ]);
    setEmployees(emps);
    setPendingLeaves(Array.isArray(leaves) ? leaves : []);
    setLeaveStats(stats);
    setExitRequests(Array.isArray(exitRes) ? exitRes : []);
    setInterviewCandidates(Array.isArray(appsRes) ? appsRes : []);
    setLmsStats(lmsRes);
    setDocuments(Array.isArray(docs) ? docs : []);
    computeCelebrations(emps);
  }, []);

  const refetchPendingLeaves = useCallback(async () => {
    const leaves = await getPendingRequests().then(r => r.data || r || []).catch(() => []);
    setPendingLeaves(Array.isArray(leaves) ? leaves : []);
  }, []);

  const refetchEmployees = useCallback(async () => {
    const emps = await getEmployees().catch(() => [] as any[]);
    setEmployees(emps);
    computeCelebrations(emps);
  }, [computeCelebrations]);

  const pollCallbacks = useMemo(() => [
    refetchEmployees,
    fetchExitRequests,
    fetchInterviews,
    fetchLmsStats,
    fetchDocuments,
  ], [refetchEmployees, fetchExitRequests, fetchInterviews, fetchLmsStats, fetchDocuments]);

  useHRDashboardRealtime({ onLeaveEvent: refetchPendingLeaves, pollCallbacks });

  useEffect(() => {
    let cancelled = false;
    fetchAllStats().finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
    };
  }, [fetchAllStats]);

  const leaveToday = pendingLeaves.length;
  const newJoiners = employees.filter((e: any) => {
    const sd = e.details?.start_date;
    const oneWeekAgo = Date.now() - 7 * 86400000;
    return sd && new Date(sd).getTime() > oneWeekAgo;
  });

  const employeeList = employees.slice(0, 5).map((e: any) => ({
    name: `${e.details?.first_name || ''} ${e.details?.last_name || ''}`.trim() || e.username || 'Employee',
    id: e.details?.employee_id || `EMP-${e.id}`,
    dept: e.details?.department?.department_name || '',
    status: e.status === false || e.status === 'inactive' ? 'Inactive' : 'Active',
    statusColor: e.status === false || e.status === 'inactive' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
    initials: ((e.details?.first_name?.[0] || '') + (e.details?.last_name?.[0] || '')).toUpperCase() || 'EM',
    avatarColor: 'bg-primary-100 text-primary',
  }));

  const leaveTypeData = leaveStats ? (() => {
    const stats = leaveStats.byType || leaveStats;
    const entries = Object.entries(stats).filter(([k, v]) => typeof v === 'number' && v > 0);
    const total = entries.reduce((s, [, v]) => s + (v as number), 0) || 100;
    return entries.map(([k, v], i) => ({
      label: k, value: v as number, pct: Math.round(((v as number) / total) * 100),
      colors: ['#4338ca', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'],
    })).map((d, i) => ({ ...d, color: d.colors[i] }));
  })() : null;

  const leaveTypeLegend = leaveTypeData?.length
    ? leaveTypeData
    : [
        { label: 'Sick', value: 34, color: '#4338ca' },
        { label: 'Annual', value: 28, color: '#0891b2' },
        { label: 'Casual', value: 18, color: '#059669' },
        { label: 'LOP', value: 12, color: '#d97706' },
        { label: 'Emergency', value: 8, color: '#dc2626' },
      ];

  const leaveTypeTotal = leaveTypeLegend.reduce((s, d) => s + d.value, 0);
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const supportTickets = [
    { issue: "Payslip not generated", employee: "Vikram K.", priority: "High", priorityColor: "bg-rose-50 text-rose-700", status: "Open", statusColor: "bg-amber-50 text-amber-700" },
    { issue: "Address update", employee: "Pooja I.", priority: "Medium", priorityColor: "bg-amber-50 text-amber-700", status: "Open", statusColor: "bg-amber-50 text-amber-700" },
  ];
  const attPct = Math.round((employees.filter((e: any) => e.status !== false).length / Math.max(employees.length, 1)) * 100);

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
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              {leaveToday} pending <Clock className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{leaveToday}</p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Leave requests today</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-amber-600 flex items-center gap-0.5">
              {newJoiners.length} this week <AlertTriangle className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{newJoiners.length}</p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">New joiners</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Ticket className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              Active <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{supportTickets.filter(t => t.status === 'Open').length}</p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Open support tickets</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              Docs <Clock className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{employees.filter((e: any) => !e.details?.documents || !e.details?.certifications).length}</p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Documents to verify</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Employee directory</h3>
            <span className="text-[11px] font-medium text-primary hover:text-primary cursor-pointer transition-colors">Search all {employees.length}</span>
          </div>
          {employeeList.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-6">No employees found</p>
          ) : (
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {employeeList.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold ${e.avatarColor}`}>{e.initials}</div>
                        <div>
                          <p className="text-[12px] font-medium text-foreground">{e.name}</p>
                          <p className="text-[9px] text-muted-foreground">{e.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-slate-600">{e.dept || '—'}</TableCell>
                    <TableCell><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.statusColor}`}>{e.status}</span></TableCell>
                    <TableCell className="text-right">
                      <button className="px-2.5 py-1 text-[9px] font-medium bg-blue-50 text-blue-700 rounded-sm border border-blue-200 hover:bg-blue-100 transition-colors">View</button>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Today's Interviews</h3>
            <span className="text-[11px] font-medium text-primary hover:text-primary cursor-pointer transition-colors">Schedule new</span>
          </div>
          <div className="space-y-0 mt-2">
            {interviewCandidates.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-6">No interviews scheduled for today</p>
            ) : interviewCandidates.slice(0, 4).map((app: any, i: number) => {
              const name = `${app.candidate?.first_name || ''} ${app.candidate?.last_name || ''}`.trim() || 'Candidate';
              const role = app.job?.title || 'Position';
              const type = app.status === 'INTERVIEW_SCHEDULED' ? 'Tech Round' : app.status;
              const colorMap: Record<string, string> = {
                INTERVIEW_SCHEDULED: 'bg-emerald-500',
                INTERVIEW_COMPLETED: 'bg-primary-500',
              };
              return (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/70 last:border-0 hover:bg-muted/50/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${colorMap[app.status] || 'bg-amber-500'}`}></div>
                    <div>
                      <p className="text-[12px] font-medium text-foreground">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{role} · {type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-foreground">
                      {app.applied_at ? new Date(app.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                    </p>
                    <button className="text-[9px] text-primary font-medium hover:underline mt-0.5">View</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Offboarding & Exits</h3>
            <span className="text-[11px] font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline transition-colors">View all</span>
          </div>
          <div className="space-y-0 mt-2">
            {exitRequests.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-6">No active exits</p>
            ) : exitRequests.slice(0, 6).map((exit: any, i: number) => {
              const name = `${exit.user?.details?.first_name || ''} ${exit.user?.details?.last_name || ''}`.trim() || 'Employee';
              const role = exit.user?.details?.department?.department_name || exit.exit_type || 'Exiting';
              const lwd = exit.last_working_day ? new Date(exit.last_working_day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
              const statusMap: Record<string, { label: string; color: string }> = {
                PENDING_ACCEPTANCE: { label: 'Pending Acceptance', color: 'bg-amber-50 text-amber-700' },
                IN_PROGRESS: { label: 'In Progress', color: 'bg-primary/10 text-primary' },
                CLEARANCE_PENDING: { label: 'Clearance', color: 'bg-primary/10 text-primary' },
                COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700' },
                CANCELLED: { label: 'Cancelled', color: 'bg-muted text-slate-600' },
              };
              const map = statusMap[exit.status] || { label: exit.status?.replace(/_/g, ' ') || 'Unknown', color: 'bg-muted text-slate-600' };
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/70 last:border-0 hover:bg-muted/50/40 transition-colors">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{name}</p>
                    <p className="text-[10px] text-muted-foreground">LWD: {lwd}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${map.color}`}>
                    {map.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Training & Compliance</h3>
          </div>
          <div className="space-y-4 mt-4">
            {[
              { label: "Total Courses", val: lmsStats?.totalCourses || 0, total: Math.max(lmsStats?.totalCourses || 1, 1), color: "bg-emerald-500", pct: 100 },
              { label: "Enrollments", val: lmsStats?.totalEnrollments || 0, total: Math.max(lmsStats?.totalEnrollments || 1, 1), color: "bg-primary-500", pct: 100 },
            ].map((tr, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium text-foreground">{tr.label}</span>
                  <span className="font-bold text-foreground">{tr.val}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${tr.color}`} style={{ width: `${tr.pct}%` }}></div>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border/70">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-medium text-foreground">Completion Rate</span>
                <span className="font-bold text-foreground">{lmsStats?.completionRate || 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${lmsStats?.completionRate || 0}%` }}></div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">{lmsStats?.activeUsers || 0} active learners this month</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Document Alerts</h3>
            <span className="text-[11px] font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline transition-colors">View all</span>
          </div>
          <div className="space-y-0 mt-2">
            {documents.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-6">No documents found</p>
            ) : documents.slice(0, 5).map((doc: any, i: number) => {
              const isRecent = doc.isNew || doc.isUpdated;
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/70 last:border-0 hover:bg-muted/50/40 transition-colors">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{doc.title || doc.name || 'Document'}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.category || doc.type || 'General'}{doc.uploader ? ` · ${doc.uploader.full_name || ''}` : ''}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${isRecent ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {isRecent ? 'New' : 'Updated'}
                  </span>
                </div>
              );
            })}
          </div>
          {documents.length > 0 && (
            <button className="w-full mt-3 py-2 bg-muted/50 text-slate-600 font-medium rounded-lg border border-border text-[11px] hover:bg-muted transition-colors">
              Send Reminders
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between relative overflow-hidden min-h-[345px]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <PartyPopper className="h-5 w-5 text-pink-500 shrink-0" />
              <h3 className="text-[16px] font-medium leading-6 text-foreground">Celebrations & Milestones</h3>
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
                      {currentCelebration.icon === 'cake' ? (
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
                    {currentCelebration.type?.toUpperCase()}
                  </span>

                  {/* Date */}
                  <p className="text-[10px] text-pink-200/70 font-semibold mt-0.5">{currentCelebration.dateText}</p>

                  {/* Action button */}
                  <button
                    onClick={() => handleSendWish(currentCelebration.employeeId || -1, currentCelebration.name, currentCelebration.type)}
                    className="mt-3 px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-650 hover:to-rose-650 active:scale-95 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1 shadow-md shadow-pink-900/40"
                  >
                    <Gift className="w-3 h-3" />
                    Send Wish
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[275px] bg-muted/30 rounded-lg border border-dashed border-border p-4">
                <Gift className="w-8 h-8 mb-2 opacity-30 text-pink-500" />
                <p className="text-[13px] font-medium text-foreground">No upcoming celebrations</p>
                <p className="text-[11px] mt-0.5">Check back later.</p>
              </div>
            )}
          </div>

          {/* Dots navigation */}
          {celebrations.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {celebrations.map((_, idx) => {
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

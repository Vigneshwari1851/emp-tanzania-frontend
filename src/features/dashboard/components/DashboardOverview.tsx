import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  CalendarDays,
  Users,
  Zap,
  DollarSign,
  FileText,
  Clock,
  Star,
  Gift,
  Award,
  Send,
  ClipboardList,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Newspaper,
  BookOpen,
  GitMerge,
  Cake,
  PartyPopper,
  AlertTriangle,
  FileQuestion,
  Sparkles,
  MessageSquareText
} from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { sendWish } from '../services/wishService';
import { submitFeedback } from '../services/feedbackService';
import celebrationBg from '@/assets/dashboard/celebration.png';
import { applyLeave } from '@/features/leaves/services/leaves';
import { useSurveys } from '@/features/survey-builder/api/surveyApi';
import { getMyPayslips } from '@/features/payroll/services/payroll';
import { getOrganizations } from '@/features/organization/services/organizations';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';

interface AttendanceLog {
  date: string;
  check_in?: string;
  check_out?: string;
  status?: string;
}

interface DashboardOverviewProps {
  upcomingEvents: any[];
  attendanceLogs: AttendanceLog[];
  celebrations: any[];
  companyNews: any[];
  teamStats?: {
    totalEmployees: number;
    presentToday: number;
    lateToday: number;
    halfDayToday: number;
    absentToday: number;
  };
  leaveBalance?: any[];
  lmsDashboard?: any[];
  leaveRequests?: any[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  attendanceLogs,
  celebrations,
  companyNews,
  leaveBalance,
  leaveRequests
}) => {
  const navigate = useOrgNavigate();
  const { currencySymbol, formatCurrencyAbbr } = useCurrency();

  const { data: employeeSurveys = [] } = useSurveys({ listTab: 'active' });
  const activeEmployeeSurveys = employeeSurveys.filter((s: any) => s.is_active);

  const { data: myPayslips = [] } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => getMyPayslips(),
  });

  const ytdGross = (myPayslips as any[]).reduce((sum: number, p: any) => sum + (parseFloat(p.gross_amount) || 0), 0);
  const ytdVal = ytdGross > 0 ? formatCurrencyAbbr(ytdGross) : '—';

  // 1. Leave Balance calculation
  const totalRemainingLeave = leaveBalance && leaveBalance.length > 0
    ? leaveBalance.reduce((sum, item) => sum + (item.balance || 0), 0)
    : null;

  // 2. Attendance Rate calculation
  const totalAttendanceLogs = attendanceLogs.length;
  const presentAttendanceDays = attendanceLogs.filter(log => log.check_in && log.status?.toUpperCase() !== 'ABSENT').length;
  const attendanceRate = totalAttendanceLogs > 0
    ? (presentAttendanceDays / totalAttendanceLogs * 100).toFixed(1)
    : null;

  // 4. Celebrations Carousel setup
  const celebrationsList = celebrations && celebrations.length > 0 ? celebrations : [];

  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);

  useEffect(() => {
    if (celebrationsList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCelebrationIndex((prev) => (prev + 1) % celebrationsList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [celebrationsList.length]);

  const currentCelebration = celebrationsList[currentCelebrationIndex];

  const handleSendWish = async (employeeId: number, name: string, type: string) => {
    try {
      const wishType = type.toUpperCase().includes("ANNIVERSARY") || type.toUpperCase().includes("WORK") ? 'anniversary' : 'birthday';
      await sendWish(employeeId, wishType);
      toast.success(`${wishType === 'birthday' ? 'Birthday' : 'Anniversary'} wish sent to ${name}! 🎉`);
    } catch {
      toast.error('Failed to send wish. Please try again.');
    }
  };

  const [quickFeedbackText, setQuickFeedbackText] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const handleSendQuickFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFeedbackText.trim()) {
      toast.error("Please enter your feedback message before sending.");
      return;
    }
    setIsSendingFeedback(true);
    try {
      await submitFeedback(quickFeedbackText.trim());
      toast.success("Thank you for sharing your feedback!");
      setQuickFeedbackText("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send feedback. Please try again.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  // 5. Leave Form State
  const [leaveRequestData, setLeaveRequestData] = useState({
    leave_policy_id: "",
    start_date: "",
    end_date: "",
    reason: ""
  });
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [overQuotaReason, setOverQuotaReason] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [isLeaveTypeDropdownOpen, setIsLeaveTypeDropdownOpen] = useState(false);
  const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);

  const getAppliedLeaveDays = () => {
    const { start_date, end_date } = leaveRequestData;
    if (!start_date || !end_date) return 0;
    try {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
      
      let count = 0;
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat/Sun
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    } catch (e) {
      return 0;
    }
  };

  const getSelectedPolicyBalance = () => {
    if (!leaveRequestData.leave_policy_id) return null;
    const selected = leaveBalance?.find(b => (b.leave_policy_id || b.id)?.toString() === leaveRequestData.leave_policy_id.toString());
    return selected ? selected.balance : null;
  };

  const widgetAppliedDays = getAppliedLeaveDays();
  const widgetSelectedBalance = getSelectedPolicyBalance();
  const widgetIsOverQuota = widgetSelectedBalance !== null && widgetAppliedDays > widgetSelectedBalance;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leaveTypeDropdownRef.current && !leaveTypeDropdownRef.current.contains(event.target as Node)) {
        setIsLeaveTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const appliedDays = getAppliedLeaveDays();
    const selectedBalance = getSelectedPolicyBalance();
    const isOverQuota = selectedBalance !== null && appliedDays > selectedBalance;
    const extraDays = isOverQuota ? (appliedDays - selectedBalance) : 0;

    if (!leaveRequestData.leave_policy_id || !leaveRequestData.start_date || !leaveRequestData.end_date) {
      toast.error("Please fill in all leave request fields.");
      return;
    }

    if (!isOverQuota && !leaveRequestData.reason) {
      toast.error("Please fill in all leave request fields.");
      return;
    }

    if (isOverQuota && !overQuotaReason.trim()) {
      toast.error("Please provide justification for exceeding leave balance.");
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const selectedPolicy = leaveBalance?.find(b => (b.leave_policy_id || b.id)?.toString() === leaveRequestData.leave_policy_id.toString());
      await applyLeave({
        leave_policy_id: Number(leaveRequestData.leave_policy_id),
        start_date: leaveRequestData.start_date,
        end_date: leaveRequestData.end_date,
        reason: leaveRequestData.reason,
        leaveType: selectedPolicy?.policy_name || "Annual Leave",
        startDate: leaveRequestData.start_date,
        endDate: leaveRequestData.end_date,
        requestedDays: appliedDays,
        availableQuota: selectedBalance,
        isOverQuota,
        extraDaysRequested: extraDays,
        overQuotaReason: isOverQuota ? overQuotaReason : undefined
      });
      toast.success("Leave application submitted successfully!");
      setLeaveRequestData({ leave_policy_id: "", start_date: "", end_date: "", reason: "" });
      setOverQuotaReason("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit leave application");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // 6. News items setup
  const newsList = companyNews && companyNews.length > 0 ? companyNews : [];

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations(),
  });

  const publicHolidays = useMemo(() => {
    const holidays = orgs[0]?.public_holidays || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays
      .map((entry: any) => {
        let rawDateStr = '';
        let title = '';

        if (typeof entry === 'string') {
          if (entry.includes(':')) {
            const parts = entry.split(':');
            rawDateStr = parts[0].trim();
            title = parts.slice(1).join(':').trim();
          } else if (entry.includes('-') && entry.split('-').length > 3) {
            const idx = entry.indexOf('-', 10);
            rawDateStr = entry.substring(0, 10).trim();
            title = entry.substring(idx + 1).trim();
          } else {
            rawDateStr = entry.trim();
            title = 'Public Holiday';
          }
        } else if (entry && typeof entry === 'object') {
          rawDateStr = entry.date || entry.holiday_date || '';
          title = entry.name || entry.title || entry.holiday_name || 'Public Holiday';
        }

        const date = new Date(rawDateStr);
        if (isNaN(date.getTime())) return null;
        const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return diff >= 0
          ? { date, title, formattedDate, diff }
          : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.diff - b.diff)
      .slice(0, 5);
  }, [orgs]);

  const upcomingLeaves = leaveRequests && leaveRequests.length > 0
    ? leaveRequests.filter(req => {
      const status = req.status?.toUpperCase();
      return status === 'PENDING' || status === 'APPROVED';
    })
    : [];

  return (
    <div className="space-y-6">

      {/* ─── Row 1: Summary Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">
            {totalRemainingLeave !== null ? `${totalRemainingLeave}` : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Leave Balance</p>
        </div>

        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-primary" />
            {attendanceRate !== null && (
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
                On Track <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </span>
            )}
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">
            {attendanceRate !== null ? `${attendanceRate}%` : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Attendance Rate</p>
        </div>

        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              Exceeds <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            </span>
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">
            4.8 / 5.0
          </p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">Performance Rating</p>
        </div>

        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200 cursor-pointer" onClick={() => navigate('/employee/payroll')}>
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">
            {ytdGross > 0 ? `${currencySymbol}${ytdGross.toLocaleString()}` : `${currencySymbol}3,65,000`}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">YTD Earnings</p>
        </div>
      </div>

      {/* ─── Row 2: Company News, Celebrations, Quick Actions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Company News & Updates */}
        <div className="lg:col-span-2 bg-card rounded-lg p-5 border border-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Newspaper className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-[16px] font-medium leading-6 text-foreground">News & Updates</h3>
              </div>
              <button className="text-[13px] font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline">View all</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {newsList.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center h-[280px] text-center text-muted-foreground">
                  <Newspaper className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-[13px] font-medium">No company news</p>
                </div>
              ) : newsList.slice(0, 2).map((news: any, idx: number) => (
                <div
                  key={news.id || idx}
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
          </div>
        </div>

        {/* Celebrations Carousel Card */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-sm flex flex-col justify-between min-h-[345px]">
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
                      {(currentCelebration.type || currentCelebration.type_badge || '').toLowerCase().includes('birthday') ? (
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
                    {(currentCelebration.label || currentCelebration.type_badge || currentCelebration.type || '').toUpperCase()}
                  </span>

                  {/* Action button */}
                  <button
                    onClick={() => handleSendWish(currentCelebration.employeeId || -1, currentCelebration.name, currentCelebration.type_badge || currentCelebration.type)}
                    className="mt-3 px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-650 hover:to-rose-650 active:scale-95 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1 shadow-md shadow-pink-900/40"
                  >
                    <Gift className="w-3 h-3" />
                    Send Wish
                  </button>
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
            <div className="flex justify-center gap-1.5 mt-3 relative z-10">
              {celebrationsList.map((_, idx) => {
                const isActive = idx === currentCelebrationIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentCelebrationIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-pink-500 w-3' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2.5 mb-5">
            <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="text-[16px] font-medium leading-6 text-foreground">Quick Actions</h3>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-start">
            {[
              {
                label: "View Payslip",
                subtitle: "Salary & earnings statement",
                icon: FileText,
                color: "text-blue-500 dark:text-blue-400",
                path: "/employee/payroll"
              },
              {
                label: "Document Hub",
                subtitle: "View & manage documents",
                icon: BookOpen,
                color: "text-emerald-600 dark:text-emerald-400",
                path: "/documents"
              },
              {
                label: "Submit Expense",
                subtitle: "Claim reimbursements",
                icon: DollarSign,
                color: "text-amber-500 dark:text-amber-400",
                path: "/reimbursements"
              },
              {
                label: "Organisation Structure",
                subtitle: "View company hierarchy",
                icon: GitMerge,
                color: "text-blue-600 dark:text-blue-400",
                path: "/employee-management"
              },
              {
                label: "View Holidays",
                subtitle: "Calendar & holidays list",
                icon: CalendarDays,
                color: "text-purple-600 dark:text-purple-400",
                path: "/holidays"
              },
            ].map((action, idx) => (
              <div
                key={idx}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between p-2 rounded-none border-b border-border hover:bg-muted/50 transition-all cursor-pointer group last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <action.icon className={`h-5 w-5 shrink-0 ${action.color} group-hover:scale-105 transition-transform duration-300`} />
                  <div>
                    <h4 className="text-[12px] font-medium text-foreground leading-tight group-hover:text-primarytransition-colors">{action.label}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{action.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── Row 3: Apply Leave, Surveys, Upcoming Holidays, Upcoming Leaves ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Apply Leave Widget */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-sm flex flex-col min-h-[380px] h-auto">
          <div className="flex items-center gap-2 mb-6">
            <Send className="w-5 h-5 text-primary-500 -rotate-45" />
            <h3 className="text-[16px] font-medium leading-6 text-foreground">Apply Leave</h3>
          </div>

          <form onSubmit={handleApplyLeaveSubmit} className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5" ref={leaveTypeDropdownRef}>
                <label className="text-[12px] text-foreground font-medium">Leave Type <span className="text-destructive">*</span></label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLeaveTypeDropdownOpen(!isLeaveTypeDropdownOpen)}
                    className="w-full h-[36px] flex items-center justify-between px-3 bg-card border border-input rounded-sm text-[13px] text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-left hover:bg-muted/50"
                  >
                    <span className="truncate">
                      {leaveRequestData.leave_policy_id ? (
                        leaveBalance?.find(b => (b.leave_policy_id || b.id)?.toString() === leaveRequestData.leave_policy_id)?.policy_name || "Annual Leave"
                      ) : "Select..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {isLeaveTypeDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-sm shadow-sm p-1 space-y-0.5">
                      {(leaveBalance || []).map((b: any) => (
                        <button
                          key={b.leave_policy_id || b.id}
                          type="button"
                          onClick={() => {
                            setLeaveRequestData({ ...leaveRequestData, leave_policy_id: (b.leave_policy_id || b.id).toString() });
                            setIsLeaveTypeDropdownOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-left text-[13px] rounded-sm hover:bg-muted text-foreground"
                        >
                          {b.policy_name || b.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {leaveRequestData.leave_policy_id && (
                  <div className="mt-1 text-xs text-primary font-semibold">
                    Available: {getSelectedPolicyBalance() !== null ? `${getSelectedPolicyBalance()} Days` : 'N/A'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] text-foreground font-medium">From <span className="text-destructive">*</span></label>
                  <ModernDatePicker
                    value={leaveRequestData.start_date}
                    onChange={(val) => setLeaveRequestData({ ...leaveRequestData, start_date: val })}
                    placeholder="Select"
                    align="left"
                    minDate={todayStr}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] text-foreground font-medium">To <span className="text-destructive">*</span></label>
                  <ModernDatePicker
                    value={leaveRequestData.end_date}
                    onChange={(val) => setLeaveRequestData({ ...leaveRequestData, end_date: val })}
                    placeholder="Select"
                    align="right"
                    minDate={leaveRequestData.start_date || todayStr}
                    required
                  />
                </div>
              </div>

              {getAppliedLeaveDays() > 0 && (
                <div className="text-xs text-muted-foreground font-semibold">
                  Requested Duration: {getAppliedLeaveDays()} Day(s) (excluding weekends)
                </div>
              )}

              {!widgetIsOverQuota ? (
                <div className="space-y-1.5">
                  <label className="text-[12px] text-foreground font-medium">Reason <span className="text-destructive">*</span></label>
                  <textarea
                    value={leaveRequestData.reason}
                    onChange={(e) => setLeaveRequestData({ ...leaveRequestData, reason: e.target.value })}
                    rows={2}
                    className="w-full p-3 bg-card border border-input rounded-sm text-[13px] text-foreground focus:ring-1 focus:ring-primary focus:border-primary resize-none hover:bg-muted/50 transition-colors"
                    placeholder="Please describe why you need this leave..."
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1 text-sm leading-relaxed">
                      <span className="font-semibold text-amber-950 dark:text-amber-100">
                        Over-Quota Request:
                      </span>{" "}
                      You are requesting <strong>{widgetAppliedDays - (widgetSelectedBalance || 0)} extra days</strong> beyond your available balance ({widgetSelectedBalance} days). Please provide a justification below for manager approval.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] text-foreground font-medium">
                      Justification for Exceeding Leave Quota <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={overQuotaReason}
                      onChange={(e) => setOverQuotaReason(e.target.value)}
                      placeholder="Please explain why you require additional days beyond your quota for manager review..."
                      required
                      rows={2}
                      className="w-full p-3 bg-card border border-input rounded-sm text-[13px] text-foreground focus:ring-1 focus:ring-primary focus:border-primary resize-none hover:bg-muted/50 transition-colors text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingLeave}
              className="w-full h-[36px] bg-card border border-input hover:bg-muted hover:text-foreground text-[13px] font-medium rounded-sm transition-colors text-muted-foreground mt-4"
            >
              {isSubmittingLeave ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Surveys Widget */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <h3 className="text-[16px] font-medium leading-6 text-foreground">Surveys</h3>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {activeEmployeeSurveys.length > 0 ? (
              activeEmployeeSurveys.slice(0, 3).map((survey: any) => {
                const endsAt = survey.end_date ? new Date(survey.end_date) : null;
                const now = new Date();
                const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86400000) : null;
                const badgeText = endsAt && daysLeft !== null
                  ? (daysLeft <= 0 ? 'Ended' : daysLeft <= 1 ? 'Ends today' : daysLeft <= 3 ? 'Ends soon' : `${daysLeft} days left`)
                  : 'Open';
                const badgeColor = daysLeft !== null && daysLeft <= 3
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
                return (
                  <div key={survey.id} className="border border-border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors cursor-pointer group">
                    <h4 className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{survey.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 mb-2 line-clamp-1">{survey.description || 'No description'}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badgeText}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <ClipboardList className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-[13px] font-medium">No active surveys</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/surveys')}
            className="w-full h-[36px] bg-card border border-input hover:bg-muted hover:text-foreground text-[13px] font-medium rounded-sm transition-colors text-muted-foreground mt-4"
          >
            View All Surveys
          </button>
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="w-5 h-5 text-emerald-500" />
            <h3 className="text-[16px] font-medium leading-6 text-foreground">Upcoming Holidays</h3>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {publicHolidays.length > 0 ? publicHolidays.slice(0, 3).map((h: any, idx: number) => (
              <div key={idx} className="flex flex-col border-b border-border last:border-0 pb-2.5 last:pb-0">
                <h4 className="text-[13px] font-medium text-foreground">{h.title}</h4>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-[12px] text-muted-foreground">{h.formattedDate}</p>
                  <span className="text-[11px] text-muted-foreground font-medium tabular-nums">{h.diff === 0 ? 'Today' : h.diff === 1 ? 'Tomorrow' : `In ${h.diff} days`}</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center min-h-[100px] text-center text-muted-foreground">
                <CalendarDays className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-[13px] font-medium">No upcoming holidays</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/team-calendar')}
            className="w-full h-[36px] bg-card border border-input hover:bg-muted hover:text-foreground text-[13px] font-medium rounded-sm transition-colors text-muted-foreground mt-4"
          >
            View All Holidays
          </button>
        </div>

        {/* Upcoming Leaves */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center gap-2 mb-6">
            <CalendarCheck className="w-5 h-5 text-amber-500" />
            <h3 className="text-[16px] font-medium leading-6 text-foreground">Upcoming Leaves</h3>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {upcomingLeaves.length > 0 ? (
              upcomingLeaves.slice(0, 3).map((leave: any, idx: number) => {
                const startDate = new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const endDate = new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const status = leave.status?.toUpperCase() || 'PENDING';
                
                return (
                  <div key={leave.id || idx} className="flex flex-col border-b border-border last:border-0 pb-2.5 last:pb-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="text-[13px] font-medium text-foreground">{leave.leave_type || 'Annual Leave'}</h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'}`}>
                        {status === 'APPROVED' ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground tabular-nums">{startDate} - {endDate}</p>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[100px] text-center text-muted-foreground">
                <CalendarCheck className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-[13px] font-medium">No upcoming leaves</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/leave-management/requests')}
            className="w-full h-[36px] bg-card border border-input hover:bg-muted hover:text-foreground text-[13px] font-medium rounded-sm transition-colors text-muted-foreground mt-4"
          >
            View All Leaves
          </button>
        </div>

      </div>

    </div>
  );
};

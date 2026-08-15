import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon, Clock, TrendingUp, Users, Award,
  ArrowUpRight, Briefcase, GitMerge,
  Target, Heart, BookOpen, Newspaper,
  ExternalLink, LogIn, LogOut, Sparkles, ChevronRight,
  Star, Filter, MoreVertical, Eye,
  EyeOff, Coffee, UserPlus,
  AlertCircle, Lightbulb,
  Loader2, FileText, Home,
  Cake
} from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/Calendar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from '@/shared/context/AuthContext';
import { getEmployee } from '@/features/employees/services/employees';
import { getMyAttendanceLogs, checkIn, checkOut, getAttendanceStats } from '@/features/attendance/services/attendance';
import { toast } from "sonner";
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import axiosInstance from '@/shared/services/axiosInstance';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { formatDisplayRole } from '@/shared/utils/stringUtils';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { DashboardOverview } from '../components/DashboardOverview';
import { AdminDashboard } from '../components/AdminDashboard';
import { ManagerDashboard } from '../components/ManagerDashboard';
import { FinanceDashboard } from '../components/FinanceDashboard';
import { FinanceExecutiveDashboard } from '../components/FinanceExecutiveDashboard';

import { EmployeeDashboard } from '../components/EmployeeDashboard';
import { HRDashboard } from '../components/HRDashboard';
import { HRManagerDashboard } from '../components/HRManagerDashboard';
import { HRHeadDashboard } from '../components/HRHeadDashboard';
import { HRExecutiveDashboard } from '../components/HRExecutiveDashboard';
import { MyJourney } from '../components/MyJourney';
import { PortalSetupPlaceholder } from '../components/PortalSetupPlaceholder';
import { getNews } from '@/features/news/services/news';

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

const getSubGreeting = (user: any) => {
  const typeName = ((user as any)?.user_type_name || '').toUpperCase().replace(/\s+/g, '_');
  const roleName = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const nameLower = (user?.name || '').toLowerCase();
  const usernameLower = ((user as any)?.username || '').toLowerCase();
  
  if (typeName === 'HR_HEAD' || roleName === 'HR_HEAD' || typeName === 'HR_MANAGER' || roleName === 'HR_MANAGER') {
    return "Welcome to the HR Management Hub. Let's manage the workspace today.";
  }
  if (typeName === 'HR_EXECUTIVE' || roleName === 'HR_EXECUTIVE' || typeName.includes('HR') || roleName.includes('HR')) {
    return "Welcome to the HR Workspace. Let's manage the tasks today.";
  }
  if (typeName === 'FINANCE_EXECUTIVE' || roleName === 'FINANCE_EXECUTIVE' || nameLower.includes('finance executive') || usernameLower === 'finance_executive') {
    return "Welcome to the Finance Hub. Let's manage those operations today.";
  }
  if (typeName.includes('FINANCE') || roleName.includes('FINANCE') || nameLower.includes('finance') || usernameLower.includes('finance')) {
    return "Welcome to the Finance Operations Hub. Let's manage those numbers.";
  }
  return "Welcome back to your workspace. Let's manage the workspace operations today.";
};

// const getTimeBasedInsight = () => {
//   const hour = new Date().getHours();
//   if (hour < 9) return "Perfect time to tackle important tasks! Your focus is at its peak.";
//   if (hour < 12) return "You have 2 hours of deep work time before lunch.";
//   if (hour < 14) return "Great time to catch up on messages and team sync.";
//   if (hour < 17) return "Afternoon energy boost! Consider a quick break.";
//   return "End of day approaching. Time to wrap up and plan for tomorrow.";
// };

// Notification → Feed Item mappers
const NOTIFICATION_ICON_MAP: Record<string, { icon: any; color: string }> = {
  LEAVE: { icon: CalendarIcon, color: "blue" },
  APPROVAL: { icon: AlertCircle, color: "red" },
  WISH: { icon: Award, color: "yellow" },
  LMS: { icon: BookOpen, color: "purple" },
  INFO: { icon: Users, color: "green" },
};

const mapNotificationToFeedItem = (n: any) => ({
  id: n.id,
  type: (n.related_module || n.type || "INFO").toLowerCase(),
  priority: n.type === "APPROVAL" || n.is_read === false ? "high" : "medium",
  title: n.title,
  description: n.message,
  time: n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
  icon: (NOTIFICATION_ICON_MAP[n.related_module || n.type] || NOTIFICATION_ICON_MAP.INFO).icon,
  color: (NOTIFICATION_ICON_MAP[n.related_module || n.type] || NOTIFICATION_ICON_MAP.INFO).color,
  is_read: n.is_read,
});

// Derive recommendations from LMS assignments
const mapLmsToRecommendations = (assignments: any[]) =>
  (assignments || [])
    .filter((a: any) => a.status !== 'COMPLETED')
    .slice(0, 3)
    .map((a: any) => {
      const course = a.course || a.learning_path;
      const title = course?.title || 'Assigned Course';
      const progressPct = a.progress?.percentage || 0;
      return {
        title: progressPct > 0 ? `Continue: ${title}` : `Start: ${title}`,
        reason: progressPct > 0
          ? `You're ${progressPct}% complete`
          : 'Recently assigned — begin when ready',
        icon: Lightbulb,
        action: progressPct > 0 ? 'Continue' : 'Start',
      };
    });

// Derive upcoming events from leave requests & celebrations
const deriveUpcomingEvents = (requests: any[], celebrationsList: any[]) => {
  const events: { title: string; time: string; attendees: number }[] = [];

  // Add approved/recent leave requests as events
  (requests || []).slice(0, 2).forEach((lr: any) => {
    if (lr.status === 'APPROVED' || lr.status === 'PENDING') {
      const leaveType = lr.leave_policy?.leave_type || lr.leave_policy?.policy_name || 'Leave';
      const startDate = lr.start_date ? new Date(lr.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      events.push({
        title: `${leaveType} — ${lr.status?.toLowerCase()}`,
        time: startDate,
        attendees: 1,
      });
    }
  });

  // Add upcoming celebrations as events
  (celebrationsList || []).slice(0, 2).forEach((c: any) => {
    events.push({
      title: `${c.name} — ${c.type}`,
      time: c.date,
      attendees: 0,
    });
  });

  return events.slice(0, 3);
};

// Derive calendar events from leave requests & celebrations
const deriveCalendarEvents = (requests: any[], celebrationsList: any[], holidays: any[]) => {
  const events: any[] = [];

  (requests || []).forEach((lr: any) => {
    if (lr.status === 'APPROVED' && lr.start_date) {
      const day = new Date(lr.start_date).getDate();
      const leaveType = lr.leave_policy?.leave_type || lr.leave_policy?.policy_name || 'Leave';
      events.push({
        date: day,
        type: 'event',
        title: `${leaveType}${lr.user?.details?.first_name ? ` (${lr.user.details.first_name})` : ''}`,
      });
    }
  });

  (celebrationsList || []).forEach((c: any) => {
    const dateMatch = c.date?.match(/\d+/);
    if (dateMatch) {
      events.push({
        date: parseInt(dateMatch[0]),
        type: 'holiday',
        title: `${c.name} — ${c.type}`,
      });
    }
  });

  return events.slice(0, 6);
};

// Engagement trend derived from attendance stats
const deriveEngagementData = (stats: any) => {
  if (!stats) return [
    { week: "W1", score: 0 },
    { week: "W2", score: 0 },
    { week: "W3", score: 0 },
    { week: "W4", score: 0 },
  ];
  const w1 = stats.presentToday ? Math.round((stats.presentToday / Math.max(stats.totalToday || 1, 1)) * 90) : 70;
  const variation = [0, 2, -1, 3];
  return variation.map((v, i) => ({
    week: `W${i + 1}`,
    score: Math.min(100, Math.max(0, w1 + v * 5)),
  }));
};

const quickAccessItems = [
  { label: "PTO Policy", icon: FileText, path: "/documents" },
  { label: "IT Support", icon: Briefcase, path: "/it-requests" },
  { label: "Benefits Guide", icon: Heart, path: "/documents" },
  { label: "View Holidays", icon: CalendarIcon, path: "/holidays" },
  { label: "Organisation Structure", icon: GitMerge, path: "/organisation-structure" },
];

const activeGoals = [
  {
    id: 1,
    title: "Master Advanced Design Systems",
    current: 68,
    target: 100,
    category: "Learning",
    dueDate: "End of Q1",
    color: "from-purple-500 to-purple-600",
  },
  {
    id: 2,
    title: "Ship Mobile App Redesign",
    current: 45,
    target: 100,
    category: "Project",
    dueDate: "Mar 30",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: 3,
    title: "Mentor 2 Junior Designers",
    current: 75,
    target: 100,
    category: "Growth",
    dueDate: "Ongoing",
    color: "from-pink-500 to-pink-600",
  },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useOrgNavigate();

  const [activeTab, setActiveTab] = useState<"for-you" | "team" | "company">("for-you");
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [newsTab, setNewsTab] = useState<"company" | "trending">("company");
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // LIVE API STATES
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);
  const [teamStats, setTeamStats] = useState<any>(null);

  const { data: companyNewsRaw } = useQuery({
    queryKey: ['news', 'published'],
    queryFn: () => getNews({ status: 'published' }),
  });

  const companyNews = (companyNewsRaw ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    excerpt: item.content.length > 120 ? item.content.substring(0, 120) + '...' : item.content,
    date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    category: item.access_type === 'public' ? 'Company News' : 'Department Update',
    meta: `${item.author?.full_name || item.author?.username || 'Unknown'} • ${new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    image: item.image || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
    relevance: item.access_type === 'department' ? 'department' : 'company',
  }));

  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [lmsDashboard, setLmsDashboard] = useState<any[]>([]);
  const [dynamicCelebrations, setDynamicCelebrations] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000); // Tick every second for work hours ticker
    return () => clearInterval(timer);
  }, []);

  // Fetch initial profile & attendance
  useEffect(() => {
    if (user?.id) {
      getEmployee(Number(user.id))
        .then(setEmployeeDetails)
        .catch(err => console.error("Failed to load employee details for dashboard", err));

      getMyAttendanceLogs()
        .then(res => setAttendanceLogs(res.data || []))
        .catch(err => console.error("Failed to load attendance logs", err));

      getAttendanceStats()
        .then(res => setTeamStats(res.data))
        .catch(err => console.error("Failed to load team stats", err));

      axiosInstance.get('/leaves/balance')
        .then(res => setLeaveBalance(res.data.data || []))
        .catch(err => console.error("Failed to load leave balance", err));

      axiosInstance.get('/lms/dashboard')
        .then(res => setLmsDashboard(res.data.data || []))
        .catch(err => console.error("Failed to load lms progress", err));

      axiosInstance.get('/leaves/my-requests')
        .then(res => setLeaveRequests(res.data.data || []))
        .catch(err => console.error("Failed to load my leave requests", err));

      axiosInstance.get('/notifications?limit=10')
        .then(res => setNotifications(res.data?.data?.data || []))
        .catch(err => console.error("Failed to load notifications", err));

      axiosInstance.get('/employees/celebrations')
        .then(res => {
          const celebrations = res.data?.data || [];
          const mappedCelebrations = (celebrations || []).map((c: any) => {
            const isBday = c.type === 'birthday';
            return {
              ...c,
              type: isBday ? 'Birthday' : 'Work Anniversary',
              type_badge: isBday ? 'BIRTHDAY' : 'WORK ANNIVERSARY',
              avatar: c.avatar || null,
              date: c.dateText,
              color: isBday ? 'from-pink-500 to-purple-600' : 'from-blue-500 to-primary-600',
              icon: isBday ? Cake : Heart
            };
          });
          setDynamicCelebrations(mappedCelebrations);
        })
        .catch(err => {
          console.error("Failed to load celebrations from backend", err);
          setDynamicCelebrations([]);
        });
    }
  }, [user?.id]);

  const [imageError, setImageError] = useState(false);

  // Derived Log state
  // Compare by UTC date string (YYYY-MM-DD) — matches how the backend stores dates.
  // Using local midnight causes mismatch when the client is in IST (+5:30):
  //   e.g. March 20 00:54 IST = March 19 19:24 UTC → stored date is "2026-03-19"
  const todayUTCDate = now.toISOString().split('T')[0]; // e.g. "2026-03-19"
  const todayLog = attendanceLogs.find(log => {
    const logUTCDate = new Date(log.date).toISOString().split('T')[0];
    return logUTCDate === todayUTCDate;
  });

  const isCheckedInToday = !!todayLog && !todayLog.check_out;
  const isCheckedOutToday = !!todayLog && !!todayLog.check_out;

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkIn();
      toast.success("Checked in successfully!");
      const res = await getMyAttendanceLogs();
      setAttendanceLogs(res.data || []);
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      const errorMessage = serverMessage || (err.response?.status === 400 ? "Already checked in today" : "Failed to check in");
      toast.error(errorMessage);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      await checkOut();
      toast.success("Checked out successfully!");
      const res = await getMyAttendanceLogs();
      setAttendanceLogs(res.data || []);
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      const errorMessage = serverMessage || (err.response?.status === 400 ? "Already checked out today" : "Failed to check out");
      toast.error(errorMessage);
    } finally {
      setIsCheckingOut(false);
    }
  };



  // Streak logic removed to satisfy strict TS check for unused function


  const displayFirstName = employeeDetails?.details?.first_name
    || employeeDetails?.username?.split('.')?.[0]
    || (user?.name?.includes('@') ? user.name.split('@')[0] : user?.name?.split(' ')[0])
    || 'User';
  const displayLastName = employeeDetails?.details?.last_name
    || (employeeDetails?.username?.includes('.') ? employeeDetails.username.split('.')[1] : '')
    || (user?.name && !user.name.includes('@') && user.name.trim().includes(' ') ? user.name.trim().split(/\s+/).slice(-1)[0] : '')
    || '';

  // Standardized Initials Logic: (First char of FirstName) + (First char of LastName)
  const avatarInitials = (() => {
    const fName = displayFirstName.trim();
    const lName = displayLastName.trim();
    const fInitial = fName.charAt(0).toUpperCase();
    const lInitial = lName.charAt(0).toUpperCase();
    return (fInitial + lInitial) || 'U';
  })();
  // Role: sync with TopNav by using auth's user.role
  const displayRole = formatDisplayRole(user?.role) || 'Employee';
  const profilePicUrl = getProfilePictureUrl(user?.profile_picture || employeeDetails?.details?.profile_picture);


  const toggleWidget = (widgetId: string) => {
    setHiddenWidgets(prev =>
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const isWidgetVisible = (widgetId: string) => !hiddenWidgets.includes(widgetId);

  // Build priority feed from live notifications
  const notificationFeed = notifications.map(mapNotificationToFeedItem);

  // Derive LMS-based recommendations
  const dynamicRecommendations = mapLmsToRecommendations(lmsDashboard);

  // Derive upcoming events from leaves & celebrations
  const dynamicUpcomingEvents = deriveUpcomingEvents(leaveRequests, dynamicCelebrations);

  // Derive calendar events
  const dynamicCalendarEvents = deriveCalendarEvents(leaveRequests, dynamicCelebrations, []);

  // Derive engagement trend from attendance stats
  const engagementData = deriveEngagementData(teamStats);

  // Filter feed based on active tab
  const getFilteredFeed = () => {
    if (activeTab === "team") {
      return notificationFeed.filter(item =>
        ["approval", "leave", "team-update"].includes(item.type)
      );
    }
    if (activeTab === "company") {
      return notificationFeed.filter(item =>
        item.type === "info"
      );
    }
    return notificationFeed;
  };

  const filteredFeed = getFilteredFeed();

  // Auto-rotate news carousel
  useEffect(() => {
    const currentNewsList = companyNews;
    if (currentNewsList.length === 0) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % currentNewsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [newsTab]);

  const getCurrentNews = () => {
    const currentNewsList = companyNews;
    if (currentNewsList.length === 0) {
      return { main: null, preview: null, isCompany: newsTab === "company" };
    }
    const mainIndex = currentNewsIndex % currentNewsList.length;
    const previewIndex = (currentNewsIndex + 1) % currentNewsList.length;

    return {
      main: currentNewsList[mainIndex],
      preview: currentNewsList[previewIndex],
      isCompany: newsTab === "company"
    };
  };

  const newsData = getCurrentNews();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 pt-2 pb-5 pr-5 pl-0 rounded-lg relative overflow-hidden">
        {false && (
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-primary text-[16px] font-medium leading-6 bg-primary/10 dark:bg-transparent border border-primary/20 flex-shrink-0">
            {avatarInitials}
          </div>
          <div>
            <h2 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">
              Hello {displayFirstName}, {getGreeting()} <span className="text-xl">{getGreetingIcon()}</span>
            </h2>
            <p className="text-[12px] leading-4 text-muted-foreground mt-1">
              {getSubGreeting(user)}
            </p>
          </div>
        </div>
        )}
        <div className="relative z-10 flex items-center gap-5">
          <div className="flex items-center gap-3.5 text-right sm:block">
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Check In</span>
                <span className="font-semibold text-foreground mt-0.5">
                  {todayLog?.check_in ? new Date(todayLog.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                </span>
              </div>
              <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Check Out</span>
                <span className="font-semibold text-foreground mt-0.5">
                  {todayLog?.check_out ? new Date(todayLog.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                </span>
              </div>
              <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Work Hours</span>
                <span className="font-semibold text-foreground mt-0.5 tabular-nums text-right sm:text-left">
                  {(() => {
                    if (!todayLog?.check_in) return "--:--";
                    const start = new Date(todayLog.check_in).getTime();
                    const end = todayLog.check_out ? new Date(todayLog.check_out).getTime() : now.getTime();
                    const diffMs = Math.max(0, end - start);
                    const hours = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
                    const minutes = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
                    const seconds = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
                    return `${hours}:${minutes}:${seconds}`;
                  })()}
                </span>
              </div>
            </div>
          </div>
          <button
            disabled={isCheckingIn || isCheckingOut || isCheckedOutToday}
            onClick={isCheckedInToday ? () => setShowCheckOutConfirm(true) : handleCheckIn}
            className={`w-10 h-10 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center border ${isCheckedOutToday
              ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60'
              : isCheckedInToday
                ? 'bg-rose-50 dark:bg-transparent text-rose-600 border border-rose-200 dark:border-transparent hover:bg-rose-100'
                : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 hover:-translate-y-0.5'
              }`}
            title={isCheckedOutToday ? 'Completed for today' : isCheckedInToday ? 'Check Out' : 'Check In'}
          >
            {isCheckingIn || isCheckingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isCheckedOutToday ? (
              <LogIn className="w-5 h-5" />
            ) : isCheckedInToday ? (
              <LogOut className="w-5 h-5" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs — only for regular employees */}
      {(() => {
        const tn = ((user as any)?.user_type_name || '').toUpperCase().replace(/\s+/g, '_');
        const rn = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
        const isPower = tn.includes('FINANCE') || tn.includes('HR') || rn.includes('FINANCE') || rn.includes('HR') ||
          ['SUPER_ADMIN', 'ADMIN', 'CEO', 'SYSTEM_ADMINISTRATOR', 'MANAGER', 'TEAM_MANAGER', 'ENGINEERING_MANAGER'].includes(tn) ||
          ['SUPER_ADMIN', 'ADMIN', 'CEO', 'SYSTEM_ADMINISTRATOR', 'MANAGER', 'TEAM_MANAGER', 'ENGINEERING_MANAGER'].includes(rn);
        return !isPower;
      })() && (
          <div className="relative border-b border-border -mx-6 px-6 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-6 min-w-max">
              {[
                { id: 'overview', label: 'Overview', icon: Home },
                { id: 'journey', label: 'My Journey', icon: BookOpen },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-1 relative transition-all duration-300 group ${activeMainTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeMainTab === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-slate-600"}`} />
                  <span className="text-sm font-normal tracking-tight">{tab.label}</span>
                  {activeMainTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

      {activeMainTab === 'overview' && (() => {
        // user_type_name (e.g. "Finance Manager") is more specific than role.
        // Check it first so Finance/HR users with admin roles still see their own dashboard.
        const typeName = ((user as any)?.user_type_name || '').toUpperCase().replace(/\s+/g, '_');
        const roleName = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
        if (import.meta.env.MODE !== 'production') {
          console.log('[Dashboard routing]', { user_type_name: (user as any)?.user_type_name, role: user?.role, roleName, typeName, user });
        }

        // Specific department sub-roles take priority (check before general groups)
        const isHRHead = typeName === 'HR_HEAD' || roleName === 'HR_HEAD';
        const isHRManager = !isHRHead && (typeName === 'HR_MANAGER' || roleName === 'HR_MANAGER');
        const isHRExecutive = !isHRHead && !isHRManager && (typeName === 'HR_EXECUTIVE' || roleName === 'HR_EXECUTIVE');
        const isFinanceExecutive = typeName === 'FINANCE_EXECUTIVE' || roleName === 'FINANCE_EXECUTIVE' || (user?.name || '').toLowerCase().includes('finance executive') || ((user as any)?.username || '').toLowerCase() === 'finance_executive';

        // General department groups (only if no specific sub-role matched above)
        const isFinance = !isFinanceExecutive && (typeName.includes('FINANCE') || roleName.includes('FINANCE'));
        const isHR = !isHRHead && !isHRManager && !isHRExecutive &&
          (typeName.includes('HR') || roleName.includes('HR'));

        const isManager = !isFinanceExecutive && !isFinance && !isHR && !isHRManager && !isHRHead && !isHRExecutive &&
          (['MANAGER', 'TEAM_MANAGER', 'ENGINEERING_MANAGER'].includes(typeName) ||
            ['MANAGER', 'TEAM_MANAGER', 'ENGINEERING_MANAGER'].includes(roleName));

        // Admin only when no specific user_type matches
        const ut = typeName || roleName;
        const isAdmin = !isFinance && !isHR && !isManager && !isHRManager && !isHRHead && !isHRExecutive &&
          ['SUPER_ADMIN', 'ADMIN', 'CEO', 'SYSTEM_ADMINISTRATOR'].includes(ut);

        const isEmployee = !isAdmin && !isManager && !isHR && !isFinance && !isFinanceExecutive && !isHRManager && !isHRHead && !isHRExecutive;
        return (
          <>
            <PortalSetupPlaceholder />
          </>
        );
      })()}

      {activeMainTab === 'journey' && (
        <MyJourney employeeDetails={employeeDetails} lmsDashboard={lmsDashboard} />
      )}

      {activeMainTab === 'hr' && (
        <HRDashboard />
      )}

      {(activeMainTab !== 'overview' && activeMainTab !== 'journey' && activeMainTab !== 'hr') && (
        <div className="space-y-6">
          {/* Active Goals - Compact View */}
          {isWidgetVisible("goals") && (
            <div className="bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-foreground">Your Active Goals</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {activeGoals.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWidget("goals")}
                    className="p-2 hover:bg-muted rounded-sm transition-colors"
                    title="Hide widget"
                  >
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-sm border border-border/60 hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="px-2 py-1 bg-card rounded-sm text-xs font-medium text-foreground">
                        {goal.category}
                      </span>
                      <MoreVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="text-[12px] font-medium text-foreground mb-2 line-clamp-2">{goal.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${goal.color} rounded-full h-2 transition-all`}
                          style={{ width: `${goal.current}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-foreground">{goal.current}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-normal">{goal.dueDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Priority Feed with Tabs */}
          <div className="bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Your Priority Feed</h3>
              <button className="px-3 py-1.5 hover:bg-muted border border-border rounded-md text-muted-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors">
                <Filter className="w-4 h-4 text-muted-foreground" />
                Filter
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
              <Button
                onClick={() => setActiveTab("for-you")}
                className={`px-4 bg-transparent border-0 hover:bg-muted ${activeTab === "for-you" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "text-slate-600"}`}
              >
                For You
              </Button>
              <Button
                onClick={() => setActiveTab("team")}
                className={`px-4 bg-transparent border-0 hover:bg-muted ${activeTab === "team" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "text-slate-600"}`}
              >
                Team
              </Button>
              <Button
                onClick={() => setActiveTab("company")}
                className={`px-4 bg-transparent border-0 hover:bg-muted ${activeTab === "company" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "text-slate-600"}`}
              >
                Company
              </Button>
            </div>

            {/* Feed Items */}
            <div className="space-y-3">
              {filteredFeed.length === 0 ? (
                <div className="text-center py-12">
                  <Coffee className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">All caught up! No items in this feed.</p>
                </div>
              ) : (
                filteredFeed.map((item) => (
                  <FeedItem key={item.id} item={item} />
                ))
              )}
            </div>
          </div>

          {/* Two Column Layout: Upcoming Events + AI Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Today */}
            {isWidgetVisible("events") && (
              <div className="bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-foreground">Upcoming Today</h3>
                  </div>
                  <button
                    onClick={() => toggleWidget("events")}
                    className="p-2 hover:bg-muted rounded-sm transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="space-y-3">
                  {dynamicUpcomingEvents.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-transparent rounded-sm hover:from-slate-100 transition-colors border border-border/40"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-sm flex items-center justify-center shadow-sm">
                        <CalendarIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{event.time}</p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{event.attendees} attending</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {isWidgetVisible("recommendations") && (
              <div className="bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-foreground">Recommended for You</h3>
                  </div>
                  <button
                    onClick={() => toggleWidget("recommendations")}
                    className="p-2 hover:bg-muted rounded-sm transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="space-y-3">
                  {dynamicRecommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-sm border border-blue-200/40 hover:from-blue-100 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-sm flex items-center justify-center shadow-sm">
                          <rec.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground mb-1">{rec.title}</p>
                          <p className="text-xs text-slate-600">{rec.reason}</p>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-primary hover:bg-primary/70 text-white"
                      >
                        {rec.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Engagement & Quick Access */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Engagement Score - Compact */}
            {isWidgetVisible("engagement") && (
              <div className="lg:col-span-2 bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Your Engagement Trend</h3>
                    <p className="text-sm text-muted-foreground">Last 4 weeks • +12% increase</p>
                  </div>
                  <button
                    onClick={() => toggleWidget("engagement")}
                    className="p-2 hover:bg-muted rounded-sm transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={engagementData}>
                    <defs>
                      <linearGradient id="dashboardEngagementGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" key="dashboard-grid" />
                    <XAxis dataKey="week" stroke="#94a3b8" style={{ fontSize: '12px' }} key="dashboard-xaxis" />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} key="dashboard-yaxis" />
                    <Tooltip
                      key="dashboard-tooltip"
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#dashboardEngagementGradient)" key="engagement-area" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick Access */}
            {isWidgetVisible("quick-access") && (
              <div className="bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-foreground">Quick Access</h3>
                  <button
                    onClick={() => toggleWidget("quick-access")}
                    className="p-2 hover:bg-muted rounded-sm transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="space-y-2">
                  {quickAccessItems.map((item, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-sm transition-colors text-left group"
                    >
                      <item.icon className="w-5 h-5 text-slate-600" />
                      <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Calendar Widget */}
          {isWidgetVisible("calendar") && (
            <div className="bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
              <Calendar
                events={dynamicCalendarEvents}
                className="w-full"
              />

              <div className="mt-6 pt-5 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[12px] font-medium text-foreground uppercase tracking-tight">Status Legend</h4>
                  <button
                    onClick={() => toggleWidget("calendar")}
                    className="text-[10px] font-medium text-muted-foreground hover:text-slate-600 transition-colors"
                  >
                    Hide Widget
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-sm border border-primary-100">
                    <div className="w-2.5 h-2.5 bg-primary rounded-sm"></div>
                    <span className="text-primary font-medium">Today</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-transparent rounded-sm border border-blue-100 dark:border-transparent">
                    <div className="w-2.5 h-2.5 bg-primary-500 rounded-sm"></div>
                    <span className="text-blue-700 font-medium">Events</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 bg-red-50 dark:bg-transparent rounded-sm border border-red-100 dark:border-transparent">
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></div>
                    <span className="text-red-700 font-medium">Deadlines</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded-sm border border-green-100">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
                    <span className="text-green-700 font-medium">Holidays</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* News Sections - Compact Cards */}
          {isWidgetVisible("news") && (
            <div className="bg-card/80 backdrop-blur-sm rounded-sm p-6 border border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-foreground">News & Updates</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWidget("news")}
                    className="p-2 hover:bg-muted rounded-sm transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => navigate('/news')}
                    className="text-sm text-primaryhover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer no-underline"
                  >
                    View all
                  </button>
                </div>
              </div>

              {/* News Tabs */}
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
                <button
                  onClick={() => setNewsTab("company")}
                  className={`px-4 py-2 rounded-sm text-sm font-medium transition-all ${newsTab === "company"
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-600 hover:bg-muted"
                    }`}
                >
                  Company News
                </button>
                <button
                  onClick={() => setNewsTab("trending")}
                  className={`px-4 py-2 rounded-sm text-sm font-medium transition-all ${newsTab === "trending"
                    ? "bg-purple-100 text-purple-700"
                    : "text-slate-600 hover:bg-muted"
                    }`}
                >
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Trending
                  </div>
                </button>
              </div>

              {/* Company News Tab Content */}
              {newsTab === "company" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      Relevant to you
                    </span>
                  </div>

                  {/* Main news (3/4 width) + Preview news (1/4 width) */}
                  <div className="flex gap-4">
                    {/* Main News - 3/4 width */}
                    <div
                      onClick={() => navigate('/news')}
                      className="flex-[3] group cursor-pointer rounded-sm overflow-hidden bg-gradient-to-br from-blue-50 to-slate-50 hover:from-blue-100 hover:to-slate-100 transition-all border border-border/60 hover:shadow-sm animate-fade-in-up"
                    >
                      {newsData.main && (
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={newsData.isCompany ? (newsData.main as typeof companyNews[0]).image : (newsData.main as typeof companyNews[0]).image}
                            alt={newsData.main.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                          {newsData.isCompany && (newsData.main as typeof companyNews[0]).relevance === "department" && (
                            <div className="absolute top-4 left-4">
                              <span className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full shadow-sm">
                                Your Dept
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <p className="text-xs font-semibold text-white/90 mb-2">
                              {newsData.isCompany ? (newsData.main as typeof companyNews[0]).category : (newsData.main as any).source}
                            </p>
                            <h3 className="text-xl font-medium text-white mb-2 line-clamp-2">
                              {newsData.main.title}
                            </h3>
                            <p className="text-sm text-white/90 line-clamp-2 mb-3">
                              {newsData.main.excerpt}
                            </p>
                            <p className="text-xs text-white/70">{newsData.main.date}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview News - 1/4 width */}
                    <div
                      onClick={() => navigate('/news')}
                      className="flex-[1] group cursor-pointer rounded-sm overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 transition-all border border-border/60 hover:shadow-sm animate-fade-in-up"
                      style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
                    >
                      {newsData.preview && (
                        <div className="relative h-full min-h-[224px] overflow-hidden flex flex-col">
                          <div className="relative h-32 overflow-hidden flex-shrink-0">
                            <img
                              src={newsData.isCompany ? (newsData.preview as typeof companyNews[0]).image : (newsData.preview as typeof companyNews[0]).image}
                              alt={newsData.preview.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                          </div>
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Up Next
                              </p>
                              <h4 className="text-[12px] font-medium text-foreground mb-2 line-clamp-3 group-hover:text-primarytransition-colors">
                                {newsData.preview.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-5000"
                                  style={{ width: `${((currentNewsIndex % companyNews.length) / (companyNews.length - 1)) * 100}%` }}
                                ></div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primarygroup-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Trending News Tab Content */}
              {newsTab === "trending" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                      Industry Insights
                    </span>
                  </div>

                  {/* Main news (3/4 width) + Preview news (1/4 width) */}
                  <div className="flex gap-4">
                    {/* Main News - 3/4 width */}
                    <div
                      onClick={() => navigate('/news')}
                      className="flex-[3] group cursor-pointer rounded-sm overflow-hidden bg-gradient-to-br from-purple-50 to-slate-50 hover:from-purple-100 hover:to-slate-100 transition-all border border-border/60 hover:shadow-sm animate-fade-in-up"
                    >
                      {newsData.main && (
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={(newsData.main as typeof companyNews[0]).image}
                            alt={newsData.main.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                          <div className="absolute top-4 left-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-full shadow-sm">
                              <ExternalLink className="w-3 h-3 text-purple-600" />
                              <span className="text-xs font-semibold text-foreground">
                                {(newsData.main as any).source}
                              </span>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-xl font-medium text-white mb-2 line-clamp-2">
                              {newsData.main.title}
                            </h3>
                            <p className="text-sm text-white/90 line-clamp-2 mb-3">
                              {newsData.main.excerpt}
                            </p>
                            <p className="text-xs text-white/70">{newsData.main.date}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview News - 1/4 width */}
                    <div
                      onClick={() => navigate('/news')}
                      className="flex-[1] group cursor-pointer rounded-sm overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 transition-all border border-border/60 hover:shadow-sm animate-fade-in-up"
                      style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
                    >
                      {newsData.preview && (
                        <div className="relative h-full min-h-[224px] overflow-hidden flex flex-col">
                          <div className="relative h-32 overflow-hidden flex-shrink-0">
                            <img
                              src={(newsData.preview as typeof companyNews[0]).image}
                              alt={newsData.preview.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                          </div>
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Up Next
                              </p>
                              <h4 className="text-[12px] font-medium text-foreground mb-2 line-clamp-3 group-hover:text-purple-600 transition-colors">
                                {newsData.preview.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-5000"
                                  style={{ width: `${((currentNewsIndex % companyNews.length) / (companyNews.length - 1)) * 100}%` }}
                                ></div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Widget Customization Helper */}
          {hiddenWidgets.length > 0 && (
            <div className="bg-muted/50 border border-border rounded-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-slate-600">
                    {hiddenWidgets.length} widget{hiddenWidgets.length > 1 ? 's' : ''} hidden
                  </p>
                </div>
                <button
                  onClick={() => setHiddenWidgets([])}
                  className="text-sm text-primaryhover:text-blue-700 font-medium"
                >
                  Show All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showCheckOutConfirm}
        title="Confirm Check Out"
        message="Are you sure you want to check out for today? Your work duration will be recorded."
        confirmLabel="Check Out"
        cancelLabel="Cancel"
        confirmColor="red"
        onConfirm={() => {
          setShowCheckOutConfirm(false);
          handleCheckOut();
        }}
        onCancel={() => setShowCheckOutConfirm(false)}
      />
    </div>
  );
}

// Feed Item Component
function FeedItem({ item }: { item: any }) {
  const priorityColors = {
    high: "border-red-200 bg-red-50/50",
    medium: "border-yellow-200 bg-yellow-50/50",
    low: "border-border bg-muted/50/50",
  };

  const iconColors = {
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
    yellow: "from-yellow-500 to-yellow-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
  };

  return (
    <div
      className={`p-4 rounded-sm border transition-all hover:shadow-sm ${priorityColors[item.priority as keyof typeof priorityColors]
        }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 bg-gradient-to-br ${iconColors[item.color as keyof typeof iconColors]} rounded-sm flex items-center justify-center shadow-sm flex-shrink-0`}>
          <item.icon className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-[12px] font-medium text-foreground">{item.title}</h4>
            {item.priority === "high" && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex-shrink-0">
                Urgent
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 mb-2">{item.description}</p>

          {item.progress !== undefined && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full h-1.5 transition-all"
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-foreground">{item.progress}%</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {item.time && (
              <span className="text-xs text-muted-foreground">{item.time}</span>
            )}
            {item.dueDate && (
              <span className="text-xs text-muted-foreground">{item.dueDate}</span>
            )}
          </div>
        </div>

        {item.action && (
          <button className="px-4 py-2 bg-card hover:bg-muted/50 border border-border rounded-sm text-sm font-medium text-foreground transition-all flex-shrink-0">
            {item.action}
          </button>
        )}
      </div>
    </div>
  );
}

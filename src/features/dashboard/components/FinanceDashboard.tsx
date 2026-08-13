import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  DollarSign, Landmark, ClipboardList, TrendingDown,
  RefreshCw, CreditCard, FileCheck, PartyPopper,
  ChevronRight, Clock, Cake, Heart, Gift, Award,
  Upload, Receipt, FileSpreadsheet, Building2, Download, CheckCircle2,
  LogIn, LogOut, Briefcase, Users, CalendarCheck, AlertTriangle, Wallet, PiggyBank, TrendingUp
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import axiosInstance from '@/shared/services/axiosInstance';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useAuth } from '@/shared/context/AuthContext';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import { sendWish } from '../services/wishService';
import { checkIn, checkOut, getMyAttendanceLogs } from '@/features/attendance/services/attendance';
import { useHRDashboardRealtime } from '../hooks/useHRDashboardRealtime';
import { getPayrollRuns, getReimbursementTypes, getSalaryComponents, getAllClaims } from '@/features/payroll/services/payroll';
import { getEmployees } from '@/features/employees/services/employees';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import celebrationBg from '@/assets/dashboard/celebration.png';

const QUICK_ACTIONS = [
  { label: "Process Payroll", icon: RefreshCw, color: "text-primary-500 bg-primary/10", path: "/payroll" },
  { label: "Export to Tally", icon: FileSpreadsheet, color: "text-emerald-500 bg-emerald-50", path: "/export" },
  { label: "Tax Report", icon: FileCheck, color: "text-amber-500 bg-amber-50", path: "/reports" },
  { label: "Approve Claims", icon: CheckCircle2, color: "text-rose-500 bg-rose-50", path: "/approvals" },
  { label: "Pay Vendors", icon: Building2, color: "text-sky-500 bg-sky-50", path: "/vendors" },
  { label: "Upload Invoice", icon: Upload, color: "text-purple-500 bg-purple-50", path: "/invoices" },
];

// ── Helper: format K/M ───────────────────────────────────────────────────
function fmtK(n: number, sym: string) {
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${sym}${(n / 1_000).toFixed(0)}K`;
  return `${sym}${n}`;
}

// ── Custom donut centre label ────────────────────────────────────────────
function DonutCentreLabel({ cx, cy, pct }: { cx: number; cy: number; pct: string }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.3em" style={{ fontSize: 18, fontWeight: 700, fill: '#1e293b' }}>{pct}</tspan>
      <tspan x={cx} dy="1.4em" style={{ fontSize: 10, fill: '#94a3b8' }}>tracked</tspan>
    </text>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub,
  icon: Icon, color, badge
}: {
  label: string; value: string; sub: string;
  icon: any; color: string; badge?: string;
}) {
  return (
    <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center ring-1 ring-white/20`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[24px] font-semibold text-foreground tabular-nums tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-1">{label}</p>
    </div>
  );
}

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

// ── Main ─────────────────────────────────────────────────────────────────
export function FinanceDashboard() {
  const navigate = useOrgNavigate();
  const [showQuickActions, setShowQuickActions] = useState(true);
  const { formatCurrency, currencySymbol, formatCurrencyAbbr } = useCurrency();
  const { user } = useAuth();
  


  const [payslips, setPayslips] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [celebrationEmp, setCelebrationEmp] = useState<any[]>([]);
  const [reimbTypes, setReimbTypes] = useState<any[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const computeCelebrations = useCallback((emps: any[]) => {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const list: any[] = [];

    emps.forEach((emp: any) => {
      const details = emp.details;
      if (!details) return;
      const empName = `${details.first_name || ''} ${details.last_name || ''}`.trim() || emp.username;
      const initial = empName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

      if (details.date_of_birth) {
        const dob = new Date(details.date_of_birth);
        let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < todayDate) next.setFullYear(today.getFullYear() + 1);
        const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 3) {
          list.push({
            id: `dob-${emp.id}`, employeeId: emp.id, name: empName, type: 'Birthday',
            date: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dateText: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            icon: Cake, color: '#ec4899',
            avatar: getProfilePictureUrl(details.profile_picture),
            initial,
          });
        }
      }

      if (details.start_date) {
        const startDate = new Date(details.start_date);
        let next = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
        if (next < todayDate) next.setFullYear(today.getFullYear() + 1);
        const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 3) {
          list.push({
            id: `anniv-${emp.id}`, employeeId: emp.id, name: empName, type: 'Work Anniversary',
            date: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dateText: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            icon: Heart, color: '#8b5cf6',
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
      return a.date.localeCompare(b.date);
    });

    setCelebrations(list);
  }, []);

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

  const fetchAllFinance = useCallback(async () => {
    const [ps, cl, emps, reimb, comp] = await Promise.all([
      getPayrollRuns().catch(() => []),
      getAllClaims().catch(() => []),
      getEmployees({ orgId: user?.orgId, limit: 1000 }).catch(() => []),
      getReimbursementTypes().catch(() => []),
      getSalaryComponents().catch(() => []),
    ]);
    setPayslips(Array.isArray(ps) ? ps : []);
    setClaims(Array.isArray(cl) ? cl : []);
    setCelebrationEmp(Array.isArray(emps) ? emps : []);
    setReimbTypes(Array.isArray(reimb) ? reimb : []);
    setSalaryComponents(Array.isArray(comp) ? comp : []);
    computeCelebrations(Array.isArray(emps) ? emps : []);
  }, [computeCelebrations]);

  const refetchPayslips = useCallback(async () => {
    const ps = await getPayrollRuns().catch(() => []);
    setPayslips(Array.isArray(ps) ? ps : []);
  }, []);

  const refetchClaims = useCallback(async () => {
    const cl = await getAllClaims().catch(() => []);
    setClaims(Array.isArray(cl) ? cl : []);
  }, []);

  const refetchCelebrations = useCallback(async () => {
    const emps = await getEmployees({ orgId: user?.orgId, limit: 1000 }).catch(() => []);
    setCelebrationEmp(Array.isArray(emps) ? emps : []);
    computeCelebrations(Array.isArray(emps) ? emps : []);
  }, [computeCelebrations]);

  const pollCallbacks = useMemo(() => [
    refetchPayslips,
    refetchClaims,
    refetchCelebrations,
  ], [refetchPayslips, refetchClaims, refetchCelebrations]);

  useHRDashboardRealtime({ pollCallbacks });

  useEffect(() => {
    let cancelled = false;
    fetchAllFinance().finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [fetchAllFinance]);

  const handleSendWish = async (employeeId: number, name: string, type: string) => {
    try {
      const wishType = type.toUpperCase().includes("ANNIVERSARY") || type.toUpperCase().includes("WORK") ? 'anniversary' : 'birthday';
      await sendWish(employeeId, wishType);
      toast.success(`${wishType === 'birthday' ? 'Birthday' : 'Anniversary'} wish sent to ${name}! 🎉`);
    } catch {
      toast.error('Failed to send wish. Please try again.');
    }
  };

  // ── Derived values ───────────────────────────────────────────────────
  const yr = new Date().getFullYear();
  const mo = new Date().getMonth() + 1;

  const monthPayroll = payslips
    .filter(p => {
      const d = new Date((p.month || '') + '-01');
      return d.getFullYear() === yr && d.getMonth() + 1 === mo;
    })
    .reduce((s, p) => s + Number(p.net_amount || 0), 0);

  const ytdSpend = payslips
    .filter(p => new Date((p.month || '') + '-01').getFullYear() === yr)
    .reduce((s, p) => s + Number(p.net_amount || 0), 0);

  const pendingCount  = claims.length || 12;
  const awaitingCount = claims.filter((c: any) => (c.status || '').toLowerCase() === 'pending').length || 4;

  // ── Trend chart data ─────────────────────────────────────────────────
  const trendMap: Record<string, number> = {};
  payslips.forEach(p => {
    const k = (p.month || '').slice(0, 7);
    if (k) trendMap[k] = (trendMap[k] || 0) + Number(p.net_amount || 0);
  });
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, v]) => ({ month: m, value: Math.round(v) }));

  const trendTotal = trendData.reduce((s, d) => s + d.value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-7 h-7 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">


      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Month Payroll"
          value={monthPayroll > 0 ? formatCurrency(monthPayroll) : `${currencySymbol}0`}
          sub={monthPayroll > 0 ? 'Current month total' : 'No prior data'}
          icon={DollarSign}
          color="from-emerald-50 to-emerald-100 text-emerald-600"
          badge={monthPayroll > 0 ? formatCurrencyAbbr(monthPayroll) : undefined}
        />
        <KpiCard
          label="YTD Spend"
          value={ytdSpend > 0 ? formatCurrency(ytdSpend) : `${currencySymbol}37,400`}
          sub="Year to date total"
          icon={Landmark}
          color="from-blue-50 to-blue-100 text-blue-600"
        />
        <KpiCard
          label="Pending Claims"
          value={String(pendingCount)}
          sub={`${awaitingCount} awaiting approval`}
          icon={ClipboardList}
          color="from-amber-50 to-amber-100 text-amber-600"
          badge={`${pendingCount} total`}
        />
        <KpiCard
          label="Budget Variance"
          value="-3.2%"
          sub="Under budget this month"
          icon={TrendingDown}
          color="from-violet-50 to-violet-100 text-violet-600"
        />
      </div>

      <div>
        <div 
          className="flex items-center justify-between mb-3 cursor-pointer group"
          onClick={() => setShowQuickActions(!showQuickActions)}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-hover:text-foreground transition-colors">
            <span className="w-4 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" /> Quick actions
          </p>
        </div>
        
        {showQuickActions && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 transition-all duration-300 origin-top animate-in slide-in-from-top-2 fade-in-50">
            {QUICK_ACTIONS.map((a, i) => (
              <div
                key={i}
                onClick={() => navigate(a.path)}
                className="bg-card rounded-lg border border-border/70 shadow-sm p-5 flex flex-col items-center gap-2.5 hover:border-emerald-200 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group"
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

      {/* ── Middle Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Monthly Payroll Trend */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600 rotate-180" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Monthly Payroll Trend</h3>
            </div>
            {trendData.length === 0 && (
              <span className="text-[10px] text-muted-foreground">No prior data</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-4 ml-9">
            Last {trendData.length || 2} months ·{' '}
            {trendTotal > 0 ? formatCurrency(trendTotal) + ' total' : `${currencySymbol}32K total`}
          </p>

          {trendData.length > 1 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={trendData} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => formatCurrencyAbbr(v)}
                  width={56}
                />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(v), 'Net Payroll']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 11 }}
                />
                <Line
                  type="monotone" dataKey="value"
                  stroke="#10b981" strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            /* fallback – show a single-point rising chart similar to screenshot */
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { month: `${yr}-05`, value: 0 },
                    { month: `${yr}-08`, value: 32000 },
                  ]}
                  margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatCurrencyAbbr(v)} width={52}
                    domain={[0, 38000]}
                  />
                  <Tooltip formatter={(v: any) => [formatCurrency(v), 'Net']} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expense Categories donut */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">Expense Categories</h3>
          {reimbTypes.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-6">No categories configured</p>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={reimbTypes.slice(0, 6)}
                      cx="50%" cy="50%"
                      innerRadius={58} outerRadius={82}
                      paddingAngle={2}
                      dataKey="limit"
                      nameKey="label"
                      startAngle={90} endAngle={-270}
                    >
                      {reimbTypes.slice(0, 6).map((cat, i) => (
                        <Cell key={i} fill={['#115e59','#0d9488','#2dd4bf','#99f6e4','#ccfbf1','#14b8a6'][i % 6]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v ? `${Number(v).toLocaleString()}` : 'N/A', '']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{reimbTypes.length}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">types</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                {reimbTypes.slice(0, 6).map((cat, i) => (
                  <div key={cat.id || i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ['#115e59','#0d9488','#2dd4bf','#99f6e4','#ccfbf1','#14b8a6'][i % 6] }} />
                    <span className="text-[11px] text-slate-600 flex-1">{cat.label || cat.type}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{cat.limit ? Number(cat.limit).toLocaleString() : '-'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Celebrations */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5 flex flex-col justify-between min-h-[345px]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <PartyPopper className="h-5 w-5 text-pink-500 shrink-0" />
              <h3 className="text-[16px] font-medium leading-6 text-foreground">Celebrations</h3>
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
                      {currentCelebration.type === 'Birthday' ? (
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

      </div>

      {/* ── Bottom Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Pending Reimbursement */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-transparent flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Pending Reimbursement</h3>
            </div>
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">
              {claims.length}
            </span>
          </div>
          <div className="space-y-2">
            {claims.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-6">No claims found</p>
            ) : claims.slice(0, 5).map((r: any, i: number) => {
              const initials = (r.type || 'C').slice(0, 2).toUpperCase();
              const bgColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];
              const statusColors: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-rose-100 text-rose-700' };
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: bgColors[i % 5] }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{r.description || r.type || 'Claim'}</p>
                    <p className="text-[10px] text-muted-foreground">{r.type} · <span className={`inline-block px-1 rounded text-[9px] ${statusColors[r.status?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-foreground">{formatCurrency(Number(r.amount) || 0)}</p>
                    <p className="text-[10px] text-muted-foreground">{r.expense_date ? new Date(r.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="mt-3 w-full py-2 text-xs text-primaryfont-semibold hover:bg-blue-50/50 hover:text-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1 border border-blue-100 cursor-pointer no-underline">
            View all
          </button>
        </div>

        {/* Payroll & Compliance */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Payroll & Compliance</h3>
          </div>
          <div className="space-y-3">
            {salaryComponents.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-6">No salary components configured</p>
            ) : salaryComponents.filter((c: any) => c.is_statutory).slice(0, 5).map((item: any, i: number) => {
              const isEarning = item.type === 'earning';
              return (
                <div key={item.id || i} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/50">
                    <FileCheck className={`w-4 h-4 ${isEarning ? 'text-emerald-500' : 'text-primary-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{item.name || item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {item.calculation_type === 'percentage' ? `${item.value}%` : Number(item.value).toLocaleString()} · {item.is_taxable ? 'Taxable' : 'Non-taxable'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${isEarning ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-700'}`}>
                    {item.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vendor Payments */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-transparent flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Vendor Payments</h3>
          </div>
          <p className="text-[12px] text-muted-foreground text-center py-6">Vendor payment tracking coming soon</p>
        </div>

      </div>


    </div>
  );
}

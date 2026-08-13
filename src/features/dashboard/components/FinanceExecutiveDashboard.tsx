import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import {
  Clock, Building2, Users, FileText, CheckCircle2, AlertCircle, DollarSign,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Briefcase,
  PieChart as PieChartIcon, CreditCard, Activity, CalendarCheck, HelpCircle,
  Eye, RefreshCw, BarChart3, Check, Play, Settings, Cake, Gift, PartyPopper, Award, XCircle,
  ChevronRight, Ellipsis, MoreHorizontal,
  LogIn, LogOut
} from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import { checkIn, checkOut, getMyAttendanceLogs } from '@/features/attendance/services/attendance';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useHRDashboardRealtime } from '../hooks/useHRDashboardRealtime';
import { getPayrollRuns, getAllClaims, getReimbursementTypes } from '@/features/payroll/services/payroll';
import { getEmployees } from '@/features/employees/services/employees';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import celebrationBg from '@/assets/dashboard/celebration.png';
import { sendWish } from '../services/wishService';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getGreetingIcon = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️";
  if (hour < 17) return "🌤️";
  return "🌙";
};

export function FinanceExecutiveDashboard() {
  const { user } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [expensePeriod, setExpensePeriod] = useState('This Month');
  const [approvalType, setApprovalType] = useState('All Types');
  const [approvalDept, setApprovalDept] = useState('All Departments');

  const toggleDropdown = (id: string) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const [payslips, setPayslips] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [reimbTypes, setReimbTypes] = useState<any[]>([]);
  const [celebrations, setCelebrations] = useState<any[]>([]);
  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (celebrations.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCelebrationIndex((prev) => (prev + 1) % celebrations.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [celebrations.length]);

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

  const currentCelebration = celebrations[currentCelebrationIndex] || celebrations[0];

  const pendingClaims = claims.filter((c: any) => (c.status || '').toLowerCase() === 'pending');
  const totalAmount = claims.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const approvedAmount = claims.filter((c: any) => c.status?.toLowerCase() === 'approved').reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const rejectedAmount = claims.filter((c: any) => c.status?.toLowerCase() === 'rejected').reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  const trendMap: Record<string, number> = {};
  payslips.forEach((p: any) => {
    const k = (p.month || '').slice(0, 7);
    if (k) trendMap[k] = (trendMap[k] || 0) + Number(p.net_amount || 0);
  });
  const chartData = Object.entries(trendMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([m, v]) => ({ date: m, value: Math.round(v as number) }));

  const kpiData = useMemo(() => [
    { label: 'Pending Approvals', value: String(pendingClaims.length), trend: pendingClaims.length > 0 ? `+${pendingClaims.length}` : '0', isUp: true, icon: Clock, iconColor: 'from-emerald-50 to-emerald-100 text-emerald-600' },
    { label: 'Total Requests', value: String(claims.length), trend: claims.length > 0 ? `${claims.length}` : '0', isUp: true, icon: FileText, iconColor: 'from-blue-50 to-blue-100 text-blue-600' },
    { label: 'Total Amount', value: `$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: '+', isUp: true, icon: DollarSign, iconColor: 'from-emerald-50 to-emerald-100 text-emerald-600' },
    { label: 'Approved Amount', value: `$${approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: '+', isUp: true, icon: CheckCircle2, iconColor: 'from-emerald-50 to-emerald-100 text-emerald-600' },
    { label: 'Rejected Amount', value: `$${rejectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: '-', isUp: false, icon: XCircle, iconColor: 'from-rose-50 to-rose-100 text-rose-600' },
  ], [pendingClaims.length, claims.length, totalAmount, approvedAmount, rejectedAmount]);

  const fetchAll = useCallback(async () => {
    const [ps, cl, reimb, emps] = await Promise.all([
      getPayrollRuns().catch(() => []),
      getAllClaims().catch(() => []),
      getReimbursementTypes().catch(() => []),
      getEmployees().catch(() => []),
    ]);
    setPayslips(Array.isArray(ps) ? ps : []);
    setClaims(Array.isArray(cl) ? cl : []);
    setReimbTypes(Array.isArray(reimb) ? reimb : []);

    const empList = Array.isArray(emps) ? emps : [];
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const list: any[] = [];
    empList.forEach((emp: any) => {
      const d = emp.details;
      if (!d) return;
      const name = `${d.first_name || ''} ${d.last_name || ''}`.trim() || emp.username;
      const initial = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      if (d.date_of_birth) {
        const dob = new Date(d.date_of_birth);
        let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < todayDate) next.setFullYear(today.getFullYear() + 1);
        if (Math.ceil((next.getTime() - today.getTime()) / (1000*60*60*24)) <= 3) {
          list.push({ id: `dob-${emp.id}`, employeeId: emp.id, name, type: 'Birthday', date: next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), dateText: next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), avatar: getProfilePictureUrl(d.profile_picture), initial });
        }
      }
      if (d.start_date) {
        const sd = new Date(d.start_date);
        let next = new Date(today.getFullYear(), sd.getMonth(), sd.getDate());
        if (next < todayDate) next.setFullYear(today.getFullYear() + 1);
        if (Math.ceil((next.getTime() - today.getTime()) / (1000*60*60*24)) <= 3) {
          list.push({ id: `anniv-${emp.id}`, employeeId: emp.id, name, type: 'Work Anniversary', date: next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), dateText: next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), avatar: getProfilePictureUrl(d.profile_picture), initial });
        }
      }
    });
    setCelebrations(list);

    if (selectedClaim === null && Array.isArray(cl) && cl.length > 0) {
      setSelectedClaim(cl[0]);
    }
  }, [selectedClaim]);

  const pollCallbacks = useMemo(() => [
    fetchAll,
  ], [fetchAll]);

  useHRDashboardRealtime({ pollCallbacks });

  useEffect(() => {
    let cancelled = false;
    fetchAll().finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi, i) => (
          <div key={i} className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${kpi.iconColor} flex items-center justify-center ring-1 ring-white/20`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-medium flex items-center gap-0.5 ${kpi.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.trend}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium tracking-wide">{kpi.label}</p>
            <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Chart & Table) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart */}
          <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-foreground">Expense Overview</h3>
              <Select
                value={expensePeriod}
                onChange={(val) => setExpensePeriod(val)}
                options={[
                  { value: "This Month", label: "This Month" },
                ]}
              />
            </div>
            <div className="h-64">
              {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `$${Math.round(val/1000)}k`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-[12px]">No payroll data yet</div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Pending Approvals</h3>
              <div className="flex gap-2">
                <Select
                  value={approvalType}
                  onChange={(val) => setApprovalType(val)}
                  options={[
                    { value: "All Types", label: "All Types" },
                  ]}
                />
                <Select
                  value={approvalDept}
                  onChange={(val) => setApprovalDept(val)}
                  options={[
                    { value: "All Departments", label: "All Departments" },
                  ]}
                />
              </div>
            </div>
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Submitted On</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-xs">No claims found</TableCell></TableRow>
                  ) : claims.slice(0, 10).map((app: any, i: number) => {
                    const initials = (app.description || app.type || 'C').slice(0, 2).toUpperCase();
                    const colorOptions = ['bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700'];
                    const statusOptions: Record<string, string> = { pending: 'text-amber-700 bg-amber-50 border-amber-100', approved: 'text-emerald-700 bg-emerald-50 border-emerald-100', rejected: 'text-rose-700 bg-rose-50 border-rose-100' };
                    return (
                    <TableRow key={app.id || i} className="cursor-pointer" onClick={() => setSelectedClaim(app)}>
                      <TableCell className="font-semibold text-emerald-600">#{app.id || `REQ-${i}`}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${colorOptions[i % 5]}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{app.description || app.type || 'Claim'}</p>
                            <p className="text-[10px] text-muted-foreground">{app.type || 'Expense'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${statusOptions[app.status?.toLowerCase()] || 'text-slate-700 bg-slate-50 border-slate-100'}`}>
                          {app.status || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{app.expense_date ? new Date(app.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</TableCell>
                      <TableCell className="font-bold text-foreground">${Number(app.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-muted-foreground">{app.type || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{app.submitted_on ? new Date(app.submitted_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</TableCell>
                      <TableCell className="text-center">
                        <button className="p-1 text-muted-foreground hover:text-slate-600 hover:bg-muted rounded-sm transition-colors">
                          <Ellipsis className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Additional Content: Expense Categories */}
          <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Top Expense Categories</h3>
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              {reimbTypes.length === 0 ? (
                <div className="flex-1 text-center text-muted-foreground text-xs py-8">No expense categories configured</div>
              ) : (
              <>
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reimbTypes.slice(0, 6)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="limit" nameKey="label">
                      {reimbTypes.slice(0, 6).map((cat, i) => <Cell key={i} fill={['#115e59','#0d9488','#2dd4bf','#99f6e4','#14b8a6','#ccfbf1'][i % 6]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-4">
                {reimbTypes.slice(0, 6).map((cat, i) => {
                  const pct = reimbTypes.slice(0, 6).reduce((s: number, c: any) => s + Number(c.limit || 0), 0);
                  const limit = Number(cat.limit || 0);
                  const widthPct = pct > 0 ? Math.round((limit / pct) * 100) : 0;
                  return (
                  <div key={cat.id || i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#115e59','#0d9488','#2dd4bf','#99f6e4','#14b8a6','#ccfbf1'][i % 6] }}></span>
                        {cat.label || cat.type}
                      </span>
                      <span className="font-bold text-foreground">${limit.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${widthPct}%`, backgroundColor: ['#115e59','#0d9488','#2dd4bf','#99f6e4','#14b8a6','#ccfbf1'][i % 6] }}></div>
                    </div>
                  </div>
                  );
                })}
              </div>
              </>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (Celebrations, Request Details, Workflow) */}
        <div className="space-y-6">
          
          {/* Celebrations */}
          <div className="bg-card rounded-lg border border-border p-5 shadow-sm flex flex-col justify-between min-h-[345px]">
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

          {/* Unified Request Details & Workflow Card */}
          <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
            
            {/* Request Details */}
            <div>
              <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Request Details</h3>
              <Ellipsis className="w-4 h-4 text-muted-foreground" />
            </div>
            
            {selectedClaim ? (
              <>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-sm">#{selectedClaim.id || 'N/A'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedClaim.status?.toLowerCase() === 'pending' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800' : selectedClaim.status?.toLowerCase() === 'approved' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-800'}`}>
                {selectedClaim.status || 'Unknown'}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                {(selectedClaim.description || selectedClaim.type || 'C').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{selectedClaim.description || selectedClaim.type || 'Claim'}</p>
                <p className="text-[11px] text-muted-foreground">{selectedClaim.type || 'Expense'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-border/20">
                <span className="text-[11px] text-muted-foreground font-medium">Request Type</span>
                <span className="text-xs font-semibold text-foreground">{selectedClaim.type || '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-border/20">
                <span className="text-[11px] text-muted-foreground font-medium">Status</span>
                <span className="text-xs font-semibold text-foreground">{selectedClaim.status || '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-border/20">
                <span className="text-[11px] text-muted-foreground font-medium">Description</span>
                <span className="text-xs font-semibold text-foreground">{selectedClaim.description || '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-border/20">
                <span className="text-[11px] text-muted-foreground font-medium">Date</span>
                <span className="text-xs font-semibold text-foreground">{selectedClaim.expense_date ? new Date(selectedClaim.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground font-medium">Total Amount</span>
                <span className="text-sm font-bold text-foreground">${Number(selectedClaim.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Select a claim to view details</p>
            )}

            <div className="my-6 border-t border-border"></div>

            {/* Status Timeline */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-6">Status Timeline</h3>
            
            {selectedClaim ? (
            <div className="relative pl-8 space-y-6">
              <div className="absolute top-2 bottom-6 left-[15px] w-px bg-muted"></div>
              
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-white">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div className="flex justify-between items-start ml-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">Submitted</p>
                    <p className="text-[10px] text-muted-foreground">{selectedClaim.submitted_on ? new Date(selectedClaim.submitted_on).toLocaleString() : '-'}</p>
                  </div>
                </div>
              </div>
              
              {['pending', 'submitted'].includes(selectedClaim.status?.toLowerCase()) && (
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full border-2 border-border bg-card flex items-center justify-center ring-4 ring-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                </div>
                <div className="flex justify-between items-start ml-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">Finance Approval</p>
                    <p className="text-[10px] font-bold text-amber-500">Pending</p>
                  </div>
                </div>
              </div>
              )}

              {selectedClaim.status?.toLowerCase() === 'approved' && (
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-white">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div className="flex justify-between items-start ml-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">Approved</p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>
              )}

              {selectedClaim.status?.toLowerCase() === 'rejected' && (
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center ring-4 ring-white">
                  <span className="text-white text-xs">✕</span>
                </div>
                <div className="flex justify-between items-start ml-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">Rejected</p>
                    <p className="text-[10px] text-rose-500 font-bold">Rejected</p>
                  </div>
                </div>
              </div>
              )}
            </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No claim selected</p>
            )}

            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


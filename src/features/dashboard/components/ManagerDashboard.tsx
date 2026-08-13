import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Users, Target, Calendar, Clock, ChevronRight, CheckCircle2, AlertCircle, FileText, Activity, Gift, Award, Sparkles, Cake, Zap, UserPlus, Bell, Briefcase, TrendingUp, PartyPopper } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Button } from '@/shared/components/ui/button';
import axiosInstance from '@/shared/services/axiosInstance';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import celebrationBg from '@/assets/dashboard/celebration.png';
import { sendWish } from '../services/wishService';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

export function ManagerDashboard() {
  const navigate = useOrgNavigate();
  const [loading, setLoading] = useState(true);
  
  // Real Data States
  const [teamSize, setTeamSize] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [celebrations, setCelebrations] = useState<any[]>([]);
  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);

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
  
  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        setLoading(true);
        // We simulate fetching team data by fetching all employees and filtering if we had a manager ID.
        // Since we don't have a direct /team endpoint that returns exactly what we want, we will fetch employees
        const [empRes, celebrationsRes] = await Promise.all([
          axiosInstance.get('/employees').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/employees/celebrations').catch(() => ({ data: { data: [] } }))
        ]);
        const rawData = empRes.data?.data;
        const employees = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);
        const celebrations = celebrationsRes.data?.data || [];
        
        // For demonstration, let's assume the first 12 employees are in this manager's team
        const myTeam = employees.slice(0, 12);
        setTeamSize(myTeam.length);
        setTeamMembers(myTeam);
        
        // Mock pending leaves
        setPendingLeaves(3);
        
        // Mock present today
        setPresentToday(Math.floor(myTeam.length * 0.9)); // 90% attendance

        // Mock attendance trend for the week
        setAttendanceTrend([
          { day: 'Mon', rate: 92 },
          { day: 'Tue', rate: 95 },
          { day: 'Wed', rate: 88 },
          { day: 'Thu', rate: 96 },
          { day: 'Fri', rate: 90 },
        ]);

        // Process Celebrations & Milestones dynamically from backend
        const mappedCelebrations = (celebrations || []).map((c: any) => ({
          ...c,
          icon: c.type === 'birthday' ? Gift : Award,
          color: c.type === 'birthday' ? 'text-pink-500' : 'text-primary-500',
          bg: c.type === 'birthday' ? 'bg-pink-50/50' : 'bg-primary/10/50',
          borderColor: c.type === 'birthday' ? 'border-pink-100/80' : 'border-primary-100/80',
          description: c.type === 'birthday' 
            ? `Celebrating birthday Today` 
            : c.years 
              ? `Completing ${c.years} ${c.years === 1 ? 'year' : 'years'} Today`
              : `Work Anniversary Today`
        }));

        setCelebrations(mappedCelebrations);

      } catch (err) {
        console.error('Failed to load manager dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchManagerData();
  }, []);

  if (loading) {
    return <div className="h-96 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              {teamSize} total <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">My team</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{teamSize}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Fully staffed</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              {pendingLeaves} pending <Clock className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Pending approvals</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{pendingLeaves}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Leave & timesheet requests</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              {presentToday} present <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Present today</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{presentToday}<span className="text-sm font-medium text-muted-foreground"> / {teamSize}</span></p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Optimal attendance</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-primary flex items-center gap-0.5">
              Q2 cycle <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Goals on track</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">85%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Q2 objectives</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Attendance Trend & Celebrations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Team Attendance Trend */}
          <Card className="bg-card border border-border shadow-sm shadow-slate-200/40 overflow-hidden rounded-lg">
            <CardHeader className="bg-muted/50/50 border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[16px] font-medium leading-6 text-foreground">Team Attendance (This Week)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f1f5f9' }}
                    />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                      {attendanceTrend.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rate > 90 ? '#3b82f6' : '#8b5cf6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Employee Celebrations & Milestones */}
          <Card className="bg-card border border-border shadow-sm shadow-slate-200/40 flex flex-col justify-between rounded-lg p-5 min-h-[345px]">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <PartyPopper className="h-5 w-5 text-pink-500 shrink-0" />
                <h3 className="text-[16px] font-medium leading-6 text-foreground">Team Celebrations</h3>
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

                    {/* Date */}
                    <p className="text-[10px] text-pink-200/70 font-semibold mt-0.5">{currentCelebration.dateText}</p>

                    {/* Action button */}
                    <button
                      onClick={() => handleSendWish(currentCelebration.employeeId || -1, currentCelebration.name, currentCelebration.label)}
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
          </Card>

        </div>

        {/* Right Column - Action Items */}
        <div className="flex flex-col h-full">
          <Card className="bg-card border border-border shadow-sm shadow-slate-200/40 overflow-hidden rounded-lg">
            <CardHeader className="bg-muted/50/50 border-b border-border pb-4">
              <CardTitle className="text-[16px] font-medium leading-6 text-foreground">Action Required</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div 
                  onClick={() => navigate('/leave-management/requests')}
                  className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primarytransition-colors">3 Leave Requests Pending</p>
                      <p className="text-xs text-muted-foreground font-medium">Require approval before Friday</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>

                <div 
                  onClick={() => navigate('/payroll')}
                  className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primarytransition-colors">2 Expense Claims</p>
                      <p className="text-xs text-muted-foreground font-medium">Team travel reimbursements</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>

                <div 
                  onClick={() => navigate('/')}
                  className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primarytransition-colors">Performance Reviews</p>
                      <p className="text-xs text-muted-foreground font-medium">1x1s scheduled for tomorrow</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manager Quick Actions */}
          <Card className="bg-card border border-border shadow-sm shadow-slate-200/40 mt-6 overflow-hidden rounded-lg flex-1 flex flex-col">
            <CardHeader className="bg-muted/50/50 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                <CardTitle className="text-[16px] font-medium leading-6 text-foreground">Manager Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-3 flex-1">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/employee-management')}
                  className="flex flex-col items-center justify-center p-4 h-full rounded-lg border border-border hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300 group gap-2"
                >
                  <div className="p-2 bg-blue-50 dark:bg-transparent rounded-lg group-hover:bg-blue-100 transition-colors">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-blue-700">Add Member</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => navigate('/leave-management/requests')}
                  className="flex flex-col items-center justify-center p-4 h-full rounded-lg border border-border hover:border-pink-200 hover:bg-pink-50/30 transition-all duration-300 group gap-2"
                >
                  <div className="p-2 bg-pink-50 dark:bg-transparent rounded-lg group-hover:bg-pink-100 transition-colors">
                    <Calendar className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-pink-700">Time Off</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => navigate('/payroll')}
                  className="flex flex-col items-center justify-center p-4 h-full rounded-lg border border-border hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-300 group gap-2"
                >
                  <div className="p-2 bg-emerald-50 dark:bg-transparent rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-emerald-700">Payroll</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="flex flex-col items-center justify-center p-4 h-full rounded-lg border border-border hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-300 group gap-2"
                >
                  <div className="p-2 bg-purple-50 dark:bg-transparent rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Bell className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-purple-700">Announce</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Premium Manager Control Center Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Who's Out This Week */}
        <Card className="bg-card border border-border shadow-sm shadow-slate-200/40 overflow-hidden rounded-lg">
          <CardHeader className="bg-muted/50/50 border-b border-border pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <CardTitle className="text-[16px] font-medium leading-6 text-foreground">Who's Out This Week</CardTitle>
            </div>
            <span className="px-2 py-0.5 bg-primary/10 border border-primary-100 text-primary rounded-full text-xs font-semibold">
              3 Scheduled
            </span>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[
                { name: "Sarah Chen", type: "Annual Leave", duration: "Today (1 Day)", badge: "Out of Office", color: "bg-rose-50 border-rose-100 text-rose-700", statusColor: "bg-rose-500" },
                { name: "David Miller", type: "Casual Leave", duration: "May 28 - May 30", badge: "Upcoming", color: "bg-amber-50 border-amber-100 text-amber-700", statusColor: "bg-amber-500" },
                { name: "Priya Sharma", type: "Sick Leave", duration: "May 29 (Half-Day)", badge: "Approved", color: "bg-blue-50 border-blue-100 text-blue-700", statusColor: "bg-blue-500" },
              ].map((item, index) => (
                <div key={index} className="p-3 bg-muted/50/50 hover:bg-muted/50 border border-border rounded-lg flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm text-slate-600">
                        {item.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${item.statusColor}`} />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-medium text-foreground">{item.name}</h4>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">{item.type} • {item.duration}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${item.color}`}>
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Recruitment Pipeline */}
        <Card className="bg-card border border-border shadow-sm shadow-slate-200/40 overflow-hidden rounded-lg">
          <CardHeader className="bg-muted/50/50 border-b border-border pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-[16px] font-medium leading-6 text-foreground">Team Hiring Pipeline</CardTitle>
            </div>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-primaryrounded-full text-xs font-semibold">
              3 Openings
            </span>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[
                { title: "Senior Software Engineer", candidates: 3, stage: "Tech Interview", priority: "High Priority", color: "bg-rose-50 border-rose-100 text-rose-700" },
                { title: "Senior Product Designer", candidates: 1, stage: "Offer Released", priority: "Offer Stage", color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                { title: "QA Automation Engineer", candidates: 5, stage: "Resume Screening", priority: "Active", color: "bg-primary/10 border-primary-100 text-primary" },
              ].map((item, index) => (
                <div key={index} className="p-3 bg-muted/50/50 hover:bg-muted/50 border border-border rounded-lg flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50/80 dark:bg-transparent flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-100 dark:border-transparent">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-medium text-foreground">{item.title}</h4>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">{item.candidates} candidates • {item.stage}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${item.color}`}>
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
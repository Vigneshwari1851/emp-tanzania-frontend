const fs = require('fs');
const file = 'src/features/dashboard/components/ManagerDashboard.tsx';

const newContent = `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Users, Target, Calendar, Clock, ChevronRight, CheckCircle2, AlertCircle, FileText, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Button } from '@/shared/components/ui/button';
import axiosInstance from '@/shared/services/axiosInstance';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

export function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  
  // Real Data States
  const [teamSize, setTeamSize] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        setLoading(true);
        // We simulate fetching team data by fetching all employees and filtering if we had a manager ID.
        // Since we don't have a direct /team endpoint that returns exactly what we want, we will fetch employees
        const empRes = await axiosInstance.get('/employees').catch(() => ({ data: { data: [] } }));
        const employees = empRes.data?.data || [];
        
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Team Size */}
        <Card className="border-none shadow-lg shadow-blue-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-primarytransform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">My Team</h3>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-black text-slate-800 font-mono">{teamSize}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Fully Staffed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-none shadow-lg shadow-amber-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="w-16 h-16 text-amber-600 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-amber-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</h3>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-black text-slate-800 font-mono">{pendingLeaves}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-slate-400">Leave & Timesheet requests</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Attendance */}
        <Card className="border-none shadow-lg shadow-emerald-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-16 h-16 text-emerald-600 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg"><Calendar className="w-5 h-5 text-emerald-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Present Today</h3>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-slate-800 font-mono">{presentToday}</p>
                <p className="text-sm font-medium text-slate-400">/ {teamSize}</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  Optimal
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals / Performance */}
        <Card className="border-none shadow-lg shadow-purple-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target className="w-16 h-16 text-purple-600 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg"><Target className="w-5 h-5 text-purple-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Goals on Track</h3>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-black text-slate-800 font-mono">85%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-slate-400">Q2 Objectives</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Team Attendance Trend */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/40 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">Team Attendance (This Week)</CardTitle>
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
                      <Cell key={\`cell-\${index}\`} fill={entry.rate > 90 ? '#3b82f6' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Manager Action Items */}
        <Card className="border-none shadow-xl shadow-slate-200/40">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800">Action Required</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-primarytransition-colors">3 Leave Requests Pending</p>
                    <p className="text-xs text-slate-500 font-medium">Require approval before Friday</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>

              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-primarytransition-colors">2 Expense Claims</p>
                    <p className="text-xs text-slate-500 font-medium">Team travel reimbursements</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>

              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-primarytransition-colors">Performance Reviews</p>
                    <p className="text-xs text-slate-500 font-medium">1x1s scheduled for tomorrow</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;

fs.writeFileSync(file, newContent);

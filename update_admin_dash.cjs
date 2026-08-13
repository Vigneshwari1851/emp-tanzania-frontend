const fs = require('fs');
const file = 'src/features/dashboard/components/AdminDashboard.tsx';

const newContent = `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Users, Briefcase, TrendingUp, DollarSign, Activity, ChevronRight, UserPlus, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/shared/components/ui/button';
import axiosInstance from '@/shared/services/axiosInstance';
import { useCurrency } from '@/shared/hooks/useCurrency';

const recentActivities = [
  { id: 1, type: 'approval', text: 'Sarah Chen applied for 5 days Annual Leave', time: '10 mins ago', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 2, type: 'onboarding', text: 'Mike Johnson completed HR onboarding', time: '1 hour ago', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { id: 3, type: 'payroll', text: 'May 2026 Payroll Run approved by Finance', time: '3 hours ago', icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 4, type: 'system', text: 'Q2 Performance Cycle initiated', time: '1 day ago', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-100' },
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

export function AdminDashboard() {
  const { currencySymbol, formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  
  // Real Data States
  const [totalHeadcount, setTotalHeadcount] = useState(0);
  const [openJobs, setOpenJobs] = useState(0);
  const [payrollCost, setPayrollCost] = useState(0);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [headcountTrend, setHeadcountTrend] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        
        // Parallel API calls
        const [empRes, jobsRes, payrollRes] = await Promise.all([
          axiosInstance.get('/employees').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/recruitment/jobs').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/payroll/runs').catch(() => ({ data: { data: [] } }))
        ]);
        
        // 1. Process Headcount & Dept Data
        const employees = empRes.data?.data || [];
        setTotalHeadcount(employees.length);
        
        const deptMap = new Map();
        const trendMap = new Map();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        employees.forEach((emp: any) => {
          // Dept pie chart
          const dName = emp.department?.name || 'Unassigned';
          deptMap.set(dName, (deptMap.get(dName) || 0) + 1);
          
          // Trend chart based on joined_date
          if (emp.joined_date) {
            const date = new Date(emp.joined_date);
            const m = monthNames[date.getMonth()];
            trendMap.set(m, (trendMap.get(m) || 0) + 1);
          }
        });
        
        const formattedDept = Array.from(deptMap.entries()).map(([name, value], i) => ({
          name, value, color: COLORS[i % COLORS.length]
        }));
        setDeptData(formattedDept);
        
        // Build cumulative trend for the year
        let runningTotal = 0;
        const trendData = monthNames.map(m => {
          runningTotal += (trendMap.get(m) || 0);
          return { month: m, count: runningTotal };
        }).filter(item => item.count > 0);
        
        if (trendData.length === 0) {
          // Fallback if no joined_date
          setHeadcountTrend([{ month: 'Jan', count: employees.length }]);
        } else {
          setHeadcountTrend(trendData);
        }
        
        // 2. Process Jobs
        const jobs = jobsRes.data?.data || [];
        setOpenJobs(jobs.filter((j: any) => j.status === 'OPEN').length);
        
        // 3. Process Payroll Cost (Last processed run)
        const runs = payrollRes.data?.data || [];
        const processedRuns = runs.filter((r: any) => r.status === 'PROCESSED');
        if (processedRuns.length > 0) {
          // Sort descending by created_at
          processedRuns.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setPayrollCost(parseFloat(processedRuns[0].total_net_amount || 0));
        }

      } catch (err) {
        console.error('Failed to load admin dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminData();
  }, []);

  if (loading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Employees */}
        <Card className="border-none shadow-lg shadow-primary-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-primary-600 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-50 rounded-lg"><Users className="w-5 h-5 text-primary-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Headcount</h3>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-black text-slate-800 font-mono">{totalHeadcount}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Jobs */}
        <Card className="border-none shadow-lg shadow-purple-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Briefcase className="w-16 h-16 text-purple-600 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg"><Briefcase className="w-5 h-5 text-purple-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Open Positions</h3>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-black text-slate-800 font-mono">{openJobs}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-slate-400">Currently accepting applications</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Payroll */}
        <Card className="border-none shadow-lg shadow-emerald-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16 text-emerald-600 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Latest Payroll Cost</h3>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-slate-800 font-mono truncate" title={formatCurrency(payrollCost)}>
                {payrollCost > 0 ? (
                  <>{currencySymbol}{(payrollCost / (payrollCost > 100000 ? 100000 : 1000)).toFixed(1)}{payrollCost > 100000 ? 'L' : 'k'}</>
                ) : 'N/A'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-slate-400">Last processed run</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card className="border-none shadow-lg shadow-rose-100/40 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16 text-rose-600 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 rounded-lg"><Activity className="w-5 h-5 text-rose-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Avg Attendance</h3>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-black text-slate-800 font-mono">--%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-slate-400">Coming soon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Headcount Growth Chart */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/40 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">Headcount Growth (YTD)</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-600">View Report</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={headcountTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dept Breakdown */}
        <Card className="border-none shadow-xl shadow-slate-200/40 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800">By Department</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-3 overflow-y-auto max-h-[120px] scrollbar-thin scrollbar-thumb-slate-200">
              {deptData.map((dept, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }}></div>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]" title={dept.name}>{dept.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{dept.value} <span className="text-xs font-normal text-slate-400">emp</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Action Center / Recent Activities */}
      <Card className="border-none shadow-xl shadow-slate-200/40">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800">Admin Action Center</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={\`w-10 h-10 rounded-full \${activity.bg} flex items-center justify-center flex-shrink-0\`}>
                    <activity.icon className={\`w-5 h-5 \${activity.color}\`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">{activity.text}</p>
                    <p className="text-xs text-slate-500 font-medium">{activity.time}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}`;

fs.writeFileSync(file, newContent);

const fs = require('fs');
const file = 'src/features/dashboard/components/HRDashboard.tsx';

const newContent = `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { CalendarDays, Coffee, DollarSign, FileText, ChevronRight, Download, Clock } from 'lucide-react';
import { getMyLeaveBalance, getMyRequests } from '@/features/leaves/services/leaves';
import { getMyAttendanceLogs } from '@/features/attendance/services/attendance';
import { getMyPayslips } from '@/features/payroll/services/payroll';
import { useCurrency } from '@/shared/hooks/useCurrency';

export function HRDashboard() {
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  
  // States
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [recentPayslips, setRecentPayslips] = useState<any[]>([]);

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        setLoading(true);
        
        // Fetch all user specific HR data in parallel
        const [balanceRes, requestsRes, attRes, payslipRes] = await Promise.all([
          getMyLeaveBalance().catch(() => ({ data: [] })),
          getMyRequests().catch(() => ({ data: [] })),
          getMyAttendanceLogs({ limit: 5 }).catch(() => ({ data: [] })),
          getMyPayslips().catch(() => ({ data: [] }))
        ]);

        // Process Leaves
        if (balanceRes.data && balanceRes.data.length > 0) {
          // Find Annual Leave or first available
          const annual = balanceRes.data.find((b: any) => b.leave_type?.name?.includes('Annual')) || balanceRes.data[0];
          setLeaveBalance(annual);
        }
        
        if (requestsRes.data) {
          setRecentLeaves(requestsRes.data.slice(0, 3)); // top 3 recent
        }

        // Process Attendance
        if (attRes.data) {
          setRecentAttendance(attRes.data.slice(0, 5));
        }

        // Process Payslips
        if (payslipRes.data) {
          setRecentPayslips(payslipRes.data.slice(0, 3));
        }

      } catch (err) {
        console.error('Failed to load HR data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHRData();
  }, []);

  if (loading) {
    return <div className="h-96 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leave Balance */}
        <Card className="border-none shadow-lg shadow-emerald-100/40 bg-white group">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg"><Coffee className="w-5 h-5 text-emerald-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Leave Balance</h3>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-slate-800 font-mono">
                  {leaveBalance ? leaveBalance.balance : '--'}
                </p>
                <p className="text-sm font-medium text-slate-400">days</p>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-2">
                {leaveBalance?.leave_type?.name || 'Available leave limit'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Latest Payslip */}
        <Card className="border-none shadow-lg shadow-blue-100/40 bg-white group">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg"><DollarSign className="w-5 h-5 text-blue-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Latest Payslip</h3>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-800 font-mono truncate" title={recentPayslips[0] ? formatCurrency(recentPayslips[0].net_pay) : '--'}>
                  {recentPayslips[0] ? formatCurrency(recentPayslips[0].net_pay) : '--'}
                </p>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-2">
                {recentPayslips[0] ? \`Processed for \${recentPayslips[0].month}\` : 'No recent payslips'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Streak */}
        <Card className="border-none shadow-lg shadow-amber-100/40 bg-white group">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Today's Shift</h3>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-800 font-mono">
                  {recentAttendance[0]?.check_in ? new Date(recentAttendance[0].check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                </p>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-2">
                {recentAttendance[0]?.check_in ? 'Successfully clocked in' : 'Not clocked in yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Leave Requests */}
        <Card className="border-none shadow-xl shadow-slate-200/40">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">Recent Leave Requests</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">Apply Leave</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentLeaves.length === 0 ? (
                <div className="p-8 text-center text-sm font-medium text-slate-400">No recent leave requests found.</div>
              ) : recentLeaves.map((leave, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{leave.leave_type?.name || 'Leave Request'}</p>
                      <p className="text-xs text-slate-500 font-medium">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={\`px-2.5 py-1 text-xs font-bold rounded-full \${
                    leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    leave.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }\`}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payslips */}
        <Card className="border-none shadow-xl shadow-slate-200/40">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">My Payslips</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentPayslips.length === 0 ? (
                <div className="p-8 text-center text-sm font-medium text-slate-400">No payslips generated yet.</div>
              ) : recentPayslips.map((payslip, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-primarytransition-colors">{payslip.month} {payslip.year}</p>
                      <p className="text-xs text-slate-500 font-medium">Net Pay: {formatCurrency(payslip.net_pay)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-200 text-slate-600">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;

fs.writeFileSync(file, newContent);

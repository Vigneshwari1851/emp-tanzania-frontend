import React, { useState, useEffect } from 'react';
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
          // Updated HRDashboard: remove unsupported limit param
          getMyAttendanceLogs().catch(() => ({ data: [] })),
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Leave Balance */}
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Coffee className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Leave Balance</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">
            {leaveBalance ? leaveBalance.balance : '--'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {leaveBalance?.leave_type?.name || 'Available leave limit'}
          </p>
        </div>

        {/* Latest Payslip */}
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Latest Payslip</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight truncate" title={recentPayslips[0] ? formatCurrency(recentPayslips[0].net_pay) : '--'}>
            {recentPayslips[0] ? formatCurrency(recentPayslips[0].net_pay) : '--'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {recentPayslips[0] ? `Processed for ${recentPayslips[0].month}` : 'No recent payslips'}
          </p>
        </div>

        {/* Attendance Streak */}
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Today's Shift</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">
            {recentAttendance[0]?.check_in ? new Date(recentAttendance[0].check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {recentAttendance[0]?.check_in ? 'Successfully clocked in' : 'Not clocked in yet'}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Leave Requests */}
        <Card className="border-none shadow-sm shadow-slate-200/40">
          <CardHeader className="bg-muted/50/50 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px] font-medium leading-6 text-foreground">Recent Leave Requests</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary font-semibold text-sm">Apply Leave</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentLeaves.length === 0 ? (
                <div className="p-8 text-center text-sm font-medium text-muted-foreground">No recent leave requests found.</div>
              ) : recentLeaves.map((leave, idx) => (
                <div key={idx} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{leave.leave_type?.name || 'Leave Request'}</p>
                      <p className="text-xs text-muted-foreground font-medium">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    leave.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payslips */}
        <Card className="border-none shadow-sm shadow-slate-200/40">
          <CardHeader className="bg-muted/50/50 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px] font-medium leading-6 text-foreground">My Payslips</CardTitle>
              <Button variant="ghost" size="sm" className="text-primaryhover:text-blue-700 font-semibold text-sm cursor-pointer no-underline">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentPayslips.length === 0 ? (
                <div className="p-8 text-center text-sm font-medium text-muted-foreground">No payslips generated yet.</div>
              ) : recentPayslips.map((payslip, idx) => (
                <div key={idx} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-transparent flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primarytransition-colors">{payslip.month} {payslip.year}</p>
                      <p className="text-xs text-muted-foreground font-medium">Net Pay: {formatCurrency(payslip.net_pay)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-2 border-border text-slate-600">
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
}
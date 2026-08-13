import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, AlertCircle, Calendar, Users, 
  MapPin, RefreshCw, Filter, ShieldCheck, UserCheck, UserX,
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, LogIn, LogOut,
  Search, Download, ChevronDown
} from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import Select from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { toast } from 'sonner';
import { useAuth } from '@/shared/context/AuthContext';
import { 
  checkIn, 
  checkOut, 
  getMyAttendanceLogs, 
  getTeamAttendanceLogs, 
  getAttendanceStats,
  logAttendanceExport
} from '../services/attendance';

export const TimeAttendance: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-attendance' | 'team-attendance'>('my-attendance');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // My Attendance State
  const [myLogs, setMyLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [todayLog, setTodayLog] = useState<any>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [mySearch, setMySearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showAttendanceFilters, setShowAttendanceFilters] = useState(false);
  const [showPersonalFilters, setShowPersonalFilters] = useState(false);

  // Team Attendance State
  const [teamLogs, setTeamLogs] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const isManagerOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR', 'HR_ADMIN', 'MANAGER'].includes(user?.role || '');

  // Fetch My Attendance Logs & Stats
  const fetchMyData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statusFilter !== 'all') params.status = statusFilter;

      const [logsRes, statsRes] = await Promise.all([
        getMyAttendanceLogs(params).catch(() => ({ data: [] })),
        getAttendanceStats().catch(() => ({ data: null }))
      ]);

      const logsData = logsRes.data || logsRes || [];
      setMyLogs(Array.isArray(logsData) ? logsData : []);
      setStats(statsRes.data || statsRes || null);

      // Find today's log
      const todayStr = new Date().toISOString().split('T')[0];
      const today = (Array.isArray(logsData) ? logsData : []).find((l: any) => {
        const logDate = new Date(l.date || l.check_in).toISOString().split('T')[0];
        return logDate === todayStr;
      });
      setTodayLog(today || null);
    } catch (err) {
      console.error('Failed to load attendance logs', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Team Attendance Logs
  const fetchTeamData = async () => {
    setTeamLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (departmentFilter !== 'all') params.department_id = departmentFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const teamRes = await getTeamAttendanceLogs(params);
      const teamData = teamRes.data || teamRes || [];
      setTeamLogs(Array.isArray(teamData) ? teamData : []);
    } catch (err) {
      console.error('Failed to load team attendance logs', err);
      toast.error('Failed to load team attendance records');
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-attendance') {
      fetchMyData();
    } else if (activeTab === 'team-attendance' && isManagerOrAdmin) {
      fetchTeamData();
    }
  }, [activeTab, startDate, endDate, departmentFilter, statusFilter]);

  // Filter Team Logs by Search Query
  const filteredTeamLogs = useMemo(() => {
    return teamLogs.filter((log: any) => {
      const name = (log.user?.first_name || log.user?.name || log.user?.username || log.employee_name || '').toLowerCase();
      const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [teamLogs, searchQuery, statusFilter]);

  // Filter My Logs by Search & Date
  const filteredMyLogs = useMemo(() => {
    return myLogs.filter((log: any) => {
      const logDate = new Date(log.date || log.check_in).toISOString().split('T')[0];
      const matchesStart = !startDate || logDate >= startDate;
      const matchesEnd = !endDate || logDate <= endDate;
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      const q = mySearch.trim().toLowerCase();
      const matchesSearch = !q || [
        log.date,
        log.status,
        log.location,
      ].some(field => field && field.toString().toLowerCase().includes(q));
      return matchesStart && matchesEnd && matchesStatus && matchesSearch;
    });
  }, [myLogs, startDate, endDate, statusFilter, mySearch]);

  // Export CSV Handler
  const handleExport = (data: any[], filename: string) => {
    if (!data.length) {
      toast.error('No data available to export');
      return;
    }
    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Location'];
    const csvRows = [headers.join(',')];

    data.forEach((row) => {
      const empName = `"${row.user?.first_name || row.user?.name || row.user?.username || row.employee_name || 'Employee'}"`;
      const date = `"${new Date(row.date || row.check_in).toLocaleDateString()}"`;
      const checkInTime = row.check_in ? `"${new Date(row.check_in).toLocaleTimeString()}"` : '"-"';
      const checkOutTime = row.check_out ? `"${new Date(row.check_out).toLocaleTimeString()}"` : '"-"';
      const workHours = '"-"';
      const status = `"${row.status || 'PRESENT'}"`;
      const location = `"${row.location || 'Office'}"`;

      csvRows.push([empName, date, checkInTime, checkOutTime, workHours, status, location].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export downloaded successfully!');
    logAttendanceExport({ format: 'csv', filterType: filename, count: data.length }).catch(console.error);
  };

  // Stats calculation
  const teamCheckedIn = teamLogs.filter(l => l.check_in).length;
  const teamLate = teamLogs.filter(l => l.status === 'LATE').length;
  const teamOnLeave = teamLogs.filter(l => l.status === 'ON_LEAVE' || l.status === 'LEAVE').length;
  const teamAbsent = teamLogs.filter(l => l.status === 'ABSENT' || !l.check_in).length;

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
      {/* Header */}
      <PageHeader
        title="Attendance & Work Logs"
        description="Track daily check-ins, work duration, and monitor team attendance."
        icon={<Clock className="size-8" />}
        action={
          <Button variant="outline" size="sm" onClick={() => { fetchMyData(); if (isManagerOrAdmin) fetchTeamData(); }}>
            <RefreshCw className="size-4 mr-2" /> Refresh
          </Button>
        }
      />

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        {isManagerOrAdmin && (
          <div className="flex border-b border-border">
            <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
              <TabsTrigger 
                value="my-attendance" 
                className="gap-2 px-4 py-2.5 rounded-none border-b-2 border-transparent text-xs font-bold transition-all duration-200 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground hover:text-foreground bg-transparent shadow-none -mb-px"
              >
                <Clock className="size-3.5" /> Personal Attendance
              </TabsTrigger>
              <TabsTrigger 
                value="team-attendance" 
                className="gap-2 px-4 py-2.5 rounded-none border-b-2 border-transparent text-xs font-bold transition-all duration-200 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground hover:text-foreground bg-transparent shadow-none -mb-px"
              >
                <Users className="size-3.5" /> Team Attendance Directory
              </TabsTrigger>
            </TabsList>
          </div>
        )}

        {/* ─── MY ATTENDANCE TAB ──────────────────────────────────────────────── */}
        <TabsContent value="my-attendance" className="space-y-6">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <UserCheck className="w-5 h-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {stats?.present || stats?.totalPresent || 0}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  Present Days
                </span>
              </div>
            </div>

            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <AlertCircle className="w-5 h-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {stats?.late || stats?.totalLate || 0}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  Late Arrivals
                </span>
              </div>
            </div>

            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {stats?.onLeave || stats?.leave || 0}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  On Leave
                </span>
              </div>
            </div>

            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <UserX className="w-5 h-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {stats?.absent || stats?.totalAbsent || 0}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  Absents / LOP
                </span>
              </div>
            </div>
          </div>

          {/* Personal Logs Table Card */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Personal Search */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search date, status, location..."
                value={mySearch}
                onChange={(e) => setMySearch(e.target.value)}
                className="w-full pl-9 pr-4 h-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm bg-card text-foreground"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Icon Popover Button */}
              {(() => {
                const activeCount = (startDate ? 1 : 0) + (endDate ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
                return (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPersonalFilters(!showPersonalFilters)}
                      className={`toolbar-filter-btn-with-text relative ${showPersonalFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                      title="Filters"
                    >
                      {showPersonalFilters ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 18 18"
                          aria-labelledby="CollapseCloseIconTitle"
                          role="graphics-symbol img"
                          fill="none"
                          className="!text-blue-600 dark:!text-blue-400 w-4 h-4"
                        >
                          <title id="CollapseCloseIconTitle">Collapse Close Icon</title>
                          <g>
                            <path
                              className="CollapseClose-path-dRZ"
                              clipRule="evenodd"
                              fillRule="evenodd"
                              fill="currentColor"
                              d="M2.09 1.526c.31 0 .562.252.562.563v15.82a.562.562 0 1 1-1.125 0V2.089c0-.311.252-.563.563-.563Zm6.198 5.438c.22.22.22.576 0 .796L6.612 9.436H17.91a.563.563 0 0 1 0 1.125H6.612l1.676 1.677a.562.562 0 1 1-.795.795l-2.637-2.636a.562.562 0 0 1 0-.796l2.637-2.637c.22-.22.576-.22.795 0Z"
                            />
                          </g>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 15"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M15.8,2H6.9C6.7,0.7,5.4-0.2,4,0.1C3,0.3,2.2,1,2,2H0.2C0.1,2,0,2.1,0,2.3v0.5 C0,2.9,0.1,3,0.2,3H2C2.3,4.4,3.6,5.2,5,5c1-0.2,1.8-1,1.9-2h8.8C15.9,3,16,2.9,16,2.8V2.3C16,2.1,15.9,2,15.8,2z M4.5,4 C3.7,4,3,3.3,3,2.5S3.7,1,4.5,1S6,1.7,6,2.5S5.3,4,4.5,4z" />
                          <path d="M15.8,12H8.9C8.7,10.7,7.4,9.8,6,10.1c-1,0.2-1.8,1-1.9,1.9H0.2C0.1,12,0,12.1,0,12.3v0.5 C0,12.9,0.1,13,0.2,13h3.8C4.3,14.4,5.6,15.2,7,15c1-0.2,1.8-1,1.9-1.9h6.8c0.1,0,0.2-0.1,0.2-0.2v-0.5C16,12.1,15.9,12,15.8,12z M6.5,14C5.7,14,5,13.3,5,12.5S5.7,11,6.5,11S8,12.5S7.3,14,6.5,14z" />
                          <path d="M0,7.3v0.5C0,7.9,0.1,8,0.2,8h8.8c0.3,1.4,1.6,2.2,2.9,1.9c1-0.2,1.8-1,1.9-1.9h1.8 C15.9,8,16,7.9,16,7.8V7.3C16,7.1,15.9,7,15.8,7h-1.8c-0.3-1.3-1.6-2.2-2.9-1.9C10,5.3,9.2,6,9.1,7H0.2C0.1,7,0,7.1,0,7.3z M10,7.5 C10,6.7,10.7,6,11.5,6S13,6.7,13,7.5S12.3,9,11.5,9S10,8.3,10,7.5z" />
                        </svg>
                      )}
                      Filters
                        {activeCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-card">
                            {activeCount}
                          </span>
                        )}
                      </button>

                      {/* Popover Card */}
                      {showPersonalFilters && (
                        <div className="absolute right-0 top-full mt-2 w-[340px] bg-card rounded-xl shadow-xl border border-border p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                            <div className="flex items-center gap-2">
                              <Filter className="size-4 text-primary" />
                              <span className="text-sm font-bold text-foreground">Filter Attendance</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setStartDate('');
                                setEndDate('');
                                setStatusFilter('all');
                              }}
                              className="text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              Reset all
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date Range</label>
                              <div className="grid grid-cols-2 gap-2">
                                <ModernDatePicker 
                                  value={startDate} 
                                  onChange={(d: string) => setStartDate(d)} 
                                  placeholder="Start Date" 
                                />
                                <ModernDatePicker 
                                  value={endDate} 
                                  onChange={(d: string) => setEndDate(d)} 
                                  placeholder="End Date" 
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                              <Select 
                                value={statusFilter} 
                                onChange={(val: string) => setStatusFilter(val)}
                                options={[
                                  { value: 'all', label: 'All Status' },
                                  { value: 'PRESENT', label: 'Present' },
                                  { value: 'LATE', label: 'Late' },
                                  { value: 'ON_LEAVE', label: 'On Leave' },
                                  { value: 'ABSENT', label: 'Absent' }
                                ]}
                              />
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-border flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => setShowPersonalFilters(false)}
                              className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Apply Filters
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              <button
                type="button"
                onClick={() => handleExport(filteredMyLogs, 'my_attendance_records')}
                className="toolbar-filter-btn-with-text"
              >
                <Download /> Export
              </button>
              </div>
            </div>

          <Card className="border-border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted border-b border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">DATE</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CHECK IN</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CHECK OUT</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">WORK HOURS</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">STATUS</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">LOCATION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card divide-y divide-border">
                  {filteredMyLogs.length > 0 ? (
                    filteredMyLogs.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-muted transition-colors cursor-pointer">
                        <TableCell className="px-4 py-3 font-semibold text-sm text-foreground">
                          {new Date(log.date || log.check_in).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground font-medium">{log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground font-medium">{log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm font-mono text-muted-foreground">
                          {(() => {
                            if (log.work_hours || log.workHours) {
                              const hrs = parseFloat(log.work_hours || log.workHours);
                              const h = Math.floor(hrs);
                              const m = Math.round((hrs - h) * 60);
                              return `${h}h ${m}m`;
                            }
                            if (log.check_in && log.check_out) {
                              const diffMs = new Date(log.check_out).getTime() - new Date(log.check_in).getTime();
                              if (diffMs > 0) {
                                const totalMins = Math.floor(diffMs / (1000 * 60));
                                const h = Math.floor(totalMins / 60);
                                const m = totalMins % 60;
                                return `${h}h ${m}m`;
                              }
                            }
                            return log.check_in ? 'In Progress' : '-';
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            log.status === 'PRESENT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            log.status === 'LATE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                            log.status === 'ON_LEAVE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                          }`}>
                            {log.status === 'PRESENT' ? 'Present' : log.status === 'LATE' ? 'Late' : log.status === 'ON_LEAVE' ? 'On Leave' : 'Absent'}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-muted-foreground shrink-0" /> {log.location || 'Office'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <div className="space-y-3 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center text-slate-400 dark:text-muted-foreground mx-auto shadow-inner">
                            <Search className="size-6" />
                          </div>
                          <div className="font-bold text-foreground text-base">No records for this period</div>
                          <div className="text-xs text-muted-foreground">Try adjusting your filters or date selection.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TEAM ATTENDANCE TAB (SHOW ALL OTHERS) ─────────────────────────── */}
        {isManagerOrAdmin && (
          <TabsContent value="team-attendance" className="space-y-6">
            {/* Team Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <UserCheck className="w-5 h-5 text-primary shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {teamCheckedIn}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Checked In Today
                  </span>
                </div>
              </div>

              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {teamLate}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Late Arrivals
                  </span>
                </div>
              </div>

              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {teamOnLeave}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    On Leave
                  </span>
                </div>
              </div>

              <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <UserX className="w-5 h-5 text-primary shrink-0" />
                </div>
                <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {teamAbsent}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                    Absent / Unmarked
                  </span>
                </div>
              </div>
            </div>

            {/* Team Attendance Directory Card - Reference Design */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Team Search */}
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 h-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm bg-card text-foreground"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Filter Icon Popover Button */}
                {(() => {
                  const activeCount = (startDate ? 1 : 0) + (endDate ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (departmentFilter !== 'all' ? 1 : 0);
                  return (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttendanceFilters(!showAttendanceFilters)}
                        className={`toolbar-filter-btn-with-text relative ${showAttendanceFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                        title="Filters"
                      >
                        {showAttendanceFilters ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 18 18"
                            aria-labelledby="CollapseCloseIconTitle"
                            role="graphics-symbol img"
                            fill="none"
                            className="!text-blue-600 dark:!text-blue-400 w-4 h-4"
                          >
                            <title id="CollapseCloseIconTitle">Collapse Close Icon</title>
                            <g>
                              <path
                                className="CollapseClose-path-dRZ"
                                clipRule="evenodd"
                                fillRule="evenodd"
                                fill="currentColor"
                                d="M2.09 1.526c.31 0 .562.252.562.563v15.82a.562.562 0 1 1-1.125 0V2.089c0-.311.252-.563.563-.563Zm6.198 5.438c.22.22.22.576 0 .796L6.612 9.436H17.91a.563.563 0 0 1 0 1.125H6.612l1.676 1.677a.562.562 0 1 1-.795.795l-2.637-2.636a.562.562 0 0 1 0-.796l2.637-2.637c.22-.22.576-.22.795 0Z"
                              />
                            </g>
                          </svg>
                        ) : (
                          <Filter className="size-4" />
                        )}
                        Filters
                          {activeCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-card">
                              {activeCount}
                            </span>
                          )}
                        </button>

                        {/* Popover Card */}
                        {showAttendanceFilters && (
                          <div className="absolute right-0 top-full mt-2 w-[340px] bg-card rounded-xl shadow-xl border border-border p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                              <div className="flex items-center gap-2">
                                <Filter className="size-4 text-primary" />
                                <span className="text-sm font-bold text-foreground">Filter Attendance</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setStartDate('');
                                  setEndDate('');
                                  setStatusFilter('all');
                                  setDepartmentFilter('all');
                                }}
                                className="text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                Reset all
                              </button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date Range</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <ModernDatePicker 
                                    value={startDate} 
                                    onChange={(d: string) => setStartDate(d)} 
                                    placeholder="Start Date" 
                                  />
                                  <ModernDatePicker 
                                    value={endDate} 
                                    onChange={(d: string) => setEndDate(d)} 
                                    placeholder="End Date" 
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                                <Select 
                                  value={statusFilter} 
                                  onChange={(val: string) => setStatusFilter(val)}
                                  options={[
                                    { value: 'all', label: 'All Status' },
                                    { value: 'PRESENT', label: 'Present' },
                                    { value: 'LATE', label: 'Late' },
                                    { value: 'ON_LEAVE', label: 'On Leave' },
                                    { value: 'ABSENT', label: 'Absent' }
                                  ]}
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Department</label>
                                <Select 
                                  value={departmentFilter} 
                                  onChange={(val: string) => setDepartmentFilter(val)}
                                  options={[
                                    { value: 'all', label: 'All Departments' },
                                    { value: '1', label: 'Engineering' },
                                    { value: '2', label: 'HR & Ops' },
                                    { value: '3', label: 'Finance' },
                                    { value: '4', label: 'Sales & Marketing' }
                                  ]}
                                />
                              </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-border flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => setShowAttendanceFilters(false)}
                                className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Apply Filters
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                })()}
              <button
                type="button"
                onClick={() => handleExport(filteredTeamLogs, 'team_attendance_records')}
                className="toolbar-filter-btn-with-text"
              >
                <Download /> Export
              </button>
              </div>
            </div>

            <Card className="border-border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">EMPLOYEE</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">DATE</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CHECK IN</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CHECK OUT</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">WORK HOURS</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">STATUS</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">LOCATION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-card divide-y divide-border">
                    {teamLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-xs">
                          Loading attendance records...
                        </TableCell>
                      </TableRow>
                    ) : filteredTeamLogs.length > 0 ? (
                      filteredTeamLogs.map((empLog: any) => (
                        <TableRow key={`team-${empLog.id || empLog.user_id}`} className="hover:bg-muted transition-colors cursor-pointer">
                          <TableCell className="px-4 py-3 font-semibold text-sm text-foreground">
                            {empLog.user?.first_name || empLog.user?.name || empLog.user?.username || empLog.employee_name || `Employee #${empLog.user_id}`}
                            <div className="text-xs font-normal text-muted-foreground">{empLog.user?.department?.name || empLog.department || 'General'}</div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-foreground font-medium">
                            {new Date(empLog.date || empLog.check_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-foreground font-medium">
                            {empLog.check_in ? new Date(empLog.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-foreground font-medium">
                            {empLog.check_out ? new Date(empLog.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm font-mono text-muted-foreground">
                            {(() => {
                              if (empLog.work_hours || empLog.workHours) {
                                const hrs = parseFloat(empLog.work_hours || empLog.workHours);
                                const h = Math.floor(hrs);
                                const m = Math.round((hrs - h) * 60);
                                return `${h}h ${m}m`;
                              }
                              if (empLog.check_in && empLog.check_out) {
                                const diffMs = new Date(empLog.check_out).getTime() - new Date(empLog.check_in).getTime();
                                if (diffMs > 0) {
                                  const totalMins = Math.floor(diffMs / (1000 * 60));
                                  const h = Math.floor(totalMins / 60);
                                  const m = totalMins % 60;
                                  return `${h}h ${m}m`;
                                }
                              }
                              return empLog.check_in ? 'In Progress' : '-';
                            })()}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              empLog.status === 'PRESENT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              empLog.status === 'LATE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                              empLog.status === 'ON_LEAVE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                              'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                            }`}>
                              {empLog.status === 'PRESENT' ? 'Present' : empLog.status === 'LATE' ? 'Late' : empLog.status === 'ON_LEAVE' ? 'On Leave' : 'Absent'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-muted-foreground shrink-0" /> {empLog.location || empLog.remarks || 'Office'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-16 text-center">
                          <div className="space-y-3 max-w-sm mx-auto">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center text-slate-400 dark:text-muted-foreground mx-auto shadow-inner">
                              <Search className="size-6" />
                            </div>
                            <div className="font-bold text-foreground text-base">No records for this period</div>
                            <div className="text-xs text-muted-foreground">Try adjusting your filters or search terms.</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default TimeAttendance;

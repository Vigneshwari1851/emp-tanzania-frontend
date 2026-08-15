import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { getEmployee } from '../../employees/services/employees';
import { getLeaveHistory } from '../../leaves/services/leaves';
import { getTeamAttendanceLogs } from '../../attendance/services/attendance';
import { createPayrollRun, getPayrollRuns, updatePayrollRun, getTaxSections, getEmployeeDeclarationsAdmin, calculatePayroll as calculatePayrollApi } from '../services/payroll';
import { toast } from 'sonner';
import { usePayroll } from '../context/PayrollContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/Input';
import { Label } from '../../../shared/components/ui/payroll-lib/label';
import { Button } from '../../../shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/payroll-lib/select';
import {
  Calculator,
  Users,
  Zap,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Download,
  Trash2,
  Plus,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  User,
  CircleDollarSign,
  BarChart3
} from 'lucide-react';
import { Badge } from '../../../shared/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs';
import { jsPDF } from 'jspdf';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import ModernDatePicker from '@/shared/components/ui/ModernDatePicker';

export function PayrollCalculation() {
  const { currencySymbol, isTanzania, formatCurrency, config } = useCurrency();
  const { employees, salaryStructures, groups: payrollGroups } = usePayroll();
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-05');
  const [workingDays, setWorkingDays] = useState(26);
  const [presentDays, setPresentDays] = useState(24);
  const [lopDays, setLopDays] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [bulkResults, setBulkResults] = useState<any[]>([]);

  const [calculatedPayroll, setCalculatedPayroll] = useState<any>(null);
  const [fullEmployeeDetails, setFullEmployeeDetails] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const [selectedRunMonth, setSelectedRunMonth] = useState<string | null>(null);
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState(new Date().toISOString().substring(0, 7));
  const [monthError, setMonthError] = useState('');
  const [searchTermPayslips, setSearchTermPayslips] = useState('');
  const [lopReasons, setLopReasons] = useState('Loss of Pay');
  const [taxSections, setTaxSections] = useState<any[]>([]);
  const [employeeDeclarations, setEmployeeDeclarations] = useState<any[]>([]);
  const [arrearsAmount, setArrearsAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);

  const fetchRecentRuns = async () => {
    try {
      setLoading(true);
      const runs = await getPayrollRuns();
      setRecentRuns(runs || []);
    } catch (error) {
      console.error("Failed to fetch runs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentRuns();
  }, []);

  useEffect(() => {
    if (selectedRunMonth) {
      setSelectedMonth(selectedRunMonth);
    }
  }, [selectedRunMonth]);

  useEffect(() => {
    if (selectedEmployee) {
      setIsFetching(true);
      getEmployee(Number(selectedEmployee))
        .then(res => {
          setFullEmployeeDetails(res);
        })
        .catch(err => {
          console.error("Failed to fetch employee details", err);
        })
        .finally(() => setIsFetching(false));
    } else {
      setFullEmployeeDetails(null);
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);

      const daysInMonth = new Date(year, month, 0).getDate();
      let working = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() !== 0) working++;
      }
      setWorkingDays(working);

      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`;

      getTeamAttendanceLogs({
        startDate,
        endDate
      }).then(res => {
        const logs = res?.data || res || [];
        const employeeLogs = Array.isArray(logs) ? logs.filter((log: any) =>
          (log.user_id || log.userId)?.toString() === selectedEmployee.toString()
        ) : [];

        const uniqueDays = new Set(employeeLogs.map((log: any) => {
          const logDate = new Date(log.date || log.check_in || log.checkIn);
          return logDate.toDateString();
        }));

        setPresentDays(uniqueDays.size || 0);
      }).catch(err => console.error("Failed to fetch attendance logs", err));

      getLeaveHistory({
        user_id: Number(selectedEmployee),
        status: 'APPROVED'
      }).then(res => {
        const history = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
        let lopCount = 0;
        const reasonsList: string[] = [];

        history.forEach((leave: any) => {
          const leaveStart = new Date(leave.start_date);
          const isSameMonth = leaveStart.getFullYear() === year && (leaveStart.getMonth() + 1) === month;
          const isLOP = leave.leave_policy?.leave_category?.toLowerCase() === 'unpaid' ||
            leave.leave_policy?.leave_type?.toLowerCase().includes('unpaid') ||
            leave.leave_policy?.policy_name?.toLowerCase().includes('lop');

          if (isSameMonth && isLOP) {
            lopCount += (leave.duration || 0);
            const dateStr = new Date(leave.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            reasonsList.push(`• ${dateStr} (${leave.duration}d): ${leave.reason || leave.description || 'Loss of Pay'}`);
          }
        });

        setLopDays(lopCount);
        setLopReasons(reasonsList.join('\n') || 'Loss of Pay');
      }).catch(err => {
        console.error("Failed to fetch LOP days", err);
        setLopReasons('Loss of Pay');
      });

      getTaxSections().then(sections => {
        setTaxSections(sections || []);
      }).catch(err => console.error("Failed to fetch tax sections", err));

      getEmployeeDeclarationsAdmin(Number(selectedEmployee)).then(decls => {
        setEmployeeDeclarations(decls || []);
      }).catch(err => console.error("Failed to fetch employee declarations", err));
    }
  }, [selectedEmployee, selectedMonth]);

  useEffect(() => {
    if (selectedEmployee && fullEmployeeDetails) {
      calculatePayroll();
    }
  }, [presentDays, lopDays, fullEmployeeDetails, taxSections, employeeDeclarations]);

  const calculatePayroll = async () => {
    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    try {
      const parts = selectedMonth.split('-');
      if (parts.length !== 2) {
        toast.error("Invalid month selected");
        return;
      }

      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);

      const apiResult = await calculatePayrollApi({
        employeeId: employee.id,
        month,
        year,
        workingDays: workingDays || 26,
        lopDays: lopDays,
        overtimeHours: overtimeHours,
        arrearsAmount: arrearsAmount,
        bonusAmount: bonusAmount
      });

      const earningsObj: Record<string, number> = {};
      apiResult.earnings.forEach((e: any) => earningsObj[e.label] = e.value);

      const deductionsObj: Record<string, number> = {};
      apiResult.deductions.forEach((d: any) => deductionsObj[d.label] = d.value);

      setCalculatedPayroll({
        employee: { ...employee, details: fullEmployeeDetails?.details || fullEmployeeDetails },
        earnings: earningsObj,
        deductions: deductionsObj,
        baseGross: apiResult.grossSalary + apiResult.lopDeductionAmount - (earningsObj['Overtime'] || 0),
        grossSalary: apiResult.grossSalary,
        totalDeductions: apiResult.totalDeductions,
        netSalary: apiResult.netPay,
        lopDays,
        lopDeductionAmount: apiResult.lopDeductionAmount,
        otAmount: earningsObj['Overtime'] || 0,
        taxExemptionsTotal: apiResult.taxInfo.totalExemptions,
        taxExemptionsBreakdown: {},
        netTaxableIncome: apiResult.taxInfo.netTaxableIncome,
        annualIncome: apiResult.taxInfo.annualIncome
      });
    } catch (error: any) {
      console.error("Backend Calculation Error:", error);
      toast.error(error?.response?.data?.message || "Failed to calculate payroll using the backend engine.");
    }
  };

  const calculateBulkPayroll = async () => {
    const groupEmployees = employees.filter(e => {
      if (!selectedGroup || selectedGroup === 'all') return true;

      const targetGroup = payrollGroups.find(g => g.id.toString() === selectedGroup);
      const targetName = targetGroup?.name?.toLowerCase() || '';
      const criteria = targetGroup?.criteria || {};

      const critDeptId = criteria.department_id || criteria.departmentId || criteria.deptId;
      const critTeamId = criteria.team_id || criteria.teamId;
      const critRoleId = criteria.role_id || criteria.roleId;
      const critLocId = criteria.location_id || criteria.locationId || criteria.locId;
      const critGender = criteria.gender;
      const critEmpType = criteria.employmentType || criteria.employment_type;

      let matchesAllCriteria = true;
      let hasAnyCriteria = false;

      const isMissing = (val: any) => !val || val === 'N/A' || val === 'None' || val === '?';

      if (critDeptId && critDeptId !== 'all') {
        hasAnyCriteria = true;
        if (!isMissing(e.departmentId) && e.departmentId?.toString() !== critDeptId.toString()) { matchesAllCriteria = false; }
      }
      if (critTeamId && critTeamId !== 'all') {
        hasAnyCriteria = true;
        if (!isMissing(e.teamId) && e.teamId?.toString() !== critTeamId.toString()) { matchesAllCriteria = false; }
      }
      if (critRoleId && critRoleId !== 'all') {
        hasAnyCriteria = true;
        if (!isMissing(e.roleId) && e.roleId?.toString() !== critRoleId.toString()) { matchesAllCriteria = false; }
      }
      if (critLocId && critLocId !== 'all') {
        hasAnyCriteria = true;
        if (!isMissing(e.locationId) && e.locationId?.toString() !== critLocId.toString()) { matchesAllCriteria = false; }
      }
      if (critGender && critGender !== 'all') {
        hasAnyCriteria = true;
        if (!isMissing(e.gender) && e.gender !== critGender) { matchesAllCriteria = false; }
      }
      if (critEmpType && critEmpType !== 'all') {
        hasAnyCriteria = true;
        if (!isMissing(e.employmentType) && e.employmentType !== critEmpType) { matchesAllCriteria = false; }
      }

      if (hasAnyCriteria && matchesAllCriteria) return true;
      if (targetName && e.payrollGroupName?.toLowerCase() === targetName) return true;

      return false;
    });

    if (groupEmployees.length === 0) {
      toast.error(`No employees found in ${selectedGroup === 'all' ? 'the organization' : 'this group'}.`);
      return;
    }

    setIsFetching(true);
    const results = [];

    try {
      const parts = selectedMonth.split('-');
      const year = parseInt(parts[0], 10) || new Date().getFullYear();
      const month = parseInt(parts[1], 10) || new Date().getMonth() + 1;

      for (const emp of groupEmployees) {
        try {
          const apiResult = await calculatePayrollApi({
            employeeId: Number(emp.id),
            month,
            year,
            workingDays: 26,
            lopDays: 0,
            overtimeHours: 0
          });

          const earningsMap: Record<string, number> = {};
          apiResult.earnings?.forEach((e: any) => { earningsMap[e.label] = e.value; });
          const deductionsMap: Record<string, number> = {};
          apiResult.deductions?.forEach((d: any) => { deductionsMap[d.label] = d.value; });

          results.push({
            id: emp.id,
            name: emp.name,
            id_code: emp.employeeCode,
            gross: apiResult.grossSalary,
            deductions: apiResult.totalDeductions,
            net: apiResult.netPay,
            breakdown: {
              earnings: earningsMap,
              deductions: deductionsMap,
              attendance: { workingDays: 26, lopDays: 0, paidLeaves: 0 }
            }
          });
        } catch (error) {
          console.error(`Failed to calculate for employee ${emp.id}`, error);
        }
      }

      if (results.length > 0) {
        toast.success(`Calculated payroll for ${results.length} employees. Click "Process & Save" to finalize.`);
        setBulkResults([...results]);
      } else {
        toast.error("No valid employees found in this group.");
        setBulkResults([]);
      }
    } catch (error) {
      console.error("Bulk processing error", error);
      toast.error("Error processing some employees in the group.");
    } finally {
      setIsFetching(false);
    }
  };

  const [paymentStatus, setPaymentStatus] = useState('PAID');

  const handleBulkSave = async () => {
    setIsSaving(true);
    let savedCount = 0;
    let failedCount = 0;
    try {
      for (const res of bulkResults) {
        try {
          await createPayrollRun({
            userId: res.id,
            month: selectedMonth,
            grossAmount: res.gross,
            deductionAmount: res.deductions,
            netAmount: res.net,
            status: paymentStatus,
            breakdown: res.breakdown || { earnings: {}, deductions: {} }
          });
          savedCount++;
        } catch (err) {
          console.error(`Failed to save payslip for employee ${res.id}`, err);
          failedCount++;
        }
      }
      if (savedCount > 0) {
        toast.success(`Payroll finalized for ${savedCount} employee${savedCount > 1 ? 's' : ''} as ${paymentStatus}${failedCount > 0 ? ` (${failedCount} failed)` : ''}!`);
      } else {
        toast.error('All payslip saves failed. Check the console for details.');
      }
      setBulkResults([]);
      fetchRecentRuns();
    } catch (error) {
      toast.error("Failed to process bulk payroll");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRun = async () => {
    if (!calculatedPayroll) return;

    setIsSaving(true);
    try {
      await createPayrollRun({
        userId: selectedEmployee,
        month: selectedMonth,
        grossAmount: calculatedPayroll.grossSalary,
        deductionAmount: calculatedPayroll.totalDeductions,
        netAmount: calculatedPayroll.netSalary,
        status: paymentStatus,
        breakdown: {
          earnings: calculatedPayroll.earnings,
          deductions: calculatedPayroll.deductions,
          attendance: {
            workingDays: Number(workingDays) || 26,
            lopDays: calculatedPayroll.lopDays || 0,
            paidLeaves: 0
          }
        }
      });
      toast.success(`Payroll run saved successfully as ${paymentStatus}!`);
      setCalculatedPayroll(null);
      setSelectedEmployee('');
      fetchRecentRuns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payroll run');
    } finally {
      setIsSaving(false);
    }
  };

  const numberToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const isIndia = config?.code === 'INR';
    
    if (isIndia) {
      const numStr = num.toString();
      if (numStr.length > 9) return 'overflow';
      const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return '';
      let str = '';
      str += (n[1] !== '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
      str += (n[2] !== '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
      str += (n[3] !== '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
      str += (n[4] !== '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
      str += (n[5] !== '00') ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
      return str.trim() + ' Only';
    } else {
      if (num === 0) return 'Zero Only';
      
      const formatHundreds = (n: number): string => {
        let str = '';
        if (n >= 100) {
          str += a[Math.floor(n / 100)] + 'Hundred ';
          n %= 100;
        }
        if (n > 0) {
          if (n < 20) {
            str += a[n];
          } else {
            str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
          }
        }
        return str;
      };
      
      let str = '';
      let temp = num;
      const billions = Math.floor(temp / 1000000000);
      temp %= 1000000000;
      const millions = Math.floor(temp / 1000000);
      temp %= 1000000;
      const thousands = Math.floor(temp / 1000);
      temp %= 1000;
      const remainder = temp;
      
      if (billions > 0) {
        str += formatHundreds(billions) + 'Billion ';
      }
      if (millions > 0) {
        str += formatHundreds(millions) + 'Million ';
      }
      if (thousands > 0) {
        str += formatHundreds(thousands) + 'Thousand ';
      }
      if (remainder > 0) {
        str += formatHundreds(remainder);
      }
      return str.trim() + ' Only';
    }
  };

  const generatePDF = (run: any) => {
    const doc = new jsPDF();
    const employee = run.user?.details || {};
    const breakdown = run.breakdown || {};

    const borderGray = [226, 232, 240];
    const textDark = [30, 41, 59];
    const textLight = [100, 116, 139];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text('ABC ENTERPRISES', 105, 25, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(`Salary Slip for ${formatMonthName(run.month)}`, 105, 33, { align: 'center' });

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(14, 48, 182, 28, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    doc.setFont('helvetica', 'bold');
    doc.text('Employee Code:', 18, 56);
    doc.text('Designation:', 18, 64);
    doc.text('Bank Account:', 18, 72);

    doc.setFont('helvetica', 'normal');
    doc.text(employee.employee_id || 'N/A', 55, 56);
    doc.text(employee.role?.role_name || employee.position || employee.role || 'Staff', 55, 64);
    doc.text(employee.account_number || 'N/A', 55, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('Employee Name:', 110, 56);
    doc.text('PF Number:', 110, 64);
    doc.text('Payment Mode:', 110, 72);

    doc.setFont('helvetica', 'normal');
    doc.text(`${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'N/A', 145, 56);
    doc.text(employee.pf_uan || 'N/A', 145, 64);
    doc.text('Bank Transfer', 145, 72);

    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(14, 82, 182, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text('Attendance Summary', 18, 88);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, 93, 174, 12, 1, 1, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('Working Days:', 20, 101);
    doc.text('Days Absent (LOP):', 75, 101);
    doc.text('Paid Leaves:', 135, 101);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text(`${breakdown.attendance?.workingDays ?? '30'}`, 60, 101, { align: 'right' });
    doc.text(`${breakdown.attendance?.lopDays ?? '0'}`, 120, 101, { align: 'right' });
    doc.text(`${breakdown.attendance?.paidLeaves ?? '0'}`, 185, 101, { align: 'right' });

    let startY = 118;

    doc.setFillColor(220, 252, 231);
    doc.rect(14, startY, 91, 10, 'F');

    doc.setFillColor(254, 226, 226);
    doc.rect(105, startY, 91, 10, 'F');

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.2);
    doc.rect(14, startY, 182, 95);
    doc.line(105, startY, 105, startY + 95);
    doc.line(14, startY + 10, 196, startY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(21, 128, 61);
    doc.text('EARNINGS', 18, startY + 6.5);

    doc.setTextColor(185, 28, 28);
    doc.text('DEDUCTIONS', 110, startY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    let y = startY + 16;
    const earnings = breakdown.earnings || {};
    const deds = breakdown.deductions || {};

    const earnKeys = Object.keys(earnings);
    const dedKeys = Object.keys(deds);
    if (breakdown.lopDeductionAmount > 0) dedKeys.push('Loss of Pay (LOP)');

    const maxRows = Math.max(earnKeys.length, dedKeys.length);

    for (let i = 0; i < maxRows; i++) {
      if (i > 0) {
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y - 4, 196, y - 4);
      }

      if (earnKeys[i]) {
        doc.text(earnKeys[i], 18, y);
        const amt = earnings[earnKeys[i]] || 0;
        doc.setFont('helvetica', 'bold');
        doc.text(`${currencySymbol} ${amt.toLocaleString(config?.locale || 'en-US')}`, 98, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      }
      if (dedKeys[i]) {
        if (dedKeys[i] === 'Loss of Pay (LOP)') {
          doc.text(`LOP (${breakdown.lopDays} Days)`, 112, y);
          doc.setFont('helvetica', 'bold');
          doc.text(`${currencySymbol} ${breakdown.lopDeductionAmount.toLocaleString(config?.locale || 'en-US')}`, 192, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        } else {
          doc.text(dedKeys[i], 112, y);
          const amt = deds[dedKeys[i]] || 0;
          doc.setFont('helvetica', 'bold');
          doc.text(`${currencySymbol} ${amt.toLocaleString(config?.locale || 'en-US')}`, 192, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        }
      }
      y += 7.5;
    }

    let totalY = startY + 95;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, totalY, 182, 10, 'FD');
    doc.line(105, totalY, 105, totalY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Gross Earnings', 18, totalY + 6.5);
    doc.text(`${currencySymbol} ${parseFloat(run.gross_amount).toLocaleString(config?.locale || 'en-US')}`, 98, totalY + 6.5, { align: 'right' });

    doc.text('Total Deductions', 112, totalY + 6.5);
    doc.text(`${currencySymbol} ${parseFloat(run.deduction_amount).toLocaleString(config?.locale || 'en-US')}`, 192, totalY + 6.5, { align: 'right' });

    const netVal = Math.round(parseFloat(run.net_amount));
    const words = numberToWords(netVal);

    doc.setFillColor(168, 85, 247);
    doc.roundedRect(14, totalY + 16, 182, 24, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Salary Payable:', 18, totalY + 24);

    doc.setFontSize(18);
    doc.text(`${currencySymbol} ${parseFloat(run.net_amount).toLocaleString(config?.locale || 'en-US')}`, 188, totalY + 25, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`In Words: ${words}`, 18, totalY + 32);

    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated salary slip.', 14, 280);
    doc.text('Generated by EmpXP Payroll', 14, 284);

    doc.text('Authorized Signatory', 192, 284, { align: 'right' });

    doc.save(`Payslip_${employee.first_name || 'employee'}_${run.month.replace(' ', '_')}.pdf`);
    toast.success('Payslip downloaded successfully!');
  };

  const formatMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    if (monthStr.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = monthStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return monthStr;
  };

  const monthSummaries = recentRuns.reduce((acc: any[], run: any) => {
    const m = run.month || 'Unknown';
    let existing = acc.find(x => x.month === m);
    if (!existing) {
      existing = {
        month: m,
        employees: 0,
        gross: 0,
        deductions: 0,
        net: 0,
        status: 'PAID',
        runs: []
      };
      acc.push(existing);
    }
    existing.employees += 1;
    existing.gross += parseFloat(run.gross_amount || 0);
    existing.deductions += parseFloat(run.deduction_amount || 0);
    existing.net += parseFloat(run.net_amount || 0);
    existing.runs.push(run);

    if (run.status?.toUpperCase() !== 'PAID') {
      existing.status = 'PROCESSING';
    }
    return acc;
  }, []);

  monthSummaries.sort((a: any, b: any) => b.month.localeCompare(a.month));

  if (selectedRunMonth === null) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader
          title="Payroll Run History"
          description="View, manage, and process historical organizational salary records grouped by month."
          icon={<Clock className="size-8" />}
          action={
            <Button
              onClick={() => setShowNewMonthModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 rounded-lg font-bold shadow-sm transition-transform active:scale-95"
            >
              <Plus className="size-4 mr-2 stroke-[3px]" />
              Start New Month Payroll
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Processed Months", value: monthSummaries.length, subtext: "Historical pay cycles run", icon: CalendarIcon },
            { label: "Total YTD Gross", value: `${currencySymbol}${monthSummaries.reduce((sum, m) => sum + m.gross, 0).toLocaleString('en-IN')}`, subtext: "Accumulated organizational cost", icon: TrendingUp },
            { label: "Total YTD Net Payout", value: `${currencySymbol}${monthSummaries.reduce((sum, m) => sum + m.net, 0).toLocaleString('en-IN')}`, subtext: "Net salary disbursed to staff", icon: Wallet, valueColor: "text-primary" },
            { label: "Avg Month Net", value: `${currencySymbol}${monthSummaries.length > 0 ? Math.round(monthSummaries.reduce((sum, m) => sum + m.net, 0) / monthSummaries.length).toLocaleString('en-IN') : '0'}`, subtext: "Average net monthly payout", icon: BarChart3 }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                </div>
                <div className={`my-1 text-2xl font-bold tracking-tight ${card.valueColor || 'text-foreground'} tabular-nums`}>
                  {card.value}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate" title={card.label}>
                    {card.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {showNewMonthModal && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-xl border border-border animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 flex items-center justify-center text-primary">
                  <CalendarIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Select Payroll Month</h3>
                  <p className="text-muted-foreground text-xs">Choose the period to process salaries</p>
                </div>
              </div>

              <div className="space-y-2 mb-6 mt-5">
                <Label className="text-foreground text-sm font-semibold">Month & Year</Label>
                <ModernDatePicker
                  value={newMonthInput ? `${newMonthInput}-01` : ""}
                  onChange={(date) => {
                    if (date) {
                      setNewMonthInput(date.substring(0, 7));
                      setMonthError("");
                    } else {
                      setNewMonthInput("");
                    }
                  }}
                  placeholder="Select Month & Year"
                  error={!!monthError}
                  required
                />
                {monthError && <p className="text-xs text-red-500 mt-1 font-semibold">{monthError}</p>}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewMonthModal(false);
                    setMonthError("");
                  }}
                  className="flex-1 rounded-lg h-11 border-border hover:bg-muted font-bold text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!newMonthInput) {
                      setMonthError("Please select a month and year");
                      return;
                    }
                    setMonthError("");
                    setSelectedRunMonth(newMonthInput);
                    setShowNewMonthModal(false);
                  }}
                  className="flex-1 rounded-lg h-11 bg-primary hover:bg-primary/95 font-bold text-white shadow-sm shadow-primary-100"
                >
                  Initialize
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <Card className="border border-border/80 shadow-sm bg-card rounded-xl overflow-hidden">
          <CardContent className="px-0 pb-0 pt-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px] border-collapse">
                <TableHeader className="bg-muted border-y border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 pr-4 py-4 text-left text-sm font-semibold text-muted-foreground">Period</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Employees Processed</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Total Gross Payout</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Total Deductions</TableHead>
                    <TableHead className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Total Net Payout</TableHead>
                    <TableHead className="pr-6 pl-4 py-4 text-right text-sm font-semibold text-muted-foreground">Overall Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <TableRow key={`skeleton-${i}`} className="border-b border-border/50">
                          <TableCell className="pl-6 py-4"><div className="h-4 bg-muted rounded animate-pulse w-32" /></TableCell>
                          <TableCell className="py-4"><div className="h-4 bg-muted rounded animate-pulse w-24" /></TableCell>
                          <TableCell className="py-4"><div className="h-4 bg-muted rounded animate-pulse w-28" /></TableCell>
                          <TableCell className="py-4"><div className="h-4 bg-muted rounded animate-pulse w-28" /></TableCell>
                          <TableCell className="py-4"><div className="h-4 bg-muted rounded animate-pulse w-28" /></TableCell>
                          <TableCell className="text-right pr-6 py-4"><div className="h-5 bg-muted rounded-full animate-pulse w-16 ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : monthSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                        <div className="flex flex-col items-center max-w-xs mx-auto">
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-50 to-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center mb-4">
                            <FileText className="size-9 text-primary/30" />
                          </div>
                          <p className="font-bold text-foreground text-sm mb-1">No payroll history found</p>
                          <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
                            Start by choosing a month to begin salary calculations for your organization.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : monthSummaries.map((sum: any) => (
                    <TableRow key={sum.month} className="hover:bg-muted/40 transition-colors cursor-pointer group border-b border-border/50" onClick={() => setSelectedRunMonth(sum.month)}>
                      <TableCell className="pl-6 py-4">
                        <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{formatMonthName(sum.month)}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="size-3.5 text-primary" />
                          </div>
                          <div>
                            <span className="font-bold text-sm">{sum.employees}</span>
                            <span className="text-xs text-muted-foreground ml-1">staff</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono py-4">
                        {currencySymbol}{sum.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-rose-500 dark:text-rose-400 font-bold text-sm font-mono py-4">
                        {currencySymbol}{sum.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-bold text-[14px] font-mono py-4">
                        {currencySymbol}{sum.net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <Badge
                          className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${sum.status === 'PAID'
                              ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900'
                              : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                            }`}
                          variant="outline"
                        >
                          {sum.status === 'PAID' && <CheckCircle2 className="size-3 mr-1" />}
                          {sum.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const processedPayslipsForMonth = recentRuns.filter(run => run.month === selectedRunMonth);
  const monthNet = processedPayslipsForMonth.reduce((acc, r) => acc + parseFloat(r.net_amount || 0), 0);
  const monthGross = processedPayslipsForMonth.reduce((acc, r) => acc + parseFloat(r.gross_amount || 0), 0);
  const monthDeductions = processedPayslipsForMonth.reduce((acc, r) => acc + parseFloat(r.deduction_amount || 0), 0);
  const monthEmpCount = processedPayslipsForMonth.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setSelectedRunMonth(null)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-bold uppercase tracking-wider transition-colors w-fit group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Back to Run History
        </button>
        <PageHeader
          title={
            <>
              Payroll Workspace
              <span className="text-primary/80 ml-2">{formatMonthName(selectedRunMonth)}</span>
            </>
          }
          description="Inspect processed employee payslips, update statuses, or execute salary runs."
          icon={<Calculator className="size-8" />}
          action={
            <Badge
              className={`rounded-full px-4 py-1.5 text-xs font-black tracking-wider uppercase border-2 ${processedPayslipsForMonth.every(r => r.status?.toUpperCase() === 'PAID') && processedPayslipsForMonth.length > 0
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                }`}
              variant="outline"
            >
              {processedPayslipsForMonth.every(r => r.status?.toUpperCase() === 'PAID') && processedPayslipsForMonth.length > 0
                ? <><CheckCircle2 className="size-3 mr-1" /> PAID</>
                : <><Clock className="size-3 mr-1" /> PROCESSING</>}
            </Badge>
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-primary shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {monthEmpCount} <span className="text-xs text-muted-foreground font-normal">/ {employees.length} total</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Processed Employees
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">
              {employees.length > 0 ? Math.round((monthEmpCount / employees.length) * 100) : 0}% of staff processed
            </span>
          </div>
        </div>

        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {currencySymbol}{monthGross.toLocaleString('en-IN')}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Total Gross
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">Gross salary liability</span>
          </div>
        </div>

        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <TrendingDown className="w-5 h-5 text-rose-500 shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-rose-500 dark:text-rose-400 tabular-nums">
            {currencySymbol}{monthDeductions.toLocaleString('en-IN')}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Total Deductions
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">TDS, PT, ESI, EPF deductions</span>
          </div>
        </div>

        <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Wallet className="w-5 h-5 text-violet-600 shrink-0" />
          </div>
          <div className="my-1 text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400 tabular-nums">
            {currencySymbol}{monthNet.toLocaleString('en-IN')}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
              Net Take-Home
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">Net take-home payout</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="payslist" className="w-full">
        <TabsList className="bg-muted p-1 rounded-lg w-fit mb-6">
          <TabsTrigger
            value="payslist"
            className="rounded-lg px-5 font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <FileText className="size-4 mr-2" />
            Processed Payslips
          </TabsTrigger>
          <TabsTrigger
            value="calculate"
            className="rounded-lg px-5 font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Calculator className="size-4 mr-2" />
            Run Calculation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payslist" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/50 p-4 rounded-lg border border-border backdrop-blur-md shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              <Input
                placeholder="Search processed staff..."
                className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all text-foreground"
                value={searchTermPayslips}
                onChange={(e) => setSearchTermPayslips(e.target.value)}
              />
            </div>

            <div className="text-xs text-muted-foreground font-semibold bg-primary/10 border border-primary/10 px-3 py-2 rounded-lg h-10 flex items-center">
              Showing {processedPayslipsForMonth.filter(p => {
                const fullName = `${p.user?.details?.first_name || ''} ${p.user?.details?.last_name || ''}`.toLowerCase();
                return fullName.includes(searchTermPayslips.toLowerCase());
              }).length} of {monthEmpCount} processed records
            </div>
          </div>

          <Card className="border-none shadow-sm bg-card/85 backdrop-blur-md overflow-hidden">
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px] border-collapse">
                  <TableHeader className="bg-muted border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Period</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross Amount</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Deductions</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Take-home</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedPayslipsForMonth.filter(p => {
                      const fullName = `${p.user?.details?.first_name || ''} ${p.user?.details?.last_name || ''}`.toLowerCase();
                      return fullName.includes(searchTermPayslips.toLowerCase());
                    }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 dark:from-slate-900 to-gray-50 dark:to-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center mb-4">
                              <Search className="size-7 text-gray-300 dark:text-gray-500" />
                            </div>
                            <p className="font-bold text-foreground text-sm">No records found</p>
                            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : processedPayslipsForMonth.filter(p => {
                      const fullName = `${p.user?.details?.first_name || ''} ${p.user?.details?.last_name || ''}`.toLowerCase();
                      return fullName.includes(searchTermPayslips.toLowerCase());
                    }).map((run) => (
                      <TableRow key={run.id} className="hover:bg-muted/40 transition-colors group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0">
                              {(run.user?.details?.first_name?.[0] || '').toUpperCase()}{(run.user?.details?.last_name?.[0] || '').toUpperCase() || 'E'}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm">
                                {run.user?.details?.first_name || ''} {run.user?.details?.last_name || ''}
                              </p>
                              <p className="text-xs text-muted-foreground">{run.user?.details?.employee_id || 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-600 dark:text-gray-400">{formatMonthName(run.month)}</TableCell>
                        <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">{currencySymbol}{parseFloat(run.gross_amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-rose-500 dark:text-rose-400 font-bold text-sm font-mono">{currencySymbol}{parseFloat(run.deduction_amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="font-extrabold text-black dark:text-foreground font-mono text-[14px]">{currencySymbol}{parseFloat(run.net_amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <Select
                            value={run.status}
                            onValueChange={async (newStatus) => {
                              try {
                                await updatePayrollRun(run.id, { status: newStatus });
                                toast.success("Status updated!");
                                fetchRecentRuns();
                              } catch (e) {
                                toast.error("Failed to update status");
                              }
                            }}
                          >
                            <SelectTrigger className="w-32 h-9 text-xs rounded-lg border-border bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PAID">PAID</SelectItem>
                              <SelectItem value="BALANCE">BALANCE</SelectItem>
                              <SelectItem value="PENDING">PENDING</SelectItem>
                              <SelectItem value="DRAFT">DRAFT</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 border-primary/20 text-primary hover:bg-primary/10 rounded-lg"
                              onClick={() => generatePDF(run)}
                            >
                              <Download className="size-3.5 mr-1.5" />
                              Payslip
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                              onClick={() => toast.info("Cannot delete confirmed historical payout record.")}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculate" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card/50 p-4 rounded-lg border border-border backdrop-blur-md shadow-sm gap-4">
            <div>
              <h3 className="font-bold text-foreground text-lg">Calculate Payouts for <span className="text-primary">{formatMonthName(selectedRunMonth)}</span></h3>
              <p className="text-xs text-muted-foreground">Locked on month {selectedRunMonth}. Pro-rata attendance calculated automatically.</p>
            </div>

            <div className="flex bg-muted p-1.5 rounded-lg border border-border">
              <Button
                variant={!isBulkMode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => { setIsBulkMode(false); setBulkResults([]); }}
                className={`rounded-lg px-4 ${!isBulkMode ? "bg-primary text-primary-foreground shadow-sm font-bold" : "text-muted-foreground"}`}
              >
                <User className="size-3.5 mr-1.5" />
                Individual
              </Button>
              <Button
                variant={isBulkMode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => { setIsBulkMode(true); setCalculatedPayroll(null); }}
                className={`rounded-lg px-4 ${isBulkMode ? "bg-primary text-primary-foreground shadow-sm font-bold" : "text-muted-foreground"}`}
              >
                <Zap className="size-3.5 mr-1.5" />
                Bulk Mode
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-card/80 backdrop-blur-md">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  {isBulkMode ? <Users className="size-5 text-blue-600 dark:text-blue-400" /> : <Calculator className="size-5 text-blue-600 dark:text-blue-400" />}
                  <div>
                    <CardTitle>{isBulkMode ? "Bulk Payroll Processing" : "Calculate Employee Salary"}</CardTitle>
                    <CardDescription>
                      {isBulkMode
                        ? `Calculate salaries for an entire payroll group at once for ${formatMonthName(selectedRunMonth)}`
                        : `Select an employee to calculate individual payroll for ${formatMonthName(selectedRunMonth)}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>{isBulkMode ? "Select Payroll Group" : "Select Employee"}</Label>
                    {isBulkMode ? (
                      <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger className="rounded-lg border-border h-11">
                          <SelectValue placeholder="All Employees" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                          <SelectItem value="all">All Groups</SelectItem>
                          {payrollGroups.map(group => (
                            <SelectItem key={group.id} value={group.id.toString()}>{group.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger className="rounded-lg border-border h-11">
                          <SelectValue placeholder="Choose employee..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.name} ({emp.employeeCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Payroll Month</Label>
                    <div className="relative">
                      <Input
                        value={formatMonthName(selectedRunMonth)}
                        disabled
                        className="rounded-lg h-11 border-border bg-muted text-muted-foreground font-semibold"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {!isBulkMode ? (
                  <div className="space-y-5">
                    <div className="bg-gradient-to-r from-blue-50/80 dark:from-blue-950/30 to-primary/5 rounded-xl border border-blue-100/60 dark:border-blue-900/60 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                          <Clock className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <Label className="text-sm font-bold text-blue-900 dark:text-blue-300">Attendance Details</Label>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Working Days</Label>
                          <Input type="number" value={workingDays} className="rounded-lg bg-white/70 dark:bg-card" onChange={(e) => setWorkingDays(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Present Days</Label>
                          <Input type="number" value={presentDays} className="rounded-lg bg-white/70 dark:bg-card" onChange={(e) => setPresentDays(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-rose-600 dark:text-rose-400 font-semibold">LOP Days</Label>
                          <Input type="number" value={lopDays} className="rounded-lg border-rose-200 dark:border-rose-800 bg-white/70 dark:bg-card dark:bg-card focus:border-rose-400 dark:focus:border-rose-500" onChange={(e) => setLopDays(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Overtime Hours</Label>
                          <Input type="number" value={overtimeHours} className="rounded-lg bg-white/70 dark:bg-card" onChange={(e) => setOvertimeHours(Number(e.target.value))} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50/80 dark:from-emerald-950/30 to-green-50/50 dark:to-emerald-950/20 rounded-xl border border-emerald-100/60 dark:border-emerald-900/60 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <CircleDollarSign className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <Label className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Additional Compensation</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 text-left">
                          <Label className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Salary Revision / Arrears ({currencySymbol})</Label>
                          <Input
                            type="number"
                            value={arrearsAmount || ''}
                            placeholder="e.g. 5000"
                            className="rounded-lg border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/70 dark:bg-card dark:bg-card"
                            onChange={(e) => setArrearsAmount(Number(e.target.value))}
                          />
                          <p className="text-[10px] text-muted-foreground">Added directly to monthly earnings, recalculating statutory limits & TDS.</p>
                        </div>
                        <div className="space-y-1.5 text-left">
                          <Label className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Performance Bonus ({currencySymbol})</Label>
                          <Input
                            type="number"
                            value={bonusAmount || ''}
                            placeholder="e.g. 10000"
                            className="rounded-lg border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/70 dark:bg-card dark:bg-card"
                            onChange={(e) => setBonusAmount(Number(e.target.value))}
                          />
                          <p className="text-[10px] text-muted-foreground">Incentive amount processed alongside the monthly payroll run.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isFetching && isBulkMode && (
                  <div className="flex items-center gap-3 p-4 mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg">
                    <Loader2 className="size-5 text-primaryanimate-spin" />
                    <div>
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Processing bulk calculations...</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Calculating payroll for each employee in the group</p>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-primary hover:bg-primary/95 h-11 text-base font-bold rounded-lg shadow-sm shadow-primary-50/50 dark:shadow-primary/20 transition-all hover:scale-[1.01]"
                  onClick={isBulkMode ? calculateBulkPayroll : calculatePayroll}
                  disabled={isFetching || (!isBulkMode && !selectedEmployee)}
                >
                  {isFetching ? (
                    <><Loader2 className="size-5 mr-2 animate-spin" /> Processing...</>
                  ) : isBulkMode ? (
                    <><Zap className="size-5 mr-2" /> Start Bulk Calculation</>
                  ) : (
                    "Calculate Individual Salary"
                  )}
                </Button>

                {isBulkMode && bulkResults.length > 0 && (
                  <div className="mt-8 border-t pt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                          Bulk Summary
                        </h3>
                        <p className="text-xs text-muted-foreground">{bulkResults.length} employees calculated successfully</p>
                      </div>
                      <div className="text-right bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 rounded-lg px-4 py-2">
                        <p className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">Total Net Outflow</p>
                        <p className="text-xl font-extrabold text-violet-700 dark:text-violet-300 font-mono">
                          {currencySymbol}{bulkResults.reduce((acc, r) => acc + r.net, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto border rounded-lg shadow-sm">
                      <Table className="min-w-[600px]">
                        <TableHeader className="bg-muted">
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Gross</TableHead>
                            <TableHead>Deductions</TableHead>
                            <TableHead className="font-bold text-primary">Net Pay</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkResults.map((res, idx) => (
                            <TableRow
                              key={res.id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
                              onClick={() => {
                                setSelectedEmployee(res.id);
                              }}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                    {res.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'E'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground text-sm">{res.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{res.id_code}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{currencySymbol}{res.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-red-500 dark:text-red-400 font-semibold font-mono text-sm">{currencySymbol}{res.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="font-black text-primary font-mono text-sm">{currencySymbol}{res.net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex flex-col gap-4 mt-6 pt-6 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-foreground">Set Group Payment Status</Label>
                        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                          <SelectTrigger className="w-48 h-10 rounded-lg border-border bg-card">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">PAID</SelectItem>
                            <SelectItem value="BALANCE">BALANCE</SelectItem>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="DRAFT">DRAFT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm shadow-green-50 dark:shadow-green-900/50 transition-all hover:scale-[1.01] active:scale-95"
                        onClick={handleBulkSave}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <><Loader2 className="size-5 mr-2 animate-spin" /> Finalizing Runs...</>
                        ) : (
                          <><CheckCircle2 className="size-5 mr-2" /> Finalize & Post Group as {paymentStatus}</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card/80 backdrop-blur-md h-fit lg:sticky lg:top-6">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Result Breakdown</CardTitle>
                    <CardDescription>Final calculated amounts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isFetching && !isBulkMode && selectedEmployee ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg animate-pulse">
                      <div className="size-10 bg-blue-200 dark:bg-blue-800 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-3/4" />
                        <div className="h-3 bg-blue-100 dark:bg-blue-950/40 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-3 pt-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between">
                          <div className="h-4 bg-muted rounded animate-pulse w-24" />
                          <div className="h-4 bg-muted rounded animate-pulse w-20" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 pt-4 border-t">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex justify-between">
                          <div className="h-4 bg-muted rounded animate-pulse w-28" />
                          <div className="h-4 bg-muted rounded animate-pulse w-16" />
                        </div>
                      ))}
                    </div>
                    <div className="h-20 bg-gradient-to-r from-primary/10 to-violet-100 rounded-lg animate-pulse mt-4" />
                  </div>
                ) : calculatedPayroll ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 dark:from-blue-950/30 to-primary/5 rounded-xl border border-blue-100 dark:border-blue-900">
                      <div className="size-11 bg-gradient-to-br from-blue-500 to-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-primary/20 shrink-0">
                        {calculatedPayroll.employee?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'E'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-foreground text-sm truncate">{calculatedPayroll.employee?.name}</p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{calculatedPayroll.employee?.salaryGrade || 'Standard'}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
                          <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Earnings</p>
                      </div>
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100/60 dark:border-emerald-900/60 p-3 space-y-1.5">
                        {Object.entries(calculatedPayroll.earnings).map(([name, amount]) => (
                          <div key={name} className="flex justify-between text-sm">
                            <span className="text-emerald-800/70 dark:text-emerald-300/80 font-medium text-xs">{name}</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono text-xs">{currencySymbol}{(amount as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="border-t border-emerald-200 pt-1.5 mt-1.5 flex justify-between">
                          <span className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">Gross Earnings</span>
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-300 font-mono text-xs">{currencySymbol}{calculatedPayroll.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-5 h-5 rounded bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
                          <TrendingDown className="size-3 text-rose-500 dark:text-rose-400" />
                        </div>
                        <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Deductions</p>
                      </div>
                      <div className="bg-rose-50/50 dark:bg-rose-950/30 rounded-lg border border-rose-100/60 dark:border-rose-900/60 p-3 space-y-1.5">
                        {Object.entries(calculatedPayroll.deductions).map(([name, amount]) => {
                          const isTds = name.includes('TDS') || name.toLowerCase().includes('tax');
                          return (
                            <div key={name} className={`flex justify-between text-sm ${isTds ? 'relative group cursor-help' : ''}`}>
                              <span className={`text-xs ${isTds ? 'text-primary font-semibold underline decoration-dotted decoration-primary/40' : 'text-rose-800/70 dark:text-rose-300/80 font-medium'}`}>
                                {name}
                              </span>
                              <span className="font-bold text-rose-500 dark:text-rose-400 font-mono text-xs">{currencySymbol}{(amount as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>

                              {isTds && (
                                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-sm w-72 border border-slate-800 animate-in fade-in duration-200">
                                  <div className="font-bold text-[10px] text-muted-foreground uppercase mb-2 tracking-wider font-sans not-italic">TDS Calculation Breakdown</div>
                                  <div className="space-y-1.5 font-sans not-italic text-slate-200 text-[11px]">
                                    <div className="flex justify-between">
                                      <span>Annual Gross:</span>
                                      <span className="font-mono">{currencySymbol}{Math.round(calculatedPayroll.annualIncome || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-400 font-semibold">
                                      <span>Total Exemptions:</span>
                                      <span className="font-mono">-{currencySymbol}{Math.round(calculatedPayroll.taxExemptionsTotal || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="border-t border-slate-800 my-1 pt-1 flex justify-between font-bold">
                                      <span>Net Taxable:</span>
                                      <span className="font-mono">{currencySymbol}{Math.round(calculatedPayroll.netTaxableIncome || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-2 font-bold uppercase border-t border-slate-800 pt-1.5">Applied Section Exemptions:</div>
                                    {Object.entries(calculatedPayroll.taxExemptionsBreakdown || {}).map(([sec, data]: any) => (
                                      <div key={sec} className="flex justify-between text-slate-300">
                                        <span>{sec}:</span>
                                        <span className="font-mono">
                                          {currencySymbol}{Math.round(data.allowed).toLocaleString('en-IN')}{' '}
                                          <span className="text-[9px] text-muted-foreground">
                                            (Decl: {currencySymbol}{Math.round(data.declared).toLocaleString('en-IN')})
                                          </span>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="absolute top-full right-6 -translate-y-1 border-4 border-transparent border-t-slate-900"></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {calculatedPayroll.lopDeductionAmount > 0 && (
                          <div className="relative group flex justify-between text-sm text-rose-500 dark:text-rose-400 italic font-semibold cursor-help">
                            <span className="text-xs underline decoration-dotted decoration-red-400">LOP ({calculatedPayroll.lopDays} days)</span>
                            <span className="font-mono text-xs">-{currencySymbol}{calculatedPayroll.lopDeductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>

                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 bg-slate-900 text-white text-xs font-medium px-3.5 py-2.5 rounded-lg shadow-sm w-64 border border-slate-800 animate-in fade-in duration-200">
                              <div className="font-bold text-[10px] text-muted-foreground uppercase mb-1 tracking-wider font-sans not-italic">Approved Leave Reasons</div>
                              <div className="whitespace-pre-line leading-relaxed font-sans not-italic font-medium text-slate-200">{lopReasons || "Loss of Pay"}</div>
                              <div className="absolute top-full left-6 -translate-y-1 border-4 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        )}
                        <div className="border-t border-rose-200 dark:border-rose-800 pt-1.5 mt-1.5 flex justify-between">
                          <span className="font-bold text-rose-900 dark:text-rose-300 text-xs">Total Deductions</span>
                          <span className="font-extrabold text-rose-500 dark:text-rose-400 font-mono text-xs">{currencySymbol}{calculatedPayroll.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {calculatedPayroll.grossSalary > 0 && (
                      <div className="px-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold mb-1">
                          <span>Earnings Retained</span>
                          <span>{Math.round(((calculatedPayroll.grossSalary - calculatedPayroll.totalDeductions) / calculatedPayroll.grossSalary) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-rose-100 dark:bg-rose-950/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(0, Math.min(100, ((calculatedPayroll.grossSalary - calculatedPayroll.totalDeductions) / calculatedPayroll.grossSalary) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-primary to-violet-700 dark:to-violet-800 p-5 rounded-xl text-white shadow-lg shadow-primary/10 dark:shadow-primary/20 font-sans">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="size-4 text-white/70" />
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Net Take-home</p>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black font-mono">{currencySymbol}{calculatedPayroll.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-white/50 text-xs">/ month</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Status</Label>
                        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                          <SelectTrigger className="w-full h-10 rounded-lg border-border bg-card">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">PAID</SelectItem>
                            <SelectItem value="BALANCE">BALANCE</SelectItem>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="DRAFT">DRAFT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full h-12 rounded-lg bg-gray-900 hover:bg-black text-white font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm shadow-gray-100 dark:shadow-gray-900"
                        onClick={handleSaveRun}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <><Loader2 className="size-4 mr-2 animate-spin" /> Finalizing...</>
                        ) : (
                          <><CheckCircle2 className="size-4 mr-2" /> Post as {paymentStatus}</>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 dark:from-slate-900 to-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center mx-auto mb-4">
                      <Calculator className="size-9 text-primary/30" />
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1">Select a staff member</p>
                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                      Choose an employee from the dropdown to run individual payroll calculations.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

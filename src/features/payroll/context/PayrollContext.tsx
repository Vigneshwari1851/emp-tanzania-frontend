import React, { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { getEmployees } from '@/features/employees/services/employees';
import * as payrollService from '../services/payroll';
import { useAuth } from '@/shared/context/AuthContext';

// Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string;
  employeeCode: string;
  location: string;
  salaryGrade: string;
  bankAccount: string;
  panNumber: string;
  pfNumber: string;
  esiNumber: string;
  status: 'active' | 'inactive' | 'exited';
  baseSalary?: number;
  payrollGroupId?: string;
  payrollGroupName?: string;
  departmentId?: string;
  teamId?: string;
  roleId?: string;
  locationId?: string;
  gender?: string;
  employmentType?: string;
  compensationBreakdown?: any[];
}

export interface SalaryComponent {
  id: string;
  name: string;
  type: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage';
  value: number;
  isTaxable: boolean;
  isStatutory: boolean;
  isDefault?: boolean;
}

export interface SalaryStructure {
  id: string;
  name: string;
  roleId?: string;
  employeeId?: string;
  components: SalaryComponent[];
  level: 'role' | 'employee';
  // Added fields for payroll calculation
  grade?: string; // e.g., "A1", "B2" – matches employee.salaryGrade
  ctc?: number;   // Cost to company for the year
}

export interface PayrollGroup {
  id: string;
  name: string;
  criteria?: any;
  employeeCount?: number;
  structureId?: string;
  paymentCategoryId?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: 'present' | 'absent' | 'halfday' | 'leave' | 'holiday';
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  leaveType: 'casual' | 'sick' | 'earned' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface PayrollTransaction {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
  payDate?: string;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
}

export interface LoanRecord {
  id: string;
  employeeId: string;
  amount: number;
  disbursedDate: string;
  emiAmount: number;
  totalEmis: number;
  paidEmis: number;
  status: 'active' | 'closed';
}

interface PayrollContextType {
  employees: Employee[];
  salaryStructures: SalaryStructure[];
  attendanceRecords: AttendanceRecord[];
  leaveRecords: LeaveRecord[];
  payrollTransactions: PayrollTransaction[];
  loanRecords: LoanRecord[];
  salaryComponents: SalaryComponent[];
  payCycle: {
    frequency: string;
    payDay: string;
    attendanceStart: string;
    attendanceEnd: string;
    cutoffDate: number;
  };
  groups: PayrollGroup[];
  taxSections: Array<{
    id: string;
    section: string;
    label: string;
    limit: number;
    instruments: string[];
  }>;
  reimbTypes: Array<{
    id: string;
    type: string;
    label: string;
    limit: number;
    period: string;
    roleId?: string;
    departmentId?: string;
    branchId?: string;
    payrollGroupId?: string;
    role?: any;
    department?: any;
    branch?: any;
    payroll_group?: any;
  }>;
  categories: Array<{
    id: string;
    name: string;
    frequency: string;
    payDay: string;
    status: boolean;
    color: string;
  }>;
  isLoading: boolean;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  addSalaryStructure: (structure: any) => Promise<void>;
  updateSalaryStructure: (id: string, structure: any) => Promise<void>;
  removeSalaryStructure: (id: string) => Promise<void>;
  addSalaryComponent: (component: any) => Promise<void>;
  updateSalaryComponent: (id: string, component: any) => Promise<any>;
  updatePayCycle: (cycle: any) => Promise<void>;
  addGroup: (group: any) => Promise<void>;
  updateGroup: (id: string, group: any) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  addAttendance: (record: AttendanceRecord) => void;
  addLeave: (record: LeaveRecord) => void;
  addPayrollTransaction: (transaction: PayrollTransaction) => void;
  addLoan: (loan: LoanRecord) => void;
  addTaxSection: (section: any) => Promise<void>;
  updateTaxSection: (id: string, section: any) => Promise<void>;
  removeTaxSection: (id: string) => Promise<void>;
  addReimbursementType: (reimb: any) => Promise<void>;
  updateReimbursementType: (id: string, reimb: any) => Promise<void>;
  removeReimbursementType: (id: string) => Promise<void>;
  addCategory: (category: any) => Promise<void>;
  updateCategory: (id: string, category: any) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  removeSalaryComponent: (id: string) => Promise<void>;
  setSalaryComponents: React.Dispatch<React.SetStateAction<SalaryComponent[]>>;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayroll must be used within PayrollProvider');
  }
  return context;
};

export const PayrollProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        let isManagement = false;
        if (user) {
          let rawRole = Array.isArray(user?.role) ? (user?.role[0] || '') : (user?.role || '');
          if (typeof rawRole === 'object' && rawRole !== null) {
            rawRole = rawRole.name || rawRole.code || rawRole.id || '';
          }
          const role = rawRole.toString().toUpperCase().replace(/[\s_]+/g, '');
          isManagement = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'HR' || role === 'FINANCE';
        }

        const results = await Promise.allSettled([
          getEmployees({ limit: 1000 }), // Increase limit to fetch all employees
          isManagement ? payrollService.getSalaryComponents() : Promise.resolve(null),
          isManagement ? payrollService.getSalaryStructures() : Promise.resolve(null),
          isManagement ? payrollService.getPayrollGroups() : Promise.resolve(null),
          isManagement ? payrollService.getTaxSections() : Promise.resolve(null),
          isManagement ? payrollService.getReimbursementTypes() : Promise.resolve(null),
          isManagement ? payrollService.getPaymentCategories() : Promise.resolve(null),
          isManagement ? payrollService.getPayCycle() : Promise.resolve(null)
        ]);

        const getValue = (result: any, index: number) => {
          if (result.status === 'fulfilled') return result.value;
          if (result.reason?.response?.status !== 403) {
            console.error(`Payroll API at index ${index} failed:`, result.reason);
          }
          return null;
        };

        const empData = getValue(results[0], 0);
        const compData = getValue(results[1], 1);
        const structData = getValue(results[2], 2);
        const groupData = getValue(results[3], 3);
        const taxData = getValue(results[4], 4);
        const reimbData = getValue(results[5], 5);
        const catData = getValue(results[6], 6);
        const payCycleData = getValue(results[7], 7);

        // Map Employees
        const mappedEmployees: Employee[] = (empData || []).map((emp: any) => {
          // Parse compensation breakdown if it's a JSON string
          let parsedBreakdown = [];
          try {
            if (typeof emp.details?.compensation_breakdown === 'string') {
              parsedBreakdown = JSON.parse(emp.details.compensation_breakdown);
            } else if (Array.isArray(emp.details?.compensation_breakdown)) {
              parsedBreakdown = emp.details.compensation_breakdown;
            }
          } catch (e) {
            console.error("Failed to parse breakdown for", emp.id);
          }

          return {
            id: emp.id?.toString() || '0',
            name: emp.details ? `${emp.details.first_name || ''} ${emp.details.last_name || ''}`.trim() : (emp.username || emp.email || 'Unknown'),
            email: emp.email || '',
            department: emp.details?.department?.department_name || 'N/A',
            designation: emp.details?.job_role || emp.details?.role?.role_name || 'N/A',
            joiningDate: emp.details?.start_date || '',
            employeeCode: emp.details?.employee_id || `EMP${emp.id || '?'}`,
            location: emp.details?.work_location || 'N/A',
            salaryGrade: emp.details?.salary_grade || 'N/A',
            bankAccount: emp.details?.account_number || 'N/A',
            panNumber: emp.details?.pan_number || 'N/A',
            pfNumber: 'N/A',
            esiNumber: 'N/A',
            status: emp.status ? 'active' : 'inactive',
            baseSalary: emp.details?.base_salary ? parseFloat(emp.details.base_salary) : 0,
            payrollGroupId: (emp.details?.payroll_group_id || emp.details?.payroll_group?.id || emp.payroll_group_id || emp.payroll_group?.id)?.toString() || '',
            payrollGroupName: (emp.details?.payroll_group?.name || emp.payroll_group?.name || '')?.toString(),
            departmentId: emp.details?.department_id?.toString() || '',
            teamId: emp.details?.team_id?.toString() || '',
            roleId: emp.details?.role_id?.toString() || emp.role_id?.toString() || '',
            locationId: emp.details?.location_id?.toString() || '',
            gender: emp.details?.gender || '',
            employmentType: emp.details?.employment_type || '',
            compensationBreakdown: parsedBreakdown
          };
        });
        setEmployees(mappedEmployees);

        // Map Components
        const mappedComponents = (compData || []).map((c: any) => ({
          id: c.id?.toString() || '0',
          name: c.name || 'Unnamed',
          type: c.type || 'earning',
          calculationType: c.calculation_type || 'fixed',
          value: parseFloat(c.value) || 0,
          isTaxable: !!c.is_taxable,
          isStatutory: !!c.is_statutory,
          isDefault: !!c.is_default
        }));
        setSalaryComponents(mappedComponents);

        // Map Structures
        setSalaryStructures((structData || []).map((s: any) => ({
          id: s.id?.toString() || '0',
          name: s.name || 'Standard Structure',
          level: s.level || 'role',
          roleId: s.role_id?.toString(),
          employeeId: s.employee_id?.toString(),
          grade: s.grade || 'N/A',
          ctc: s.ctc ? parseFloat(s.ctc) : 0,
          components: (s.components || []).map((sc: any) => ({
            id: (sc.salary_component?.id || sc.id)?.toString() || '0',
            name: sc.salary_component?.name || sc.name || 'Unnamed',
            type: sc.salary_component?.type || sc.type || 'earning',
            calculationType: sc.salary_component?.calculation_type || sc.calculationType || 'fixed',
            value: parseFloat(sc.salary_component?.value || sc.value) || 0,
            isTaxable: !!(sc.salary_component?.is_taxable ?? sc.isTaxable),
            isStatutory: !!(sc.salary_component?.is_statutory ?? sc.isStatutory)
          }))
        })));

        // Map Groups
        setGroups((groupData || []).map((g: any) => {
          let parsedCriteria = {};
          
          if (g.criteria) {
            if (typeof g.criteria === 'object') {
              parsedCriteria = g.criteria;
            } else if (typeof g.criteria === 'string' && g.criteria.trim().startsWith('{')) {
              try {
                parsedCriteria = JSON.parse(g.criteria);
              } catch (e) {
                console.warn("Could not parse criteria string for group", g.id, g.criteria);
              }
            }
          }

          return {
            id: g.id?.toString() || '0',
            name: g.name || 'Unnamed Group',
            criteria: parsedCriteria,
            employeeCount: 0,
            structureId: g.salary_structure_id?.toString() || '',
            paymentCategoryId: g.payment_category_id?.toString() || ''
          };
        }));

        // Map Tax Sections
        setTaxSections((taxData || []).map((t: any) => ({
          id: t.id?.toString() || '0',
          section: t.section || '',
          label: t.label || '',
          limit: parseFloat(t.limit) || 0,
          instruments: Array.isArray(t.instruments) ? t.instruments : []
        })));

        // Map Reimb Types
        setReimbTypes((reimbData || []).map((r: any) => ({
          id: r.id?.toString() || '0',
          type: r.type || '',
          label: r.label || '',
          limit: parseFloat(r.limit) || 0,
          period: r.period || 'Monthly',
          roleId: r.role_id?.toString(),
          departmentId: r.department_id?.toString(),
          branchId: r.branch_id?.toString(),
          payrollGroupId: r.payroll_group_id?.toString(),
          role: r.role,
          department: r.department,
          branch: r.branch,
          payroll_group: r.payroll_group
        })));

        // Map Categories
        setCategories((catData || []).map((c: any) => {
          const colors: Record<string, string> = {
            'Regular': 'bg-blue-50 text-blue-700 border-blue-200',
            'Bonus': 'bg-amber-50 text-amber-700 border-amber-200',
            'Incentive': 'bg-emerald-50 text-emerald-700 border-emerald-200',
            'Contract': 'bg-purple-50 text-purple-700 border-purple-200',
          };
          return {
            id: c.id?.toString() || '0',
            name: c.name || 'Unnamed',
            frequency: c.frequency || 'Monthly',
            payDay: c.pay_day || '',
            status: !!c.status,
            color: colors[c.name] || 'bg-muted/50 text-foreground border-border'
          };
        }));

        // Map Pay Cycle
        if (payCycleData) {
          setPayCycle({
            frequency: payCycleData.frequency,
            payDay: payCycleData.pay_day,
            attendanceStart: `2026-03-${(payCycleData.attendance_start_day || 1).toString().padStart(2, '0')}`,
            attendanceEnd: `2026-03-${(payCycleData.attendance_end_day || 31).toString().padStart(2, '0')}`,
            cutoffDate: payCycleData.cutoff_day
          });
        }

      } catch (error) {
        console.error("Error fetching payroll data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);

  const [taxSections, setTaxSections] = useState<any[]>([]);
  const [reimbTypes, setReimbTypes]   = useState<any[]>([]);
  const [categories, setCategories]   = useState<any[]>([]);

  const [payCycle, setPayCycle] = useState<PayrollContextType['payCycle']>({
    frequency: 'monthly',
    payDay: 'last',
    attendanceStart: '2026-03-01',
    attendanceEnd: '2026-03-31',
    cutoffDate: 25,
  });

  const [groups, setGroups] = useState<any[]>([]);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [payrollTransactions, setPayrollTransactions] = useState<PayrollTransaction[]>([]);
  const [loanRecords, setLoanRecords] = useState<LoanRecord[]>([]);

  const addEmployee = (employee: Employee) => setEmployees(prev => [...prev, employee]);
  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp)));
  };

  const addSalaryStructure = async (structure: any) => {
    try {
      const res = await payrollService.createSalaryStructure(structure);
      
      // Map the newly created structure with full component details from the library
      const newStructure: SalaryStructure = {
        id: res.id?.toString() || Date.now().toString(),
        name: res.name || structure.name,
        level: res.level || structure.level,
        roleId: res.role_id?.toString() || structure.role_id?.toString(),
        employeeId: res.employee_id?.toString() || structure.employee_id?.toString(),
        components: (res.components || []).map((sc: any) => {
          const compId = (sc.salary_component_id || sc.salary_component?.id || sc.id)?.toString();
          const libraryComp = salaryComponents.find(c => c.id === compId);
          return {
            id: compId || '0',
            name: libraryComp?.name || sc.salary_component?.name || 'Unnamed',
            type: libraryComp?.type || sc.salary_component?.type || 'earning',
            calculationType: libraryComp?.calculationType || sc.salary_component?.calculation_type || 'fixed',
            value: libraryComp?.value || parseFloat(sc.salary_component?.value || sc.value) || 0,
            isTaxable: libraryComp?.isTaxable ?? !!sc.isTaxable,
            isStatutory: libraryComp?.isStatutory ?? !!sc.isStatutory
          };
        })
      };

      setSalaryStructures(prev => [...prev, newStructure]);
    } catch (error) {
       console.error("Error adding structure:", error);
       throw error;
    }
  };

  const updateSalaryStructure = async (id: string, structure: any) => {
    try {
      const res = await payrollService.updateSalaryStructure(id, structure);
      
      // Map the updated structure with full component details from the library
      const updatedStructure: SalaryStructure = {
        id: id,
        name: res.name || structure.name,
        level: res.level || structure.level,
        roleId: res.role_id?.toString() || structure.role_id?.toString(),
        employeeId: res.employee_id?.toString() || structure.employee_id?.toString(),
        components: (res.components || []).map((sc: any) => {
          const compId = (sc.salary_component_id || sc.salary_component?.id || sc.id)?.toString();
          const libraryComp = salaryComponents.find(c => c.id === compId);
          return {
            id: compId || '0',
            name: libraryComp?.name || sc.salary_component?.name || 'Unnamed',
            type: libraryComp?.type || sc.salary_component?.type || 'earning',
            calculationType: libraryComp?.calculationType || sc.salary_component?.calculation_type || 'fixed',
            value: libraryComp?.value || parseFloat(sc.salary_component?.value || sc.value) || 0,
            isTaxable: libraryComp?.isTaxable ?? !!sc.isTaxable,
            isStatutory: libraryComp?.isStatutory ?? !!sc.isStatutory
          };
        })
      };

      setSalaryStructures(prev => prev.map(s => s.id === id ? updatedStructure : s));
    } catch (error) {
       console.error("Error updating structure:", error);
       throw error;
    }
  };

  const removeSalaryStructure = async (id: string) => {
    try {
      await payrollService.deleteSalaryStructure(id);
      setSalaryStructures(prev => prev.filter(s => s.id !== id));
    } catch (error) {
       console.error("Error removing structure:", error);
       throw error;
    }
  };

  const addSalaryComponent = async (component: any) => {
    try {
      const res = await payrollService.createSalaryComponent(component);
      setSalaryComponents(prev => [...prev, {
          id: res.id?.toString() || Date.now().toString(),
          name: res.name || 'Unnamed',
          type: res.type || 'earning',
          calculationType: res.calculation_type || 'fixed',
          value: parseFloat(res.value) || 0,
          isTaxable: !!res.is_taxable,
          isStatutory: !!res.is_statutory,
          isDefault: !!res.is_default
      }]);
    } catch (error) {
       console.error("Error adding component:", error);
       throw error;
    }
  };

  const updateSalaryComponent = async (id: string, updates: any) => {
    try {
      const res = await payrollService.updateSalaryComponent(id, updates);
      // If backend returned a pending change (maker-checker), don't update local state
      if (res && res._pendingChange) {
        return res;
      }
      setSalaryComponents(prev => prev.map((comp) => (comp.id === id ? {
          id: res.id?.toString() || id,
          name: res.name || comp.name,
          type: res.type || comp.type,
          calculationType: res.calculation_type || comp.calculationType,
          value: parseFloat(res.value) || comp.value,
          isTaxable: !!(res.is_taxable ?? comp.isTaxable),
          isStatutory: !!(res.is_statutory ?? comp.isStatutory),
          isDefault: !!(res.is_default ?? comp.isDefault)
      } : comp)));
      return res;
    } catch (error) {
       console.error("Error updating component:", error);
       throw error;
    }
  };

  const updatePayCycle = async (updates: any) => {
    try {
      const res = await payrollService.updatePayCycle(updates);
      setPayCycle({
            frequency: res.frequency || 'monthly',
            payDay: res.pay_day || 'last',
            attendanceStart: `2026-03-${(res.attendance_start_day || 1).toString().padStart(2, '0')}`,
            attendanceEnd: `2026-03-${(res.attendance_end_day || 31).toString().padStart(2, '0')}`,
            cutoffDate: res.cutoff_day || 25
      });
    } catch (error) {
      console.error("Error updating pay cycle:", error);
      throw error;
    }
  };

  const addGroup = async (group: any) => {
    try {
      const res = await payrollService.createPayrollGroup(group);
      setGroups(prev => [...prev, {
        id: res.id?.toString() || Date.now().toString(),
        name: res.name || 'Unnamed',
        criteria: res.criteria,
        employeeCount: 0,
        structureId: res.salary_structure_id?.toString() || '',
        paymentCategoryId: res.payment_category_id?.toString() || ''
      }]);
    } catch (error) {
      console.error("Error adding group:", error);
      throw error;
    }
  };

  const updateGroup = async (id: string, group: any) => {
    try {
      const res = await payrollService.updatePayrollGroup(id, group);
      setGroups(prev => prev.map(g => g.id === id ? {
        id: res.id?.toString() || id,
        name: res.name || g.name,
        criteria: res.criteria || g.criteria,
        employeeCount: 0,
        structureId: res.salary_structure_id?.toString() || g.structureId,
        paymentCategoryId: res.payment_category_id?.toString() || g.paymentCategoryId
      } : g));
    } catch (error) {
      console.error("Error updating group:", error);
      throw error;
    }
  };

  const removeGroup = async (id: string) => {
    try {
      await payrollService.deletePayrollGroup(id);
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error("Error removing group:", error);
      throw error;
    }
  };

  const addTaxSection = async (section: any) => {
    try {
      const res = await payrollService.createTaxSection(section);
      setTaxSections(prev => [...prev, {
        id: res.id?.toString() || Date.now().toString(),
        section: res.section || '',
        label: res.label || '',
        limit: parseFloat(res.limit) || 0,
        instruments: Array.isArray(res.instruments) ? res.instruments : []
      }]);
    } catch (error) {
      console.error("Error adding tax section:", error);
      throw error;
    }
  };

  const updateTaxSection = async (id: string, section: any) => {
    try {
      const res = await payrollService.updateTaxSection(id, section);
      setTaxSections(prev => prev.map(s => s.id === id ? {
        id: res.id?.toString() || id,
        section: res.section || s.section,
        label: res.label || s.label,
        limit: parseFloat(res.limit) || s.limit,
        instruments: Array.isArray(res.instruments) ? res.instruments : s.instruments
      } : s));
    } catch (error) {
      console.error("Error updating tax section:", error);
      throw error;
    }
  };

  const removeTaxSection = async (id: string) => {
    try {
      await payrollService.deleteTaxSection(id);
      setTaxSections(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error removing tax section:", error);
      throw error;
    }
  };

  const addReimbursementType = async (reimb: any) => {
    try {
      const res = await payrollService.createReimbursementType(reimb);
      setReimbTypes(prev => [...prev, {
        id: res.id?.toString() || Date.now().toString(),
        type: res.type || '',
        label: res.label || '',
        limit: parseFloat(res.limit) || 0,
        period: res.period || 'Monthly',
        roleId: res.role_id?.toString(),
        departmentId: res.department_id?.toString(),
        branchId: res.branch_id?.toString(),
        payrollGroupId: res.payroll_group_id?.toString(),
        role: res.role,
        department: res.department,
        branch: res.branch,
        payroll_group: res.payroll_group
      }]);
    } catch (error) {
      console.error("Error adding reimb type:", error);
      throw error;
    }
  };

  const updateReimbursementType = async (id: string, reimb: any) => {
    try {
      const res = await payrollService.updateReimbursementType(id, reimb);
      setReimbTypes(prev => prev.map(r => r.id === id ? {
        id: res.id?.toString() || id,
        type: res.type || r.type,
        label: res.label || r.label,
        limit: parseFloat(res.limit) || r.limit,
        period: res.period || r.period,
        roleId: res.role_id?.toString() || r.roleId,
        departmentId: res.department_id?.toString() || r.departmentId,
        branchId: res.branch_id?.toString() || r.branchId,
        payrollGroupId: res.payroll_group_id?.toString() || r.payrollGroupId,
        role: res.role || r.role,
        department: res.department || r.department,
        branch: res.branch || r.branch,
        payroll_group: res.payroll_group || r.payroll_group
      } : r));
    } catch (error) {
      console.error("Error updating reimb type:", error);
      throw error;
    }
  };

  const removeReimbursementType = async (id: string) => {
    try {
      await payrollService.deleteReimbursementType(id);
      setReimbTypes(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error removing reimb type:", error);
      throw error;
    }
  };

  const addCategory = async (category: any) => {
    try {
      const res = await payrollService.createPaymentCategory(category);
      if (!res) throw new Error("No data returned from service");
      
      const colors: Record<string, string> = {
        'Regular': 'bg-blue-50 text-blue-700 border-blue-200',
        'Bonus': 'bg-amber-50 text-amber-700 border-amber-200',
        'Incentive': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Contract': 'bg-purple-50 text-purple-700 border-purple-200',
      };
      
      setCategories(prev => [...prev, {
        id: (res.id || Date.now()).toString(),
        name: res.name || 'Unnamed Category',
        frequency: res.frequency || 'Monthly',
        payDay: res.pay_day || '',
        status: res.status ?? true,
        color: colors[res.name] || 'bg-muted/50 text-foreground border-border'
      }]);
    } catch (error) {
      console.error("Error adding category:", error);
      throw error;
    }
  };

  const updateCategory = async (id: string, category: any) => {
    try {
      const res = await payrollService.updatePaymentCategory(id, category);
      const colors: any = {
        'Regular': 'bg-blue-50 text-blue-700 border-blue-200',
        'Bonus': 'bg-amber-50 text-amber-700 border-amber-200',
        'Incentive': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'Contract': 'bg-purple-50 text-purple-700 border-purple-200',
      };
      setCategories(prev => prev.map(c => c.id === id ? {
        id: res.id.toString(),
        name: res.name,
        frequency: res.frequency,
        payDay: res.pay_day || '',
        status: res.status,
        color: colors[res.name] || 'bg-muted/50 text-foreground border-border'
      } : c));
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await payrollService.deletePaymentCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error removing category:", error);
      throw error;
    }
  };

  const removeSalaryComponent = async (id: string) => {
    try {
      await payrollService.deleteSalaryComponent(id);
      setSalaryComponents(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error removing salary component:", error);
      throw error;
    }
  };

  const addAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => [...prev, record]);
  };

  const addLeave = (record: LeaveRecord) => {
    setLeaveRecords(prev => [...prev, record]);
  };

  const addPayrollTransaction = (transaction: PayrollTransaction) => {
    setPayrollTransactions(prev => [...prev, transaction]);
  };

  const addLoan = (loan: LoanRecord) => {
    setLoanRecords(prev => [...prev, loan]);
  };

  return (
    <PayrollContext.Provider
      value={{
        employees,
        salaryStructures,
        attendanceRecords,
        leaveRecords,
        payrollTransactions,
        loanRecords,
        salaryComponents,
        payCycle,
        groups,
        taxSections,
        reimbTypes,
        categories,
        isLoading,
        addEmployee,
        updateEmployee,
        addSalaryStructure,
        updateSalaryStructure,
        removeSalaryStructure,
        addSalaryComponent,
        updateSalaryComponent,
        updatePayCycle,
        addGroup,
        updateGroup,
        removeGroup,
        addAttendance,
        addLeave,
        addPayrollTransaction,
        addLoan,
        addTaxSection,
        updateTaxSection,
        removeTaxSection,
        addReimbursementType,
        updateReimbursementType,
        removeReimbursementType,
        addCategory,
        updateCategory,
        removeCategory,
        removeSalaryComponent,
        setSalaryComponents,
      }}
    >
      {children}
    </PayrollContext.Provider>
  );
};

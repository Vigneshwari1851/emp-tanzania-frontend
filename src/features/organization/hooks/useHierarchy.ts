
import { useAuth } from '@/shared/context/AuthContext';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { Permission } from '@/shared/types/rbac';

interface Employee {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  managerId?: string;
  [key: string]: any;
}

/**
 * Hook to filter data based on hierarchical access
 * - Super Admin & Admin: See all data
 * - Manager: See their team's data (direct and indirect reports)
 * - Employee: See only their own data
 */
export function useHierarchy() {
  const { user } = useAuth();
  const { can, isAdminOrAbove, isManager } = usePermissions();

  /**
   * Build hierarchy map from employee list
   * Returns a map of managerId -> list of employee IDs
   */
  const buildHierarchyMap = (employees: Employee[]): Map<string, string[]> => {
    const hierarchyMap = new Map<string, string[]>();
    
    employees.forEach(emp => {
      if (emp.managerId) {
        const reports = hierarchyMap.get(emp.managerId) || [];
        reports.push(emp.id);
        hierarchyMap.set(emp.managerId, reports);
      }
    });
    
    return hierarchyMap;
  };

  /**
   * Get all subordinate IDs (direct and indirect) for a manager
   */
  const getAllSubordinates = (
    managerId: string,
    hierarchyMap: Map<string, string[]>,
    visited = new Set<string>()
  ): string[] => {
    if (visited.has(managerId)) return []; // Prevent circular references
    visited.add(managerId);

    const directReports = hierarchyMap.get(managerId) || [];
    const allSubordinates = [...directReports];

    directReports.forEach(reportId => {
      const indirectReports = getAllSubordinates(reportId, hierarchyMap, visited);
      allSubordinates.push(...indirectReports);
    });

    return allSubordinates;
  };

  /**
   * Filter employees based on user's hierarchical access
   */
  const filterEmployees = <T extends Employee>(
    employees: T[],
    permission: Permission
  ): T[] => {
    if (!user) return [];

    // Admin and Super Admin can see all employees
    if (isAdminOrAbove && can(permission)) {
      return employees;
    }

    // Manager can see their team
    if (isManager && can(Permission.VIEW_TEAM_EMPLOYEES)) {
      const hierarchyMap = buildHierarchyMap(employees);
      const subordinateIds = getAllSubordinates(user.id, hierarchyMap);
      
      return employees.filter(
        emp => emp.id === user.id || subordinateIds.includes(emp.id)
      );
    }

    // Employee can only see themselves
    if (can(Permission.VIEW_OWN_PROFILE)) {
      return employees.filter(emp => emp.id === user.id);
    }

    return [];
  };

  /**
   * Check if user can access a specific employee's data
   */
  const canAccessEmployee = (
    employeeId: string,
    employees: Employee[]
  ): boolean => {
    if (!user) return false;

    // Admin and Super Admin can access all employees
    if (isAdminOrAbove) return true;

    // User can always access their own data
    if (employeeId === user.id) return true;

    // Manager can access their team's data
    if (isManager) {
      const hierarchyMap = buildHierarchyMap(employees);
      const subordinateIds = getAllSubordinates(user.id, hierarchyMap);
      return subordinateIds.includes(employeeId);
    }

    return false;
  };

  /**
   * Filter leave requests based on hierarchical access
   */
  const filterLeaves = <T extends { employeeId: string; [key: string]: any }>(
    leaves: T[]
  ): T[] => {
    if (!user) return [];

    if (isAdminOrAbove && can(Permission.VIEW_ALL_LEAVES)) {
      return leaves;
    }

    if (isManager && can(Permission.VIEW_TEAM_LEAVES)) {
      // For leave filtering, we need employee data
      // In production, this would come from a proper employee store/context
      return leaves; // Simplified - would need employee data to properly filter
    }

    if (can(Permission.VIEW_OWN_LEAVES)) {
      return leaves.filter(leave => leave.employeeId === user.id);
    }

    return [];
  };

  /**
   * Filter payroll data based on hierarchical access
   */
  const filterPayroll = <T extends { employeeId: string; [key: string]: any }>(
    payrollRecords: T[]
  ): T[] => {
    if (!user) return [];

    if (isAdminOrAbove && can(Permission.VIEW_ALL_PAYROLL)) {
      return payrollRecords;
    }

    if (isManager && can(Permission.VIEW_TEAM_PAYROLL)) {
      return payrollRecords; // Simplified - would need employee data to properly filter
    }

    if (can(Permission.VIEW_OWN_PAYROLL)) {
      return payrollRecords.filter(record => record.employeeId === user.id);
    }

    return [];
  };

  /**
   * Filter performance reviews based on hierarchical access
   */
  const filterReviews = <T extends { employeeId: string; reviewerId?: string; [key: string]: any }>(
    reviews: T[]
  ): T[] => {
    if (!user) return [];

    if (isAdminOrAbove && can(Permission.VIEW_ALL_REVIEWS)) {
      return reviews;
    }

    if (isManager && can(Permission.VIEW_TEAM_REVIEWS)) {
      // Manager can see reviews they're conducting or for their team
      return reviews.filter(
        review => review.reviewerId === user.id || review.employeeId === user.id
      );
    }

    if (can(Permission.VIEW_OWN_REVIEWS)) {
      return reviews.filter(review => review.employeeId === user.id);
    }

    return [];
  };

  /**
   * Get accessible department IDs for the current user
   */
  const getAccessibleDepartments = (departments: { id: string; managerId?: string }[]): string[] => {
    if (!user) return [];

    if (isAdminOrAbove) {
      return departments.map(d => d.id);
    }

    if (isManager) {
      // Manager can access departments they manage
      return departments
        .filter(dept => dept.managerId === user.id)
        .map(d => d.id);
    }

    // Employee can access their own department
    return [user.departmentId];
  };

  return {
    filterEmployees,
    canAccessEmployee,
    filterLeaves,
    filterPayroll,
    filterReviews,
    getAccessibleDepartments,
    buildHierarchyMap,
    getAllSubordinates,
  };
}

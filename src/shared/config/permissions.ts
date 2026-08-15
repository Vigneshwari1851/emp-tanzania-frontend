import type { PermissionMap, UserRole, Permission } from '@/shared/types/rbac';
import { UserRole as UserRoleVal, Permission as PermissionVal } from '@/shared/types/rbac';

// Define permissions for each role
export const rolePermissions: PermissionMap = {
  [UserRoleVal.SUPER_ADMIN]: [
    // Full access to everything
    PermissionVal.VIEW_COMPANY_STRUCTURE,
    PermissionVal.EDIT_COMPANY_STRUCTURE,
    PermissionVal.MANAGE_DEPARTMENTS,
    PermissionVal.VIEW_DESIGNATIONS,
    PermissionVal.EDIT_DESIGNATIONS,
    PermissionVal.CREATE_DESIGNATIONS,
    PermissionVal.DELETE_DESIGNATIONS,
    PermissionVal.VIEW_ALL_EMPLOYEES,
    PermissionVal.ADD_EMPLOYEE,
    PermissionVal.EDIT_EMPLOYEE,
    PermissionVal.DELETE_EMPLOYEE,
    PermissionVal.VIEW_ALL_LEAVES,
    PermissionVal.APPROVE_LEAVES,
    PermissionVal.MANAGE_LEAVE_POLICIES,
    PermissionVal.VIEW_ALL_REVIEWS,
    PermissionVal.CREATE_REVIEW_TEMPLATE,
    PermissionVal.CONDUCT_REVIEWS,
    PermissionVal.VIEW_ALL_SURVEYS,
    PermissionVal.CREATE_SURVEYS,
    PermissionVal.VIEW_SURVEY_RESULTS,
    PermissionVal.VIEW_ALL_CANDIDATES,
    PermissionVal.MANAGE_JOB_POSTINGS,
    PermissionVal.SCREEN_APPLICATIONS,
    PermissionVal.SCHEDULE_INTERVIEWS,
    PermissionVal.APPROVE_OFFERS,
    PermissionVal.VIEW_ALL_PAYROLL,
    PermissionVal.MANAGE_PAYROLL,
    PermissionVal.PROCESS_PAYROLL,
    PermissionVal.VIEW_CRM,
    PermissionVal.MANAGE_CRM,
    PermissionVal.VIEW_EMAIL_MANAGEMENT,
    PermissionVal.VIEW_NOTIFY_MANAGEMENT,
    PermissionVal.MANAGE_SYSTEM_SETTINGS,
    PermissionVal.VIEW_NEWS,
    PermissionVal.MANAGE_NEWS,
    PermissionVal.VIEW_OWN_PROFILE,
    PermissionVal.VIEW_DOCUMENTS,
    PermissionVal.MANAGE_DOCUMENTS,
    PermissionVal.UPLOAD_DOCUMENTS,
    PermissionVal.DELETE_DOCUMENTS,
  ],
  
  [UserRoleVal.ADMIN]: [
    // Full admin access equivalent to superadmin
    PermissionVal.VIEW_COMPANY_STRUCTURE,
    PermissionVal.EDIT_COMPANY_STRUCTURE,
    PermissionVal.MANAGE_DEPARTMENTS,
    PermissionVal.VIEW_DESIGNATIONS,
    PermissionVal.EDIT_DESIGNATIONS,
    PermissionVal.CREATE_DESIGNATIONS,
    PermissionVal.DELETE_DESIGNATIONS,
    PermissionVal.VIEW_ALL_EMPLOYEES,
    PermissionVal.ADD_EMPLOYEE,
    PermissionVal.EDIT_EMPLOYEE,
    PermissionVal.DELETE_EMPLOYEE,
    PermissionVal.VIEW_ALL_LEAVES,
    PermissionVal.APPROVE_LEAVES,
    PermissionVal.MANAGE_LEAVE_POLICIES,
    PermissionVal.VIEW_ALL_REVIEWS,
    PermissionVal.CREATE_REVIEW_TEMPLATE,
    PermissionVal.CONDUCT_REVIEWS,
    PermissionVal.VIEW_ALL_SURVEYS,
    PermissionVal.CREATE_SURVEYS,
    PermissionVal.VIEW_SURVEY_RESULTS,
    PermissionVal.VIEW_ALL_CANDIDATES,
    PermissionVal.MANAGE_JOB_POSTINGS,
    PermissionVal.SCREEN_APPLICATIONS,
    PermissionVal.SCHEDULE_INTERVIEWS,
    PermissionVal.APPROVE_OFFERS,
    PermissionVal.VIEW_ALL_PAYROLL,
    PermissionVal.MANAGE_PAYROLL,
    PermissionVal.PROCESS_PAYROLL,
    PermissionVal.VIEW_CRM,
    PermissionVal.MANAGE_CRM,
    PermissionVal.VIEW_EMAIL_MANAGEMENT,
    PermissionVal.VIEW_NOTIFY_MANAGEMENT,
    PermissionVal.MANAGE_SYSTEM_SETTINGS,
    PermissionVal.VIEW_NEWS,
    PermissionVal.MANAGE_NEWS,
    PermissionVal.VIEW_OWN_PROFILE,
    PermissionVal.VIEW_DOCUMENTS,
    PermissionVal.MANAGE_DOCUMENTS,
    PermissionVal.UPLOAD_DOCUMENTS,
    PermissionVal.DELETE_DOCUMENTS,
  ],

  [UserRoleVal.HR]: [
    // HR handles employee records, leaves and payroll
    PermissionVal.VIEW_COMPANY_STRUCTURE,
    PermissionVal.MANAGE_DEPARTMENTS,
    PermissionVal.VIEW_DESIGNATIONS,
    PermissionVal.VIEW_ALL_EMPLOYEES,
    PermissionVal.ADD_EMPLOYEE,
    PermissionVal.EDIT_EMPLOYEE,
    PermissionVal.VIEW_ALL_LEAVES,
    PermissionVal.APPROVE_LEAVES,
    PermissionVal.MANAGE_LEAVE_POLICIES,
    PermissionVal.VIEW_ALL_REVIEWS,
    PermissionVal.CONDUCT_REVIEWS,
    PermissionVal.VIEW_ALL_SURVEYS,
    PermissionVal.CREATE_SURVEYS,
    PermissionVal.VIEW_SURVEY_RESULTS,
    PermissionVal.VIEW_ALL_CANDIDATES,
    PermissionVal.MANAGE_JOB_POSTINGS,
    PermissionVal.SCREEN_APPLICATIONS,
    PermissionVal.SCHEDULE_INTERVIEWS,
    PermissionVal.VIEW_ALL_PAYROLL,
    PermissionVal.MANAGE_PAYROLL,
    PermissionVal.PROCESS_PAYROLL,
    PermissionVal.VIEW_NEWS,
    PermissionVal.MANAGE_NEWS,
    PermissionVal.VIEW_SYSTEM_SETTINGS,
    PermissionVal.VIEW_OWN_PROFILE,
  ],
  
  [UserRoleVal.FINANCE]: [
    PermissionVal.VIEW_COMPANY_STRUCTURE,
    PermissionVal.VIEW_ALL_EMPLOYEES,
    PermissionVal.VIEW_OWN_PROFILE,
    PermissionVal.VIEW_ALL_PAYROLL,
    PermissionVal.MANAGE_PAYROLL,
    PermissionVal.PROCESS_PAYROLL,
    PermissionVal.VIEW_CRM,
    PermissionVal.VIEW_SYSTEM_SETTINGS,
  ],
  
  [UserRoleVal.MANAGER]: [
    // Manager has access to their team's data
    PermissionVal.VIEW_COMPANY_STRUCTURE,
    PermissionVal.VIEW_TEAM_EMPLOYEES,
    PermissionVal.VIEW_OWN_PROFILE,
    PermissionVal.VIEW_TEAM_LEAVES,
    PermissionVal.VIEW_OWN_LEAVES,
    PermissionVal.APPROVE_LEAVES,
    PermissionVal.VIEW_TEAM_REVIEWS,
    PermissionVal.VIEW_OWN_REVIEWS,
    PermissionVal.CONDUCT_REVIEWS,
    PermissionVal.VIEW_ASSIGNED_CANDIDATES,
    PermissionVal.SCREEN_APPLICATIONS,
    PermissionVal.SCHEDULE_INTERVIEWS,
    PermissionVal.VIEW_TEAM_PAYROLL,
    PermissionVal.VIEW_OWN_PAYROLL,
    PermissionVal.VIEW_NEWS,
    PermissionVal.VIEW_DOCUMENTS,
  ],
  
  [UserRoleVal.EMPLOYEE]: [
    // Employee has access only to their own data
    PermissionVal.VIEW_OWN_PROFILE,
    PermissionVal.VIEW_OWN_LEAVES,
    PermissionVal.VIEW_OWN_REVIEWS,
    PermissionVal.VIEW_OWN_PAYROLL,
    PermissionVal.VIEW_NEWS,
    PermissionVal.VIEW_DOCUMENTS,
  ],
  [UserRoleVal.TRAINER]: [
    // Trainer has employee access plus some instructional visibility
    PermissionVal.VIEW_OWN_PROFILE,
    PermissionVal.VIEW_OWN_LEAVES,
    PermissionVal.VIEW_OWN_REVIEWS,
    PermissionVal.VIEW_OWN_PAYROLL,
    PermissionVal.VIEW_NEWS,
    PermissionVal.VIEW_COMPANY_STRUCTURE,
    PermissionVal.VIEW_DOCUMENTS,
  ],
  [UserRoleVal.USER]: [
    // User role is treated the same as Employee
    PermissionVal.VIEW_OWN_PROFILE,
    PermissionVal.VIEW_OWN_LEAVES,
    PermissionVal.VIEW_OWN_REVIEWS,
    PermissionVal.VIEW_OWN_PAYROLL,
    PermissionVal.VIEW_NEWS,
    PermissionVal.VIEW_DOCUMENTS,
  ],
};

// Helper function to check if a role has a specific permission
export function hasPermission(role: UserRole | string | string[], permission: Permission): boolean {
  if (!role) return false;
  
  let rawRole = Array.isArray(role) ? (role[0] || '') : role;
  if (typeof rawRole === 'object' && rawRole !== null) {
    rawRole = (rawRole as any).name || (rawRole as any).code || (rawRole as any).id || '';
  }
  let normalizedRole = String(rawRole).toUpperCase().replace(/[\s_]+/g, '');
  
  if (normalizedRole === 'SUPERADMIN') {
    return true;
  }

  // ALIAS: Map common backend strings to official RBAC enum
  if (normalizedRole === 'USER') {
    normalizedRole = 'EMPLOYEE';
  }

  const permissionsArray = rolePermissions[normalizedRole as UserRole] || [];
  return permissionsArray.includes(permission);
}

// Helper function to check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

// Helper function to check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Navigation items with role-based visibility
export interface NavItemConfig {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  requiredPermissions?: Permission[];
  minRole?: UserRole;
}

// Define which roles can access which navigation items
export const navItemPermissions: Record<string, Permission[]> = {
  '/': [], // Dashboard accessible to all
  '/org-setup': [PermissionVal.VIEW_COMPANY_STRUCTURE],
  '/organisation-structure': [PermissionVal.VIEW_COMPANY_STRUCTURE],
  '/employee-management': [PermissionVal.VIEW_ALL_EMPLOYEES, PermissionVal.VIEW_TEAM_EMPLOYEES, PermissionVal.VIEW_OWN_PROFILE],
  '/recruitment-group': [PermissionVal.VIEW_ALL_CANDIDATES, PermissionVal.VIEW_ASSIGNED_CANDIDATES],
  '/leave-management': [PermissionVal.VIEW_ALL_LEAVES, PermissionVal.VIEW_TEAM_LEAVES, PermissionVal.VIEW_OWN_LEAVES],
  '/leave-management/requests': [PermissionVal.VIEW_ALL_LEAVES, PermissionVal.VIEW_TEAM_LEAVES, PermissionVal.VIEW_OWN_LEAVES],
  '/leave-management/history': [PermissionVal.VIEW_ALL_LEAVES, PermissionVal.VIEW_TEAM_LEAVES, PermissionVal.VIEW_OWN_LEAVES],
  '/leave-management/types': [PermissionVal.VIEW_ALL_LEAVES, PermissionVal.VIEW_TEAM_LEAVES, PermissionVal.VIEW_OWN_LEAVES],
  '/leave-management/statistics': [PermissionVal.VIEW_ALL_LEAVES, PermissionVal.VIEW_TEAM_LEAVES, PermissionVal.VIEW_OWN_LEAVES],
  '/time-attendance': [PermissionVal.VIEW_ALL_LEAVES, PermissionVal.VIEW_TEAM_LEAVES, PermissionVal.VIEW_OWN_LEAVES],
  '/payroll': [PermissionVal.VIEW_ALL_PAYROLL, PermissionVal.VIEW_TEAM_PAYROLL, PermissionVal.VIEW_OWN_PAYROLL],
  '/loans-advances': [PermissionVal.VIEW_ALL_PAYROLL, PermissionVal.VIEW_TEAM_PAYROLL, PermissionVal.VIEW_OWN_PAYROLL],
  '/lms/dashboard': [PermissionVal.VIEW_LMS],
  '/surveys': [PermissionVal.VIEW_ALL_SURVEYS, PermissionVal.CREATE_SURVEYS],
  '/asset-management': [PermissionVal.VIEW_ASSETS],
  '/my-assets': [PermissionVal.VIEW_ASSETS],
  '/audit': [PermissionVal.MANAGE_SYSTEM_SETTINGS],
  '/crm': [PermissionVal.VIEW_CRM],
  '/email-management': [PermissionVal.VIEW_EMAIL_MANAGEMENT],
  '/notify-management': [PermissionVal.VIEW_NOTIFY_MANAGEMENT],
  '/notifications': [],
  '/employee-group': [PermissionVal.VIEW_ALL_EMPLOYEES, PermissionVal.VIEW_TEAM_EMPLOYEES],
  '/system-settings': [PermissionVal.MANAGE_SYSTEM_SETTINGS, PermissionVal.VIEW_SYSTEM_SETTINGS],
  '/system-group': [PermissionVal.MANAGE_SYSTEM_SETTINGS, PermissionVal.VIEW_SYSTEM_SETTINGS],
  '/report-builder': [PermissionVal.MANAGE_SYSTEM_SETTINGS, PermissionVal.VIEW_SYSTEM_SETTINGS],
  '/reports/saved': [PermissionVal.MANAGE_SYSTEM_SETTINGS, PermissionVal.VIEW_SYSTEM_SETTINGS],
  '/privacy-policy': [],
  '/employee-exit': [PermissionVal.VIEW_ALL_EMPLOYEES, PermissionVal.VIEW_TEAM_EMPLOYEES, PermissionVal.MANAGE_DEPARTMENTS],
  '/news': [PermissionVal.VIEW_NEWS],
  '/news/manage': [PermissionVal.MANAGE_NEWS],
  '/news/create': [PermissionVal.MANAGE_NEWS],
  '/news/edit/:id': [PermissionVal.MANAGE_NEWS],
  '/documents': [PermissionVal.VIEW_DOCUMENTS],
  '/documents/upload': [PermissionVal.UPLOAD_DOCUMENTS],
  '/documents/:id': [PermissionVal.VIEW_DOCUMENTS],
};

// Check if user can access a navigation item
export function canAccessNavItem(role: UserRole | string | string[], path: string): boolean {
  let primaryRole = role;
  if (Array.isArray(role)) {
    const roleString = role.map(r => {
      let val = r;
      if (typeof val === 'object' && val !== null) {
        val = (val as any).name || (val as any).code || (val as any).id || '';
      }
      return String(val).toUpperCase().replace(/[\s_]+/g, '');
    });
    
    if (roleString.includes('SUPERADMIN')) primaryRole = 'SUPER_ADMIN';
    else if (roleString.includes('ADMIN')) primaryRole = 'ADMIN';
    else if (roleString.includes('MANAGER')) primaryRole = 'MANAGER';
    else primaryRole = role[0] || 'EMPLOYEE';
  } else {
    let val = role;
    if (typeof val === 'object' && val !== null) {
      val = (val as any).name || (val as any).code || (val as any).id || '';
    }
    const rStr = String(val).toUpperCase().replace(/[\s_]+/g, '');
    if (rStr === 'SUPERADMIN') primaryRole = 'SUPER_ADMIN';
    else if (rStr === 'ADMIN') primaryRole = 'ADMIN';
    else if (rStr === 'MANAGER') primaryRole = 'MANAGER';
    else primaryRole = 'EMPLOYEE';
  }

  const permissions = navItemPermissions[path];
  
  if (!permissions || permissions.length === 0) return true;
  return hasAnyPermission(primaryRole as UserRole, permissions);
}
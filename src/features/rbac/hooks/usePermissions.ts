import { useAuth } from '@/shared/context/AuthContext';
import { Permission, UserRole } from '@/shared/types/rbac';
import { hasPermission } from '@/shared/config/permissions';

const PERMISSION_MAPPING: Record<string, string | string[]> = {
  [Permission.VIEW_COMPANY_STRUCTURE]: 'company_structure.view',
  [Permission.EDIT_COMPANY_STRUCTURE]: 'company_structure.edit',
  [Permission.MANAGE_DEPARTMENTS]: ['departments.manage', 'department.manage'],
  [Permission.VIEW_DESIGNATIONS]: 'designations.read',
  [Permission.CREATE_DESIGNATIONS]: 'designations.create',
  [Permission.EDIT_DESIGNATIONS]: 'designations.update',
  [Permission.DELETE_DESIGNATIONS]: 'designations.delete',
  [Permission.VIEW_ALL_EMPLOYEES]: ['employees.read', 'employee_management.view'],
  [Permission.VIEW_TEAM_EMPLOYEES]: ['employees.read', 'employee_management.view'],
  [Permission.ADD_EMPLOYEE]: ['employees.create', 'employee_management.create'],
  [Permission.EDIT_EMPLOYEE]: ['employees.update', 'employee_management.edit'],
  [Permission.DELETE_EMPLOYEE]: ['employees.delete', 'employee_management.delete'],
  [Permission.VIEW_ALL_LEAVES]: 'leave_request.view',
  [Permission.APPROVE_LEAVES]: 'leave_request.approve',
  [Permission.VIEW_SYSTEM_SETTINGS]: 'system_settings.view',
  [Permission.MANAGE_SYSTEM_SETTINGS]: 'system_settings.manage',
  [Permission.VIEW_ALL_PAYROLL]: 'payroll.view',
  [Permission.MANAGE_PAYROLL]: 'payroll.manage',
  [Permission.PROCESS_PAYROLL]: 'payroll.process',
  [Permission.VIEW_LOANS_ADVANCES]: 'loans-advances.view',
  [Permission.MANAGE_LOANS_ADVANCES]: 'loans-advances.manage',
  [Permission.VIEW_ALL_CANDIDATES]: 'recruitment.view',
  [Permission.MANAGE_JOB_POSTINGS]: 'recruitment.manage',
  [Permission.VIEW_ASSETS]: 'assets.view',
  [Permission.MANAGE_ASSETS]: 'assets.manage',
  [Permission.VIEW_LMS]: 'lms.view',
  [Permission.MANAGE_LMS]: 'lms.manage',
  [Permission.VIEW_ALL_SURVEYS]: 'surveys.view',
  [Permission.CREATE_SURVEYS]: 'surveys.create',
  [Permission.VIEW_NEWS]: 'news.view',
  [Permission.MANAGE_NEWS]: 'news.manage',
  [Permission.VIEW_DOCUMENTS]: 'documents.view',
  [Permission.MANAGE_DOCUMENTS]: 'documents.manage',
  [Permission.UPLOAD_DOCUMENTS]: 'documents.upload',
  [Permission.DELETE_DOCUMENTS]: 'documents.delete',
};

export function usePermissions() {
  const { user } = useAuth();

  const can = (permission: Permission | string): boolean => {
    if (!user) return false;
    
    let rawRole = Array.isArray(user.role) ? user.role[0] : user.role;
    if (typeof rawRole === 'object' && rawRole !== null) {
      rawRole = (rawRole as any).name || (rawRole as any).code || (rawRole as any).id || '';
    }
    const normalizedRole = String(rawRole).toUpperCase().replace(/[\s_]+/g, '');
    
    // Super Admins always have access
    if (normalizedRole === 'SUPERADMIN') {
      return true;
    }

    // Check the static role map first — this enforces boundary regardless of backend
    if (hasPermission(user.role as any, permission as any)) return true;

    // Then widen with backend-provided specific permissions (if any)
    if (user.permissions && user.permissions.length > 0) {
      // 1. Check exact match
      if (user.permissions.includes(permission)) return true;

      // 2. Check mapped permission
      const mappedKey = PERMISSION_MAPPING[permission];
      if (mappedKey) {
        const keys = Array.isArray(mappedKey) ? mappedKey : [mappedKey];
        if (keys.some(k => user.permissions?.includes(k))) return true;
      }
      
      // 3. Normalized check as fallback
      const normalizedPermission = permission.toLowerCase().replace(/_/g, '.');
      if (user.permissions.includes(normalizedPermission)) return true;
    }

    return false;
  };

  const canAny = (permissionList: Permission[]): boolean => {
    if (!user) return false;
    return permissionList.some(p => can(p));
  };

  const canAll = (permissionList: Permission[]): boolean => {
    if (!user) return false;
    return permissionList.every(p => can(p));
  };

  let rawUserRole = Array.isArray(user?.role) ? user?.role[0] : user?.role;
  if (typeof rawUserRole === 'object' && rawUserRole !== null) {
    rawUserRole = (rawUserRole as any).name || (rawUserRole as any).code || (rawUserRole as any).id || '';
  }
  const roleString = String(rawUserRole || '').toUpperCase().replace(/[\s_]+/g, '');

  const isSuperAdmin = roleString === 'SUPERADMIN';
  const isAdmin = roleString === 'ADMIN';
  const isManager = roleString === 'MANAGER';
  const isEmployee = roleString === 'EMPLOYEE' || roleString === 'USER';

  const isAdminOrAbove = isSuperAdmin || isAdmin;
  const isManagerOrAbove = isSuperAdmin || isAdmin || isManager;

  return {
    can,
    canAny,
    canAll,
    isSuperAdmin,
    isAdmin,
    isManager,
    isEmployee,
    isAdminOrAbove,
    isManagerOrAbove,
    role: user?.role,
    user,
  };
}

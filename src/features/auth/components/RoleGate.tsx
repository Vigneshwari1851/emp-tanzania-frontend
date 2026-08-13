import type { ReactNode } from 'react';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { Permission, UserRole } from '@/shared/types/rbac';

interface RoleGateProps {
  children: ReactNode;
  permissions?: Permission[];
  roles?: UserRole[];
  requireAll?: boolean; // For permissions: if true, requires ALL permissions; if false, requires ANY
  fallback?: ReactNode;
}

/**
 * Component-level access control
 * Conditionally renders children based on user permissions or roles
 */
export function RoleGate({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
}: RoleGateProps) {
  const { canAny, canAll, role } = usePermissions();

  // Check role-based access
  if (roles.length > 0 && role) {
    if (!roles.includes(role)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (permissions.length > 0) {
    const hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

import type { ReactNode } from 'react';
import { Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { usePermissions } from '../../rbac/hooks/usePermissions';
import { Permission, UserRole } from '@/shared/types/rbac';

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredPermissions?: Permission[];
  allowedRoles?: UserRole[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission
  fallback?: ReactNode;
}

import { AccessDenied } from '../../../shared/pages/AccessDenied';

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  allowedRoles = [],
  requireAll = false,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const { canAny, canAll } = usePermissions();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strict tenant enforcement
  if (user?.orgSlug) {
    const KNOWN_ROUTES = new Set([
      'org-setup',
      'organisation-structure',
      'employee-management',
      'roles-permissions',
      'system-settings',
      'leave-management',
      'time-attendance',
      'leave-history',
      'team-calendar',
      'notifications',
      'profile',
      'holidays',
      'employee-exit',
      'payroll',
      'employee',
      'reimbursements',
      'loans-advances',
      'assets',
      'my-assets',
      'lms',
      'audit',
      'privacy-policy',
      'report-builder',
      'reports',
      'documents',
      'news',
      'surveys',
      'recruitment',
      'onboarding'
    ]);

    if (orgSlug !== user.orgSlug) {
      const pathname = location.pathname;
      const segments = pathname.split('/').filter(Boolean);
      const orgSlugIdx = segments.indexOf(orgSlug || '');

      if (orgSlugIdx !== -1) {
        if (KNOWN_ROUTES.has(orgSlug || '')) {
          segments.splice(orgSlugIdx, 0, user.orgSlug);
        } else {
          segments[orgSlugIdx] = user.orgSlug;
        }
        const newPath = '/' + segments.join('/');
        return <Navigate to={newPath + location.search + location.hash} replace />;
      }
    }
  }

  // Role-based check
  if (allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role)) {
      return fallback ? <>{fallback}</> : <AccessDenied />;
    }
  }

  // Permission-based check
  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? canAll(requiredPermissions)
      : canAny(requiredPermissions);

    if (!hasAccess) {
      return fallback ? <>{fallback}</> : <AccessDenied />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}

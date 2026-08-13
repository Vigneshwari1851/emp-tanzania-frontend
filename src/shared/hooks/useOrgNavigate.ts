import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useAuth } from '@/shared/context/AuthContext';

/**
 * A drop-in replacement for useNavigate that automatically
 * prefixes the orgSlug to all absolute paths.
 * 
 * Usage:
 *   const navigate = useOrgNavigate();
 *   navigate('/leave-management');  // -> /<orgSlug>/leave-management
 *   navigate(-1);                   // back navigation still works
 */
export function useOrgNavigate() {
  const navigate = useNavigate();
  const { orgSlug: paramSlug } = useParams<{ orgSlug: string }>();
  const { user } = useAuth();

  // Prefer the slug from URL params, fallback to user session
  const orgSlug = paramSlug || user?.orgSlug;

  const orgNavigate = useCallback(
    (to: string | number, options?: { replace?: boolean; state?: any }) => {
      if (typeof to === 'number') {
        // Relative navigation like navigate(-1)
        navigate(to);
        return;
      }

      // Don't prefix /login, /verify-login, /forgot-password, /reset-password, /careers, /surveys/take, /candidate
      const publicPrefixes = ['/login', '/verify-login', '/forgot-password', '/reset-password', '/careers', '/surveys/take', '/candidate'];
      const isPublicPath = publicPrefixes.some(prefix => to === prefix || to.startsWith(prefix + '/') || to.startsWith(prefix + '?'));

      if (isPublicPath || !orgSlug || orgSlug === 'undefined' || orgSlug === 'null') {
        navigate(to, options);
        return;
      }

      // If path starts with /, prefix with orgSlug
      if (to.startsWith('/')) {
        // Check if path already starts with the orgSlug
        if (to.startsWith(`/${orgSlug}/`) || to === `/${orgSlug}`) {
          navigate(to, options);
        } else {
          navigate(`/${orgSlug}${to}`, options);
        }
      } else {
        // Relative path — pass through as-is
        navigate(to, options);
      }
    },
    [navigate, orgSlug]
  );

  return orgNavigate;
}

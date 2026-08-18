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
  // Commented out to avoid orgSlug prefixing for now:
  /*
  const { orgSlug: paramSlug } = useParams<{ orgSlug: string }>();
  const { user } = useAuth();
  const orgSlug = paramSlug || user?.orgSlug;
  */

  const orgNavigate = useCallback(
    (to: string | number, options?: { replace?: boolean; state?: any }) => {
      // Commented out to avoid orgSlug prefixing for now:
      /*
      if (typeof to === 'number') {
        navigate(to);
        return;
      }
      const publicPrefixes = ['/login', '/verify-login', '/forgot-password', '/reset-password', '/careers', '/surveys/take', '/candidate'];
      const isPublicPath = publicPrefixes.some(prefix => to === prefix || to.startsWith(prefix + '/') || to.startsWith(prefix + '?'));

      if (isPublicPath || !orgSlug || orgSlug === 'undefined' || orgSlug === 'null') {
        navigate(to, options);
        return;
      }
      if (to.startsWith('/')) {
        if (to.startsWith(`/${orgSlug}/`) || to === `/${orgSlug}`) {
          navigate(to, options);
        } else {
          navigate(`/${orgSlug}${to}`, options);
        }
      } else {
        navigate(to, options);
      }
      */
      if (typeof to === 'number') {
        navigate(to);
      } else {
        navigate(to, options);
      }
    },
    [navigate]
  );

  return orgNavigate;
}

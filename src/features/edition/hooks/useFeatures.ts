import { useAuth } from '@/shared/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import axios from '@/shared/services/axiosInstance';

/**
 * Hook to retrieve enabled feature modules for the current tenant.
 * Returns a `has(code)` helper to check if a module is available.
 * Falls back to ALL modules enabled if the edition endpoint is unavailable.
 */
export const useFeatures = () => {
  const { user } = useAuth();

  const tenantId = (user as any)?.tenantId || 1;

  const { data: modules, isLoading } = useQuery({
    queryKey: ['tenant-modules', tenantId],
    queryFn: async () => {
      try {
        const res = await axios.get(`/edition/tenant/${tenantId}/modules`);
        return (res.data?.data ?? res.data) as string[];
      } catch {
        return [] as string[];
      }
    },
    enabled: !!tenantId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fallback: empty array means no edition configured → treat all modules as enabled
  const has = (code: string) => {
    if (modules === null || modules === undefined) return true;
    if (Array.isArray(modules)) {
      if (modules.length === 0) return true;
      return modules.includes(code);
    }
    return true;
  };

  return { has, isLoading };
};

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/shared/types/rbac';
import { UserRole } from '@/shared/types/rbac';
import { loginUser, verifyOtp } from '@/features/auth/services/auth';
import { getEmployee } from '@/features/employees/services/employees';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  login: (email: string, password?: string, orgSlug?: string) => Promise<any>;
  verifyOtp: (email: string, otp: string, orgSlug?: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_LOGOUT_KEY = 'empxp_auth_logout';

interface AuthProviderProps {
  children: ReactNode;
}

const normalizeUserRole = (userObj: any): string => {
  const rawRoles = Array.isArray(userObj.roles) ? userObj.roles : (typeof userObj.roles === 'string' ? [userObj.roles] : []);
  const roles = rawRoles.map((r: string) => r.toUpperCase().replace(/\s+/g, '_'));
  const jobRole = (userObj.job_role || userObj.position || '').toLowerCase().replace(/[\s_]/g, '');
  const uTypeName = (userObj.user_type_name || '').toUpperCase().replace(/[\s_]+/g, '');

  if (roles.includes('SUPER_ADMIN') || roles.includes('CEO') || jobRole === 'superadmin' || uTypeName === 'SUPERADMIN') {
    return 'SUPER_ADMIN';
  }
  if (roles.includes('ADMIN') || roles.includes('SYSTEM_ADMINISTRATOR') || roles.includes('SYSTEM_ADMIN') || jobRole === 'admin' || uTypeName === 'ADMIN') {
    return 'ADMIN';
  }
  if (roles.includes('HR_MANAGER') || roles.includes('HR_EXECUTIVE') || roles.includes('HR') || uTypeName === 'HR_MANAGER' || uTypeName === 'HR_EXECUTIVE' || uTypeName === 'HRMANAGER' || uTypeName === 'HREXECUTIVE' || jobRole === 'hrmanager' || jobRole === 'hrexecutive' || jobRole === 'hr') {
    return 'HR';
  }
  if (roles.includes('MANAGER') || roles.includes('TEAM_MANAGER') || jobRole === 'manager' || uTypeName === 'MANAGER') {
    return 'MANAGER';
  }
  if (roles.includes('FINANCE') || roles.includes('FINANCE_MANAGER') || uTypeName === 'FINANCE_MANAGER' || uTypeName === 'FINANCEMANAGER' || uTypeName === 'FINANCE_EXECUTIVE' || uTypeName === 'FINANCEEXECUTIVE') {
    return 'FINANCE';
  }
  if (roles.includes('EMPLOYEE') || roles.includes('USER') || jobRole === 'employee' || uTypeName === 'EMPLOYEE' || uTypeName === 'CONTRACT' || uTypeName === 'INTERN' || uTypeName === 'CONTRACTOR') {
    return 'EMPLOYEE';
  }
  
  const currentRole = String(userObj.role || '').toUpperCase();
  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'MANAGER', 'TRAINER', 'EMPLOYEE', 'USER'];
  if (validRoles.includes(currentRole)) {
    return currentRole;
  }

  if (roles.length > 0) return roles[0];
  return 'EMPLOYEE';
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [isPersistent, setIsPersistent] = useState(true);

  const [user, setUser] = useState<User | null>(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        // Resilience: Re-calculate role...
        if (parsedUser.roles || parsedUser.job_role || parsedUser.position || parsedUser.user_type_name) {
          parsedUser.role = normalizeUserRole(parsedUser);
        }

        return parsedUser;
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
      }
    }
    return null;
  });

  // Sync user state to appropriate storage when it changes
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('user');
    }
  }, [user]);

  // Refresh user profile if profile_picture is missing (e.g., from old localStorage)
  useEffect(() => {
    const refreshUserProfile = async () => {
      if (user && user.id && user.profile_picture === undefined) {
        try {
          console.log('[Auth] Refreshing user profile to fetch profile_picture...');
          const employeeData = await getEmployee(parseInt(user.id, 10));
          if (employeeData && employeeData.details) {
            const details = employeeData.details;
            setUser((prev: User | null) => prev ? {
              ...prev,
              profile_picture: details.profile_picture,
              // Update other fields if necessary
              name: details.first_name ? `${details.first_name} ${details.last_name || ''}` : prev.name,
            } : null);
          }
        } catch (error) {
          console.error('[Auth] Failed to refresh user profile:', error);
        }
      }
    };

    refreshUserProfile();
  }, [user?.id, user?.profile_picture]);

  const login = async (email: string, password?: string, orgSlug?: string) => {
    try {
      const response = await loginUser(email, password || '', orgSlug);
      if (response.success) {
        return response;
      } else {
        throw response;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const verifyOtpStep = async (email: string, otp: string, orgSlug?: string) => {
    try {
      const response = await verifyOtp(email, otp, orgSlug);
      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        const rawRole = Array.isArray(userData.role_name) ? userData.role_name[0] : userData.role_name;
        
        const mappedUser: User & { user_type_name?: string } = {
          id: userData.id.toString(),
          name: userData.first_name ? `${userData.first_name} ${userData.last_name || ''}` : userData.username || userData.email,
          email: userData.email,
          role: '' as any, // resolved below
          roles: userData.role_name,
          user_type_name: userData.user_type_name,
          permissions: userData.permissions || [],
          departmentId: userData.department_id?.toString() || '',
          employeeId: userData.employee_id || userData.id.toString(),
          position: typeof rawRole === 'string' ? rawRole : '',
          avatar: userData.avatar,
          profile_picture: userData.profile_picture,
          country: userData.country || '',
          orgSlug: userData.orgSlug || undefined,
          orgId: userData.orgId || undefined,
        };
        mappedUser.role = normalizeUserRole(mappedUser) as UserRole;

        sessionStorage.setItem('token', token);
        setUser(mappedUser);
        return response.data;
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.data?.message || error.message || 'Invalid OTP');
    }
  };

  const logout = useCallback(() => {
    const userId = user?.id;
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('pendingEmail');
    sessionStorage.removeItem('rememberMePreference');
    sessionStorage.removeItem('is_session_active');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('pendingEmail');
    localStorage.removeItem('rememberMePreference');
    if (userId) {
      // Broadcast which user logged out so other tabs logged in as the same
      // user log out too (different users in other tabs stay logged in).
      localStorage.setItem(AUTH_LOGOUT_KEY, JSON.stringify({ userId, ts: Date.now() }));
    }
  }, [user]);

  // Cross-tab logout sync: when another tab logs out it writes the logged-out
  // user id to localStorage, which fires a storage event here. Only tabs logged
  // in as the same user are logged out.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_LOGOUT_KEY && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue);
          if (payload?.userId && user?.id && payload.userId === user.id) {
            logout();
          }
        } catch {
          // ignore malformed payloads
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [logout]);

  const value: AuthContextType = {
    user,
    setUser,
    isAuthenticated: !!user,
    login,
    verifyOtp: verifyOtpStep,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

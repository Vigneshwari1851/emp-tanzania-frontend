import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserX,
  User,
  Calendar,
  CalendarDays,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Laptop,
  GraduationCap,
  Settings,
  Shield,
  Briefcase,
  HelpCircle,
  Folder,
  Clock,
  Newspaper,
  FileSpreadsheet,
  HandCoins,
  ShieldCheck
} from "lucide-react";
import { useAuth } from '@/shared/context/AuthContext';
import { canAccessNavItem, navItemPermissions } from '@/shared/config/permissions';
import { UserRole as UserRoleVal } from '@/shared/types/rbac';
import { getOrganizations } from '@/features/organization/services/organizations';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { useFeatures } from '@/features/edition/hooks/useFeatures';
import { applyBrandTheme } from '@/shared/utils/theme';
import { useTranslate } from '@tolgee/react';



interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/org-setup", label: "Org Setup", icon: Building2, module: "COMPANY_STRUCTURE" },
  {
    path: "/employee-group",
    label: "Employee Management",
    icon: Users,
    module: "EMPLOYEE_MANAGEMENT",
    children: [
      { path: "/employee-management", label: "Employee Directory" },
      { path: "/employee-management/change-requests", label: "Change Requests" },
      { path: "/employee-exit", label: "Employee Exit" }
    ]
  },
  {
    path: "/recruitment-group",
    label: "Recruitment (ATS)",
    icon: Briefcase,
    module: "RECRUITMENT",
    children: [
      { path: "/recruitment/jobs", label: "Job Management" },
      { path: "/recruitment", label: "Candidates" },
      { path: "/onboarding", label: "HR Onboarding" }
    ]
  },
  {
    path: "/leave-management",
    label: "Leave Management",
    icon: Calendar,
    module: "TIME_ATTENDANCE",
  },
  { path: "/time-attendance", label: "Time & Attendance", icon: Clock, module: "TIME_ATTENDANCE" },
  { path: "/team-calendar", label: "Calendar", icon: CalendarDays, module: "TEAM_CALENDAR" },
  { path: "/payroll", label: "Payroll", icon: DollarSign, module: "PAYROLL" },
  { path: "/loans-advances", label: "Loans & Advances", icon: HandCoins, module: "LOANS_ADVANCES" },
  { path: "/reimbursements", label: "Reimbursements", icon: FileText },
  { path: "/surveys", label: "Surveys", icon: HelpCircle, module: "SURVEY" },
  { path: "/notifications", label: "Notifications", icon: Bell, module: "NOTIFICATIONS" },
  {
    path: "/asset-management",
    label: "Asset Management",
    icon: Laptop,
    module: "ASSET_MANAGEMENT",
    children: [
      { path: "/assets", label: "Asset", module: "ASSET_MANAGEMENT" },
      { path: "/assets/assignment", label: "Asset Assignment", module: "ASSET_MANAGEMENT" },
    ],
  },
  { path: "/lms/dashboard", label: "Talent & Growth", icon: GraduationCap, module: "TALENT_GROWTH" },
  { path: "/documents", label: "Document Hub", icon: Folder },
  { path: "/news", label: "Company News", icon: Newspaper },
  { path: "/report-builder", label: "Report Builder", icon: FileSpreadsheet },
  {
    path: "/system-group",
    label: "System",
    icon: Settings,
    children: [
      { path: "/system-settings", label: "System Settings" },
      { path: "/audit", label: "Audit Logs", module: "AUDIT" },
      { path: "/design-system", label: "Design System" }
    ]
  },
];

const selfNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/time-attendance", label: "Attendance", icon: Clock, module: "TIME_ATTENDANCE" },
  { path: "/leave-management", label: "Leave Management", icon: Calendar, module: "TIME_ATTENDANCE" },
  { path: "/employee/payroll", label: "Payroll", icon: DollarSign, module: "PAYROLL" },
  { path: "/employee/loans-advances", label: "Loans & Advances", icon: HandCoins, module: "LOANS_ADVANCES" },
  { path: "/reimbursements", label: "Reimbursements", icon: FileText },
  { path: "/team-calendar", label: "Calendar", icon: CalendarDays, module: "TEAM_CALENDAR" },
  { path: "/employee-management", label: "Employee Directory", icon: Users, module: "EMPLOYEE_MANAGEMENT" },
  { path: "/documents", label: "Document Hub", icon: Folder },
  { path: "/my-assets", label: "Asset", icon: Laptop, module: "ASSET_MANAGEMENT" },
  { path: "/lms/dashboard", label: "My Learning", icon: GraduationCap, module: "TALENT_GROWTH" },
  { path: "/notifications", label: "Notifications", icon: Bell, module: "NOTIFICATIONS" },
];

export function Sidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  const { t } = useTranslate();
  const formatLabel = (txt: string) => {
    const key = `nav_${txt.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
    return t(key, txt);
  };

  const { user } = useAuth();

  const { can, canAny } = usePermissions();
  const { has } = useFeatures();
  const [dynamicLogo, setDynamicLogo] = useState<string | null>(() => {
    const saved = localStorage.getItem('cached_company_logo');
    if (saved) return saved;
    const tempLogo = (window as any).temp_company_logo;
    return tempLogo || null;
  });
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [assetTrackingEnabled, setAssetTrackingEnabled] = useState(
    localStorage.getItem("asset_tracking_enabled") !== "false"
  );

  // Determine if user is an employee (no role-based view needed)
  let rawRoleGlobal = Array.isArray(user?.role) ? (user?.role[0] || '') : (user?.role || '');
  if (typeof rawRoleGlobal === 'object' && rawRoleGlobal !== null) {
    rawRoleGlobal = rawRoleGlobal.name || rawRoleGlobal.code || rawRoleGlobal.id || '';
  }
  const normalizedRoleGlobal = rawRoleGlobal.toString().toUpperCase().replace(/[\s_]+/g, '');
  const isEmployeeUser = normalizedRoleGlobal === 'EMPLOYEE' || normalizedRoleGlobal === 'USER';

  const [viewMode, setViewMode] = useState<'self' | 'role'>(() => {
    const saved = localStorage.getItem('sidebar_view_mode');
    return (saved === 'self' || saved === 'role') ? saved : 'role';
  });

  const handleViewModeChange = (mode: 'self' | 'role') => {
    setViewMode(mode);
    localStorage.setItem('sidebar_view_mode', mode);
    window.location.reload();
  };

  const getPath = (path: string) => {
    if (user?.orgSlug && user.orgSlug !== 'undefined' && user.orgSlug !== 'null') {
      return `/${user.orgSlug}${path === '/' ? '' : path}`;
    }
    return path;
  };

  const togglePath = (path: string) => {
    setExpandedPaths(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  };
  const fetchOrgLogo = async () => {
    try {
      const tempLogo = (window as any).temp_company_logo;
      if (tempLogo !== undefined) {
        setDynamicLogo(tempLogo || null);
        if (tempLogo) {
          localStorage.setItem('cached_company_logo', tempLogo);
        } else {
          localStorage.removeItem('cached_company_logo');
        }
        return;
      }
      const orgs = await getOrganizations();
      const org = Array.isArray(orgs) ? orgs[0] : orgs;
      const logoUrl = org?.logo_url || null;
      setDynamicLogo(logoUrl);
      if (logoUrl) {
        localStorage.setItem('cached_company_logo', logoUrl);
      } else {
        localStorage.removeItem('cached_company_logo');
      }
      if (org) {
        const cfg = (org as any).config || {};
        applyBrandTheme(cfg.primary_color || (org as any).primary_color, cfg.secondary_color || (org as any).secondary_color);
      }
    } catch (err) {
      console.error("Failed to fetch sidebar logo", err);
    }
  };

  useEffect(() => {
    fetchOrgLogo();

    // Listen for logo updates from the settings page
    const handleUpdate = () => fetchOrgLogo();
    window.addEventListener('company-logo-updated', handleUpdate);

    // Listen for asset tracking feature toggle updates
    const handleModuleConfigUpdate = () => {
      setAssetTrackingEnabled(localStorage.getItem("asset_tracking_enabled") !== "false");
    };
    window.addEventListener('module-config-updated', handleModuleConfigUpdate);

    return () => {
      window.removeEventListener('company-logo-updated', handleUpdate);
      window.removeEventListener('module-config-updated', handleModuleConfigUpdate);
    };
  }, []);

  const accessibleNavItems = navItems.filter(item => {
    if (!user) return false;

    let rawRole = Array.isArray(user.role) ? (user.role[0] || '') : (user.role || '');
    if (typeof rawRole === 'object' && rawRole !== null) {
      rawRole = rawRole.name || rawRole.code || rawRole.id || '';
    }
    const normalizedRole = rawRole.toString().toUpperCase().replace(/[\s_]+/g, '');

    // 1. Module gating – hide items not enabled for this tenant edition
    if (item.module && !has(item.module)) {
      return false;
    }

    const isEmployee = normalizedRole === 'EMPLOYEE' || normalizedRole === 'USER';
    if (isEmployee) {
      const allowedEmployeePaths = [
        "/",
        "/time-attendance",
        "/leave-management",
        "/payroll",
        "/loans-advances",
        "/reimbursements",
        "/team-calendar",
        "/employee-management",
        "/employee-group",
        "/documents",
        "/asset-management",
        "/notifications",
        "/lms/dashboard",
        "/surveys",
        "/news"
      ];
      if (!allowedEmployeePaths.includes(item.path)) {
        return false;
      }
    }

    // 3. Asset Tracking toggle overrides Asset Management item
    if (item.path === '/asset-management' && !assetTrackingEnabled) {
      return false;
    }

    // Special check for CRM: Finance, or Sales/Finance Department
    if (item.path === '/crm') {
      const isSalesDept = user.departmentId === '2';
      const isFinanceDept = user.departmentId === '5';
      const isAllowedRole = normalizedRole === 'FINANCE';
      return isAllowedRole || isSalesDept || isFinanceDept;
    }

    // Use our dynamic usePermissions logic
    const requiredPermissions = navItemPermissions[item.path];

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    return canAny(requiredPermissions);
  });

  return (
    <aside className={`bg-card border-r border-border transition-all duration-300 flex flex-col flex-shrink-0 h-full ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className={`h-16 flex items-center border-b border-border relative overflow-hidden transition-all ${collapsed ? 'px-4' : 'px-6'}`}>
        {!collapsed && (
          <div className="flex items-center justify-start animate-in fade-in zoom-in duration-500 mr-auto">
            {dynamicLogo ? (
              <img
                src={dynamicLogo}
                alt="Company Logo"
                className="h-8 w-auto max-w-[140px] object-contain transition-all duration-500"
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-primary/20">
                  L
                </div>
                <span className="font-bold text-xl text-foreground tracking-tight">Logo</span>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onToggle}
          className={`rounded-sm transition-all duration-200 flex items-center justify-center
            ${collapsed
              ? 'p-2 hover:bg-muted text-muted-foreground hover:text-foreground'
              : 'p-2 hover:bg-muted text-muted-foreground ml-auto'}`}
        >
          {collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 flex items-center justify-center">
                {dynamicLogo ? (
                  <img src={dynamicLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-primary/20">
                    L
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </div>
          ) : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
        {isEmployeeUser || viewMode === 'self' ? (
          // Self-service view for all users
          selfNavItems
            .filter((item) => {
              if (isEmployeeUser && item.path === "/employee-exit") return false;
              if (item.module && !has(item.module)) return false;
              if ((item.path === '/my-assets' || item.path === '/asset-management') && !assetTrackingEnabled) return false;
              const requiredPermissions = navItemPermissions[item.path];
              if (requiredPermissions && requiredPermissions.length > 0) {
                return canAny(requiredPermissions);
              }
              return true;
            })
            .map((item) => (
            <NavLink
              key={item.path}
              to={getPath(item.path)}
              end={item.path === '/'}
              onClick={() => onMobileClose?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-sm transition-all ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{formatLabel(item.label)}</span>}
            </NavLink>
          ))
        ) : (
          // Role-based management view
          accessibleNavItems.map((item) => {
          // Dynamically adjust labels based on user role (e.g. My Calendar for Employees)
          let label = item.label;
          let path = item.path;

          let rawRole = Array.isArray(user?.role) ? (user?.role[0] || '') : (user?.role || '');
          if (typeof rawRole === 'object' && rawRole !== null) {
            rawRole = rawRole.name || rawRole.code || rawRole.id || '';
          }
          const normalizedRole = rawRole.toString().toUpperCase().replace(/[\s_]+/g, '');
          const isEmployee = normalizedRole === 'EMPLOYEE' || normalizedRole === 'USER';

          if (item.path === "/team-calendar") {
            if (isEmployee) {
              label = "My Calendar";
            }
          }

          if (item.path === "/payroll" && isEmployee) {
            path = "/employee/payroll";
            label = "My Payroll";
          }

          if (item.path === "/loans-advances" && isEmployee) {
            path = "/employee/loans-advances";
            label = "My Loans & Advances";
          }

          if (item.path === "/lms/dashboard" && isEmployee) {
            label = "My Learning";
          }

          if (item.path === "/surveys") {
            if (isEmployee) {
              label = "My Surveys";
            } else {
              path = "/surveys/admin";
              label = "Survey Manager";
            }
          }

          if (item.path === "/news") {
            if (!isEmployee) {
              path = "/news/manage";
              label = "Company News";
            }
          }


          const isItemExpanded = expandedPaths.includes(item.path);

          let hasChildren1 = false;
          if (item.path === "/asset-management" && isEmployee) {
            path = "/my-assets";
            label = "My Assets";
          } else {
            hasChildren1 = Boolean(
              (item.path === "/payroll" && !isEmployee) ||
              (item.children && item.children.length > 0)
            );
          }

          if (hasChildren1) {
            return (
              <div key={item.path} className="space-y-1">
                <div
                  onClick={() => togglePath(item.path)}
                  className="flex items-center justify-between px-4 py-2 text-foreground hover:bg-muted rounded-sm cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                    {!collapsed && <span className="text-sm font-medium">{formatLabel(label)}</span>}
                  </div>
                  {!collapsed && <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200 ${isItemExpanded ? 'rotate-180' : ''}`} />}
                </div>
                {!collapsed && isItemExpanded && (
                  <div className="pl-12 space-y-1">
                    {item.path === "/payroll" && !isEmployee ? (
                      <>
                        <NavLink
                          to={getPath("/payroll/setup")}
                          onClick={() => onMobileClose?.()}
                          className={({ isActive }) =>
                            `block py-2 text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                            }`
                          }
                        >
                          {formatLabel("Payroll Setup")}
                        </NavLink>
                        <NavLink
                          to={getPath("/payroll/calculation")}
                          onClick={() => onMobileClose?.()}
                          className={({ isActive }) =>
                            `block py-2 text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                            }`
                          }
                        >
                          {formatLabel("Payroll Calculation")}
                        </NavLink>
                        <NavLink
                          to={getPath("/payroll/runs")}
                          onClick={() => onMobileClose?.()}
                          className={({ isActive }) =>
                            `block py-2 text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                            }`
                          }
                        >
                          {formatLabel("Payroll Runs")}
                        </NavLink>
                      </>
                    ) : (
                      item.children?.filter((child: any) => {
                        if (child.module && !has(child.module)) return false;
                        const childPermissions = navItemPermissions[child.path];
                        if (!childPermissions || childPermissions.length === 0) return true;
                        return canAny(childPermissions);
                      }).map(child => (
                        <NavLink
                          key={child.path}
                          to={getPath(child.path)}
                          onClick={() => onMobileClose?.()}
                          className={({ isActive }) =>
                            `block py-2 text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                            }`
                          }
                        >
                          {formatLabel(child.label)}
                        </NavLink>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={getPath(path)}
              end={item.exact}
              onClick={() => onMobileClose?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-sm transition-all ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{formatLabel(label)}</span>}
            </NavLink>
          );
        })
        )}
      </nav>
      {!isEmployeeUser && !collapsed && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-full p-1 gap-1">
            <button
              onClick={() => handleViewModeChange('self')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-full transition-all duration-300 ease-in-out ${
                viewMode === 'self'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Self
            </button>
            <button
              onClick={() => handleViewModeChange('role')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-full transition-all duration-300 ease-in-out ${
                viewMode === 'role'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Role
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

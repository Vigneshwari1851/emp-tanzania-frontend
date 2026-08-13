import type { ModulePermissions, DepartmentPermissions, UserRole } from '@/shared/types/rbac';
import { UserRole as UserRoleVal } from '@/shared/types/rbac';

// Default permissions for Super Admin role
const superAdminDefaults: ModulePermissions = {
  dashboard: true,
  companyStructure: {
    view: true,
    edit: true,
    manageDepartments: true,
  },
  employeeManagement: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    add: true,
    edit: true,
    delete: true,
  },
  leaveManagement: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    approve: true,
    managePolicies: true,
  },
  learningManagement: {
    access: true,
    createCourses: true,
    assignCourses: true,
  },
  performanceManagement: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    createTemplates: true,
    conductReviews: true,
  },
  engagement: {
    viewSurveys: true,
    createSurveys: true,
    viewResults: true,
  },
  ats: {
    viewAll: true,
    viewAssigned: true,
    manageJobPostings: true,
    screenApplications: true,
    scheduleInterviews: true,
    approveOffers: true,
  },
  payroll: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    manage: true,
    process: true,
  },
  systemSettings: {
    manage: true,
    view: true,
  },
};

// Default permissions for Admin role
const adminDefaults: ModulePermissions = {
  dashboard: true,
  companyStructure: {
    view: true,
    edit: false,
    manageDepartments: true,
  },
  employeeManagement: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    add: true,
    edit: true,
    delete: false,
  },
  leaveManagement: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    approve: true,
    managePolicies: true,
  },
  learningManagement: {
    access: true,
    createCourses: true,
    assignCourses: true,
  },
  performanceManagement: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    createTemplates: true,
    conductReviews: true,
  },
  engagement: {
    viewSurveys: true,
    createSurveys: true,
    viewResults: true,
  },
  ats: {
    viewAll: true,
    viewAssigned: true,
    manageJobPostings: true,
    screenApplications: true,
    scheduleInterviews: true,
    approveOffers: false,
  },
  payroll: {
    viewAll: true,
    viewTeam: true,
    viewOwn: true,
    manage: true,
    process: true,
  },
  systemSettings: {
    manage: false,
    view: true,
  },
};

// Default permissions for Manager role
const managerDefaults: ModulePermissions = {
  dashboard: true,
  companyStructure: {
    view: true,
    edit: false,
    manageDepartments: false,
  },
  employeeManagement: {
    viewAll: false,
    viewTeam: true,
    viewOwn: true,
    add: false,
    edit: false,
    delete: false,
  },
  leaveManagement: {
    viewAll: false,
    viewTeam: true,
    viewOwn: true,
    approve: true,
    managePolicies: false,
  },
  learningManagement: {
    access: true,
    createCourses: false,
    assignCourses: true,
  },
  performanceManagement: {
    viewAll: false,
    viewTeam: true,
    viewOwn: true,
    createTemplates: false,
    conductReviews: true,
  },
  engagement: {
    viewSurveys: true,
    createSurveys: false,
    viewResults: false,
  },
  ats: {
    viewAll: false,
    viewAssigned: true,
    manageJobPostings: false,
    screenApplications: true,
    scheduleInterviews: true,
    approveOffers: false,
  },
  payroll: {
    viewAll: false,
    viewTeam: true,
    viewOwn: true,
    manage: false,
    process: false,
  },
  systemSettings: {
    manage: false,
    view: false,
  },
};

// Default permissions for Employee role
const employeeDefaults: ModulePermissions = {
  dashboard: true,
  companyStructure: {
    view: true,
    edit: false,
    manageDepartments: false,
  },
  employeeManagement: {
    viewAll: false,
    viewTeam: false,
    viewOwn: true,
    add: false,
    edit: false,
    delete: false,
  },
  leaveManagement: {
    viewAll: false,
    viewTeam: false,
    viewOwn: true,
    approve: false,
    managePolicies: false,
  },
  learningManagement: {
    access: true,
    createCourses: false,
    assignCourses: false,
  },
  performanceManagement: {
    viewAll: false,
    viewTeam: false,
    viewOwn: true,
    createTemplates: false,
    conductReviews: false,
  },
  engagement: {
    viewSurveys: true,
    createSurveys: false,
    viewResults: false,
  },
  ats: {
    viewAll: false,
    viewAssigned: false,
    manageJobPostings: false,
    screenApplications: false,
    scheduleInterviews: false,
    approveOffers: false,
  },
  payroll: {
    viewAll: false,
    viewTeam: false,
    viewOwn: true,
    manage: false,
    process: false,
  },
  systemSettings: {
    manage: false,
    view: false,
  },
};

// Get default permissions for a role
export function getDefaultPermissions(role: UserRole): ModulePermissions {
  switch (role) {
    case UserRoleVal.SUPER_ADMIN:
      return { ...superAdminDefaults };
    case UserRoleVal.ADMIN:
      return { ...adminDefaults };
    case UserRoleVal.MANAGER:
      return { ...managerDefaults };
    case UserRoleVal.EMPLOYEE:
      return { ...employeeDefaults };
    default:
      return { ...employeeDefaults };
  }
}

// Get default department permissions (all roles)
export function getDefaultDepartmentPermissions(): DepartmentPermissions {
  return {
    [UserRoleVal.SUPER_ADMIN]: getDefaultPermissions(UserRoleVal.SUPER_ADMIN),
    [UserRoleVal.ADMIN]: getDefaultPermissions(UserRoleVal.ADMIN),
    [UserRoleVal.MANAGER]: getDefaultPermissions(UserRoleVal.MANAGER),
    [UserRoleVal.EMPLOYEE]: getDefaultPermissions(UserRoleVal.EMPLOYEE),
  };
}

// Module display names
export const moduleDisplayNames = {
  dashboard: 'Dashboard',
  companyStructure: 'Org Setup',
  employeeManagement: 'Employee Management',
  leaveManagement: 'Leave Management',
  learningManagement: 'Learning Management',
  performanceManagement: 'Performance Management',
  engagement: 'Engagement',
  ats: 'ATS / Recruitment',
  payroll: 'Payroll',
  systemSettings: 'System Settings',
};

// Permission labels for each module
export const permissionLabels = {
  companyStructure: {
    view: 'View',
    edit: 'Edit',
    manageDepartments: 'Manage Departments',
  },
  employeeManagement: {
    viewAll: 'View All',
    viewTeam: 'View Team',
    viewOwn: 'View Own',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
  },
  leaveManagement: {
    viewAll: 'View All',
    viewTeam: 'View Team',
    viewOwn: 'View Own',
    approve: 'Approve',
    managePolicies: 'Manage Policies',
  },
  learningManagement: {
    access: 'Access',
    createCourses: 'Create Courses',
    assignCourses: 'Assign Courses',
  },
  performanceManagement: {
    viewAll: 'View All',
    viewTeam: 'View Team',
    viewOwn: 'View Own',
    createTemplates: 'Create Templates',
    conductReviews: 'Conduct Reviews',
  },
  engagement: {
    viewSurveys: 'View Surveys',
    createSurveys: 'Create Surveys',
    viewResults: 'View Results',
  },
  ats: {
    viewAll: 'View All',
    viewAssigned: 'View Assigned',
    manageJobPostings: 'Manage Job Postings',
    screenApplications: 'Screen Applications',
    scheduleInterviews: 'Schedule Interviews',
    approveOffers: 'Approve Offers',
  },
  payroll: {
    viewAll: 'View All',
    viewTeam: 'View Team',
    viewOwn: 'View Own',
    manage: 'Manage',
    process: 'Process',
  },
  systemSettings: {
    manage: 'Manage',
    view: 'View',
  },
};

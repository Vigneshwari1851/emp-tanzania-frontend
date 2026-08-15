// Role-Based Access Control Types

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  HR: 'HR',
  FINANCE: 'FINANCE',
  MANAGER: 'MANAGER',
  TRAINER: 'TRAINER',
  EMPLOYEE: 'EMPLOYEE',
  USER: 'USER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const Permission = {
  // Company Structure
  VIEW_COMPANY_STRUCTURE: 'VIEW_COMPANY_STRUCTURE',
  EDIT_COMPANY_STRUCTURE: 'EDIT_COMPANY_STRUCTURE',
  MANAGE_DEPARTMENTS: 'MANAGE_DEPARTMENTS',
  VIEW_DESIGNATIONS: 'VIEW_DESIGNATIONS',
  EDIT_DESIGNATIONS: 'EDIT_DESIGNATIONS',
  CREATE_DESIGNATIONS: 'CREATE_DESIGNATIONS',
  DELETE_DESIGNATIONS: 'DELETE_DESIGNATIONS',
  
  // Employee Management
  VIEW_ALL_EMPLOYEES: 'VIEW_ALL_EMPLOYEES',
  VIEW_TEAM_EMPLOYEES: 'VIEW_TEAM_EMPLOYEES',
  VIEW_OWN_PROFILE: 'VIEW_OWN_PROFILE',
  ADD_EMPLOYEE: 'ADD_EMPLOYEE',
  EDIT_EMPLOYEE: 'EDIT_EMPLOYEE',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',
  
  // Leave Management
  VIEW_ALL_LEAVES: 'VIEW_ALL_LEAVES',
  VIEW_TEAM_LEAVES: 'VIEW_TEAM_LEAVES',
  VIEW_OWN_LEAVES: 'VIEW_OWN_LEAVES',
  APPROVE_LEAVES: 'APPROVE_LEAVES',
  MANAGE_LEAVE_POLICIES: 'MANAGE_LEAVE_POLICIES',
  
  // Performance Management
  VIEW_ALL_REVIEWS: 'VIEW_ALL_REVIEWS',
  VIEW_TEAM_REVIEWS: 'VIEW_TEAM_REVIEWS',
  VIEW_OWN_REVIEWS: 'VIEW_OWN_REVIEWS',
  CREATE_REVIEW_TEMPLATE: 'CREATE_REVIEW_TEMPLATE',
  CONDUCT_REVIEWS: 'CONDUCT_REVIEWS',
  
  // Engagement
  VIEW_ALL_SURVEYS: 'VIEW_ALL_SURVEYS',
  CREATE_SURVEYS: 'CREATE_SURVEYS',
  VIEW_SURVEY_RESULTS: 'VIEW_SURVEY_RESULTS',
  
  // ATS/Recruitment
  VIEW_ALL_CANDIDATES: 'VIEW_ALL_CANDIDATES',
  VIEW_ASSIGNED_CANDIDATES: 'VIEW_ASSIGNED_CANDIDATES',
  MANAGE_JOB_POSTINGS: 'MANAGE_JOB_POSTINGS',
  SCREEN_APPLICATIONS: 'SCREEN_APPLICATIONS',
  SCHEDULE_INTERVIEWS: 'SCHEDULE_INTERVIEWS',
  APPROVE_OFFERS: 'APPROVE_OFFERS',
  
  // Payroll
  VIEW_ALL_PAYROLL: 'VIEW_ALL_PAYROLL',
  VIEW_TEAM_PAYROLL: 'VIEW_TEAM_PAYROLL',
  VIEW_OWN_PAYROLL: 'VIEW_OWN_PAYROLL',
  MANAGE_PAYROLL: 'MANAGE_PAYROLL',
  PROCESS_PAYROLL: 'PROCESS_PAYROLL',
  
  // CRM
  VIEW_CRM: 'VIEW_CRM',
  MANAGE_CRM: 'MANAGE_CRM',

  // Asset Management
  VIEW_ASSETS: 'VIEW_ASSETS',
  MANAGE_ASSETS: 'MANAGE_ASSETS',

  // LMS
  VIEW_LMS: 'VIEW_LMS',
  MANAGE_LMS: 'MANAGE_LMS',

  // Company News
  VIEW_NEWS: 'VIEW_NEWS',
  MANAGE_NEWS: 'MANAGE_NEWS',

  // Future Modules
  VIEW_EMAIL_MANAGEMENT: 'VIEW_EMAIL_MANAGEMENT',
  VIEW_NOTIFY_MANAGEMENT: 'VIEW_NOTIFY_MANAGEMENT',

  // Document Hub
  VIEW_DOCUMENTS: 'VIEW_DOCUMENTS',
  MANAGE_DOCUMENTS: 'MANAGE_DOCUMENTS',
  UPLOAD_DOCUMENTS: 'UPLOAD_DOCUMENTS',
  DELETE_DOCUMENTS: 'DELETE_DOCUMENTS',

  // System Settings
  MANAGE_SYSTEM_SETTINGS: 'MANAGE_SYSTEM_SETTINGS',
  VIEW_SYSTEM_SETTINGS: 'VIEW_SYSTEM_SETTINGS',
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  permissions?: DepartmentPermissions;
}

// Department-level module permissions
export interface DepartmentPermissions {
  [UserRole.SUPER_ADMIN]: ModulePermissions;
  [UserRole.ADMIN]: ModulePermissions;
  [UserRole.MANAGER]: ModulePermissions;
  [UserRole.EMPLOYEE]: ModulePermissions;
}

export interface ModulePermissions {
  dashboard: boolean;
  companyStructure: {
    view: boolean;
    edit: boolean;
    manageDepartments: boolean;
  };
  employeeManagement: {
    viewAll: boolean;
    viewTeam: boolean;
    viewOwn: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
  };
  leaveManagement: {
    viewAll: boolean;
    viewTeam: boolean;
    viewOwn: boolean;
    approve: boolean;
    managePolicies: boolean;
  };
  learningManagement: {
    access: boolean;
    createCourses: boolean;
    assignCourses: boolean;
  };
  performanceManagement: {
    viewAll: boolean;
    viewTeam: boolean;
    viewOwn: boolean;
    createTemplates: boolean;
    conductReviews: boolean;
  };
  engagement: {
    viewSurveys: boolean;
    createSurveys: boolean;
    viewResults: boolean;
  };
  ats: {
    viewAll: boolean;
    viewAssigned: boolean;
    manageJobPostings: boolean;
    screenApplications: boolean;
    scheduleInterviews: boolean;
    approveOffers: boolean;
  };
  payroll: {
    viewAll: boolean;
    viewTeam: boolean;
    viewOwn: boolean;
    manage: boolean;
    process: boolean;
  };
  systemSettings: {
    manage: boolean;
    view: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: string[];
  permissions?: string[];
  departmentId: string;
  departmentName?: string;
  designationName?: string;
  managerId?: string; // Direct reporting manager
  employeeId: string;
  position: string;
  avatar?: string;
  profile_picture?: string;
  country?: string;
  orgSlug?: string;
  orgId?: number;
}

export interface HierarchyNode {
  userId: string;
  subordinates: string[]; // List of direct report IDs
  allSubordinates: string[]; // List of all downstream report IDs (recursive)
  department: string;
  level: number; // Organizational level (0 = CEO, 1 = Direct reports, etc.)
}

export type PermissionMap = {
  [key in UserRole]: Permission[];
};

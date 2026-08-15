import React, { lazy, Suspense } from "react";
import { Route, createRoutesFromElements, Navigate, Outlet } from "react-router-dom";
import { PageLoader } from "../shared/components/common/PageLoader";

import Login from "../features/auth/pages/Login/Login";
import VerifyOtp from "../features/auth/pages/VerifyLogin/VerifyLogin";
import ResetPassword from "../features/auth/pages/ResetPassword/ResetPassword";
import ForgotPassword from "../features/auth/pages/ForgetPassword/ForgotPassword";

import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { MainLayout } from "../shared/components/layout/MainLayout";
import ErrorPage from "../shared/components/common/ErrorPage";
import { CompanyStructure } from "../features/organization/pages/CompanyStructure";
import { OrganisationStructure } from "../features/organization/pages/OrganisationStructure";
import { useAuth } from "../shared/context/AuthContext";

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user?.orgSlug && user.orgSlug !== 'undefined' && user.orgSlug !== 'null') {
    return <Navigate to={`/${user.orgSlug}`} replace />;
  }
  return <Navigate to="/login" replace />;
}
import { EmployeeManagement } from "../features/employees/pages/EmployeeManagement";
import { CompanySettings } from "../features/organization/pages/CompanySettings";
import { AddDepartment } from "../features/organization/pages/AddDepartment";
import { JobHierarchySetup } from "../features/organization/pages/JobHierarchySetup";
import { CompanyStructureDemo } from "../features/organization/pages/CompanyStructureDemo";
import { AddEmployee } from "../features/employees/pages/AddEmployee";
import { ChangeRequestHub } from "../features/change-requests/pages/ChangeRequestHub";
import { HolidaysPage } from "../features/organization/pages/HolidaysPage";

import { RolesPermissions } from "../features/rbac/pages/RolesPermissions";
import { UserProfile } from "../features/employees/pages/UserProfile";
import EmployeeExit from "../features/exit/pages/EmployeeExit";
import { LeaveManagement } from "../features/leaves/pages/LeaveManagement";
import { TeamCalendar } from "../features/leaves/pages/TeamCalendar";
import { LeavePolicyView } from "../features/leaves/pages/LeavePolicyView";
import { Dashboard } from "../features/dashboard/pages/Dashboard";
import { SystemSettings } from "../features/settings/pages/SystemSettings";
import { DesignSystem } from "../features/design-system/pages/DesignSystem";
import { CreateEditUserTypePage } from "../features/settings/pages/CreateEditUserTypePage";
import { CreateRolePage } from "../features/settings/pages/CreateRolePage";
import { Notifications } from "../features/notifications/pages/Notifications";
import { FeedbackPage } from "../features/feedback/pages/Feedback";
import { EmployeeLeaveHistory } from "../features/leaves/pages/EmployeeLeaveHistory";
import { PayrollSetup } from "../features/payroll/pages/PayrollSetup";
import { EmployeePortal as EmployeePayrollPortal } from "../features/payroll/pages/EmployeePortal";
import CategoryForm from "../features/payroll/pages/CategoryForm";
import PayrollGroupForm from "../features/payroll/pages/PayrollGroupForm";
import { EditSalaryComponent } from "../features/payroll/pages/EditSalaryComponent";
import TaxSectionForm from "../features/payroll/pages/TaxSectionForm";
import ReimbursementTypeForm from "../features/payroll/pages/ReimbursementTypeForm";
import { ReimbursementModule } from "../features/reimbursements/pages/ReimbursementModule";

import { PayrollCalculation } from "../features/payroll/components/PayrollCalculation";
import { PayrollRuns } from "../features/payroll/components/PayrollRuns";
import { Permission, UserRole } from "@/shared/types/rbac";

import { LoansAdvancesSetup } from "../features/loans-advances/pages/LoansAdvancesSetup";
import { LoansAdvancesPortal as LoansAdvancesPortalPage } from "../features/loans-advances/pages/LoansAdvancesPortal";
import { LoanTypeConfig } from "../features/loans-advances/pages/LoanTypeConfig";
import { LoanDashboard } from "../features/loans-advances/pages/LoanDashboard";
import { LoanApply } from "../features/loans-advances/pages/LoanApply";
import { MyApplications } from "../features/loans-advances/pages/MyApplications";
import { RepaymentHistory } from "../features/loans-advances/pages/RepaymentHistory";
import { CreateLoanType } from "../features/loans-advances/pages/CreateLoanType";
import { IssueLoan } from "../features/loans-advances/pages/IssueLoan";
import { CreateLoanAdvance } from "../features/loans-advances/pages/CreateLoanAdvance";
import { TimeAttendance } from "../features/attendance/pages/TimeAttendance";
import { LoanAdvanceModule } from "../features/loans-advances/pages/LoanAdvanceModule";
import { ReimbursementPayout } from "../features/reimbursements/pages/ReimbursementPayout";
import { TaxDeclarationApprovalHub } from "../features/payroll/components/TaxDeclarationApprovalHub";


import AssetList from "../features/asset/AssetList";
import AssetDetailPage from "../features/asset/AssetDetailPage";
import AssetFormPage from "../features/asset/AssetFormPage";
import AssetAssignPage from "../features/asset/AssetAssignPage";
import Assignments from "../features/assignment/Assignments";
import AssignAssetPage from "../features/assignment/AssignAssetPage";

import RecruiterDashboard from "../features/recruitment/pages/RecruiterDashboard";
import CandidatePortal from "../features/recruitment/pages/CandidatePortal";
import AddCandidate from "../features/recruitment/pages/AddCandidate";
import JobManagement from "../features/recruitment/pages/JobManagement";
import JobCreation from "../features/recruitment/pages/JobCreation";
import HROpsOnboarding from "../features/recruitment/pages/HROpsOnboarding";
import BgvCaseDetails from "../features/recruitment/pages/BgvCaseDetails";
import { CareersPortal } from "../features/recruitment/pages/CareersPortal";
import { JobDetail } from "../features/recruitment/pages/JobDetail";
import { CandidateApplicationForm } from "../features/recruitment/pages/CandidateApplicationForm";
import { MyAssetsPage } from "../features/asset/MyAssetsPage";
import { RequestAssetPage } from "../features/asset/RequestAssetPage";
import CandidateReview from "../features/recruitment/pages/CandidateReview";

import { AdminCourseList } from "../features/lms/pages/AdminCourseList";
import { CourseEditor } from "../features/lms/pages/CourseEditor";
import { LmsDashboard } from "../features/lms/pages/LmsDashboard";
import { CoursePlayer } from "../features/lms/pages/CoursePlayer";
import { AssignmentHub } from "../features/lms/pages/AssignmentHub";
import { LearningPathList } from "../features/lms/pages/LearningPathList";
import { LearningPathEditor } from "../features/lms/pages/LearningPathEditor";
import { AuditLogs } from "../features/audit/pages/AuditLogs";
import { PrivacyPolicy } from "../features/privacy/pages/PrivacyPolicy";
import { LmsNotifications } from "../features/lms/pages/LmsNotifications";
import { NotificationControlCenter } from "../features/lms/pages/NotificationControlCenter";

import AdminSurveyDashboard from "../features/survey-builder/pages/AdminSurveyDashboard";
import EmployeeSurveyInbox from "../features/survey-builder/pages/EmployeeSurveyInbox";
import CreateSurveyPage from "../features/survey-builder/pages/CreateSurveyPage";
import AnalyticsSurveyPage from "../features/survey-builder/pages/AnalyticsSurveyPage";
import LinearBuilderPage from "../features/survey-builder/pages/LinearBuilderPage";
import LogicBuilderPage from "../features/survey-builder/pages/LogicBuilderPage";
import PreviewPage from "../features/survey-builder/pages/PreviewPage";
import PreviewViewPage from "../features/survey-builder/pages/PreviewViewPage";
import PublishPage from "../features/survey-builder/pages/PublishPage";
import TakeSurveyPage from "../features/survey-builder/pages/TakeSurveyPage";

import { DocumentHub } from "../features/documents/pages/DocumentHub";
import { DocumentDetail } from "../features/documents/pages/DocumentDetail";
import { DocumentUpload } from "../features/documents/pages/DocumentUpload";

import NewsHub from "../features/news/pages/NewsHub";
import NewsManagement from "../features/news/pages/NewsManagement";
import NewsForm from "../features/news/pages/NewsForm";
import { ReportBuilder } from "../features/reports/pages/ReportBuilder";

function AssetProtectedRoute() {
  const { user } = useAuth();
  const isAssetTrackingEnabled = localStorage.getItem("asset_tracking_enabled") !== "false";
  return isAssetTrackingEnabled ? <Outlet /> : <Navigate to={user?.orgSlug ? `/${user.orgSlug}` : '/login'} replace />;
}

export const routes = createRoutesFromElements(
  <Route element={<Suspense fallback={<PageLoader />}><Outlet /></Suspense>}>
  <Route errorElement={<ErrorPage />}>
    {/* Public Routes */}
    <Route path="/" element={<RootRedirect />} />
    <Route path="/login" element={<Login />} />
    <Route path="/:orgSlug/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify-login" element={<VerifyOtp />} />
    <Route path="/:orgSlug/verify-login" element={<VerifyOtp />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/careers" element={<CareersPortal />} />
    <Route path="/careers/jobs/:id" element={<JobDetail />} />
    <Route path="/careers/jobs/:id/apply" element={<CandidateApplicationForm />} />
    <Route path="/candidate/portal" element={<CandidatePortal />} />

    {/* Public Survey Take Page (no auth needed) */}
    <Route path="/surveys/take/:id" element={<TakeSurveyPage />} />

    <Route path="*" element={<ErrorPage />} />

    {/* Protected Routes (with EMPLOYEE layout) */}
    <Route path="/:orgSlug" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><MainLayout /></Suspense></ProtectedRoute>} errorElement={<ErrorPage />}>
      <Route index element={<Dashboard />} />

      {/* Org Setup Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_COMPANY_STRUCTURE]} />}>
        <Route path="org-setup" element={<CompanyStructure />} />
        <Route path="org-setup/settings" element={<CompanySettings />} />
        <Route path="org-setup/demo" element={<CompanyStructureDemo />} />
        <Route path="org-setup/add-department" element={<AddDepartment />} />
        <Route path="org-setup/edit-department/:id" element={<AddDepartment />} />
      </Route>

      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_DESIGNATIONS]} />}>
        <Route path="organisation-structure" element={<OrganisationStructure />} />
        <Route path="org-setup/job-hierarchy-setup" element={<JobHierarchySetup />} />
      </Route>

      {/* Employee Management Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_ALL_EMPLOYEES, Permission.VIEW_TEAM_EMPLOYEES, Permission.VIEW_OWN_PROFILE]} />}>
        <Route path="employee-management" element={<EmployeeManagement />} />
        <Route path="employee-management/profile/:id" element={<UserProfile />} />
        <Route path="employee-management/add-employee" element={<AddEmployee />} />
        <Route path="employee-management/edit-employee/:id" element={<AddEmployee />} />
        <Route path="employee-management/change-requests" element={<ChangeRequestHub />} />
      </Route>

      {/* Management Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.MANAGE_SYSTEM_SETTINGS]} allowedRoles={[UserRole.SUPER_ADMIN]} />}>
        <Route path="roles-permissions" element={<RolesPermissions />} />
      </Route>

      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_SYSTEM_SETTINGS]} />}>
        <Route path="system-settings" element={<SystemSettings />} />
        <Route path="system-settings/user-types/new" element={<CreateEditUserTypePage />} />
        <Route path="system-settings/user-types/edit/:id" element={<CreateEditUserTypePage />} />
        <Route path="system-settings/roles/new" element={<CreateRolePage />} />
      </Route>

      <Route path="design-system" element={<DesignSystem />} />

      <Route path="leave-management/:id" element={<LeaveManagement />} />
      <Route path="leave-management" element={<LeaveManagement />} />
      <Route path="leave-management/requests" element={<LeaveManagement />} />
      <Route path="leave-management/history" element={<LeaveManagement />} />
      <Route path="leave-management/types" element={<LeaveManagement />} />
      <Route path="leave-management/statistics" element={<LeaveManagement />} />
      <Route path="time-attendance" element={<TimeAttendance />} />
      <Route path="leave-history/:employeeId" element={<EmployeeLeaveHistory />} />
      <Route path="team-calendar" element={<TeamCalendar />} />
      <Route path="leave-management/policy/:id" element={<LeavePolicyView />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="feedback" element={<FeedbackPage />} />
      <Route path="profile" element={<UserProfile />} />
      <Route path="holidays" element={<HolidaysPage />} />

      <Route path="employee-exit" element={<EmployeeExit />} />

      {/* Payroll Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_ALL_PAYROLL, Permission.VIEW_TEAM_PAYROLL]} />}>
        <Route path="payroll" element={<PayrollSetup />} />
        <Route path="payroll/setup" element={<PayrollSetup />} />
        <Route path="payroll/components/add" element={<div /> /* Removed standalone component route */} />
        <Route path="payroll/components/edit/:id" element={<div /> /* Removed standalone component route */} />
        <Route path="payroll/category/add" element={<CategoryForm />} />
        <Route path="payroll/category/edit/:id" element={<CategoryForm />} />
        <Route path="payroll/group/add" element={<PayrollGroupForm />} />
        <Route path="payroll/group/edit/:id" element={<PayrollGroupForm />} />
        <Route path="payroll/tax/add" element={<TaxSectionForm />} />
        <Route path="payroll/tax/edit/:id" element={<TaxSectionForm />} />
        <Route path="payroll/reimb/add" element={<ReimbursementTypeForm />} />
        <Route path="payroll/reimb/edit/:id" element={<ReimbursementTypeForm />} />
        <Route path="payroll/calculation" element={<PayrollCalculation />} />
        <Route path="payroll/runs" element={<PayrollRuns />} />
        <Route path="payroll/tax-declarations" element={<TaxDeclarationApprovalHub />} />
      </Route>

      <Route path="tax-declarations" element={<TaxDeclarationApprovalHub />} />
      <Route path="employee/payroll" element={<EmployeePayrollPortal />} />
      <Route path="reimbursements" element={<ReimbursementModule />} />
      <Route path="reimbursements/payout" element={<ReimbursementPayout />} />

      {/* Loans & Advances Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_LOANS_ADVANCES, Permission.VIEW_ALL_PAYROLL, Permission.VIEW_TEAM_PAYROLL]} />}>
        <Route path="loans-advances" element={<LoansAdvancesSetup />} />
        <Route path="loans-advances/:id" element={<LoansAdvancesSetup />} />
        <Route path="loans-advances/module" element={<LoanAdvanceModule />} />
        <Route path="loans-advances/config" element={<LoanTypeConfig />} />
        <Route path="loans-advances/config/create" element={<CreateLoanType />} />
        <Route path="loans-advances/config/edit/:id" element={<CreateLoanType />} />
        <Route path="loans-advances/dashboard" element={<LoanDashboard />} />
        <Route path="loans-advances/issue" element={<IssueLoan />} />
        <Route path="loans-advances/create" element={<CreateLoanAdvance />} />
      </Route>
      <Route path="employee/loans-advances" element={<LoansAdvancesPortalPage />} />
      <Route path="employee/loans-advances/:id" element={<LoansAdvancesPortalPage />} />
      <Route path="employee/loans-advances/apply" element={<LoanApply />} />
      <Route path="employee/loans-advances/repayment/:id" element={<RepaymentHistory />} />
      <Route path="employee/loans-advances/my-applications" element={<MyApplications />} />

      <Route element={<AssetProtectedRoute />}>
        <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_ASSETS]} />}>
          <Route path="assets" element={<AssetList />} />
          <Route path="assets/add" element={<AssetFormPage />} />
          <Route path="assets/edit/:id" element={<AssetFormPage />} />
          <Route path="assets/:id" element={<AssetDetailPage />} />
          <Route path="assets/assign/:id" element={<AssetAssignPage />} />
          <Route path="assets/assignment" element={<Assignments />} />
          <Route path="assets/assignment/new" element={<AssignAssetPage />} />
        </Route>
        <Route path="my-assets" element={<MyAssetsPage />} />
        <Route path="my-assets/request" element={<RequestAssetPage />} />
      </Route>

      {/* LMS Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_LMS]} />}>
        <Route path="lms/courses" element={<AdminCourseList />} />
        <Route path="lms/courses/new" element={<CourseEditor />} />
        <Route path="lms/courses/:id" element={<CourseEditor />} />
        <Route path="lms/dashboard" element={<LmsDashboard />} />
        <Route path="lms/learning-paths" element={<LearningPathList />} />
        <Route path="lms/learning-paths/new" element={<LearningPathEditor />} />
        <Route path="lms/learning-paths/:id" element={<LearningPathEditor />} />
        <Route path="lms/assignments" element={<AssignmentHub />} />
        <Route path="lms/notifications" element={<LmsNotifications />} />
        <Route path="lms/notifications/settings" element={<NotificationControlCenter />} />
      </Route>

      {/* Audit Logs */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.MANAGE_SYSTEM_SETTINGS]} allowedRoles={[UserRole.SUPER_ADMIN]} />}>
        <Route path="audit" element={<AuditLogs />} />
      </Route>

      {/* Privacy Policy */}
      <Route path="privacy-policy" element={<PrivacyPolicy />} />

      <Route path="report-builder" element={<ReportBuilder />} />

      <Route path="documents" element={<DocumentHub />} />
      <Route path="documents/upload" element={<DocumentUpload />} />
      <Route path="documents/:id" element={<DocumentDetail />} />

      {/* Company News Routes */}
      <Route path="news" element={<NewsHub />} />
      <Route element={<ProtectedRoute requiredPermissions={[Permission.MANAGE_NEWS]} />}>
        <Route path="news/manage" element={<NewsManagement />} />
        <Route path="news/create" element={<NewsForm />} />
        <Route path="news/edit/:id" element={<NewsForm />} />
      </Route>

      {/* Survey Module Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_ALL_SURVEYS]} />}>
        <Route path="surveys/admin" element={<AdminSurveyDashboard />} />
        <Route path="surveys/admin/new" element={<CreateSurveyPage />} />
        <Route path="surveys/admin/edit/:id" element={<CreateSurveyPage />} />
        <Route path="surveys/admin/linear-builder/:id" element={<LinearBuilderPage />} />
        <Route path="surveys/admin/logic-builder/:id" element={<LogicBuilderPage />} />
        <Route path="surveys/admin/publish/:id" element={<PublishPage />} />
        <Route path="surveys/admin/analytics/:id" element={<AnalyticsSurveyPage />} />
        <Route path="surveys/admin/preview/:id" element={<PreviewPage />} />
        <Route path="surveys/admin/preview-view/:id" element={<PreviewViewPage />} />
      </Route>
      <Route path="surveys" element={<EmployeeSurveyInbox />} />

      {/* Recruitment Routes */}
      <Route element={<ProtectedRoute requiredPermissions={[Permission.VIEW_ALL_CANDIDATES]} />}>
        <Route path="recruitment" element={<RecruiterDashboard />} />
        <Route path="recruitment/add-candidate" element={<AddCandidate />} />
        <Route path="recruitment/edit-candidate/:id" element={<AddCandidate />} />
        <Route path="recruitment/jobs" element={<JobManagement />} />
        <Route path="recruitment/jobs/new" element={<JobCreation />} />
        <Route path="recruitment/jobs/edit/:id" element={<JobCreation />} />
        <Route path="recruitment/applications/:id/review" element={<CandidateReview />} />
      </Route>
      <Route path="onboarding" element={<HROpsOnboarding />} />
      <Route path="onboarding/bgv/:id" element={<BgvCaseDetails />} />

      {/* Full Screen LMS Player - inside orgSlug scope */}
      <Route path="lms/player/:id" element={<CoursePlayer />} errorElement={<ErrorPage />} />
    </Route>
  </Route>
  </Route>
);

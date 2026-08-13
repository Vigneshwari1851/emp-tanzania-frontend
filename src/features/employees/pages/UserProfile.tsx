import { useState, useEffect, useCallback, useMemo } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Phone,
  Briefcase,
  DollarSign,
  FileText,
  User as UserIcon,
  Loader2,
  Calendar,
  GraduationCap,
  Award,
  Clock,
  Banknote,
  ShieldAlert,
  LogOut,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { getEmployee, type Employee } from '@/features/employees/services/employees';
import CompensationSection from '../components/CompensationSection';
import { ChangeRequestHub } from '@/features/change-requests/pages/ChangeRequestHub';
import type { CompensationSplit } from './AddEmployee';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from "sonner";
import { RoleGate } from '@/features/auth/components/RoleGate';
import { Permission } from '@/shared/types/rbac';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { useAuth } from '@/shared/context/AuthContext';
import { formatDisplayRole, toTitleCase, normalizeQualificationLabel } from '@/shared/utils/stringUtils';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { DocumentThumbnail } from '@/shared/components/common/DocumentThumbnail';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { getDepartmentManager } from '@/features/organization/services/departments';

interface FamilyMember {
  name?: string;
  relationship?: string;
  dateOfBirth?: string;
  phone?: string;
}

interface EducationRecord {
  level?: string;
  qualification?: string;
  degree?: string;
  board?: string;
  institution?: string;
  school?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  currentlyStudying?: boolean;
  grade?: string;
  passing_year?: string;
}

interface EmploymentRecord {
  position?: string;
  company?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  currentlyWorking?: boolean;
  currently_working?: boolean;
  responsibilities?: string;
  role?: string;
  reasonForLeaving?: string;
  reason_for_leaving?: string;
}

export function UserProfile() {
  const { user: authUser } = useAuth();
  const navigate = useOrgNavigate();
  const { id } = useParams();
  const location = useLocation();
  const targetId = id || authUser?.id;
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("personal");
  const [fetchedManager, setFetchedManager] = useState<string>("");

  useEffect(() => {
    const fetchManager = async () => {
      const deptId = employee?.details?.department_id;
      if (deptId) {
        try {
          const mgr = await getDepartmentManager(Number(deptId));
          if (mgr && mgr.name) {
            setFetchedManager(mgr.name);
          } else {
            setFetchedManager("Direct");
          }
        } catch (err) {
          console.error("Failed to fetch manager from backend", err);
          setFetchedManager("Direct");
        }
      } else {
        setFetchedManager("Direct");
      }
    };
    fetchManager();
  }, [employee?.details?.department_id]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  useEffect(() => {
    const handleToggle = () => {
      setSidebarCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
    };
    window.addEventListener("sidebar-toggle", handleToggle);
    return () => window.removeEventListener("sidebar-toggle", handleToggle);
  }, []);

  const isOwnProfile = targetId?.toString() === authUser?.id?.toString();

  const getRoleGlobal = () => {
    let rawRoleGlobal = Array.isArray(authUser?.role) ? (authUser?.role[0] || '') : (authUser?.role || '');
    if (typeof rawRoleGlobal === 'object' && rawRoleGlobal !== null) {
      rawRoleGlobal = rawRoleGlobal.name || rawRoleGlobal.code || rawRoleGlobal.id || '';
    }
    return rawRoleGlobal.toString().toUpperCase().replace(/[\s_]+/g, '');
  };
  const isEmployeeUser = getRoleGlobal() === 'EMPLOYEE' || getRoleGlobal() === 'USER';

  const sections = [
    { id: "personal", label: "Personal Info", description: "Basic details, contact & family", icon: UserIcon },
    { id: "job", label: "Job Details", description: "Role, location and department", icon: Briefcase },
    { id: "education", label: "Qualifications", description: "Academic qualifications", icon: GraduationCap },
    { id: "skills", label: "Certifications", description: "Skills and certificates", icon: Award },
    { id: "employment", label: "Experience", description: "Past work experience", icon: Clock },
    { id: "documents", label: "Documents", description: "Identity documentation", icon: FileText },
    { id: "compensation", label: "Payroll", description: "Salary and bank details", icon: Banknote },
    ...(isOwnProfile ? [
      { id: "exit", label: "Exit Options", description: "Offboarding and resignation", icon: LogOut },
      { id: "requests", label: "Profile Requests", description: "Track profile change requests", icon: ShieldAlert }
    ] : []),
  ];

  const currentStepIndex = sections.findIndex(s => s.id === activeSection);
  const activeSectionMeta = sections[currentStepIndex] ?? sections[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === sections.length - 1;

  const handlePrevious = () => {
    if (!isFirstStep) {
      setActiveSection(sections[currentStepIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setActiveSection(sections[currentStepIndex + 1].id);
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!targetId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await getEmployee(parseInt(targetId, 10));
      setEmployee(data);
    } catch (error) {
      console.error("Failed to fetch profile", error);
      toast.error("Failed to load profile details");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  }, [targetId, navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString.toString();
    }
  };

  const { isAdminOrAbove } = usePermissions();

  const [hasExitRequest, setHasExitRequest] = useState(false);
  const [isLoadingExitRequest, setIsLoadingExitRequest] = useState(false);

  useEffect(() => {
    const checkExitRequest = async () => {
      if (isOwnProfile) {
        try {
          setIsLoadingExitRequest(true);
          const response = await axiosInstance.get('/exit/all-requests');
          if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
            setHasExitRequest(true);
          } else {
            setHasExitRequest(false);
          }
        } catch (error) {
          console.error("Failed to check exit request status", error);
        } finally {
          setIsLoadingExitRequest(false);
        }
      }
    };
    checkExitRequest();
  }, [isOwnProfile]);

  interface RawCompensationItem {
    componentType?: string;
    name?: string;
    amount?: string | number;
    frequency?: string;
    type?: string;
  }

  const compensationSplits = useMemo<CompensationSplit[]>(() => {
    const rawBreakdown = employee?.details?.compensation_breakdown;
    if (!rawBreakdown) return [];
    let parsed: unknown = rawBreakdown;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return []; }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s: RawCompensationItem) => s?.componentType !== 'Outstanding Loan Recovery' && s?.componentType !== 'Salary Advance Recovery')
      .map((s: RawCompensationItem): CompensationSplit => ({
        componentType: s.componentType || s.name || 'Unknown',
        amount: s.amount != null ? String(s.amount) : '',
        frequency: s.frequency || 'Monthly',
        type: s.type === 'deduction' ? 'deduction' : (s.type === 'earning' ? 'earning' : undefined),
      }));
  }, [employee?.details?.compensation_breakdown]);

  const allUploadedDocuments = useMemo(() => {
    const det = employee?.details;
    if (!det) return [];

    const unifiedList: Array<{
      id: string;
      name: string;
      category: string;
      url: string;
      uploadedAt?: string;
    }> = [];

    if (det.pan_doc) {
      unifiedList.push({
        id: "pan-doc",
        name: "PAN Card Document",
        category: "Identity Proof",
        url: det.pan_doc,
        uploadedAt: "Uploaded",
      });
    }

    if (det.aadhaar_doc) {
      unifiedList.push({
        id: "aadhaar-doc",
        name: "Aadhaar Card Document",
        category: "Identity Proof",
        url: det.aadhaar_doc,
        uploadedAt: "Uploaded",
      });
    }

    if (det.resume) {
      unifiedList.push({
        id: "resume",
        name: "Resume / CV",
        category: "General Document",
        url: det.resume,
        uploadedAt: "Uploaded",
      });
    }

    if (det.dl_doc) {
      unifiedList.push({
        id: "driving-license-doc",
        name: "Driving License Copy",
        category: "Identity Proof",
        url: det.dl_doc,
        uploadedAt: "Uploaded",
      });
    }

    if (det.passport_doc) {
      unifiedList.push({
        id: "passport-doc",
        name: "Passport Copy",
        category: "Travel Document",
        url: det.passport_doc,
        uploadedAt: "Uploaded",
      });
    }

    if (Array.isArray(det.certificate_files)) {
      det.certificate_files.forEach((file: string, index: number) => {
        unifiedList.push({
          id: `cert-${index}`,
          name: `Certification ${index + 1}`,
          category: "Certification File",
          url: file,
          uploadedAt: "Uploaded",
        });
      });
    }

    if (Array.isArray(det.documents)) {
      det.documents.forEach((file: string, index: number) => {
        unifiedList.push({
          id: `doc-${index}`,
          name: `Document ${index + 1}`,
          category: "Official Document",
          url: file,
          uploadedAt: "Uploaded",
        });
      });
    }

    return unifiedList;
  }, [employee?.details]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
      <UserIcon className="w-12 h-12 mb-4 opacity-20" />
      <p>Profile information not found.</p>
    </div>
  );

  const details = employee.details;

  const viewFormData = {
    baseSalary: details?.base_salary || "",
    currency: details?.currency || "USD",
    payFrequency: details?.salary_frequency || "Monthly",
    payrollGroupId: details?.payroll_group_id != null ? String(details.payroll_group_id) : "",
  };

  const noop = () => {};

  return (
    <>
      <PageHeader
        title="My Profile"
        description="View and manage your personal information and employment details."
        icon={<UserIcon className="size-8" />}
      />
      <RoleGate
        permissions={[Permission.VIEW_OWN_PROFILE, Permission.VIEW_ALL_EMPLOYEES, Permission.VIEW_TEAM_EMPLOYEES]}
        requireAll={false}
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground bg-card rounded border border-dashed border-gray-300 dark:border-gray-600">
            <UserIcon className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-sm">You do not have permission to view this profile.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Go to Dashboard</Button>
          </div>
        }
      >
          <div className="bg-card rounded border border-border shadow-[0_1px_2px_rgba(16,17,26,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="space-y-6 p-6 sm:p-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {/* <div className="border-b border-border pb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Employee overview</p>

                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm text-[12px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                    View mode
                  </div>
                </div>
              </div> */}
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-muted rounded-full transition-colors h-10 w-10 shrink-0 flex items-center justify-center border border-transparent group"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-primary" />
                  </button>
                  <div className="flex items-center gap-3 min-w-0">
                    {details?.profile_picture ? (
                      <img
                        src={getProfilePictureUrl(details.profile_picture) || ""}
                        alt={`${details.first_name} ${details.last_name}`}
                        className="w-14 h-14 rounded-full object-cover shadow-sm border border-border "
                        onError={(_e) => {
                          (_e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${details.first_name}+${details.last_name}&background=6366f1&color=fff&size=128`;
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white font-medium text-lg shadow-sm capitalize">
                        {details?.first_name?.[0]}{details?.last_name?.[0]}
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      {/* Row 1: Name & Status Badge */}
                      <div className="flex items-center gap-3">
                        <h1 className="text-[20px] font-semibold leading-7 text-foreground truncate">
                          {toTitleCase(`${details?.first_name || ""} ${details?.middle_name || ""} ${details?.last_name || ""}`.trim())}
                        </h1>
                        {details?.sub_status && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                            {details.sub_status}
                          </span>
                        )}
                      </div>
                      {/* Row 2: Role & Department */}
                      <p className="text-sm text-muted-foreground truncate font-medium">
                        {formatDisplayRole(details?.job_role || details?.role?.role_name || "No Role Assigned")} • {details?.department?.department_name || "No Department"}
                      </p>
                      {/* Row 3: Joining Date & Reporting Manager */}
                      <p className="text-xs text-muted-foreground truncate font-medium">
                        Joined on {formatDate(details?.start_date || details?.joining_date || details?.joiningDate)} • Reports to {fetchedManager || "Direct / None"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  {(isAdminOrAbove || isOwnProfile) && (
                    <Button
                      size="sm"
                      className="h-9 px-4 text-primary border-primary/20 bg-primary hover:bg-primary hover:text-white transition-all duration-300 font-bold"
                      onClick={() => navigate(`/employee-management/edit-employee/${targetId}`, { state: { section: "personal", from: location.pathname } })}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-[14px] border border-border bg-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {/* <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Employee onboarding</p> */}
                    <h2 className="text-[18px] font-semibold text-foreground mt-1">{activeSectionMeta.label}</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">{activeSectionMeta.description}</p>
                  </div>

                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {sections.map((section) => {
                    const isActive = activeSection === section.id;
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition-all ${isActive ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary font-semibold" : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary dark:hover:bg-muted/60"}`}
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="w-full pt-4">
                {activeSection === "personal" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-8">
                    <div className="border-b border-border pb-3 flex items-center gap-2 mb-6">
                      <UserIcon className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Personal Information</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground  tracking-wider mb-1 capitalize">First Name</label>
                        <p className="text-sm font-semibold text-foreground py-1">{toTitleCase(details?.first_name) || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground  tracking-wider mb-1 capitalize">Middle Name</label>
                        <p className="text-sm font-semibold text-foreground py-1">{toTitleCase(details?.middle_name) || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground  tracking-wider mb-1 capitalize">Last Name</label>
                        <p className="text-sm font-semibold text-foreground py-1">{toTitleCase(details?.last_name) || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Date of Birth</label>
                        <p className="text-sm font-semibold text-foreground py-1">{formatDate(details?.date_of_birth)}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Gender</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.gender || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Nationality</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.nationality || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Marital Status</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.marital_status || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Blood Group</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.blood_group || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Account Status</label>
                        <div className="flex items-center gap-2 py-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${employee?.status ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span className="text-sm font-semibold text-foreground">
                            {employee?.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 mt-8 mb-6 border-b border-border pb-3 flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Primary Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                        <p className="text-sm font-semibold text-foreground py-1">{employee.email || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.phone || "—"}</p>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Street Address</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.address || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">City</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.city || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">State/Province</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.state || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ZIP/Postal Code</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.zip || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Country</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.country || "—"}</p>
                      </div>
                    </div>

                    <div className="pt-8 mt-8 mb-6 border-b border-border pb-3 flex items-center gap-3">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Secondary Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.secondary_email || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.secondary_phone || "—"}</p>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Street Address</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.secondary_address || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">City</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.secondary_city || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">State/Province</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.secondary_state || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ZIP/Postal Code</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.secondary_zip || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Country</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.secondary_country || "—"}</p>
                      </div>
                    </div>

                    <div className="pt-8 mt-8 mb-6 border-b border-border pb-3 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Emergency Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Contact Name</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.emergency_contact || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Relationship</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.emergency_relationship || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.emergency_phone || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.emergency_email || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-border pb-3 pt-8 mt-6">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Family Members</h3>
                      </div>
                    </div>
                    {(!details?.family_members || details.family_members.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded mt-4 bg-muted/30">
                        <p className="text-sm">No family members added</p>
                      </div>
                    ) : (
                      <div className="space-y-4 mt-4">
                        {(Array.isArray(details?.family_members) ? details.family_members : []).map((member: FamilyMember, index: number) => (
                          <div key={index} className="p-4 bg-muted/40 rounded border border-border">
                            <h4 className="text-[12px] font-semibold text-foreground mb-3">Family Member #{index + 1}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Full Name</label>
                                <p className="text-sm font-semibold text-foreground py-1">{member.name || "—"}</p>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Relationship</label>
                                <p className="text-sm font-semibold text-foreground py-1">{member.relationship || "—"}</p>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Date of Birth</label>
                                <p className="text-sm font-semibold text-foreground py-1">{formatDate(member.dateOfBirth)}</p>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                                <p className="text-sm font-semibold text-foreground py-1">{member.phone || "—"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "job" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="mb-6 border-b border-border flex items-center gap-3 pb-3">
                      <Briefcase className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Job Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Employee ID</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.employee_id || "USER-" + employee.id}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Work Location</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.work_location || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Employment Type</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.employment_type || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Start Date</label>
                        <p className="text-sm font-semibold text-foreground py-1">{formatDate(details?.start_date)}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Department</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.department?.department_name || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Reporting Manager</label>
                        <p className="text-sm font-semibold text-foreground py-1">
                          {fetchedManager || "Direct"}
                        </p>
                      </div>
                      {details?.designation?.secondary_parent && (
                        <div>
                          <label className="block text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Secondary Report To</label>
                          <p className="text-sm font-semibold text-primary py-1">{details.designation.secondary_parent.designation_name}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Work Schedule</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.work_schedule || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Probation Period (months)</label>
                        <p className="text-sm font-semibold text-foreground py-1">{details?.probation_period || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Role</label>
                        <p className="text-sm font-semibold text-foreground py-1">{formatDisplayRole(details?.job_role || details?.role?.role_name || "Staff")}</p>
                      </div>
                      {details?.team && (
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Team</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.team?.team_name || details?.team_name || "—"}</p>
                        </div>
                      )}
                      {details?.designation && (
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Designation</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.designation?.designation_name || details?.designation_name || "—"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === "education" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="mb-6 border-b border-border flex items-center gap-3 pb-3">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Educational History</h3>
                    </div>
                    {(!details?.education || details.education.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded mt-4 bg-muted/30">
                        <p className="text-sm">No educational records found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {(Array.isArray(details?.education) ? details.education : []).map((edu: EducationRecord, index: number) => (
                          <div key={index} className="p-5 rounded bg-card border border-border shadow-sm">
                            <div className="flex flex-col h-full pl-3 mt-1">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded bg-muted text-muted-foreground flex items-center justify-center">
                                  <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-[14px] font-semibold text-foreground leading-tight">{normalizeQualificationLabel(edu.level || edu.qualification) || `Education #${index + 1}`}</h4>
                                  <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">{normalizeQualificationLabel(edu.degree || edu.board) || "—"}</p>
                                </div>
                              </div>
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground font-medium w-14">School:</span>
                                  <span className="text-[12px] text-foreground font-semibold truncate">{edu.institution || edu.school || "—"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                                    {formatDate(edu.start_date || edu.startDate)} — {edu.currentlyStudying ? 'Present' : formatDate(edu.end_date || edu.endDate)}
                                  </span>
                                </div>
                                {(edu.grade || edu.passing_year) && (
                                  <div className="flex items-center gap-2">
                                    <Award className="w-3 h-3 text-amber-500" />
                                    <span className="text-[11px] text-muted-foreground font-medium w-14">Grade:</span>
                                    <span className="text-[12px] text-foreground font-bold">{edu.grade || edu.passing_year || "—"}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "skills" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="mb-6 border-b border-border pb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Skills & Certifications</h3>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Skills</label>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Array.isArray(details?.skills) && details.skills.length > 0 ? (
                            details.skills.map((skill: string, idx: number) => (
                              <span key={idx} className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-semibold">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm font-semibold text-foreground py-1">{details?.skills || "—"}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Certifications</label>
                        {Array.isArray(details?.certifications) && details.certifications.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 w-full">
                            {details.certifications.map((c: any, idx: number) => {
                              const cert = typeof c === 'object' && c ? {
                                name: c.name || c.certificateName || "",
                                issuingOrganization: c.issuingOrganization || c.issuing_organization || "",
                                issueDate: c.issueDate || c.issue_date || "",
                                credentialUrl: c.credentialUrl || c.credential_url || c.fileUrl || c.file_url || c.file || c.documentUrl || c.document_url || ((Array.isArray(details.certificate_files) && details.certificate_files[idx]) ? details.certificate_files[idx] : "")
                              } : {
                                name: String(c),
                                issuingOrganization: "",
                                issueDate: "",
                                credentialUrl: (Array.isArray(details.certificate_files) && details.certificate_files[idx]) ? details.certificate_files[idx] : ""
                              };

                              return (
                                <div key={idx} className="flex items-center justify-between gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4 shadow-2xs hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/60 transition-all">
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                      <Award className="h-5 w-5"/>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={cert.name}>
                                        {cert.name}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        {cert.issuingOrganization || "No Organization"} {cert.issueDate ? `• ${cert.issueDate}` : ""}
                                      </span>
                                    </div>
                                  </div>
                                  {cert.credentialUrl && (
                                    <button
                                      type="button"
                                      onClick={() => window.open(getProfilePictureUrl(cert.credentialUrl) || undefined, '_blank')}
                                      title="View Certificate"
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 transition-all"
                                    >
                                      <Eye className="h-4 w-4"/>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-foreground py-1">{details?.certifications || "—"}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Languages</label>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Array.isArray(details?.languages) && details.languages.length > 0 ? (
                            details.languages.map((lang: any, idx: number) => (
                              <span key={idx} className="px-2.5 py-1 bg-muted text-foreground border border-border rounded-md text-xs font-semibold">
                                {typeof lang === "object" && lang ? `${lang.language} (${lang.proficiency})` : String(lang)}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm font-semibold text-foreground py-1">{details?.languages || "—"}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "employment" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="mb-6 border-b border-border flex items-center gap-3 pb-3">
                      <Briefcase className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Employment History</h3>
                    </div>
                    {(!Array.isArray(details?.employment_history) || details.employment_history.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded mt-4 bg-muted/30">
                        <p className="text-sm">No employment history records found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {details.employment_history.map((emp: EmploymentRecord, index: number) => (
                          <div key={index} className="p-5 rounded bg-card border border-border shadow-sm">
                            <div className="flex flex-col h-full pl-3 mt-1">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-primary">
                                  <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-[14px] font-semibold text-foreground leading-tight">{emp.position || `Employment #${index + 1}`}</h4>
                                  <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">{emp.company || "—"}</p>
                                </div>
                              </div>
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-[12px] text-gray-600 dark:text-gray-400 font-medium">
                                    {formatDate(emp.startDate || emp.start_date)} — {emp.currentlyWorking || emp.currently_working ? 'Present' : formatDate(emp.endDate || emp.end_date)}
                                  </span>
                                </div>
                                {(emp.responsibilities || emp.role) && (
                                  <div className="text-[12px] leading-snug line-clamp-2">
                                    <span className="text-muted-foreground font-medium mr-1.5">Responsibilities:</span>
                                    <span className="text-foreground font-medium">{emp.responsibilities || emp.role || "—"}</span>
                                  </div>
                                )}
                                {(emp.reasonForLeaving || emp.reason_for_leaving) && (
                                  <div className="text-[12px] leading-snug line-clamp-2">
                                    <span className="text-muted-foreground font-medium mr-1.5">Reason for leaving:</span>
                                    <span className="text-foreground font-medium">{emp.reasonForLeaving || emp.reason_for_leaving || "—"}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "documents" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-8">
                    <div>
                      <div className="mb-6 border-b border-border pb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Uploaded Documents</h3>
                      </div>
                      {allUploadedDocuments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded mt-4 bg-muted/30">
                          <p className="text-sm">No uploaded documents found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {allUploadedDocuments.map((doc) => {
                            const ext = doc.url.split('.').pop()?.toUpperCase() || "FILE";
                            return (
                              <div key={doc.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 transition-all">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                                    <FileText className="h-5 w-5"/>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={doc.name}>
                                      {doc.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                      {doc.category} • {ext}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => window.open(getProfilePictureUrl(doc.url) || undefined, '_blank')}
                                    title="View Document"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary/20 dark:hover:text-primary transition-all"
                                  >
                                    <Eye className="h-4 w-4"/>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === "compensation" && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-8">
                    <CompensationSection
                      formData={viewFormData}
                      formErrors={{}}
                      setFormErrors={noop}
                      handleInputChange={noop}
                      isEmployee={isEmployeeUser}
                      id={employee.id.toString()}
                      compensationSplits={compensationSplits}
                      setCompensationSplits={noop}
                      payrollGroups={[]}
                      readOnly
                    />

                    <div>
                      <div className="mb-6 border-b border-border pb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Compensation Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Base Salary</label>
                          <p className="text-sm font-bold text-foreground py-1">{details?.base_salary ? `${details?.currency || "USD"} ${parseFloat(details.base_salary).toLocaleString()}` : "—"}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pay Frequency</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.salary_frequency || details?.payFrequency || "Monthly"}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-6 border-b border-border pb-3 flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Bank Account Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Bank Name</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.bank_name || details?.bankName || "—"}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Branch Name</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.branch_name || details?.branchName || "—"}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Account Holder Name</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.account_holder_name || details?.accountHolderName || "—"}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Account Number</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.account_number ? (details.account_number.length > 4 ? `**** ${details.account_number.slice(-4)}` : details.account_number) : "—"}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">IFSC Code</label>
                          <p className="text-sm font-semibold text-foreground py-1">{details?.ifsc_code || details?.ifscCode || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "exit" && isOwnProfile && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="mb-6 border-b border-border flex items-center gap-3 pb-3">
                      <LogOut className="w-5 h-5 text-red-600" />
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Exit & Offboarding Options</h3>
                    </div>
                    <div className="p-6 rounded-[10px] border border-red-105 bg-red-50/10">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2">
                        {hasExitRequest ? "Resignation Status" : "Initiate Exit Process"}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {hasExitRequest 
                          ? "You have already initiated the exit workflow. You can view the status of your resignation approvals, asset handovers, and clearance checklist."
                          : "If you wish to submit your resignation or start the offboarding process, you can access the exit workflow here. Please note that this action will notify your manager and the HR team to begin the clearance procedures."
                        }
                      </p>
                      {isLoadingExitRequest ? (
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          Checking exit status...
                        </div>
                      ) : hasExitRequest ? (
                        <Button
                          onClick={() => navigate("/employee-exit")}
                          className="bg-primary hover:bg-primary/70 text-white font-bold h-10 px-6 rounded shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          View Exit Status
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate("/employee-exit")}
                          className="bg-red-600 hover:bg-red-750 text-white font-bold h-10 px-6 rounded shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Initiate Exit Workflow
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === "requests" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <ChangeRequestHub />
                  </div>
                )}
              </div>

              {/* Form Actions (Navigation Parity) */}
              <div className="bg-muted/30 border-t border-border px-6 py-5 sm:px-8 flex items-center justify-between rounded-b-[14px] mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (location.state?.from) {
                        navigate(location.state.from);
                      } else {
                        navigate("/employee-management");
                      }
                    }}
                    className="text-sm font-bold h-10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-700 dark:hover:text-rose-300 transition-all duration-300 gap-2 px-4 shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to List
                  </Button>

                  {!isFirstStep && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      className="gap-2 px-6 h-10 border-border hover:bg-card hover:border-primary/20 hover:text-primary transition-all font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Previous Step
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {!isLastStep ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="gap-2 min-w-[140px] h-10 bg-primary hover:bg-primary/70 shadow-sm font-semibold transition-all text-white flex items-center justify-center"
                    >
                      Next
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Button>
                  ) : (
                     (isAdminOrAbove || isOwnProfile) && (
                      <Button
                        type="button"
                        onClick={() => navigate(`/employee-management/edit-employee/${targetId}`, { state: { section: activeSection, from: location.pathname } })}
                        className="gap-2 min-w-[160px] h-10 bg-primary hover:bg-primary/70 shadow-sm font-bold transition-all text-white flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Details
                      </Button>
                    )
                  )}
                </div>
              </div>

            </div>
          </div>

    </RoleGate>
    </>
  );
}

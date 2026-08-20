import { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronDown, X, Sun, Moon } from "lucide-react";
import { NotificationDropdown } from "@/features/notifications/components/NotificationDropdown";
import { Button } from "@/shared/components/ui/button";
import { ModernDatePicker } from "@/shared/components/ui/ModernDatePicker";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useTheme } from '@/shared/context/ThemeContext';
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { formatDisplayRole } from '@/shared/utils/stringUtils';
import { toast } from 'sonner';
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { LanguageSelector } from "./LanguageSelector";
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { useTranslate } from '@tolgee/react';


interface FamilyMember {
  name: string;
  relationship: string;
  dateOfBirth: string;
  phone: string;
}

interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade: string;
}

interface Employment {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
  reasonForLeaving: string;
}

interface CompensationSplit {
  componentType: string;
  amount: string;
  frequency: string;
}

export function TopNav({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const { t } = useTranslate();
  const { user, logout } = useAuth();

  const navigate = useOrgNavigate();
  const { unreadCount } = useNotifications();

  let rawRoleGlobal = Array.isArray(user?.role) ? (user?.role[0] || '') : (user?.role || '');
  if (typeof rawRoleGlobal === 'object' && rawRoleGlobal !== null) {
    rawRoleGlobal = rawRoleGlobal.name || rawRoleGlobal.code || rawRoleGlobal.id || '';
  }
  const normalizedRoleGlobal = rawRoleGlobal.toString().toUpperCase().replace(/[\s_]+/g, '');
  const isEmployeeUser = normalizedRoleGlobal === 'EMPLOYEE' || normalizedRoleGlobal === 'USER';

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCancelEditConfirm, setShowCancelEditConfirm] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");

  const { theme, setTheme } = useTheme();

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setShowProfile(false);
    logout();
    navigate("/login");
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const getPath = (path: string) => {
    // Commented out to avoid orgSlug prefixing for now:
    /*
    if (user?.orgSlug && user.orgSlug !== 'undefined' && user.orgSlug !== 'null') {
      return `/${user.orgSlug}${path === '/' ? '' : path}`;
    }
    */
    return path;
  };

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }

    if (showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfile]);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    maritalStatus: "",
    bloodGroup: "",

    // Primary Contact
    primaryEmail: "",
    primaryPhone: "",
    primaryAddress: "",
    primaryCity: "",
    primaryState: "",
    primaryZip: "",
    primaryCountry: "",

    // Secondary Contact
    secondaryEmail: "",
    secondaryPhone: "",
    secondaryAddress: "",
    secondaryCity: "",
    secondaryState: "",
    secondaryZip: "",
    secondaryCountry: "",

    // Emergency Contact
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContactEmail: "",

    // Job Details
    department: "",
    role: "",
    location: "",
    startDate: "",
    employeeType: "Full-time",
    employeeId: "",
    workSchedule: "",
    manager: "",
    probationPeriod: "",

    // Compensation
    baseSalary: "",
    currency: "USD",
    payFrequency: "Monthly",

    // Documents
    passportNumber: "",
    passportExpiry: "",
    drivingLicense: "",
    licenseExpiry: "",
    socialSecurityNumber: "",
    taxId: "",

    // Bank Details
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountHolderName: "",

    // Skills & Qualifications
    skills: "",
    certifications: "",
    languages: "",
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [educationHistory, setEducationHistory] = useState<Education[]>([]);
  const [employmentHistory, setEmploymentHistory] = useState<Employment[]>([]);
  const [compensationSplits, setCompensationSplits] = useState<CompensationSplit[]>([
    { componentType: "Base Salary", amount: "", frequency: "Monthly" }
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    // Apply capitalization for text-based inputs, excluding email and specific fields
    let processedValue = value;
    if (type === 'text' || e.target.tagName === 'TEXTAREA') {
      const skipCapitalization = ['primaryEmail', 'secondaryEmail', 'emergencyContactEmail', 'employeeId', 'passportNumber', 'socialSecurityNumber', 'taxId', 'accountNumber', 'routingNumber'];
      if (!skipCapitalization.includes(name)) {
        processedValue = capitalizeFirstLetter(value);
      }
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  // helper functions removed for brevity

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const completeData = {
      ...formData,
      familyMembers,
      educationHistory,
      employmentHistory,
      compensationSplits
    };
    console.log("Complete Employee Data:", completeData);

    // Reset form
    setFormData({
      firstName: "", lastName: "", middleName: "", dateOfBirth: "", gender: "", nationality: "",
      maritalStatus: "", bloodGroup: "", primaryEmail: "", primaryPhone: "", primaryAddress: "",
      primaryCity: "", primaryState: "", primaryZip: "", primaryCountry: "", secondaryEmail: "",
      secondaryPhone: "", secondaryAddress: "", secondaryCity: "", secondaryState: "", secondaryZip: "",
      secondaryCountry: "", emergencyContactName: "", emergencyContactRelationship: "",
      emergencyContactPhone: "", emergencyContactEmail: "", department: "", role: "", location: "",
      startDate: "", employeeType: "Full-time", employeeId: "", workSchedule: "", manager: "",
      probationPeriod: "", baseSalary: "", currency: "USD", payFrequency: "Monthly",
      passportNumber: "", passportExpiry: "", drivingLicense: "", licenseExpiry: "",
      socialSecurityNumber: "", taxId: "", bankName: "", accountNumber: "", routingNumber: "",
      accountHolderName: "", skills: "", certifications: "", languages: ""
    });
    setFamilyMembers([]);
    setEducationHistory([]);
    setEmploymentHistory([]);
    setCompensationSplits([{ componentType: "Base Salary", amount: "", frequency: "Monthly" }]);
    setShowAddEmployee(false);
    setActiveSection("personal");
  };

  const sections = [
    { id: "personal", label: "Personal Info" },
    { id: "contact", label: "Contact Details" },
    { id: "emergency", label: "Emergency Contact" },
    { id: "job", label: "Job Details" },
    { id: "compensation", label: "Compensation" },
    { id: "family", label: "Family Members" },
    { id: "education", label: "Education" },
    { id: "employment", label: "Employment History" },
    { id: "documents", label: "Documents" },
    { id: "bank", label: "Bank Details" },
    { id: "skills", label: "Skills & Certifications" },
  ];

  return (
    <header className="h-16 w-full bg-card border-b border-border flex items-center justify-between px-3 sm:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 hover:bg-muted rounded-sm transition-colors mr-2 flex-shrink-0"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* <div className="flex-1 max-w-xl hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('search_placeholder', 'Search, teams, departments...')}
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-card text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div> */}

      <div className="flex items-center gap-4 ml-auto">
        {/* Language Selector & Theme Toggle Hidden for now */}
        {/* <LanguageSelector /> */}

        {/* <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 hover:bg-muted rounded-sm transition-transform duration-300 hover:scale-110 active:scale-95 text-muted-foreground hover:text-foreground relative w-10 h-10 flex items-center justify-center overflow-hidden"
          aria-label="Toggle Theme"
        >
          <Sun className="w-[22px] h-[22px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 absolute" />
          <Moon className="w-[22px] h-[22px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 absolute" />
        </button> */}

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 hover:bg-muted rounded-sm transition-all relative group ${showNotifications ? "bg-muted ring-2 ring-muted" : ""
              }`}
          >
            <Bell className={`w-[22px] h-[22px] transition-colors ${showNotifications ? "text-foreground fill-foreground/5" : "text-muted-foreground group-hover:text-foreground"}`} />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-[7px] h-[7px] bg-[#F97316] ring-2 ring-card rounded-full"></span>}
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className={`flex items-center gap-2 p-2 hover:bg-muted rounded-sm transition-colors ${showProfile ? 'bg-muted' : ''}`}
          >
            {user?.profile_picture ? (
              <img
                src={getProfilePictureUrl(user.profile_picture) || ""}
                alt={user?.name || "User"}
                className="w-8 h-8 rounded-full object-cover border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=2563eb&color=fff&size=64`;
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                {(() => {
                  const parts = (user?.name || 'User').trim().split(/\s+/);
                  const f = parts[0]?.charAt(0) || '';
                  const l = (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '').toUpperCase();
                  return (f.charAt(0).toUpperCase() + l) || 'U';
                })()}
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-foreground">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-muted-foreground">{formatDisplayRole(user?.role) || 'Super Admin'}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
          </button>
          <div className={`absolute left-0 right-0 mt-2 bg-card rounded-sm shadow-sm border border-border p-2 z-50 transition-all duration-200 origin-top-right ${showProfile ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <button
              onClick={() => {
                navigate(getPath("/profile"));
                setShowProfile(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-muted hover:text-primary rounded-sm text-sm transition-all text-foreground"
            >
              Profile
            </button>
            <hr className="my-2 border-border" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 hover:bg-red-500/10 rounded-sm text-sm text-red-600 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-sm shadow-sm w-full max-w-6xl max-h-[95vh] flex flex-col border border-border">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Add New Employee</h2>
                <p className="text-sm text-muted-foreground mt-1">Complete comprehensive employee onboarding</p>
              </div>
              <button
                onClick={() => setShowCancelEditConfirm(true)}
                className="p-2 hover:bg-muted rounded-sm transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-56 bg-muted/30 border-r border-border p-4 overflow-y-auto">
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-sm text-sm font-medium transition-colors ${activeSection === section.id
                        ? "bg-primary text-white"
                        : "text-foreground hover:bg-muted"
                        }`}
                    >
                      {section.label}
                    </button>
                  ))}
                </nav>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6">
                  {activeSection === "personal" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">First Name *</label>
                          <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Last Name *</label>
                          <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Date of Birth *</label>
                          <ModernDatePicker
                            value={formData.dateOfBirth}
                            onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date }))}
                            placeholder="Select Date of Birth"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* ... other sections if needed ... */}
                </div>

                <div className="flex gap-3 p-6 border-t border-border bg-muted/20">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCancelEditConfirm(true)}>Cancel</Button>
                  <Button type="submit" className="flex-1">Add Employee</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out of your current session?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        confirmColor="red"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmDialog
        open={showCancelEditConfirm}
        title="Discard Unsaved Changes?"
        message="Are you sure you want to cancel? Any information entered in this form will be lost."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelEditConfirm(false);
          setShowAddEmployee(false);
        }}
        onCancel={() => setShowCancelEditConfirm(false)}
      />
    </header>
  );
}

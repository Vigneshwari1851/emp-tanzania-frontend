import { useState, useEffect, useMemo, useRef } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { capitalizeFirstLetter, toTitleCase, normalizeQualificationLabel } from '@/shared/utils/stringUtils';
import { ArrowLeft, Trash2, PlusCircle, Loader2, Check, Upload, User as UserIcon, Briefcase, GraduationCap, Award, Clock, FileText, Banknote, ShieldAlert, Phone, AlertCircle, Edit, Calendar, Eye, X } from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { getDepartments, getDepartmentManager } from '@/features/organization/services/departments';
import { getDesignations } from '@/features/organization/services/designations';
import { createEmployee, getEmployee, updateEmployee, generateEmployeeId, checkDuplicate } from '@/features/employees/services/employees';
import { submitChangeRequest } from '@/features/change-requests/services/changeRequests';
import { getRoles } from '@/features/rbac/services/roles';
import type { Role } from '@/features/rbac/services/roles';
import { getTeamsByDepartment } from '@/features/organization/services/teams';
import { getOrganizations, getOrganizationShifts } from '@/features/organization/services/organizations';
import { toast } from "sonner";
import { RoleGate } from '@/features/auth/components/RoleGate';
import { UserRole, Permission } from '@/shared/types/rbac';
import { useAuth } from '@/shared/context/AuthContext';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import type { Bank } from '@/features/employees/services/banks';
import { getBanks } from '@/features/employees/services/banks';

import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import { useBlocker, useLocation } from "react-router-dom";
import { Switch } from "@/shared/components/ui/switch";
import { ModernDatePicker } from "@/shared/components/ui/ModernDatePicker";
import Combobox from "@/shared/components/ui/Combobox";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import Select from "@/shared/components/ui/Select";
import FileUpload from "@/shared/components/ui/FileUpload";
import SearchableSelect from "@/shared/components/ui/SearchableSelect";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Andaman and Nicobar Islands", 
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", 
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", 
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", 
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", 
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const stateCities: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Anantapur", "Kadapa", "Kakinada"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Jagdalpur", "Ambikapur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Morbi", "Anand", "Vapi"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Nahan", "Baddi"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh", "Giridih"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Davangere", "Ballari", "Shivamogga", "Tumakuru"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Alappuzha", "Palakkad", "Kannur", "Kottayam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Navi Mumbai", "Amravati", "Kolhapur", "Kalyan-Dombivli"],
  "Manipur": ["Imphal", "Thoubal", "Kakching"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Dimapur", "Kohima", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Bikaner", "Ajmer", "Bhilwara", "Alwar", "Sikar"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Nagercoil"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahabubnagar"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Allahabad", "Bareilly", "Aligarh", "Moradabad"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Rudrapur", "Kashipur"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Asansol", "Durgapur", "Bardhaman", "Kharagpur", "Darjeeling"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Dwarka"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Ladakh": ["Leh", "Kargil"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"]
};



export interface DocumentFormData {
  resumeDoc: File | string | null;
  passportIssueDate: string;
  passportExpiryDate: string;
  drivingLicenseExpiryDate: string;
  panDoc: File | string | null;
  panNumber: string;
  passportDoc: File | string | null;
  drivingLicenseDoc: File | string | null;
  aadhaarDoc: File | string | null;
  country?: string;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const getMissingDocumentFields = (data: Partial<DocumentFormData>): string[] => {
  const missing: string[] = [];

  // Resume / CV
  if (!data.resumeDoc) missing.push("Resume / CV");

  // PAN Details
  if (!data.panDoc) missing.push("PAN Card Document");

  // Aadhaar Document
  if (data.country?.toLowerCase() === 'india' && !data.aadhaarDoc) {
    missing.push("Aadhaar Card Document");
  }

  return missing;
};

interface FamilyMember {
  name: string;
  relationship: string;
  dateOfBirth: string;
  phone: string;
}

export interface Education {
  level: string;
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  board?: string;
  startDate: string;
  endDate: string;
  currentlyStudying?: boolean;
  grade?: string;
  file?: File;
  fileUrl?: string; // For existing records
  documentUrl?: string; // Alias for existing records
  certificateUrl?: string; // Alias for existing records
}

import EducationSection from '../components/EducationSection';

export interface Employment {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  currentlyWorking?: boolean;
  isCurrentlyWorking?: boolean;
  isCurrentJob?: boolean;
  responsibilities: string;
  reasonForLeaving: string;
  file?: File;
  fileUrl?: string; // For existing records
  documentUrl?: string; // Alias for existing records
  certificateUrl?: string; // Alias for existing records
}

import EmploymentSection from '../components/EmploymentSection';

export interface CompensationSplit {
  componentType: string;
  amount: string;
  frequency: string;
  type?: 'earning' | 'deduction';
}
import CompensationSection from '../components/CompensationSection';
import DocumentSection from '../components/DocumentSection';

const flattenDesignations = (nodes: any[], depth = 0): { id: number; name: string; code: string; depth: number; department_id?: number | null }[] => {
  let list: any[] = [];
  if (!nodes || !Array.isArray(nodes)) return list;
  nodes.forEach(node => {
    list.push({
      id: node.id,
      name: node.designation_name,
      code: node.designation_code,
      depth,
      department_id: node.department_id
    });
    if (node.sub_designations && node.sub_designations.length > 0) {
      list = [...list, ...flattenDesignations(node.sub_designations, depth + 1)];
    }
  });
  return list;
};

export function AddEmployee({ drawerId, onClose, defaultSection = "personal" }: { drawerId?: string, onClose?: () => void, defaultSection?: string }) {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const { id: paramId } = useParams();
  const id = drawerId || paramId;
  const [createdEmployeeId, setCreatedEmployeeId] = useState<number | null>(null);
  const activeEmployeeId = id ? Number(id) : createdEmployeeId;
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const isEmployee = user?.role === UserRole.EMPLOYEE || (typeof user?.role === 'string' && user.role.toLowerCase() === 'employee');
  const isEdit = !!activeEmployeeId;
  const isSelfEdit = isEdit && !!user?.id && user.id.toString() === id?.toString() && !isSuperAdmin;
  const { can } = usePermissions();
  const canManagePayroll = can(Permission.MANAGE_PAYROLL);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const isFieldRestricted = !isSuperAdmin && isEdit && !isDraft && user?.id?.toString() !== id;
  const shouldRestrictFields = !isSuperAdmin && user?.id?.toString() === id;
  const isHR = user?.role === UserRole.HR;
  const isFinance = user?.role === UserRole.FINANCE;
  const canEditPersonal = isSuperAdmin || isHR;
  const canEditJob = isSuperAdmin || isHR;
  const canEditBank = isSuperAdmin || isFinance;
  const canEditPayroll = isSuperAdmin || isFinance;
  const lockJobAndPayroll = isFieldRestricted || shouldRestrictFields;
  const [activeSection, setActiveSection] = useState(() => location.state?.section || defaultSection);
  const [highestStepVisitedIndex, setHighestStepVisitedIndex] = useState(() => {
    const sectionIds = ["personal", "job", "education", "skills", "employment", "documents", "compensation"];
    const initialIndex = sectionIds.indexOf(location.state?.section || defaultSection);
    return initialIndex >= 0 ? initialIndex : 0;
  });

  useEffect(() => {
    const sectionIds = ["personal", "job", "education", "skills", "employment", "documents", "compensation"];
    const currentIndex = sectionIds.indexOf(activeSection);
    if (currentIndex > highestStepVisitedIndex) {
      setHighestStepVisitedIndex(currentIndex);
    }
  }, [activeSection, highestStepVisitedIndex]);

  const [showWarningBanner, setShowWarningBanner] = useState(false);

  useEffect(() => {
    setShowWarningBanner(false);
  }, [activeSection]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    maritalStatus: "",
    bloodGroup: "",
    primaryEmail: "",
    primaryPhone: "",
    secondaryEmail: "",
    secondaryPhone: "",
    primaryAddress: "",
    primaryCity: "",
    primaryState: "",
    primaryZip: "",
    primaryCountry: "",
    secondaryAddress: "",
    secondaryCity: "",
    secondaryState: "",
    secondaryZip: "",
    secondaryCountry: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContactEmail: "",
    employeeId: "",
    department: "",
    teamId: "",
    role: "", // Role ID
    employeeType: "Full-Time",
    contractStartDate: "",
    contractEndDate: "",
    subStatus: "",
    startDate: "",
    location: "",
    remoteLocation: "",
    branchId: "",
    workSchedule: "Flexible",
    selectedShiftId: "",
    manager: "",
    probationPeriod: "",
    baseSalary: "",
    currency: "",
    payFrequency: "Monthly",
    passportNumber: "",
    passportIssuedDate: "",
    passportExpiry: "",
    drivingLicense: "",
    licenseExpiry: "",
    panNumber: "",
    aadhaarNumber: "",
    certificateCourseName: "",
    certificateIssuedBy: "",

    bankName: "",
    branchName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",

    skills: "",
    certifications: [] as any[],
    languages: [] as { language: string; proficiency: string }[],
    status: true,
    payrollGroupId: "",
    outstandingLoan: "",
    outstandingAdvance: "",
    designationId: ""
  });

  const [isAddingLanguage, setIsAddingLanguage] = useState(false);
  const [selectedNewLanguage, setSelectedNewLanguage] = useState("");
  const [selectedNewProficiency, setSelectedNewProficiency] = useState("Beginner");
  const [editingLanguageIndex, setEditingLanguageIndex] = useState<number | null>(null);

  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [selectedNewSkill, setSelectedNewSkill] = useState("");
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);

  const [isAddingCert, setIsAddingCert] = useState(false);
  const [editingCertIndex, setEditingCertIndex] = useState<number | null>(null);
  const [pendingCertRecord, setPendingCertRecord] = useState({
    name: "",
    issuingOrganization: "",
    issueDate: "",
    expiryDate: "",
    credentialId: "",
    credentialUrl: "",
    file: null,
    fileUrl: ""
  });
  const [activeCertPreview, setActiveCertPreview] = useState<{ url: string; name: string } | null>(null);

  console.log("sdafas", formData);

  const maxDate18 = useMemo(() => {
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return eighteenYearsAgo.toISOString().split('T')[0];
  }, []);

  const [profilePhoto, setProfilePhoto] = useState<File | string | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // Identity Documents
  const [passportFile, setPassportFile] = useState<File | string | null>(null);
  const [panFile, setPanFile] = useState<File | string | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | string | null>(null);
  const [dlFile, setDlFile] = useState<File | string | null>(null);

  // Additional Documents
  const [resumeFile, setResumeFile] = useState<File | string | null>(null);
  const [certificateFiles, setCertificateFiles] = useState<(File | string)[]>([]);
  const [otherDocuments, setOtherDocuments] = useState<(File | string)[]>([]);

  const [banksList, setBanksList] = useState<Bank[]>([]);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [educationHistory, setEducationHistory] = useState<Education[]>([]);
  const [employmentHistory, setEmploymentHistory] = useState<Employment[]>([]);
  const [compensationSplits, setCompensationSplits] = useState<CompensationSplit[]>([
    { componentType: "Basic Pay", amount: "", frequency: "Monthly" },
    { componentType: "House Rent Allowance (HRA)", amount: "", frequency: "Monthly" },
    { componentType: "Special Allowance", amount: "", frequency: "Monthly" }
  ]);
  const [payrollGroups, setPayrollGroups] = useState<any[]>([]);

  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [designationsList, setDesignationsList] = useState<any[]>([]);
  const [showCancelAddEmployeeConfirm, setShowCancelAddEmployeeConfirm] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [organizationShifts, setOrganizationShifts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string>>({});
  const [duplicateFlags, setDuplicateFlags] = useState<{ email?: boolean; phone?: boolean }>({});
  const [sameAsPrimary, setSameAsPrimary] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    departments: false,
    roles: false,
    managers: false,
    locations: false,
    employee: false,
    banks: false,
    teams: false,
    designations: false
  });
  const [originalData, setOriginalData] = useState<any>(null);
  const [isFormReady, setIsFormReady] = useState(false);
  const [locationsList, setLocationsList] = useState<{ id: number | string, name: string }[]>([]);

  // Dirty state detection logic
  const isFormDirty = useMemo(() => {
    if (!originalData) return false;

    // Helper to compare minimal properties for history records
    const compareRecords = (current: any[], original: any[]) => {
      if (current.length !== original.length) return true;
      return JSON.stringify(current) !== JSON.stringify(original);
    };

    const isShallowEqual = (obj1: any, obj2: any) => {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      if (keys1.length !== keys2.length) return false;
      for (const key of keys1) {
        if (obj1[key] !== obj2[key]) return false;
      }
      return true;
    };

    const hasFormChanged = !isShallowEqual(formData, originalData.formData);
    const hasEduChanged = compareRecords(educationHistory, originalData.education);
    const hasEmpChanged = compareRecords(employmentHistory, originalData.employment);
    const hasFamilyChanged = compareRecords(familyMembers, originalData.family);
    const hasCompChanged = compareRecords(compensationSplits, originalData.compensation);

    // Document change checks
    const hasFilesChanged =
      profilePhoto instanceof File ||
      passportFile instanceof File ||
      panFile instanceof File ||
      aadhaarFile instanceof File ||
      dlFile instanceof File ||
      resumeFile instanceof File ||
      certificateFiles.some(f => f instanceof File) ||
      otherDocuments.some(f => f instanceof File);

    return hasFormChanged || hasEduChanged || hasEmpChanged || hasFamilyChanged || hasCompChanged || hasFilesChanged;
  }, [formData, educationHistory, employmentHistory, familyMembers, compensationSplits, originalData, profilePhoto, passportFile, panFile, aadhaarFile, dlFile, resumeFile, certificateFiles, otherDocuments]);

  // Initial state capture for both NEW and EDIT record mode
  useEffect(() => {
    if (isFormReady && !originalData) {
      setOriginalData({
        formData: { ...formData },
        family: [...familyMembers],
        education: [...educationHistory],
        employment: [...employmentHistory],
        compensation: [...compensationSplits]
      });
    }
  }, [isFormReady, originalData, formData, familyMembers, educationHistory, employmentHistory, compensationSplits]);

  // Handle browser back/refresh/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = ""; // Standard requirement for showing prompt
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty, isSubmitting]);

  // Handle internal navigation blocking (React Router)
  const blocker = useBlocker(
    ({ nextLocation }) =>
      isFormDirty && !isSubmitting && !isSavingDraft && nextLocation.pathname !== location.pathname
  );


  const totalCompensationBreakdown = useMemo(() => {
    return compensationSplits.reduce((sum, split) => {
      const amount = parseFloat(split.amount) || 0;
      return sum + amount;
    }, 0);
  }, [compensationSplits]);

  const isCompensationMismatch = useMemo(() => {
    if (activeSection !== "compensation") return false;
    const base = parseFloat(formData.baseSalary) || 0;
    if (base === 0 && totalCompensationBreakdown === 0) return false;
    return base !== totalCompensationBreakdown;
  }, [activeSection, formData.baseSalary, totalCompensationBreakdown]);

  const isStepValid = useMemo(() => {
    switch (activeSection) {
      case "job":
        return !!(formData.department && formData.teamId && formData.employeeType && formData.startDate && (formData.location || formData.branchId) && formData.role && formData.designationId);
      case "personal":
        const isBasicValid = !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender);
        const isContactValid = !!(formData.primaryEmail && formData.primaryPhone && formData.primaryAddress && formData.primaryCity && formData.primaryState && formData.primaryZip && formData.primaryCountry) && !duplicateFlags.email && !duplicateFlags.phone;
        const isEmergencyValid = !!(formData.emergencyContactName && formData.emergencyContactRelationship && formData.emergencyContactPhone);
        return isBasicValid && isContactValid && isEmergencyValid;
      case "compensation":
        const isCompValid = !!(formData.baseSalary && compensationSplits.length > 0);
        const isBankValid = !!(formData.bankName && formData.branchName && formData.accountHolderName && formData.accountNumber && formData.ifscCode);
        return isCompValid && isBankValid;
      case "family":
        // Family is optional, but if any entry is present, it should be valid
        return familyMembers.every(m => !!(m.name && m.relationship && m.phone && m.dateOfBirth));
      case "education":
        // Required minimum 3 education entries (10th, 12th/Diploma, and 1st Degree)
        if (educationHistory.length < 3) return false;
        return educationHistory.every(edu => {
          const isHigherEd = ["Diploma", "Undergraduate (UG)", "Postgraduate (PG)", "Doctorate (PhD)", "UG", "PG", "PhD"].includes(edu.level);
          const basicValid = !!(edu.level && edu.institution && edu.startDate && (edu.currentlyStudying || edu.endDate));
          if (isHigherEd) {
            return basicValid && !!(edu.degree && edu.fieldOfStudy);
          }
          return basicValid;
        });
      case "employment":
        // Optional history, but if present must be valid
        return employmentHistory.every(emp => !!(emp.company && emp.position && emp.startDate && (emp.currentlyWorking || (emp.endDate && emp.reasonForLeaving)) && (emp.file || emp.fileUrl)));
      case "documents": {
        const isIndia = formData?.primaryCountry === 'India';
        const hasPassport = !!(formData.passportNumber && formData.passportExpiry && passportFile);
        const hasLicense = !!(formData.drivingLicense && formData.licenseExpiry && dlFile);
        const hasTaxId = !!(formData.panNumber && panFile);
        const hasAadhaar = isIndia ? !!(formData.aadhaarNumber && aadhaarFile) : true;
        const hasResume = !!resumeFile;
        return hasPassport && hasLicense && hasTaxId && hasAadhaar && hasResume;
      }
      default:
        return true;
    }
  }, [activeSection, formData, compensationSplits, isCompensationMismatch, familyMembers, educationHistory, employmentHistory, passportFile, panFile, aadhaarFile, dlFile, resumeFile, certificateFiles, otherDocuments, id, duplicateFlags]);


  // --- Initial Data Fetching ---

  /**
   * Fetches static data required for dropdowns (Departments, Roles, Locations)
   */
  const fetchStaticData = async () => {
    setLoadingStates(prev => ({ ...prev, departments: true, roles: true, locations: true, designations: true }));

    let roles: Role[] = [];
    let locations: { id: number | string, name: string }[] = [{ id: 'remote', name: 'Remote' }];

    // Core dropdown data — best effort, failures are logged but must not block the employee record from loading
    try {
      const depts = await getDepartments();
      setDepartmentsList(depts || []);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    }

    try {
      roles = await getRoles();
      setRolesList(roles || []);
    } catch (error) {
      console.error("Failed to fetch roles", error);
    }

    try {
      const designations = await getDesignations();
      setDesignationsList(flattenDesignations(designations || []));
    } catch (error) {
      console.error("Failed to fetch designations", error);
    }

    // Optional data — permission-restricted endpoints (e.g. payroll groups for non-admins)
    // must not block the employee form from loading.
    // Only fetch payroll groups when the user can actually edit payroll (Finance/SuperAdmin)
    // or when creating a new record. Employees editing their own profile don't need them —
    // their compensation section is read-only, so skip the call to avoid a 403.
    const needsPayrollGroups = canEditPayroll || !isEdit;
    if (needsPayrollGroups) {
      try {
        const { getPayrollGroups } = await import('@/features/payroll/services/payroll');
        const pGroups = await getPayrollGroups();
        setPayrollGroups(pGroups || []);
      } catch (error) {
        // 403 is expected for roles without payroll access (e.g. employees) — suppress noisy logging
        if ((error as any)?.response?.status !== 403) {
          console.error("Failed to fetch payroll groups", error);
        }
      }
    }

    try {
      const banks = await getBanks();
      setBanksList(banks || []);
    } catch (error) {
      console.error("Failed to fetch banks", error);
    }

    // Normalize locations from organizations
    try {
      const { getOrganizations } = await import('@/features/organization/services/organizations');
      const orgs = await getOrganizations();
      const normalizedOrgs = Array.isArray(orgs) ? orgs : (orgs ? [orgs] : []);

      const activeOrg = normalizedOrgs[0];
      if (activeOrg && !id) {
        const orgCountry = activeOrg.country || "";
        const rawCurrency = activeOrg.currency || "";
        const orgCurrency = rawCurrency.match(/^[A-Z]{3}/i)?.[0]?.toUpperCase() || rawCurrency.toUpperCase() || "USD";
        setFormData(prev => ({
          ...prev,
          primaryCountry: prev.primaryCountry || orgCountry,
          secondaryCountry: prev.secondaryCountry || orgCountry,
          currency: prev.currency || orgCurrency
        }));
      }

      normalizedOrgs.forEach((org: any) => {
        const branches = org.branches || org.branch || [];
        if (Array.isArray(branches)) {
          branches.forEach((b: any) => {
            const name = b.branch_name || b.location_name;
            const city = b.city || "";
            if (name) {
              const displayName = city ? `${name} (${city})` : name;
              locations.push({ id: b.id, name: displayName });
            }
          });
        }
      });
      setLocationsList(locations);
    } catch (error) {
      console.error("Failed to fetch organizations", error);
    }

    // Handle Employee ID generation for NEW mode
    if (!id) {
      try {
        const generatedId = await generateEmployeeId();
        setFormData(prev => ({ ...prev, employeeId: generatedId }));
      } catch (err) {
        console.error("Employee ID generation failed", err);
      }
    }

    setLoadingStates(prev => ({ ...prev, departments: false, roles: false, locations: false, designations: false }));

    return { roles, locations };
  };

  /**
   * Fetches specific employee data for EDIT mode
   */
  const fetchEmployeeData = async (currentRoles: Role[], currentLocations: any[]) => {
    if (!id) return;

    setLoadingStates(prev => ({ ...prev, employee: true }));
    setIsSubmitting(true);

    try {
      const emp = await getEmployee(parseInt(id, 10));
      const details: any = emp.details || {};
      setIsDraft(details.is_draft ?? false);

      const matchedRole = currentRoles.find((r: any) => r.name === details.job_role);
      const matchedLoc = currentLocations.find((l: any) =>
        l.name === details.work_location ||
        l.name?.split(' (')[0] === details.work_location
      );

      const initialFormData = {
        firstName: details.first_name || "",
        lastName: details.last_name || "",
        middleName: details.middle_name || "",
        dateOfBirth: details.date_of_birth?.split('T')[0] || "",
        gender: details.gender || "",
        nationality: details.nationality || "",
        maritalStatus: details.marital_status || "",
        bloodGroup: details.blood_group || "",
        primaryEmail: emp.email || "",
        primaryPhone: details.phone || "",
        primaryAddress: details.address || "",
        primaryCity: details.city || "",
        primaryState: details.state || "",
        primaryZip: details.zip || "",
        primaryCountry: details.country || "India",
        secondaryEmail: details.secondary_email || "",
        secondaryPhone: details.secondary_phone || "",
        secondaryAddress: details.secondary_address || "",
        secondaryCity: details.secondary_city || "",
        secondaryState: details.secondary_state || "",
        secondaryZip: details.secondary_zip || "",
        secondaryCountry: details.secondary_country || "India",
        emergencyContactName: details.emergency_contact || "",
        emergencyContactRelationship: details.emergency_relationship || "",
        emergencyContactPhone: details.emergency_phone || "",
        emergencyContactEmail: details.emergency_email?.includes('@') ? details.emergency_email : "",
        department: details.department_id?.toString() || "",
        teamId: details.team_id?.toString() || "",
        role: details.role_id?.toString() || matchedRole?.id?.toString() || "",
        location: details.work_location || "",
        remoteLocation: details.remote_location || "",
        branchId: details.work_location === "Remote" ? "remote" : (details.branch_id?.toString() || matchedLoc?.id?.toString() || ""),
        startDate: details.start_date?.split('T')[0] || "",
        employeeType: details.employment_type || "Full-Time",
        contractStartDate: details.contract_start_date?.split('T')[0] || "",
        contractEndDate: details.contract_end_date?.split('T')[0] || "",
        subStatus: details.sub_status || "",
        employeeId: details.employee_id || "",
        workSchedule: details.work_schedule || "Flexible",
        selectedShiftId: details.shift_id || "",
        manager: details.reporting_manager_id?.toString() || "",
        probationPeriod: details.probation_period?.toString() || "",
        baseSalary: details.base_salary?.toString() || "",
        currency: details.currency || "USD",
        payFrequency: details.salary_frequency || "Monthly",
        passportNumber: details.passport_number || "",
        passportIssuedDate: details.passport_issued_date?.split('T')[0] || "",
        passportExpiry: details.passport_expiry_date?.split('T')[0] || "",
        drivingLicense: details.driving_license_number || "",
        licenseExpiry: details.license_expiry_date?.split('T')[0] || "",
        panNumber: details.pan_number || "",
        aadhaarNumber: details.aadhaar_number || "",
        certificateCourseName: details.certificate_course_name || "",
        certificateIssuedBy: details.certificate_issued_by || "",
        bankName: details.bank_name || "",
        branchName: details.branch_name || "",
        accountHolderName: details.account_holder_name || "",
        accountNumber: details.account_number || "",
        ifscCode: details.ifsc_code || "",
        skills: Array.isArray(details.skills) ? details.skills.join(', ') : (details.skills || ""),
        certifications: Array.isArray(details.certifications) 
          ? details.certifications.map((c: any) => {
              if (typeof c === 'object' && c && c.name) {
                return {
                  name: c.name,
                  issuingOrganization: c.issuingOrganization || c.issuing_organization || "",
                  issueDate: c.issueDate || c.issue_date || "",
                  expiryDate: c.expiryDate || c.expiry_date || "",
                  credentialId: c.credentialId || c.credential_id || "",
                  credentialUrl: c.credentialUrl || c.credential_url || "",
                  file: null,
                  fileUrl: c.fileUrl || c.file_url || c.file || ""
                };
              } else if (typeof c === 'string') {
                return {
                  name: c,
                  issuingOrganization: "",
                  issueDate: "",
                  expiryDate: "",
                  credentialId: "",
                  credentialUrl: "",
                  file: null,
                  fileUrl: ""
                };
              }
              return null;
            }).filter(Boolean)
          : (typeof details.certifications === 'string' && details.certifications
              ? details.certifications.split(',').map((s: string) => ({
                  name: s.trim(),
                  issuingOrganization: "",
                  issueDate: "",
                  expiryDate: "",
                  credentialId: "",
                  credentialUrl: "",
                  file: null,
                  fileUrl: ""
                }))
              : []),
        languages: Array.isArray(details.languages) 
          ? details.languages.map((lang: any) => {
              if (typeof lang === 'object' && lang && lang.language) {
                return { language: lang.language, proficiency: lang.proficiency || "Beginner" };
              } else if (typeof lang === 'string') {
                const parts = lang.split('(');
                const language = parts[0].trim();
                const proficiency = parts[1] ? parts[1].replace(')', '').trim() : "Beginner";
                return { language, proficiency };
              }
              return null;
            }).filter(Boolean) as { language: string; proficiency: string }[]
          : (typeof details.languages === 'string' && details.languages
              ? details.languages.split(',').map((s: string) => {
                  const parts = s.split('(');
                  const language = parts[0].trim();
                  const proficiency = parts[1] ? parts[1].replace(')', '').trim() : "Beginner";
                  return { language, proficiency };
                })
              : []),
        status: emp.status !== undefined ? !!emp.status : true,
        payrollGroupId: details.payroll_group_id?.toString() || "",
        outstandingLoan: "",
        outstandingAdvance: "",
        designationId: details.designation_id?.toString() || ""
      };

      let autoLoan = "";
      let autoAdvance = "";
      if (details.compensation_breakdown) {
        try {
          const cb = typeof details.compensation_breakdown === 'string'
            ? JSON.parse(details.compensation_breakdown)
            : details.compensation_breakdown;
          if (Array.isArray(cb)) {
            const loanItem = cb.find((item: any) => item.componentType === 'Outstanding Loan Recovery' || item.name === 'Outstanding Loan Recovery');
            const advItem = cb.find((item: any) => item.componentType === 'Salary Advance Recovery' || item.name === 'Salary Advance Recovery');
            autoLoan = loanItem ? String(loanItem.amount || "") : "";
            autoAdvance = advItem ? String(advItem.amount || "") : "";
          } else if (cb && typeof cb === 'object') {
            autoLoan = String(cb.outstanding_loan || cb.loan_balance || "");
            autoAdvance = String(cb.outstanding_advance || cb.advance_balance || "");
          }
        } catch (e) {
          console.error("Error parsing compensation_breakdown:", e);
        }
      }

      initialFormData.outstandingLoan = autoLoan;
      initialFormData.outstandingAdvance = autoAdvance;

      const safeParse = (data: any, fallback: any = []) => {
        if (!data) return fallback;
        if (typeof data === 'string') {
          try { return JSON.parse(data); } catch (e) { return fallback; }
        }
        return Array.isArray(data) ? data : fallback;
      };

      const family = safeParse(details.family_members);
      const edu = safeParse(details.education);
      const work = safeParse(details.employment_history);
      const rawComp = safeParse(details.compensation_breakdown, [{ componentType: "Base Salary", amount: "", frequency: "Monthly" }]);
      const comp = Array.isArray(rawComp)
        ? rawComp.filter((s: any) => s.componentType !== "Outstanding Loan Recovery" && s.componentType !== "Salary Advance Recovery")
        : rawComp;

      setFormData(initialFormData);
      setFamilyMembers(family);
      setEducationHistory(edu);
      setEmploymentHistory(work);
      setCompensationSplits(comp);

      const isSameAddress = !!(initialFormData.primaryAddress && initialFormData.secondaryAddress && initialFormData.primaryAddress === initialFormData.secondaryAddress);
      setSameAsPrimary(isSameAddress);

      // Capture original data for diffing in handleSubmit
      setOriginalData({
        formData: { ...initialFormData },
        family,
        education: edu,
        employment: work,
        compensation: comp
      });

      // Set previews
      if (details.profile_picture) setProfilePhotoPreview(getProfilePictureUrl(details.profile_picture));
      if (details.passport_doc) setPassportFile(getProfilePictureUrl(details.passport_doc));
      if (details.pan_doc) setPanFile(getProfilePictureUrl(details.pan_doc));
      if (details.aadhaar_doc) setAadhaarFile(getProfilePictureUrl(details.aadhaar_doc));
      if (details.dl_doc) setDlFile(getProfilePictureUrl(details.dl_doc));
      if (details.resume) setResumeFile(getProfilePictureUrl(details.resume));
      if (details.certificate_files) setCertificateFiles(safeParse(details.certificate_files).map((f: string) => getProfilePictureUrl(f)));
      if (details.documents) setOtherDocuments(safeParse(details.documents).map((f: string) => getProfilePictureUrl(f)));

    } catch (error: any) {
      console.error("Employee fetch failed", error);
      toast.error("Failed to load employee details");
    } finally {
      setIsSubmitting(false);
      setLoadingStates(prev => ({ ...prev, employee: false }));
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const staticData = await fetchStaticData();
      if (id && staticData) {
        await fetchEmployeeData(staticData.roles, staticData.locations);
      }
      setIsFormReady(true);
    };
    initialize();
  }, [id]);

  /**
   * Fetches teams whenever the department changes
   */
  /**
   * Fetches teams whenever the department changes
   */
  useEffect(() => {
    const fetchTeams = async () => {
      if (!formData.department) {
        setAvailableTeams([]);
        return;
      }

      setLoadingStates(prev => ({ ...prev, teams: true }));
      try {
        const teams = await getTeamsByDepartment(Number(formData.department));
        setAvailableTeams(teams || []);
      } catch (error) {
        console.error("Failed to fetch teams", error);
        toast.error("Failed to load teams for this department");
        setAvailableTeams([]);
      } finally {
        setLoadingStates(prev => ({ ...prev, teams: false }));
      }
    };

    fetchTeams();
  }, [formData.department]);

  const [fixedScheduleLabel, setFixedScheduleLabel] = useState("Fixed Schedule (Standard Hours)");
  const [areShiftsEnabled, setAreShiftsEnabled] = useState(true);

  useEffect(() => {
    const fetchOrgDataAndShifts = async () => {
      try {
        const orgs = await getOrganizations();
        if (orgs && orgs.length > 0) {
          const org = orgs[0];
          const wc = org.working_calendar || org.workingCalendar;
          let isEnabled = false;
          if (typeof org.enable_shifts === 'boolean') {
            isEnabled = org.enable_shifts;
          } else if (wc && typeof wc.enableShifts === 'boolean') {
            isEnabled = wc.enableShifts;
          }
          setAreShiftsEnabled(isEnabled);

          if (wc && wc.fixedStartTime && wc.fixedEndTime) {
            setFixedScheduleLabel(`Fixed Schedule (${wc.fixedStartTime} - ${wc.fixedEndTime})`);
          } else if (org.working_hours) {
            setFixedScheduleLabel(`Fixed Schedule (${org.working_hours})`);
          }
          const shifts = await getOrganizationShifts(org.id);
          setOrganizationShifts(shifts || []);
          if (!isEnabled || !shifts || shifts.length === 0) {
            setFormData(prev => ({ ...prev, workSchedule: "Fixed Schedule" }));
          }
        } else {
          const shifts = await getOrganizationShifts(1);
          setOrganizationShifts(shifts || []);
        }
      } catch (error) {
        console.error("Failed to fetch org details / shifts", error);
      }
    };
    fetchOrgDataAndShifts();
  }, []);

  // Fetch managers based on department
  useEffect(() => {
    const fetchManagersByDepartment = async () => {
      if (!formData.department) {
        setManagersList([]);
        return;
      }

      setLoadingStates(prev => ({ ...prev, managers: true }));
      try {
        const assignedManager = await getDepartmentManager(parseInt(formData.department, 10));

        if (assignedManager) {
          const managerObj: any = {
            id: assignedManager.id,
            username: assignedManager.username,
            details: {
              first_name: assignedManager.name.split(' ')[0],
              last_name: assignedManager.name.split(' ').slice(1).join(' '),
              role: { role_name: "Manager" }
            }
          };
          setManagersList([managerObj]);
          // Only update if not in edit mode OR if department was manually changed
          if (!id || originalData?.formData.department !== formData.department) {
            setFormData(prev => ({ ...prev, manager: assignedManager.id.toString() }));
          }
        } else {
          setManagersList([]);
          setFormData(prev => ({ ...prev, manager: "" }));
        }
      } catch (error) {
        console.error("Manager fetch failed", error);
      } finally {
        setLoadingStates(prev => ({ ...prev, managers: false }));
      }
    };

    fetchManagersByDepartment();
  }, [formData.department]);

  // Automated Payroll Group Matching & Calculation Engine
  useEffect(() => {
    if (!isFormReady || payrollGroups.length === 0) return;

    const currentDetails = {
      roleId: formData.role,
      deptId: formData.department,
      locationId: formData.branchId,
      gender: formData.gender,
      employmentType: formData.employeeType,
      ctc: parseFloat(formData.baseSalary) || 0
    };

    let bestMatch: any = null;
    let maxSpecificity = -1;

    payrollGroups.forEach(group => {
      let criteria: any = {};
      try {
        criteria = typeof group.criteria === 'string' ? JSON.parse(group.criteria) : group.criteria;
      } catch (e) { return; }

      const isMatch = (
        (!criteria.roleId || criteria.roleId === 'all' || criteria.roleId.toString() === currentDetails.roleId?.toString()) &&
        (!criteria.deptId || criteria.deptId === 'all' || criteria.deptId.toString() === currentDetails.deptId?.toString()) &&
        (!criteria.locationId || criteria.locationId === 'all' || criteria.locationId.toString() === currentDetails.locationId?.toString()) &&
        (!criteria.gender || criteria.gender === 'all' || criteria.gender === currentDetails.gender) &&
        (!criteria.employmentType || criteria.employmentType === 'all' || criteria.employmentType === currentDetails.employmentType)
      );

      if (isMatch) {
        let specificity = 0;
        if (criteria.roleId !== 'all') specificity++;
        if (criteria.deptId !== 'all') specificity++;
        if (criteria.locationId !== 'all') specificity++;
        if (criteria.gender !== 'all') specificity++;
        if (criteria.employmentType !== 'all') specificity++;

        if (specificity > maxSpecificity) {
          maxSpecificity = specificity;
          bestMatch = group;
        }
      }
    });

    // Update Group if matched
    if (bestMatch && bestMatch.id.toString() !== formData.payrollGroupId) {
      setFormData(prev => ({ ...prev, payrollGroupId: bestMatch.id.toString() }));
    }

    // Always perform calculation if we have a group (either matched or selected) and CTC
    const activeGroup = bestMatch || payrollGroups.find(g => g.id.toString() === formData.payrollGroupId);

    const ctc = parseFloat(formData.baseSalary) || 0;

    if (activeGroup && activeGroup.salary_structure && Array.isArray(activeGroup.salary_structure.components)) {

      let currentSum = 0;
      const calculatedSplits = activeGroup.salary_structure.components.map((c: any) => {
        const comp = c.salary_component || c;
        let amount = 0;

        const calcType = comp.calculation_type || comp.calculationType;
        const val = parseFloat(comp.value || c.value) || 0;

        if (calcType === 'percentage' || calcType === 'Percentage') {
          amount = (ctc * val) / 100;
        } else {
          amount = val;
        }

        const finalAmount = amount > 0 ? Math.round(amount) : 0;
        currentSum += finalAmount;

        return {
          componentType: comp.name || c.name || "Unknown",
          amount: finalAmount.toString(),
          frequency: "Monthly",
          type: (comp.type || c.type) as 'earning' | 'deduction'
        };
      });

      const remainingCTC = ctc - currentSum;
      if (remainingCTC > 0) {
        const specialIndex = calculatedSplits.findIndex((s: any) => s.componentType.toLowerCase().includes('special allowance'));
        if (specialIndex >= 0) {
          calculatedSplits[specialIndex].amount = (parseInt(calculatedSplits[specialIndex].amount) + remainingCTC).toString();
        } else {
          calculatedSplits.push({
            componentType: "Special Allowance",
            amount: Math.round(remainingCTC).toString(),
            frequency: "Monthly",
            type: 'earning'
          });
        }
      }

      // Update splits if we have a CTC or if the structure has changed
      if (ctc >= 0 && calculatedSplits.length > 0) {
        // Deep compare to avoid infinite loops if data is same
        if (JSON.stringify(calculatedSplits) !== JSON.stringify(compensationSplits)) {
          setCompensationSplits(calculatedSplits);
        }
      }
    } else if (ctc > 0) {
      // DEFAULT FALLBACK IF NO ACTIVE GROUP
      const basic = Math.round(ctc * 0.4);
      const hra = Math.round(ctc * 0.3);
      const special = ctc - (basic + hra);

      const defaultSplits = [
        { componentType: "Basic Pay", amount: basic.toString(), frequency: "Monthly" },
        { componentType: "House Rent Allowance (HRA)", amount: hra.toString(), frequency: "Monthly" },
        { componentType: "Special Allowance", amount: special.toString(), frequency: "Monthly" }
      ];

      if (JSON.stringify(defaultSplits) !== JSON.stringify(compensationSplits)) {
        setCompensationSplits(defaultSplits);
      }
    }
  }, [formData.role, formData.department, formData.branchId, formData.gender, formData.employeeType, formData.baseSalary, formData.payrollGroupId, payrollGroups, isFormReady]);

  /**
   * Robust auto-fill for Team in Edit Mode
   * Ensures teamId is restored once teams list is available
   */
  useEffect(() => {
    if (id && originalData?.formData.teamId && availableTeams.length > 0) {
      const originalTeamId = originalData.formData.teamId;
      const isTeamAvailable = availableTeams.some(t => t.id.toString() === originalTeamId);

      if (isTeamAvailable && formData.teamId !== originalTeamId) {
        setFormData(prev => ({ ...prev, teamId: originalTeamId }));
      }
    }
  }, [availableTeams, originalData?.formData.teamId, id]);


  // --- Memoized Dropdown Data ---

  /**
   * Filtered departments based on selected location/branch
   */
  const filteredDepartments = useMemo(() => {
    return departmentsList.filter(dep => {
      if (formData.location === "Remote") return true;
      if (!formData.branchId || formData.branchId === "remote") return false;
      return dep.branch_id?.toString() === formData.branchId;
    });
  }, [departmentsList, formData.location, formData.branchId]);

  const validateSection = (sectionId: string): boolean => {
    const errors: Record<string, string> = {};

    switch (sectionId) {
      case "job":
        if (!formData.department) errors.department = "This field is required";
        if (!formData.employeeType) errors.employeeType = "This field is required";
        if (!formData.startDate) errors.startDate = "This field is required";
        if (!formData.location && !formData.branchId) errors.location = "This field is required";
        if (!formData.role) errors.role = "This field is required";
        if (!formData.designationId) errors.designationId = "This field is required";
        if (formData.employeeType === "Contract") {
          const startErr = validateField("contractStartDate", formData.contractStartDate, true, true);
          if (startErr) errors.contractStartDate = startErr;
          
          const endErr = validateField("contractEndDate", formData.contractEndDate, true, true);
          if (endErr) errors.contractEndDate = endErr;
        }
        if (formData.location === "Remote") {
          const remoteErr = validateField("remoteLocation", formData.remoteLocation, true, true);
          if (remoteErr) errors.remoteLocation = remoteErr;
        }
        break;

      case "personal": {
        const personalFields = [
          "firstName", "lastName", "middleName", "dateOfBirth", "gender"
        ];
        personalFields.forEach(field => {
          const err = validateField(field, (formData as any)[field], true, true);
          if (err) errors[field] = err;
        });

        // Immediate cross-check with existing profilePhoto state (if any error was set during upload)
        if (formErrors.profilePhoto) {
          errors.profilePhoto = formErrors.profilePhoto;
        }
        break;
      }

      case "contact": {
        const contactFields = [
          "primaryEmail", "primaryPhone", "primaryAddress", "primaryCity", "primaryState", "primaryZip", "primaryCountry",
          "secondaryEmail", "secondaryPhone", "secondaryAddress", "secondaryCity", "secondaryState", "secondaryZip", "secondaryCountry"
        ];
        contactFields.forEach(field => {
          const err = validateField(field, (formData as any)[field], true, true);
          if (err) errors[field] = err;
        });
        break;
      }

      case "emergency": {
        const emergencyFields = [
          "emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone", "emergencyContactEmail"
        ];
        emergencyFields.forEach(field => {
          const err = validateField(field, (formData as any)[field], true, true);
          if (err) errors[field] = err;
        });
        break;
      }

      case "family": {
        familyMembers.forEach((member, index) => {
          ["name", "relationship", "phone", "dateOfBirth"].forEach(field => {
            const err = validateField(`family_${index}_${field}`, member[field as keyof FamilyMember], true, true);
            if (err) errors[`family_${index}_${field}`] = err;
          });
        });
        break;
      }

      case "compensation":
        if (!formData.payrollGroupId) {
          errors.payrollGroupId = "Payroll Group assignment is required.";
        }
        break;

      case "bank":
        if (!formData.bankName) errors.bankName = "This field is required";
        if (!formData.branchName) errors.branchName = "This field is required";
        if (!formData.accountHolderName) errors.accountHolderName = "This field is required";
        if (!formData.accountNumber) errors.accountNumber = "This field is required";
        if (!formData.ifscCode) errors.ifscCode = "This field is required";
        break;

      case "education": {
        if (educationHistory.length < 3) {
          errors.education = "Minimum 3 education records are required (SSLC, PUC / Diploma, and 1st Degree).";
        }
        educationHistory.forEach((edu, index) => {
          const isHigherEd = ["Diploma", "Undergraduate (UG)", "Postgraduate (PG)", "Doctorate (PhD)", "UG", "PG", "PhD"].includes(edu.level);
          const fields = ["level", "institution", "startDate"];
          if (isHigherEd) fields.push("degree", "fieldOfStudy");
          if (!edu.currentlyStudying) fields.push("endDate");

          fields.forEach(field => {
            const val = edu[field as keyof Education];
            const err = validateField(`edu_${index}_${field}`, val, true, true);
            if (err) errors[`edu_${index}_${field}`] = err;
          });
        });
        break;
      }

      case "employment": {
        employmentHistory.forEach((emp, index) => {
          ["company", "position", "startDate", "endDate", "responsibilities", "reasonForLeaving", "file"].forEach(field => {
            const val = field === "file" ? (emp.file || emp.fileUrl || "") : emp[field as keyof Employment];
            const err = validateField(`emp_${index}_${field}`, val, true, true);
            if (err) errors[`emp_${index}_${field}`] = err;
          });
        });
        break;
      }

      case "documents": {
        const docFormData: Partial<DocumentFormData> = {
          resumeDoc: resumeFile,
          passportIssueDate: formData.passportIssuedDate,
          passportExpiryDate: formData.passportExpiry,
          drivingLicenseExpiryDate: formData.licenseExpiry,
          panDoc: panFile,
          panNumber: formData.panNumber,
          passportDoc: passportFile,
          drivingLicenseDoc: dlFile,
          aadhaarDoc: aadhaarFile,
          country: formData.primaryCountry,
        };
        const missingFields = getMissingDocumentFields(docFormData);
        
        if (missingFields.includes("Resume / CV")) errors.resumeDoc = "Resume / CV is required";
        if (missingFields.includes("PAN Card Document")) errors.panDoc = "PAN Card Document is required";
        if (missingFields.includes("Aadhaar Card Document")) errors.aadhaarDoc = "Aadhaar Card Document is required";
        break;
      }

      default:
        break;
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Auto-focus first invalid field
      setTimeout(() => {
        const firstErrorKey = Object.keys(errors)[0];
        const input = (
          document.querySelector(`[name="${firstErrorKey}"]`) ||
          document.getElementById(firstErrorKey) ||
          document.querySelector(`[data-error-key="${firstErrorKey}"]`)
        ) as HTMLElement;

        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      return false;
    }

    return true;
  };

  const sections = [
    { id: "personal", label: "Personal Info", description: "Basic details, contact & family", icon: UserIcon },
    { id: "job", label: "Job Details", description: "Role, location and department", icon: Briefcase },
    { id: "education", label: "Qualifications", description: "Academic qualifications", icon: GraduationCap },
    { id: "skills", label: "Certifications", description: "Skills and certificates", icon: Award },
    { id: "employment", label: "Experience", description: "Past work experience", icon: Clock },
    { id: "documents", label: "Documents", description: "Identity documentation", icon: FileText },
    { id: "compensation", label: "Payroll", description: "Salary and bank details", icon: Banknote }
  ];

  const currentStepIndex = sections.findIndex(s => s.id === activeSection);
  const isLastStep = currentStepIndex === sections.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const activeSectionMeta = sections.find(s => s.id === activeSection) ?? sections[0];

  const scrollToWarningBanner = () => {
    setTimeout(() => {
      const banner = document.getElementById("required-fields-banner");
      if (banner) {
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const scrollContainer = document.querySelector(".overflow-y-auto");
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }, 100);
  };

  const navigateToStep = (targetStepId: string) => {
    const targetIndex = sections.findIndex(s => s.id === targetStepId);
    const currentIndex = sections.findIndex(s => s.id === activeSection);

    // In Edit Mode, we switch modules directly
    if (id) {
      setActiveSection(targetStepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // In Add Mode, we follow the stepper rules
    if (targetIndex <= highestStepVisitedIndex) {
      setActiveSection(targetStepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (targetIndex > currentIndex) {
      if (targetIndex === currentIndex + 1) {
        if (validateSection(activeSection)) {
          setActiveSection(targetStepId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setShowWarningBanner(true);
          scrollToWarningBanner();
        }
      }
      return;
    }
  };

  const currentMissingFields = useMemo(() => {
    const missing: string[] = [];

    switch (activeSection) {
      case "personal":
        if (!formData.firstName) missing.push("First Name");
        if (!formData.lastName) missing.push("Last Name");
        if (!formData.dateOfBirth) missing.push("Date of Birth");
        if (!formData.gender) missing.push("Gender");
        if (!formData.primaryEmail) missing.push("Primary Email");
        if (!formData.primaryPhone) missing.push("Primary Phone");
        if (!formData.primaryAddress) missing.push("Street Address");
        if (!formData.primaryCity) missing.push("City");
        if (!formData.primaryState) missing.push("State");
        if (!formData.primaryZip) missing.push("ZIP Code");
        if (!formData.primaryCountry) missing.push("Country");
        if (!formData.emergencyContactName) missing.push("Emergency Contact Name");
        if (!formData.emergencyContactRelationship) missing.push("Emergency Contact Relationship");
        if (!formData.emergencyContactPhone) missing.push("Emergency Contact Phone");
        if (duplicateFlags.email) missing.push("Email (already in use)");
        if (duplicateFlags.phone) missing.push("Phone (already in use)");
        break;

      case "job":
        if (!formData.department) missing.push("Department");
        if (!formData.employeeType) missing.push("Employment Type");
        if (!formData.startDate) missing.push("Start Date");
        if (!formData.location && !formData.branchId) missing.push("Work Location");
        if (!formData.role) missing.push("Role");
        if (!formData.designationId) missing.push("Designation");
        break;

      case "education":
        if (educationHistory.length < 3) {
          missing.push(`3 Education Records required (currently ${educationHistory.length}/3: SSLC, PUC / Diploma, and 1st Degree)`);
        }
        educationHistory.forEach((edu, index) => {
          const levelName = edu.level || `Record #${index + 1}`;
          if (!edu.institution) missing.push(`Institution (${levelName})`);
          if (!edu.startDate) missing.push(`Start Date (${levelName})`);
          const isHigherEd = ["Diploma", "Undergraduate (UG)", "Postgraduate (PG)", "Doctorate (PhD)"].includes(edu.level);
          if (isHigherEd) {
            if (!edu.degree) missing.push(`Degree (${levelName})`);
            if (!edu.fieldOfStudy) missing.push(`Field of Study (${levelName})`);
          }
          if (!edu.currentlyStudying && !edu.endDate) missing.push(`End Date (${levelName})`);
        });
        break;

      case "employment":
        employmentHistory.forEach((emp, index) => {
          const numStr = employmentHistory.length > 1 ? ` #${index + 1}` : "";
          if (!emp.company) missing.push(`Company${numStr}`);
          if (!emp.position) missing.push(`Position${numStr}`);
          if (!emp.startDate) missing.push(`Start Date${numStr}`);
          if (!emp.currentlyWorking && !emp.endDate) missing.push(`End Date${numStr}`);
        });
        break;

      case "documents": {
        const docFormData: Partial<DocumentFormData> = {
          resumeDoc: resumeFile,
          passportIssueDate: formData.passportIssuedDate,
          passportExpiryDate: formData.passportExpiry,
          drivingLicenseExpiryDate: formData.licenseExpiry,
          panDoc: panFile,
          panNumber: formData.panNumber,
          passportDoc: passportFile,
          drivingLicenseDoc: dlFile,
          aadhaarDoc: aadhaarFile,
          country: formData.primaryCountry,
        };
        const missingFields = getMissingDocumentFields(docFormData);
        missing.push(...missingFields);
        break;
      }

      case "compensation":
        if (!formData.baseSalary) missing.push("Base Salary");
        if (compensationSplits.length === 0) missing.push("Salary Components");
        if (!formData.bankName) missing.push("Bank Name");
        if (!formData.branchName) missing.push("Bank Branch Name");
        if (!formData.accountHolderName) missing.push("Account Holder Name");
        if (!formData.accountNumber) missing.push("Account Number");
        if (!formData.ifscCode) missing.push("IFSC Code");
        break;

      default:
        break;
    }

    return missing;
  }, [
    activeSection,
    formData,
    familyMembers,
    educationHistory,
    employmentHistory,
    compensationSplits,
    isCompensationMismatch,
    duplicateFlags,
    passportFile,
    dlFile,
    panFile,
    aadhaarFile,
    resumeFile
  ]);

  const isCurrentSectionValid = currentMissingFields.length === 0;

  const handleNext = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    if (!isCurrentSectionValid) {
      validateSection(activeSection);
      setShowWarningBanner(true);
      scrollToWarningBanner();
      return;
    }

    const nextStep = sections[currentStepIndex + 1];
    if (nextStep) {
      setActiveSection(nextStep.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const prevStep = sections[currentStepIndex - 1];
    if (prevStep) {
      setActiveSection(prevStep.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  function validateField(name: string, value: any, isBlur: boolean = false, hasError: boolean = false): string {
    let fieldCategory = name;
    if (name.startsWith("family_")) {
      fieldCategory = `family_${name.split("_")[2]}`; // family_name
    } else if (name.startsWith("edu_")) {
      fieldCategory = `edu_${name.split("_")[2]}`;
    } else if (name.startsWith("emp_")) {
      fieldCategory = `emp_${name.split("_")[2]}`;
    }

    // Basic required validation based on asterisk fields in UI
    const requiredFields = [
      "firstName", "lastName", "dateOfBirth", "gender",
      "primaryEmail", "primaryPhone", "primaryAddress", "primaryCity", "primaryState",
      "primaryZip", "primaryCountry", "emergencyContactName",
      "emergencyContactRelationship", "emergencyContactPhone", "department",
      "role", "designationId", "startDate", "employeeType", "bankName", "branchName", "accountHolderName",
      "accountNumber", "ifscCode", "baseSalary",
      "family_name", "family_relationship", "family_phone",
      "edu_institution", "edu_degree", "edu_fieldOfStudy", "edu_startDate", "edu_file",
      "emp_company", "emp_position", "emp_startDate", "emp_file"
    ];

    const shouldValidateFull = isBlur || hasError;

    const isEduEndDateRequired = () => {
      if (fieldCategory !== "edu_endDate") return false;
      const index = parseInt(name.split("_")[1], 10);
      return !educationHistory[index]?.currentlyStudying;
    };

    const isEmpEndDateRequired = () => {
      if (fieldCategory !== "emp_endDate") return false;
      const index = parseInt(name.split("_")[1], 10);
      return !employmentHistory[index]?.currentlyWorking;
    };

    const isEmpReasonRequired = () => {
      if (fieldCategory !== "emp_reasonForLeaving") return false;
      const index = parseInt(name.split("_")[1], 10);
      return !employmentHistory[index]?.currentlyWorking;
    };

    const isPassportRequired = () => name === "passportExpiry" && !!formData.passportNumber;
    const isLicenseRequired = () => name === "licenseExpiry" && !!formData.drivingLicense;
    const isContractDateRequired = () => formData.employeeType === "Contract" && (name === "contractStartDate" || name === "contractEndDate");
    const isRemoteLocationRequired = () => name === "remoteLocation" && formData.location === "Remote";

    if (requiredFields.includes(fieldCategory) || requiredFields.includes(name) || isEduEndDateRequired() || isEmpEndDateRequired() || isEmpReasonRequired() || isPassportRequired() || isLicenseRequired() || isContractDateRequired() || isRemoteLocationRequired()) {
      if (!value || (typeof value === 'string' && value.trim() === "")) {
        if (shouldValidateFull) {
          if (name === "firstName") return "Please enter first name";
          if (name === "lastName") return "Please enter last name";
          if (name === "dateOfBirth") return "Please select date of birth";
          if (name === "primaryEmail") return "Please enter email address";
          if (name === "primaryPhone") return "Please enter phone number";
          if (name === "contractStartDate") return "Contract Start Date is required";
          if (name === "contractEndDate") return "Contract End Date is required";
          if (name === "remoteLocation") return "Remote Location is required";
          if (name === "primaryAddress") return "Please enter street address";
          if (name === "primaryCity") return "Please enter city";
          if (name === "primaryState") return "Please select state/province";
          if (name === "primaryZip") return "Please enter ZIP/postal code";
          if (name === "primaryCountry") return "Please select country";
          if (name === "emergencyContactName") return "Please enter contact name";
          if (name === "emergencyContactRelationship") return "Please select relationship";
          if (name === "emergencyContactPhone") return "Please enter phone number";
          if (fieldCategory === "family_name") return "Please enter full name";
          if (fieldCategory === "family_relationship") return "Please select relationship";
          if (fieldCategory === "family_phone") return "Please enter phone number";
          if (fieldCategory === "edu_institution") return "Please enter institution name";
          if (fieldCategory === "edu_degree") return "Please enter degree";
          if (fieldCategory === "edu_fieldOfStudy") return "Please enter field of study";
          if (fieldCategory === "edu_startDate") return "Please select start date";
          if (fieldCategory === "edu_endDate") return "Please select end date";
          if (fieldCategory === "edu_file") return "Please upload education document";
          if (fieldCategory === "emp_company") return "Please enter company name";
          if (fieldCategory === "emp_position") return "Please enter position";
          if (fieldCategory === "emp_startDate") return "Please select start date";
          if (fieldCategory === "emp_endDate") return "Please select end date";
          if (fieldCategory === "emp_reasonForLeaving") return "Please enter reason for leaving";
          if (fieldCategory === "emp_file") return "Please upload employment document";
          if (name === "designationId") return "Please select a designation";
          if (name === "bankName") return "Please select bank name";
          if (name === "branchName") return "Please enter branch name";
          if (name === "accountHolderName") return "Please enter account holder name";
          if (name === "accountNumber") return "Please enter account number";
          if (name === "ifscCode") return "Please enter IFSC code";
          if (name === "passportNumber") return "Please enter passport number";
          if (name === "passportExpiry") return "Please select expiry date";
          if (name === "panNumber") return "Please enter PAN number";
          if (name === "aadhaarNumber") return "Please enter Aadhaar number";
          return "This field is required";
        }
        return "";
      }
    }

    // Format Checks (immediate on type)
    if ((name === "firstName" || name === "lastName" || name === "middleName" || name === "primaryCity" || name === "secondaryCity" || name === "primaryState" || name === "secondaryState" || name === "primaryCountry" || name === "secondaryCountry" || name === "emergencyContactName" || fieldCategory === "family_name") && typeof value === 'string' && value) {
      if (!/^[A-Za-z\s]+$/.test(value)) return "Only letters are allowed";
    }
    if (name === "nationality" && typeof value === 'string' && value) {
      if (!/^[A-Za-z\s]+$/.test(value)) return "Invalid nationality format";
    }
    if ((name === "primaryPhone" || name === "secondaryPhone" || name === "emergencyContactPhone" || fieldCategory === "family_phone") && value) {
      const cleanVal = String(value).trim();
      const digits = cleanVal.replace(/\D/g, "");
      if (!/^\+?[\d\s\-()]+$/.test(cleanVal) || digits.length < 7 || digits.length > 15) return "Enter valid phone number (7–15 digits)";
    }
    if ((name === "primaryZip" || name === "secondaryZip") && value) {
      if (!/^\d+$/.test(value)) return "Must be 5â€“6 digits";
    }
    if ((name === "primaryAddress" || name === "secondaryAddress") && value) {
      if (!/^[a-zA-Z0-9\s,\.\-]+$/.test(value)) return "Invalid address format";
    }
    if (fieldCategory === "edu_institution" && typeof value === 'string' && value) {
      if (!/^[A-Za-z0-9\s]+$/.test(value)) return "Invalid institution name";
    }
    if (fieldCategory === "edu_degree" && typeof value === 'string' && value) {
      if (!/^[A-Za-z\s\.]+$/.test(value)) return "Invalid degree format";
    }
    if (fieldCategory === "edu_fieldOfStudy" && typeof value === 'string' && value) {
      if (!/^[A-Za-z\s]+$/.test(value)) return "Invalid field of study format";
    }
    if (fieldCategory === "edu_grade" && typeof value === 'string' && value) {
      if (!/^(100(\.0{1,2})?%?|\d{1,2}(\.\d{1,2})?%?)$/.test(value)) return "Enter valid GPA";
    }
    if (fieldCategory === "emp_company" && typeof value === 'string' && value) {
      if (!/^[A-Za-z0-9\s]+$/.test(value)) return "Invalid company name";
    }
    if (fieldCategory === "emp_position" && typeof value === 'string' && value) {
      if (!/^[A-Za-z\s]+$/.test(value)) return "Invalid position format";
    }
    if (name === "branchName" && typeof value === 'string' && value) {
      if (!/^[A-Za-z0-9\s]+$/.test(value)) return "Invalid branch name";
    }
    if (name === "accountHolderName" && typeof value === 'string' && value) {
      if (!/^[A-Za-z\s]+$/.test(value)) return "Only letters are allowed";
    }
    if (name === "accountNumber" && typeof value === 'string' && value) {
      if (!/^\d+$/.test(value)) return "Only numbers allowed";
    }
    if (name === "ifscCode" && typeof value === 'string' && value) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) return "Invalid IFSC format (e.g., HDFC0001234)";
    }
    if (name === "passportNumber" && typeof value === 'string' && value) {
      if (!/^[A-Za-z0-9]{6,9}$/.test(value)) return "Invalid passport number format";
    }
    if (name === "drivingLicense" && typeof value === 'string' && value) {
      if (!/^[A-Za-z0-9]{5,15}$/.test(value)) return "Invalid driving license format";
    }
    if (name === "panNumber" && typeof value === 'string' && value) {
      const isIndia = formData?.primaryCountry === 'India';
      if (isIndia) {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) return "Invalid PAN format";
      } else {
        if (!/^[A-Za-z0-9-]{5,20}$/.test(value)) return "Invalid Tax ID format";
      }
    }
    if (name === "aadhaarNumber" && typeof value === 'string' && value) {
      if (/[^0-9\s]/.test(value)) {
        return "Special characters are not allowed in Aadhaar number.";
      }
      const cleanValue = value.replace(/\s/g, '');
      const isIndia = formData?.primaryCountry === 'India';
      if (isIndia) {
        if (!/^\d{12}$/.test(cleanValue)) return "Aadhaar must be a 12 digit number";
      } else {
        if (!/^\d+$/.test(cleanValue)) return "Only numbers allowed";
      }
    }

    // Length and specific checks (on blur or if already in error)
    if (shouldValidateFull) {
      if ((name === "firstName" || name === "emergencyContactName" || fieldCategory === "family_name" || fieldCategory === "edu_institution" || fieldCategory === "edu_degree" || fieldCategory === "edu_fieldOfStudy" || fieldCategory === "emp_company" || fieldCategory === "emp_position") && typeof value === 'string' && value) {
        if (value.trim().length < 2) return "Minimum 2 characters required";
        if (name === "firstName" && value.trim().length > 30) return "Maximum 30 characters allowed";
        if ((name === "emergencyContactName" || fieldCategory === "family_name") && value.trim().length > 50) return "Maximum 50 characters allowed";
      }

      if (fieldCategory === "emp_responsibilities" && typeof value === 'string' && value) {
        if (value.trim().length > 0 && value.trim().length < 10) return "Please enter valid responsibilities";
      }

      if ((name === "primaryCity" || name === "secondaryCity") && typeof value === 'string' && value) {
        if (value.trim().length < 2) return "Minimum 2 characters required";
      }

      if (name === "primaryAddress" && typeof value === 'string' && value) {
        if (value.trim().length < 5) return "Minimum 5 characters required";
      }

      if (name === "nationality" && typeof value === 'string' && value) {
        if (value.trim().length < 2) return "Invalid nationality format";
      }

      if ((name === "primaryEmail" || name === "secondaryEmail" || name === "emergencyContactEmail") && value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) return name === "primaryEmail" ? "Enter a valid email address" : "Enter valid email address";
      }

      if ((name === "primaryPhone" || name === "secondaryPhone" || name === "emergencyContactPhone" || fieldCategory === "family_phone") && value) {
        const digits = String(value).replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) return "Enter valid phone number (7–15 digits)";
      }

      if ((name === "primaryZip" || name === "secondaryZip") && value) {
        if (value.length < 5 || value.length > 6) return "Must be 5–6 digits";
      }

      if (name === "accountNumber" && value) {
        const digits = value.replace(/\D/g, "");
        if (digits.length < 9 || digits.length > 18) return "Account number must be 9â€“18 digits";
      }

      if (name === "aadhaarNumber" && value) {
        if (/[^0-9\s]/.test(value)) {
          return "Special characters are not allowed in Aadhaar number.";
        }
        const digits = value.replace(/\s/g, "");
        if (digits.length !== 12) return "Aadhaar must be 12 digits";
      }

      if ((fieldCategory === "emp_file" || fieldCategory === "edu_file") && value instanceof File) {
        if (value.size > 20 * 1024 * 1024) return "File size exceeds limit";
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(value.type)) return "Invalid file format";
      }

      if ((name === "contractStartDate" || name === "contractEndDate") && formData.employeeType === "Contract" && value) {
        const startStr = name === "contractStartDate" ? value : formData.contractStartDate;
        const endStr = name === "contractEndDate" ? value : formData.contractEndDate;
        const start = startStr ? new Date(startStr) : null;
        const end = endStr ? new Date(endStr) : null;

        if (start && end) {
          if (end < start) {
            return "End Date cannot be earlier than Start Date";
          }
        }
      }

      if ((fieldCategory === "edu_startDate" || fieldCategory === "edu_endDate") && value) {
        const index = parseInt(name.split("_")[1], 10);
        const relatedEdu = educationHistory[index];
        if (relatedEdu) {
          const startStr = fieldCategory === "edu_startDate" ? value : relatedEdu.startDate;
          const endStr = fieldCategory === "edu_endDate" ? value : relatedEdu.endDate;
          const start = startStr ? new Date(startStr) : null;
          const end = endStr && !relatedEdu.currentlyStudying ? new Date(endStr) : null;

          if (start && end) {
            if (end <= start) {
              return "End date must be after start date";
            }
          }
        }
      }

      if ((fieldCategory === "emp_startDate" || fieldCategory === "emp_endDate") && value) {
        const index = parseInt(name.split("_")[1], 10);
        const relatedEmp = employmentHistory[index];
        if (relatedEmp) {
          const startStr = fieldCategory === "emp_startDate" ? value : relatedEmp.startDate;
          const endStr = fieldCategory === "emp_endDate" ? value : relatedEmp.endDate;
          const start = startStr ? new Date(startStr) : null;
          const end = endStr && !relatedEmp.currentlyWorking ? new Date(endStr) : null;

          if (start && end) {
            if (end <= start) {
              return "End date must be after start date";
            }
          }
        }
      }

      if ((name === "passportExpiry" || name === "licenseExpiry") && value) {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate <= today) {
          return "Expiry date must be in future";
        }
      }

      if ((name === "dateOfBirth" || fieldCategory === "family_dateOfBirth" || fieldCategory === "edu_startDate" || fieldCategory === "emp_startDate" || fieldCategory === "emp_endDate") && value) {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ignore time for comparison

        if (inputDate > today) {
          if (fieldCategory === "edu_startDate" || fieldCategory === "emp_startDate") return "Start date cannot be in future";
          if (fieldCategory === "emp_endDate") return "End date cannot be in future";
          return fieldCategory === "family_dateOfBirth" ? "Date cannot be in the future" : "Date cannot be in future";
        }
        if (name === "dateOfBirth") {
          let age = today.getFullYear() - inputDate.getFullYear();
          const monthDiff = today.getMonth() - inputDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < inputDate.getDate())) {
            age--;
          }
          if (age < 18) return "Minimum age must be 18";
        }
      }

      if (name === "location" || name === "branchId") {
        if (!value || value === "") return "This field is required";
      }
    }

    return "";
  };

  const updateField = (name: string, value: any) => {
    setFormData(prev => {
      const nextData = { ...prev, [name]: value };
      if (sameAsPrimary) {
        if (name === "primaryAddress") nextData.secondaryAddress = value;
        if (name === "primaryCity") nextData.secondaryCity = value;
        if (name === "primaryState") nextData.secondaryState = value;
        if (name === "primaryCountry") nextData.secondaryCountry = value;
        if (name === "primaryZip") nextData.secondaryZip = value;
      }
      return nextData;
    });

    const error = validateField(name, value, true, true);
    setFormErrors(prev => {
      let updatedErrors = { ...prev };
      if (error) {
        updatedErrors[name] = error;
      } else {
        const { [name]: _, ...rest } = updatedErrors as any;
        updatedErrors = rest;
      }

      if (sameAsPrimary) {
        let secFieldName = "";
        if (name === "primaryAddress") secFieldName = "secondaryAddress";
        if (name === "primaryCity") secFieldName = "secondaryCity";
        if (name === "primaryState") secFieldName = "secondaryState";
        if (name === "primaryCountry") secFieldName = "secondaryCountry";
        if (name === "primaryZip") secFieldName = "secondaryZip";

        if (secFieldName) {
          const secError = validateField(secFieldName, value, true, true);
          if (secError) {
            updatedErrors[secFieldName] = secError;
          } else {
            const { [secFieldName]: _, ...rest } = updatedErrors as any;
            updatedErrors = rest;
          }
        }
      }

      if (name === "contractStartDate") {
        const endErr = validateField("contractEndDate", formData.contractEndDate, true, true);
        if (endErr) {
          updatedErrors.contractEndDate = endErr;
        } else {
          const { contractEndDate: _, ...rest } = updatedErrors as any;
          updatedErrors = rest;
        }
      } else if (name === "contractEndDate") {
        const startErr = validateField("contractStartDate", formData.contractStartDate, true, true);
        if (startErr) {
          updatedErrors.contractStartDate = startErr;
        } else {
          const { contractStartDate: _, ...rest } = updatedErrors as any;
          updatedErrors = rest;
        }
      }

      return updatedErrors;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateField(name, value);
  };

  const handleSameAsPrimaryChange = (checked: boolean) => {
    setSameAsPrimary(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        secondaryAddress: prev.primaryAddress,
        secondaryCity: prev.primaryCity,
        secondaryState: prev.primaryState,
        secondaryCountry: prev.primaryCountry,
        secondaryZip: prev.primaryZip
      }));
      setFormErrors(prev => {
        let updatedErrors = { ...prev };
        const fieldsToValidate = ["secondaryAddress", "secondaryCity", "secondaryState", "secondaryCountry", "secondaryZip"];
        const fieldValues = {
          secondaryAddress: formData.primaryAddress,
          secondaryCity: formData.primaryCity,
          secondaryState: formData.primaryState,
          secondaryCountry: formData.primaryCountry,
          secondaryZip: formData.primaryZip
        };
        fieldsToValidate.forEach(f => {
          const err = validateField(f, fieldValues[f as keyof typeof fieldValues], true, true);
          if (err) {
            updatedErrors[f] = err;
          } else {
            const { [f]: _, ...rest } = updatedErrors as any;
            updatedErrors = rest;
          }
        });
        return updatedErrors;
      });
    }
  };


  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: "", relationship: "", phone: "", dateOfBirth: "" }]);
    if (familyMembers.length + 1 >= 3) {
      setFormErrors(prev => ({ ...prev, family: "" }));
    }
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: any) => {
    const skipFields = ["dateOfBirth", "phone"];
    const formattedValue = skipFields.includes(field) ? value : value;
    const updated = [...familyMembers];
    updated[index][field] = formattedValue;
    setFamilyMembers(updated);

    const error = validateField(`family_${index}_${field}`, formattedValue, false, !!formErrors[`family_${index}_${field}`]);
    setFormErrors(prev => ({
      ...prev,
      [`family_${index}_${field}`]: error
    }));
  };

  const handleFamilyMemberBlur = (index: number, field: keyof FamilyMember, value: string) => {
    const error = validateField(`family_${index}_${field}`, value, true, true);
    setFormErrors(prev => ({
      ...prev,
      [`family_${index}_${field}`]: error
    }));
  };

  const closeEditor = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    if (id) {
      navigate(`/employee-management/profile/${id}`);
      return;
    }
    navigate("/employee-management");
  };

  const buildPayloadFormData = (isDraftValue: boolean) => {
    const data = new FormData();

    // 1. Map simple text fields
    const mappings: Record<string, any> = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      middle_name: formData.middleName || null,
      date_of_birth: formData.dateOfBirth || null,
      gender: formData.gender || null,
      nationality: formData.nationality || null,
      marital_status: formData.maritalStatus || null,
      blood_group: formData.bloodGroup || null,
      
      email: formData.primaryEmail,
      status: !isDraftValue,
      is_draft: isDraftValue,
      
      // Contact
      phone: formData.primaryPhone || null,
      secondary_phone: formData.secondaryPhone || null,
      secondary_email: formData.secondaryEmail || null,
      
      // Address
      address: formData.primaryAddress || null,
      city: formData.primaryCity || null,
      state: formData.primaryState || null,
      zip: formData.primaryZip || null,
      country: formData.primaryCountry || null,
      
      secondary_address: formData.secondaryAddress || null,
      secondary_city: formData.secondaryCity || null,
      secondary_state: formData.secondaryState || null,
      secondary_zip: formData.secondaryZip || null,
      secondary_country: formData.secondaryCountry || null,
      
      // Emergency
      emergency_contact: formData.emergencyContactName || null,
      emergency_relationship: formData.emergencyContactRelationship || null,
      emergency_phone: formData.emergencyContactPhone || null,
      emergency_email: formData.emergencyContactEmail || null,
      
      // Job
      employee_id: formData.employeeId || null,
      department_id: formData.department ? Number(formData.department) : null,
      team_id: formData.teamId ? Number(formData.teamId) : null,
      role_id: formData.role ? Number(formData.role) : null,
      employment_type: formData.employeeType || null,
      contract_start_date: formData.employeeType === "Contract" ? (formData.contractStartDate || null) : null,
      contract_end_date: formData.employeeType === "Contract" ? (formData.contractEndDate || null) : null,
      sub_status: formData.subStatus || null,
      start_date: formData.startDate || null,
      work_location: formData.location || null,
      remote_location: formData.location === "Remote" ? (formData.remoteLocation || null) : null,
      work_schedule: formData.workSchedule || null,
      reporting_manager_id: formData.manager ? Number(formData.manager) : null,
      probation_period: formData.probationPeriod ? Number(formData.probationPeriod) : null,
      designation_id: formData.designationId ? Number(formData.designationId) : null,
      shift_id: formData.selectedShiftId ? Number(formData.selectedShiftId) : null,
      
      // Compensation
      base_salary: formData.baseSalary ? Number(formData.baseSalary) : null,
      currency: formData.currency || null,
      salary_frequency: formData.payFrequency || null,
      payroll_group_id: formData.payrollGroupId ? Number(formData.payrollGroupId) : null,
      
      // Bank
      bank_name: formData.bankName || null,
      branch_name: formData.branchName || null,
      account_holder_name: formData.accountHolderName || null,
      account_number: formData.accountNumber || null,
      ifsc_code: formData.ifscCode || null,
      
      // Documents
      passport_number: formData.passportNumber || null,
      passport_expiry_date: formData.passportExpiry || null,
      driving_license_number: formData.drivingLicense || null,
      license_expiry_date: formData.licenseExpiry || null,
      pan_number: formData.panNumber || null,
      aadhaar_number: formData.aadhaarNumber || null,
      certificate_course_name: formData.certificateCourseName || null,
      certificate_issued_by: formData.certificateIssuedBy || null,
    };

    // Password for creation
    if (!id) {
      data.append('password', '12345678');
    }

    // Append simple mappings
    Object.entries(mappings).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        data.append(key, String(val));
      }
    });

    // 2. Map Array fields: skills, certifications, languages
    const skillsArray = formData.skills ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    data.append('skills', JSON.stringify(skillsArray));

    let certFileCounter = 0;
    const formattedCertifications = (formData.certifications || []).map((cert: any) => {
      const isNewFile = cert.file instanceof File;
      const record: any = {
        name: cert.name,
        issuingOrganization: cert.issuingOrganization || null,
        issueDate: cert.issueDate || null,
        expiryDate: cert.expiryDate || null,
        credentialId: cert.credentialId || null,
        credentialUrl: cert.credentialUrl || null,
        documentUrl: cert.fileUrl || null,
      };
      if (isNewFile) {
        record.fileIndex = certFileCounter;
        data.append('certification_docs', cert.file as File);
        certFileCounter++;
      }
      return record;
    });
    data.append('certifications', JSON.stringify(formattedCertifications));

    data.append('languages', JSON.stringify(formData.languages || []));

    // 3. Map complex Array fields: family, education, employment, compensation breakdown
    const formattedFamily = familyMembers.map((m) => ({
      name: m.name,
      relationship: m.relationship,
      phone: m.phone,
      date_of_birth: m.dateOfBirth || null,
    }));
    data.append('family_members', JSON.stringify(formattedFamily));

    let eduFileCounter = 0;
    const formattedEducation = educationHistory.map((edu) => {
      const isNewFile = edu.file instanceof File;
      const record: any = {
        level: normalizeQualificationLabel(edu.level),
        institution: edu.institution,
        degree: edu.degree || null,
        fieldOfStudy: edu.fieldOfStudy || null,
        board: edu.board || null,
        startDate: edu.startDate || null,
        endDate: edu.endDate || null,
        grade: edu.grade || null,
        currentlyStudying: edu.currentlyStudying || false,
        documentUrl: edu.fileUrl || null,
      };
      if (isNewFile) {
        record.fileIndex = eduFileCounter;
        data.append('education_docs', edu.file as File);
        eduFileCounter++;
      }
      return record;
    });
    data.append('education', JSON.stringify(formattedEducation));

    let empFileCounter = 0;
    const formattedEmployment = employmentHistory.map((emp) => {
      const isNewFile = emp.file instanceof File;
      const record: any = {
        company: emp.company,
        position: emp.position,
        startDate: emp.startDate || null,
        endDate: emp.endDate || null,
        currentlyWorking: emp.currentlyWorking || false,
        isCurrentlyWorking: emp.currentlyWorking || emp.isCurrentlyWorking || false,
        isCurrentJob: emp.currentlyWorking || emp.isCurrentJob || false,
        responsibilities: emp.responsibilities || null,
        reasonForLeaving: emp.reasonForLeaving || null,
        documentUrl: emp.fileUrl || null,
      };
      if (isNewFile) {
        record.fileIndex = empFileCounter;
        data.append('employment_docs', emp.file as File);
        empFileCounter++;
      }
      return record;
    });
    data.append('employment_history', JSON.stringify(formattedEmployment));

    const breakdown = [...compensationSplits];
    if (formData.outstandingLoan) {
      breakdown.push({
        componentType: 'Outstanding Loan Recovery',
        amount: formData.outstandingLoan,
        frequency: 'Monthly',
      });
    }
    if (formData.outstandingAdvance) {
      breakdown.push({
        componentType: 'Salary Advance Recovery',
        amount: formData.outstandingAdvance,
        frequency: 'Monthly',
      });
    }
    data.append('compensation_breakdown', JSON.stringify(breakdown));

    // 4. Append files
    if (profilePhoto instanceof File) {
      data.append('profile_picture', profilePhoto);
    }
    if (passportFile instanceof File) {
      data.append('passport_doc', passportFile);
    }
    if (dlFile instanceof File) {
      data.append('dl_doc', dlFile);
    }
    if (panFile instanceof File) {
      data.append('pan_doc', panFile);
    }
    if (aadhaarFile instanceof File) {
      data.append('aadhaar_doc', aadhaarFile);
    }
    if (resumeFile instanceof File) {
      data.append('resume', resumeFile);
    }

    certificateFiles.forEach((f) => {
      if (f instanceof File) {
        data.append('certificate_files', f);
      }
    });

    otherDocuments.forEach((f) => {
      if (f instanceof File) {
        data.append('documents', f);
      }
    });

    return data;
  };

  const buildChangeRequestPayload = () => {
    const payload: Record<string, any> = {
      email: formData.primaryEmail,
      first_name: formData.firstName,
      last_name: formData.lastName,
      middle_name: formData.middleName || null,
      date_of_birth: formData.dateOfBirth || null,
      gender: formData.gender || null,
      nationality: formData.nationality || null,
      marital_status: formData.maritalStatus || null,
      blood_group: formData.bloodGroup || null,
      phone: formData.primaryPhone || null,
      secondary_phone: formData.secondaryPhone || null,
      secondary_email: formData.secondaryEmail || null,
      address: formData.primaryAddress || null,
      city: formData.primaryCity || null,
      state: formData.primaryState || null,
      zip: formData.primaryZip || null,
      country: formData.primaryCountry || null,
      secondary_address: formData.secondaryAddress || null,
      secondary_city: formData.secondaryCity || null,
      secondary_state: formData.secondaryState || null,
      secondary_zip: formData.secondaryZip || null,
      secondary_country: formData.secondaryCountry || null,
      emergency_contact: formData.emergencyContactName || null,
      emergency_relationship: formData.emergencyContactRelationship || null,
      emergency_phone: formData.emergencyContactPhone || null,
      emergency_email: formData.emergencyContactEmail || null,
      work_location: formData.location || null,
      work_schedule: formData.workSchedule || null,
      passport_number: formData.passportNumber || null,
      passport_expiry_date: formData.passportExpiry || null,
      driving_license_number: formData.drivingLicense || null,
      license_expiry_date: formData.licenseExpiry || null,
      pan_number: formData.panNumber || null,
      aadhaar_number: formData.aadhaarNumber || null,
      bank_name: formData.bankName || null,
      branch_name: formData.branchName || null,
      account_holder_name: formData.accountHolderName || null,
      account_number: formData.accountNumber || null,
      ifsc_code: formData.ifscCode || null,
    };

    const skillsArray = formData.skills ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    payload.skills = skillsArray;
    payload.languages = formData.languages || [];

    payload.certifications = (formData.certifications || []).map((cert: any) => ({
      name: cert.name,
      issuingOrganization: cert.issuingOrganization || null,
      issueDate: cert.issueDate || null,
      expiryDate: cert.expiryDate || null,
      credentialId: cert.credentialId || null,
      credentialUrl: cert.credentialUrl || null,
      documentUrl: cert.fileUrl || null,
    }));

    payload.education = educationHistory.map((edu) => ({
      level: normalizeQualificationLabel(edu.level),
      institution: edu.institution,
      degree: edu.degree || null,
      fieldOfStudy: edu.fieldOfStudy || null,
      board: edu.board || null,
      startDate: edu.startDate || null,
      endDate: edu.endDate || null,
      grade: edu.grade || null,
      currentlyStudying: edu.currentlyStudying || false,
      documentUrl: edu.fileUrl || null,
    }));

    payload.employment_history = employmentHistory.map((emp) => ({
      company: emp.company,
      position: emp.position,
      startDate: emp.startDate || null,
      endDate: emp.endDate || null,
      currentlyWorking: emp.currentlyWorking || false,
      isCurrentlyWorking: emp.currentlyWorking || emp.isCurrentlyWorking || false,
      isCurrentJob: emp.currentlyWorking || emp.isCurrentJob || false,
      responsibilities: emp.responsibilities || null,
      reasonForLeaving: emp.reasonForLeaving || null,
      documentUrl: emp.fileUrl || null,
    }));

    return payload;
  };

  const handleSaveDraft = async (redirect: boolean) => {
    setIsSavingDraft(true);
    try {
      if (isSelfEdit) {
        await submitChangeRequest(buildChangeRequestPayload());
        toast.success("Your changes have been submitted for approval");
      } else {
        const payload = buildPayloadFormData(true);
        if (activeEmployeeId) {
          await updateEmployee(activeEmployeeId, payload as any);
          toast.success("Draft updated successfully");
        } else {
          const response = await createEmployee(payload as any);
          toast.success("Draft saved successfully");
          if (response?.id) {
            setCreatedEmployeeId(response.id);
            navigate(`/employee-management/edit-employee/${response.id}`, { replace: true });
          }
        }
      }
      if (redirect) {
        setOriginalData(null);
        closeEditor();
      }
      return true;
    } catch (err: any) {
      const msg = err?.message || "Failed to save draft";
      if (typeof msg === "string" && msg.includes("\n")) {
        msg.split("\n").filter(Boolean).forEach((m: string) => toast.error(m));
      } else {
        toast.error(msg);
      }
      return false;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCancel = () => {
    closeEditor();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid) {
      validateSection(activeSection);
      setShowWarningBanner(true);
      scrollToWarningBanner();
      toast.error("Please fill all required fields correctly.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSelfEdit) {
        await submitChangeRequest(buildChangeRequestPayload());
        toast.success("Your changes have been submitted for approval");
      } else {
        const payload = buildPayloadFormData(false);
        if (activeEmployeeId) {
          await updateEmployee(activeEmployeeId, payload as any);
          toast.success("Employee updated successfully");
        } else {
          await createEmployee(payload as any);
          toast.success("Employee created successfully");
        }
      }
      setOriginalData(null);
      closeEditor();
    } catch (err: any) {
      const msg = err?.message || "Failed to save employee";
      if (typeof msg === "string" && msg.includes("\n")) {
        msg.split("\n").filter(Boolean).forEach((m: string) => toast.error(m));
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full  relative flex flex-col">
      <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className={drawerId ? "w-full" : "max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8"}>
            <div className={drawerId ? "bg-white dark:bg-card overflow-hidden min-h-screen" : "bg-white dark:bg-card rounded-[14px] border border-[#E6E8EE] dark:border-border shadow-[0_1px_2px_rgba(16,17,26,0.04)] overflow-hidden min-h-[calc(100vh-120px)]"}>
              <div className="border-b border-[#E6E8EE] dark:border-border bg-[#F9FAFB] dark:bg-muted/50 px-6 py-5 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    {!isEdit && (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Employee onboarding</p>
                    )}
                    <h2 className="text-[18px] font-semibold text-[#12131A] dark:text-foreground mt-1">{activeSectionMeta.label}</h2>
                    <p className="text-[13px] text-[#5B5F6E] dark:text-muted-foreground mt-1">{activeSectionMeta.description}</p>
                  </div>
                  {!id && (
                    <div className="flex items-center gap-2 rounded-full border border-[#E6E8EE] dark:border-border bg-white dark:bg-card px-3 py-2 shadow-sm">
                      <span className="text-[12px] font-medium text-[#5B5F6E] dark:text-muted-foreground">Step {currentStepIndex + 1}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                      <span className="text-[12px] font-medium text-[#5B5F6E] dark:text-muted-foreground">{sections.length}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {sections.map((section, index) => {
                    const isActive = activeSection === section.id;
                    const isCompleted = id ? true : index < highestStepVisitedIndex;
                    const isDisabled = !id && index > highestStepVisitedIndex + 1;

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => (id || !isDisabled) && navigateToStep(section.id)}
                        disabled={!id && isDisabled}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition-all ${isActive
                          ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary font-semibold"
                          : isCompleted
                            ? "border-border bg-card text-foreground hover:border-primary hover:text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
                          } ${(!id && isDisabled) ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${isActive || isCompleted ? "bg-primary text-white" : "bg-[#F1F3F7] dark:bg-muted text-[#5B5F6E] dark:text-muted-foreground"}`}>
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : <section.icon className="w-3.5 h-3.5" />}
                        </span>
                        {section.label}
                      </button>
                    );
                  })}
                </div>

                {isSelfEdit && (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 px-4 py-3">
                    <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Changes require approval</p>
                      <p className="text-[13px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                        Changes you make here will be submitted as a request and applied to your profile only after your reporting manager and HR approve them.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 sm:p-8 lg:p-10">
                {showWarningBanner && !isCurrentSectionValid && (
                  <div id="required-fields-banner" className="mb-6 p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 shadow-sm flex items-start gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 rounded-lg bg-amber-100/80 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                          Required Fields Missing in {activeSectionMeta.label}
                        </h4>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                          {currentMissingFields.length} {currentMissingFields.length === 1 ? 'field' : 'fields'} remaining
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-200/80 mt-1 leading-relaxed">
                        Please fill out the following mandatory fields to proceed:
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {currentMissingFields.map((fieldName, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-white dark:bg-card text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700 px-2.5 py-1 rounded-md shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                            {fieldName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(activeSection === "personal") && (
                  <div id="personal" className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-8 scroll-mt-24">

                    <div className="flex flex-col sm:flex-row gap-8 items-start mb-8">
                      {/* Profile Photo Upload */}
                      <div className="flex-shrink-0 relative group">
                        <label htmlFor="profile-photo-upload" className={`w-32 h-32 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-muted/30 ${profilePhotoPreview ? "border-transparent" : "border-muted hover:bg-muted/50"} ${formErrors.profilePhoto ? "border-red-500 bg-red-50/50" : ""}`}>
                          {profilePhotoPreview ? (
                            <img src={profilePhotoPreview} alt="Profile preview" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 p-4 text-center">
                              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-[11px] font-medium text-muted-foreground leading-tight">Click to change photo</span>
                            </div>
                          )}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="profile-photo-upload"
                          disabled={isFieldRestricted && !canEditPersonal}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setFormErrors(prev => ({ ...prev, profilePhoto: "File size must be less than 5MB" }));
                                return;
                              }
                              setProfilePhoto(file);
                              setProfilePhotoPreview(URL.createObjectURL(file));
                              setFormErrors(prev => {
                                const { profilePhoto: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                      </div>

                      <div className="flex-1 pt-2 space-y-3">
                        <div className="mb-4 border-b border-border pb-3 flex items-center gap-2">
                          <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Personal Information</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-md">
                          Maintain accurate personal records for organizational compliance. Please upload a <span className="text-blue-800 dark:text-blue-300 font-semibold">professional portrait</span> with a clear background.
                        </p>
                        <div className="flex items-center gap-4 text-[10px] font-normal text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Professional Portrait</span>
                          <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Max 5MB</span>
                        </div>
                        {formErrors.profilePhoto && (
                          <div className="py-1 px-3 bg-red-50 border-l-2 border-red-500 text-red-600 text-xs font-semibold animate-in fade-in slide-in-from-left-1">
                            {formErrors.profilePhoto}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          required
                          disabled={isFieldRestricted && !canEditPersonal}
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.firstName ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                          placeholder="Enter First Name"
                        />
                        {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          name="middleName"
                          value={formData.middleName}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={isFieldRestricted && !canEditPersonal}
                          className={`w-full px-3 py-2 border rounded focus:outline-none bg-card focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors.middleName ? 'border-red-500' : 'border-border'}`}
                          placeholder="Enter Middle Name"
                        />
                        {formErrors.middleName && <p className="text-xs text-red-500 mt-1">{formErrors.middleName}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={isFieldRestricted && !canEditPersonal}
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${(isFieldRestricted) ? 'bg-muted border-border text-muted-foreground' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                          placeholder="Enter Last Name"
                        />
                        {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <ModernDatePicker
                          value={formData.dateOfBirth}
                          onChange={(date) => {
                            updateField('dateOfBirth', date);
                            if (date) {
                              const birthDate = new Date(date);
                              const today = new Date();
                              let age = today.getFullYear() - birthDate.getFullYear();
                              const monthDiff = today.getMonth() - birthDate.getMonth();
                              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                              }
                              if (age < 18) {
                                toast.warning("The selected date of birth indicates the employee is under 18 years of age.");
                              }
                            }
                          }}
                          maxDate={new Date().toISOString().split('T')[0]}
                          disabled={isFieldRestricted && !canEditPersonal}
                          error={!!formErrors.dateOfBirth}
                          placeholder="Select Birth Date"
                        />
                        {formErrors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{formErrors.dateOfBirth}</p>}
                      </div>
                      <div>
                        <Select
                          value={formData.gender}
                          onChange={(val) => updateField("gender", val)}
                          label="Gender"
                          required
                          error={formErrors.gender}
                          placeholder="Select Gender"
                          disabled={isFieldRestricted && !canEditPersonal}
                          options={[
                            { value: "Male", label: "Male" },
                            { value: "Female", label: "Female" },
                            { value: "Other", label: "Other" },
                            { value: "Prefer not to say", label: "Prefer not to say" },
                          ]}
                        />
                      </div>

                      <div>
                        <Select
                          value={formData.maritalStatus}
                          onChange={(val) => updateField("maritalStatus", val)}
                          label="Marital Status"
                          placeholder="Select Marital Status"
                          options={[
                            { value: "Single", label: "Single" },
                            { value: "Married", label: "Married" },
                            { value: "Divorced", label: "Divorced" },
                            { value: "Widowed", label: "Widowed" },
                            { value: "Separated", label: "Separated" },
                          ]}
                        />
                      </div>
                      <div>
                        <Select
                          value={formData.bloodGroup}
                          onChange={(val) => updateField("bloodGroup", val)}
                          label="Blood Group"
                          placeholder="Select Blood Group"
                          disabled={isFieldRestricted && !canEditPersonal}
                          options={[
                            { value: "A+", label: "A+" },
                            { value: "A-", label: "A-" },
                            { value: "B+", label: "B+" },
                            { value: "B-", label: "B-" },
                            { value: "AB+", label: "AB+" },
                            { value: "AB-", label: "AB-" },
                            { value: "O+", label: "O+" },
                            { value: "O-", label: "O-" },
                          ]}
                        />
                      </div>

                      {/* Employee Status - Positioned below Blood Group */}
                      {isEdit && (
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-slate-500 dark:text-muted-foreground mb-2 font-semibold">Account Status</label>
                          <div className="flex items-center justify-between bg-muted/50 px-3 h-10 rounded border border-border transition-all hover:bg-muted group">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${formData.status ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                              <span className="text-[12px] font-medium text-slate-800 dark:text-foreground tracking-tight">
                                {formData.status ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <Switch
                              checked={formData.status}
                              disabled={lockJobAndPayroll && !canEditJob}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked, subStatus: "" }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Details Section */}
                {(activeSection === "personal") && (
                  <div id="contact" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-8 scroll-mt-24`}>
                    <div className="space-y-6">
                      <div className="pt-8 mt-8 mb-6 border-b border-border pb-3 flex items-center gap-3">
                        <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Primary Contact Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="primaryEmail"
                            value={formData.primaryEmail}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={isFieldRestricted && !canEditPersonal}
                            required
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.primaryEmail || duplicateFlags.email ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            placeholder="Enter Email Address"
                          />
                          {formErrors.primaryEmail && <p className="text-xs text-red-500 mt-1">{formErrors.primaryEmail}</p>}
                          {duplicateFlags.email && !formErrors.primaryEmail && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-normal">
                              <Loader2 className="w-3 h-3 animate-spin hidden" /> {/* Placeholder for consistency */}
                              Duplicate Email Found
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            name="primaryPhone"
                            value={formData.primaryPhone}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={isFieldRestricted && !canEditPersonal}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.primaryPhone || duplicateFlags.phone ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            placeholder="Enter Phone Number"
                          />
                          {formErrors.primaryPhone && <p className="text-xs text-red-500 mt-1">{formErrors.primaryPhone}</p>}
                          {duplicateFlags.phone && !formErrors.primaryPhone && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-normal">
                              Duplicate Phone Number Found
                            </p>
                          )}
                        </div>
                        <div>
                          <SearchableSelect
                            value={formData.primaryCountry}
                            onChange={(val) => {
                              updateField("primaryCountry", val);
                              updateField("primaryState", "");
                              updateField("primaryCity", "");
                            }}
                            label="Country"
                            disabled={isFieldRestricted && !canEditPersonal}
                            required
                            error={formErrors.primaryCountry}
                            placeholder="Select Country"
                            options={[
                              "India", "United States", "United Kingdom", "United Arab Emirates",
                              "Singapore", "Canada", "Australia", "Germany", "France",
                              "Netherlands", "Saudi Arabia", "South Africa", "Japan",
                              "China", "Brazil", "Mexico", "Italy", "Spain", "Malaysia", "Indonesia",
                              "Israel", "Ireland", "New Zealand", "Tanzania", "Kenya", "Nigeria", "Other"
                            ].map(c => ({ value: c, label: c }))}
                          />
                        </div>
                        <div className="sm:col-span-2 xl:col-span-3">
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                            Street Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="primaryAddress"
                            value={formData.primaryAddress}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={isFieldRestricted && !canEditPersonal}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.primaryAddress ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            placeholder="Enter Street Address"
                          />
                          {formErrors.primaryAddress && <p className="text-xs text-red-500 mt-1">{formErrors.primaryAddress}</p>}
                        </div>
                        <div>
                          {formData.primaryCountry === 'India' ? (
                            <SearchableSelect
                              value={formData.primaryState}
                              onChange={(val: string) => {
                                updateField("primaryState", val);
                                updateField("primaryCity", ""); // Reset city on state change
                              }}
                              label="State"
                              required
                              error={formErrors.primaryState}
                              placeholder="Select State"
                              disabled={(isFieldRestricted && !canEditPersonal) || !formData.primaryCountry}
                              options={indianStates.map(state => ({ value: state, label: state }))}
                            />
                          ) : formData.primaryCountry === 'United States' || formData.primaryCountry === 'USA' ? (
                            <SearchableSelect
                              value={formData.primaryState}
                              onChange={(val: string) => {
                                updateField("primaryState", val);
                                updateField("primaryCity", ""); // Reset city on state change
                              }}
                              label="State"
                              required
                              error={formErrors.primaryState}
                              placeholder="Select State"
                              disabled={(isFieldRestricted && !canEditPersonal) || !formData.primaryCountry}
                              options={usStates.map(state => ({ value: state, label: state }))}
                            />
                          ) : (
                            <>
                              <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                {(() => {
                                  const c = formData.primaryCountry;
                                  return c === 'Tanzania' ? 'Region' : c === 'United Kingdom' ? 'County' : 'State/Province';
                                })()} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="primaryState"
                                value={formData.primaryState}
                                onChange={handleInputChange}
                                onBlur={handleInputChange}
                                disabled={isFieldRestricted && !canEditPersonal}
                                className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.primaryState ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                                placeholder={`Enter State/Province`}
                              />
                              {formErrors.primaryState && <p className="text-xs text-red-500 mt-1">{formErrors.primaryState}</p>}
                            </>
                          )}
                        </div>
                        <div>
                          {(() => {
                            const state = formData.primaryState;
                            const citiesForState = state ? stateCities[state] : null;
                            const showCitySelect = citiesForState && citiesForState.length > 0;
                            const isCustomCity = formData.primaryCity && showCitySelect && !citiesForState.includes(formData.primaryCity);
                            
                            return showCitySelect ? (
                              <SearchableSelect
                                value={isCustomCity || formData.primaryCity === "Other" ? "Other" : formData.primaryCity}
                                onChange={(val: string) => {
                                  updateField("primaryCity", val);
                                }}
                                label="City"
                                required
                                error={formErrors.primaryCity}
                                placeholder="Select City"
                                disabled={(isFieldRestricted && !canEditPersonal) || !formData.primaryState}
                                options={[
                                  ...citiesForState.map(c => ({ value: c, label: c })),
                                  { value: "Other", label: "Other (Enter Manually)" }
                                ]}
                              />
                            ) : (
                              <>
                                <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                  City <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  name="primaryCity"
                                  value={formData.primaryCity}
                                  onChange={handleInputChange}
                                  onBlur={handleInputChange}
                                  disabled={isFieldRestricted && !canEditPersonal}
                                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.primaryCity ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                                  placeholder="Enter City"
                                />
                                {formErrors.primaryCity && <p className="text-xs text-red-500 mt-1">{formErrors.primaryCity}</p>}
                              </>
                            );
                          })()}
                        </div>

                        {(() => {
                          const state = formData.primaryState;
                          const citiesForState = state ? stateCities[state] : null;
                          const showCitySelect = citiesForState && citiesForState.length > 0;
                          const isCustomCity = formData.primaryCity && showCitySelect && !citiesForState.includes(formData.primaryCity);
                          
                          if (showCitySelect && (isCustomCity || formData.primaryCity === "Other")) {
                            return (
                              <div className="animate-in fade-in slide-in-from-top-1">
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                  Specify City Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  name="primaryCity"
                                  value={formData.primaryCity === "Other" ? "" : formData.primaryCity}
                                  onChange={handleInputChange}
                                  onBlur={handleInputChange}
                                  disabled={isFieldRestricted && !canEditPersonal}
                                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.primaryCity ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                                  placeholder="Type city name"
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                            {(() => {
                              const c = formData.primaryCountry;
                              return c === 'India' ? 'PIN Code' : c === 'United States' || c === 'USA' ? 'Zip Code' : c === 'United Kingdom' ? 'Postcode' : 'ZIP/Postal Code';
                            })()} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="primaryZip"
                            value={formData.primaryZip}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={isFieldRestricted && !canEditPersonal}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.primaryZip ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            placeholder={`Enter ${(() => {
                              const c = formData.primaryCountry;
                              return c === 'India' ? 'PIN Code' : c === 'United States' || c === 'USA' ? 'Zip Code' : c === 'United Kingdom' ? 'Postcode' : 'ZIP/Postal Code';
                            })()}`}
                          />
                          {formErrors.primaryZip && <p className="text-xs text-red-500 mt-1">{formErrors.primaryZip}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border space-y-6">
                      <div className="pt-8 mt-6 mb-6 border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Secondary Contact Information (Optional)</h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            name="secondaryEmail"
                            value={formData.secondaryEmail}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={isFieldRestricted && !canEditPersonal}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.secondaryEmail ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            placeholder="Enter Email Address"
                          />
                          {formErrors.secondaryEmail && <p className="text-xs text-red-500 mt-1">{formErrors.secondaryEmail}</p>}
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="secondaryPhone"
                            value={formData.secondaryPhone}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={isFieldRestricted && !canEditPersonal}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.secondaryPhone ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            placeholder="Enter Phone Number"
                          />
                          {formErrors.secondaryPhone && <p className="text-xs text-red-500 mt-1">{formErrors.secondaryPhone}</p>}
                        </div>
                        <div className="md:col-span-3">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
                              Street Address
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group select-none">
                              <div className="relative flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={sameAsPrimary}
                                  onChange={(e) => handleSameAsPrimaryChange(e.target.checked)}
                                  className="sr-only"
                                />
                                <div className={`w-[18px] h-[18px] rounded border transition-all duration-200 flex items-center justify-center group-hover:border-primary/80 ${sameAsPrimary ? 'border-primary bg-primary shadow-sm shadow-primary/20' : 'border-slate-300 dark:border-gray-600 bg-card'}`}>
                                  <svg
                                    className={`w-3.5 h-3.5 text-white transition-all duration-200 ease-out transform ${sameAsPrimary ? 'scale-100 rotate-0 opacity-100' : 'scale-75 opacity-0 -rotate-12'}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-foreground/90 group-hover:text-primary transition-colors duration-200">
                                Same as Primary Address
                              </span>
                            </label>
                          </div>
                          <input
                            type="text"
                            name="secondaryAddress"
                            value={formData.secondaryAddress}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal)}
                            className={`w-full h-11 px-4 text-[14px] font-medium text-slate-800 dark:text-foreground bg-slate-50/50 dark:bg-muted/50 border border-slate-200 dark:border-border rounded focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 hover:bg-white dark:hover:bg-card transition-all duration-200 shadow-sm ${sameAsPrimary ? 'opacity-65 cursor-not-allowed bg-slate-100/80 dark:bg-muted/80' : ''}`}
                            placeholder="Enter Street Address"
                          />
                        </div>
                        <div>
                          {formData.secondaryCountry === 'India' ? (
                            <SearchableSelect
                              value={formData.secondaryState}
                              onChange={(val: string) => {
                                updateField("secondaryState", val);
                                updateField("secondaryCity", ""); // Reset city on state change
                              }}
                              label="State"
                              error={formErrors.secondaryState}
                              placeholder="Select State"
                              disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal) || !formData.secondaryCountry}
                              options={indianStates.map(state => ({ value: state, label: state }))}
                            />
                          ) : formData.secondaryCountry === 'United States' || formData.secondaryCountry === 'USA' ? (
                            <SearchableSelect
                              value={formData.secondaryState}
                              onChange={(val: string) => {
                                updateField("secondaryState", val);
                                updateField("secondaryCity", ""); // Reset city on state change
                              }}
                              label="State"
                              error={formErrors.secondaryState}
                              placeholder="Select State"
                              disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal) || !formData.secondaryCountry}
                              options={usStates.map(state => ({ value: state, label: state }))}
                            />
                          ) : (
                            <>
                              <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                {(() => {
                                  const c = formData.secondaryCountry;
                                  return c === 'Tanzania' ? 'Region' : c === 'United Kingdom' ? 'County' : 'State/Province';
                                })()}
                              </label>
                              <input
                                type="text"
                                name="secondaryState"
                                value={formData.secondaryState}
                                onChange={handleInputChange}
                                onBlur={handleInputChange}
                                disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal)}
                                className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.secondaryState ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'} ${sameAsPrimary ? 'opacity-65 cursor-not-allowed bg-slate-100/80 dark:bg-muted/80' : ''}`}
                                placeholder={`Enter State/Province`}
                              />
                              {formErrors.secondaryState && <p className="text-xs text-red-500 mt-1">{formErrors.secondaryState}</p>}
                            </>
                          )}
                        </div>
                        <div>
                          {(() => {
                            const state = formData.secondaryState;
                            const citiesForState = state ? stateCities[state] : null;
                            const showCitySelect = citiesForState && citiesForState.length > 0;
                            const isCustomCity = formData.secondaryCity && showCitySelect && !citiesForState.includes(formData.secondaryCity);
                            
                            return showCitySelect ? (
                              <SearchableSelect
                                value={isCustomCity || formData.secondaryCity === "Other" ? "Other" : formData.secondaryCity}
                                onChange={(val: string) => {
                                  updateField("secondaryCity", val);
                                }}
                                label="City"
                                error={formErrors.secondaryCity}
                                placeholder="Select City"
                                disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal) || !formData.secondaryState}
                                options={[
                                  ...citiesForState.map(c => ({ value: c, label: c })),
                                  { value: "Other", label: "Other (Enter Manually)" }
                                ]}
                              />
                            ) : (
                              <>
                                <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                  City
                                </label>
                                <input
                                  type="text"
                                  name="secondaryCity"
                                  value={formData.secondaryCity}
                                  onChange={handleInputChange}
                                  onBlur={handleInputChange}
                                  disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal)}
                                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.secondaryCity ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'} ${sameAsPrimary ? 'opacity-65 cursor-not-allowed bg-slate-100/80 dark:bg-muted/80' : ''}`}
                                  placeholder="Enter City"
                                />
                                {formErrors.secondaryCity && <p className="text-xs text-red-500 mt-1">{formErrors.secondaryCity}</p>}
                              </>
                            );
                          })()}
                        </div>

                        {(() => {
                          const state = formData.secondaryState;
                          const citiesForState = state ? stateCities[state] : null;
                          const showCitySelect = citiesForState && citiesForState.length > 0;
                          const isCustomCity = formData.secondaryCity && showCitySelect && !citiesForState.includes(formData.secondaryCity);
                          
                          if (showCitySelect && (isCustomCity || formData.secondaryCity === "Other")) {
                            return (
                              <div className="animate-in fade-in slide-in-from-top-1">
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                  Specify City Name
                                </label>
                                <input
                                  type="text"
                                  name="secondaryCity"
                                  value={formData.secondaryCity === "Other" ? "" : formData.secondaryCity}
                                  onChange={handleInputChange}
                                  onBlur={handleInputChange}
                                  disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal)}
                                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.secondaryCity ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'} ${sameAsPrimary ? 'opacity-65 cursor-not-allowed bg-slate-100/80 dark:bg-muted/80' : ''}`}
                                  placeholder="Type city name"
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div>
                          <SearchableSelect
                            value={formData.secondaryCountry}
                            onChange={(val) => {
                              updateField("secondaryCountry", val);
                              updateField("secondaryState", "");
                              updateField("secondaryCity", "");
                            }}
                            label="Country"
                            error={formErrors.secondaryCountry}
                            placeholder="Select Country"
                            disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal)}
                            options={[
                              "India", "United States", "United Kingdom", "United Arab Emirates",
                              "Singapore", "Canada", "Australia", "Germany", "France",
                              "Netherlands", "Saudi Arabia", "South Africa", "Japan",
                              "China", "Brazil", "Mexico", "Italy", "Spain", "Malaysia", "Indonesia",
                              "Israel", "Ireland", "New Zealand", "Tanzania", "Kenya", "Nigeria", "Other"
                            ].map(c => ({ value: c, label: c }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                            {(() => {
                              const c = formData.secondaryCountry;
                              return c === 'India' ? 'PIN Code' : c === 'United States' || c === 'USA' ? 'Zip Code' : c === 'United Kingdom' ? 'Postcode' : 'ZIP/Postal Code';
                            })()}
                          </label>
                          <input
                            type="text"
                            name="secondaryZip"
                            value={formData.secondaryZip}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={sameAsPrimary || (isFieldRestricted && !canEditPersonal)}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.secondaryZip ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'} ${sameAsPrimary ? 'opacity-65 cursor-not-allowed bg-slate-100/80 dark:bg-muted/80' : ''}`}
                            placeholder={`Enter ${(() => {
                              const c = formData.secondaryCountry;
                              return c === 'India' ? 'PIN Code' : c === 'United States' || c === 'USA' ? 'Zip Code' : c === 'United Kingdom' ? 'Postcode' : 'ZIP/Postal Code';
                            })()}`}
                          />
                          {formErrors.secondaryZip && <p className="text-xs text-red-500 mt-1">{formErrors.secondaryZip}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact Section */}
                {(activeSection === "personal") && (
                  <div id="emergency" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24`}>
                    <div className="pt-8 mt-8 mb-6 border-b border-border pb-3 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Emergency Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Contact Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="emergencyContactName"
                          value={formData.emergencyContactName}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={isFieldRestricted && !canEditPersonal}
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.emergencyContactName ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                          placeholder="Enter Contact Name"
                        />
                        {formErrors.emergencyContactName && <p className="text-xs text-red-500 mt-1">{formErrors.emergencyContactName}</p>}
                      </div>
                      <div>
                        <Select
                          value={formData.emergencyContactRelationship}
                          onChange={(val) => updateField("emergencyContactRelationship", val)}
                          label="Relationship"
                          disabled={isFieldRestricted && !canEditPersonal}
                          required
                          error={formErrors.emergencyContactRelationship}
                          placeholder="Select Relationship"
                          options={[
                            { value: "Spouse", label: "Spouse" },
                            { value: "Parent", label: "Parent" },
                            { value: "Sibling", label: "Sibling" },
                            { value: "Child", label: "Child" },
                            { value: "Friend", label: "Friend" },
                            { value: "Other", label: "Other" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          value={formData.emergencyContactPhone}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={isFieldRestricted && !canEditPersonal}
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.emergencyContactPhone ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                          placeholder="Enter Phone Number"
                        />
                        {formErrors.emergencyContactPhone && <p className="text-xs text-red-500 mt-1">{formErrors.emergencyContactPhone}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="emergencyContactEmail"
                          value={formData.emergencyContactEmail}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={isFieldRestricted && !canEditPersonal}
                          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.emergencyContactEmail ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                          placeholder="Enter Email Address"
                        />
                        {formErrors.emergencyContactEmail && <p className="text-xs text-red-500 mt-1">{formErrors.emergencyContactEmail}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Compensation Section */}
                {activeSection === "compensation" && (
                  <CompensationSection
                    formData={formData}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
                    handleInputChange={handleInputChange}
                    isEmployee={isEmployee}
                    id={id}
                    compensationSplits={compensationSplits}
                    setCompensationSplits={setCompensationSplits}
                    payrollGroups={payrollGroups}
                    isSuperAdmin={isSuperAdmin}
                    canManagePayroll={canManagePayroll}
                    readOnly={lockJobAndPayroll && !canEditPayroll}
                  />
                )}

                {/* Family Members Section */}
                {(activeSection === "personal") && (
                  <div id="family" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24`}>
                    <div className="flex items-center justify-between border-b border-border pb-3 pt-8 mt-6">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Family Members</h3>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addFamilyMember}
                        className="gap-2 h-11"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add Family Member
                      </Button>
                    </div>
                    {familyMembers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No family members added yet</p>
                        <p className="text-sm">Click "Add Family Member" to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {familyMembers.map((member, index) => (
                          <div key={index} className="p-4 bg-muted rounded border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-[12px] font-medium text-slate-500 dark:text-muted-foreground">Family Member #{index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => removeFamilyMember(index)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                              <div>
                                <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Full Name <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  name={`family_${index}_name`}
                                  value={member.name}
                                  onChange={(e) => updateFamilyMember(index, "name", e.target.value)}
                                  onBlur={(e) => handleFamilyMemberBlur(index, "name", e.target.value)}
                                  className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors[`family_${index}_name`] ? 'border-red-500' : 'border-border'}`}
                                  placeholder="Jane Doe"
                                />
                                {formErrors[`family_${index}_name`] && <p className="text-xs text-red-500 mt-1">{formErrors[`family_${index}_name`]}</p>}
                              </div>
                              <div>
                                <Select
                                  value={member.relationship}
                                  onChange={(val) => updateFamilyMember(index, "relationship", val)}
                                  onBlur={() => handleFamilyMemberBlur(index, "relationship", member.relationship)}
                                  label="Relationship"
                                  required
                                  error={formErrors[`family_${index}_relationship`]}
                                  placeholder="Select Relationship"
                                  options={[
                                    { value: "Spouse", label: "Spouse" },
                                    { value: "Child", label: "Child" },
                                    { value: "Parent", label: "Parent" },
                                    { value: "Sibling", label: "Sibling" },
                                    { value: "Other", label: "Other" },
                                  ]}
                                />
                              </div>
                              <div>
                                <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Date of Birth</label>
                                <ModernDatePicker
                                  value={member.dateOfBirth}
                                  onChange={(date) => {
                                    updateFamilyMember(index, "dateOfBirth", date);
                                    handleFamilyMemberBlur(index, "dateOfBirth", date);
                                  }}
                                  error={!!formErrors[`family_${index}_dateOfBirth`]}
                                  placeholder="Select Birth Date"
                                />
                                {formErrors[`family_${index}_dateOfBirth`] && <p className="text-xs text-red-500 mt-1">{formErrors[`family_${index}_dateOfBirth`]}</p>}
                              </div>
                              <div>
                                <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Phone Number <span className="text-red-500">*</span></label>
                                <input
                                  type="tel"
                                  name={`family_${index}_phone`}
                                  value={member.phone}
                                  onChange={(e) => updateFamilyMember(index, "phone", e.target.value)}
                                  onBlur={(e) => handleFamilyMemberBlur(index, "phone", e.target.value)}
                                  className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors[`family_${index}_phone`] ? 'border-red-500' : 'border-border'}`}
                                  placeholder="+1 (555) 123-4567"
                                />
                                {formErrors[`family_${index}_phone`] && <p className="text-xs text-red-500 mt-1">{formErrors[`family_${index}_phone`]}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Education History Section */}
                {(activeSection === "job") && (
                  <div id="job" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24`}>
                    <div className="mb-6 border-b border-border flex items-center gap-3 pb-3">
                      <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Job Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Employee ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="employeeId"
                          value={formData.employeeId}
                          onChange={handleInputChange}
                          readOnly
                          className="w-full h-11 px-4 text-[14px] font-medium text-slate-800 dark:text-foreground dark:text-foreground bg-slate-50/50 dark:bg-muted/50 border border-slate-200 dark:border-border rounded focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 hover:bg-white dark:hover:bg-card transition-all duration-200 shadow-sm"
                          placeholder="Enter Employee ID" />
                      </div>
                      <div>
                        <Select
                          value={formData.branchId || formData.location}
                          onChange={(val) => {
                            if (val === 'remote') {
                              setFormData(prev => ({
                                ...prev,
                                location: 'Remote',
                                branchId: 'remote',
                                department: '',
                                teamId: '',
                                manager: ''
                              }));
                              setFormErrors(prev => {
                                const { location, department, ...rest } = prev;
                                return rest;
                              });
                            } else {
                              const selectedBranch = locationsList.find(loc => loc.id.toString() === val);
                              const branchName = selectedBranch ? selectedBranch.name.split(' (')[0] : '';
                              setFormData(prev => ({
                                ...prev,
                                location: branchName,
                                branchId: val,
                                department: '',
                                teamId: '',
                                manager: '',
                                remoteLocation: ''
                              }));
                              setFormErrors(prev => {
                                const { location, department, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          label="Work Location"
                          required
                          error={formErrors.location || errorStates.locations}
                          disabled={(lockJobAndPayroll && !canEditJob) || loadingStates.locations}
                          placeholder={loadingStates.locations ? "Loading Branches..." : (locationsList.length === 0 ? "No locations available" : "Select Work Location")}
                          options={locationsList.map(loc => ({ value: loc.id.toString(), label: capitalizeFirstLetter(loc.name || "") }))}
                        />
                      </div>

                      {formData.location === "Remote" && (
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                            Remote Location <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="remoteLocation"
                            value={formData.remoteLocation}
                            onChange={handleInputChange}
                            onBlur={handleInputChange}
                            disabled={lockJobAndPayroll && !canEditJob}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-4 transition-all duration-200 hover:border-blue-300/80 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 focus:bg-transparent shadow-sm ${formErrors.remoteLocation ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30 dark:bg-red-950/30 text-red-900 dark:text-red-300' : 'border-slate-200 dark:border-border bg-card focus:ring-blue-500/10 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            placeholder="Enter Remote Location (e.g. City, Country)"
                          />
                          {formErrors.remoteLocation && <p className="text-xs text-red-500 mt-1">{formErrors.remoteLocation}</p>}
                        </div>
                      )}

                      <div>
                        <Select
                          value={formData.employeeType}
                          onChange={(val) => {
                            updateField("employeeType", val);
                            if (val !== "Contract") {
                              updateField("contractStartDate", "");
                              updateField("contractEndDate", "");
                            }
                          }}
                          label="Employment Type"
                          required
                          disabled={lockJobAndPayroll && !canEditJob}
                          error={formErrors.employeeType}
                          placeholder="Select Employment Type"
                          options={[
                            { value: "Full-Time", label: "Full-Time" },
                            { value: "Part-Time", label: "Part-Time" },
                            { value: "Contract", label: "Contract" },
                            { value: "Consultant", label: "Consultant" },
                            { value: "Intern", label: "Intern" },
                          ]}
                        />
                      </div>

                      {formData.employeeType === "Contract" && (
                        <div className="col-span-full border border-dashed border-border p-4 rounded bg-muted/20 space-y-4">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Contract Period</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                Start Date <span className="text-red-500">*</span>
                              </label>
                              <ModernDatePicker
                                value={formData.contractStartDate}
                                onChange={(date) => updateField('contractStartDate', date)}
                                disabled={lockJobAndPayroll && !canEditJob}
                                error={!!formErrors.contractStartDate}
                                placeholder="Select Contract Start"
                              />
                              {formErrors.contractStartDate && <p className="text-xs text-red-500 mt-1">{formErrors.contractStartDate}</p>}
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                                End Date <span className="text-red-500">*</span>
                              </label>
                              <ModernDatePicker
                                value={formData.contractEndDate}
                                onChange={(date) => updateField('contractEndDate', date)}
                                disabled={lockJobAndPayroll && !canEditJob}
                                error={!!formErrors.contractEndDate}
                                placeholder="Select Contract End"
                              />
                              {formErrors.contractEndDate && <p className="text-xs text-red-500 mt-1">{formErrors.contractEndDate}</p>}
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <ModernDatePicker
                          value={formData.startDate}
                          onChange={(date) => updateField('startDate', date)}
                          disabled={lockJobAndPayroll && !canEditJob}
                          error={!!formErrors.startDate}
                          placeholder="Select Start Date"
                        />
                        {formErrors.startDate && <p className="text-xs text-red-500 mt-1">{formErrors.startDate}</p>}
                      </div>
                      <div>
                        <Select
                          value={formData.department}
                          onChange={(val) => updateField("department", val)}
                          label="Department"
                          required
                          error={formErrors.department}
                          disabled={(lockJobAndPayroll && !canEditJob) || loadingStates.departments}
                          placeholder={loadingStates.departments ? "Loading Departments..." : "Select Department"}
                          options={departmentsList
                            .map((dep) => ({
                              value: String(dep.id),
                              label: dep.name || dep.department_name
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Select
                          value={formData.teamId}
                          onChange={(val) => updateField("teamId", val)}
                          label="Team"
                          error={formErrors.teamId}
                          disabled={(lockJobAndPayroll && !canEditJob) || loadingStates.teams || !formData.department}
                          placeholder={
                            !formData.department
                              ? "Select Department first"
                              : (loadingStates.teams ? "Loading Teams..." : (availableTeams.length === 0 ? "No teams in this department" : "Select Team"))
                          }
                          options={availableTeams.map((t) => ({
                            value: String(t.id),
                            label: t.team_name || t.name
                          }))}
                        />
                      </div>
                      <div>
                        <Select
                          value={formData.designationId}
                          onChange={(val) => updateField("designationId", val)}
                          label="Designation"
                          required
                          error={formErrors.designationId}
                          disabled={(lockJobAndPayroll && !canEditJob) || loadingStates.designations}
                          placeholder={loadingStates.designations ? "Loading Designations..." : "Select Designation"}
                          options={designationsList
                            .filter(desig => !formData.department || !desig.department_id || desig.department_id.toString() === formData.department)
                            .map((desig) => ({
                              value: String(desig.id),
                              label: desig.name
                            }))
                          }
                        />
                      </div>
                      {/* {formData.department && managersList.length > 0 && ( */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-500 dark:text-muted-foreground">
                            Reporting Manager                           <span className="text-gray-400 dark:text-muted-foreground font-normal ml-1"></span>
                          </label>
                          {loadingStates.managers && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        </div>
                        <input
                          type="text"
                          readOnly
                          name="managerDisplay"
                          value={
                            loadingStates.managers
                              ? "Loading Manager..."
                              : !formData.department
                                ? "Select Department First"
                                : managersList[0]
                                  ? toTitleCase(`${managersList[0].details?.first_name || ""} ${managersList[0].details?.last_name || managersList[0].username || ""}`.trim())
                                  : "No Assigned Manager"
                          }
                          disabled={!formData.department || loadingStates.managers}
                          className={`w-full px-3 py-2 border rounded focus:outline-none transition-all ${(!formData.department || loadingStates.managers)
                              ? 'bg-gray-50 dark:bg-muted border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground cursor-not-allowed'
                              : 'bg-blue-50/10 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-foreground font-medium'
                            }`}
                        />
                        {errorStates.managers && <p className="text-xs text-red-500 mt-1">{errorStates.managers}</p>}
                        {formErrors.manager && !errorStates.managers && <p className="text-xs text-red-500 mt-1">{formErrors.manager}</p>}
                      </div>
                      {/* )} */}
                      <div>
                        {!areShiftsEnabled || !organizationShifts || organizationShifts.length === 0 ? (
                          <div>
                            <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                              Work Schedule
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={fixedScheduleLabel}
                              className="w-full px-3 py-2 border rounded bg-muted font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-border cursor-not-allowed text-xs"
                            />
                          </div>
                        ) : (
                          <Select
                            value={formData.workSchedule}
                            onChange={(val) => updateField("workSchedule", val)}
                            label="Work Schedule"
                            disabled={lockJobAndPayroll && !canEditJob}
                            error={formErrors.workSchedule}
                            placeholder="Select Schedule"
                            options={[
                              { value: "Fixed Schedule", label: fixedScheduleLabel },
                              ...organizationShifts.map((s: any) => ({
                                value: s.name || `Shift-${s.id}`,
                                label: `${s.name || 'Shift'} (${s.start_time || s.startTime || ''} - ${s.end_time || s.endTime || ''})`
                              }))
                            ]}
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Probation Period (months)
                        </label>
                        <input
                          type="number"
                          name="probationPeriod"
                          value={formData.probationPeriod}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={lockJobAndPayroll && !canEditJob}
                          className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors.probationPeriod ? 'border-red-500' : 'border-border'}`}
                          placeholder="Enter Probation Period" />
                        {formErrors.probationPeriod && <p className="text-xs text-red-500 mt-1">{formErrors.probationPeriod}</p>}
                      </div>
                      <div>
                        <Select
                          value={formData.role}
                          onChange={(val) => updateField("role", val)}
                          label="Role"
                          required
                          error={formErrors.role || errorStates.roles}
                          disabled={(lockJobAndPayroll && !canEditJob) || loadingStates.roles}
                          placeholder={loadingStates.roles ? "Loading Roles..." : "Select Role"}
                          options={rolesList
                            .filter(role => (user?.role === UserRole.SUPER_ADMIN || !role.name.toLowerCase().includes('super admin')) && role.name.toLowerCase() !== 'employee')
                            .map((role: any) => ({
                              value: String(role.id),
                              label: toTitleCase(role.name || role.role_name)
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}



                {activeSection === "education" && (
                  <EducationSection
                    educationHistory={educationHistory}
                    setEducationHistory={setEducationHistory}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
                    shouldRestrictFields={shouldRestrictFields}
                  />
                )}

                {/* Employment History Section */}
                {activeSection === "employment" && (
                  <EmploymentSection
                    employmentHistory={employmentHistory}
                    setEmploymentHistory={setEmploymentHistory}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
                    shouldRestrictFields={shouldRestrictFields}
                  />
                )}

                {activeSection === "documents" && (
                  <DocumentSection
                    passportFile={passportFile}
                    setPassportFile={setPassportFile}
                    dlFile={dlFile}
                    setDlFile={setDlFile}
                    panFile={panFile}
                    setPanFile={setPanFile}
                    aadhaarFile={aadhaarFile}
                    setAadhaarFile={setAadhaarFile}
                    resumeFile={resumeFile}
                    setResumeFile={setResumeFile}
                    certificateFiles={certificateFiles}
                    setCertificateFiles={setCertificateFiles}
                    otherDocuments={otherDocuments}
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    formErrors={formErrors}
                  />
                )}

                {/* Bank Details Section */}
                {(activeSection === "compensation") && (
                  <div id="bank" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24`}>
                    <div className="pt-8 mt-6 mb-6 border-b border-border pb-3 flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Bank Account Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div>
                        <Combobox
                          label="Bank Name"
                          name="bankName"
                          id="bankName"
                          options={banksList}
                          value={formData.bankName}
                          disabled={lockJobAndPayroll && !canEditBank}
                          onChange={(val) => {
                            setFormData(prev => ({ ...prev, bankName: val }));
                            const err = validateField("bankName", val, true, true);
                            setFormErrors(prev => {
                              if (err) return { ...prev, bankName: err };
                              const { bankName, ...rest } = prev;
                              return rest;
                            });
                          }}
                          placeholder="Select or type Bank Name"
                          required
                          error={formErrors.bankName}
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Branch Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="branchName"
                          value={formData.branchName}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={lockJobAndPayroll && !canEditBank}
                          className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors.branchName ? 'border-red-500' : 'border-border'}`}
                          placeholder="Downtown Branch"
                        />
                        {formErrors.branchName && <p className="text-xs text-red-500 mt-1">{formErrors.branchName}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Account Holder Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="accountHolderName"
                          value={formData.accountHolderName}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={lockJobAndPayroll && !canEditBank}
                          className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors.accountHolderName ? 'border-red-500' : 'border-border'}`}
                          placeholder="John Doe"
                        />
                        {formErrors.accountHolderName && <p className="text-xs text-red-500 mt-1">{formErrors.accountHolderName}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={lockJobAndPayroll && !canEditBank}
                          className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors.accountNumber ? 'border-red-500' : 'border-border'}`}
                          placeholder="1234567890"
                        />
                        {formErrors.accountNumber && <p className="text-xs text-red-500 mt-1">{formErrors.accountNumber}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                          IFSC Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="ifscCode"
                          value={formData.ifscCode}
                          onChange={handleInputChange}
                          onBlur={handleInputChange}
                          disabled={lockJobAndPayroll && !canEditBank}
                          className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors.ifscCode ? 'border-red-500' : 'border-border'}`}
                          placeholder="SBIN0001234"
                        />
                        {formErrors.ifscCode && <p className="text-xs text-red-500 mt-1">{formErrors.ifscCode}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills & Certifications Section */}
                {(activeSection === "skills") && (
                  <div id="skills" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24`}>
                    <div className="mb-6 border-b border-border pb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">Skills & Certifications</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-4 p-5 bg-slate-50/50 dark:bg-muted/10 border border-slate-100 dark:border-border rounded-xl">
                        <div className="flex items-center justify-between">
                          <label className="block text-[12px] font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                            Skills
                          </label>
                          {!isAddingSkill && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingSkill(true);
                                setEditingSkillIndex(null);
                                setSelectedNewSkill("");
                              }}
                              className="h-9 px-4 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-blue-100"
                            >
                              <PlusCircle className="w-4.5 h-4.5" /> Add
                            </button>
                          )}
                        </div>

                        {/* List of currently added skills */}
                        {(() => {
                          const skillsList = formData.skills ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                          return skillsList.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2.5 pt-1 mb-3">
                              {skillsList.map((skill: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
                                  onClick={() => {
                                    setIsAddingSkill(true);
                                    setEditingSkillIndex(index);
                                    setSelectedNewSkill(skill);
                                  }}
                                  title="Click to Edit"
                                >
                                  <span>{skill}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            !isAddingSkill && (
                              <div className="text-center p-6 border border-dashed border-border rounded-xl bg-card">
                                <p className="text-xs text-muted-foreground">No skills added yet. Click "Add" to specify.</p>
                              </div>
                            )
                          );
                        })()}

                        {/* Add new skill form */}
                        {isAddingSkill && (
                          <div className="space-y-4 p-5 border border-blue-100 dark:border-blue-950 rounded-xl bg-blue-50/10 dark:bg-blue-950/5 shadow-sm animate-in slide-in-from-top-2 duration-300">
                            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                              {editingSkillIndex !== null ? "Edit Skill Record" : "New Skill Record"}
                            </h4>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Skill Name</label>
                              <input
                                type="text"
                                value={selectedNewSkill}
                                onChange={(e) => {
                                  setSelectedNewSkill(e.target.value);
                                  setFormErrors((prev: any) => {
                                    const { skills, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                className="w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 border-border"
                                placeholder="Enter Skill (e.g. React, Python)"
                              />
                            </div>
                            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                              {editingSkillIndex !== null && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const skillsList = formData.skills ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                                    const updated = skillsList.filter((_: any, i: number) => i !== editingSkillIndex);
                                    setFormData((prev: any) => ({ ...prev, skills: updated.join(', ') }));
                                    setIsAddingSkill(false);
                                    setEditingSkillIndex(null);
                                    setSelectedNewSkill("");
                                  }}
                                  className="h-9 px-4 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg transition-all mr-auto"
                                >
                                  Delete Skill
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingSkill(false);
                                  setEditingSkillIndex(null);
                                  setSelectedNewSkill("");
                                }}
                                className="h-9 px-4 text-xs font-bold text-muted-foreground hover:bg-muted border border-border rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!selectedNewSkill.trim()) {
                                    setFormErrors((prev: any) => ({ ...prev, skills: "Please enter a skill first." }));
                                    return;
                                  }

                                  const skillsList = formData.skills ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                                  
                                  const duplicateExists = skillsList.some((s: string, idx: number) => {
                                    if (idx === editingSkillIndex) return false;
                                    return s.toLowerCase() === selectedNewSkill.trim().toLowerCase();
                                  });

                                  if (duplicateExists) {
                                    toast.error(`"${selectedNewSkill.trim()}" is already added.`);
                                    return;
                                  }

                                  let updated;
                                  if (editingSkillIndex !== null) {
                                    updated = [...skillsList];
                                    updated[editingSkillIndex] = selectedNewSkill.trim();
                                  } else {
                                    updated = [...skillsList, selectedNewSkill.trim()];
                                  }

                                  setFormData((prev: any) => ({ ...prev, skills: updated.join(', ') }));
                                  setIsAddingSkill(false);
                                  setEditingSkillIndex(null);
                                  setSelectedNewSkill("");
                                  setFormErrors((prev: any) => {
                                    const { skills, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                className="h-9 px-4 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                              >
                                Save Skill
                              </button>
                            </div>
                          </div>
                        )}
                        {formErrors.skills && <p className="text-xs text-red-500 mt-1 font-medium">{formErrors.skills}</p>}
                      </div>
                       <div className="space-y-4 p-5 bg-slate-50/50 dark:bg-muted/10 border border-slate-100 dark:border-border rounded-xl">
                        <div className="flex items-center justify-between">
                          <label className="block text-[12px] font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                            Certifications
                          </label>
                          {!isAddingCert && editingCertIndex === null && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingCert(true);
                                setEditingCertIndex(null);
                                setPendingCertRecord({
                                  name: "",
                                  issuingOrganization: "",
                                  issueDate: "",
                                  expiryDate: "",
                                  credentialId: "",
                                  credentialUrl: "",
                                  file: null,
                                  fileUrl: ""
                                });
                              }}
                              className="h-9 px-4 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-blue-100"
                            >
                              <PlusCircle className="w-4.5 h-4.5" /> Add
                            </button>
                          )}
                        </div>

                        {/* List of Certifications */}
                        {Array.isArray(formData.certifications) && formData.certifications.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                            {formData.certifications.map((cert: any, index: number) => (
                              <div key={index} className="p-5 bg-card border border-border hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl shadow-sm relative group hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
                                <div className="space-y-3">
                                  {/* Title & Badge */}
                                  <div className="flex items-start gap-3 pr-16">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                                      <Award className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-bold text-foreground leading-tight truncate">{cert.name}</h4>
                                      <p className="text-xs text-muted-foreground font-semibold truncate mt-1">{cert.issuingOrganization || "No Organization"}</p>
                                    </div>
                                  </div>

                                  {/* Metadata Rows */}
                                  <div className="grid gap-1.5 text-[11px] text-muted-foreground pl-12 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span>
                                        {cert.issueDate ? new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date(cert.issueDate)) : "---"}
                                        {cert.expiryDate ? ` — ${new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date(cert.expiryDate))}` : " (No Expiration)"}
                                      </span>
                                    </div>
                                    {cert.credentialId && (
                                      <div className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-mono">ID: {cert.credentialId}</span>
                                      </div>
                                    )}
                                    {(cert.file || cert.fileUrl) && (
                                      <div className="pt-1.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                                          📄 Document Attached
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Action Toolbar */}
                                <div className="absolute top-5 right-5 flex items-center gap-1">
                                  {(cert.file || cert.fileUrl || cert.documentUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const url = cert.file instanceof File 
                                          ? URL.createObjectURL(cert.file) 
                                          : getProfilePictureUrl(cert.fileUrl || cert.documentUrl);
                                        if (url) {
                                          setActiveCertPreview({ url, name: cert.name });
                                        }
                                      }}
                                      className="p-2 hover:bg-slate-50 dark:hover:bg-muted text-slate-400 hover:text-slate-600 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-border"
                                      title="View Certificate"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingCert(false);
                                      setEditingCertIndex(index);
                                    }}
                                    className="p-2 hover:bg-slate-50 dark:hover:bg-muted text-slate-400 hover:text-slate-600 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-border"
                                    title="Edit Certificate"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = formData.certifications.filter((_: any, i: number) => i !== index);
                                      setFormData((prev: any) => ({ ...prev, certifications: updated }));
                                    }}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900"
                                    title="Delete Certificate"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !isAddingCert && editingCertIndex === null && (
                            <div className="text-center p-6 border border-dashed border-border rounded-xl bg-card">
                              <p className="text-xs text-muted-foreground">No certifications added yet. Click "Add" to specify.</p>
                            </div>
                          )
                        )}

                        {/* Add/Edit Form */}
                        {(isAddingCert || editingCertIndex !== null) && (() => {
                          const isEditMode = editingCertIndex !== null;
                          const currentCert = isEditMode ? formData.certifications[editingCertIndex!] : pendingCertRecord;
                          const currentIndex = isEditMode ? editingCertIndex! : -1;
                          const prefix = isEditMode ? `cert_${currentIndex}` : "cert_new";

                          const updateCertField = (field: string, value: any) => {
                            if (isEditMode) {
                              const updated = [...formData.certifications];
                              updated[currentIndex] = { ...updated[currentIndex], [field]: value };
                              setFormData((prev: any) => ({ ...prev, certifications: updated }));
                            } else {
                              setPendingCertRecord(prev => ({ ...prev, [field]: value }));
                            }
                          };

                          return (
                            <div className="space-y-5 p-6 border border-blue-100 dark:border-blue-950 rounded-2xl bg-blue-50/10 dark:bg-blue-950/5 shadow-sm animate-in slide-in-from-top-2 duration-300">
                              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                                {isEditMode ? "Edit Certification Detail" : "New Certification Detail"}
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Certificate Name *</label>
                                  <input
                                    type="text"
                                    value={currentCert.name}
                                    onChange={(e) => updateCertField("name", e.target.value)}
                                    className="w-full h-10 px-3 border border-border rounded-lg bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. AWS Certified Solutions Architect"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Issuing Organization *</label>
                                  <input
                                    type="text"
                                    value={currentCert.issuingOrganization}
                                    onChange={(e) => updateCertField("issuingOrganization", e.target.value)}
                                    className="w-full h-10 px-3 border border-border rounded-lg bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Amazon Web Services"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Issue Date *</label>
                                  <ModernDatePicker
                                    value={currentCert.issueDate}
                                    onChange={(date) => updateCertField("issueDate", date)}
                                    placeholder="Select Issue Date"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Expiry Date</label>
                                  <ModernDatePicker
                                    value={currentCert.expiryDate}
                                    onChange={(date) => updateCertField("expiryDate", date)}
                                    placeholder="Select Expiry Date"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Credential ID</label>
                                  <input
                                    type="text"
                                    value={currentCert.credentialId}
                                    onChange={(e) => updateCertField("credentialId", e.target.value)}
                                    className="w-full h-10 px-3 border border-border rounded-lg bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. AWS-12345"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Credential URL</label>
                                  <input
                                    type="text"
                                    value={currentCert.credentialUrl}
                                    onChange={(e) => updateCertField("credentialUrl", e.target.value)}
                                    className="w-full h-10 px-3 border border-border rounded-lg bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. https://credentials.aws.com/12345"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  {currentCert.fileUrl || currentCert.documentUrl || currentCert.certificateUrl ? (
                                    <div className="space-y-2">
                                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Certificate Image / Document</label>
                                      <FileUpload
                                        id={`${prefix}_file`}
                                        files={[currentCert.file || currentCert.fileUrl || currentCert.documentUrl || currentCert.certificateUrl]}
                                        onFilesChange={(files) => updateCertField("file", files[0] || null)}
                                        allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                                        showViewEdit={true}
                                      />
                                    </div>
                                  ) : (
                                    <FileUpload
                                      id={`${prefix}_file`}
                                      label="Certificate Image / Document"
                                      files={currentCert.file ? [currentCert.file] : []}
                                      onFilesChange={(files) => updateCertField("file", files[0] || null)}
                                      allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                                      showViewEdit={true}
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingCert(false);
                                    setEditingCertIndex(null);
                                    setPendingCertRecord({
                                      name: "",
                                      issuingOrganization: "",
                                      issueDate: "",
                                      expiryDate: "",
                                      credentialId: "",
                                      credentialUrl: "",
                                      file: null,
                                      fileUrl: ""
                                    });
                                  }}
                                  className="h-9 px-4 text-xs font-bold text-muted-foreground hover:bg-muted border border-border rounded-lg transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!currentCert.name || !currentCert.issuingOrganization || !currentCert.issueDate) {
                                      toast.error("Please fill all required certification fields (*)");
                                      return;
                                    }
                                    
                                    if (!isEditMode) {
                                      setFormData((prev: any) => ({
                                        ...prev,
                                        certifications: [...(prev.certifications || []), currentCert]
                                      }));
                                    }
                                    
                                    setIsAddingCert(false);
                                    setEditingCertIndex(null);
                                    setPendingCertRecord({
                                      name: "",
                                      issuingOrganization: "",
                                      issueDate: "",
                                      expiryDate: "",
                                      credentialId: "",
                                      credentialUrl: "",
                                      file: null,
                                      fileUrl: ""
                                    });
                                    toast.success("Certification saved");
                                  }}
                                  className="h-9 px-4 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                                >
                                  Save Certification
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      {activeCertPreview && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50/50 dark:bg-muted/10">
                              <h3 className="text-sm font-bold text-foreground">{activeCertPreview.name}</h3>
                              <button 
                                type="button"
                                onClick={() => setActiveCertPreview(null)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-muted rounded-full transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="p-6 flex justify-center bg-slate-900/5 items-center max-h-[80vh] overflow-auto">
                              {activeCertPreview.url.toLowerCase().includes('.pdf') ? (
                                <iframe src={activeCertPreview.url} className="w-full h-[600px] border-0 rounded-lg" />
                              ) : (
                                <img src={activeCertPreview.url} alt={activeCertPreview.name} className="max-h-[60vh] object-contain rounded-lg shadow-md" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-4 p-5 bg-slate-50/50 dark:bg-muted/10 border border-slate-100 dark:border-border rounded-xl">
                        <div className="flex items-center justify-between">
                          <label className="block text-[12px] font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                            Languages & Proficiency
                          </label>
                          {!isAddingLanguage && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingLanguage(true);
                                setEditingLanguageIndex(null);
                                setSelectedNewLanguage("");
                                setSelectedNewProficiency("Beginner");
                              }}
                              className="h-9 px-4 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-blue-100"
                            >
                              <PlusCircle className="w-4.5 h-4.5" /> Add
                            </button>
                          )}
                        </div>
                        
                        {/* List of currently added languages */}
                        {Array.isArray(formData.languages) && formData.languages.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2.5 pt-1 mb-3">
                            {formData.languages.map((langObj: any, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
                                onClick={() => {
                                  setIsAddingLanguage(true);
                                  setEditingLanguageIndex(index);
                                  setSelectedNewLanguage(langObj.language);
                                  setSelectedNewProficiency(langObj.proficiency);
                                }}
                                title="Click to Edit"
                              >
                                <span>{langObj.language} ({langObj.proficiency})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          !isAddingLanguage && (
                            <div className="text-center p-6 border border-dashed border-border rounded-xl bg-card">
                              <p className="text-xs text-muted-foreground">No languages added yet. Click "Add" to specify.</p>
                            </div>
                          )
                        )}

                        {/* Add new language form */}
                        {isAddingLanguage && (
                          <div className="space-y-4 p-5 border border-blue-100 dark:border-blue-950 rounded-xl bg-blue-50/10 dark:bg-blue-950/5 shadow-sm animate-in slide-in-from-top-2 duration-300">
                            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                              {editingLanguageIndex !== null ? "Edit Language Record" : "New Language Record"}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Language</label>
                                <Select
                                  options={["English", "Spanish", "French", "German", "Mandarin", "Hindi", "Arabic", "Bengali", "Portuguese", "Russian", "Japanese", "Punjabi", "Marathi", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada", "Odia", "Malayalam", "Sanskrit", "Korean", "Italian", "Turkish", "Vietnamese"]
                                    .filter(l => {
                                      if (editingLanguageIndex !== null && formData.languages[editingLanguageIndex]?.language === l) return true;
                                      return !Array.isArray(formData.languages) || !formData.languages.some((x: any) => x.language === l);
                                    })
                                    .map(l => ({ value: l, label: l }))}
                                  value={selectedNewLanguage}
                                  onChange={(val) => {
                                    setSelectedNewLanguage(val);
                                    setFormErrors((prev: any) => {
                                      const { languages, ...rest } = prev;
                                      return rest;
                                    });
                                  }}
                                  placeholder="Select Language"
                                  searchable={true}
                                  direction="bottom"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Proficiency</label>
                                <Select
                                  options={[
                                    { value: "Beginner", label: "Beginner" },
                                    { value: "Intermediate", label: "Intermediate" },
                                    { value: "Advanced", label: "Advanced" },
                                    { value: "Native", label: "Native" }
                                  ]}
                                  value={selectedNewProficiency}
                                  onChange={(val) => setSelectedNewProficiency(val)}
                                  placeholder="Select Proficiency"
                                  direction="bottom"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                              {editingLanguageIndex !== null && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const list = Array.isArray(formData.languages) ? formData.languages : [];
                                    const updated = list.filter((_: any, i: number) => i !== editingLanguageIndex);
                                    setFormData((prev: any) => ({ ...prev, languages: updated }));
                                    setIsAddingLanguage(false);
                                    setEditingLanguageIndex(null);
                                    setSelectedNewLanguage("");
                                    setSelectedNewProficiency("Beginner");
                                  }}
                                  className="h-9 px-4 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg transition-all mr-auto"
                                >
                                  Delete Language
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingLanguage(false);
                                  setEditingLanguageIndex(null);
                                  setSelectedNewLanguage("");
                                  setSelectedNewProficiency("Beginner");
                                }}
                                className="h-9 px-4 text-xs font-bold text-muted-foreground hover:bg-muted border border-border rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!selectedNewLanguage) {
                                    setFormErrors((prev: any) => ({ ...prev, languages: "Please select a language first." }));
                                    return;
                                  }

                                  const list = Array.isArray(formData.languages) ? formData.languages : [];
                                  
                                  // Unique check (excluding the current item being edited)
                                  const duplicateExists = list.some((x: any, idx: number) => {
                                    if (idx === editingLanguageIndex) return false;
                                    return x.language.toLowerCase() === selectedNewLanguage.toLowerCase();
                                  });

                                  if (duplicateExists) {
                                    toast.error(`${selectedNewLanguage} is already added.`);
                                    return;
                                  }

                                  let updated;
                                  if (editingLanguageIndex !== null) {
                                    updated = [...list];
                                    updated[editingLanguageIndex] = { language: selectedNewLanguage, proficiency: selectedNewProficiency };
                                  } else {
                                    updated = [...list, { language: selectedNewLanguage, proficiency: selectedNewProficiency }];
                                  }

                                  setFormData((prev: any) => ({ ...prev, languages: updated }));
                                  setIsAddingLanguage(false);
                                  setEditingLanguageIndex(null);
                                  setSelectedNewLanguage("");
                                  setSelectedNewProficiency("Beginner");
                                  
                                  setFormErrors((prev: any) => {
                                    const { languages, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                className="h-9 px-4 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                              >
                                Save Language
                              </button>
                            </div>
                          </div>
                        )}
                        {formErrors.languages && <p className="text-xs text-red-500 mt-1 font-medium">{formErrors.languages}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="bg-[#F9FAFB] dark:bg-muted/50 border-t border-[#E6E8EE] dark:border-border px-6 py-5 sm:px-8 flex items-center justify-between rounded-b-[14px]">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCancelAddEmployeeConfirm(true)}
                    className="text-sm font-bold h-10 text-red-500 dark:text-red-400 border-red-100 dark:border-red-900 bg-red-50/20 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-800 transition-all duration-300 gap-2 px-4 shadow-sm shadow-red-50/50 dark:shadow-none"
                  >
                    Cancel
                  </Button>

                  {!isFirstStep && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => handlePrevious(e)}
                      className="gap-2 px-6 h-10 border-border hover:bg-card hover:border-blue-200 dark:hover:border-blue-800 hover:text-primary transition-all font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Previous Step
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isDraft && !isSelfEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSaveDraft(false)}
                      disabled={isSavingDraft || isSubmitting}
                      className="text-sm font-bold h-10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/30 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300 gap-2 px-4 shadow-sm shadow-amber-50/50 dark:shadow-none"
                    >
                      {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save as Draft
                    </Button>
                  )}

                  {!isLastStep && (
                    <Button
                      type="button"
                      onClick={(e) => handleNext(e)}
                      disabled={isSubmitting}
                      className="gap-2 min-w-[140px] h-10 shadow-sm font-semibold transition-all text-white bg-primary hover:bg-primary/70 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Next
                          <ArrowLeft className="w-4 h-4 rotate-180" />
                        </>
                      )}
                    </Button>
                  )}

                  {!isEdit && isLastStep && (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="gap-2 min-w-[160px] h-10 shadow-sm font-bold transition-all text-white bg-primary hover:bg-primary/70 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlusCircle className="w-4 h-4" />
                      )}
                      {isSubmitting ? 'Saving...' : 'Submit'}
                    </Button>
                  )}

                  {isEdit && (
                    <Button
                      type="button"
                      onClick={(e) => handleSubmit(e)}
                      disabled={isSubmitting}
                      className="gap-2 min-w-[160px] h-10 bg-primary hover:bg-primary/70 shadow-sm font-bold transition-all text-white flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {isSubmitting ? 'Submitting...' : isSelfEdit ? 'Submit for Approval' : 'Save Changes'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={blocker.state === "blocked"}
        title="Unsaved Changes"
        description="You have unsaved changes. Would you like to save them as a draft before leaving, or discard them?"
        confirmText="Discard & Leave"
        cancelText="Stay"
        onConfirm={() => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
        variant="warning"
        extraActions={
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const success = await handleSaveDraft(false);
              if (success) {
                blocker.proceed?.();
              }
            }}
            disabled={isSavingDraft}
            className="border-amber-200 text-amber-700 hover:bg-amber-50 h-10 px-4 font-bold text-sm"
          >
            {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Save as Draft & Leave
          </Button>
        }
      />

      <ConfirmDialog
        open={showCancelAddEmployeeConfirm}
        title="Discard Employee Form Changes?"
        message="Are you sure you want to cancel? Any information entered or edited in this employee form will be lost."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelAddEmployeeConfirm(false);
          if (onClose) {
            onClose();
          } else {
            navigate("/employee-management");
          }
        }}
        onCancel={() => setShowCancelAddEmployeeConfirm(false)}
      />
    </div>
  );
}




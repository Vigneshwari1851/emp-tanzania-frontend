import axiosInstance from '@/shared/services/axiosInstance';
import { parseBackendError } from '@/features/employees/services/employees';

export type ChangeRequestStatus = 'PENDING_MANAGER' | 'PENDING_HR' | 'PENDING_HR_APPROVAL' | 'PENDING_FINANCE_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface ChangeRequest {
  id: number;
  user_id: number;
  requested_changes: Record<string, unknown> & { _previous?: Record<string, unknown> | null };
  status: ChangeRequestStatus;
  manager_id: number | null;
  manager_status: string | null;
  manager_note: string | null;
  manager_actioned_at: string | null;
  hr_id: number | null;
  hr_status: string | null;
  hr_note: string | null;
  hr_actioned_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username?: string;
    email?: string;
    details?: {
      first_name?: string;
      last_name?: string;
      profile_picture?: string;
      department?: { department_name?: string };
      role?: { role_name?: string };
    };
  };
}

export const submitChangeRequest = async (changes: Record<string, unknown>): Promise<ChangeRequest> => {
  try {
    const response = await axiosInstance.post("/change-requests", { changes });
    return response.data.data;
  } catch (error: unknown) {
    throw { message: parseBackendError(error, "Failed to submit change request") };
  }
};

export const getMyChangeRequests = async (status?: string): Promise<ChangeRequest[]> => {
  try {
    const response = await axiosInstance.get("/change-requests/mine", { params: status ? { status } : {} });
    return response.data.data || [];
  } catch (error: unknown) {
    throw { message: parseBackendError(error, "Failed to fetch change requests") };
  }
};

export const getChangeRequestInbox = async (): Promise<ChangeRequest[]> => {
  try {
    const response = await axiosInstance.get("/change-requests/inbox");
    return response.data.data || [];
  } catch (error: unknown) {
    throw { message: parseBackendError(error, "Failed to fetch approval inbox") };
  }
};

export const decideChangeRequest = async (
  id: number,
  payload: { action: 'approve' | 'reject'; role: 'manager' | 'hr' | 'finance'; note?: string }
): Promise<ChangeRequest> => {
  try {
    const response = await axiosInstance.put(`/change-requests/${id}/decision`, payload);
    return response.data.data;
  } catch (error: unknown) {
    throw { message: parseBackendError(error, "Failed to process change request") };
  }
};

export const CHANGE_FIELD_LABELS: Record<string, string> = {
  email: "Primary Email",
  first_name: "First Name",
  middle_name: "Middle Name",
  last_name: "Last Name",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  nationality: "Nationality",
  marital_status: "Marital Status",
  blood_group: "Blood Group",
  phone: "Primary Phone",
  secondary_phone: "Secondary Phone",
  secondary_email: "Secondary Email",
  address: "Address",
  city: "City",
  state: "State",
  zip: "Zip / Postal Code",
  country: "Country",
  secondary_address: "Secondary Address",
  secondary_city: "Secondary City",
  secondary_state: "Secondary State",
  secondary_zip: "Secondary Zip",
  secondary_country: "Secondary Country",
  emergency_contact: "Emergency Contact Name",
  emergency_relationship: "Emergency Contact Relationship",
  emergency_phone: "Emergency Contact Phone",
  emergency_email: "Emergency Contact Email",
  passport_number: "Passport Number",
  passport_expiry_date: "Passport Expiry Date",
  driving_license_number: "Driving License Number",
  license_expiry_date: "License Expiry Date",
  pan_number: "PAN Number",
  aadhaar_number: "Aadhaar Number",
  bank_name: "Bank Name",
  branch_name: "Branch Name",
  account_holder_name: "Account Holder Name",
  account_number: "Account Number",
  ifsc_code: "IFSC Code",
  work_location: "Work Location",
  work_schedule: "Work Schedule",
  skills: "Skills",
  languages: "Languages",
  certifications: "Certifications",
  education: "Education",
  employment_history: "Employment History",
};

export const formatChangeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

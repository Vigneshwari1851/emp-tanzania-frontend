import axiosInstance from '@/shared/services/axiosInstance';
import type { Department } from "./departments";

export interface Branch {
  id: number;
  organization_id: number;
  location_name?: string;
  location_code?: string;
  street_address?: string;
  branch_name?: string; // Compatibility
  branch_code?: string; // Compatibility
  address?: string; // Compatibility
  city: string;
  state: string;
  zip_code?: string;
  zip?: string; // Compatibility
  country: string;
  time_zone?: string;
  tax_location?: string;
  gst?: string;
  created_at?: string;
  updated_at?: string;
  departments?: Department[];
  branch_employee_count?: number;
}

export interface Organization {
  id: number;
  entity_name?: string; // Corrected column name per user request
  company_code: string;
  company_type?: string;
  jurisdiction?: string;
  currency?: string;
  fiscal_year_end?: string;
  tax_registration_number?: string; // Corrected column name per user request
  pan?: string;
  tin?: string;
  sin?: string;
  ein?: string;
  siret?: string;
  other_tax_id?: string;
  address?: string;
  legal_address?: string; // Corrected column name per user request
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  business_unit?: string;
  division?: string;
  cost_center?: string;
  job_architecture?: boolean;
  payroll_statutory_unit?: string;
  legal_employer?: string;
  legislative_data_group?: string;
  pay_frequency?: string;
  standard_working_hours_per_week?: number;
  fixed_start_time?: string;
  fixed_end_time?: string;
  fixed_break_time?: number;
  flex_required_hours?: number;
  flex_core_start_time?: string;
  flex_core_end_time?: string;
  flex_min_login_time?: string;
  flex_max_login_time?: string;
  flex_max_hours?: number;
  working_days?: string[];
  public_holidays?: string[];
  schedule_type?: 'fixed' | 'shift' | 'flexible';
  shifts?: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    icon: 'sunrise' | 'sun' | 'moon';
    color: string;
  }>;
  logo_url?: string;
  created_at: string;
  updated_at: string;
  branches?: Branch[];
  branch?: Branch[];
  branches_count?: number;
  total_employees?: number;
  enable_shifts?: boolean;
  working_hours?: string;
  working_calendar?: any;
  workingCalendar?: any;
}

// FIX: Added null check + Array.isArray guard.
// Previously returned null/single object directly, causing frontend crash (null.length, object not iterable).
export const getOrganizations = async (): Promise<Organization[]> => {
  try {
    const response = await axiosInstance.get("/organizations");
    const data = response.data.data;
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch organizations" };
  }
};

export const createOrganization = async (data: any): Promise<Organization> => {
  try {
    const response = await axiosInstance.post("/organizations", data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create organization" };
  }
};

export const updateOrganization = async (id: number, data: any): Promise<Organization> => {
  try {
    const response = await axiosInstance.put(`/organizations/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update organization" };
  }
};

export const deleteOrganization = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/organizations/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete organization" };
  }
};

export const getOrganizationShifts = async (id: number): Promise<any[]> => {
  try {
    const response = await axiosInstance.get(`/organizations/${id}/shifts`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch organization shifts" };
  }
};

export const updateOrganizationShift = async (orgId: number, shiftId: string, shiftData: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`/organizations/${orgId}/shifts/${shiftId}`, shiftData);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update organization shift" };
  }
};

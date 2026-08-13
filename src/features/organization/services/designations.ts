import axiosInstance from '@/shared/services/axiosInstance';

export interface DesignationNode {
  id: number;
  designation_name: string;
  designation_code: string;
  description?: string;
  parent_designation_id?: number | null;
  secondary_parent_designation_id?: number | null;
  secondary_reporting_employee_id?: number | null;
  department_id?: number | null;
  parent?: { id: number; designation_name: string; designation_code: string } | null;
  secondary_parent?: { id: number; designation_name: string; designation_code: string } | null;
  secondary_reporting_employee?: { id: number; first_name: string; last_name: string; employee_id: string; user?: { email: string } } | null;
  department?: { id: number; department_name: string } | null;
  headcount: number;
  sub_designations: DesignationNode[];
  userDetails?: Array<{
    user_id: number;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    employee_id?: string;
    employment_type?: string;
    user?: {
      email: string;
    };
    department?: {
      id: number;
      department_name: string;
      branches?: {
        id: number;
        branch_name: string;
      } | null;
    } | null;
  }>;
  created_at?: string;
  updated_at?: string;
}

export const getDesignations = async (departmentId?: number): Promise<DesignationNode[]> => {
  try {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await axiosInstance.get("/designations", { params });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch designations" };
  }
};

export const getDesignation = async (id: number): Promise<DesignationNode> => {
  try {
    const response = await axiosInstance.get(`/designations/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch designation details" };
  }
};

export const createDesignation = async (data: {
  designation_name: string;
  designation_code: string;
  description?: string;
  parent_designation_id?: number | null;
  secondary_parent_designation_id?: number | null;
  secondary_reporting_employee_id?: number | null;
  department_id?: number | null;
}): Promise<DesignationNode> => {
  try {
    const response = await axiosInstance.post("/designations", data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create designation" };
  }
};

export const updateDesignation = async (id: number, data: Partial<{
  designation_name: string;
  designation_code: string;
  description?: string;
  parent_designation_id?: number | null;
  secondary_parent_designation_id?: number | null;
  secondary_reporting_employee_id?: number | null;
  department_id?: number | null;
}>): Promise<DesignationNode> => {
  try {
    const response = await axiosInstance.put(`/designations/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update designation" };
  }
};

export const getDesignationEmployees = async (id: number): Promise<Array<{ id: number; first_name: string; last_name: string; employee_id: string }>> => {
  try {
    const response = await axiosInstance.get(`/designations/${id}/employees`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch employees" };
  }
};

export const deleteDesignation = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/designations/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete designation" };
  }
};

import axiosInstance from '@/shared/services/axiosInstance';

export interface Role {
  id: number;
  name: string;
  description: string;
  status: boolean;
  user_count?: number;
  created_at: string;
  updated_at: string;
  permissions?: any[];
}

export const getRoles = async (): Promise<Role[]> => {
  try {
    const response = await axiosInstance.get("/roles");
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch roles" };
  }
};

export const getRole = async (id: number): Promise<Role> => {
  try {
    const response = await axiosInstance.get(`/roles/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch role details" };
  }
};

export const createRole = async (data: any): Promise<Role> => {
  try {
    const response = await axiosInstance.post("/roles", data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create role" };
  }
};

export const updateRole = async (id: number, data: any): Promise<Role> => {
  try {
    const response = await axiosInstance.put(`/roles/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update role" };
  }
};

export const deleteRole = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/roles/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete role" };
  }
};

export const updateRolePermissions = async (
  id: number,
  data: {
    permissions: { id: number; scope?: string }[];
  }
) => {
  try {
    const response = await axiosInstance.put(`/roles/${id}/permissions`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update role permissions" };
  }
};
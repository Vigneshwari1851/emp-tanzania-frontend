import axiosInstance from '@/shared/services/axiosInstance';

export interface Permission {
  id: number;
  permission_name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const getPermissions = async (): Promise<Permission[]> => {
  try {
    const response = await axiosInstance.get("/roles/permissions/all");
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch permissions" };
  }
};

export const createPermission = async (data: any): Promise<Permission> => {
  try {
    const response = await axiosInstance.post("/roles/permissions", data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create permission" };
  }
};

export const assignPermissionsToRole = async (roleId: number, permissionIds: number[]): Promise<void> => {
  try {
    await axiosInstance.post(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to assign permissions" };
  }
};

export const getAssignedPermissionsForRole = async (roleId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`/roles/${roleId}/permissions`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch assigned permissions" };
  }
};

export const deletePermissionFromRole = async (roleId: number, permissionId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/roles/${roleId}/permissions/${permissionId}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to remove permission" };
  }
};

export const getGroupedPermissions = async () => {
  try {
    const response = await axiosInstance.get("/permissions/grouped");
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch grouped permissions" };
  }
};

// Module Management
export const createModule = async (data: { id: string; label: string }) => {
  try {
    const response = await axiosInstance.post("/permissions/modules", data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create module" };
  }
};

export const updateModule = async (id: string, data: { label: string }) => {
  try {
    const response = await axiosInstance.put(`/permissions/modules/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update module" };
  }
};

export const deleteModule = async (id: string) => {
  try {
    await axiosInstance.delete(`/permissions/modules/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete module" };
  }
};

// Permission Management
export const createPermissionNew = async (data: { permission_name: string; key_name: string; moduleId: string; description?: string }) => {
  try {
    const response = await axiosInstance.post("/permissions", data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create permission" };
  }
};

export const updatePermissionNew = async (id: number, data: { permission_name?: string; key_name?: string; description?: string }) => {
  try {
    const response = await axiosInstance.put(`/permissions/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update permission" };
  }
};

export const deletePermissionNew = async (id: number) => {
  try {
    await axiosInstance.delete(`/permissions/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete permission" };
  }
};

export const seedHierarchy = async () => {
  try {
    const response = await axiosInstance.post("/permissions/seed-hierarchy");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to seed hierarchy" };
  }
};
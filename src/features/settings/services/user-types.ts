import axiosInstance from '@/shared/services/axiosInstance';

export interface UserType {
  id: number;
  name: string;
  system_key: string;
  description: string | null;
  organization_id: number;
  created_at: string;
  _count?: { user_details: number };
}

export interface Module {
  id: string;
  label: string;
  permissions: { id: number; permission_name: string; key_name: string | null }[];
}

export const getUserTypes = async (): Promise<UserType[]> => {
  const response = await axiosInstance.get('/user-types');
  return response.data.data;
};

export const getUserTypeById = async (id: number): Promise<UserType> => {
  const response = await axiosInstance.get(`/user-types/${id}`);
  return response.data.data;
};

export const createUserType = async (data: { name: string; system_key: string; description?: string }): Promise<UserType> => {
  const response = await axiosInstance.post('/user-types', data);
  return response.data.data;
};

export const updateUserType = async (id: number, data: { name?: string; system_key?: string; description?: string }): Promise<UserType> => {
  const response = await axiosInstance.put(`/user-types/${id}`, data);
  return response.data.data;
};

export const deleteUserType = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/user-types/${id}`);
};

export const getModules = async (): Promise<Module[]> => {
  const response = await axiosInstance.get('/user-types/modules');
  return response.data.data;
};

export const getAssignedModules = async (userTypeId: number): Promise<string[]> => {
  const response = await axiosInstance.get(`/user-types/${userTypeId}/modules`);
  return response.data.data;
};

export const updateAssignedModules = async (userTypeId: number, moduleIds: string[]): Promise<string[]> => {
  const response = await axiosInstance.put(`/user-types/${userTypeId}/modules`, { moduleIds });
  return response.data.data;
};

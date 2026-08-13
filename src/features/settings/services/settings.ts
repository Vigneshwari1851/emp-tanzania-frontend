import axiosInstance from '@/shared/services/axiosInstance';

export interface CustomField {
  id: number;
  module: string;
  label: string;
  type: string;
  options?: any;
  required: boolean;
  status: boolean;
}

export interface Integration {
  id: number;
  name: string;
  provider: string;
  config?: any;
  status: boolean;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  user?: {
    email: string;
    details?: {
      first_name: string;
      last_name: string;
    };
  };
  action: string;
  module: string;
  description: string;
  ip_address: string;
  created_at: string;
}

export const getCustomFields = async (module?: string): Promise<CustomField[]> => {
  const response = await axiosInstance.get("/settings/fields", { params: { module } });
  return response.data.data;
};

export const createCustomField = async (data: any): Promise<CustomField> => {
  const response = await axiosInstance.post("/settings/fields", data);
  return response.data.data;
};

export const updateCustomField = async (id: number, data: any): Promise<CustomField> => {
  const response = await axiosInstance.put(`/settings/fields/${id}`, data);
  return response.data.data;
};

export const deleteCustomField = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/settings/fields/${id}`);
};

export const getIntegrations = async (): Promise<Integration[]> => {
  const response = await axiosInstance.get("/settings/integrations");
  return response.data.data;
};

export const updateIntegration = async (id: number, data: any): Promise<Integration> => {
  const response = await axiosInstance.put(`/settings/integrations/${id}`, data);
  return response.data.data;
};

export const seedIntegrations = async (): Promise<void> => {
  await axiosInstance.post("/settings/integrations/seed");
};

export const getActivityLogs = async (filters: any): Promise<ActivityLog[]> => {
  const response = await axiosInstance.get("/settings/logs", { params: filters });
  return response.data.data;
};

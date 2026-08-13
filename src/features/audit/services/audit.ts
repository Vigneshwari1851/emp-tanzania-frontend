import axiosInstance from '@/shared/services/axiosInstance';

const API_URL = '/audit';

export const auditService = {
  async getLogs(params?: { module?: string; action?: string; page?: number; size?: number }) {
    const response = await axiosInstance.get(`${API_URL}/logs`, { params });
    return response.data;
  },
  async logAudit(data: { module: string; action: string; entityId: string; previousValue?: string; newValue?: string }) {
    const response = await axiosInstance.post(`${API_URL}/logs`, data);
    return response.data;
  },
};

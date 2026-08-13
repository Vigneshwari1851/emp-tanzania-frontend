import axiosInstance from '@/shared/services/axiosInstance';

export const applyLeave = async (data: any) => {
  const response = await axiosInstance.post('/leaves/apply', data);
  return response.data;
};

export const getMyRequests = async () => {
  const response = await axiosInstance.get('/leaves/my-requests');
  return response.data;
};

export const getPendingRequests = async () => {
  const response = await axiosInstance.get('/leaves/pending');
  return response.data;
};

export const getLeaveHistory = async (params?: any) => {
  const response = await axiosInstance.get('/leaves/history', { params });
  return response.data;
};

export const handleLeaveAction = async (id: string, status: 'APPROVED' | 'REJECTED' | 'WITHDRAWN', rejection_reason?: string) => {
  const response = await axiosInstance.put(`/leaves/action/${id}`, { status, rejection_reason });
  return response.data;
};

export const getMyLeaveBalance = async () => {
  const response = await axiosInstance.get('/leaves/balance');
  return response.data;
};

export const getLeaveStatistics = async () => {
  const response = await axiosInstance.get('/leaves/statistics');
  return response.data;
};

// Leave Policy API
export const getAllLeavePolicies = async () => {
  const response = await axiosInstance.get('/leave-policies');
  return response.data;
};

export const createLeavePolicy = async (data: any) => {
  const response = await axiosInstance.post('/leave-policies', data);
  return response.data;
};

export const updateLeavePolicy = async (id: string, data: any) => {
  const response = await axiosInstance.put(`/leave-policies/${id}`, data);
  return response.data;
};

export const deleteLeavePolicy = async (id: string) => {
  const response = await axiosInstance.delete(`/leave-policies/${id}`);
  return response.data;
};

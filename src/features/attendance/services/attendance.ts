import axiosInstance from '@/shared/services/axiosInstance';

export const checkIn = async (data?: { location: string }) => {
  const response = await axiosInstance.post('/attendance/check-in', data);
  return response.data;
};

export const checkOut = async (data?: { location: string }) => {
  const response = await axiosInstance.post('/attendance/check-out', data);
  return response.data;
};

export const getMyAttendanceLogs = async (params: { startDate?: string; endDate?: string; status?: string } = {}) => {
  const response = await axiosInstance.get('/attendance/my-logs', { params });
  return response.data;
};

export const getTeamAttendanceLogs = async (params: { 
  date?: string; 
  department_id?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}) => {
  const response = await axiosInstance.get('/attendance/team-logs', { params });
  return response.data;
};

export const getAttendanceStats = async () => {
  const response = await axiosInstance.get('/attendance/stats');
  return response.data;
};

export const logAttendanceExport = async (data: { format: string; filterType: string; count: number }) => {
  const response = await axiosInstance.post('/attendance/export/audit', data);
  return response.data;
};

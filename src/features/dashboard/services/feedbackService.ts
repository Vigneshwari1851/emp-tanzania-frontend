import axiosInstance from '@/shared/services/axiosInstance';

export const submitFeedback = async (message: string, category?: string) => {
  const response = await axiosInstance.post('/feedback', { message, category });
  return response.data;
};

import axiosInstance from '@/shared/services/axiosInstance';

export interface FeedbackItem {
  id: number;
  user_id: number;
  message: string;
  category?: string | null;
  status: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username?: string | null;
    email?: string;
    details?: {
      first_name?: string | null;
      last_name?: string | null;
      profile_picture?: string | null;
    } | null;
  } | null;
}

export interface FeedbackListResult {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  data: FeedbackItem[];
}

export const getFeedback = async (params?: { page?: number; limit?: number; status?: string }) => {
  const response = await axiosInstance.get('/feedback', { params });
  return response.data.data as FeedbackListResult;
};

export const submitFeedback = async (message: string, category?: string) => {
  const response = await axiosInstance.post('/feedback', { message, category });
  return response.data.data as FeedbackItem;
};

export const markFeedbackRead = async (id: number) => {
  const response = await axiosInstance.patch(`/feedback/${id}/read`);
  return response.data.data as FeedbackItem;
};

export const updateFeedbackStatus = async (id: number, status: string) => {
  const response = await axiosInstance.patch(`/feedback/${id}/status`, { status });
  return response.data.data as FeedbackItem;
};

export const deleteFeedback = async (id: number) => {
  const response = await axiosInstance.delete(`/feedback/${id}`);
  return response.data.data;
};

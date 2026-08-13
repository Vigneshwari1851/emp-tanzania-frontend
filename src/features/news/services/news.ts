import axiosInstance from '@/shared/services/axiosInstance';

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  image?: string | null;
  access_type: 'public' | 'department';
  department_ids?: number[];
  departments?: { id: number; department_name: string }[];
  status: 'draft' | 'published' | 'archived';
  created_by: number;
  author?: { id: number; username: string; full_name?: string };
  created_at: string;
  updated_at: string;
}

export interface NewsFormData {
  title: string;
  content: string;
  image?: string | null;
  access_type: 'public' | 'department';
  department_ids?: number[];
  status: 'draft' | 'published';
}

export const getNews = async (params?: {
  status?: string;
  access_type?: string;
  department_id?: number;
}): Promise<NewsItem[]> => {
  try {
    const response = await axiosInstance.get('/news', { params });
    return response.data.data ?? [];
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch news' };
  }
};

export const getNewsItem = async (id: number): Promise<NewsItem> => {
  try {
    const response = await axiosInstance.get(`/news/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch news item' };
  }
};

export const createNews = async (data: NewsFormData): Promise<NewsItem> => {
  try {
    const response = await axiosInstance.post('/news', data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to create news item' };
  }
};

export const updateNews = async (id: number, data: NewsFormData): Promise<NewsItem> => {
  try {
    const response = await axiosInstance.put(`/news/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update news item' };
  }
};

export const deleteNews = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/news/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to delete news item' };
  }
};

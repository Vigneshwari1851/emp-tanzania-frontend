import axiosInstance from '@/shared/services/axiosInstance';

export interface Document {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'DOC';
  size: string;
  category: string;
  tab: string;
  access: 'Public' | 'Restricted';
  views: number;
  downloads: number;
  updatedAt: string;
  isNew?: boolean;
  isUpdated?: boolean;
  isStarred?: boolean;
  uploaded_by?: number;
  uploader?: {
    id: number;
    username: string;
    full_name: string;
  };
  version?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  target_department?: string;
  file_url?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const getDocuments = async (params?: {
  category?: string;
  tab?: string;
  search?: string;
  is_restricted?: string;
}): Promise<Document[]> => {
  const response = await axiosInstance.get<ApiResponse<Document[]>>('/documents', { params });
  return response.data.data;
};

export const getDocument = async (id: number): Promise<Document> => {
  const response = await axiosInstance.get<ApiResponse<Document>>(`/documents/${id}`);
  return response.data.data;
};

export const createDocument = async (data: {
  title: string;
  description?: string;
  category: string;
  tab?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  is_restricted?: boolean;
  tags?: string[];
  version?: string;
  target_department?: string;
}): Promise<Document> => {
  const response = await axiosInstance.post<ApiResponse<Document>>('/documents', data);
  return response.data.data;
};

export const updateDocument = async (id: number, data: Partial<{
  title: string;
  description: string;
  category: string;
  tab: string;
  is_restricted: boolean;
  tags: string[];
  version: string;
  target_department: string;
}>): Promise<Document> => {
  const response = await axiosInstance.put<ApiResponse<Document>>(`/documents/${id}`, data);
  return response.data.data;
};

export const deleteDocument = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/documents/${id}`);
};

export const uploadDocumentFile = async (file: File): Promise<{ file_url: string; file_name: string; file_type: string; file_size: number }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post<ApiResponse<{ file_url: string; file_name: string; file_type: string; file_size: number }>>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const downloadDocumentAction = async (id: number): Promise<void> => {
  await axiosInstance.post(`/documents/${id}/download`);
};

export const starDocumentAction = async (id: number, starred: boolean): Promise<void> => {
  await axiosInstance.post(`/documents/${id}/star`, { starred });
};

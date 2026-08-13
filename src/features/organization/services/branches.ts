import axiosInstance from '@/shared/services/axiosInstance';

export const deleteBranch = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/branches/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete branch" };
  }
};

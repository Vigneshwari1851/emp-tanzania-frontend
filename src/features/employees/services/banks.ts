import axiosInstance from '@/shared/services/axiosInstance';

export interface Bank {
  id: number;
  name: string;
}

export const getBanks = async (): Promise<Bank[]> => {
  const response = await axiosInstance.get('/banks');
  return response.data.data;
};

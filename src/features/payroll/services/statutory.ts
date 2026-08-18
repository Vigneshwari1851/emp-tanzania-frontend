import axiosInstance from '@/shared/services/axiosInstance';

const API_URL = '/statutory';

export interface PayeBand {
    upper_limit: number | null;
    rate: number;
}

export const getPayeBands = async (): Promise<PayeBand[]> => {
    const response = await axiosInstance.get(`${API_URL}/paye-bands`);
    return response.data.data;
};

export const savePayeBands = async (bands: PayeBand[]): Promise<PayeBand[]> => {
    const response = await axiosInstance.post(`${API_URL}/paye-bands`, { bands });
    return response.data.data;
};

export const getStatutoryConfig = async (configType: string): Promise<Record<string, string>> => {
    const response = await axiosInstance.get(`${API_URL}/${configType}`);
    return response.data.data;
};

export const setStatutoryConfig = async (configType: string, key: string, value: string): Promise<void> => {
    await axiosInstance.post(`${API_URL}/${configType}`, { key, value });
};

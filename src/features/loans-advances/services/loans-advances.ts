import axiosInstance from '@/shared/services/axiosInstance';

const API_URL = '/loans-advances';

// ─── Loans ─────────────────────────────────────────────────────────────
export const getLoans = async () => {
    const response = await axiosInstance.get(`${API_URL}/loans`);
    return response.data.data;
};

export const createLoan = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/loans`, data);
    return response.data.data;
};

export const getLoansForApproval = async () => {
    const response = await axiosInstance.get(`${API_URL}/loans/pending-approvals`);
    return response.data.data;
};

export const approveLoanStep = async (id: number, remarks?: string) => {
    const response = await axiosInstance.patch(`${API_URL}/loans/${id}/approve-step`, { remarks });
    return response.data.data;
};

export const rejectLoanStep = async (id: number, remarks?: string) => {
    const response = await axiosInstance.patch(`${API_URL}/loans/${id}/reject-step`, { remarks });
    return response.data.data;
};

export const settleLoan = async (id: number) => {
    const response = await axiosInstance.patch(`${API_URL}/loans/${id}/settle`);
    return response.data.data;
};

// ─── Advances ──────────────────────────────────────────────────────────
export const getAdvances = async () => {
    const response = await axiosInstance.get(`${API_URL}/advances`);
    return response.data.data;
};

export const createAdvance = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/advances`, data);
    return response.data.data;
};

export const getAdvancesForApproval = async () => {
    const response = await axiosInstance.get(`${API_URL}/advances/pending-approvals`);
    return response.data.data;
};

export const approveAdvanceStep = async (id: number, remarks?: string) => {
    const response = await axiosInstance.patch(`${API_URL}/advances/${id}/approve-step`, { remarks });
    return response.data.data;
};

export const rejectAdvanceStep = async (id: number, remarks?: string) => {
    const response = await axiosInstance.patch(`${API_URL}/advances/${id}/reject-step`, { remarks });
    return response.data.data;
};

export const settleAdvance = async (id: number) => {
    const response = await axiosInstance.patch(`${API_URL}/advances/${id}/settle`);
    return response.data.data;
};

// ─── Employee Self-Service ─────────────────────────────────────────────
export const requestLoan = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/loans`, data);
    return response.data.data;
};

export const requestAdvance = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/advances`, data);
    return response.data.data;
};

// ─── Settings ──────────────────────────────────────────────────────────
export const getSettings = async () => {
    const response = await axiosInstance.get(`${API_URL}/settings`);
    return response.data.data;
};

export const saveSettings = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/settings`, data);
    return response.data.data;
};

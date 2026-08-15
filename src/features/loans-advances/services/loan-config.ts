import axiosInstance from '@/shared/services/axiosInstance';

// ─── Loan Types ────────────────────────────────────────────────────────
export const getLoanTypes = async () => {
    const response = await axiosInstance.get('/loan-types');
    return response.data.data;
};

export const getLoanTypeById = async (id: number) => {
    const response = await axiosInstance.get(`/loan-types/${id}`);
    return response.data.data;
};

export const createLoanType = async (data: any) => {
    const response = await axiosInstance.post('/loan-types', data);
    return response.data.data;
};

export const updateLoanType = async (id: number, data: any) => {
    const response = await axiosInstance.put(`/loan-types/${id}`, data);
    return response.data.data;
};

export const toggleLoanType = async (id: number) => {
    const response = await axiosInstance.patch(`/loan-types/${id}/toggle`);
    return response.data.data;
};

export const getEligibilityRules = async (loanTypeId: number) => {
    const response = await axiosInstance.get(`/loan-types/${loanTypeId}/rules`);
    return response.data.data;
};

export const updateEligibilityRules = async (loanTypeId: number, rules: any[]) => {
    const response = await axiosInstance.put(`/loan-types/${loanTypeId}/rules`, { rules });
    return response.data.data;
};

export const getApprovalWorkflow = async (loanTypeId: number) => {
    const response = await axiosInstance.get(`/loan-types/${loanTypeId}/workflow`);
    return response.data.data;
};

export const updateApprovalWorkflow = async (loanTypeId: number, steps: any[]) => {
    const response = await axiosInstance.put(`/loan-types/${loanTypeId}/workflow`, { steps });
    return response.data.data;
};

export const getLoanTypeStats = async () => {
    const response = await axiosInstance.get('/loan-types/stats');
    return response.data.data;
};

// ─── Loan Applications ─────────────────────────────────────────────────
export const getApplications = async (params?: any) => {
    const response = await axiosInstance.get('/loan-applications', { params });
    return response.data.data;
};

export const getMyApplications = async () => {
    const response = await axiosInstance.get('/loan-applications/mine');
    return response.data.data;
};

export const getApplicationById = async (id: number) => {
    const response = await axiosInstance.get(`/loan-applications/${id}`);
    return response.data.data;
};

export const createApplication = async (data: any) => {
    const response = await axiosInstance.post('/loan-applications', data);
    return response.data.data;
};

export const withdrawApplication = async (id: number) => {
    const response = await axiosInstance.patch(`/loan-applications/${id}/withdraw`);
    return response.data.data;
};

export const checkEligibility = async (loanTypeId: number) => {
    const response = await axiosInstance.get(`/loan-applications/eligibility/${loanTypeId}`);
    return response.data.data;
};

export const checkAllEligibility = async () => {
    const response = await axiosInstance.get('/loan-applications/eligibility');
    return response.data.data;
};

export const approveApplicationStep = async (id: number, remarks?: string, expectedStep?: number) => {
    const response = await axiosInstance.post(`/loan-applications/${id}/approve`, { remarks, expectedStep });
    return response.data.data;
};

export const rejectApplicationStep = async (id: number, remarks?: string, expectedStep?: number) => {
    const response = await axiosInstance.post(`/loan-applications/${id}/reject`, { remarks, expectedStep });
    return response.data.data;
};

export const getPendingApprovals = async () => {
    const response = await axiosInstance.get('/loan-applications/pending-approvals');
    return response.data.data;
};

export const getRepaymentSchedule = async (applicationId: number) => {
    const response = await axiosInstance.get(`/loan-applications/${applicationId}/schedule`);
    return response.data.data;
};

export const getDashboardStats = async () => {
    const response = await axiosInstance.get('/loan-applications/dashboard/stats');
    return response.data.data;
};

export const issueLoan = async (applicationId: number, data: any) => {
    const response = await axiosInstance.post(`/loan-applications/${applicationId}/disburse`, data);
    return response.data.data;
};

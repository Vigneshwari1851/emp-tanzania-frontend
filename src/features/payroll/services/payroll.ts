import axiosInstance from '@/shared/services/axiosInstance';

const API_URL = '/payroll';

// ─── Salary Components ──────────────────────────────────────────────────
export const getSalaryComponents = async () => {
    const response = await axiosInstance.get(`${API_URL}/components`);
    return response.data.data;
};

export const createSalaryComponent = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/components`, data);
    return response.data.data;
};

export const updateSalaryComponent = async (id: string, data: any) => {
    const response = await axiosInstance.put(`${API_URL}/components/${id}`, data);
    return response.data.data;
};

export const deleteSalaryComponent = async (id: string) => {
    const response = await axiosInstance.delete(`${API_URL}/components/${id}`);
    return response.data.data;
};

// ─── Salary Structures ──────────────────────────────────────────────────
export const getSalaryStructures = async () => {
    const response = await axiosInstance.get(`${API_URL}/structures`);
    return response.data.data;
};

export const createSalaryStructure = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/structures`, data);
    return response.data.data;
};

export const updateSalaryStructure = async (id: string, data: any) => {
    const response = await axiosInstance.put(`${API_URL}/structures/${id}`, data);
    return response.data.data;
};

export const deleteSalaryStructure = async (id: string) => {
    const response = await axiosInstance.delete(`${API_URL}/structures/${id}`);
    return response.data.data;
};

// ─── Payroll Groups ─────────────────────────────────────────────────────
export const getPayrollGroups = async () => {
    const response = await axiosInstance.get(`${API_URL}/groups`);
    return response.data.data;
};

export const createPayrollGroup = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/groups`, data);
    return response.data.data;
};

export const updatePayrollGroup = async (id: string, data: any) => {
    const response = await axiosInstance.put(`${API_URL}/groups/${id}`, data);
    return response.data.data;
};

export const deletePayrollGroup = async (id: string) => {
    const response = await axiosInstance.delete(`${API_URL}/groups/${id}`);
    return response.data.data;
};

// ─── Tax Sections ───────────────────────────────────────────────────────
export const getTaxSections = async () => {
    const response = await axiosInstance.get(`${API_URL}/tax-sections`);
    return response.data.data;
};

export const getActiveTzTaxPolicy = async () => {
    const response = await axiosInstance.get(`${API_URL}/tanzania/tax-policies/active`);
    return response.data.data;
};

export const createTaxSection = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/tax-sections`, data);
    return response.data.data;
};

export const updateTaxSection = async (id: string, data: any) => {
    const response = await axiosInstance.put(`${API_URL}/tax-sections/${id}`, data);
    return response.data.data;
};

export const deleteTaxSection = async (id: string) => {
    const response = await axiosInstance.delete(`${API_URL}/tax-sections/${id}`);
    return response.data.data;
};

// ─── Reimbursement Types ────────────────────────────────────────────────
export const getReimbursementTypes = async () => {
    const response = await axiosInstance.get(`${API_URL}/reimbursements`);
    return response.data.data;
};

export const createReimbursementType = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/reimbursements`, data);
    return response.data.data;
};

export const updateReimbursementType = async (id: string, data: any) => {
    const response = await axiosInstance.put(`${API_URL}/reimbursements/${id}`, data);
    return response.data.data;
};

export const deleteReimbursementType = async (id: string) => {
    const response = await axiosInstance.delete(`${API_URL}/reimbursements/${id}`);
    return response.data.data;
};

// ─── Payment Categories ─────────────────────────────────────────────────
export const getPaymentCategories = async () => {
    const response = await axiosInstance.get(`${API_URL}/categories`);
    return response.data.data;
};

export const createPaymentCategory = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/categories`, data);
    return response.data.data;
};

export const updatePaymentCategory = async (id: string | number, data: any) => {
    const response = await axiosInstance.put(`${API_URL}/categories/${id}`, data);
    return response.data.data;
};

export const deletePaymentCategory = async (id: string | number) => {
    const response = await axiosInstance.delete(`${API_URL}/categories/${id}`);
    return response.data.data;
};

// ─── Pay Cycle ──────────────────────────────────────────────────────────
export const getPayCycle = async () => {
    const response = await axiosInstance.get(`${API_URL}/pay-cycle`);
    return response.data.data;
};

export const updatePayCycle = async (data: any) => {
    const response = await axiosInstance.put(`${API_URL}/pay-cycle`, data);
    return response.data.data;
};

// ─── Payroll Runs / Payslips ────────────────────────────────────────────
export const getPayrollRuns = async () => {
    const response = await axiosInstance.get(`${API_URL}/runs`);
    return response.data.data;
};

export const createPayrollRun = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/runs`, data);
    return response.data.data;
};

export const updatePayrollRun = async (id: string | number, data: any) => {
    const response = await axiosInstance.put(`${API_URL}/runs/${id}`, data);
    return response.data.data;
};

// ─── Payroll Calculation Engine ─────────────────────────────────────────
export const calculatePayroll = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/calculate`, data);
    return response.data.data;
};

// ─── Employee Portal ────────────────────────────────────────────────────
export const getEmployeePortalData = async () => {
    const response = await axiosInstance.get(`${API_URL}/portal/me`);
    return response.data.data;
};

export const getMyPayslips = async () => {
    const response = await axiosInstance.get(`${API_URL}/my-payslips`);
    return response.data.data;
};

export const getMyDeclarations = async () => {
    const response = await axiosInstance.get(`${API_URL}/my-declarations`);
    return response.data.data;
};

export const submitDeclaration = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/my-declarations`, data);
    return response.data.data;
};

export const deleteDeclaration = async (id: number) => {
    const response = await axiosInstance.delete(`${API_URL}/my-declarations/${id}`);
    return response.data.data;
};

export const getEmployeeDeclarationsAdmin = async (userId: number) => {
    const response = await axiosInstance.get(`${API_URL}/employee-declarations/${userId}`);
    return response.data.data;
};

export const getMyClaims = async () => {
    const response = await axiosInstance.get(`${API_URL}/my-claims`);
    return response.data.data;
};

export const submitClaim = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/my-claims`, data);
    return response.data.data;
};

export const deleteClaim = async (id: number) => {
    const response = await axiosInstance.delete(`${API_URL}/my-claims/${id}`);
    return response.data.data;
};

// ─── Admin Claim Management ─────────────────────────────────────────────
export const getAllClaims = async () => {
    const response = await axiosInstance.get(`${API_URL}/reimbursements/all-claims`);
    return response.data.data;
};

export const getReadyToPayClaims = async () => {
    const response = await axiosInstance.get(`${API_URL}/reimbursements/ready-to-pay`);
    return response.data.data;
};

export const updateClaimPaymentMode = async (id: number, paymentMode: string) => {
    const response = await axiosInstance.patch(`${API_URL}/reimbursements/${id}/payment-mode`, { payment_mode: paymentMode });
    return response.data.data;
};

export const processClaimPayment = async (id: number, data: { payment_reference: string; payment_date: string; payment_mode?: string }) => {
    const response = await axiosInstance.post(`${API_URL}/reimbursements/${id}/pay`, data);
    return response.data.data;
};

export const updateClaimStatus = async (id: number, status: string, remarks?: string) => {
    const response = await axiosInstance.patch(`${API_URL}/reimbursements/${id}/status`, { status, remarks });
    return response.data.data;
};

export const batchUpdateClaimPaymentMode = async (ids: number[], paymentMode: string) => {
    const response = await axiosInstance.post(`${API_URL}/reimbursements/batch/payment-mode`, { ids, payment_mode: paymentMode });
    return response.data.data;
};

export const batchProcessPayment = async (ids: number[], paymentReference: string, paymentMode: string) => {
    const response = await axiosInstance.post(`${API_URL}/reimbursements/batch/pay`, { ids, payment_reference: paymentReference, payment_mode: paymentMode });
    return response.data.data;
};

// ─── Form 12B & Tax Regime ──────────────────────────────────────────────
export const submitForm12B = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/form-12b`, data);
    return response.data.data;
};

export const updateTaxRegime = async (regime: string) => {
    const response = await axiosInstance.post(`${API_URL}/tax-regime`, { regime });
    return response.data.data;
};

// ─── Reports ────────────────────────────────────────────────────────────
export const getForm16Data = async (employeeId: string | number, financialYear: string = '2025-26') => {
    const response = await axiosInstance.get(`${API_URL}/reports/form-16`, {
        params: { financialYear, employeeId }
    });
    return response.data.data;
};

// ─── Loans & Advances ───────────────────────────────────────────────────
export const requestLoan = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/loans`, data);
    return response.data.data;
};

export const requestAdvance = async (data: any) => {
    const response = await axiosInstance.post(`${API_URL}/advances`, data);
    return response.data.data;
};

// ─── Tax Declarations ───────────────────────────────────────────────────
export const getPendingTaxDeclarations = async () => {
    const response = await axiosInstance.get(`${API_URL}/pending-declarations`);
    return response.data.data;
};

export const approveTaxDeclaration = async (id: number, remarks?: string) => {
    const response = await axiosInstance.post(`${API_URL}/tax-declarations/${id}/approve`, { remarks });
    return response.data.data;
};

export const rejectTaxDeclaration = async (id: number, remarks?: string) => {
    const response = await axiosInstance.post(`${API_URL}/tax-declarations/${id}/reject`, { remarks });
    return response.data.data;
};

export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

const payrollService = {
    getPendingTaxDeclarations,
    approveTaxDeclaration,
    rejectTaxDeclaration,
    getSalaryComponents,
    getSalaryStructures,
    getPayrollGroups,
    getTaxSections,
    uploadFile,
    getMyClaims,
    submitClaim,
    deleteClaim,
    updateClaimStatus,
    getAllClaims,
};

export default payrollService;

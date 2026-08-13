import axiosInstance from '@/shared/services/axiosInstance';

export interface Employee {
  id: number;
  username: string;
  email: string;
  status: boolean;
  created_at: string;
  details?: {
    id: number;
    user_id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    nationality: string;
    marital_status: string;
    blood_group: string;
    phone: string;
    secondary_phone?: string;
    secondary_email?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    employee_id: string;
    department_id: number;
    team_id?: number;
    job_role: string;
    employment_type: string;
    start_date: string;
    work_location: string;
    work_schedule?: string;
    reporting_manager_id?: number;
    probation_period?: number;
    base_salary: string;
    currency: string;
    salary_frequency: string;
    pan_number?: string;
    aadhaar_number?: string;
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    ifsc_code?: string;
    certifications?: string[] | string;
    documents?: string[];
    department?: {
      id: number;
      department_name: string;
    };
    [key: string]: any;
  };
  roles?: any[];
  [key: string]: any;
}

export const getEmployees = async (params: any = {}): Promise<Employee[]> => {
  try {
    const response = await axiosInstance.get("/employees", { params });
    const data = response.data.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch employees" };
  }
};

export const getEmployee = async (id: number): Promise<Employee> => {
  try {
    const response = await axiosInstance.get(`/employees/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch employee details" };
  }
};

export const parseBackendError = (error: any, fallbackMessage: string): string => {
  if (!error) return fallbackMessage;
  if (typeof error === 'string') return error;

  const data = error.response?.data || error;
  if (!data) return fallbackMessage;
  if (typeof data === 'string') return data;

  const mainMessage = data.message || error.message;
  const errors = data.errors || error.errors;

  if (errors) {
    if (Array.isArray(errors) && errors.length > 0) {
      const fieldMessages = errors.map((e: any) => {
        if (typeof e === 'string') return e;
        if (e && typeof e === 'object' && e.message) {
          const rawField = e.field ? String(e.field).replace(/^(body|query|params)\./, '') : '';
          const cleanField = rawField ? rawField.replace(/_/g, ' ') : '';
          return cleanField ? `${cleanField}: ${e.message}` : e.message;
        }
        return String(e);
      });

      if (!mainMessage || mainMessage.toLowerCase() === 'validation error') {
        return fieldMessages.join('\n');
      }
      return `${mainMessage}: ${fieldMessages.join('\n')}`;
    } else if (typeof errors === 'string') {
      return errors;
    }
  }

  return mainMessage || fallbackMessage;
};

export const createEmployee = async (data: FormData | Record<string, any>): Promise<Employee> => {
  try {
    // Check if data is FormData
    const isFormData = data instanceof FormData;

    const response = await axiosInstance.post("/employees", data, {
      headers: isFormData ? {
        'Content-Type': undefined,
      } : {
        'Content-Type': 'application/json',
      },
    });
    return response.data.data;
  } catch (error: any) {
    const errorData = error.response?.data || error;
    const formattedMsg = parseBackendError(error, "Failed to create employee");
    throw {
      ...(typeof errorData === 'object' ? errorData : {}),
      message: formattedMsg,
    };
  }
};

export const updateEmployee = async (id: number, data: FormData | Record<string, any>): Promise<Employee> => {
  try {
    // Check if data is FormData
    const isFormData = data instanceof FormData;

    const response = await axiosInstance.put(`/employees/${id}`, data, {
      headers: isFormData ? {
        'Content-Type': undefined,
      } : {
        'Content-Type': 'application/json',
      },
    });
    return response.data.data;
  } catch (error: any) {
    const errorData = error.response?.data || error;
    const formattedMsg = parseBackendError(error, "Failed to update employee");
    throw {
      ...(typeof errorData === 'object' ? errorData : {}),
      message: formattedMsg,
    };
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/employees/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete employee" };
  }
};

export const generateEmployeeId = async (): Promise<string> => {
  try {
    const response = await axiosInstance.get("/employees/generate-id");
    return response.data.data?.employee_id || "";
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to generate employee ID" };
  }
};

export const getEmployeesByTeam = async (teamId: number): Promise<Employee[]> => {
  try {
    const response = await axiosInstance.get(`/employees/team/${teamId}`);
    return response.data.data || [];
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch team employees" };
  }
};

export const checkDuplicate = async (params: { email?: string; phone?: string }): Promise<{ emailExists: boolean; phoneExists: boolean }> => {
  try {
    const response = await axiosInstance.get("/employees/validate/check-duplicate", { params });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to check duplicates" };
  }
};


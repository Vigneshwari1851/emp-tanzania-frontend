import axiosInstance from "@/shared/services/axiosInstance";

export const loginUser = async (email: string, password: string, orgSlug?: string) => {
  try {
    const response = await axiosInstance.post("/auth/login", { email, password, orgSlug });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Login failed" };
  }
};

export const verifyOtp = async (email: string, otp: string, orgSlug?: string) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", { email, otp, orgSlug });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "OTP verification failed" };
  }
};

export const sendResetPasswordEmail = async (email: string) => {
  try {
    const response = await axiosInstance.post("/auth/forgot-password", { email });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to send reset password email" };
  }
};

export const resetPasswordViaEmail = async (data: any) => {
  try {
    const response = await axiosInstance.post("/auth/reset-password", data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Password reset failed" };
  }
};

export const logout = async () => {
  try {
    const response = await axiosInstance.post("/auth/logout");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Logout failed" };
  }
};

export const resetPassword = async (data: any) => {
  try {
    const response = await axiosInstance.post("/auth/change-password", data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Password change failed" };
  }
};

export const getOrganizationBySlug = async (slug: string) => {
  try {
    const response = await axiosInstance.get(`/organizations/by-slug/${slug}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch organization details" };
  }
};

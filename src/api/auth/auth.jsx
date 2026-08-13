import { apiFetch } from "@/shared/services/config";

export const loginUser = async (email, password) => {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw { data };
  return data;
};

export const verifyOtp = async (email, otp) => {
  const response = await apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "OTP verification failed");
  return data;
};

export const sendResetPasswordEmail = async (email) => {
  const response = await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "Failed to send reset password email");
  return json;
};

export const resetPasswordViaEmail = async (data) => {
  const response = await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "Password reset failed");
  return json;
};

export const logout = async () => {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "Logout failed");
  return json;
};

// Add general reset (change) password to auth API 
export const resetPassword = async (data) => {
  const response = await apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "Password reset failed");
  return json;
};

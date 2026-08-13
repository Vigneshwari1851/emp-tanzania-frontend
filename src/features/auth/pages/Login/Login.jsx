import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

import { useTheme } from "@/shared/hooks/useTheme";
import { useAuth } from "@/shared/context/AuthContext";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { getOrganizationBySlug } from "@/features/auth/services/auth";
import { applyBrandTheme } from "@/shared/utils/theme";


function Login() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const theme = useTheme();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    if (orgSlug) {
      getOrganizationBySlug(orgSlug)
        .then((res) => {
          if (res.success && res.data) {
            setOrganization(res.data);
            const cfg = res.data.config || {};
            applyBrandTheme(cfg.primary_color, cfg.secondary_color);
          }
        })
        .catch((err) => {
          console.error("Failed to load organization details:", err);
        });
    }
  }, [orgSlug]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Load saved email on page load
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    // Added: Check if session was invalidated because another device logged in
    if (urlParams.get("single_device") === "true") {
      toast.error("Your account has been logged in from another device. Please log in again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("expired") === "true") {
      toast.error("Session expired. Please login again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);



  // Input change
  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));

    // if email cleared → remove saved email
    if (name === "email" && !value) {
      localStorage.removeItem("savedEmail");
      setRememberMe(false);
    }
  };

  // Remember me toggle
  const handleRememberChange = (event) => {
    const checked = event.target.checked;
    setRememberMe(checked);

    if (!checked) {
      localStorage.removeItem("savedEmail");
    }
  };

  const validateForm = () => {
    const newErrors = { email: "", password: "" };

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else {
      const emailPattern = /\S+@\S+\.\S+/;
      if (!emailPattern.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address.";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password cannot be empty.";
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await login(formData.email, formData.password, orgSlug);

      handleRememberLogic();

      // Determine MFA behaviour from org config
      const mfaPolicy = organization?.config?.mfa_policy ?? "email_otp";

      if (mfaPolicy === "disabled") {
        // No MFA – go straight to the portal
        sessionStorage.setItem("is_session_active", "true");
        if (orgSlug) {
          navigate(`/${orgSlug}`, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } else {
        // MFA required – go to OTP verification
        sessionStorage.setItem("pendingEmail", formData.email);
        sessionStorage.setItem("rememberMePreference", rememberMe.toString());
        sessionStorage.setItem("mfa_policy", mfaPolicy);

        if (mfaPolicy === "totp") {
          toast.info("Open your authenticator app (Google Authenticator / Authy) to get your 6-digit code.");
        } else if (mfaPolicy === "sms_otp") {
          toast.success("OTP sent to your registered mobile number!");
        } else {
          toast.success("OTP sent to your email!");
        }

        if (orgSlug) {
          navigate(`/${orgSlug}/verify-login`);
        } else {
          navigate("/verify-login");
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (error && error.errors) {
        const { remainingAttempts, isLocked } = error.errors;
        if (isLocked) {
          toast.error("Account locked due to too many failed login attempts. Please try again in 10 minutes.");
        } else if (remainingAttempts !== undefined) {
          toast.error(`Incorrect password. You have ${remainingAttempts} attempts left.`);
        } else {
          toast.error(error.message || "Invalid credentials");
        }
      } else {
        toast.error(error.message || "Invalid credentials");
      }
    }
    setIsSubmitting(false);
  };

  // Remember Me save/remove logic
  const handleRememberLogic = () => {
    if (rememberMe) {
      localStorage.setItem("savedEmail", formData.email);
    } else {
      localStorage.removeItem("savedEmail");
    }
  };

  const statusStyles = {
    container: {
      width: 360,
      height: 56,
      top: 32,
      right: 24,
      borderRadius: 8,
      padding: "12px 16px",
      gap: 16,
      backgroundColor: "#2E3439",
      boxShadow:
        "0px 8px 10px 0px #00000033, 0px 6px 30px 0px #0000001F, 0px 16px 24px 0px #00000024",
    },
  };

  const inputClass = (hasError) => `
    w-full px-4 py-3 h-12 rounded-lg border text-sm outline-none transition-all
    text-slate-900 placeholder-slate-400 bg-white
    ${hasError ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-[#D1D5DB] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"}
  `;

  return (
    <AuthLayout logoUrl={organization?.logo_url} entityName={organization?.entity_name}>
      {/* Login Card Component */}
      <div className="w-[420px] h-[460px] bg-[#fffefb] rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] px-8 py-10 flex flex-col relative z-10 border border-slate-100/50">
        <div className="w-full text-center">
          <p className="text-slate-900 tracking-tight mb-1" style={{ fontSize: '28px', fontWeight: 700 }}>
            Welcome 
          </p>
          <p className="text-[13px] font-semibold text-slate-500">
            Employee Experience Portal
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} noValidate className="w-full flex-1 flex flex-col justify-between mt-14">
          <div className="flex flex-col w-full gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Type your email here"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  className={inputClass(!!errors.email)}
                />
                {errors.email && (
                  <p className="text-xs text-[#EB1D2E] mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={window.innerWidth < 1024 ? "Enter your password" : "Enter the password "}
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete="current-password"
                    className={inputClass(!!errors.password)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-auto p-0 text-slate-400 border-0 bg-transparent hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeIcon className="h-5 w-5" />
                    ) : (
                      <EyeSlashIcon className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-[#EB1D2E] mt-1">{errors.password}</p>
                )}
              </div>

              {/* Utilities Row (Remember me & Forgot Password) */}
              <div className="flex items-center justify-between text-sm mt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={handleRememberChange}
                      className="peer absolute h-4 w-4 opacity-0 cursor-pointer"
                    />
                    <div className="h-4 w-4 border border-slate-300 rounded-md bg-white peer-checked:bg-blue-600 peer-checked:border-transparent flex items-center justify-center transition-colors">
                      <svg
                        className={`w-2.5 h-2.5 text-white transition-opacity duration-150 ${rememberMe ? "opacity-100" : "opacity-0"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      >
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  Remember me
                </label>

                {/* Forgot Password */}
                <button
                  type="button"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline bg-transparent border-0 cursor-pointer"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>
          </div>
          {/* Submit & SSO */}
          <div className="w-full flex flex-col gap-4 mb-[60px]">
            <button
              type="submit"
              className={`w-full h-12 text-white font-bold rounded-lg transition-colors duration-200 flex items-center justify-center text-sm
                ${formData.email && !isSubmitting ? "bg-[#0024cb] hover:bg-[#001da3] cursor-pointer" : "bg-[#0024cb]/50 cursor-not-allowed"}`}
              disabled={!formData.email || isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>

            {/* Single Sign-On (SSO) option */}
            {organization?.config?.sso_provider && organization.config.sso_provider == 'local' && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-center">
                <div className="relative flex items-center justify-center">
                  <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Or sign in with SSO
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    toast.info(`Redirecting to ${organization.config.sso_provider.toUpperCase()} SSO portal...`);
                  }}
                  className="w-full flex items-center justify-center gap-2 h-11 text-xs font-bold border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 rounded-lg"
                >
                  {organization.config.sso_provider === 'google' && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  {organization.config.sso_provider === 'microsoft' && (
                    <svg className="w-4 h-4" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                  )}
                  {organization.config.sso_provider === 'saml' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  Sign in with {organization.config.sso_provider.toUpperCase()} SSO
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}

export default Login;

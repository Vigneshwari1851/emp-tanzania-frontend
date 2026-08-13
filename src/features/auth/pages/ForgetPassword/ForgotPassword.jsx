import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendResetPasswordEmail } from "@/features/auth/services/auth";
import { useTheme } from "@/shared/hooks/useTheme";
import AuthLayout from "@/features/auth/components/AuthLayout";
import mail from "@/assets/forgotpassword/mail.svg";

function ForgotPassword() {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("pendingEmail");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleContinue = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Email field cannot be empty.");
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await sendResetPasswordEmail(email);
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send reset email"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      {/* Forgot Password Card Component */}
      <div 
        className="w-[420px] h-[320px] bg-[#fffefb] rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] px-8 py-10 flex flex-col justify-between items-center relative z-10 border border-slate-100/80 transition-all duration-300"
      >
        {!submitted ? (
          <form onSubmit={handleContinue} className="w-full flex-1 flex flex-col justify-between">
            <div className="w-full flex flex-col items-center gap-6">
              {/* HEADER */}
              <div className="text-center w-full">
                <p className="text-slate-900 tracking-tight mb-1" style={{ fontSize: '28px', fontWeight: 700 }}>
                  Forgot Password
                </p>
                <p className="text-xs font-medium text-slate-500 mt-2">
                  Please enter your email address below.
                </p>
              </div>

              {/* EMAIL INPUT */}
              <div className="w-full mt-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="Type your email here"
                    value={email}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    className={`w-full pl-11 pr-4 py-3 h-12 rounded-lg border text-sm outline-none transition-all text-slate-900 placeholder-slate-400 bg-white
                      ${errorMessage 
                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100" 
                        : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      } disabled:opacity-60`}
                  />
                </div>
                {errorMessage && (
                  <p className="text-xs text-[#EB1D2E] mt-1.5 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                    </svg>
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex w-full gap-4 mb-2">
              <button
                type="button"
                disabled={isSubmitting}
                className="h-12 flex-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-all duration-200 cursor-pointer flex items-center justify-center text-sm disabled:opacity-50"
                onClick={() => navigate("/login")}
              >
                Back
              </button>

              <button
                type="submit"
                className={`h-12 flex-1 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center text-sm gap-2
                  ${email && !isSubmitting
                    ? "bg-[#0024cb] hover:bg-[#001da3] hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] cursor-pointer" 
                    : "bg-[#0024cb]/50 cursor-not-allowed"}`}
                disabled={!email || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4.5 w-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-between">
            <div className="w-full flex flex-col items-center gap-6 text-center">
              {/* MAIL ICON WITH RADIAL GLOW */}
              <div className="relative flex items-center justify-center mb-2">
                <div className="absolute w-[120px] h-[120px] bg-[#155DFC] opacity-20 blur-[50px] rounded-full"></div>
                <img src={mail} alt="mail" className="w-14 h-14 relative z-10 animate-bounce" />
              </div>

              <h2 className="text-lg font-bold text-slate-900 leading-snug text-center">
                A temporary access link <br />
                has been sent to your email.
              </h2>

              <p className="text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                Please click the link in the email to create a new password for your account.
              </p>
            </div>

            <button
              className="h-12 w-full mb-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-all duration-200 cursor-pointer flex items-center justify-center text-sm"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

export default ForgotPassword;

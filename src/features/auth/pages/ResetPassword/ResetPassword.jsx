import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resetPassword, resetPasswordViaEmail } from "../../services/auth";
import { EyeIcon, EyeSlashIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../../../shared/hooks/useTheme";
import AuthLayout from '@/features/auth/components/AuthLayout';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState(false);

    const queryParams = new URLSearchParams(location.search);
    const urlEmail = queryParams.get("email");
    const urlToken = queryParams.get("token");

    const email = !urlEmail ? sessionStorage.getItem("pendingEmail") : null;
    const oldPassword = !urlEmail ? sessionStorage.getItem("oldPassword") : null;

    const validatePassword = (password) => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[@#$%^&_*!]/.test(password),
    });

    const rules = validatePassword(password);

    const inputClass = (hasError) => theme.input.base(hasError);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!password || !confirmPassword) {
            setError("This fields can't be empty");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords doesn't match. Please try again.");
            return;
        }

        setLoading(true);

        try {
            const payload = urlEmail
                ? { email: urlEmail, token: urlToken, password: password }
                : { email, oldPassword, newPassword: password };

            const res = urlEmail
                ? await resetPasswordViaEmail(payload)
                : await resetPassword(payload);

            // API throws error on failure, so reaching here means success
            if (!urlEmail) {
                sessionStorage.removeItem("pendingEmail");
                sessionStorage.removeItem("oldPassword");
            }
            navigate("/login");
        } catch (err) {
            setError(err.message || "Failed to reset password. Try again.");
        }

        setLoading(false);
    };

    return (
        <AuthLayout>
            {/* RIGHT FORM SECTION */}
            <div className={`relative z-10 flex flex-1 items-center justify-center px-6 py-10 ${theme.colors.background.panel} ${theme.colors.textMain}`}>
                <div className={`w-full max-w-[548px] ${theme.colors.background.panel}`}>
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col mx-auto w-full max-w-[420px] gap-6">
                            <div className="flex flex-col gap-2 items-center text-center mb-2">
                                <h2 className={`${theme.text.heading2} font-bold`}>Reset Password</h2>
                                <p className={`${theme.text.body} ${theme.colors.textSecondary} max-w-[300px] leading-relaxed mt-1`}>
                                    Enter your new password and confirm it below.
                                </p>
                            </div>

                            {/* New Password */}
                            <div className="flex flex-col gap-1">
                                <div className="relative">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        placeholder="New password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setTouched(true);
                                        }}
                                        onFocus={() => setTouched(true)}
                                        className={inputClass(!!error)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a2aed0]"
                                        onClick={() => setShowPass(!showPass)}
                                    >
                                        {showPass ? (
                                            <EyeIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeSlashIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="flex flex-col gap-1">
                                <div className="relative">
                                    <input
                                        type={showConfirmPass ? "text" : "password"}
                                        placeholder="Confirm password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setTouched(true);
                                        }}
                                        onFocus={() => setTouched(true)}
                                        className={inputClass(!!error)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a2aed0]"
                                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                                    >
                                        {showConfirmPass ? (
                                            <EyeIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeSlashIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error message */}
                            {error && <p className={`${theme.text.caption} ${theme.colors.error}`}>{error}</p>}

                            {/* PASSWORD RULES WITH BIG TICK ICONS */}
                            <ul className="mt-2 space-y-2 text-xs text-[#ABABAB]">
                                {[
                                    { check: rules.length, label: "At least 8 characters long" },
                                    { check: rules.uppercase, label: "One Uppercase letter (A-Z)" },
                                    { check: rules.lowercase, label: "One Lowercase letter (a-z)" },
                                    { check: rules.number, label: "One Number (0-9)" },
                                    { check: rules.special, label: "One special character (@#$%^&*!)" },
                                ].map((rule, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <span
                                            className={`h-3.5 w-3.5 flex items-center justify-center bg-transparent rounded-full border p-0.5 ${rule.check
                                                ? "bg-[#155DFC] border-[#155DFC] border"
                                                : "border-[#4B5563] border"
                                                }`}
                                        >
                                            {rule.check && <CheckIcon className="h-4 w-4 text-[#155DFC] " />}
                                        </span>
                                        {rule.label}
                                    </li>
                                ))}
                            </ul>

                            {/* Buttons */}
                            <div className="mt-4 flex items-center justify-between gap-4">
                                {!urlEmail && (
                                    <button
                                        type="button"
                                        className={`h-11 flex-1 ${theme.button.outline}`}
                                        onClick={() => navigate(-1)}
                                    >
                                        Back
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    className={`h-11 flex-1 ${password ? theme.button.primary : theme.button.disabled} disabled:opacity-60`}
                                    disabled={!password || loading}
                                    onClick={handleSubmit}
                                >
                                    {loading ? "Processing..." : "Save Password"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AuthLayout>
    );
};

export default ResetPassword;

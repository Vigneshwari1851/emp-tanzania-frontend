import * as React from "react";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface LoginFormProps {
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  theme: any;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading, theme }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = { email: "", password: "" };
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email";

    if (!formData.password) newErrors.password = "Password is required";

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, rememberMe });
    }
  };

  const inputClass = (hasError: boolean) => theme.input.base(hasError);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground mb-1 lg:text-foreground">Email Address</label>
        <input
          name="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange}
          className={inputClass(!!errors.email)}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground mb-1 lg:text-foreground">Password</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            className={inputClass(!!errors.password)}
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer text-gray-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          Remember me
        </label>
        <button type="button" className="text-primary font-medium hover:underline">
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 rounded-sm font-semibold transition-all ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-primary/95 text-white shadow-sm shadow-primary-200"
          }`}
      >
        {isLoading ? "Authenticating..." : "Sign In"}
      </button>
    </form>
  );
};

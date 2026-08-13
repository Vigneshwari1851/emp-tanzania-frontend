import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-outline" | "cancel";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-primary/20 active:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

  const variantStyles = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/25",
    secondary: "bg-secondary text-white hover:bg-secondary/90 shadow-sm shadow-secondary/25",
    outline: "border border-border bg-card text-foreground hover:bg-muted",
    cancel: "text-muted-foreground hover:text-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    danger: "bg-destructive text-white hover:bg-destructive/90 shadow-sm shadow-destructive/25",
    "danger-outline": "border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 hover:border-destructive/30",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Converts a string to Title Case (First Letter of Each Word Uppercase)
 */
export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Capitalizes only the first letter of the entire string
 */
export const capitalizeFirstLetter = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * Maps technical role names to business-friendly display names.
 * Specifically maps 'user' to 'Employee' for UI display.
 */
export const formatDisplayRole = (role: string | null | undefined): string => {
  if (!role) return "";
  const normalized = role.trim().toLowerCase().replace(/\s+/g, '_');

  const mapping: Record<string, string> = {
    super_admin: "Super Admin",
    superadmin: "Super Admin",
    admin: "Admin",
    manager: "Manager",
    employee: "Employee",
    user: "Employee",
  };

  return (
    mapping[normalized] || toTitleCase(role.replace(/_/g, " "))
  );
};

export const formatRole = (role?: string) => {
  if (!role) return "";

  const normalized = role.toLowerCase().replace(/[_\s]/g, "");

  switch (normalized) {
    case "superadmin":
      return "SuperAdmin";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "user":
      return "Employee";
    default:
      return role;
  }
};

/**
 * Normalizes qualification levels (e.g. 10th -> SSLC, 12th -> PUC) for legacy data compatibility.
 */
export function normalizeQualificationLabel(level: string | undefined | null): string {
  if (!level) return "";
  
  const lower = level.toLowerCase().trim();
  
  if (lower === "10th" || lower === "10th standard" || lower === "sse" || lower === "sslc") {
    return "SSLC";
  }
  if (lower === "12th" || lower === "12th standard" || lower === "hsc" || lower === "puc") {
    return "PUC";
  }
  
  return level
    .replace(/10th\s*(Standard)?/gi, "SSLC")
    .replace(/12th\s*(Standard)?/gi, "PUC");
}


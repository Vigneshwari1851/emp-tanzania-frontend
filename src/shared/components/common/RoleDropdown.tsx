import * as React from "react";
import { useState, useEffect } from "react";
import { getRoles } from '@/features/rbac/services/roles';
import type { Role } from '@/features/rbac/services/roles';
import { toTitleCase } from '@/shared/utils/stringUtils';
import Select from "@/shared/components/ui/Select";

interface RoleDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  label?: string;
}

export const RoleDropdown: React.FC<RoleDropdownProps> = ({
  value,
  onChange,
  required = false,
  className = "",
  label = "System Role"
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRoles();
        setRoles(data);
      } catch (err) {
        console.error("Failed to fetch roles", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const options = roles
    .filter((r) => r.name.toLowerCase() !== "employee")
    .map((role) => ({
      value: String(role.id),
      label: toTitleCase(role.name)
    }));

  return (
    <div className={`w-full ${className}`}>
      <Select
        value={String(value)}
        onChange={onChange}
        required={required}
        label={label}
        disabled={isLoading}
        placeholder={isLoading ? "Loading..." : "Select Role"}
        options={options}
      />
    </div>
  );
};

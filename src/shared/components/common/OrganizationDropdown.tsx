import * as React from "react";
import { useState, useEffect } from "react";
import { getOrganizations } from '@/features/organization/services/organizations';
import Select from "@/shared/components/ui/Select";

interface OrganizationDropdownProps {
  value: string;
  onChange: (value: string) => void;
  type: "payroll_statutory_unit" | "legal_employer" | "legislative_data_group";
  label: string;
  required?: boolean;
}

export const OrganizationDropdown: React.FC<OrganizationDropdownProps> = ({
  value,
  onChange,
  type,
  label,
  required = false
}) => {
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await getOrganizations();
        const uniqueOptions = [...new Set(data.map(o => o[type]).filter(Boolean))] as string[];
        setOptions(uniqueOptions);
      } catch (err) {
        console.error(`Failed to fetch ${label}`, err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, [type, label]);

  const selectOptions = options.map(opt => ({ value: opt, label: opt }));

  return (
    <Select
      value={value}
      onChange={onChange}
      required={required}
      label={label}
      disabled={isLoading}
      placeholder={isLoading ? "Loading..." : `Select ${label}`}
      options={selectOptions}
    />
  );
};

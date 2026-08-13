import * as React from "react";
import { useState, useEffect } from "react";
import { getDepartments } from '@/features/organization/services/departments';
import type { Department } from '@/features/organization/services/departments';
import Select from "@/shared/components/ui/Select";

interface DepartmentDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  error?: string;
}

export const DepartmentDropdown: React.FC<DepartmentDropdownProps> = ({
  value,
  onChange,
  required = false,
  className = "",
  error
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getDepartments();
        const staticDepts = ["Sales", "Marketing", "HR", "Finance"];
        const fetchedNames = data.map(d => d.department_name.toLowerCase());

        const filteredStatic = staticDepts.filter(sd => !fetchedNames.includes(sd.toLowerCase()))
          .map((name, index) => ({
            id: `static-${index}`,
            department_name: name,
            status: true,
            permissions: []
          }));

        setDepartments([...data, ...(filteredStatic as any)]);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const options = departments.map(dep => ({
    value: String(dep.id),
    label: dep.department_name
  }));

  return (
    <div className={`w-full ${className}`}>
      <Select
        value={String(value)}
        onChange={onChange}
        required={required}
        error={error}
        label="Department"
        disabled={isLoading}
        placeholder={isLoading ? "Loading..." : "Select Department"}
        options={options}
      />
    </div>
  );
};

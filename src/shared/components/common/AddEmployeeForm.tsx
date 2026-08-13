import * as React from "react";
import { useState } from "react";
import { DepartmentDropdown } from "./DepartmentDropdown";
import { RoleDropdown } from "./RoleDropdown";
import { OrganizationDropdown } from "./OrganizationDropdown";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import type { Employee } from '@/features/employees/services/employees';

interface AddEmployeeFormProps {
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<Employee>;
}

export const AddEmployeeForm: React.FC<AddEmployeeFormProps> = ({
  onSubmit,
  isSubmitting,
  initialData = {}
}) => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    departmentId: "",
    roleId: "",
    job_title: "",
    legal_employer: "",
    payroll_statutory_unit: "",
    legislative_data_group: "",
    date_of_joining: new Date().toISOString().split('T')[0],
    ...initialData
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    let formattedValue = value;
    if (type === "text" || e.target.tagName === "TEXTAREA") {
      if (name !== "email") { // Skip email field
        formattedValue = value.charAt(0).toUpperCase() + value.slice(1);
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleDropdownChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">First Name <span className="text-red-500">*</span></label>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Last Name <span className="text-red-500">*</span></label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Job & Organization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Job Title <span className="text-red-500">*</span></label>
                <input
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <DepartmentDropdown
                value={formData.departmentId}
                onChange={(val) => handleDropdownChange("departmentId", val)}
                required
              />
              <RoleDropdown
                value={formData.roleId}
                onChange={(val) => handleDropdownChange("roleId", val)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date of Joining</label>
                <ModernDatePicker
                  value={formData.date_of_joining}
                  onChange={(date) => setFormData(prev => ({ ...prev, date_of_joining: date }))}
                  placeholder="Select Date of Joining"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <OrganizationDropdown
                type="legal_employer"
                label="Legal Employer"
                value={formData.legal_employer}
                onChange={(val) => handleDropdownChange("legal_employer", val)}
              />
              <OrganizationDropdown
                type="payroll_statutory_unit"
                label="Payroll Statutory Unit"
                value={formData.payroll_statutory_unit}
                onChange={(val) => handleDropdownChange("payroll_statutory_unit", val)}
              />
              <OrganizationDropdown
                type="legislative_data_group"
                label="Legislative Data Group"
                value={formData.legislative_data_group}
                onChange={(val) => handleDropdownChange("legislative_data_group", val)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" className="px-6">Cancel</Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/95 text-white px-8"
        >
          {isSubmitting ? "Saving..." : "Save User"}
        </Button>
      </div>
    </form>
  );
};

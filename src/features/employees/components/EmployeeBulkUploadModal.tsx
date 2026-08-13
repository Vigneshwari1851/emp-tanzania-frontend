import React, { useState, useRef } from "react";
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/shared/components/ui/button";
import { createEmployee } from "@/features/employees/services/employees";
import { getDepartments } from "@/features/organization/services/departments";
import { getDesignations } from "@/features/organization/services/designations";
import { getRoles } from "@/features/rbac/services/roles";
import { getTeams } from "@/features/organization/services/teams";
import { getOrganizations } from "@/features/organization/services/organizations";

interface EmployeeBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeBulkUploadModal({ isOpen, onClose, onSuccess }: EmployeeBulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ total: number; success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const flattenDesignations = (nodes: any[], depth = 0): { id: number; name: string; code: string }[] => {
    let list: any[] = [];
    if (!nodes || !Array.isArray(nodes)) return list;
    nodes.forEach(node => {
      list.push({
        id: node.id,
        name: node.designation_name || node.name,
        code: node.designation_code || node.code,
      });
      if (node.sub_designations && node.sub_designations.length > 0) {
        list = [...list, ...flattenDesignations(node.sub_designations, depth + 1)];
      }
    });
    return list;
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const templateData = [
      {
        "First Name": "John",
        "Middle Name": "Robert",
        "Last Name": "Doe",
        "Email": "john.doe@example.com",
        "Secondary Email": "john.personal@example.com",
        "Phone": "1234567890",
        "Secondary Phone": "0987654321",
        "Gender": "Male",
        "Date of Birth": "1990-01-01",
        "Nationality": "US",
        "Marital Status": "Single",
        "Blood Group": "O+",
        "Address": "123 Main St",
        "City": "New York",
        "State": "NY",
        "Zip": "10001",
        "Country": "USA",
        "Emergency Contact": "Jane Doe",
        "Emergency Relationship": "Spouse",
        "Emergency Phone": "0987654321",
        "Emergency Email": "jane.doe@example.com",
        "Department ID": "1",
        "Team ID": "1",
        "Role ID": "2",
        "Designation ID": "1",
        "Job Title": "Software Engineer",
        "Employment Type": "Full-Time",
        "Joining Date": "2024-01-01",
        "Work Location": "New York",
        "Work Schedule": "9 AM - 5 PM",
        "Reporting Manager ID": "1",
        "Probation Period": "90",
        "Sub Status": "Active",
        "Base Salary": "60000",
        "Currency": "USD",
        "Salary Frequency": "Monthly",
        "Payroll Group ID": "1",
        "Bank Name": "Chase",
        "Branch Name": "Downtown",
        "Account Holder Name": "John Doe",
        "Account Number": "123456789",
        "IFSC Code": "CHAS001",
        "Passport Number": "A1234567",
        "Passport Expiry Date": "2030-01-01",
        "Driving License Number": "DL12345",
        "License Expiry Date": "2030-01-01",
        "PAN Number": "ABCDE1234F",
        "Aadhaar Number": "123456789012",
        "Skills": "React, Node.js, TypeScript",
        "Certifications": "AWS Certified, PMP",
        "Languages": "English, Spanish",
        "Family Member Name": "Jane Doe",
        "Family Member Relation": "Spouse",
        "Family Member DOB": "1992-05-10",
        "Family Member Phone": "0987654321"
      }
    ];

    const instructionData = [
      { "Column Name": "Gender", "Valid Values": "Male, Female, Other, Prefer not to say" },
      { "Column Name": "Employment Type", "Valid Values": "Full-Time, Part-Time, Contract, Intern" },
      { "Column Name": "Sub Status", "Valid Values": "Probation, Confirmed, On leave, Garden leave, Notice period, Deputation, Reduced hours, Active contract, Contract renewed, Pre-conversion, On hold, Onboarding, Active intern, Nearing end, Extended, Maternity leave, Paternity leave, Medical leave, Sabbatical, Unpaid leave, Suspension, Resigned, Terminated, Contract ended, Internship ended, Retirement pending, Relieved, Retired, Dismissed, Absconded, Deceased" },
      { "Column Name": "Marital Status", "Valid Values": "Single, Married, Divorced, Widowed, Separated" },
      { "Column Name": "Blood Group", "Valid Values": "A+, A-, B+, B-, AB+, AB-, O+, O-" },
      { "Column Name": "Work Schedule", "Valid Values": "Fixed, Flexible, Shifts" },
      { "Column Name": "Salary Frequency", "Valid Values": "Monthly, Bi-weekly, Weekly, Yearly" },
      { "Column Name": "Currency", "Valid Values": "USD, EUR, GBP, INR, AUD, CAD, SGD, JPY" },
      { "Column Name": "Skills", "Valid Values": "Comma-separated list (e.g., React, Node, SQL)" },
      { "Column Name": "Certifications", "Valid Values": "Comma-separated list (e.g., AWS, PMP)" },
      { "Column Name": "Languages", "Valid Values": "Comma-separated list (e.g., English, Spanish, French)" }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wsInstructions = XLSX.utils.json_to_sheet(instructionData);
    
    // Auto-size columns for better readability
    ws['!cols'] = Object.keys(templateData[0]).map(() => ({ wch: 20 }));
    wsInstructions['!cols'] = [{ wch: 20 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee Data");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Valid Values & Instructions");

    // Fetch system IDs to help users map names to IDs
    try {
      const [departments, designationsResponse, roles, teams, orgs] = await Promise.all([
        getDepartments().catch(() => []),
        getDesignations().catch(() => []),
        getRoles().catch(() => []),
        getTeams().catch(() => []),
        getOrganizations().catch(() => [])
      ]);

      const flatDesignations = flattenDesignations(designationsResponse);
      const normalizedOrgs = Array.isArray(orgs) ? orgs : (orgs ? [orgs] : []);
      const locations = [{ id: 'remote', name: 'Remote' }];
      normalizedOrgs.forEach((org: any) => {
        const branches = org.branches || org.branch || [];
        if (Array.isArray(branches)) {
          branches.forEach((b: any) => locations.push({ id: b.id, name: b.branch_name || b.location_name }));
        }
      });

      const maxLen = Math.max(departments.length, flatDesignations.length, roles.length, teams.length, locations.length);
      const systemIdsData = Array.from({ length: maxLen }).map((_, i) => ({
        "Department": departments[i]?.department_name || "",
        "Department ID": departments[i]?.id || "",
        "Team": teams[i]?.team_name || "",
        "Team ID": teams[i]?.id || "",
        "Role": roles[i]?.name || "",
        "Role ID": roles[i]?.id || "",
        "Designation": flatDesignations[i]?.name || "",
        "Designation ID": flatDesignations[i]?.id || "",
        "Work Location": locations[i]?.name || "",
        "Location ID": locations[i]?.id || ""
      }));

      const wsSystemIds = XLSX.utils.json_to_sheet(systemIdsData);
      wsSystemIds['!cols'] = [
        { wch: 25 }, { wch: 15 },
        { wch: 20 }, { wch: 10 },
        { wch: 20 }, { wch: 10 },
        { wch: 25 }, { wch: 15 },
        { wch: 25 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSystemIds, "System ID Reference");
    } catch (err) {
      console.warn("Could not fetch system IDs for template", err);
    }

    XLSX.writeFile(wb, "employee_bulk_upload_template_v4.xlsx");
    } catch (err) {
      console.error("Template generation failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { raw: false, dateNF: 'yyyy-mm-dd' });

        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Map excel columns to employee payload
            const payload = {
              username: row["Email"]?.split("@")[0] || `user${Math.floor(Math.random() * 10000)}`,
              email: row["Email"],
              password: "Password@123", // Default password
              employee_id: row["Employee ID"],
              first_name: row["First Name"],
              middle_name: row["Middle Name"],
              last_name: row["Last Name"],
              secondary_email: row["Secondary Email"],
              gender: row["Gender"],
              phone: String(row["Phone"] || ""),
              secondary_phone: String(row["Secondary Phone"] || ""),
              date_of_birth: row["Date of Birth"],
              nationality: row["Nationality"] || "US",
              marital_status: row["Marital Status"] || "Single",
              blood_group: row["Blood Group"] || "O+",
              address: row["Address"],
              city: row["City"],
              state: row["State"],
              zip: String(row["Zip"] || ""),
              country: row["Country"],
              emergency_contact: row["Emergency Contact"],
              emergency_relationship: row["Emergency Relationship"],
              emergency_phone: String(row["Emergency Phone"] || ""),
              emergency_email: row["Emergency Email"],
              department_id: Number(row["Department ID"] || 1),
              team_id: Number(row["Team ID"] || 1),
              role_id: Number(row["Role ID"] || 2),
              designation_id: row["Designation ID"] ? Number(row["Designation ID"]) : undefined,
              job_role: row["Job Title"] || "Associate",
              employment_type: row["Employment Type"],
              start_date: row["Joining Date"],
              work_location: row["Work Location"],
              work_schedule: row["Work Schedule"],
              reporting_manager_id: row["Reporting Manager ID"] ? Number(row["Reporting Manager ID"]) : undefined,
              probation_period: row["Probation Period"] ? Number(row["Probation Period"]) : undefined,
              sub_status: row["Sub Status"],
              base_salary: String(row["Base Salary"] || "0"),
              currency: row["Currency"] || "USD",
              salary_frequency: row["Salary Frequency"] || "Monthly",
              payroll_group_id: row["Payroll Group ID"] ? Number(row["Payroll Group ID"]) : undefined,
              bank_name: row["Bank Name"],
              branch_name: row["Branch Name"],
              account_holder_name: row["Account Holder Name"],
              account_number: String(row["Account Number"] || ""),
              ifsc_code: row["IFSC Code"],
              passport_number: row["Passport Number"],
              passport_expiry_date: row["Passport Expiry Date"],
              driving_license_number: row["Driving License Number"],
              license_expiry_date: row["License Expiry Date"],
              pan_number: row["PAN Number"],
              aadhaar_number: row["Aadhaar Number"],
              skills: row["Skills"] ? String(row["Skills"]).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
              certifications: row["Certifications"] ? String(row["Certifications"]).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
              languages: row["Languages"] ? String(row["Languages"]).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
              family_members: row["Family Member Name"] ? [{
                name: row["Family Member Name"],
                relationship: String(row["Family Member Relation"] || ""),
                dateOfBirth: String(row["Family Member DOB"] || ""),
                phone: String(row["Family Member Phone"] || "")
              }] : undefined,
              is_draft: false,
              bulk_upload: true
            };

            if (!payload.email || !payload.first_name || !payload.last_name) {
              throw new Error("Missing required fields: First Name, Last Name, or Email.");
            }

            await createEmployee(payload);
            success++;
          } catch (err: any) {
            failed++;
            let errorMessage = err.message || "Failed to create employee";
            
            // Format Zod validation errors if present from the backend
            if (err.errors && Array.isArray(err.errors)) {
              const details = err.errors.map((e: any) => e.message).join(", ");
              errorMessage += ` (${details})`;
            }

            errors.push(`Row ${i + 2}: ${errorMessage}`);
          }
        }

        setResults({
          total: rows.length,
          success,
          failed,
          errors
        });

        if (success > 0) {
          onSuccess();
        }
      } catch (error) {
        setResults({
          total: 0,
          success: 0,
          failed: 1,
          errors: ["Failed to parse the Excel file. Please ensure it follows the template."]
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded shadow-sm w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-[16px] font-medium leading-6 text-foreground">Bulk Upload Employees</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 p-4 rounded text-sm flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold mb-1">Use the standard template</p>
              <p>For a successful upload, please download and use our standard Excel template. Do not change the column headers. Check the "System ID Reference" tab in the file for Department, Team, and Role IDs.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadTemplate}
                disabled={isDownloading}
                className="mt-3 bg-card hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 h-8 gap-2"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isDownloading ? "Generating Template..." : "Download Template"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Upload Excel File</label>
            <div 
              className={`border-2 border-dashed rounded p-8 text-center transition-colors
                ${file ? 'border-primary/30 bg-primary/10' : 'border-border hover:border-primary/30 hover:bg-muted dark:hover:bg-muted/50'}`}
            >
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              {!file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">XLSX, XLS or CSV (Max. 10MB)</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                  >
                    Select File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileSpreadsheet className="w-12 h-12 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setFile(null); setResults(null); }}
                    className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 h-8"
                  >
                    Remove File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {results && (
            <div className={`p-4 rounded border ${results.failed > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900' : 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'}`}>
              <div className="flex items-center gap-2 mb-2">
                {results.failed > 0 ? (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                <h3 className={`font-semibold ${results.failed > 0 ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'}`}>
                  Upload Complete
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                <div className="bg-card rounded p-2 border border-border">
                  <p className="text-muted-foreground text-xs">Total rows</p>
                  <p className="font-semibold text-foreground">{results.total}</p>
                </div>
                <div className="bg-card rounded p-2 border border-border">
                  <p className="text-muted-foreground text-xs">Success</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">{results.success}</p>
                </div>
                <div className="bg-card rounded p-2 border border-border">
                  <p className="text-muted-foreground text-xs">Failed</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">{results.failed}</p>
                </div>
              </div>
              
              {results.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">Errors:</p>
                  <ul className="text-xs text-red-600 dark:text-red-400 max-h-24 overflow-y-auto space-y-1 list-disc pl-4">
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isProcessing}
            className="bg-primary hover:bg-primary/95 text-white min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing
              </>
            ) : (
              'Upload Data'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

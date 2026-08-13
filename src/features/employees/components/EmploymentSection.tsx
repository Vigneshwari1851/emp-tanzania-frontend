import { useState } from 'react';
import { Briefcase, Calendar, Edit, PlusCircle, Trash2, FileText, Check } from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import FileUpload from '@/shared/components/ui/FileUpload';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { toast } from "sonner";
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import type { Employment } from '../pages/AddEmployee';

interface EmploymentSectionProps {
  employmentHistory: Employment[];
  setEmploymentHistory: React.Dispatch<React.SetStateAction<Employment[]>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  shouldRestrictFields: boolean;
}

const EmploymentSection: React.FC<EmploymentSectionProps> = ({
  employmentHistory,
  setEmploymentHistory,
  formErrors,
  setFormErrors,
  shouldRestrictFields
}) => {
  const [editingEmpIndex, setEditingEmpIndex] = useState<number | null>(null);
  const [isAddingEmp, setIsAddingEmp] = useState<boolean>(false);
  const [pendingEmpRecord, setPendingEmpRecord] = useState<Employment>({
    company: "", position: "", startDate: "", endDate: "", currentlyWorking: false, responsibilities: "", reasonForLeaving: ""
  });

  const validateEmpField = (name: string, value: any, isBlur: boolean, hasExistingError: boolean) => {
    if (!isBlur && !hasExistingError) return "";
    
    if (name.includes("company") || name.includes("position") || name.includes("startDate")) {
      if (!value) return "This field is required";
    }

    if (name.includes("file") && !value) {
      return "Experience letter is required";
    }

    const isNew = name.includes("new");
    const record = isNew ? pendingEmpRecord : (editingEmpIndex !== null ? employmentHistory[editingEmpIndex] : null);
    const isCurrentlyWorking = record ? (record.currentlyWorking || record.isCurrentlyWorking || record.isCurrentJob) : false;

    if (name.includes("endDate")) {
      if (!isCurrentlyWorking) {
        if (!value) return "End date is required";
        const startVal = isNew ? pendingEmpRecord.startDate : employmentHistory[editingEmpIndex!].startDate;
        if (startVal && value) {
          if (new Date(value) <= new Date(startVal)) return "End date must be after start date";
        }
      }
    }

    if ((name.includes("startDate") || name.includes("endDate")) && value) {
      if (new Date(value) > new Date()) return "Date cannot be in future";
    }

    if (name.includes("reasonForLeaving") && !value) {
      if (!isCurrentlyWorking) return "Reason for leaving is required";
    }

    return "";
  };

  const handleSelectEmp = (index: number) => {
    setEditingEmpIndex(index);
    setIsAddingEmp(false);
    setTimeout(() => {
      const formElement = document.getElementById('employment-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const addEmployment = () => {
    setIsAddingEmp(true);
    setEditingEmpIndex(null);
    setPendingEmpRecord({
      company: "", position: "", startDate: "", endDate: "", currentlyWorking: false, responsibilities: "", reasonForLeaving: ""
    });
    setTimeout(() => {
      const formElement = document.getElementById('employment-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const checkDuplicateEmployment = (record: Employment, excludeIndex: number = -1) => {
    const company = record.company?.toLowerCase().trim();
    const position = record.position?.toLowerCase().trim();
    if (!company || !position) return null;
    
    const duplicateExists = employmentHistory.some((emp, idx) => {
      if (idx === excludeIndex) return false;
      return emp.company?.toLowerCase().trim() === company && 
             emp.position?.toLowerCase().trim() === position;
    });
    
    if (duplicateExists) {
      return "An experience record for this company with the same position already exists.";
    }
    return null;
  };

  const commitEmployment = () => {
    const isCurrentlyWorking = pendingEmpRecord.currentlyWorking || pendingEmpRecord.isCurrentlyWorking || pendingEmpRecord.isCurrentJob;
    const fields: (keyof Employment)[] = ["company", "position", "startDate", "file"];
    if (!isCurrentlyWorking) {
      fields.push("endDate");
      fields.push("reasonForLeaving");
    }
    let hasError = false;
    fields.forEach(field => {
      let val = pendingEmpRecord[field];
      if (field === "file") {
        val = pendingEmpRecord.file || pendingEmpRecord.fileUrl || "";
      }
      const error = validateEmpField(`emp_new_${field}`, val, true, true);
      if (error) hasError = true;
      setFormErrors(prev => ({ ...prev, [`emp_new_${field}`]: error }));
    });

    if (hasError) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    const dupError = checkDuplicateEmployment(pendingEmpRecord);
    if (dupError) {
      setFormErrors(prev => ({ 
        ...prev, 
        emp_new_company: dupError,
        emp_new_position: dupError
      }));
      return;
    }

    setEmploymentHistory([...employmentHistory, pendingEmpRecord]);
    setIsAddingEmp(false);
    toast.success("Employment record added");
  };

  const saveEmployment = (index: number) => {
    const record = employmentHistory[index];
    const isCurrentlyWorking = record.currentlyWorking || record.isCurrentlyWorking || record.isCurrentJob;
    const fields: (keyof Employment)[] = ["company", "position", "startDate", "file"];
    if (!isCurrentlyWorking) {
      fields.push("endDate");
      fields.push("reasonForLeaving");
    }
    let hasError = false;
    fields.forEach(field => {
      let val = record[field];
      if (field === "file") {
        val = record.file || record.fileUrl || "";
      }
      const error = validateEmpField(`emp_${index}_${field}`, val, true, true);
      if (error) hasError = true;
      setFormErrors(prev => ({ ...prev, [`emp_${index}_${field}`]: error }));
    });

    if (hasError) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    const dupError = checkDuplicateEmployment(record, index);
    if (dupError) {
      setFormErrors(prev => ({ 
        ...prev, 
        [`emp_${index}_company`]: dupError,
        [`emp_${index}_position`]: dupError
      }));
      return;
    }

    setEditingEmpIndex(null);
    toast.success("Employment record updated");
  };

  const removeEmployment = (index: number) => {
    const newHistory = employmentHistory.filter((_, i) => i !== index);
    setEmploymentHistory(newHistory);
    if (editingEmpIndex !== null) {
      if (newHistory.length === 0) setEditingEmpIndex(null);
      else if (editingEmpIndex >= newHistory.length) setEditingEmpIndex(newHistory.length - 1);
    }
  };

  const updateEmployment = (index: number, fieldOrObject: keyof Employment | Partial<Employment>, value?: any) => {
    const isObj = typeof fieldOrObject === 'object' && fieldOrObject !== null;
    
    if (index === -1) {
      setPendingEmpRecord(prev => {
        const changes = isObj ? fieldOrObject : { [fieldOrObject as string]: value };
        const skipFields = ["startDate", "endDate", "file", "fileUrl", "currentlyWorking", "isCurrentlyWorking", "isCurrentJob"];
        
        // Apply capitalizations if applicable
        const processedChanges: any = { ...changes };
        Object.keys(processedChanges).forEach(k => {
          if (typeof processedChanges[k] === 'string' && !skipFields.includes(k)) {
            processedChanges[k] = capitalizeFirstLetter(processedChanges[k]);
          }
        });
        
        const updated = { ...prev, ...processedChanges };
        if (processedChanges.currentlyWorking !== undefined) {
          updated.isCurrentlyWorking = processedChanges.currentlyWorking;
          updated.isCurrentJob = processedChanges.currentlyWorking;
          if (processedChanges.currentlyWorking) {
            updated.endDate = "";
          }
        }

        // Run validation with the newly updated object
        if (!isObj && fieldOrObject !== "fileUrl") {
          const val = fieldOrObject === "file" ? (processedChanges[fieldOrObject as string] || updated.fileUrl || "") : processedChanges[fieldOrObject as string];
          let error = validateEmpField(`emp_new_${fieldOrObject as string}`, val, false, !!formErrors[`emp_new_${fieldOrObject as string}`]);
          
          if (!error && (fieldOrObject === "company" || fieldOrObject === "position")) {
            const dupError = checkDuplicateEmployment(updated, -1);
            if (dupError) {
              error = "Duplicate company and position combination";
              setFormErrors(formPrev => ({
                ...formPrev,
                emp_new_company: error,
                emp_new_position: error
              }));
            } else {
              setFormErrors(formPrev => {
                const nextErrors = { ...formPrev };
                delete nextErrors.emp_new_company;
                delete nextErrors.emp_new_position;
                return nextErrors;
              });
            }
          } else {
            setFormErrors(formPrev => ({ ...formPrev, [`emp_new_${fieldOrObject as string}`]: error }));
          }
        }
        
        return updated;
      });
      return;
    }

    setEmploymentHistory(prev => {
      const updatedList = prev.map((emp, i) => {
        if (i !== index) return emp;
        const changes = isObj ? fieldOrObject : { [fieldOrObject as string]: value };
        const skipFields = ["startDate", "endDate", "file", "fileUrl", "currentlyWorking", "isCurrentlyWorking", "isCurrentJob"];
        
        const processedChanges: any = { ...changes };
        Object.keys(processedChanges).forEach(k => {
          if (typeof processedChanges[k] === 'string' && !skipFields.includes(k)) {
            processedChanges[k] = capitalizeFirstLetter(processedChanges[k]);
          }
        });
        
        const updated = { ...emp, ...processedChanges };
        if (processedChanges.currentlyWorking !== undefined) {
          updated.isCurrentlyWorking = processedChanges.currentlyWorking;
          updated.isCurrentJob = processedChanges.currentlyWorking;
          if (processedChanges.currentlyWorking) {
            updated.endDate = "";
          }
        }
        return updated;
      });

      // Run validation for the updated record at index
      if (!isObj && fieldOrObject !== "fileUrl") {
        const record = updatedList[index];
        const val = fieldOrObject === "file" ? (record[fieldOrObject as keyof Employment] || record.fileUrl || "") : record[fieldOrObject as keyof Employment];
        let error = validateEmpField(`emp_${index}_${fieldOrObject as string}`, val, false, !!formErrors[`emp_${index}_${fieldOrObject as string}`]);
        
        if (!error && (fieldOrObject === "company" || fieldOrObject === "position")) {
          const dupError = checkDuplicateEmployment(record, index);
          if (dupError) {
            error = "Duplicate company and position combination";
            setFormErrors(formPrev => ({
              ...formPrev,
              [`emp_${index}_company`]: error,
              [`emp_${index}_position`]: error
            }));
          } else {
            setFormErrors(formPrev => {
              const nextErrors = { ...formPrev };
              delete nextErrors[`emp_${index}_company`];
              delete nextErrors[`emp_${index}_position`];
              return nextErrors;
            });
          }
        } else {
          setFormErrors(formPrev => ({ ...formPrev, [`emp_${index}_${fieldOrObject as string}`]: error }));
        }
      }

      return updatedList;
    });
  };

  const handleEmploymentBlur = (index: number, field: keyof Employment, value: any) => {
    if (field !== "fileUrl") {
      const prefix = index === -1 ? "emp_new" : `emp_${index}`;
      let error = validateEmpField(`${prefix}_${field}`, value, true, true);
      
      if (!error && (field === "company" || field === "position")) {
        const record = index === -1 ? pendingEmpRecord : employmentHistory[index];
        const updatedRecord = { ...record, [field]: value };
        const dupError = checkDuplicateEmployment(updatedRecord, index);
        if (dupError) {
          error = "Duplicate company and position combination";
          setFormErrors(prev => ({
            ...prev,
            [`${prefix}_company`]: error,
            [`${prefix}_position`]: error
          }));
          return;
        } else {
          setFormErrors(prev => {
            const nextErrors = { ...prev };
            delete nextErrors[`${prefix}_company`];
            delete nextErrors[`${prefix}_position`];
            return nextErrors;
          });
        }
      }
      
      setFormErrors(prev => ({ ...prev, [`${prefix}_${field}`]: error }));
    }
  };
  return (
    <div id="employment" className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-foreground pb-2">Employment History</h3>
          {formErrors.employment && (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full border border-red-100 dark:border-red-900">{formErrors.employment}</span>
          )}
        </div>
      </div>

      {/* Card Grid with Add Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employmentHistory.map((emp, index) => (
          <div 
            key={index} 
            className="group relative p-2 rounded bg-card border-2 border-blue-500 dark:border-blue-400 shadow-sm ring-1 ring-blue-50 dark:ring-blue-950/30 cursor-pointer overflow-hidden transition-all duration-300"
            onClick={() => handleSelectEmp(index)}
          >
            <div className="flex flex-col h-full pl-3 mt-1">
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pr-12">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-blue-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12px] font-medium text-[15px] text-blue-900 dark:text-blue-300 truncate leading-tight">
                      {emp.position || `Employment #${index + 1}`}
                    </h4>
                    <p className="text-[12px] text-muted-foreground font-medium truncate mt-0.5">
                      {emp.company || "Company not set"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 gap-2.5 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[12px] text-gray-600 dark:text-gray-300 font-medium">
                    {emp.startDate ? new Date(emp.startDate).getFullYear() : '---'} — {emp.currentlyWorking ? 'Present' : (emp.endDate ? new Date(emp.endDate).getFullYear() : '---')}
                  </span>
                </div>
                
                {emp.responsibilities && (
                  <div className="text-[12px] leading-snug line-clamp-1">
                    <span className="text-muted-foreground font-medium mr-1.5">Role:</span>
                    <span className="text-foreground font-medium">{emp.responsibilities}</span>
                  </div>
                )}
              </div>

              {/* Corner Edit Button */}
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectEmp(index);
                  }}
                  className={`p-2 transition-all duration-300 ${
                    editingEmpIndex === index 
                      ? 'text-primaryscale-110' 
                      : 'text-gray-300 dark:text-gray-500 hover:text-blue-400 dark:hover:text-blue-300 hover:scale-110'
                  }`}
                  title="Edit Record"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {editingEmpIndex === index && (
                <div className="absolute top-0 left-0 bottom-0 w-2 bg-primary" />
              )}
            </div>
          </div>
        ))}

        {/* Add Employment Card */}
        <div 
          onClick={addEmployment}
          className="group relative p-5 rounded border-2 border-dashed border-border hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-950/20 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[160px]"
        >
          <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300">Add Employment</span>
        </div>
      </div>

      {(editingEmpIndex !== null || isAddingEmp) && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {(() => {
            const isEditMode = editingEmpIndex !== null;
            const currentEmp = isEditMode ? employmentHistory[editingEmpIndex!] : pendingEmpRecord;
            const currentIndex = isEditMode ? editingEmpIndex! : -1;
            const prefix = isEditMode ? `emp_${currentIndex}` : "emp_new";

            return (
              <div id="employment-edit-form" className="p-4 bg-muted rounded border border-border scroll-mt-24">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                    <h4 className="text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
                      {isEditMode ? "Edit Employment Detail" : "Add New Employment"}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingEmpIndex(null);
                        setIsAddingEmp(false);
                      }}
                    >
                      Cancel
                    </Button>
                    {isEditMode && (!currentEmp.fileUrl || !shouldRestrictFields) && (
                      <button
                        type="button"
                        onClick={() => {
                          removeEmployment(currentIndex);
                          setEditingEmpIndex(null);
                        }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Company Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name={`${prefix}_company`}
                      value={currentEmp.company}
                      onChange={(e) => updateEmployment(currentIndex, "company", e.target.value)}
                      onBlur={(e) => handleEmploymentBlur(currentIndex, "company", e.target.value)}
                      disabled={!!currentEmp.fileUrl && shouldRestrictFields}
                      className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors[`${prefix}_company`] ? 'border-red-500' : 'border-gray-300 dark:border-border'}`}
                      placeholder="Enter Company Name"
                    />
                    {formErrors[`${prefix}_company`] && <p className="text-xs text-red-500 mt-1">{formErrors[`${prefix}_company`]}</p>}
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Position <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name={`${prefix}_position`}
                      value={currentEmp.position}
                      onChange={(e) => updateEmployment(currentIndex, "position", e.target.value)}
                      onBlur={(e) => handleEmploymentBlur(currentIndex, "position", e.target.value)}
                      disabled={!!currentEmp.fileUrl && shouldRestrictFields}
                      className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors[`${prefix}_position`] ? 'border-red-500' : 'border-gray-300 dark:border-border'}`}
                      placeholder="Enter Position"
                    />
                    {formErrors[`${prefix}_position`] && <p className="text-xs text-red-500 mt-1">{formErrors[`${prefix}_position`]}</p>}
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Start Date <span className="text-red-500">*</span></label>
                    <ModernDatePicker
                      value={currentEmp.startDate}
                      onChange={(date) => {
                        updateEmployment(currentIndex, "startDate", date);
                        handleEmploymentBlur(currentIndex, "startDate", date);
                      }}
                      disabled={!!currentEmp.fileUrl && shouldRestrictFields}
                      error={!!formErrors[`${prefix}_startDate`]}
                      placeholder="Select Start Date"
                    />
                    {formErrors[`${prefix}_startDate`] && <p className="text-xs text-red-500 mt-1">{formErrors[`${prefix}_startDate`]}</p>}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
                        End Date {!currentEmp.currentlyWorking && <span className="text-red-500">*</span>}
                      </label>
                      <div className="flex items-center gap-2 select-none">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">
                          Currently Working
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (!!currentEmp.fileUrl && shouldRestrictFields) return; // Keep safety constraint
                            const nextVal = !currentEmp.currentlyWorking;
                            console.log("Toggle switch clicked, nextVal:", nextVal);
                            
                            updateEmployment(currentIndex, {
                              currentlyWorking: nextVal,
                              isCurrentlyWorking: nextVal,
                              isCurrentJob: nextVal,
                              endDate: nextVal ? "" : currentEmp.endDate
                            });

                            if (nextVal) {
                              setFormErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors[`${prefix}_endDate`];
                                delete newErrors[`${prefix}_reasonForLeaving`];
                                return newErrors;
                              });
                            } else {
                              // Force re-validation for required field
                              handleEmploymentBlur(currentIndex, "endDate", "");
                            }
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            currentEmp.currentlyWorking ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              currentEmp.currentlyWorking ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <ModernDatePicker
                      value={currentEmp.endDate || ""}
                      onChange={(date) => {
                        updateEmployment(currentIndex, "endDate", date);
                        handleEmploymentBlur(currentIndex, "endDate", date);
                      }}
                      disabled={currentEmp.currentlyWorking || (!!currentEmp.fileUrl && shouldRestrictFields)}
                      error={!!formErrors[`${prefix}_endDate`]}
                      placeholder="Select End Date"
                    />
                    {formErrors[`${prefix}_endDate`] && <p className="text-xs text-red-500 mt-1">{formErrors[`${prefix}_endDate`]}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Responsibilities</label>
                    <textarea
                      value={currentEmp.responsibilities}
                      onChange={(e) => updateEmployment(currentIndex, "responsibilities", e.target.value)}
                      onBlur={(e) => handleEmploymentBlur(currentIndex, "responsibilities", e.target.value)}
                      disabled={!!currentEmp.fileUrl && shouldRestrictFields}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      rows={3}
                      placeholder="Enter key responsibilities"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2">Reason for Leaving {!currentEmp.currentlyWorking && <span className="text-red-500">*</span>}</label>
                    <input
                      type="text"
                      value={currentEmp.reasonForLeaving}
                      onChange={(e) => updateEmployment(currentIndex, "reasonForLeaving", e.target.value)}
                      onBlur={(e) => handleEmploymentBlur(currentIndex, "reasonForLeaving", e.target.value)}
                      disabled={!!currentEmp.fileUrl && shouldRestrictFields}
                      className={`w-full px-3 py-2 border rounded bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${formErrors[`${prefix}_reasonForLeaving`] ? 'border-red-500' : 'border-gray-300 dark:border-border'}`}
                      placeholder="Enter reason for leaving"
                    />
                    {formErrors[`${prefix}_reasonForLeaving`] && <p className="text-xs text-red-500 mt-1">{formErrors[`${prefix}_reasonForLeaving`]}</p>}
                  </div>
                  <div className="md:col-span-2">
                    {!!currentEmp.fileUrl && shouldRestrictFields ? (
                       <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded flex flex-col gap-2">
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider">Experience Letter / Relieving Letter <span className="text-red-500">*</span></label>
                          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                            <FileText className="w-4 h-4" />
                            <span>Experience Letter uploaded: </span>
                            <a href={currentEmp.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">View Document</a>
                          </div>
                       </div>
                    ) : (
                       <FileUpload
                         id={`${prefix}_file`}
                         label="Experience Letter / Relieving Letter"
                         required={true}
                         files={currentEmp.file ? [currentEmp.file] : (currentEmp.fileUrl || currentEmp.documentUrl || currentEmp.certificateUrl ? [currentEmp.fileUrl || currentEmp.documentUrl || currentEmp.certificateUrl] as string[] : [])}
                         onFilesChange={(files) => updateEmployment(currentIndex, "file", files[0] || null)}
                         error={formErrors[`${prefix}_file`]}
                         allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                         showViewEdit={true}
                       />
                    )}
                  </div>
                </div>

                {isEditMode && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => saveEmployment(currentIndex)}
                      className="bg-primary hover:bg-primary/70 text-white px-6 py-2 rounded flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Update Record
                    </Button>
                  </div>
                )}
                {!isEditMode && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      onClick={commitEmployment}
                      className="bg-primary hover:bg-primary/70 text-white px-6 py-2 rounded flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add Record 
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default EmploymentSection;

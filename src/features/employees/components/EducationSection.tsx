import { useState } from 'react';
import { GraduationCap, Calendar, Medal, Edit, PlusCircle, Trash2, Check } from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import FileUpload from '@/shared/components/ui/FileUpload';
import ModernDatePicker from '@/shared/components/ui/ModernDatePicker';
import { toast } from "sonner";
import { capitalizeFirstLetter, normalizeQualificationLabel } from '@/shared/utils/stringUtils';
import type { Education } from '../pages/AddEmployee';
import Select from "@/shared/components/ui/Select";

interface EducationSectionProps {
  educationHistory: Education[];
  setEducationHistory: React.Dispatch<React.SetStateAction<Education[]>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  shouldRestrictFields: boolean;
}

const EDUCATION_LEVELS = [
  "O-Level",
  "A-Level",
  "Diploma",
  "UG",
  "PG",
  "PhD"
];

const getNormalizedLevel = (level: string) => {
  if (!level) return "";
  const l = level.toLowerCase();
  if (l.includes("primary")) return "Primary";
  if (l.includes("10th") || l.includes("sslc") || l.includes("sse") || l.includes("o-level") || l.includes("ordinary")) return "O-Level";
  if (l.includes("12th") || l.includes("puc") || l.includes("hsc") || l.includes("a-level") || l.includes("advanced")) return "A-Level";
  if (l.includes("diploma")) return "Diploma";
  if (l.includes("undergraduate") || l.includes("ug") || l.includes("bachelor")) return "UG";
  if (l.includes("postgraduate") || l.includes("pg") || l.includes("master")) return "PG";
  if (l.includes("doctorate") || l.includes("phd")) return "PhD";
  return level;
};

const checkDuplicate = (record: Education, history: Education[], excludeIndex: number = -1) => {
  const normalizedLvl = getNormalizedLevel(record.level);
  if (normalizedLvl === "O-Level" || normalizedLvl === "A-Level") {
    const duplicateExists = history.some((edu, idx) => {
      if (idx === excludeIndex) return false;
      return getNormalizedLevel(edu.level) === normalizedLvl;
    });
    if (duplicateExists) {
      return `An entry for "${normalizedLvl}" already exists. Duplicate entries are not allowed.`;
    }
  } else {
    const duplicateExists = history.some((edu, idx) => {
      if (idx === excludeIndex) return false;
      return getNormalizedLevel(edu.level) === normalizedLvl && 
             edu.degree?.toLowerCase().trim() === record.degree?.toLowerCase().trim() && 
             edu.fieldOfStudy?.toLowerCase().trim() === record.fieldOfStudy?.toLowerCase().trim();
    });
    if (duplicateExists) {
      return `A duplicate entry for "${normalizedLvl}" with the same degree ("${record.degree}") and field of study ("${record.fieldOfStudy}") already exists.`;
    }
  }
  return null;
};

const checkChronology = (record: Education, history: Education[], currentIndex: number = -1) => {
  const fullHistory = [...history];
  if (currentIndex === -1) {
    fullHistory.push(record);
  } else {
    fullHistory[currentIndex] = record;
  }

  let oLevelYear: number | null = null;
  let aLevelYear: number | null = null;
  let degreeYear: number | null = null;

  fullHistory.forEach(edu => {
    const normLevel = getNormalizedLevel(edu.level);
    if (!edu.endDate) return;
    const year = new Date(edu.endDate).getFullYear();
    if (isNaN(year)) return;

    if (normLevel === "O-Level") {
      oLevelYear = year;
    } else if (normLevel === "A-Level") {
      aLevelYear = year;
    } else if (["Diploma", "UG", "PG", "PhD"].includes(normLevel)) {
      if (normLevel === "UG" || normLevel === "Diploma") {
        degreeYear = year;
      }
    }
  });

  if (oLevelYear !== null && aLevelYear !== null) {
    if (aLevelYear < oLevelYear + 2) {
      return "A-Level / Form VI completion year must be at least 2 years after O-Level / Form IV completion year.";
    }
  }

  if (aLevelYear !== null && degreeYear !== null) {
    if (degreeYear <= aLevelYear) {
      return "Degree/Diploma completion year must be strictly greater than A-Level / Form VI completion year.";
    }
  }

  if (oLevelYear !== null && degreeYear !== null) {
    if (degreeYear <= oLevelYear) {
      return "Degree/Diploma completion year must be strictly greater than O-Level / Form IV completion year.";
    }
  }

  return null;
};

const EducationSection: React.FC<EducationSectionProps> = ({
  educationHistory,
  setEducationHistory,
  formErrors,
  setFormErrors,
  shouldRestrictFields
}) => {
  const [editingEduIndex, setEditingEduIndex] = useState<number | null>(null);
  const [isAddingEdu, setIsAddingEdu] = useState<boolean>(false);
  const [pendingEduRecord, setPendingEduRecord] = useState<Education>({
    level: "", institution: "", degree: "", fieldOfStudy: "", board: "", startDate: "", endDate: "", grade: "", currentlyStudying: false
  });

  const validateEduField = (name: string, value: any, isBlur: boolean, hasExistingError: boolean, recordContext?: Education) => {
    const isDate = name.includes("startDate") || name.includes("endDate");
    if (!isDate && !isBlur && !hasExistingError) return "";
    
    const isRequired = name.includes("level") || name.includes("institution") || name.includes("startDate") || (name.includes("endDate") && !recordContext?.currentlyStudying);
    if (isRequired && !value) return "This field is required";

    // Degree and Field of Study are required for UG/PG/Diploma/Doctorate
    const level = recordContext?.level || "";
    const isHigherEd = ["Diploma", "Undergraduate (UG)", "Postgraduate (PG)", "Doctorate (PhD)", "UG", "PG", "PhD"].includes(level);
    if (isHigherEd && (name.includes("degree") || name.includes("fieldOfStudy")) && !value) {
      return "This field is required for higher education";
    }

    if (name.includes("endDate") && value) {
      const currentRecord = recordContext || (name.includes("new") ? pendingEduRecord : educationHistory[editingEduIndex!]);
      const startVal = currentRecord?.startDate;
      if (startVal && value) {
        if (new Date(value) <= new Date(startVal)) return "End date must be after start date";
      }
    }

    if ((name.includes("startDate") || name.includes("endDate")) && value) {
      if (new Date(value) > new Date()) return "Date cannot be in future";
    }

    return "";
  };

  const handleSelectEdu = (index: number) => {
    setEditingEduIndex(index);
    setIsAddingEdu(false);
    setTimeout(() => {
      const formElement = document.getElementById('education-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const addEducation = () => {
    setIsAddingEdu(true);
    setEditingEduIndex(null);
    setPendingEduRecord({
      level: "", institution: "", degree: "", fieldOfStudy: "", board: "", startDate: "", endDate: "", grade: "", currentlyStudying: false
    });
    setTimeout(() => {
      const formElement = document.getElementById('education-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const commitEducation = () => {
    const fields: (keyof Education)[] = ["level", "institution", "startDate"];
    if (!pendingEduRecord.currentlyStudying) {
      fields.push("endDate");
    }
    let hasError = false;
    
    // Check basic required fields
    fields.forEach(field => {
      const val = pendingEduRecord[field];
      const error = validateEduField(`edu_new_${field}`, val, true, true, pendingEduRecord);
      if (error) hasError = true;
      setFormErrors(prev => ({ ...prev, [`edu_new_${field}`]: error }));
    });

    // Check level-specific fields
    const isHigherEd = ["Diploma", "Undergraduate (UG)", "Postgraduate (PG)", "Doctorate (PhD)", "UG", "PG", "PhD"].includes(pendingEduRecord.level);
    if (isHigherEd) {
      ["degree", "fieldOfStudy"].forEach((field: any) => {
        const val = pendingEduRecord[field as keyof Education];
        const error = validateEduField(`edu_new_${field}`, val, true, true, pendingEduRecord);
        if (error) hasError = true;
        setFormErrors(prev => ({ ...prev, [`edu_new_${field}`]: error }));
      });
    }

    if (hasError) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    // Duplicate check
    const dupError = checkDuplicate(pendingEduRecord, educationHistory);
    if (dupError) {
      setFormErrors(prev => ({ ...prev, [`edu_new_level`]: dupError }));
      return;
    }

    // Chronology check
    const chronError = checkChronology(pendingEduRecord, educationHistory);
    if (chronError) {
      toast.error(chronError);
      setFormErrors(prev => ({ ...prev, [`edu_new_endDate`]: chronError }));
      return;
    }

    const newHistory = [...educationHistory, pendingEduRecord];
    setEducationHistory(newHistory);
    
    const levels = newHistory.map(edu => getNormalizedLevel(edu.level));
    if (levels.includes("O-Level") && levels.includes("A-Level") && levels.includes("UG")) {
      setFormErrors(prev => {
        const { education, ...rest } = prev;
        return rest;
      });
    }
    
    setIsAddingEdu(false);
  };

  const saveEducation = (index: number) => {
    const record = educationHistory[index];
    const fields: (keyof Education)[] = ["level", "institution", "startDate"];
    if (!record.currentlyStudying) {
      fields.push("endDate");
    }
    let hasError = false;
    
    // Check basic required fields
    fields.forEach(field => {
      const val = record[field];
      const error = validateEduField(`edu_${index}_${field}`, val, true, true, record);
      if (error) hasError = true;
      setFormErrors(prev => ({ ...prev, [`edu_${index}_${field}`]: error }));
    });

    // Check level-specific fields
    const isHigherEd = ["Diploma", "Undergraduate (UG)", "Postgraduate (PG)", "Doctorate (PhD)", "UG", "PG", "PhD"].includes(record.level);
    if (isHigherEd) {
      ["degree", "fieldOfStudy"].forEach((field: any) => {
        const val = record[field as keyof Education];
        const error = validateEduField(`edu_${index}_${field}`, val, true, true, record);
        if (error) hasError = true;
        setFormErrors(prev => ({ ...prev, [`edu_${index}_${field}`]: error }));
      });
    }

    if (hasError) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    // Duplicate check
    const dupError = checkDuplicate(record, educationHistory, index);
    if (dupError) {
      setFormErrors(prev => ({ ...prev, [`edu_${index}_level`]: dupError }));
      return;
    }

    // Chronology check
    const chronError = checkChronology(record, educationHistory, index);
    if (chronError) {
      toast.error(chronError);
      setFormErrors(prev => ({ ...prev, [`edu_${index}_endDate`]: chronError }));
      return;
    }

    const savedLevels = educationHistory.map(edu => getNormalizedLevel(edu.level));
    if (savedLevels.includes("O-Level") && savedLevels.includes("A-Level") && savedLevels.includes("UG")) {
      setFormErrors(prev => {
        const { education, ...rest } = prev;
        return rest;
      });
    }

    setEditingEduIndex(null);
  };

  const removeEducation = (index: number) => {
    const newHistory = educationHistory.filter((_, i) => i !== index);
    setEducationHistory(newHistory);
    
    const levels = newHistory.map(edu => getNormalizedLevel(edu.level));
    const missingLevels: string[] = [];
    if (!levels.includes("O-Level")) missingLevels.push("O-Level");
    if (!levels.includes("A-Level")) missingLevels.push("A-Level");
    if (!levels.includes("UG")) missingLevels.push("UG");

    if (missingLevels.length > 0) {
      setFormErrors(prev => ({
        ...prev,
        education: "Minimum 3 education records are required (O-Level, A-Level, and UG)."
      }));
    } else {
      setFormErrors(prev => {
        const { education, ...rest } = prev;
        return rest;
      });
    }
    if (editingEduIndex !== null) {
      if (newHistory.length === 0) setEditingEduIndex(null);
      else if (editingEduIndex >= newHistory.length) setEditingEduIndex(newHistory.length - 1);
    }
  };

  const updateEducation = (index: number, field: keyof Education, value: any) => {
    const skipFields = ["startDate", "endDate", "grade", "file", "fileUrl", "level"];
    const formattedValue = (typeof value === 'string' && !skipFields.includes(field)) ? capitalizeFirstLetter(value) : value;
    
    if (index === -1) {
      setPendingEduRecord(prev => {
        const updated = { ...prev, [field]: formattedValue };
        if (field !== "fileUrl") {
          const val = field === "file" ? (formattedValue || updated.fileUrl || "") : formattedValue;
          const error = validateEduField(`edu_new_${field}`, val, false, !!formErrors[`edu_new_${field}`], updated);
          setFormErrors(prevErr => ({ ...prevErr, [`edu_new_${field}`]: error }));
        }
        return updated;
      });
      return;
    }
    setEducationHistory(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: formattedValue
      };
      
      if (field !== "fileUrl") {
        const val = field === "file" ? (formattedValue || updated[index].fileUrl || "") : formattedValue;
        const error = validateEduField(`edu_${index}_${field}`, val, false, !!formErrors[`edu_${index}_${field}`], updated[index]);
        setFormErrors(prevErr => ({ ...prevErr, [`edu_${index}_${field}`]: error }));
      }
      return updated;
    });
  };

  const handleEducationBlur = (index: number, field: keyof Education, value: any) => {
    if (field !== "fileUrl") {
      const isNew = index === -1;
      const prefix = isNew ? "edu_new" : `edu_${index}`;
      const currentRecord = isNew ? pendingEduRecord : educationHistory[index];
      const error = validateEduField(`${prefix}_${field}`, value, true, true, currentRecord);
      setFormErrors(prev => ({ ...prev, [`${prefix}_${field}`]: error }));
    }
  };

  const getCardIcon = (_level: string) => {
    return <GraduationCap className="w-5 h-5" />;
  };

  return (
    <div id="education" className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground pb-2">Educational History</h3>
          {formErrors.education && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">{formErrors.education}</span>
          )}
        </div>
      </div>

      {/* Card Grid with Add Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {educationHistory.map((edu, index) => (
          <div 
            key={index} 
            className={`group relative p-4 rounded-xl bg-card border-2 transition-all duration-300 shadow-[0_1px_3px_rgba(16,17,26,0.04)] hover:shadow-[0_4px_16px_rgba(16,17,26,0.06)] cursor-pointer overflow-hidden flex items-center justify-between min-h-[72px] max-w-[360px] ${editingEduIndex === index ? 'border-blue-500 ring-4 ring-blue-50' : 'border-[#E6E8EE] dark:border-border hover:border-blue-200'}`}
            onClick={() => handleSelectEdu(index)}
          >
            <div className="flex items-center gap-3.5 pr-10 min-w-0">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${editingEduIndex === index ? 'bg-blue-100 text-blue-600' : 'bg-[#F1F3F7] dark:bg-muted text-[#5B5F6E] dark:text-muted-foreground'} transition-colors`}>
                {getCardIcon(edu.level)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[13.5px] font-bold text-[#12131A] dark:text-foreground truncate leading-snug">
                  {normalizeQualificationLabel(edu.level) || `Education #${index + 1}`}
                </h4>
              </div>
            </div>

            {/* Corner Edit Button */}
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectEdu(index);
                }}
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-blue-50 rounded-lg transition-all"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Add Education Card */}
        <div 
          onClick={addEducation}
          className="group relative p-4 rounded-xl border-2 border-dashed border-[#E6E8EE] dark:border-border hover:border-blue-400 hover:bg-blue-50/10 transition-all duration-300 cursor-pointer flex items-center gap-3.5 min-h-[72px] max-w-[360px]"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F1F3F7] dark:bg-muted group-hover:bg-blue-100 flex items-center justify-center text-[#5B5F6E] dark:text-muted-foreground group-hover:text-blue-600 transition-colors">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[13.5px] font-bold text-muted-foreground group-hover:text-blue-600">Add Education</span>
        </div>
      </div>

      {(editingEduIndex !== null || isAddingEdu) && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {(() => {
            const isEditMode = editingEduIndex !== null;
            const currentEdu = isEditMode ? educationHistory[editingEduIndex!] : pendingEduRecord;
            const currentIndex = isEditMode ? editingEduIndex! : -1;
            const prefix = isEditMode ? `edu_${currentIndex}` : "edu_new";
            
            let sslcYear: number | null = null;
            let pucYear: number | null = null;

            educationHistory.forEach((edu, idx) => {
              if (idx === currentIndex) return;
              const normLevel = getNormalizedLevel(edu.level);
              if (!edu.endDate) return;
              const year = new Date(edu.endDate).getFullYear();
              if (isNaN(year)) return;

              if (normLevel === "O-Level") {
                sslcYear = year;
              } else if (normLevel === "A-Level") {
                pucYear = year;
              }
            });

            const currentNormLevel = getNormalizedLevel(currentEdu.level);
            let minEndDate: string | undefined = undefined;

            if (currentNormLevel === "A-Level" && sslcYear !== null) {
              minEndDate = `${sslcYear + 2}-01-01`;
            } else if (["Diploma", "UG", "PG", "PhD"].includes(currentNormLevel)) {
              if (pucYear !== null) {
                minEndDate = `${pucYear + 1}-01-01`;
              } else if (sslcYear !== null) {
                minEndDate = `${sslcYear + 3}-01-01`;
              }
            }
            
            const isHigherEd = ["Diploma", "Undergraduate (UG)", "Postgraduate (PG)", "Doctorate (PhD)", "UG", "PG", "PhD"].includes(currentEdu.level);
            const isSchooling = ["O-Level", "A-Level"].includes(getNormalizedLevel(currentEdu.level));
            const existingLevels = educationHistory.map(edu => getNormalizedLevel(edu.level)).filter(Boolean);
            const availableLevels = EDUCATION_LEVELS.filter(lvl => 
              !existingLevels.includes(getNormalizedLevel(lvl)) || getNormalizedLevel(lvl) === getNormalizedLevel(currentEdu.level)
            );

            return (
              <div id="education-edit-form" className="p-6 bg-card rounded border border-border shadow-sm scroll-mt-24">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center text-blue-600">
                       <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-medium text-foreground">
                        {isEditMode ? "Update Education Record" : "New Education Record"}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium">Please provide accurate academic details</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingEduIndex(null);
                        setIsAddingEdu(false);
                      }}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground px-4 py-2 rounded hover:bg-muted transition-colors border border-border"
                    >
                      Cancel
                    </button>
                    {isEditMode && (!currentEdu.fileUrl || !shouldRestrictFields) && (
                      <button
                        type="button"
                        onClick={() => {
                          removeEducation(currentIndex);
                          setEditingEduIndex(null);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Level Selector */}
                  <div className="md:col-span-1">
                    <Select
                      value={currentEdu.level}
                      onChange={(val) => updateEducation(currentIndex, "level", val)}
                      onBlur={() => handleEducationBlur(currentIndex, "level", currentEdu.level)}
                      label="Education Level"
                      required
                      error={formErrors[`${prefix}_level`]}
                      placeholder="Select Level"
                      options={availableLevels.map(lvl => ({ value: lvl, label: lvl }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-bold text-foreground mb-2">School/Institution Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={currentEdu.institution}
                      onChange={(e) => updateEducation(currentIndex, "institution", e.target.value)}
                      onBlur={(e) => handleEducationBlur(currentIndex, "institution", e.target.value)}
                      className={`w-full px-4 py-2.5 bg-muted border rounded focus:outline-none focus:ring-4 transition-all ${formErrors[`${prefix}_institution`] ? 'border-red-400 focus:ring-red-400/10' : 'border-border focus:ring-blue-500/10 focus:border-blue-400'}`}
                      placeholder="e.g., St. Joseph's Higher Secondary School"
                    />
                    {formErrors[`${prefix}_institution`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{formErrors[`${prefix}_institution`]}</p>}
                  </div>

                  {/* Conditional Fields */}
                  {isSchooling && (
                    <div className="md:col-span-1">
                      <label className="block text-[12px] font-bold text-foreground mb-2">Board</label>
                      <input
                        type="text"
                        value={currentEdu.board}
                        onChange={(e) => updateEducation(currentIndex, "board", e.target.value)}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all"
                        placeholder="e.g., CBSE, State Board"
                      />
                    </div>
                  )}

                  {isHigherEd && (
                    <>
                      <div>
                        <label className="block text-[12px] font-bold text-foreground mb-2">Degree <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={currentEdu.degree}
                          onChange={(e) => updateEducation(currentIndex, "degree", e.target.value)}
                          onBlur={(e) => handleEducationBlur(currentIndex, "degree", e.target.value)}
                          className={`w-full px-4 py-2.5 bg-muted border rounded focus:outline-none focus:ring-4 transition-all ${formErrors[`${prefix}_degree`] ? 'border-red-400 focus:ring-red-400/10' : 'border-border focus:ring-blue-500/10 focus:border-blue-400'}`}
                          placeholder="e.g., Bachelor of Technology"
                        />
                        {formErrors[`${prefix}_degree`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{formErrors[`${prefix}_degree`]}</p>}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-foreground mb-2">Field of Study <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={currentEdu.fieldOfStudy}
                          onChange={(e) => updateEducation(currentIndex, "fieldOfStudy", e.target.value)}
                          onBlur={(e) => handleEducationBlur(currentIndex, "fieldOfStudy", e.target.value)}
                          className={`w-full px-4 py-2.5 bg-muted border rounded focus:outline-none focus:ring-4 transition-all ${formErrors[`${prefix}_fieldOfStudy`] ? 'border-red-400 focus:ring-red-400/10' : 'border-border focus:ring-blue-500/10 focus:border-blue-400'}`}
                          placeholder="e.g., Computer Science"
                        />
                        {formErrors[`${prefix}_fieldOfStudy`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{formErrors[`${prefix}_fieldOfStudy`]}</p>}
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[12px] font-bold text-foreground mb-2">Start Date <span className="text-red-500">*</span></label>
                    <ModernDatePicker
                      value={currentEdu.startDate}
                      onChange={(date) => updateEducation(currentIndex, "startDate", date)}
                      error={!!formErrors[`${prefix}_startDate`]}
                      placeholder="Select Date"
                    />
                    {formErrors[`${prefix}_startDate`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{formErrors[`${prefix}_startDate`]}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="block text-[12px] font-bold text-foreground">
                        End Date {!currentEdu.currentlyStudying && <span className="text-red-500">*</span>}
                      </label>
                      <label 
                        className="flex items-center gap-1.5 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={currentEdu.currentlyStudying || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            updateEducation(currentIndex, "currentlyStudying", isChecked);
                            if (isChecked) {
                              updateEducation(currentIndex, "endDate", "");
                              setFormErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors[`${prefix}_endDate`];
                                return newErrors;
                              });
                            }
                          }}
                          className="w-3 h-3 text-primaryborder-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primarytransition-colors">
                          Currently
                        </span>
                      </label>
                    </div>
                    <ModernDatePicker
                      value={currentEdu.endDate || ""}
                      onChange={(date) => updateEducation(currentIndex, "endDate", date)}
                      disabled={currentEdu.currentlyStudying}
                      error={!!formErrors[`${prefix}_endDate`]}
                      placeholder="Select Date"
                    />
                    {formErrors[`${prefix}_endDate`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{formErrors[`${prefix}_endDate`]}</p>}
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-foreground mb-2">Grade/Percentage</label>
                    <input
                      type="text"
                      value={currentEdu.grade}
                      onChange={(e) => updateEducation(currentIndex, "grade", e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted border border-border rounded focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all"
                      placeholder="e.g., 85% or 8.5 CGPA"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <FileUpload
                      id={`${prefix}_file`}
                      label="Education Certificate / Marksheet"
                      files={currentEdu.file ? [currentEdu.file] : (currentEdu.fileUrl || currentEdu.documentUrl || currentEdu.certificateUrl ? [currentEdu.fileUrl || currentEdu.documentUrl || currentEdu.certificateUrl] as string[] : [])}
                      onFilesChange={(files) => updateEducation(currentIndex, "file", files[0] || null)}
                      error={formErrors[`${prefix}_file`]}
                      allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                      showViewEdit={true}
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end gap-3">
                   <button
                      type="button"
                      onClick={() => {
                        setEditingEduIndex(null);
                        setIsAddingEdu(false);
                      }}
                      className="px-6 py-2.5 rounded text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                    >
                      Discard
                    </button>
                    <Button
                      type="button"
                      onClick={isEditMode ? () => saveEducation(currentIndex) : commitEducation}
                      className="bg-primary hover:bg-primary/70 text-white px-8 py-2.5 rounded shadow-sm shadow-blue-100 flex items-center gap-2 font-bold"
                    >
                      {isEditMode ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                      {isEditMode ? "Save Changes" : "Confirm Education"}
                    </Button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default EducationSection;

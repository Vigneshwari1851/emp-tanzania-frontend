import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, PlusCircle, Eye, Download, ExternalLink, Edit, ChevronDown, Check, CreditCard, Globe, Car, Fingerprint, Award, Files, Search } from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import FileUpload from '@/shared/components/ui/FileUpload';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { Dialog } from '@/shared/components/ui/dialog';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import Select from "@/shared/components/ui/Select";

interface DocumentSectionProps {
  passportFile: any;
  setPassportFile: (file: any) => void;
  dlFile: any;
  setDlFile: (file: any) => void;
  panFile: any;
  setPanFile: (file: any) => void;
  aadhaarFile: any;
  setAadhaarFile: (file: any) => void;
  nssfFile: any;
  setNssfFile: (file: any) => void;
  resumeFile: any;
  setResumeFile: (file: any) => void;
  certificateFiles: any[];
  setCertificateFiles: (files: any[]) => void;
  otherDocuments: any[];
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  formErrors: Record<string, string>;
  verificationStatuses?: Record<string, string>;
}

const getStatusBadge = (status?: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case 'verified':
      return (
        <div className="flex items-center gap-1 bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full border border-green-100 animate-in zoom-in duration-300">
          <div className="w-1 h-1 rounded-full bg-green-500" />
          <span className="text-[8px] font-bold uppercase tracking-tight">Verified</span>
        </div>
      );
    case 'rejected':
      return (
        <div className="flex items-center gap-1 bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full border border-red-100 animate-in zoom-in duration-300">
          <div className="w-1 h-1 rounded-full bg-red-500" />
          <span className="text-[8px] font-bold uppercase tracking-tight">Rejected</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-100 animate-in zoom-in duration-300">
          <div className="w-1 h-1 rounded-full bg-amber-500" />
          <span className="text-[8px] font-bold uppercase tracking-tight">Pending</span>
        </div>
      );
  }
};

const getFileTypeProps = (file: any): { color: string; label: string } => {
  if (!file) return { color: 'bg-gray-500', label: 'FILE' };
  
  const fileName = typeof file === 'string' ? file : file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf': return { color: 'bg-red-500', label: 'PDF' };
    case 'doc':
    case 'docx': return { color: 'bg-blue-500', label: 'DOC' };
    case 'xls':
    case 'xlsx':
    case 'csv': return { color: 'bg-green-500', label: 'XLS' };
    case 'ppt':
    case 'pptx': return { color: 'bg-orange-500', label: 'PPT' };
    default: return { color: 'bg-gray-500', label: 'FILE' };
  }
};

interface DocumentCategoryDropdownProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  existingDocTypes: string[];
  country?: string;
}

const DocumentCategoryDropdown: React.FC<DocumentCategoryDropdownProps> = ({
  selectedCategory,
  onSelectCategory,
  existingDocTypes = [],
  country = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const documentCategories = [
    { value: "resume", label: "Resume / CV" },
    { value: "pan", label: country === 'India' ? 'PAN Card' : country === 'United States' || country === 'USA' ? 'SSN Document' : country === 'Tanzania' ? 'TIN Document' : country === 'United Kingdom' ? 'NINO Document' : 'Tax ID Document' },
    { value: "passport", label: "Passport Copy" },
    { value: "driving_license", label: "Driving License" },
    ...(country === 'India' ? [{ value: "aadhaar", label: "Aadhaar Card" }] : country === 'Tanzania' ? [{ value: "aadhaar", label: "NIDA / NIN Document" }, { value: "nssf", label: "NSSF Number Document" }] : []),
    { value: "certificates", label: "Educational Certificates" },
    { value: "other", label: "Other: General Document" },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);


  return (
    <div className="relative w-full space-y-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Choose Document Category <span className="text-red-500">*</span>
      </label>

      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full h-10 items-center justify-between rounded-lg border border-gray-300 bg-white dark:bg-gray-800 px-3 py-2.5 text-left text-sm font-medium text-gray-900 shadow-2xs hover:bg-gray-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:text-gray-100 transition-all"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate">
            {selectedCategory
              ? documentCategories.find((c) => c.value === selectedCategory)?.label
              : "Select a document category..."}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <ul
            className="absolute z-[9999] mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-800 p-1.5 shadow-xl ring-1 ring-black/5 dark:border-gray-700 [&::-webkit-scrollbar]:hidden space-y-0.5"
            role="listbox"
          >
            {documentCategories.map((category) => {
              const isAlreadyAdded = existingDocTypes.includes(category.value);
              const isSelected = selectedCategory === category.value;

              return (
                <li
                  key={category.value}
                  onClick={() => {
                    if (!isAlreadyAdded) {
                      onSelectCategory(category.value);
                      setIsOpen(false);
                    }
                  }}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary-foreground"
                      : isAlreadyAdded
                      ? "cursor-not-allowed text-gray-400 bg-gray-50 dark:bg-gray-900/50 dark:text-gray-500"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60"
                  }`}
                >
                  <span className="truncate">{category.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0"/>}
                  {isAlreadyAdded && !isSelected && (
                    <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-200/60 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      Added
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const DocumentSection: React.FC<DocumentSectionProps> = ({
  passportFile,
  setPassportFile,
  dlFile,
  setDlFile,
  panFile,
  setPanFile,
  aadhaarFile,
  setAadhaarFile,
  nssfFile,
  setNssfFile,
  resumeFile,
  setResumeFile,
  certificateFiles,
  setCertificateFiles,
  otherDocuments,
  formData,
  setFormData,
  handleInputChange,
  formErrors,
  verificationStatuses = {}
}) => {
  const [isAddingDoc, setIsAddingDoc] = useState<boolean>(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [previewData, setPreviewData] = useState<{ url: string; title: string; type: string } | null>(null);

  // Local draft states
  const [localFormData, setLocalFormData] = useState({
    passportNumber: "",
    passportIssuedDate: "",
    passportExpiry: "",
    drivingLicense: "",
    licenseExpiry: "",
    panNumber: "",
    aadhaarNumber: "",
    nssfNumber: "",
    certificateCourseName: "",
    certificateIssuedBy: ""
  });
  
  const [localPassportFile, setLocalPassportFile] = useState<any>(null);
  const [localDlFile, setLocalDlFile] = useState<any>(null);
  const [localPanFile, setLocalPanFile] = useState<any>(null);
  const [localAadhaarFile, setLocalAadhaarFile] = useState<any>(null);
  const [localNssfFile, setLocalNssfFile] = useState<any>(null);
  const [localResumeFile, setLocalResumeFile] = useState<any>(null);
  const [localCertificateFiles, setLocalCertificateFiles] = useState<any[]>([]);

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [hasTriedSubmit, setHasTriedSubmit] = useState<boolean>(false);

  const existingDocTypes = useMemo(() => [
    ...(passportFile ? ["passport"] : []),
    ...(dlFile ? ["driving_license"] : []),
    ...(panFile ? ["pan"] : []),
    ...(aadhaarFile ? ["aadhaar"] : []),
    ...(nssfFile ? ["nssf"] : []),
    ...(resumeFile ? ["resume"] : []),
  ], [passportFile, dlFile, panFile, aadhaarFile, nssfFile, resumeFile]);

  const handleEditDocType = (type: string) => {
    setIsAddingDoc(true);
    setSelectedDocType(type);
    setHasTriedSubmit(false);
    setLocalErrors({});
    setLocalFormData({
      passportNumber: formData.passportNumber || "",
      passportIssuedDate: formData.passportIssuedDate || "",
      passportExpiry: formData.passportExpiry || "",
      drivingLicense: formData.drivingLicense || "",
      licenseExpiry: formData.licenseExpiry || "",
      panNumber: formData.panNumber || "",
      aadhaarNumber: formData.aadhaarNumber || "",
      nssfNumber: formData.nssfNumber || "",
      certificateCourseName: formData.certificateCourseName || "",
      certificateIssuedBy: formData.certificateIssuedBy || ""
    });
    setLocalPassportFile(passportFile);
    setLocalDlFile(dlFile);
    setLocalPanFile(panFile);
    setLocalAadhaarFile(aadhaarFile);
    setLocalNssfFile(nssfFile);
    setLocalResumeFile(resumeFile);
    setLocalCertificateFiles(certificateFiles);
  };

  const handleAddNewDoc = () => {
    setIsAddingDoc(true);
    setSelectedDocType("");
    setHasTriedSubmit(false);
    setLocalErrors({});
    setLocalFormData({
      passportNumber: "",
      passportIssuedDate: "",
      passportExpiry: "",
      drivingLicense: "",
      licenseExpiry: "",
      panNumber: "",
      aadhaarNumber: "",
      nssfNumber: "",
      certificateCourseName: "",
      certificateIssuedBy: ""
    });
    setLocalPassportFile(null);
    setLocalDlFile(null);
    setLocalPanFile(null);
    setLocalAadhaarFile(null);
    setLocalNssfFile(null);
    setLocalResumeFile(null);
    setLocalCertificateFiles([]);

    setTimeout(() => {
      const formElement = document.getElementById('document-registry');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleLocalSubmit = () => {
    setHasTriedSubmit(true);
    const errors: Record<string, string> = {};

    if (selectedDocType === 'passport') {
      if (!localFormData.passportNumber) errors.passportNumber = "Passport Number is required";
      if (!localFormData.passportIssuedDate) errors.passportIssuedDate = "Issued Date is required";
      if (!localFormData.passportExpiry) errors.passportExpiry = "Expiry Date is required";
      if (!localPassportFile) errors.passportFile = "Passport Copy is required";
      
      if (localFormData.passportExpiry) {
        const inputDate = new Date(localFormData.passportExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate <= today) {
          errors.passportExpiry = "Expiry date must be in future";
        }
      }
    }
    
    if (selectedDocType === 'driving_license') {
      if (!localFormData.drivingLicense) errors.drivingLicense = "License Number is required";
      if (!localFormData.licenseExpiry) errors.licenseExpiry = "Expiry Date is required";
      if (!localDlFile) errors.dlFile = "License Copy is required";

      if (localFormData.licenseExpiry) {
        const inputDate = new Date(localFormData.licenseExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate <= today) {
          errors.licenseExpiry = "Expiry date must be in future";
        }
      }
    }

    const isIndia = formData?.primaryCountry === 'India';
    const isTanzania = formData?.primaryCountry === 'Tanzania';

    if (selectedDocType === 'pan') {
      if (!localFormData.panNumber) {
        errors.panNumber = isTanzania ? "TIN Number is required" : "PAN Number is required";
      } else if (isIndia) {
        const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!PAN_REGEX.test(localFormData.panNumber.toUpperCase())) {
          errors.panNumber = "Invalid PAN format (e.g., ABCDE1234F)";
        }
      } else if (isTanzania) {
        const cleanTin = localFormData.panNumber.replace(/\D/g, '');
        if (cleanTin.length !== 9) {
          errors.panNumber = "Tanzania TIN must be a 9 digit number";
        }
      }
      if (!localPanFile) errors.panFile = isTanzania ? "TIN Document Copy is required" : "PAN Card Copy is required";
    }

    if (selectedDocType === 'aadhaar') {
      if (!localFormData.aadhaarNumber) {
        errors.aadhaarNumber = isTanzania ? "NIDA / NIN is required" : "Aadhaar Number is required";
      } else if (isIndia) {
        const cleanAadhaar = localFormData.aadhaarNumber.replace(/\s/g, '');
        if (!/^\d{12}$/.test(cleanAadhaar)) {
          errors.aadhaarNumber = "Aadhaar must be a 12 digit number";
        }
      } else if (isTanzania) {
        const cleanNida = localFormData.aadhaarNumber.replace(/\D/g, '');
        if (cleanNida.length !== 20) {
          errors.aadhaarNumber = "NIDA / NIN must be a 20 digit number";
        }
      }
      if (!localAadhaarFile) errors.aadhaarFile = isTanzania ? "NIDA / NIN Document Copy is required" : "Aadhaar Copy is required";
    }

    if (selectedDocType === 'nssf') {
      if (!localFormData.nssfNumber) errors.nssfNumber = "NSSF Number is required";
      if (!localNssfFile) errors.nssfFile = "NSSF Document Copy is required";
    }

    if (selectedDocType === 'resume') {
      if (!localResumeFile) errors.resumeFile = "Resume Copy is required";
    }

    setLocalErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Build object with only the fields of the selected document type to avoid wiping other types
    const updatedFields: Record<string, any> = {};
    if (selectedDocType === 'passport') {
      updatedFields.passportNumber = localFormData.passportNumber;
      updatedFields.passportIssuedDate = localFormData.passportIssuedDate;
      updatedFields.passportExpiry = localFormData.passportExpiry;
    } else if (selectedDocType === 'driving_license') {
      updatedFields.drivingLicense = localFormData.drivingLicense;
      updatedFields.licenseExpiry = localFormData.licenseExpiry;
    } else if (selectedDocType === 'pan') {
      updatedFields.panNumber = localFormData.panNumber;
    } else if (selectedDocType === 'aadhaar') {
      updatedFields.aadhaarNumber = localFormData.aadhaarNumber;
    } else if (selectedDocType === 'nssf') {
      updatedFields.nssfNumber = localFormData.nssfNumber;
    } else if (selectedDocType === 'certificates') {
      updatedFields.certificateCourseName = localFormData.certificateCourseName;
      updatedFields.certificateIssuedBy = localFormData.certificateIssuedBy;
    }

    // Commit to parent state
    setFormData((prev: any) => ({
      ...prev,
      ...updatedFields
    }));

    if (selectedDocType === 'passport') setPassportFile(localPassportFile);
    if (selectedDocType === 'driving_license') setDlFile(localDlFile);
    if (selectedDocType === 'pan') setPanFile(localPanFile);
    if (selectedDocType === 'aadhaar') setAadhaarFile(localAadhaarFile);
    if (selectedDocType === 'nssf') setNssfFile(localNssfFile);
    if (selectedDocType === 'resume') setResumeFile(localResumeFile);
    if (selectedDocType === 'certificates') setCertificateFiles(localCertificateFiles);

    setIsAddingDoc(false);
    setSelectedDocType("");
  };

  const handlePreview = (file: any, title: string) => {
    let url = "";
    if (file instanceof File) {
      url = URL.createObjectURL(file);
    } else if (typeof file === 'string') {
      url = getProfilePictureUrl(file) || "";
    }
    
    if (url) {
      setPreviewData({ url, title, type: typeof file === 'string' ? file.split('.').pop()?.toLowerCase() || '' : file.name.split('.').pop()?.toLowerCase() || '' });
    }
  };

  const hasDocuments = useMemo(() => {
    return [passportFile, panFile, aadhaarFile, nssfFile, dlFile, resumeFile, ...certificateFiles, ...otherDocuments].some(f => f);
  }, [passportFile, panFile, aadhaarFile, nssfFile, dlFile, resumeFile, certificateFiles, otherDocuments]);

  return (
    <div id="documents" className={`animate-in fade-in slide-in-from-left-2 duration-300 space-y-8 scroll-mt-24`}>
      {hasDocuments && (
        <div>
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Identity & Legal Documents</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4 mt-4">
            {[
              { label: 'Passport', file: passportFile, type: 'passport' },
              { label: 'Driving License', file: dlFile, type: 'driving_license' },
              { label: formData?.primaryCountry === 'India' ? 'PAN Card' : formData?.primaryCountry === 'United States' || formData?.primaryCountry === 'USA' ? 'SSN Document' : formData?.primaryCountry === 'Tanzania' ? 'TIN Document' : formData?.primaryCountry === 'United Kingdom' ? 'NINO Document' : 'Tax ID Copy', file: panFile, type: 'pan' },
              ...(formData?.primaryCountry === 'India' ? [{ label: 'Aadhaar Card', file: aadhaarFile, type: 'aadhaar' }] : formData?.primaryCountry === 'Tanzania' ? [{ label: 'NIDA / NIN', file: aadhaarFile, type: 'aadhaar' }, { label: 'NSSF Document', file: nssfFile, type: 'nssf' }] : []),
              { label: 'Resume', file: resumeFile, type: 'resume' },
              ...certificateFiles.map((f, i) => ({ label: `Certificate ${i+1}`, file: f, type: 'certificate' })),
              ...otherDocuments.map((f, i) => ({ label: `Other Doc ${i+1}`, file: f, type: 'other' }))
            ].filter(doc => doc.file).map((doc, idx) => {
              const fileProps = getFileTypeProps(doc.file);
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    handleEditDocType(doc.type);
                    // Scroll to form
                    setTimeout(() => {
                      const formElement = document.getElementById('document-registry');
                      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 50);
                  }}
                  className="group relative bg-muted border border-border rounded-[12px] p-3 aspect-square hover:bg-blue-50/50 hover:border-blue-200 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-sm"
                  title="Click to edit document"
                >
                  {/* File Icon with Modern Type Badge */}
                  <div className="relative mb-2 p-1.5 rounded transition-colors">
                    <FileText className="w-10 h-10 text-muted-foreground group-hover:text-blue-500 opacity-60 transition-colors" />
                    {/* Colored Type Badge */}
                    <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 ${fileProps.color} rounded-[4px] shadow-sm`}>
                      <span className="text-[7px] font-black text-white leading-none tracking-wider uppercase">
                        {fileProps.label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-0.5 w-full">
                    <span className="text-[11px] font-bold text-foreground leading-tight line-clamp-1 w-full px-1">
                      {doc.label}
                    </span>
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tighter">
                      {doc.file instanceof File 
                        ? (doc.file.size > 1024 * 1024 
                            ? `${(doc.file.size / (1024 * 1024)).toFixed(1)} MB` 
                            : `${(doc.file.size / 1024).toFixed(0)} KB`)
                        : "SAVED"}
                    </span>
                    <div className="mt-1.5">
                      {getStatusBadge(verificationStatuses[doc.type])}
                    </div>
                  </div>

                  {/* View/Edit Action Overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(doc.file, doc.label);
                      }}
                      className="bg-card/90 p-1.5 rounded-full shadow-sm hover:bg-primary hover:text-white transition-all transform hover:scale-110 text-muted-foreground"
                      title="Quick View"
                    >
                       <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDocType(doc.type);
                        // Scroll to form
                        setTimeout(() => {
                          const formElement = document.getElementById('document-registry');
                          if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 50);
                      }}
                      className="bg-card/90 p-1.5 rounded-full shadow-sm hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110 text-muted-foreground"
                      title="Edit Document"
                    >
                       <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            <button
              type="button"
              onClick={handleAddNewDoc}
              className={`group flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-[12px] aspect-square transition-all duration-300 bg-muted/50 border-border text-muted-foreground hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-500`}
            >
              <PlusCircle className={`w-5 h-5 transition-transform group-hover:scale-110`} />
              <span className="text-[10px] font-bold tracking-tight">{'Add New'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom: Document Registry Form (Expandable) */}
      {(!hasDocuments || isAddingDoc) && (
        <div id="document-registry" className="w-full animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-6 bg-muted rounded-[10px] border border-border relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <PlusCircle className={`w-5 h-5 ${selectedDocType ? "text-blue-500" : "text-muted-foreground"}`} />
                <h4 className="text-[12px] font-medium text-foreground text-[14px]">
                  {selectedDocType 
                    ? `Edit ${selectedDocType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Details` 
                    : "Add New Document"}
                </h4>
              </div>
              {hasDocuments && isAddingDoc && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingDoc(false)}
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Row 1, Col 1: Category Selector (Hidden when editing specific doc) */}
              {!selectedDocType && (
                <div className="col-span-full md:col-span-1">
                  <DocumentCategoryDropdown
                    selectedCategory={selectedDocType}
                    onSelectCategory={(val) => {
                      setSelectedDocType(val);
                      setHasTriedSubmit(false);
                      setLocalErrors({});
                    }}
                    existingDocTypes={existingDocTypes}
                    country={formData?.primaryCountry}
                  />
                </div>
              )}

              {/* Row 1, Col 2 & Subsequent: Dynamic Fields Area */}
              {selectedDocType === 'passport' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Passport Number <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="passportNumber" 
                      value={localFormData.passportNumber} 
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, passportNumber: e.target.value }))} 
                      className={`w-full h-10 px-3 bg-card border rounded text-[12px] focus:outline-none focus:ring-2 transition-all ${localErrors.passportNumber ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-300 focus:ring-blue-500'}`}
                      placeholder="Enter Passport Number"
                    />
                    {localErrors.passportNumber && <p className="text-xs text-red-500 mt-1">{localErrors.passportNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Issued Date <span className="text-red-500">*</span></label>
                    <ModernDatePicker 
                      value={localFormData.passportIssuedDate} 
                      onChange={(date) => setLocalFormData(prev => ({ ...prev, passportIssuedDate: date }))} 
                      error={!!localErrors.passportIssuedDate}
                      placeholder="Select Issued Date"
                    />
                    {localErrors.passportIssuedDate && <p className="text-xs text-red-500 mt-1">{localErrors.passportIssuedDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Expiry Date <span className="text-red-500">*</span></label>
                    <ModernDatePicker 
                      value={localFormData.passportExpiry} 
                      onChange={(date) => setLocalFormData(prev => ({ ...prev, passportExpiry: date }))} 
                      error={!!localErrors.passportExpiry}
                      placeholder="Select Expiry Date"
                    />
                    {localErrors.passportExpiry && <p className="text-xs text-red-500 mt-1">{localErrors.passportExpiry}</p>}
                  </div>
                  <div className="col-span-full">
                    <FileUpload
                      id="passportFile"
                      label="Passport Copy"
                      required
                      files={localPassportFile ? [localPassportFile] : []}
                      onFilesChange={(files) => setLocalPassportFile(files[0] || null)}
                      allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                      onPreview={handlePreview}
                      showViewEdit={true}
                    />
                    {localErrors.passportFile && <p className="text-xs text-red-500 mt-1">{localErrors.passportFile}</p>}
                  </div>
                </>
              )}

              {selectedDocType === 'driving_license' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">License Number <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="drivingLicense" 
                      value={localFormData.drivingLicense} 
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, drivingLicense: e.target.value }))} 
                      className={`w-full h-10 px-3 bg-card border rounded text-[12px] focus:outline-none focus:ring-2 transition-all ${localErrors.drivingLicense ? 'border-red-500 focus:ring-red-400/20' : 'border-gray-300 focus:ring-blue-500'}`}
                      placeholder="Enter License Number"
                    />
                    {localErrors.drivingLicense && <p className="text-xs text-red-500 mt-1">{localErrors.drivingLicense}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Expiry Date <span className="text-red-500">*</span></label>
                    <ModernDatePicker 
                      value={localFormData.licenseExpiry} 
                      onChange={(date) => setLocalFormData(prev => ({ ...prev, licenseExpiry: date }))} 
                      error={!!localErrors.licenseExpiry}
                      placeholder="Select Expiry Date"
                    />
                    {localErrors.licenseExpiry && <p className="text-xs text-red-500 mt-1">{localErrors.licenseExpiry}</p>}
                  </div>
                  <div className="col-span-full">
                    <FileUpload
                      id="dlFile"
                      label="License Copy"
                      required
                      files={localDlFile ? [localDlFile] : []}
                      onFilesChange={(files) => setLocalDlFile(files[0] || null)}
                      allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                      onPreview={handlePreview}
                      showViewEdit={true}
                    />
                    {localErrors.dlFile && <p className="text-xs text-red-500 mt-1">{localErrors.dlFile}</p>}
                  </div>
                </>
              )}

              {selectedDocType === 'pan' && (() => {
                const isIndia = formData?.primaryCountry === 'India';
                const isUSA = formData?.primaryCountry === 'United States' || formData?.primaryCountry === 'USA';
                const isTanzania = formData?.primaryCountry === 'Tanzania';
                const isUK = formData?.primaryCountry === 'United Kingdom';
                
                const taxLabel = isIndia ? 'PAN Number' : isUSA ? 'Social Security Number (SSN)' : isTanzania ? 'TIN Number' : isUK ? 'National Insurance Number (NINO)' : 'Tax ID Number';
                const taxPlaceholder = isIndia ? 'Enter PAN Number' : isUSA ? 'Enter SSN' : isTanzania ? 'Enter TIN' : isUK ? 'Enter NINO' : 'Enter Tax ID';
                const docLabel = isIndia ? 'PAN Card Copy' : isUSA ? 'SSN Document Copy' : isTanzania ? 'TIN Document Copy' : isUK ? 'NINO Document Copy' : 'Tax ID Copy';

                return (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{taxLabel} <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="panNumber" 
                      value={localFormData.panNumber} 
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, panNumber: e.target.value }))} 
                      className={`w-full h-10 px-3 bg-card border rounded text-[12px] focus:outline-none focus:ring-2 transition-all ${localErrors.panNumber ? 'border-red-500 focus:ring-red-400/20' : 'border-gray-300 focus:ring-blue-500'}`}
                      placeholder={taxPlaceholder}
                    />
                    {localErrors.panNumber && <p className="text-xs text-red-500 mt-1">{localErrors.panNumber}</p>}
                  </div>
                  <div className="col-span-full">
                    <FileUpload
                      id="panFile"
                      label={docLabel}
                      required
                      files={localPanFile ? [localPanFile] : []}
                      onFilesChange={(files) => setLocalPanFile(files[0] || null)}
                      allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                      onPreview={handlePreview}
                      showViewEdit={true}
                    />
                    {localErrors.panFile && <p className="text-xs text-red-500 mt-1">{localErrors.panFile}</p>}
                  </div>
                </>
              )})()}

              {selectedDocType === 'aadhaar' && (formData?.primaryCountry === 'India' || formData?.primaryCountry === 'Tanzania') && (() => {
                const isIndia = formData?.primaryCountry === 'India';
                const idLabel = isIndia ? 'Aadhaar Number' : 'NIDA / NIN Number';
                const idPlaceholder = isIndia ? 'Enter Aadhaar Number' : 'Enter NIDA or National ID Number';
                const docLabel = isIndia ? 'Aadhaar Copy' : 'NIDA / NIN Document Copy';

                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{idLabel} <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        name="aadhaarNumber" 
                        value={localFormData.aadhaarNumber} 
                        onChange={(e) => setLocalFormData(prev => ({ ...prev, aadhaarNumber: e.target.value }))} 
                        className={`w-full h-10 px-3 bg-card border rounded text-[12px] focus:outline-none focus:ring-2 transition-all ${localErrors.aadhaarNumber ? 'border-red-500 focus:ring-red-400/20' : 'border-gray-300 focus:ring-blue-500'}`}
                        placeholder={idPlaceholder}
                      />
                      {localErrors.aadhaarNumber && <p className="text-xs text-red-500 mt-1">{localErrors.aadhaarNumber}</p>}
                    </div>
                    <div className="col-span-full">
                      <FileUpload
                        id="aadhaarFile"
                        label={docLabel}
                        required
                        files={localAadhaarFile ? [localAadhaarFile] : []}
                        onFilesChange={(files) => setLocalAadhaarFile(files[0] || null)}
                        allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                        onPreview={handlePreview}
                        showViewEdit={true}
                      />
                      {localErrors.aadhaarFile && <p className="text-xs text-red-500 mt-1">{localErrors.aadhaarFile}</p>}
                    </div>
                  </>
                );
              })()}

              {selectedDocType === 'nssf' && formData?.primaryCountry === 'Tanzania' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">NSSF Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="nssfNumber"
                      value={localFormData.nssfNumber}
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, nssfNumber: e.target.value }))}
                      className={`w-full h-10 px-3 bg-card border rounded text-[12px] focus:outline-none focus:ring-2 transition-all ${localErrors.nssfNumber ? 'border-red-500 focus:ring-red-400/20' : 'border-gray-300 focus:ring-blue-500'}`}
                      placeholder="Enter NSSF Number"
                    />
                    {localErrors.nssfNumber && <p className="text-xs text-red-500 mt-1">{localErrors.nssfNumber}</p>}
                  </div>
                  <div className="col-span-full">
                    <FileUpload
                      id="nssfFile"
                      label="NSSF Document Copy"
                      required
                      files={localNssfFile ? [localNssfFile] : []}
                      onFilesChange={(files) => setLocalNssfFile(files[0] || null)}
                      allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                      onPreview={handlePreview}
                      showViewEdit={true}
                    />
                    {localErrors.nssfFile && <p className="text-xs text-red-500 mt-1">{localErrors.nssfFile}</p>}
                  </div>
                </>
              )}

              {selectedDocType === 'resume' && (
                <>
                  <div className="col-span-full">
                    <FileUpload
                      id="resumeFile"
                      label="Professional Resume"
                      required
                      files={localResumeFile ? [localResumeFile] : []}
                      onFilesChange={(files) => setLocalResumeFile(files[0] || null)}
                      allowedFormats={['PDF', 'DOC', 'DOCX']}
                      onPreview={handlePreview}
                      showViewEdit={true}
                    />
                    {localErrors.resumeFile && <p className="text-xs text-red-500 mt-1">{localErrors.resumeFile}</p>}
                  </div>
                </>
              )}

              {selectedDocType === 'certificates' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Course Name</label>
                    <input 
                      type="text" 
                      name="certificateCourseName" 
                      value={localFormData.certificateCourseName} 
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, certificateCourseName: e.target.value }))} 
                      className="w-full h-10 px-3 bg-card border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter Course Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Issued By</label>
                    <input 
                      type="text" 
                      name="certificateIssuedBy" 
                      value={localFormData.certificateIssuedBy} 
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, certificateIssuedBy: e.target.value }))} 
                      className="w-full h-10 px-3 bg-card border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter Issuer Name"
                    />
                  </div>
                  <div className="col-span-full">
                    <FileUpload
                      label="Certification Files"
                      multiple
                      files={localCertificateFiles}
                      onFilesChange={setLocalCertificateFiles}
                      allowedFormats={['PDF', 'JPG', 'PNG', 'JPEG']}
                      onPreview={handlePreview}
                      showViewEdit={true}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {selectedDocType && (
              <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingDoc(false);
                    setSelectedDocType("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={handleLocalSubmit}
                  className="bg-primary hover:bg-primary/70 text-white text-xs font-semibold px-6 py-2 rounded shadow-sm transition-all flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  {hasDocuments ? "Update" : "Add"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Document Preview Modal */}
      {previewData && (
        <DocumentViewer
          isOpen={!!previewData}
          onClose={() => setPreviewData(null)}
          url={previewData.url}
          title={previewData.title}
          type={previewData.type}
        />
      )}
    </div>
  );
};

const DocumentViewer = ({ isOpen, onClose, url, title, type }: { isOpen: boolean; onClose: () => void; url: string; title: string, type: string }) => {
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type.toLowerCase());
  const isPdf = type.toLowerCase() === 'pdf';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-5xl">
      <div className="flex flex-col h-[70vh] w-full bg-muted rounded overflow-hidden border border-border">
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {isImage ? (
            <img src={url} alt={title} className="max-w-full max-h-full object-contain shadow-sm rounded" />
          ) : isPdf ? (
            <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none shadow-inner bg-card" title={title} />
          ) : (
            <div className="text-center p-12 bg-card rounded shadow-sm border border-border">
              <FileText className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h4 className="text-[12px] font-medium text-foreground mb-2">Detailed View Not Available</h4>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-sm">This file type cannot be previewed directly in the browser. Please download it to view the contents.</p>
              <Button 
                onClick={() => window.open(url, '_blank')}
                className="bg-primary hover:bg-primary/70 text-white font-bold py-3 px-8 rounded shadow-sm transition-all flex items-center justify-center mx-auto gap-2"
              >
                <Download className="w-5 h-5" />
                Download Document
              </Button>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-card border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>File Format: <span className="text-foreground uppercase">{type || 'Unknown'}</span></span>
            </div>
            <div className="flex gap-3">
                <Button 
                    variant="secondary" 
                    onClick={() => window.open(url, '_blank')}
                    className="text-xs font-bold flex items-center gap-2 px-4 h-9"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in New Tab
                </Button>
                <Button 
                    onClick={onClose}
                    className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-6 h-9"
                >
                    Close Preview
                </Button>
            </div>
        </div>
      </div>
    </Dialog>
  );
};

export default DocumentSection;

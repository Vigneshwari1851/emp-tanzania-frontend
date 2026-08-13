import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  AlertCircle, 
  Info, 
  FileText, 
  Trash2,
  Plus,
  Upload,
  ClipboardCheck,
  Search,
  ArrowRightLeft
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import ConditionalSelect from '@/shared/components/ui/ConditionalSelect';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { useFeatures } from '@/features/edition/hooks/useFeatures';
import { getEmployee, getEmployees } from '@/features/employees/services/employees';

export const EXIT_STATUS = {
  PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
  NEGOTIATION_PENDING: 'NEGOTIATION_PENDING',
  RESIGNATION_ACCEPTED: 'RESIGNATION_ACCEPTED',
  OFFBOARDING: 'OFFBOARDING',
  ASSET_HANDOVER: 'ASSET_HANDOVER',
  IT_CLEARANCE: 'IT_CLEARANCE',
  EXIT_INTERVIEW: 'EXIT_INTERVIEW',
  CLEARANCE: 'CLEARANCE',
  FINAL_SETTLEMENT: 'FINAL_SETTLEMENT',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
};

interface InitiateExitFormProps {
  onBack?: () => void;
  initialData?: any;
}

const InitiateExitForm: React.FC<InitiateExitFormProps> = ({ onBack, initialData }) => {
  const { user } = useAuth();
  const normalizedRole = user?.role?.toString().toUpperCase() || '';
  const userRolesList = Array.isArray(user?.roles) ? user.roles : [];
  const normalizedRoles = [normalizedRole, ...userRolesList.map((r: any) => String(r).toUpperCase())];
  const isAdminOrHR = normalizedRoles.some((r: string) => 
    ['SUPER ADMIN', 'SUPER_ADMIN', 'ADMIN', 'CEO', 'SYSTEM ADMINISTRATOR', 'HR', 'HR MANAGER', 'HR_MANAGER', 'HR EXECUTIVE', 'HR_EXECUTIVE'].includes(r)
  );

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // KT Section States
  const [ktStatus, setKtStatus] = useState(initialData?.kt_status || 'Not Started');
  const [selectedKTAssignee, setSelectedKTAssignee] = useState<any>(initialData?.kt_assignee || null);
  const [ktAssigneeSearchQuery, setKtAssigneeSearchQuery] = useState(
    initialData?.kt_assignee?.details
      ? `${initialData.kt_assignee.details.first_name} ${initialData.kt_assignee.details.last_name} (${initialData.kt_assignee.details.employee_id})`
      : initialData?.kt_assignee?.username || ''
  );
  const [ktAssigneeSearchResults, setKtAssigneeSearchResults] = useState<any[]>([]);
  const [isSearchingKTAssignee, setIsSearchingKTAssignee] = useState(false);
  const [showKTAssigneeDropdown, setShowKTAssigneeDropdown] = useState(false);
  const [ktAssigneeHighlightedIndex, setKtAssigneeHighlightedIndex] = useState(0);

  const [ktDescription, setKtDescription] = useState(initialData?.kt_description || '');
  
  const [ktCompletionDate, setKtCompletionDate] = useState(
    initialData?.kt_completion_date ? new Date(initialData.kt_completion_date).toISOString().split('T')[0] : ''
  );
  
  const [selectedKTVerifiedBy, setSelectedKTVerifiedBy] = useState<any>(initialData?.kt_verified_by || null);
  const [ktVerifiedBySearchQuery, setKtVerifiedBySearchQuery] = useState(
    initialData?.kt_verified_by?.details
      ? `${initialData.kt_verified_by.details.first_name} ${initialData.kt_verified_by.details.last_name} (${initialData.kt_verified_by.details.employee_id})`
      : initialData?.kt_verified_by?.username || ''
  );
  const [ktVerifiedBySearchResults, setKtVerifiedBySearchResults] = useState<any[]>([]);
  const [isSearchingKTVerifiedBy, setIsSearchingKTVerifiedBy] = useState(false);
  const [showKTVerifiedByDropdown, setShowKTVerifiedByDropdown] = useState(false);
  const [ktVerifiedByHighlightedIndex, setKtVerifiedByHighlightedIndex] = useState(0);

  const [ktRemarks, setKtRemarks] = useState(initialData?.kt_remarks || '');

  const ktAssigneeRef = useRef<HTMLDivElement>(null);
  const ktVerifiedByRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    exitType: initialData?.exit_type || 'Resignation',
    noticeDate: initialData?.notice_date ? new Date(initialData.notice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    lastWorkingDay: initialData?.last_working_day ? new Date(initialData.last_working_day).toISOString().split('T')[0] : '',
    primaryReason: initialData?.primary_reason || '',
    explanation: initialData?.explanation || '',
    waiver: initialData?.notice_waiver ? 'Yes' : 'No',
    interviewPreference: initialData?.interview_pref || 'Virtual (Video Call)',
    handoverNotes: initialData?.handover_notes || '',
    acknowledged: initialData ? true : false,
    noticePeriodValid: true,
    shortfallDays: 0,
    waiverReason: '',
    personalEmail: ''
  });

  const { has } = useFeatures();
  const [assetTrackingEnabledState, setAssetTrackingEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("asset_tracking_enabled") !== "false";
  });

  useEffect(() => {
    const handleModuleConfigUpdate = () => {
      setAssetTrackingEnabledState(localStorage.getItem("asset_tracking_enabled") !== "false");
    };
    window.addEventListener("module-config-updated", handleModuleConfigUpdate);
    return () => window.removeEventListener("module-config-updated", handleModuleConfigUpdate);
  }, []);

  const isAssetTrackingEnabled = assetTrackingEnabledState && has("ASSET_MANAGEMENT");

  const [assets, setAssets] = useState<any[]>(() => {
    if (initialData?.assets) {
      return initialData.assets.map((a: any) => ({
        name: a.asset_name || a.name,
        id: a.asset_serial_no || a.id,
        category: a.category || 'IT Equipment',
        asset_id: a.asset_id,
        assignment_id: a.assignment_id,
        return_status: a.return_status ? 'Returned' : 'Pending',
        return_date: a.return_date ? new Date(a.return_date).toISOString().split('T')[0] : '',
        condition: a.condition || 'Good'
      }));
    }
    return [];
  });
  const [newAsset, setNewAsset] = useState({ name: '', return_status: 'Pending', return_date: '', condition: 'Good' });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAssets, setIsFetchingAssets] = useState(false);

  // Fetch initial employee details if not Admin, or if editing an existing request
  useEffect(() => {
    if (!isAdminOrHR && user?.id) {
      const fetchCurrentEmployeeDetails = async () => {
        try {
          setIsLoadingDetails(true);
          const empData = await getEmployee(parseInt(user.id, 10));
          if (empData) {
            setSelectedEmployee(empData);
            setEmployeeSearchQuery(empData.details?.employee_id || '');
            setFormData(prev => ({
              ...prev,
              personalEmail: prev.personalEmail || empData.details?.secondary_email || empData.email || ''
            }));
          }
        } catch (error) {
          console.error('Failed to fetch logged-in employee profile:', error);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      fetchCurrentEmployeeDetails();
    } else if (initialData && initialData.user_id) {
      const fetchTargetEmployeeDetails = async () => {
        try {
          setIsLoadingDetails(true);
          const empData = await getEmployee(initialData.user_id);
          if (empData) {
            setSelectedEmployee(empData);
            setEmployeeSearchQuery(empData.details?.employee_id || '');
            setFormData(prev => ({
              ...prev,
              personalEmail: prev.personalEmail || empData.details?.secondary_email || empData.email || ''
            }));
          }
        } catch (error) {
          console.error('Failed to fetch exit request employee profile:', error);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      fetchTargetEmployeeDetails();
    }
  }, [isAdminOrHR, user?.id, initialData]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for employee matching ID
  useEffect(() => {
    if (!isAdminOrHR || !!initialData) return;

    if (employeeSearchQuery.trim() === '') {
      setSelectedEmployee(null);
      setSearchResults([]);
      setHighlightedIndex(0);
      return;
    }

    const queryLower = employeeSearchQuery.trim().toLowerCase();
    const empIdLower = selectedEmployee?.details?.employee_id?.trim().toLowerCase();
    const empNameLower = `${selectedEmployee?.details?.first_name || ''} ${selectedEmployee?.details?.last_name || ''}`.trim().toLowerCase();

    if (selectedEmployee && (empIdLower === queryLower || empNameLower === queryLower)) {
      setSearchResults([]);
      return;
    }

    if (selectedEmployee && empIdLower !== queryLower) {
      setSelectedEmployee(null);
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingEmployees(true);
      try {
        const response = await getEmployees({ search: employeeSearchQuery, limit: 100 });
        setSearchResults(response || []);
        setHighlightedIndex(0);
      } catch (error) {
        console.error('Failed to search employees:', error);
        setSearchResults([]);
      } finally {
        setIsSearchingEmployees(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [employeeSearchQuery, isAdminOrHR, initialData, selectedEmployee]);

  // Auto-resolve exact employee match by Employee ID
  useEffect(() => {
    if (!isAdminOrHR || !!initialData) return;
    if (employeeSearchQuery.trim() === "") return;
    
    // If we already have selectedEmployee matching the query, don't auto-resolve again
    if (selectedEmployee?.details?.employee_id?.toLowerCase() === employeeSearchQuery.trim().toLowerCase()) {
      return;
    }
    
    const resolveExactMatch = async () => {
      try {
        const response = await getEmployees({ search: employeeSearchQuery.trim(), limit: 5 });
        const exactMatch = response.find(
          (emp: any) =>
            emp.details?.employee_id?.toLowerCase() === employeeSearchQuery.trim().toLowerCase()
        );
        if (exactMatch) {
          const empData = await getEmployee(exactMatch.id);
          setSelectedEmployee(empData);
          setFormData(prev => ({
            ...prev,
            personalEmail: empData.details?.secondary_email || empData.email || prev.personalEmail || ''
          }));
        }
      } catch (err) {
        console.error("Error auto-resolving exact employee match:", err);
      }
    };
    
    // Small delay to let user finish typing exact ID
    const timeoutId = setTimeout(resolveExactMatch, 500);
    return () => clearTimeout(timeoutId);
  }, [employeeSearchQuery, selectedEmployee, isAdminOrHR, initialData]);

  const handleSelectEmployee = async (emp: any) => {
    setEmployeeSearchQuery(emp.details?.employee_id || '');
    setShowDropdown(false);
    try {
      setIsLoadingDetails(true);
      const empData = await getEmployee(emp.id);
      setSelectedEmployee(empData);
      setFormData(prev => ({
        ...prev,
        personalEmail: empData.details?.secondary_email || empData.email || prev.personalEmail || ''
      }));
    } catch (error) {
      console.error('Failed to fetch selected employee details:', error);
      setSelectedEmployee(emp);
      setFormData(prev => ({
        ...prev,
        personalEmail: emp.details?.secondary_email || emp.email || prev.personalEmail || ''
      }));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getReportingManagerDisplay = () => {
    if (!selectedEmployee) return '';
    const details = selectedEmployee.details || {};
    const manager = details.reporting_manager;
    
    if (manager) {
      if (manager.details) {
        const fname = manager.details.first_name || manager.details.firstName || '';
        const lname = manager.details.last_name || manager.details.lastName || '';
        const fullName = `${fname} ${lname}`.trim();
        if (fullName) return fullName;
      }
      
      const fname = manager.first_name || manager.firstName || '';
      const lname = manager.last_name || manager.lastName || '';
      const fullName = `${fname} ${lname}`.trim();
      if (fullName) return fullName;
      
      if (manager.username) return manager.username;
    }
    
    if (details.reporting_manager_name) return details.reporting_manager_name;
    if (selectedEmployee.reporting_manager_name) return selectedEmployee.reporting_manager_name;
    
    return 'Direct';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectEmployee(searchResults[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Click outside listener for KT Assignee & Verifier dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ktAssigneeRef.current && !ktAssigneeRef.current.contains(event.target as Node)) {
        setShowKTAssigneeDropdown(false);
      }
      if (ktVerifiedByRef.current && !ktVerifiedByRef.current.contains(event.target as Node)) {
        setShowKTVerifiedByDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for KT Assignee
  useEffect(() => {
    if (ktAssigneeSearchQuery.trim() === '') {
      setKtAssigneeSearchResults([]);
      return;
    }

    // Clear selection if changed
    const currentName = selectedKTAssignee?.details
      ? `${selectedKTAssignee.details.first_name} ${selectedKTAssignee.details.last_name} (${selectedKTAssignee.details.employee_id})`
      : selectedKTAssignee?.username || '';
    if (selectedKTAssignee && currentName !== ktAssigneeSearchQuery) {
      setSelectedKTAssignee(null);
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingKTAssignee(true);
      try {
        const response = await getEmployees({ search: ktAssigneeSearchQuery, limit: 100 });
        setKtAssigneeSearchResults(response || []);
        setKtAssigneeHighlightedIndex(0);
      } catch (error) {
        console.error('Failed to search employees:', error);
      } finally {
        setIsSearchingKTAssignee(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [ktAssigneeSearchQuery]);

  // Debounced search for KT Verifier
  useEffect(() => {
    if (ktVerifiedBySearchQuery.trim() === '') {
      setKtVerifiedBySearchResults([]);
      return;
    }

    // Clear selection if changed
    const currentName = selectedKTVerifiedBy?.details
      ? `${selectedKTVerifiedBy.details.first_name} ${selectedKTVerifiedBy.details.last_name} (${selectedKTVerifiedBy.details.employee_id})`
      : selectedKTVerifiedBy?.username || '';
    if (selectedKTVerifiedBy && currentName !== ktVerifiedBySearchQuery) {
      setSelectedKTVerifiedBy(null);
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingKTVerifiedBy(true);
      try {
        const response = await getEmployees({ search: ktVerifiedBySearchQuery, limit: 100 });
        setKtVerifiedBySearchResults(response || []);
        setKtVerifiedByHighlightedIndex(0);
      } catch (error) {
        console.error('Failed to search employees:', error);
      } finally {
        setIsSearchingKTVerifiedBy(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [ktVerifiedBySearchQuery]);

  const handleKTAssigneeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showKTAssigneeDropdown || ktAssigneeSearchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKtAssigneeHighlightedIndex(prev => Math.min(prev + 1, ktAssigneeSearchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKtAssigneeHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const emp = ktAssigneeSearchResults[ktAssigneeHighlightedIndex];
      setSelectedKTAssignee(emp);
      setKtAssigneeSearchQuery(emp.details ? `${emp.details.first_name} ${emp.details.last_name} (${emp.details.employee_id})` : emp.username);
      setShowKTAssigneeDropdown(false);
    } else if (e.key === 'Escape') {
      setShowKTAssigneeDropdown(false);
    }
  };

  const handleKTVerifiedByKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showKTVerifiedByDropdown || ktVerifiedBySearchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKtVerifiedByHighlightedIndex(prev => Math.min(prev + 1, ktVerifiedBySearchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKtVerifiedByHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const emp = ktVerifiedBySearchResults[ktVerifiedByHighlightedIndex];
      setSelectedKTVerifiedBy(emp);
      setKtVerifiedBySearchQuery(emp.details ? `${emp.details.first_name} ${emp.details.last_name} (${emp.details.employee_id})` : emp.username);
      setShowKTVerifiedByDropdown(false);
    } else if (e.key === 'Escape') {
      setShowKTVerifiedByDropdown(false);
    }
  };

  // Fetch assets of selected employee
  useEffect(() => {
    const targetUserId = selectedEmployee?.id || initialData?.user_id;
    if (isAssetTrackingEnabled && targetUserId) {
      if (initialData && targetUserId === initialData.user_id && initialData.assets && initialData.assets.length > 0) {
        return;
      }
      fetchMyAssets(targetUserId);
    } else {
      setAssets([]);
    }
  }, [selectedEmployee?.id, initialData?.user_id]);

  const fetchMyAssets = async (targetUserId: number | string) => {
    try {
      setIsFetchingAssets(true);
      const response = await axiosInstance.get(`/exit/my-assigned-assets?userId=${targetUserId}`);
      if (response.data.success) {
        const fetchedAssets = response.data.data.map((a: any) => ({
          name: a.name,
          id: a.serial_number || a.id?.toString() || '',
          category: a.category || 'IT Equipment',
          asset_id: a.id,
          assignment_id: a.assignment_id,
          return_status: 'Pending',
          return_date: '',
          condition: 'Good'
        }));
        setAssets(fetchedAssets);
      }
    } catch (error) {
      console.error('Failed to fetch assigned assets:', error);
    } finally {
      setIsFetchingAssets(false);
    }
  };

  const addAsset = () => {
    if (!newAsset.name.trim()) {
      toast.error('Asset Name is required');
      return;
    }
    if (!newAsset.return_status) {
      toast.error('Return Status is required');
      return;
    }
    if (!newAsset.return_date) {
      toast.error('Return Date is required');
      return;
    }
    if (!newAsset.condition) {
      toast.error('Asset Condition is required');
      return;
    }

    setAssets(prev => [
      ...prev,
      {
        name: newAsset.name.trim(),
        id: newAsset.name.trim().toLowerCase().replace(/\s+/g, '-'),
        category: 'IT Equipment',
        return_status: newAsset.return_status,
        return_date: newAsset.return_date,
        condition: newAsset.condition
      }
    ]);
    setNewAsset({ name: '', return_status: 'Pending', return_date: '', condition: 'Good' });
  };

  const removeAsset = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  };


  const handleSubmit = async () => {
    if (!formData.acknowledged) {
      toast.error('Please acknowledge the terms before submitting');
      return;
    }

    if (isAdminOrHR && !initialData && !selectedEmployee) {
      toast.error('Please select an employee by searching their Employee ID');
      return;
    }

    if (!formData.noticeDate || !formData.lastWorkingDay || !formData.primaryReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.noticeDate && formData.lastWorkingDay && formData.lastWorkingDay < formData.noticeDate) {
      toast.error('Preferred Last Working Day must be on or after the Resignation / Notice Date.');
      return;
    }

    if (!formData.noticePeriodValid && formData.waiver === 'No') {
      toast.error('Selected LWD does not meet notice period policy. Please select a valid date or request a waiver.');
      return;
    }

    if (formData.waiver === 'Yes' && !formData.waiverReason.trim()) {
      toast.error('Please provide a justification for the notice period waiver');
      return;
    }

    if (!initialData && (!formData.personalEmail.trim() || !formData.personalEmail.includes('@'))) {
      toast.error('Please provide a valid personal email for post-exit communication');
      return;
    }

    if (isAdminOrHR) {
      if (!ktStatus) {
        toast.error('KT Status is required');
        return;
      }

      if (ktStatus === 'Completed') {
        if (!ktCompletionDate) {
          toast.error('KT Completion Date is required when status is Completed');
          return;
        }
        if (!selectedKTVerifiedBy) {
          toast.error('KT Verification (Verified By) is required when status is Completed');
          return;
        }
      }
    }

    if (newAsset.name.trim() || newAsset.return_date) {
      if (!newAsset.name.trim() || !newAsset.return_status || !newAsset.return_date || !newAsset.condition) {
        toast.error('Please fully populate or clear the current Asset Return form row before submitting');
        return;
      }
    }

    const finalAssets = [...assets];
    if (newAsset.name.trim()) {
      finalAssets.push({
        name: newAsset.name.trim(),
        id: newAsset.name.trim().toLowerCase().replace(/\s+/g, '-'),
        category: 'IT Equipment',
        return_status: newAsset.return_status,
        return_date: newAsset.return_date,
        condition: newAsset.condition
      });
    }

    try {
      setIsLoading(true);
      
      const employeeName = selectedEmployee 
        ? `${selectedEmployee.details?.first_name || ''} ${selectedEmployee.details?.last_name || ''}`.trim() || selectedEmployee.username || ''
        : `${(user as any)?.details?.first_name || ''} ${(user as any)?.details?.last_name || ''}`.trim() || (user as any)?.username || '';
         
      const employeeId = selectedEmployee?.details?.employee_id || (user as any)?.details?.employee_id || '';
 
      const payload: any = {
        employee_id: employeeId,
        employee_name: employeeName,
        exit_type: formData.exitType,
        notice_date: formData.noticeDate,
        last_working_day: formData.lastWorkingDay,
        primary_reason: formData.primaryReason,
        explanation: formData.explanation,
        notice_waiver: formData.waiver === 'Yes',
        interview_pref: formData.interviewPreference,
        handover_notes: `${formData.handoverNotes}\n\n[Post-Exit Contact]\nPersonal Email: ${formData.personalEmail}${formData.waiver === 'Yes' ? `\n\n[Waiver Justification]\n${formData.waiverReason}` : ''}`.trim(),
        assets: finalAssets.map(a => ({
          ...a,
          return_status: a.return_status === 'Returned'
        })),
        company_assets_returned: finalAssets.map(a => ({
          name: a.name,
          id: a.id,
          category: a.category,
          return_status: a.return_status === 'Returned',
          return_date: a.return_date,
          condition: a.condition
        })),
        acknowledged: formData.acknowledged,
        kt_status: ktStatus,
        kt_assignee_id: selectedKTAssignee?.id,
        kt_description: ktDescription,
        kt_completion_date: ktCompletionDate || null,
        kt_verified_by_id: selectedKTVerifiedBy?.id || null,
        kt_remarks: ktRemarks,
        reporting_manager_id: selectedEmployee?.details?.reporting_manager_id || (user as any)?.details?.reporting_manager_id || null
      };

      if (isAdminOrHR && selectedEmployee?.id) {
        payload.userId = selectedEmployee.id;
      }

      const response = initialData 
        ? await axiosInstance.put(`/exit/${initialData.id}`, payload)
        : await axiosInstance.post('/exit/initiate', payload);
      
      if (response.data.success) {
        toast.success(initialData ? 'Exit request updated successfully' : 'Exit request submitted successfully');
        if (onBack) onBack();
      }
    } catch (error: any) {
      console.error('Exit submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit exit request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Initiate Exit Formalities</h1>
        <p className="text-muted-foreground font-medium text-sm">Please complete this form to initiate your exit process. All fields marked with * are required.</p>
      </div>

      {/* Single Column Vertical Layout */}
      <div className="space-y-6 w-full">
        
        {/* Card 1: Employee Details, Exit Type and Timeline */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-visible">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-card rounded-t-xl">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="font-medium text-foreground text-[17px]">Exit Type and Timeline</h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-6">
            {/* Grid for 8 fields: 4 on the left, 4 on the right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* Field 1: Employee ID */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-foreground">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isAdminOrHR ? "Search by Employee ID (e.g. EMP-10)" : "Employee ID"}
                    value={employeeSearchQuery}
                    onChange={(e) => {
                      setEmployeeSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowDropdown(true)}
                    disabled={!!initialData || !isAdminOrHR}
                    className="w-full px-4 py-2.5 pl-10 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm placeholder:text-muted-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {isSearchingEmployees && (
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && employeeSearchQuery.trim() !== '' && !initialData && isAdminOrHR && (
                  <div className="absolute z-50 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-border">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        {isSearchingEmployees ? 'Searching...' : 'No employee found'}
                      </div>
                    ) : (
                      searchResults.map((emp, index) => (
                        <div
                          key={emp.id}
                          onClick={() => handleSelectEmployee(emp)}
                          className={`px-4 py-3 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                            index === highlightedIndex
                              ? 'bg-teal-50 text-teal-700 font-medium'
                              : 'text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {emp.details?.employee_id || `ID: ${emp.id}`} — {emp.details ? `${emp.details.first_name} ${emp.details.last_name}` : emp.username}
                            </div>
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">
                            {emp.details?.department?.department_name || 'No Dept'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Field 2: Employee Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Employee Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedEmployee ? `${selectedEmployee.details?.first_name || ''} ${selectedEmployee.details?.last_name || ''}`.trim() || selectedEmployee.username || '' : ''}
                    placeholder={isLoadingDetails ? "Loading..." : "—"}
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground outline-none cursor-not-allowed"
                  />
                  {isLoadingDetails && (
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Field 3: Department */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Department
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedEmployee?.details?.department?.department_name || ''}
                  placeholder="—"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>

              {/* Field 4: Designation */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Designation
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedEmployee?.details?.designation?.designation_name || selectedEmployee?.details?.job_role || selectedEmployee?.details?.role?.role_name || ''}
                  placeholder="—"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>

              {/* Field 5: Reporting Manager */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Reporting Manager
                </label>
                <input
                  type="text"
                  readOnly
                  value={getReportingManagerDisplay()}
                  placeholder="—"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>


              {/* Field 6: Exit Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Exit Type <span className="text-red-500">*</span>
                </label>
                <ConditionalSelect
                  value={formData.exitType}
                  onChange={(val) => {
                    const v = val as string;
                    const isRetirementOrContract = v === 'Retirement' || v === 'End of Contract';
                    setFormData(prev => ({
                      ...prev,
                      exitType: v,
                      primaryReason: isRetirementOrContract ? v : prev.primaryReason
                    }));
                  }}
                  options={[
                    { value: "Resignation", label: "Resignation" },
                    { value: "Retirement", label: "Retirement" },
                    { value: "End of Contract", label: "End of Contract" },
                    { value: "Mutual Separation", label: "Mutual Separation" },
                  ]}
                  placeholder="Select exit type..."
                />
              </div>

              {/* Field 7: Resignation/Notice Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Resignation/Notice Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  readOnly
                  disabled
                  value={formData.noticeDate ? new Date(formData.noticeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  className="w-full px-4 py-2.5 bg-muted/60 border border-border rounded-lg text-sm text-foreground font-semibold cursor-not-allowed select-none opacity-80"
                />
              </div>

              {/* Field 8: Preferred Last Working Day */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Preferred Last Working Day <span className="text-red-500">*</span>
                </label>
                <ModernDatePicker
                  value={formData.lastWorkingDay}
                  minDate={formData.noticeDate}
                  onChange={(date) => {
                    const ldw = new Date(date);
                    const notice = formData.noticeDate ? new Date(formData.noticeDate) : new Date();
                    const diffTime = Math.abs(ldw.getTime() - notice.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isRetirementOrContract = formData.exitType === 'Retirement' || formData.exitType === 'End of Contract';
                    const requiredDays = isRetirementOrContract ? 0 : 30;
                    const valid = diffDays >= requiredDays;
                    setFormData(prev => ({ 
                      ...prev, 
                      lastWorkingDay: date,
                      noticePeriodValid: valid,
                      shortfallDays: valid ? 0 : requiredDays - diffDays
                    }));
                  }}
                  error={!formData.noticePeriodValid || !!(formData.noticeDate && formData.lastWorkingDay && formData.lastWorkingDay < formData.noticeDate)}
                  placeholder="Select Last Working Day"
                />
                {formData.noticeDate && formData.lastWorkingDay && formData.lastWorkingDay < formData.noticeDate && (
                  <div className="text-red-500 text-xs mt-1 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Preferred Last Working Day must be on or after the Resignation / Notice Date.
                  </div>
                )}
                {!formData.noticePeriodValid && formData.lastWorkingDay && !(formData.noticeDate && formData.lastWorkingDay && formData.lastWorkingDay < formData.noticeDate) && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg mt-3 text-xs leading-relaxed animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Notice Period Shortfall: {formData.shortfallDays} days
                    </div>
                    As per company policy, a notice period recovery (buyout) will be calculated during Final Settlement for the unserved {formData.shortfallDays} days, unless a waiver is requested and approved by your manager.
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5 flex gap-4">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-[12px] font-medium text-[15px] text-blue-900 mb-1">Notice Period Information</h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Your contract requires a 30-day notice period. Your manager may approve an early release or request you to serve the full notice period based on business needs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Reason for Exit */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-card">
            <div className="p-2 bg-teal-50 rounded-lg">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="font-medium text-foreground text-[17px]">Reason for Exit</h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Primary Reason <span className="text-red-500">*</span>
                </label>
                <ConditionalSelect
                  value={formData.primaryReason}
                  onChange={(val) => setFormData(prev => ({ ...prev, primaryReason: val as string }))}
                  options={[
                    { value: "Better Opportunity", label: "Better Opportunity" },
                    { value: "Personal Reasons", label: "Personal Reasons" },
                    { value: "Career Change", label: "Career Change" },
                    { value: "Relocation", label: "Relocation" },
                    { value: "Education", label: "Education" },
                    { value: "Retirement", label: "Retirement" },
                    { value: "End of Contract", label: "End of Contract" },
                    { value: "Mutual Separation", label: "Mutual Separation" },
                  ]}
                  placeholder="Select a reason"
                  disabled={false}
                />
              </div>

              {/* Exit Interview Preference */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Exit Interview Preference</label>
                <ConditionalSelect
                  value={formData.interviewPreference}
                  onChange={(val) => setFormData(prev => ({ ...prev, interviewPreference: val as string }))}
                  options={[
                    { value: "Virtual (Video Call)", label: "Virtual (Video Call)" },
                    { value: "In-Person", label: "In-Person" },
                    { value: "Telephone", label: "Telephone" },
                  ]}
                  placeholder="Select preference"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Detailed Explanation <span className="text-red-500">*</span>
              </label>
              <textarea 
                rows={5}
                className="w-full px-4 py-4 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-[15px] placeholder:text-muted-foreground resize-none"
                placeholder="Please provide more details about your reason for leaving..."
                value={formData.explanation}
                onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Card: Knowledge Transfer (Manager & HR Only) */}
        {isAdminOrHR && (
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-visible">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-card rounded-t-xl">
              <div className="p-2 bg-teal-50 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="font-medium text-foreground text-[17px]">Knowledge Transfer</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Track the knowledge transfer process, assign the recipient, and record completion details.</p>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* KT Status and KT Assignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* KT Status */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    KT Status <span className="text-red-500">*</span>
                  </label>
                  <ConditionalSelect
                    value={ktStatus}
                    onChange={(val) => setKtStatus(val as string)}
                    options={[
                      { value: "Not Started", label: "Not Started" },
                      { value: "In Progress", label: "In Progress" },
                      { value: "Completed", label: "Completed" },
                    ]}
                    placeholder="Select KT Status"
                  />
                </div>

                {/* KT Assignee */}
                <div className="space-y-2 relative" ref={ktAssigneeRef}>
                  <label className="block text-sm font-medium text-foreground">
                    KT Assignee <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search or Select Employee"
                      value={ktAssigneeSearchQuery}
                      onChange={(e) => {
                        setKtAssigneeSearchQuery(e.target.value);
                        setShowKTAssigneeDropdown(true);
                      }}
                      onKeyDown={handleKTAssigneeKeyDown}
                      onFocus={() => setShowKTAssigneeDropdown(true)}
                      className="w-full px-4 py-2.5 pl-10 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm placeholder:text-muted-foreground"
                    />
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    {isSearchingKTAssignee && (
                      <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showKTAssigneeDropdown && ktAssigneeSearchQuery.trim() !== '' && (
                    <div className="absolute z-50 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-border">
                      {ktAssigneeSearchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                          {isSearchingKTAssignee ? 'Searching...' : 'No employee found'}
                        </div>
                      ) : (
                        ktAssigneeSearchResults.map((emp, index) => (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setSelectedKTAssignee(emp);
                              setKtAssigneeSearchQuery(emp.details ? `${emp.details.first_name} ${emp.details.last_name} (${emp.details.employee_id})` : emp.username);
                              setShowKTAssigneeDropdown(false);
                            }}
                            className={`px-4 py-3 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                              index === ktAssigneeHighlightedIndex
                                ? 'bg-teal-50 text-teal-700 font-medium'
                                : 'text-foreground hover:bg-muted/50'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-foreground">
                                {emp.details?.first_name ? `${emp.details.first_name} ${emp.details.last_name}` : emp.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {emp.details?.employee_id || `ID: ${emp.id}`}
                              </div>
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {emp.details?.department?.department_name || 'No Dept'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  rows={4}
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  className="w-full px-4 py-4 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm placeholder:text-muted-foreground"
                  placeholder="Briefly describe the knowledge that needs to be transferred, including projects, responsibilities, documentation, client information, or other relevant details."
                  value={ktDescription}
                  onChange={(e) => setKtDescription(e.target.value)}
                />
              </div>

              {/* Completion Details Subsection */}
              <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Completion Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  {/* Completion Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Completion Date {ktStatus === 'Completed' && <span className="text-red-500">*</span>}
                    </label>
                    <ModernDatePicker
                      value={ktCompletionDate}
                      onChange={(date) => setKtCompletionDate(date)}
                      placeholder="Select Completion Date"
                    />
                  </div>

                  {/* Verified By */}
                  <div className="space-y-2 relative" ref={ktVerifiedByRef}>
                    <label className="block text-sm font-medium text-foreground">
                      Verified By {ktStatus === 'Completed' && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search or Select Employee"
                        value={ktVerifiedBySearchQuery}
                        onChange={(e) => {
                          setKtVerifiedBySearchQuery(e.target.value);
                          setShowKTVerifiedByDropdown(true);
                        }}
                        onKeyDown={handleKTVerifiedByKeyDown}
                        onFocus={() => setShowKTVerifiedByDropdown(true)}
                        className="w-full px-4 py-2.5 pl-10 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm placeholder:text-muted-foreground"
                      />
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      {isSearchingKTVerifiedBy && (
                        <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showKTVerifiedByDropdown && ktVerifiedBySearchQuery.trim() !== '' && (
                      <div className="absolute z-50 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-border">
                        {ktVerifiedBySearchResults.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                            {isSearchingKTVerifiedBy ? 'Searching...' : 'No employee found'}
                          </div>
                        ) : (
                          ktVerifiedBySearchResults.map((emp, index) => (
                            <div
                              key={emp.id}
                              onClick={() => {
                                setSelectedKTVerifiedBy(emp);
                                setKtVerifiedBySearchQuery(emp.details ? `${emp.details.first_name} ${emp.details.last_name} (${emp.details.employee_id})` : emp.username);
                                setShowKTVerifiedByDropdown(false);
                              }}
                              className={`px-4 py-3 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                                index === ktVerifiedByHighlightedIndex
                                  ? 'bg-teal-50 text-teal-700 font-medium'
                                  : 'text-foreground hover:bg-muted/50'
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-foreground">
                                  {emp.details?.first_name ? `${emp.details.first_name} ${emp.details.last_name}` : emp.username}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {emp.details?.employee_id || `ID: ${emp.id}`}
                                </div>
                              </div>
                              <div className="text-xs font-medium text-muted-foreground">
                                {emp.details?.department?.department_name || 'No Dept'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-2 mt-6">
                  <label className="block text-sm font-medium text-foreground">
                    Remarks
                  </label>
                  <textarea
                    rows={4}
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    className="w-full px-4 py-4 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm placeholder:text-muted-foreground"
                    placeholder="Enter any completion notes or verification remarks."
                    value={ktRemarks}
                    onChange={(e) => setKtRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card: Company Assets to be Returned */}
        {isAssetTrackingEnabled && (
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-visible">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-card rounded-t-xl">
              <div className="p-2 bg-teal-50 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-teal-600" />
              </div>
              <h2 className="font-medium text-foreground text-[17px]">Company Assets to be Returned</h2>
            </div>
            
            <div className="p-6 md:p-8 space-y-6">
              <p className="text-muted-foreground text-sm">Please list all company assets in your possession that need to be returned.</p>
  
              {/* Inputs in grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Asset Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">Asset Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. Laptop / Monitor"
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm bg-card text-foreground"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* Return Status */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">Return Status <span className="text-red-500">*</span></label>
                    <ConditionalSelect
                      value={newAsset.return_status}
                      onChange={(val) => setNewAsset(prev => ({ ...prev, return_status: val as string }))}
                      options={[
                        { value: "Pending", label: "Pending" },
                        { value: "Returned", label: "Returned" }
                      ]}
                      placeholder="Select Status"
                    />
                  </div>

                  {/* Asset Condition */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">Asset Condition <span className="text-red-500">*</span></label>
                    <ConditionalSelect
                      value={newAsset.condition}
                      onChange={(val) => setNewAsset(prev => ({ ...prev, condition: val as string }))}
                      options={[
                        { value: "Good", label: "Good" },
                        { value: "Damaged", label: "Damaged" },
                        { value: "Missing", label: "Missing" }
                      ]}
                      placeholder="Select Condition"
                    />
                  </div>

                  {/* Return Date */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">Return Date <span className="text-red-500">*</span></label>
                    <ModernDatePicker
                      value={newAsset.return_date}
                      onChange={(date) => setNewAsset(prev => ({ ...prev, return_date: date }))}
                      placeholder="Select Return Date"
                    />
                  </div>
                </div>

                <Button 
                  onClick={(e) => { e.preventDefault(); addAsset(); }}
                  variant="outline"
                  className="bg-card border-border text-foreground h-10 px-4 font-bold w-full sm:w-auto justify-center mt-2 hover:bg-muted"
                >
                  <Plus className="w-4 h-4 mr-2" />
                   Add Another Asset
                </Button>
              </div>

              {/* Simple List of Added Assets */}
              {isFetchingAssets ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                  Fetching assigned assets...
                </div>
              ) : assets.length > 0 ? (
                <div className="space-y-2 mt-4 border-t border-border pt-4">
                  <h4 className="text-sm font-bold text-foreground">Added Assets ({assets.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {assets.map((asset, index) => (
                      <div key={index} className="flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1.5 rounded-full border border-border max-w-full overflow-hidden">
                        <span className="font-semibold truncate">{asset.name}</span>
                        <span className="text-xs text-muted-foreground">({asset.return_status})</span>
                        <button 
                          onClick={(e) => { e.preventDefault(); removeAsset(index); }}
                          className="text-red-500 hover:text-red-700 transition-colors ml-1 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted/40 border border-border p-3 rounded-lg flex items-center justify-between">
                  <span>No company assets currently assigned. You can manually add assets above if needed, or leave empty to proceed.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card 3: Additional Details */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-card">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Info className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="font-medium text-foreground text-[17px]">Additional Details</h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-6">
            {/* Notice Period Waiver Option */}
            <div className="space-y-3 pb-4 border-b border-border">
              <label className="block text-sm font-medium text-foreground">Request Notice Period Waiver?</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="waiver" 
                    className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500 cursor-pointer"
                    checked={formData.waiver === 'Yes'}
                    onChange={() => setFormData(prev => ({ ...prev, waiver: 'Yes' }))}
                  />
                  <span className="text-sm font-medium text-foreground group-hover:text-foreground">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="waiver" 
                    className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500 cursor-pointer"
                    checked={formData.waiver === 'No'}
                    onChange={() => setFormData(prev => ({ ...prev, waiver: 'No' }))}
                  />
                  <span className="text-sm font-medium text-foreground group-hover:text-foreground">No</span>
                </label>
              </div>

              {formData.waiver === 'Yes' && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Waiver Justification <span className="text-red-500">*</span></label>
                  <textarea 
                    rows={2}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm placeholder:text-muted-foreground resize-none"
                    placeholder="Provide a valid reason for early release (subject to manager & HR approval)"
                    value={formData.waiverReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, waiverReason: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Post-Exit Contact Information */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">Post-Exit Contact Email <span className="text-red-500">*</span></label>
              <input 
                type="email"
                className="w-full px-4 py-2.5 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm placeholder:text-muted-foreground"
                placeholder="Personal email for sending Final Settlement (FnF) and Tax documents"
                value={formData.personalEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, personalEmail: e.target.value }))}
              />
            </div>

            {/* Work Handover Notes */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">Work Handover Notes</label>
              <textarea 
                rows={4}
                className="w-full px-4 py-4 bg-card border border-border rounded-lg focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm placeholder:text-muted-foreground resize-none"
                placeholder="Provide details about ongoing projects, important contacts, and any pending tasks..."
                value={formData.handoverNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, handoverNotes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Important Information (Full Width Card) */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-6 shadow-sm w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-[17px] font-medium text-amber-900">Important Information</h3>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Your exit request will be reviewed by your immediate manager',
              'The notice period and last working day are subject to manager approval',
              'You must return all company assets before your last working day',
              'Final settlement will be processed after clearance completion',
              'You will receive email notifications about your exit request status'
            ].map((info, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 flex-shrink-0" />
                <p className="text-[13.5px] font-normal text-amber-800 leading-relaxed">{info}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer: Acknowledgement and Actions */}
      <div className="mt-2 pt-6 border-t border-border space-y-6">
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
          <input 
            type="checkbox" 
            id="acknowledge"
            className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
            checked={formData.acknowledged}
            onChange={(e) => setFormData(prev => ({ ...prev, acknowledged: e.target.checked }))}
          />
          <label htmlFor="acknowledge" className="text-sm text-foreground leading-relaxed cursor-pointer select-none">
            I acknowledge that I have read and understood the above information, and all the details provided in this form are accurate to the best of my knowledge. <span className="text-red-500">*</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 w-full pb-8">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="px-8 h-12 text-gray-600 font-bold border-border hover:bg-muted rounded-lg transition-all w-full sm:w-auto justify-center"
          >
            Cancel
          </Button>
          <Button 
            className="bg-teal-600 hover:bg-teal-700 text-white px-10 h-12 text-base font-bold rounded-lg shadow-sm shadow-teal-100 transition-all disabled:opacity-70 w-full sm:w-auto justify-center"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};


export default InitiateExitForm;


import React, { useState, useEffect, useMemo, useRef } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams, useLocation } from "react-router-dom";
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { Loader2 } from "lucide-react";
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { getEmployees, getEmployeesByTeam } from '@/features/employees/services/employees';
import { getDepartment, getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/features/organization/services/departments';
import { getOrganizations } from '@/features/organization/services/organizations';
import { createTeam, updateTeam, deleteTeam, getTeam } from '@/features/organization/services/teams';
import { createDesignation } from '@/features/organization/services/designations';
import type { PendingDesignation } from '../components/DesignationSettingsForm';
import type { Branch } from '@/features/organization/services/organizations';
import { toast } from "sonner";
import { Permission } from '@/shared/types/rbac';
import { RoleGate } from '@/features/auth/components/RoleGate';
import DepartmentFormDetail from "../components/DepartmentFormDetail";
import TeamFormDetail from "../components/TeamFormDetail";

interface Team {
  id: string;
  name: string;
  lead: string;
  leadId: string;
  description: string;
  branch_ids: string[];
  membersCount: number;
  avatars: string[];
  members: any[];
}

interface UIEmployee {
  id: string;
  name: string;
  title: string;
  department: string;
  avatar: string;
  role: string;
}

const mapToUIEmployee = (emp: any): UIEmployee => {
  // Robust role identification
  let userRole = emp.role || 'EMPLOYEE';
  if (emp.details?.role?.role_name) {
    userRole = emp.details.role.role_name;
  } else if (emp.roles && Array.isArray(emp.roles) && emp.roles.length > 0) {
    const roleNames = emp.roles.map((r: any) => (r.name || r.role_name || r.role?.role_name || r).toString().toUpperCase());
    if (roleNames.some((r: string) => r.includes('SUPER_ADMIN') || r.includes('SUPER ADMIN'))) userRole = 'SUPER_ADMIN';
    else if (roleNames.some((r: string) => r.includes('ADMIN'))) userRole = 'ADMIN';
    else if (roleNames.some((r: string) => r.includes('MANAGER'))) userRole = 'MANAGER';
    else userRole = (emp.roles[0].name || emp.roles[0].role_name || emp.roles[0].role?.role_name || emp.roles[0]).toString();
  }

  return {
    id: emp.id.toString(),
    name: emp.details ? `${emp.details.first_name || ""} ${emp.details.last_name || ""}` : (emp.username || "Anonymous"),
    title: emp.details?.job_role || userRole || "Employee",
    department: emp.details?.department_id ? emp.details.department_id.toString() : "",
    avatar: emp.details ? `${emp.details.first_name?.[0] || ""}${emp.details.last_name?.[0] || ""}`.toUpperCase() : "U",
    role: userRole,
  };
};

export function AddDepartment() {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;

  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [description, setDescription] = useState("");
  const [parentDepartment, setParentDepartment] = useState<string | number>(() => {
    if (location.state && (location.state as any).defaultParentId) {
      return (location.state as any).defaultParentId.toString();
    }
    return "None";
  });
  const [budget, setBudget] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [availableCostCenters, setAvailableCostCenters] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pendingDesignations, setPendingDesignations] = useState<PendingDesignation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTeamEdit, setIsTeamEdit] = useState(false);
  const [isTeamView, setIsTeamView] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const teamLeadSearchRef = useRef<HTMLDivElement>(null);

  // Team modal state
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamLead, setTeamLead] = useState<UIEmployee | null>(null);
  const [showTeamLeadSearch, setShowTeamLeadSearch] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [selectedTeamBranchIds, setSelectedTeamBranchIds] = useState<string[]>([]);



  const [employees, setEmployees] = useState<UIEmployee[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<UIEmployee[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: number, department_name: string, branch_id?: number }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false);
  const [showDeleteDeptDialog, setShowDeleteDeptDialog] = useState(false);
  const [isDeptView, setIsDeptView] = useState(false);

  const isFormValid = useMemo(() => {
    return (
      departmentName.trim() !== "" &&
      departmentCode.trim() !== "" &&
      selectedBranchIds.length > 0
    );
  }, [departmentName, departmentCode, selectedBranchIds]);

  const filteredDepartments = useMemo(() => {
    return departmentsList.filter(dep =>
      (!id || String(dep.id) !== String(id))
    );
  }, [departmentsList, id]);

  const fetchById = async () => {
    try {
      console.log("AddDepartment: fetchById started");
      const [empData, depData, orgResponse] = await Promise.all([
        getEmployees({ limit: 1000 }),
        getDepartments(),
        getOrganizations(),
      ]);

      const mappedEmployees: UIEmployee[] = empData.map(mapToUIEmployee);

      setEmployees(mappedEmployees);
      setDepartmentsList(depData);

      const mainOrg = Array.isArray(orgResponse) ? orgResponse[0] : orgResponse;
      if (mainOrg) {
        setOrganizationName(mainOrg.entity_name || "");
        setBranches(mainOrg.branches || []);
        const ccList = mainOrg.cost_center
          ? mainOrg.cost_center.split(",").map((i: string) => i.trim()).filter(Boolean)
          : [];
        setAvailableCostCenters(ccList);
      }

      if (isEditMode && id) {
        const departmentData = await getDepartment(parseInt(id, 10));
        if (departmentData) {
          setDepartmentName(departmentData.department_name || "");
          setDepartmentCode(departmentData.department_code || "");
          setDescription(departmentData.description || "");
          if (departmentData.branch_id) {
            setSelectedBranchIds([departmentData.branch_id.toString()]);
          } else if (departmentData.branch_ids) { // Assuming backend might support branch_ids
            setSelectedBranchIds(departmentData.branch_ids.map((bid: any) => bid.toString()));
          }
          setParentDepartment(departmentData.parent_department_id?.toString() || "None");
          setBudget(departmentData.annual_budget?.toString() || "");
          setCostCenter((departmentData as any).cost_center || "");

          const teamsList = (departmentData as any).team || (departmentData as any).teams;
          if (teamsList) {
            const mappedTeams = teamsList.map((t: any) => ({
              id: t.id?.toString() || `temp-${Math.random()}`,
              name: t.team_name || "",
              description: t.description || "",
              lead: t.team_lead?.full_name || t.team_lead?.username || t.team_lead_id?.toString() || "",
              leadId: t.team_lead_id?.toString() || "",
              branch_ids: Array.isArray(t.branch_ids) && t.branch_ids.length > 0
                ? t.branch_ids.map((bid: any) => bid.toString())
                : (departmentData.branch_id ? [departmentData.branch_id.toString()] : []),
              membersCount: t.members_count || t.team_employee_count || 0,
              avatars: (Array.isArray(t.members) ? t.members : (Array.isArray(t.team_members) ? t.team_members : []))
                .map((m: any) => m.profile_picture || (m.first_name?.[0] || m.username?.[0] || m.full_name?.[0] || "?").toUpperCase())
                .filter(Boolean),
              members: t.members || t.team_members || []
            }));
            setTeams(mappedTeams);
          }


        }
      }
    } catch (error) {
      console.error("Failed to load data", error);
      toast.error("Failed to load required data");
    } finally {
      setIsLoading(false);
    }
  };



  useEffect(() => {
    fetchById();
  }, [id, isEditMode]);

  useEffect(() => {
    if (!isEditMode && departmentsList.length > 0 && location.state && (location.state as any).defaultParentId) {
      const parentId = (location.state as any).defaultParentId;
      const parentDept = departmentsList.find(d => String(d.id) === String(parentId));
      if (parentDept && parentDept.branch_id) {
        setSelectedBranchIds([parentDept.branch_id.toString()]);
      }
    }
  }, [departmentsList, location.state, isEditMode]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamLeadSearchRef.current && !teamLeadSearchRef.current.contains(event.target as Node)) {
        setShowTeamLeadSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLeads = (teamEmployees.length > 0 ? teamEmployees : employees || []).filter((emp: UIEmployee) => {
    // Match search query
    const matchesSearch = emp.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) || 
                          emp.title.toLowerCase().includes(leadSearchQuery.toLowerCase());
    
    return matchesSearch;
  });



  const handleDeleteDept = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      await deleteDepartment(parseInt(id, 10));
      toast.success("Department deleted successfully");
      navigate("/org-setup");
    } catch (error: any) {
      console.error("Failed to delete department", error);
      toast.error(error.response?.data?.message || error.message || "Failed to delete department");
    } finally {
      setIsSaving(false);
      setShowDeleteDeptDialog(false);
    }
  };

  const handleDeptUpdate = async () => {
    if (isDeptView) {
      toast.error("Cannot save while in view mode.");
      return;
    }

    if (!departmentName || !departmentCode) {
      toast.error("Missing required fields");
      return;
    }

    try {
      setIsSaving(true);
      const createdDeptIds: number[] = [];
      
      if (isEditMode && id) {
        // For editing, we update the current department record
        const payload = {
          department_name: departmentName.trim(),
          department_code: departmentCode.trim(),
          description: description.trim(),
          branch_id: selectedBranchIds.length > 0 ? parseInt(selectedBranchIds[0], 10) : null,
          parent_department_id: parentDepartment !== "None" ? parseInt(parentDepartment as string, 10) : null,
          annual_budget: budget ? parseFloat(budget) : 0,
          cost_center: costCenter || null,
          teams: teams.map(t => ({
            ...(t.id && !t.id.startsWith("team-") && !t.id.startsWith("temp-") ? { id: parseInt(t.id, 10) } : {}),
            team_name: t.name,
            description: t.description,
            team_lead_id: t.leadId ? parseInt(t.leadId, 10) : null
          }))
        };
        await updateDepartment(parseInt(id, 10), payload);
        toast.success("Department updated successfully");
      } else {
        // For creation, we create a separate record for each selected branch
        const insertAboveDeptId = location.state && (location.state as any).insertAboveDeptId;
        for (const branchId of selectedBranchIds) {
          const payload = {
            department_name: departmentName.trim(),
            department_code: departmentCode.trim(),
            description: description.trim(),
            branch_id: parseInt(branchId, 10),
            parent_department_id: parentDepartment !== "None" ? parseInt(parentDepartment as string, 10) : null,
            annual_budget: budget ? parseFloat(budget) : 0,
            cost_center: costCenter || null,
            // Only include teams that are assigned to this specific branch
            teams: teams
              .filter(t => t.branch_ids.includes(branchId))
              .map(t => ({
                team_name: t.name,
                description: t.description,
                team_lead_id: t.leadId ? parseInt(t.leadId, 10) : null
              }))
          };
          const response = await createDepartment(payload);
          if (response?.id) {
            createdDeptIds.push(response.id);
            if (insertAboveDeptId) {
              try {
                await updateDepartment(parseInt(insertAboveDeptId, 10), {
                  parent_department_id: response.id
                });
              } catch (err) {
                console.error("Failed to update parent of shifted department", err);
              }
            }
          }
        }
        
        // Create pending designations for each created department
        if (pendingDesignations.length > 0 && createdDeptIds.length > 0) {
          for (const deptId of createdDeptIds) {
            // Map to store temporary index to real DB ID
            const indexToIdMap = new Map<number, number>();
            
            for (let i = 0; i < pendingDesignations.length; i++) {
              const desig = pendingDesignations[i];
              try {
                const realParentId = desig.parent_designation_id !== null && desig.parent_designation_id !== undefined
                  ? indexToIdMap.get(desig.parent_designation_id as number) ?? null
                  : null;

                const response = await createDesignation({
                  designation_name: desig.designation_name,
                  designation_code: desig.designation_code,
                  description: desig.description,
                  parent_designation_id: realParentId,
                  department_id: deptId,
                });

                if (response && response.id) {
                  indexToIdMap.set(i, response.id);
                }
              } catch (err) {
                console.error("Failed to create designation", desig.designation_name, err);
              }
            }
          }
        }

        toast.success("Department(s) created successfully");
      }
      
      const returnTo = (location.state as any)?.from || "/org-setup";
      navigate(returnTo, {
        replace: true,
        state: { createdDeptIds },
      });
    } catch (error) {
      console.error("Failed to save department", error);
      toast.error(error instanceof Error ? error.message : "Failed to save department");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTeam = () => {
    setTeamName("");
    setTeamDescription("");
    setTeamLead(null);
    setIsTeamView(false);
    
    // Sync with URL for persistence
    const params = new URLSearchParams(location.search);
    params.set("action", "add-team");
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });

    setShowTeamForm(true);
  };

  const handleTeamUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;

    const teamPayload = {
      team_name: capitalizeFirstLetter(teamName),
      description: capitalizeFirstLetter(teamDescription),
      team_lead_id: teamLead?.id ? parseInt(teamLead.id, 10) : null,
      department_id: isEditMode && id ? parseInt(id, 10) : undefined
    };

    try {
      setIsSavingTeam(true);

      const updatedTeam: Team = {
        id: isTeamEdit && selectedTeam ? selectedTeam.id : `temp-${Date.now()}`, // Temporary ID for new teams
        name: capitalizeFirstLetter(teamName),
        description: capitalizeFirstLetter(teamDescription),
        lead: teamLead?.name || "",
        leadId: teamLead?.id || "",
        branch_ids: [...selectedTeamBranchIds],
        membersCount: selectedTeam?.membersCount || 0, // Keep existing count if editing
        avatars: selectedTeam?.avatars || [],
        members: selectedTeam?.members || [],
      };

      if (isEditMode && id) {
        if (isTeamEdit && selectedTeam && !selectedTeam.id.startsWith("team-") && !selectedTeam.id.startsWith("temp-")) {
          await updateTeam(parseInt(selectedTeam.id, 10), teamPayload);
          // High-density dynamic update: Update local teams state immediately
          setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, ...updatedTeam } : t));
          toast.success("Team updated successfully");
        } else {
          const response = await createTeam(teamPayload);
          // High-density dynamic update: Add new team with server ID
          const finalTeam = { ...updatedTeam, id: response.id.toString() };
          setTeams(prev => [...prev.filter(t => t.id !== selectedTeam?.id), finalTeam]);
          toast.success("Team added successfully");
        }
        

        handleCloseTeamPage();
      } else {
        // Handle local creation mode
        if (isTeamEdit) {
          setTeams(teams.map(t => t.id === selectedTeam?.id ? updatedTeam : t));
        } else {
          setTeams([...teams, updatedTeam]);
        }
        handleCloseTeamPage();
      }
    } catch (error) {
      console.error("Failed to save team", error);
      toast.error("Failed to save team");
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleTeamView = async (team: Team) => {
    if (!team || !team.id) return;

    // Reset modal states before loading to prevent flash of old data
    setTeamName("");
    setTeamDescription("");
    setTeamLead(null);
    setIsTeamView(true);
    setIsTeamEdit(false);

    // If it's a temp team (not saved in backend), show local data immediately
    if (String(team.id).startsWith("team-")) {
      setTeamName(team.name);
      setTeamDescription(team.description);
      const lead = employees.find(e => e.id === String(team.leadId));
      setTeamLead(lead || null);
      setSelectedTeamBranchIds(team.branch_ids || []);
      setTeamEmployees([]);
      setSelectedTeam(team);
      
      // Sync with URL for persistence
      const params = new URLSearchParams(location.search);
      params.set("teamId", String(team.id));
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });

      setShowTeamForm(true);
      return;
    }

    try {
      setIsSavingTeam(true); // Using this as the loading indicator

      const [teamDetails, teamEmps] = await Promise.all([
        getTeam(parseInt(String(team.id), 10)),
        getEmployeesByTeam(parseInt(String(team.id), 10))
      ]);

      if (teamDetails) {
        // Map team employees to UI format
        const mappedTeamEmps = teamEmps.map(mapToUIEmployee);
        setTeamEmployees(mappedTeamEmps);

        // 1. Bind basic fields
        setTeamName(teamDetails.team_name || "");
        setTeamDescription(teamDetails.description || "");

        // 2. Bind Team Lead
        const leadId = teamDetails.team_lead_id?.toString();
        if (leadId) {
          const matchedLead = employees.find(e => e.id === leadId);
          setTeamLead(matchedLead || null);
        }



        // 4. Bind Branch IDs
        if (teamDetails.branch_ids && Array.isArray(teamDetails.branch_ids)) {
          setSelectedTeamBranchIds(teamDetails.branch_ids.map((bid: any) => bid.toString()));
        } else if (teamDetails.branch_id) {
          setSelectedTeamBranchIds([teamDetails.branch_id.toString()]);
        } else {
          setSelectedTeamBranchIds([]);
        }

        // 5. Finalize state and open page
        setSelectedTeam({
          ...team,
          membersCount: teamDetails.members_count || 0,
          members: teamDetails.members || [],
          avatars: (teamDetails.members || [])
            .map((m: any) => m.profile_picture || (m.first_name?.[0] || m.username?.[0] || m.full_name?.[0] || "?").toUpperCase())
            .filter(Boolean)
        });
        
        // Sync with URL for persistence
        const params = new URLSearchParams(location.search);
        params.set("teamId", String(team.id));
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });

        setShowTeamForm(true);
      } else {
        toast.error("Team data not found");
      }
    } catch (error) {
      console.error("[TeamView] Error fetching data:", error);
      toast.error("Failed to load team details. Please try again.");
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    // 1. Optimistic Update: Remove from local state immediately for instant 'Dynamic' feel
    const teamToDelete = teams.find(t => t.id === teamId);
    setTeams(prev => prev.filter(t => t.id !== teamId));

    try {
      if (isEditMode && id && !teamId.startsWith("team-") && !teamId.startsWith("temp-")) {
        await deleteTeam(parseInt(teamId, 10));
        toast.success("Team deleted successfully");

      } else {
        // Already handled by optimistic update, no-op or specific toast
        if (teamId.startsWith("team-") || teamId.startsWith("temp-")) {
           toast.success("Team removed");
        }
      }
      handleCloseTeamPage();
    } catch (error: any) {
      // Rollback on failure
      if (teamToDelete) {
        setTeams(prev => [...prev, teamToDelete]);
      }
      console.error("Failed to delete team", error);
      toast.error(error.response?.data?.message || error.message || "Failed to delete team");
    }
  };

  const handleCloseTeamPage = () => {
    setShowTeamForm(false);
    setShowTeamLeadSearch(false);
    setLeadSearchQuery("");
    setSelectedTeam(null);
    setTeamName("");
    setTeamDescription("");
    setTeamLead(null);
    setSelectedTeamBranchIds([]);
    setTeamEmployees([]);
    setIsTeamView(false);
    setIsTeamEdit(false);
    
    // Surgical URL cleanup: clear team params but PRESERVE department view state
    const params = new URLSearchParams(location.search);
    if (params.has("teamId") || params.get("action") === "add-team") {
      params.delete("teamId");
      params.delete("action");
      const newSearch = params.toString();
      navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ""}`, { replace: true });
    }
  };

  const [showCancelDeptConfirm, setShowCancelDeptConfirm] = useState(false);

  const triggerCancelEdit = () => {
    setShowCancelDeptConfirm(true);
  };

  const handleCancelEdit = () => {
    if (showTeamForm) {
      if (selectedTeam && !selectedTeam.id.startsWith("temp-") && !selectedTeam.id.startsWith("team-")) {
        // Return to team view mode
        setIsTeamView(true);
        setIsTeamEdit(false);
        const params = new URLSearchParams(location.search);
        params.set("view", "true");
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      } else {
        handleCloseTeamPage();
      }
    } else {
      if (isEditMode) {
        // Return to department view mode
        setIsDeptView(true);
        const params = new URLSearchParams(location.search);
        params.set("view", "true");
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      } else {
        navigate("/org-setup");
      }
    }
  };

  useEffect(() => {
    if (!isEditMode || isLoading) return;
    const params = new URLSearchParams(location.search);
    const teamId = params.get("teamId");
    const action = params.get("action");
    const isViewMode = params.get("view") === "true";

    setIsDeptView(isViewMode);

    if (action === "add-team") {
      setIsTeamEdit(false);
      setIsTeamView(false);
      setShowTeamForm(true);
      return;
    }

    if (!teamId || teams.length === 0) {
      if (!action) setShowTeamForm(false);
      return;
    }

    const existingTeam = teams.find(t => {
      const tId = typeof t.id === "string" ? t.id : String(t.id);
      return tId === String(teamId);
    });

    if (!existingTeam) {
      console.warn(`Team with id ${teamId} not found in teams list`);
      return;
    }

    if (existingTeam) {
      setTeamName(existingTeam.name);
      setTeamDescription(existingTeam.description);
      const lead = employees.find(e => e.id === existingTeam.leadId);
      setTeamLead(lead || null);
      setSelectedTeamBranchIds(existingTeam.branch_ids || []);
      setSelectedTeam(existingTeam);
      setIsTeamEdit(!isViewMode);
      setIsTeamView(isViewMode);
      setShowTeamForm(true);

      // Fetch team-specific employees for the Team Lead dropdown
      if (!existingTeam.id.toString().startsWith("team-") && !existingTeam.id.toString().startsWith("temp-")) {
        getEmployeesByTeam(parseInt(existingTeam.id.toString(), 10))
          .then(teamEmps => {
            const mappedTeamEmps = teamEmps.map(mapToUIEmployee);
            setTeamEmployees(mappedTeamEmps);
          })
          .catch(err => console.error("Failed to fetch team employees in useEffect", err));
      } else {
        setTeamEmployees([]);
      }
    }
  }, [location.search, teams, employees, isEditMode, isLoading]);

  useEffect(() => {
    if (showTeamForm) {
      const container = document.querySelector('main');
      if (container) {
        container.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [showTeamForm]);



  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RoleGate permissions={[Permission.MANAGE_DEPARTMENTS]}>
      {showTeamForm ? (
        <TeamFormDetail
          isTeamView={isTeamView}
          isTeamEdit={isTeamEdit}
          isSavingTeam={isSavingTeam}
          teamName={teamName}
          setTeamName={setTeamName}
          teamDescription={teamDescription}
          setTeamDescription={setTeamDescription}
          teamLead={teamLead}
          setTeamLead={setTeamLead}
           showTeamLeadSearch={showTeamLeadSearch}
          setShowTeamLeadSearch={setShowTeamLeadSearch}
          leadSearchQuery={leadSearchQuery}
          setLeadSearchQuery={setLeadSearchQuery}
          filteredLeads={filteredLeads}
          handleTeamUpdate={handleTeamUpdate}
          handleCloseTeamPage={handleCloseTeamPage}
          handleCancelEdit={triggerCancelEdit}
          setShowDeleteTeamDialog={setShowDeleteTeamDialog}
          selectedTeam={selectedTeam}
          setIsTeamView={setIsTeamView}
          setIsTeamEdit={setIsTeamEdit}
          navigate={navigate}
          location={location}
          teamLeadSearchRef={teamLeadSearchRef}
          departmentName={departmentName}
        />
      ) : (
        <DepartmentFormDetail
          isDeptView={isDeptView}
          isEditMode={isEditMode}
          isSaving={isSaving}
          departmentId={id ? parseInt(id, 10) : undefined}
          departmentName={departmentName}
          setDepartmentName={setDepartmentName}
          departmentCode={departmentCode}
          setDepartmentCode={setDepartmentCode}
          description={description}
          setDescription={setDescription}
          selectedBranchIds={selectedBranchIds}
          setSelectedBranchIds={setSelectedBranchIds}
          parentDepartment={parentDepartment}
          setParentDepartment={setParentDepartment}
          budget={budget}
          setBudget={setBudget}
          costCenter={costCenter}
          setCostCenter={setCostCenter}
          availableCostCenters={availableCostCenters}
          teams={teams}
          organizationName={organizationName}
          branches={branches}
          filteredDepartments={filteredDepartments}
          handleDeptUpdate={handleDeptUpdate}
          handleCancelEdit={triggerCancelEdit}
          handleAddTeam={handleAddTeam}
          handleTeamView={handleTeamView}
          navigate={navigate}
          location={location}
          isFormValid={isFormValid}
          setIsDeptView={setIsDeptView}
          handlePendingDesignationsChange={setPendingDesignations}
        />
      )}

      {/* Team Deletion Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteTeamDialog}
        onClose={() => setShowDeleteTeamDialog(false)}
        onConfirm={() => {
          if (selectedTeam) {
            handleDeleteTeam(String(selectedTeam.id));
            setShowDeleteTeamDialog(false);
          }
        }}
        title="Delete Team"
        description={
          <span>
            Are you sure you want to delete the team <span className="font-medium text-foreground">"{teamName || "this team"}"</span>? This action cannot be undone.
          </span>
        }
        confirmText="Delete Team"
        variant="danger"
      />

      {/* Department Deletion Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDeptDialog}
        onClose={() => setShowDeleteDeptDialog(false)}
        onConfirm={teams.length === 0 ? handleDeleteDept : () => setShowDeleteDeptDialog(false)}
        title={teams.length > 0 ? "Cannot Delete Department" : "Delete Department"}
        description={
          teams.length > 0 ? (
            <span>
              This department contains <span className="font-medium text-foreground">{teams.length} active teams</span>. You must remove or reassign all teams before you can delete this department.
            </span>
          ) : (
            <span>
              Are you sure you want to delete the department <span className="font-medium text-foreground">"{departmentName}"</span>? This action cannot be undone.
            </span>
          )
        }
        confirmText={teams.length > 0 ? "Close" : "Delete Department"}
        variant={teams.length > 0 ? "warning" : "danger"}
      />

      <ConfirmDialog
        open={showCancelDeptConfirm}
        title="Discard Department Changes?"
        message="Are you sure you want to cancel editing? Any unsaved edits will be discarded."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelDeptConfirm(false);
          handleCancelEdit();
        }}
        onCancel={() => setShowCancelDeptConfirm(false)}
      />
    </RoleGate>
  );
}

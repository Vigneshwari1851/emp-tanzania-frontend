import { useState, useEffect, useMemo } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Plus, Users, Building2,
  Settings, Loader2, MapPin, Eye, Trash2, Pencil,
  Briefcase, Network, ImageOff, User, Sparkles, FileText
} from "lucide-react";
import { OrgSetupGuidedTour } from '../components/OrgSetupGuidedTour';
import { ProgressBar } from '@/features/organization/components/ProgressBar';
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { CompanyOverviewCard } from '@/features/organization/components/CompanyOverviewCard';
import { RoleGate } from '@/features/auth/components/RoleGate';
import { Permission } from '@/shared/types/rbac';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { useCompanyStructure, type DepartmentNode, type TeamNode } from '@/features/organization/hooks/useCompanyStructure';
import { getDepartment, deleteDepartment } from '@/features/organization/services/departments';
import { deleteTeam } from '@/features/organization/services/teams';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { toast } from "sonner";
import { ConfirmationDialog } from '@/shared/components/ui/ConfirmationDialog';
import { getDesignations, type DesignationNode } from '../services/designations';

const getInitials = (name: string) => {
  if (!name || name === "Unassigned") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarBg = (name: string) => {
  if (!name || name === "Unassigned") return "bg-gray-300";
  const colors = [
    "bg-primary",
    "bg-purple-600",
    "bg-primary",
    "bg-pink-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-teal-600"
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

interface NodeActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
}

function NodeActions({ onView, onEdit, onDelete, canEdit }: NodeActionsProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      onClick={e => e.stopPropagation()}
    >
      {onView && (
        <button
          className="p-2 bg-card hover:bg-primary text-primary hover:text-white rounded-sm transition-all shadow-sm border border-border focus:outline-none focus:ring-0 active:outline-none"
          title="View"
          onClick={onView}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      {canEdit && onEdit && (
        <button
          className="p-2 bg-card hover:bg-primary text-primary hover:text-white rounded-sm transition-all shadow-sm border border-border focus:outline-none focus:ring-0 active:outline-none"
          title="Edit"
          onClick={onEdit}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {canEdit && onDelete && (
        <button
          className="p-2 text-red-500 border-red-100 bg-red-50/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-sm transition-all shadow-sm border focus:outline-none focus:ring-0 active:outline-none"
          title="Delete"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface TeamRowProps {
  team: TeamNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function TeamRow({ team, onMouseEnter, onMouseLeave }: TeamRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-3 p-3 bg-muted border border-border rounded-sm hover:bg-primary/95 cursor-pointer transition-colors relative"
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] leading-5 truncate text-foreground">{team.name}</p>
          <p className="text-[12px] leading-4 text-muted-foreground font-medium">Lead: {team.lead}</p>
        </div>
        <div className="flex -space-x-2">
          {team.avatars.length > 0
            ? team.avatars.map((avatar, idx) => (
              <div
                key={idx}
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-[12px] leading-4 text-white font-medium border-2 border-white overflow-hidden shadow-sm"
              >
                {avatar.length > 2 || avatar.includes('/') ? (
                  <img src={getProfilePictureUrl(avatar) || ""} alt="avatar" className="w-full h-full object-cover border-none" />
                ) : avatar}
              </div>
            ))
            : (
              <div className="w-8 h-8 bg-muted rounded-full border-2 border-white flex items-center justify-center">
                <Users className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
        </div>
        <div>
          <span className="ml-auto text-[14px] leading-5 text-gray-600 mr-1 whitespace-nowrap">
            {team.team_employee_count ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DepartmentRowProps {
  dept: DepartmentNode;
  isHovered: boolean;
  canEdit: boolean;
  newlyCreatedId?: string | number | null;
  onToggle: (id: string | number) => void;
  onSelect: (dept: DepartmentNode) => void;
  onMouseEnter: (id: string | number) => void;
  onMouseLeave: () => void;
  onView?: (dept: DepartmentNode) => void;
  onEdit: (dept: DepartmentNode) => void;
  teamHoveredId: string | number | null;
  onTeamHover: (id: string | number | null) => void;
  onTeamView: (team: TeamNode) => void;
  onTeamEdit: (team: TeamNode) => void;
  onDelete: (dept: DepartmentNode) => void;
  onTeamDelete: (team: TeamNode) => void;
}

function DepartmentRow({
  dept, isHovered, canEdit, newlyCreatedId,
  onToggle, onSelect, onMouseEnter, onMouseLeave, onView, onEdit,
  teamHoveredId, onTeamHover, onTeamView, onTeamEdit,
  onDelete, onTeamDelete,
}: DepartmentRowProps) {
  const isNewlyCreated = newlyCreatedId !== undefined && newlyCreatedId !== null && String(dept.id) === String(newlyCreatedId);
  return (
    <div className="space-y-2">
      <div
        data-node-id={dept.id}
        className={`flex items-center gap-2 p-3 bg-card border rounded-sm hover:border-primary-300 cursor-pointer transition-all duration-300 ease-in-out relative ${isNewlyCreated ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/40' : 'border-border'} ${isHovered ? 'pr-20' : 'pr-4'}`}
        onClick={() => { onToggle(dept.id); onSelect(dept); }}
        onMouseEnter={() => onMouseEnter(dept.id)}
        onMouseLeave={onMouseLeave}
      >
        <button
          className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground flex-shrink-0 focus:outline-none transition-colors border-none bg-transparent"
          onClick={e => { e.stopPropagation(); onToggle(dept.id); }}
        >
          {dept.expanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>
        <Users className="w-5 h-5 text-gray-600 flex-shrink-0" />
        <span className="font-medium truncate">{dept.name}</span>
        <span className="text-[14px] leading-5 text-muted-foreground truncate">• {dept.manager}</span>
        
        <div className="flex -space-x-2 ml-auto mr-3">
          {dept.avatars && dept.avatars.length > 0 &&
            dept.avatars.map((avatar, idx) => (
              <div
                key={idx}
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-[12px] leading-4 text-white font-medium border-2 border-white overflow-hidden shadow-sm"
              >
                {avatar.length > 2 || avatar.includes('/') ? (
                  <img src={getProfilePictureUrl(avatar) || ""} alt="avatar" className="w-full h-full object-cover border-none" />
                ) : avatar}
              </div>
            ))
          }
        </div>
        <span className="text-[14px] leading-5 text-gray-600 mr-1 whitespace-nowrap">{dept.headcount} people</span>

        <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          <NodeActions
            canEdit={canEdit}
            onEdit={() => onEdit(dept)}
            onDelete={dept.headcount > 1 ? undefined : () => onDelete(dept)}
          />
        </div>
      </div>

      {dept.expanded && (
        <div className="ml-8 space-y-3">
          {/* Teams */}
          {dept.teams.length > 0 && (
            <div className="space-y-2">
              {dept.teams.map(team => (
                <TeamRow
                  key={team.id}
                  team={team}
                  onMouseEnter={() => onTeamHover(String(team.id))}
                  onMouseLeave={() => onTeamHover(null)}
                />
              ))}
            </div>
          )}

          {/* Sub-departments (Recursive) */}
          {dept.sub_departments && dept.sub_departments.length > 0 && (
            <div className="space-y-3">
              {dept.sub_departments.map(subDept => (
                <DepartmentRow
                  key={subDept.id}
                  dept={subDept}
                  isHovered={false}
                  canEdit={canEdit}
                  newlyCreatedId={newlyCreatedId}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  onView={onView}
                  onEdit={onEdit}
                  teamHoveredId={teamHoveredId}
                  onTeamHover={onTeamHover}
                  onTeamView={onTeamView}
                  onTeamEdit={onTeamEdit}
                  onDelete={onDelete}
                  onTeamDelete={onTeamDelete}
                />
              ))}
            </div>
          )}

          {dept.teams.length === 0 && (!dept.sub_departments || dept.sub_departments.length === 0) && (
            <p className="text-[12px] leading-4 text-muted-foreground italic py-1">No teams or sub-departments</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Org Setup Page
// ─────────────────────────────────────────────────────────────────────────────
export function CompanyStructure() {
  const navigate = useOrgNavigate();
  const { can } = usePermissions();
  const canManageDepts = can(Permission.MANAGE_DEPARTMENTS);

  const {
    departments,
    selectedDept,
    setSelectedDept,
    companyDetails,
    companyName,
    totalEmployees,
    isLoading,
    isSetupView,
    setIsSetupView,
    expandedBranches,
    hoveredNode,
    setHoveredNode,
    toggleDepartment,
    toggleBranch,
    setDepartments,
    refetch,
  } = useCompanyStructure();

  const location = useLocation();
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | number | null>(null);

  useEffect(() => {
    const state = location.state as { createdDeptIds?: number[] } | null;
    if (state?.createdDeptIds?.length) {
      setNewlyCreatedId(state.createdDeptIds[0]);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (newlyCreatedId === null) return;
    const timer = setTimeout(() => setNewlyCreatedId(null), 3000);
    return () => clearTimeout(timer);
  }, [newlyCreatedId]);

  useEffect(() => {
    if (newlyCreatedId === null) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-node-id="${newlyCreatedId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [newlyCreatedId]);

  const completionPercentage = useMemo(() => {
    if (!companyDetails) return 0;
    const filled = (v: string | undefined | null) => typeof v === 'string' && v.trim() !== '';
    const isIndia = companyDetails.country === 'India';
    const mainTaxId = isIndia
      ? companyDetails.pan
      : companyDetails.tin || companyDetails.ein || companyDetails.siret || companyDetails.otherTaxId;

    const checks: { done: boolean; weight: number }[] = [];

    // 1. Legal Entity & Tax Tab
    checks.push({ done: filled(companyDetails.EntityName), weight: 2 });
    checks.push({ done: filled(companyDetails.companyCode), weight: 2 });
    checks.push({ done: filled(companyDetails.companyType), weight: 1 });
    checks.push({ done: filled(companyDetails.legalAddress), weight: 1 });
    checks.push({ done: filled(companyDetails.city), weight: 1 });
    checks.push({ done: filled(companyDetails.state), weight: 1 });
    checks.push({ done: filled(companyDetails.zip), weight: 1 });
    checks.push({ done: filled(companyDetails.country), weight: 1 });
    checks.push({ done: filled(mainTaxId), weight: 2 });
    checks.push({ done: filled(companyDetails.jurisdiction), weight: 1 });
    checks.push({ done: filled(companyDetails.fiscalYearEnd), weight: 1 });

    // 2. Geographical/Location Tab
    const hasLocations = Array.isArray(companyDetails.locations) && companyDetails.locations.length > 0;
    const locationsComplete = hasLocations && companyDetails.locations.every(loc => 
      filled(loc.locationName) && 
      filled(loc.locationCode) && 
      filled(loc.address?.street) && 
      filled(loc.address?.city) && 
      filled(loc.timeZone)
    );
    checks.push({ done: hasLocations, weight: 1 });
    checks.push({ done: locationsComplete, weight: 1 });

    // 3. Organizational Structure Tab
    const hasBusinessUnits = typeof companyDetails.businessUnit === 'string' && companyDetails.businessUnit.trim() !== '';
    const hasDivisions = typeof (companyDetails as any).division === 'string' && (companyDetails as any).division.trim() !== '';
    const hasCostCenters = typeof companyDetails.costCenter === 'string' && companyDetails.costCenter.trim() !== '';
    checks.push({ done: hasBusinessUnits, weight: 1 });
    checks.push({ done: hasDivisions, weight: 1 });
    checks.push({ done: hasCostCenters, weight: 1 });
    checks.push({ done: filled(companyDetails.payrollStatutoryUnit), weight: 1 });
    checks.push({ done: filled(companyDetails.legalEmployer), weight: 1 });
    checks.push({ done: filled(companyDetails.legislativeDataGroup), weight: 1 });

    // 4. Working Calendar & Schedule Tab
    const calendar = companyDetails.workingCalendar;
    if (calendar) {
      checks.push({ done: !!calendar.standardHours, weight: 1 });
      checks.push({ done: Array.isArray(calendar.workingDays) && calendar.workingDays.length > 0, weight: 1 });
      checks.push({ done: filled(calendar.scheduleType), weight: 1 });
      
      if (calendar.scheduleType === "fixed") {
        checks.push({ done: filled(calendar.fixedStartTime) && filled(calendar.fixedEndTime), weight: 2 });
      } else if (calendar.scheduleType === "flexible") {
        checks.push({ done: !!calendar.flexRequiredHours && filled(calendar.flexCoreStartTime) && filled(calendar.flexCoreEndTime), weight: 2 });
      }
    }

    const totalWeight = checks.reduce((sum, item) => sum + item.weight, 0);
    const doneWeight = checks.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
    return totalWeight === 0 ? 0 : Math.min(100, Math.round((doneWeight / totalWeight) * 100));
  }, [companyDetails]);

  const [selectedTeam, setSelectedTeam] = useState<TeamNode | null>(null);
  const [openSidebarSections, setOpenSidebarSections] = useState<Record<string, boolean>>({});
  const [, setIsDetailLoading] = useState(false);

  // Guided Tour state
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const isFirstTimeSetup = isSetupView && !companyDetails;

  // Auto-launch guided tour on first visit (empty state) - disabled
  /*
  useEffect(() => {
    if (isFirstTimeSetup && !localStorage.getItem('org_setup_tour_seen')) {
      const timer = setTimeout(() => setShowGuidedTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeSetup]);
  */

  // Designation Tree View States
  const [currentView, setCurrentView] = useState<"details" | "designations">("details");
  const [designationsList, setDesignationsList] = useState<DesignationNode[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState<DesignationNode | null>(null);
  const [expandedDesignations, setExpandedDesignations] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const data = await getDesignations();
        setDesignationsList(data);
      } catch (err) {
        console.error("Failed to load designations list", err);
      }
    };
    fetchDesignations();
  }, []);

  const toggleDesignation = (id: number) => {
    setExpandedDesignations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderDesignationTreeNode = (node: DesignationNode, depth: number = 0) => {
    const isExpanded = expandedDesignations[node.id];
    const hasChildren = node.sub_designations && node.sub_designations.length > 0;

    return (
      <div key={node.id} className="space-y-2 mt-2">
        {/* Row */}
        <div
          className={`flex items-center gap-3 p-3 bg-card border border-border hover:border-primary-300 rounded-lg cursor-pointer transition-all shadow-sm relative ${selectedDesignation?.id === node.id ? "ring-2 ring-primary border-transparent bg-primary/10/10" : ""
            }`}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => {
            setSelectedDesignation(node);
            setSelectedTeam(null);
            setSelectedDept(null);
          }}
        >
          {depth > 0 && (
            <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-4 h-0.5 bg-slate-200" />
          )}

          {hasChildren ? (
            <button
              className="p-1 hover:bg-muted/50 rounded text-muted-foreground shrink-0 focus:outline-none border-none bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                toggleDesignation(node.id);
              }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6 h-6 shrink-0" />
          )}

          <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold text-[12px] leading-4 shrink-0 shadow-sm border border-primary-100">
            {node.designation_code.slice(0, 3)}
          </div>

          <div className="flex-1 min-w-0">
            <span className="font-semibold text-foreground text-[14px] leading-5 tracking-tight truncate block">
              {node.designation_name}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wide uppercase mt-0.5 block leading-none">
              Code: {node.designation_code}
            </span>
          </div>

          <span className="text-[12px] leading-4 font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary-100 shrink-0 whitespace-nowrap">
            {node.headcount} people
          </span>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="border-l border-border pl-2">
            {node.sub_designations.map(child => renderDesignationTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // New state for confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'department' | 'team' | null;
    data: any;
  }>({ isOpen: false, type: null, data: null });

  const handleTeamView = async (dept: DepartmentNode, team: TeamNode) => {
    try {
      setIsDetailLoading(true);
      const data = await getDepartment(Number(dept.id));

      // Calculate designations in this department
      const designationsMap = new Map<string, { name: string; code: string; count: number }>();
      if (Array.isArray(data.userDetails)) {
        data.userDetails.forEach((ud: any) => {
          if (ud.designation) {
            const desName = ud.designation.designation_name;
            const desCode = ud.designation.designation_code;
            if (designationsMap.has(desCode)) {
              designationsMap.get(desCode)!.count += 1;
            } else {
              designationsMap.set(desCode, { name: desName, code: desCode, count: 1 });
            }
          }
        });
      }
      const departmentDesignations = Array.from(designationsMap.values());

      const mappedDept: DepartmentNode = {
        id: data.id,
        name: data.department_name,
        manager: data.manager?.name ?? data.manager?.username ?? (data.manager_id ? `Manager #${data.manager_id}` : "Unassigned"),
        managerAvatar: data.manager?.avatar ?? null,
        headcount: data.headcount ?? (data.teams?.reduce((acc: number, t: any) => acc + (t.members?.length || 0), 0) || 0),
        avatars: (data.userDetails || [])
          .map((ud: any) => ud.profile_picture || (ud.first_name?.[0] || ud.user?.username?.[0] || "?").toUpperCase())
          .filter(Boolean)
          .slice(0, 3),
        teams: (data.teams || []).map((t: any) => ({
          id: t.id,
          name: t.team_name,
          description: t.description || "",
          lead: t.team_lead?.username ?? "Unassigned",
          members: Array.isArray(t.members) ? t.members : [],
          avatars: t.members?.map((m: any) => m.profile_picture || m.username?.[0]?.toUpperCase()).slice(0, 3) || [],
          team_employee_count: t.team_employee_count ?? (Array.isArray(t.members) ? t.members.length : 0),
        })),
        branch_id: data.branch_id,
        branch_ids: data.branch_ids,
        expanded: dept.expanded,
        designations: departmentDesignations
      };

      setDepartments(prev =>
        prev.map(d => String(d.id) === String(mappedDept.id) ? { ...mappedDept, expanded: d.expanded } : d)
      );

      setSelectedDept(mappedDept);

      const targetTeam = mappedDept.teams.find(t => String(t.id) === String(team.id));
      if (targetTeam) {
        setSelectedTeam(targetTeam);
      } else {
        setSelectedTeam(null);
      }
    } catch (error) {
      console.error("Failed to fetch team details:", error);
      toast.error("Failed to load team details");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleViewDepartment = async (dept: DepartmentNode) => {
    try {
      setIsDetailLoading(true);
      const data = await getDepartment(Number(dept.id));

      // Calculate designations in this department
      const designationsMap = new Map<string, { name: string; code: string; count: number }>();
      if (Array.isArray(data.userDetails)) {
        data.userDetails.forEach((ud: any) => {
          if (ud.designation) {
            const desName = ud.designation.designation_name;
            const desCode = ud.designation.designation_code;
            if (designationsMap.has(desCode)) {
              designationsMap.get(desCode)!.count += 1;
            } else {
              designationsMap.set(desCode, { name: desName, code: desCode, count: 1 });
            }
          }
        });
      }
      const departmentDesignations = Array.from(designationsMap.values());

      const mappedDept: DepartmentNode = {
        id: data.id,
        name: data.department_name,
        manager: data.manager?.name ?? data.manager?.username ?? (data.manager_id ? `Manager #${data.manager_id}` : "Unassigned"),
        managerAvatar: data.manager?.avatar ?? null,
        headcount: data.headcount ?? (data.teams?.reduce((acc: number, t: any) => acc + (t.members?.length || 0), 0) || 0),
        avatars: (data.userDetails || [])
          .map((ud: any) => ud.profile_picture || (ud.first_name?.[0] || ud.user?.username?.[0] || "?").toUpperCase())
          .filter(Boolean)
          .slice(0, 3),
        teams: (data.teams || []).map((t: any) => ({
          id: t.id,
          name: t.team_name,
          description: t.description || "",
          lead: t.team_lead?.username ?? "Unassigned",
          members: Array.isArray(t.members) ? t.members : [],
          avatars: t.members?.map((m: any) => m.profile_picture || m.username?.[0]?.toUpperCase()).slice(0, 3) || [],
          team_employee_count: t.team_employee_count ?? (Array.isArray(t.members) ? t.members.length : 0),
        })),
        branch_id: data.branch_id,
        branch_ids: data.branch_ids,
        expanded: dept.expanded,
        designations: departmentDesignations
      };

      setDepartments(prev =>
        prev.map(d => String(d.id) === String(mappedDept.id) ? { ...mappedDept, expanded: d.expanded } : d)
      );

      setSelectedDept(mappedDept);
      setSelectedTeam(null);
    } catch (error) {
      console.error("Failed to fetch department details:", error);
      toast.error("Failed to load department details");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleTeamEdit = (dept: DepartmentNode, team: TeamNode) => {
    if (!canManageDepts) {
      toast.error("You do not have permission to edit teams");
      return;
    }
    navigate(`/org-setup/edit-department/${dept.id}?teamId=${team.id}`);
  };

  const handleDeptEdit = (dept: DepartmentNode) => {
    if (!canManageDepts) {
      toast.error("You do not have permission to edit departments");
      return;
    }
    navigate(`/org-setup/edit-department/${dept.id}`);
  };


  // Team hover needs a simpler local key: use a stable string match to avoid number/string mismatch
  const teamHoveredId = hoveredNode?.type === "team" ? String(hoveredNode.id) : null;

  // Modified delete handlers to use custom modal
  const handleDeptDelete = (dept: DepartmentNode) => {
    setConfirmModal({
      isOpen: true,
      type: 'department',
      data: dept
    });
  };

  const handleTeamDelete = (team: TeamNode) => {
    setConfirmModal({
      isOpen: true,
      type: 'team',
      data: team
    });
  };

  const executeDelete = async () => {
    const { type, data } = confirmModal;
    if (!type || !data) return;

    try {
      if (type === 'department') {
        const dept = data as DepartmentNode;
        await deleteDepartment(Number(dept.id));
        toast.success("Department deleted successfully");
        if (selectedDept?.id === dept.id) setSelectedDept(null);
      } else {
        const team = data as TeamNode;
        await deleteTeam(Number(team.id));
        toast.success("Team deleted successfully");
        if (selectedTeam?.id === team.id) setSelectedTeam(null);
      }
      refetch();
    } catch (err: any) {
      toast.error(err.message || `Failed to delete ${type}`);
    } finally {
      setConfirmModal({ isOpen: false, type: null, data: null });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Guided Tour ── */}
      <OrgSetupGuidedTour
        isOpen={showGuidedTour}
        onClose={() => {
          setShowGuidedTour(false);
          localStorage.setItem('org_setup_tour_seen', 'true');
        }}
        isFirstTime={isFirstTimeSetup}
      />

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Org Setup
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Manage organizational hierarchy and departments
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {companyDetails || !isSetupView ? (
            <div className="hidden sm:flex items-center gap-3">
              <ProgressBar percentage={completionPercentage} />
            </div>
          ) : null}

          {/* View toggle */}
          {!companyDetails && (
            <div className="flex items-center p-1 bg-muted rounded-sm border border-border shadow-sm w-full sm:w-auto overflow-x-auto">
              {[
                { label: "Setup View", active: isSetupView, onClick: () => setIsSetupView(true) },
                { label: "Details View", active: !isSetupView, onClick: () => setIsSetupView(false) },
              ].map(btn => (
                <Button
                  key={btn.label}
                  variant="ghost"
                  onClick={btn.onClick}
                  className={`px-4 h-10 text-[12px] leading-4 font-bold rounded-sm transition-all duration-200 border-none ${btn.active
                    ? "bg-card text-primary shadow-sm ring-1 ring-gray-200"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/95/50"
                    }`}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          )}

          {(companyDetails || !isSetupView) && (
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="sm:hidden w-full">
                <ProgressBar percentage={completionPercentage} />
              </div>
              {/* <Button
                variant="outline"
                className="h-10 bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700 font-bold px-4"
                onClick={() => setShowGuidedTour(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Guided Tour
              </Button> */}
              <RoleGate permissions={[Permission.MANAGE_SYSTEM_SETTINGS]}>
                <Button
                  variant="outline"
                  className="h-10 bg-card border-border hover:bg-muted text-foreground font-bold px-4"
                  onClick={() => navigate("/org-setup/settings?edit=true")}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </RoleGate>
            </div>
          )}
        </div>
      </div>

      {/* ── Setup (Empty State) ──────────────────────────────────── */}
      {isSetupView ? (
        <Card className="border-dashed border-gray-300 shadow-sm mt-8">
          <CardContent className="flex flex-col items-center justify-center text-center py-24">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-[20px] font-semibold leading-7 text-foreground mb-3">No Org Setup Defined</h2>
            <p className="text-muted-foreground max-w-lg mb-8 text-[14px] leading-5">
              Set up your organization with legal, organizational, geographical, and HR/payroll
              information to get started.
            </p>
            <Button
              onClick={() => navigate("/org-setup/settings")}
              className="bg-primary hover:opacity-90 text-white px-8 h-10 rounded-sm shadow-sm gap-2 font-bold border-none"
            >
              <Plus className="w-4 h-4" />
              Setup Org Structure
            </Button>
          </CardContent>
        </Card>

      ) : (
        <>
          {/* ── Overview Card ─────────────────────────────────────── */}
          <CompanyOverviewCard companyData={companyDetails} totalEmployees={totalEmployees} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Right Sidebar ─────────────────────────────────────── */}
            <div className="space-y-6 order-2">
              {/* Company Details */}
              <div className="space-y-6 bg-card p-5 rounded-lg border border-border shadow-sm">
                <div className="space-y-8">
                  {/* ── General Info Section ────────────────────────────── */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <h3 className="text-base font-medium text-foreground">General info</h3>
                      </div>
                    </div>

                    {/* Combined Entity & Code */}
                    <div className="bg-muted/50/50 space-y-4 rounded-lg p-5">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Legal entity</label>
                        <p className="text-[14px] leading-5 font-normal text-foreground mt-1 leading-tight">
                          {companyDetails?.EntityName}
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Code</label>
                        <p className="text-[14px] leading-5 font-normal text-foreground mt-1 leading-tight">
                          {companyDetails?.companyCode}
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Legal Address</label>
                        <p className="text-[14px] leading-5 font-normal text-foreground mt-1 leading-[1.8]">
                          {companyDetails?.legalAddress} {companyDetails?.city}, {companyDetails?.state} {companyDetails?.zip} {companyDetails?.country}
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Company logo</label>
                        <div className="bg-muted/50/50 rounded-lg p-5 flex items-center justify-start min-h-[100px]">
                          {companyDetails?.logoUrl ? (
                            <div className="animate-in fade-in zoom-in duration-700">
                              <img
                                src={companyDetails.logoUrl}
                                alt="Company Logo"
                                className="h-12 w-auto max-w-[180px] object-contain transition-all duration-500 rounded"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5 py-2 opacity-50">
                              <ImageOff className="w-6 h-6 text-muted-foreground" />
                              <span className="text-[11px] font-medium text-slate-600">No Logo Available</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTeam && selectedDept && (
                <Card className="border-border shadow-sm bg-card rounded-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium text-foreground">Team details</CardTitle>
                    {canManageDepts && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleTeamEdit(selectedDept, selectedTeam)}
                      >
                        <Pencil className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">Team name</label>
                      <p className="font-medium text-foreground mt-1">{selectedTeam.name}</p>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">Team lead</label>
                      <p className="font-medium text-foreground mt-1">{selectedTeam.lead}</p>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">Team members</label>
                      {Array.isArray(selectedTeam.members) && selectedTeam.members.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {selectedTeam.members.map((m: any) => (
                            <div
                              key={m.id || m.user_id}
                              className="flex items-center gap-2.5 p-2 bg-card border border-border rounded-lg shadow-sm"
                            >
                              {m.profile_picture ? (
                                <img
                                  src={getProfilePictureUrl(m.profile_picture) || ""}
                                  alt={m.username}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">
                                  {m.username?.[0]?.toUpperCase() || "?"}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-medium text-foreground truncate tracking-tight">
                                  {m.first_name ? `${m.first_name} ${m.last_name || ""}` : m.username}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5 opacity-70">
                                  {m.job_role || "Employee"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] leading-4 text-muted-foreground italic mt-2">No members assigned</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedDept && !selectedTeam && (
                <Card className="border-border shadow-sm bg-card rounded-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50 dark:border-transparent">
                    <CardTitle className="text-base font-semibold text-foreground">Department Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-5 pb-6">
                    <div className="space-y-1">
                      <label className="text-[12px] leading-4 font-semibold text-muted-foreground uppercase tracking-wider">Department Name</label>
                      <p className="text-[16px] font-bold text-foreground">{selectedDept.name}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] leading-4 font-semibold text-muted-foreground uppercase tracking-wider">Department Manager</label>
                      <div className="flex items-center gap-3 mt-1">
                        {selectedDept.manager === "Unassigned" ? (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground shadow-sm border border-border">
                            <User className="w-5 h-5" />
                          </div>
                        ) : selectedDept.managerAvatar ? (
                          <img
                            src={getProfilePictureUrl(selectedDept.managerAvatar) || ""}
                            alt={selectedDept.manager}
                            className="w-10 h-10 rounded-full object-cover shadow-sm transition-all duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] leading-5 shadow-sm transition-all duration-300 hover:scale-105 ${getAvatarBg(selectedDept.manager)}`}>
                            {getInitials(selectedDept.manager)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-[14px] leading-5">{selectedDept.manager}</span>
                          <span className="text-[12px] leading-4 text-muted-foreground font-medium">Manager</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[12px] leading-4 font-semibold text-muted-foreground uppercase tracking-wider">Total Headcount</label>
                      <p className="text-3xl font-extrabold text-foreground mt-1">{selectedDept.headcount}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[12px] leading-4 font-semibold text-muted-foreground uppercase tracking-wider">Teams</label>
                      {selectedDept.teams && selectedDept.teams.length > 0 ? (
                        <div className="space-y-2 mt-1">
                          {selectedDept.teams.map((team: any) => (
                            <div
                              key={team.id}
                              className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
                            >
                              <span className="text-[14px] leading-5 font-semibold text-foreground">{team.name}</span>
                              <span className="text-[14px] leading-5 font-bold text-muted-foreground">{team.team_employee_count ?? 0}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] leading-4 text-muted-foreground italic mt-1 pl-1">No teams configured</p>
                      )}
                    </div>

                    {canManageDepts && (
                      <div className="space-y-3 pt-6 border-t border-border mt-6">
                        <Button
                          variant="outline"
                          className="w-full h-11 font-bold border-border text-foreground hover:bg-muted transition-all rounded-lg text-[12px] leading-4"
                          onClick={() => navigate(`/org-setup/edit-department/${selectedDept.id}?addTeam=true`)}
                        >
                          Add Team
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-11 font-bold border-border text-foreground hover:bg-muted transition-all rounded-lg text-[12px] leading-4"
                          onClick={() => handleDeptEdit(selectedDept)}
                        >
                          Edit Department
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentView === "designations" && selectedDesignation && (
                <Card className="border-border shadow-sm bg-card rounded-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium text-foreground">Position Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div>
                      <label className="text-[11px] font-medium text-gray-450">Role Name</label>
                      <p className="font-semibold text-foreground mt-1">{selectedDesignation.designation_name}</p>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-gray-455">Role Code</label>
                      <p className="font-medium text-primary mt-1">{selectedDesignation.designation_code}</p>
                    </div>

                    {selectedDesignation.description && (
                      <div>
                        <label className="text-[11px] font-medium text-gray-450">Description</label>
                        <p className="text-[12px] leading-4 text-gray-600 mt-1 leading-relaxed">{selectedDesignation.description}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-medium text-gray-450">Assigned Employees ({selectedDesignation.headcount})</label>
                      {selectedDesignation.headcount > 0 ? (
                        <div className="mt-3 space-y-2">
                          {(selectedDesignation as any).userDetails?.map((m: any) => (
                            <div
                              key={m.user_id}
                              className="flex items-center gap-2.5 p-2 bg-card border border-border rounded-lg shadow-sm"
                            >
                              {m.profile_picture ? (
                                <img
                                  src={getProfilePictureUrl(m.profile_picture) || ""}
                                  alt={m.first_name || m.username}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">
                                  {(m.first_name?.[0] || m.username?.[0] || "?").toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-medium text-foreground truncate tracking-tight">
                                  {m.first_name ? `${m.first_name} ${m.last_name || ""}` : `Employee #${m.user_id}`}
                                </span>
                                {m.department?.department_name && (
                                  <span className="text-[9px] text-primary font-bold leading-none mt-0.5 opacity-80">
                                    {m.department.department_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] leading-4 text-muted-foreground italic mt-2">No employees currently assigned to this role</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

          {/* ── Hierarchy Tree ────────────────────────────────────── */}
          <div className="lg:col-span-2 order-1">
            <Card className="shadow-sm border-border">
              <CardHeader className="px-6">
                <CardTitle className="text-[16px] font-medium leading-6">Organization Hierarchy</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                <div className="space-y-4">
                  {/* Company root node */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-primary/10 rounded-sm border border-primary/20">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground text-[16px] truncate block">
                        {companyName || companyDetails?.EntityName}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[12px] leading-4 font-medium text-primary">
                        <span>Code: {companyDetails?.companyCode}</span>
                        {companyDetails?.companyType && <span>• {companyDetails.companyType}</span>}
                        {companyDetails?.currency && <span>• {companyDetails.currency}</span>}
                      </div>
                    </div>
                    <span className="text-[14px] leading-5 text-primary font-medium sm:ml-auto whitespace-nowrap mt-2 sm:mt-0">
                      {totalEmployees.toLocaleString()} employees
                    </span>
                  </div>

                  {/* Branch → Department → Team tree */}
                  <div className="ml-8 space-y-3">
                    {(companyDetails?.locations ?? []).map((branch, index) => {
                      const isExpanded = expandedBranches[branch.id];

                      return (
                        <div key={branch.id} className="space-y-2">
                          {/* Branch row */}
                          <div
                            className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 bg-muted/50 border border-border rounded-sm hover:border-primary/30 cursor-pointer transition-colors relative"
                            onClick={() => toggleBranch(branch.id)}
                            onMouseEnter={() => setHoveredNode({ type: "branch", id: branch.id })}
                            onMouseLeave={() => setHoveredNode(null)}
                          >
                            <button
                              className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground flex-shrink-0 transition-colors focus:outline-none border-none bg-transparent"
                              onClick={e => { e.stopPropagation(); toggleBranch(branch.id); }}
                            >
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                            <span className="font-semibold text-foreground text-[14px] leading-5 truncate flex-1 min-w-[100px]">
                              {branch.locationName ?? branch.locationCode}
                            </span>
                            <span className={`text-[10px] font-medium tracking-tight py-0.5 px-1.5 rounded flex-shrink-0 ${index === 0
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-muted text-muted-foreground border border-border"
                              }`}>
                              {index === 0 ? "Headquarters" : "Branch"}
                            </span>
                            <span className="w-full sm:w-auto text-[14px] leading-5 text-gray-600 sm:ml-auto whitespace-nowrap mt-2 sm:mt-0 pl-7 sm:pl-0">
                              {branch.branch_employee_count ?? 0} people
                            </span>
                          </div>

                          {/* Departments under branch */}
                          {isExpanded && (
                            <div className="ml-6 space-y-3">
                              {branch.departments && branch.departments.length > 0 ? branch.departments.map(dept => (
                                <DepartmentRow
                                  key={dept.id}
                                  dept={dept}
                                  newlyCreatedId={newlyCreatedId}
                                  isHovered={hoveredNode?.type === "department" && String(hoveredNode.id) === String(dept.id)}
                                  canEdit={canManageDepts}
                                  onToggle={toggleDepartment}
                                  onSelect={handleViewDepartment}
                                  onView={(d) => navigate(`/org-setup/department/${d.id}`)}
                                  onMouseEnter={(id) => setHoveredNode({ type: "department", id: String(id) })}
                                  onMouseLeave={() => setHoveredNode(null)}
                                  onEdit={handleDeptEdit}
                                  teamHoveredId={teamHoveredId}
                                  onTeamHover={id => setHoveredNode(id ? { type: "team", id: String(id) } : null)}
                                  onTeamView={team => handleTeamView(dept, team)}
                                  onTeamEdit={team => handleTeamEdit(dept, team)}
                                  onDelete={handleDeptDelete}
                                  onTeamDelete={team => handleTeamDelete(team)}
                                />
                              )) : (
                                <p className="text-[12px] leading-4 text-muted-foreground italic py-2">
                                  No departments assigned to this branch
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Structural & Analytics Section ──────────────────────── */}
            <div className="mt-6 grid grid-cols-1 gap-6">

              {/* Department analytics card */}
              <Card className="shadow-sm border-border bg-card overflow-hidden ring-1 ring-gray-200/50 dark:ring-transparent">
                <CardHeader className="px-6 py-3 border-b border-gray-50 dark:border-transparent bg-muted/20">
                  <CardTitle className="text-[14px] font-medium text-foreground flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10/80 rounded-sm">
                      <Users className="w-4 h-4 text-primary/70" />
                    </div>
                    Department analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="">
                  <div className="space-y-5">
                    {departments.map(dept => (
                      <div key={dept.id} className="group">
                        <div className="flex items-center justify-between text-[12px] leading-4 font-medium mb-3">
                          <span className="text-slate-600 text-[12px] group-hover:text-white transition-colors">{dept.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-medium">{dept.headcount}</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden ring-1 ring-slate-200/20">
                          <div
                            className="bg-primary/95/80 h-1.5 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((dept.headcount / (totalEmployees || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {departments.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Users className="w-8 h-8 text-slate-200 mb-3" />
                        <p className="text-muted-foreground text-[14px] leading-5 font-medium italic">No department data reported</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    )}

    {/* Confirmation Dialog Component */}
    <ConfirmationDialog
      isOpen={confirmModal.isOpen}
      onClose={() => setConfirmModal({ isOpen: false, type: null, data: null })}
      onConfirm={executeDelete}
      title="Are you sure?"
      description={
        confirmModal.type === 'department'
          ? `Do you really want to delete the department "${confirmModal.data?.name}"? This process will also delete all its teams and cannot be undone.`
          : `Do you really want to delete the team "${confirmModal.data?.name}"? This process cannot be undone.`
      }
      confirmText="Delete"
      cancelText="Cancel"
    />
  </div>
);
}



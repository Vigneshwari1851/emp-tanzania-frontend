import React from "react";
import { ArrowLeft, Save, Plus, Users, ChevronDown, Check, Pencil, Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import Select from "@/shared/components/ui/Select";
import { DesignationSettingsForm } from './DesignationSettingsForm';
import type { PendingDesignation } from './DesignationSettingsForm';

interface DepartmentFormDetailProps {
  isDeptView: boolean;
  isEditMode: boolean;
  isSaving: boolean;
  departmentId?: number;
  departmentName: string;
  setDepartmentName: (val: string) => void;
  departmentCode: string;
  setDepartmentCode: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  selectedBranchIds: string[];
  setSelectedBranchIds: (val: string[]) => void;
  parentDepartment: string | number;
  setParentDepartment: (val: string | number) => void;
  budget: string;
  setBudget: (val: string) => void;
  costCenter?: string;
  setCostCenter?: (val: string) => void;
  availableCostCenters?: string[];
  teams: any[];
  organizationName: string;
  branches: any[];
  filteredDepartments: any[];
  handleDeptUpdate: () => void;
  handleCancelEdit: () => void;
  handleAddTeam: () => void;
  handleTeamView: (team: any) => void;
  navigate: any;
  location: any;
  isFormValid: boolean;
  setIsDeptView: (val: boolean) => void;
  handlePendingDesignationsChange?: (items: PendingDesignation[]) => void;
}

const DepartmentFormDetail: React.FC<DepartmentFormDetailProps> = ({
  isDeptView,
  isEditMode,
  isSaving,
  departmentId,
  departmentName,
  setDepartmentName,
  departmentCode,
  setDepartmentCode,
  description,
  setDescription,
  selectedBranchIds,
  setSelectedBranchIds,
  parentDepartment,
  setParentDepartment,
  budget,
  setBudget,
  costCenter = "",
  setCostCenter,
  availableCostCenters = [],
  teams,
  branches,
  filteredDepartments,
  handleDeptUpdate,
  handleCancelEdit,
  handleAddTeam,
  handleTeamView,
  navigate,
  location,
  isFormValid,
  setIsDeptView,
  handlePendingDesignationsChange,
}) => {
  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/org-setup/settings")}
            className="p-1.5 hover:bg-primary/10/50 rounded-lg transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </button>
          <div>
            <h1 className="text-[24px] font-semibold text-foreground">
              {isDeptView ? departmentName : isEditMode ? "Edit Department" : "Add New Department"}
            </h1>
            <p className="text-[14px] leading-5 text-muted-foreground mt-1">
              {isDeptView
                ? departmentCode
                : isEditMode
                  ? "Update department information"
                  : "Create a new department in your organization"
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={isDeptView ? () => navigate("/org-setup/settings") : handleCancelEdit}
            disabled={isSaving}
            className="h-10 px-6"
          >
            {isDeptView ? "Close" : "Cancel"}
          </Button>



          {isDeptView ? (
            <Button
              className="h-10 gap-2 font-bold bg-primary hover:bg-primary/95"
              onClick={() => {
                setIsDeptView(false);
                navigate(location.pathname, { replace: true });
              }}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          ) : (
            <Button
              className={`h-10 gap-2 font-bold ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleDeptUpdate}
              disabled={isSaving || !isFormValid}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : (isEditMode ? "Update" : "Save")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[14px] leading-5 font-medium text-foreground">Department Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(capitalizeFirstLetter(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary outline-none text-[14px] leading-5 bg-card text-foreground disabled:bg-muted disabled:text-muted-foreground"
                    placeholder="e.g. Engineering"
                    disabled={isDeptView}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] leading-5 font-medium text-foreground">Department Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={departmentCode}
                    onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary outline-none text-[14px] leading-5 bg-card text-foreground disabled:bg-muted disabled:text-muted-foreground"
                    placeholder="e.g. ENG-001"
                    disabled={isDeptView}
                  />
                </div>

                <div className="space-y-1">
                  <Select
                    value={String(parentDepartment)}
                    onChange={(val) => setParentDepartment(val)}
                    label="Parent Department"
                    placeholder="None (Root Department)"
                    disabled={isDeptView}
                    options={[
                      { value: "None", label: "None (Root Department)" },
                      ...filteredDepartments.map((dept) => ({
                        value: String(dept.id),
                        label: dept.department_name,
                      })),
                    ]}
                  />
                  {!isDeptView && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Select <strong>None (Root Department)</strong> if this department reports directly to the <strong>CEO / Managing Director</strong>.
                    </p>
                  )}
                </div>
                 <div className="space-y-2">
                   <label className="text-[14px] leading-5 font-medium text-foreground">Annual Budget</label>
                   <div className="relative">
                     <span className="absolute left-3 top-2 text-muted-foreground text-[14px] leading-5 font-bold">$</span>
                     <input
                       type="number"
                       value={budget}
                       onChange={(e) => setBudget(e.target.value)}
                       className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary outline-none text-[14px] leading-5 bg-card text-foreground disabled:bg-muted disabled:text-muted-foreground"
                       placeholder="0.00"
                       disabled={isDeptView}
                     />
                   </div>
                 </div>

                   <Select
                     value={costCenter || ""}
                     onChange={(val) => setCostCenter?.(val)}
                     label="Cost Centre"
                     placeholder="None (Select Cost Centre)"
                     disabled={isDeptView}
                     options={availableCostCenters.map((cc) => ({
                       value: cc,
                       label: cc,
                     }))}
                   />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[14px] leading-5 font-medium text-foreground">Branches <span className="text-red-500">*</span></label>
                    {!isDeptView && selectedBranchIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedBranchIds([])}
                        className="text-[8px] font-bold text-red-500 hover:text-red-600 tracking-tighter"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <div className={`min-h-10 w-full px-3 py-1.5 border border-gray-300 dark:border-border rounded-sm focus-within:ring-2 focus-within:ring-primary outline-none bg-card flex flex-wrap gap-2 items-center transition-all ${isDeptView ? 'bg-muted' : 'cursor-pointer'}`}>
                      {selectedBranchIds.length > 0 ? (
                        selectedBranchIds.map(id => {
                          const branch = branches.find(b => String(b.id) === String(id));
                          return (
                            <div key={id} className="bg-primary/10 text-primary px-2 py-1 rounded-sm text-[12px] leading-4 font-semibold flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                              {branch?.branch_name || "Unknown"}
                              {!isDeptView && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBranchIds(selectedBranchIds.filter(bid => bid !== id));
                                  }}
                                  className="hover:text-primary-900 focus:outline-none"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground text-[14px] leading-5 italic">Select one or more branches...</span>
                      )}
                      {!isDeptView && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                    </div>

                    {!isDeptView && (
                      <div className="absolute top-[calc(100%-4px)] left-0 right-0 pt-2 z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200">
                        <div className="bg-card border border-border rounded-sm shadow-sm max-h-72 overflow-hidden flex flex-col">
                          <div
                            className="p-3 text-[14px] leading-5 cursor-pointer hover:bg-muted flex items-center gap-3 border-b border-border bg-muted/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedBranchIds.length === branches.length) {
                                setSelectedBranchIds([]);
                              } else {
                                setSelectedBranchIds(branches.map(b => String(b.id)));
                              }
                            }}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBranchIds.length === branches.length ? 'bg-primary border-primary' : 'bg-card border-gray-300 dark:border-border'}`}>
                              {selectedBranchIds.length === branches.length && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                            </div>
                            <span className="font-bold text-foreground">Select All Branches</span>
                          </div>

                          <div className="overflow-y-auto">
                            {branches.map((branch) => {
                              const isSelected = selectedBranchIds.includes(String(branch.id));
                              return (
                                <div
                                  key={branch.id}
                                  className={`p-3 text-[14px] leading-5 cursor-pointer hover:bg-muted flex items-center gap-3 transition-colors ${isSelected ? 'bg-primary/10/20' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isSelected) {
                                      setSelectedBranchIds(selectedBranchIds.filter(id => id !== String(branch.id)));
                                    } else {
                                      setSelectedBranchIds([...selectedBranchIds, String(branch.id)]);
                                    }
                                  }}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'bg-card border-gray-300 dark:border-border'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                  </div>
                                  <span className={`transition-colors ${isSelected ? 'text-primary font-bold' : 'text-gray-600 font-medium'}`}>
                                    {branch.branch_name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          {branches.length === 0 && (
                            <div className="p-6 text-center text-muted-foreground text-[12px] leading-4 italic">No branches available</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[14px] leading-5 font-medium text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(capitalizeFirstLetter(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary outline-none text-[14px] leading-5 min-h-[100px] bg-card text-foreground disabled:bg-muted disabled:text-muted-foreground"
                  placeholder="Describe the department's purpose..."
                  disabled={isDeptView}
                />
              </div>
            </CardContent>
          </Card>



          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Teams</CardTitle>
              {!isDeptView && (
                <Button variant="outline" size="sm" className="h-9 gap-2 font-bold" onClick={handleAddTeam}>
                  <Plus className="w-4 h-4" />
                  Add Team
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-sm">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">No teams added yet</p>
                  <p className="text-[14px] leading-5 text-muted-foreground mb-4">Teams help organize employees within departments</p>
                  {!isDeptView && <Button size="sm" className="h-10" onClick={handleAddTeam}>Add First Team</Button>}
                </div>
              ) : (
                <div className="space-y-1">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="p-4 bg-muted rounded-sm border border-border cursor-pointer hover:border-primary-300 transition-colors"
                      onClick={() => handleTeamView(team)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-[12px] font-medium text-foreground">{team.name}</h4>
                          <p className="text-[14px] leading-5 text-muted-foreground mt-1">{team.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[14px] leading-5 mt-3 pt-1 border-t border-border">
                        <span className="text-gray-600">Team Lead: <span className="font-medium text-foreground">{team.lead || "Not assigned"}</span></span>
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {team.avatars && team.avatars.length > 0 ? (
                              <>
                                {team.avatars.slice(0, 8).map((avatar: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-medium border-2 border-white overflow-hidden shadow-sm"
                                  >
                                    {avatar.length > 2 || avatar.includes('/') ? (
                                      <img src={getProfilePictureUrl(avatar) || ""} alt="avatar" className="w-full h-full object-cover border-none" />
                                    ) : avatar}
                                  </div>
                                ))}
                                {team.avatars.length > 8 && (
                                  <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center text-[10px] text-gray-600 font-medium border-2 border-white shadow-sm">
                                    +{team.avatars.length - 8}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-7 h-7 bg-muted rounded-full border-2 border-white flex items-center justify-center">
                                <Users className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold border border-primary-100 shadow-sm">
                            <Users className="w-3 h-3" />
                            {team.membersCount || 0} Members
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Designations ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Designations</CardTitle>
              <p className="text-[12px] leading-4 text-muted-foreground mt-0.5">Role titles defined here</p>
            </CardHeader>
            <CardContent>
              <DesignationSettingsForm
                isReadOnly={isDeptView}
                departmentId={departmentId}
                onPendingChange={handlePendingDesignationsChange}
                hideSidebar={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Department Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-[14px] leading-5 text-gray-600">Total Teams</span>
                  <span className="font-medium">{teams.length}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[14px] leading-5 text-gray-600">Annual Budget</span>
                  <span className="font-medium">{budget ? `$${budget}` : "Not set"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-[14px] leading-5 text-gray-600">
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>Choose a clear, descriptive name for the department</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>Assign an experienced manager to lead the department</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>Organize employees into teams based on function or project</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>Set realistic budget allocations for department operations</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>Use cost centers to track departmental expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] leading-5 text-gray-600">Form Completion</span>
                  <span className="text-[14px] leading-5 font-semibold text-primary">
                    {Math.round(
                      ((departmentName ? 1 : 0) +
                        (departmentCode ? 1 : 0) +
                        (teams.length > 0 ? 1 : 0)) / 3 * 100
                    )}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.round(
                        ((departmentName ? 1 : 0) +
                          (departmentCode ? 1 : 0) +
                          (teams.length > 0 ? 1 : 0)) / 3 * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 font-normal">
                  Saving updates all departmental hierarchy and team associations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DepartmentFormDetail;


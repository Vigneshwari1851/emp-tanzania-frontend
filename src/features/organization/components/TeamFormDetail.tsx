import React from "react";
import { ArrowLeft, Save, Trash2, Search, Loader2, Pencil, ChevronDown, Check, User } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { capitalizeFirstLetter, formatDisplayRole } from '@/shared/utils/stringUtils';

interface TeamFormDetailProps {
  isTeamView: boolean;
  isTeamEdit: boolean;
  isSavingTeam: boolean;
  teamName: string;
  setTeamName: (val: string) => void;
  teamDescription: string;
  setTeamDescription: (val: string) => void;
  teamLead: any | null;
  setTeamLead: (val: any | null) => void;
  showTeamLeadSearch: boolean;
  setShowTeamLeadSearch: (val: boolean) => void;
  leadSearchQuery: string;
  setLeadSearchQuery: (val: string) => void;
  filteredLeads: any[];
  handleTeamUpdate: (e: React.FormEvent) => void;
  handleCloseTeamPage: () => void;
  handleCancelEdit: () => void;
  setShowDeleteTeamDialog: (val: boolean) => void;
  selectedTeam: any | null;
  setIsTeamView: (val: boolean) => void;
  setIsTeamEdit: (val: boolean) => void;
  navigate: any;
  location: any;
  teamLeadSearchRef: React.RefObject<HTMLDivElement | null>;
  departmentName: string;
}

const TeamFormDetail: React.FC<TeamFormDetailProps> = ({
  isTeamView,
  isTeamEdit,
  isSavingTeam,
  teamName,
  setTeamName,
  teamDescription,
  setTeamDescription,
  teamLead,
  setTeamLead,
  showTeamLeadSearch,
  setShowTeamLeadSearch,
  leadSearchQuery,
  setLeadSearchQuery,
  filteredLeads,
  handleTeamUpdate,
  handleCloseTeamPage,
  handleCancelEdit,
  setShowDeleteTeamDialog,
  selectedTeam,
  setIsTeamView,
  setIsTeamEdit,
  navigate,
  location,
  teamLeadSearchRef,
  departmentName
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Team Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={isTeamView ? handleCloseTeamPage : handleCancelEdit}
            className="p-1.5 hover:bg-primary/10/50 rounded-lg transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </button>
          <div>
            <h1 className="text-[24px] font-semibold text-foreground">
              {isTeamView ? teamName || "Team Details" : isTeamEdit ? "Update Team" : "Add New Team"}
            </h1>
            <p className="text-[14px] leading-5 text-muted-foreground mt-1">
              {isTeamView 
                ? "Review team leadership and functional structure" 
                : isTeamEdit 
                  ? "Modify unit composition and responsibilities" 
                  : "Create a new functional unit within this department"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isTeamView && isTeamEdit && selectedTeam && (selectedTeam.members?.length || 0) === 0 && (
            <Button
              variant="danger-outline"
              onClick={() => setShowDeleteTeamDialog(true)}
              className="h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 mr-2 font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={isTeamView ? handleCloseTeamPage : handleCancelEdit}
            disabled={isSavingTeam}
            className="h-10 gap-2 mr-2 font-medium"
          >
            {isTeamView ? "Close" : "Cancel"}
          </Button>
          {isTeamView ? (
            <Button
              className="h-10 gap-2 font-medium px-6 bg-primary hover:bg-primary/95"
              onClick={() => {
                setIsTeamView(false);
                setIsTeamEdit(true);
                if (location.search.includes("view=true")) {
                  const params = new URLSearchParams(location.search);
                  params.delete("view");
                  const newSearch = params.toString();
                  navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ""}`, { replace: true });
                }
              }}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          ) : (
            <Button
              className="h-10 gap-2 font-medium px-6"
              onClick={handleTeamUpdate}
              disabled={isSavingTeam || !teamName}
            >
              {isSavingTeam ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSavingTeam ? "Saving..." : (isTeamEdit ? "Update" : "Save")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <label className="text-[14px] leading-5 font-medium text-foreground">
                        Team Name <span className="text-red-500">*</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(capitalizeFirstLetter(e.target.value))}
                      placeholder="e.g., Frontend Development"
                      className="w-full px-3 h-10 border border-gray-300 dark:border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground text-[14px] leading-5 bg-card text-foreground"
                      required
                      disabled={isTeamView}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <label className="text-[14px] leading-5 font-medium text-foreground">
                        Team Lead
                      </label>
                    </div>
                    <div className="relative" ref={teamLeadSearchRef}>
                      <div 
                        onClick={() => !isTeamView && setShowTeamLeadSearch(!showTeamLeadSearch)}
                        className={`w-full px-3 h-10 border border-border rounded-sm flex items-center justify-between transition-all ${isTeamView ? 'bg-muted border-border' : 'cursor-pointer focus-within:ring-2 focus-within:ring-primary bg-card hover:border-primary-300 shadow-sm'}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {teamLead ? (
                            <>
                              <User className="w-4 h-4 text-primary-500 shrink-0" />
                              <span className="text-[14px] leading-5 text-foreground font-normal truncate">
                                {teamLead.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-[14px] leading-5 text-muted-foreground font-normal">Select Team Lead</span>
                          )}
                        </div>
                        {!isTeamView && <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showTeamLeadSearch ? 'rotate-180' : ''}`} />}
                      </div>

                      {showTeamLeadSearch && !isTeamView && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-lg shadow-sm z-[70] max-h-80 overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-300 ring-1 ring-black/5">
                          <div className="p-3 border-b border-border bg-muted/50 sticky top-0">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input
                                type="text"
                                value={leadSearchQuery}
                                onChange={(e) => setLeadSearchQuery(e.target.value)}
                                placeholder="Search employees..."
                                className="w-full pl-10 pr-3 h-10 text-[14px] leading-5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card shadow-inner"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto custom-scrollbar py-1">
                            {filteredLeads.map((emp) => (
                              <div
                                key={emp.id}
                                onClick={() => {
                                  setTeamLead(emp);
                                  setShowTeamLeadSearch(false);
                                  setLeadSearchQuery("");
                                }}
                                className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-all border-b border-slate-50 dark:border-border/20 last:border-0 group"
                              >
                                <div className="min-w-0">
                                  <p className="text-[14px] leading-5 font-medium text-foreground truncate group-hover:text-white transition-colors">
                                    {emp.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate tracking-wider font-medium">
                                    {formatDisplayRole(emp.title)}
                                  </p>
                                </div>
                                {teamLead?.id === emp.id && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                              </div>
                            ))}
                            {filteredLeads.length === 0 && (
                              <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
                                  <Search className="w-8 h-8 text-gray-200" />
                                </div>
                                <p className="text-[14px] leading-5 font-medium text-muted-foreground">No members found</p>
                                <p className="text-[10px] text-gray-300 font-medium">Try a different search term</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[14px] leading-5 font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(capitalizeFirstLetter(e.target.value))}
                    rows={3}
                    placeholder="Describe the team's core responsibilities..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground bg-card text-foreground"
                    disabled={isTeamView}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Team Members List */}
            <Card className="shadow-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-1 border-b border-slate-50 dark:border-border">
                <div>
                  <CardTitle className="text-[16px] font-medium leading-6 text-foreground">Team Members</CardTitle>
                  <p className="text-[12px] leading-4 text-muted-foreground font-medium mt-0.5">Directly linked to department personnel records</p>
                </div>
                <div className="bg-primary text-white px-3 py-1 rounded-full text-[12px] leading-4 font-medium shadow-sm shadow-primary-100">
                  {selectedTeam?.members?.length || 0} Members
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50 dark:divide-border">
                  {(selectedTeam?.members || []).length > 0 ? (
                    (selectedTeam?.members || []).map((member: any, idx: number) => {
                      const fullName = member.full_name || `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.user?.username || "Unknown Member";
                      const initials = (member.first_name?.[0] || member.user?.username?.[0] || member.full_name?.[0] || "?").toUpperCase();
                      const isLead = member.user_id?.toString() === selectedTeam?.leadId || member.id?.toString() === selectedTeam?.leadId;
                      
                      return (
                        <div 
                          key={idx} 
                          onClick={() => member.user_id && navigate(`/employee-management/profile/${member.user_id}`)}
                          className="flex items-center justify-between p-4 hover:bg-primary/95/80 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              {member.profile_picture ? (
                                <img 
                                  src={member.profile_picture} 
                                  alt={fullName} 
                                  className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-border shadow-sm transition-transform group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium text-base border-2 border-white dark:border-border shadow-sm transition-transform group-hover:scale-110">
                                  {initials}
                                </div>
                              )}
                              {isLead && (
                                <div className="absolute -bottom-1 -right-1 bg-amber-500 border-2 border-white dark:border-border rounded-full p-1 shadow-sm">
                                  <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[14px] leading-5 font-semibold text-foreground group-hover:text-white transition-colors">{fullName}</p>
                                {isLead && (
                                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-medium rounded-sm tracking-wider">
                                    Team Lead
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] leading-4 text-muted-foreground font-medium">
                                {member.role?.role_name || member.title || "Standard Member"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-border">
                        <Search className="w-8 h-8 text-slate-200 dark:text-muted-foreground/50" />
                      </div>
                      <p className="text-[14px] leading-5 font-medium text-muted-foreground">No active members found</p>
                      <p className="text-[12px] leading-4 text-slate-300 dark:text-muted-foreground/50 mt-1">Assign employees to this team to see them here.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-slate-50 dark:border-border">
                <CardTitle className="text-base font-semibold text-foreground">Team Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[14px] leading-5 text-muted-foreground shrink-0">Team Lead</span>
                    <span className={`text-[14px] leading-5 font-medium text-right ${teamLead ? "text-foreground" : "text-amber-600"}`}>
                      {teamLead?.name || "Vacant"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[14px] leading-5 text-muted-foreground shrink-0">Department</span>
                    <span className="text-[14px] leading-5 font-medium text-foreground text-right">
                      {departmentName || "General"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamFormDetail;



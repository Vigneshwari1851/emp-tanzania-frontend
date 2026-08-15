import { useState, useEffect, useCallback } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Loader2, AlertCircle, Plus, Settings2, Trash2, Users, Shield, Component, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getRoles, getRole, createRole, updateRolePermissions, type Role } from '@/features/rbac/services/roles';
import {
  getGroupedPermissions,
  createModule,
  deleteModule,
  createPermissionNew as createPermissionStruct,
  deletePermissionNew as deletePermissionStruct,
  seedHierarchy
} from '@/features/rbac/services/permissions';
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";

import { Dialog } from "@/shared/components/ui/dialog";
import { useAuth } from "@/shared/context/AuthContext";
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";

export function RolesPermissionsTab() {
  const navigate = useOrgNavigate();
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Management Mode State
  const [isManageMode, setIsManageMode] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);

  const [newModuleData, setNewModuleData] = useState({ id: "", label: "" });
  const [newPermData, setNewPermData] = useState({ name: "", moduleId: "" });
  const [isStructLoading, setIsStructLoading] = useState(false);

  // Confirm dialog states
  const [deleteModuleTarget, setDeleteModuleTarget] = useState<string | null>(null);
  const [deletePermTarget, setDeletePermTarget] = useState<number | null>(null);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [rolesData, groupedPerms] = await Promise.all([
        getRoles(),
        getGroupedPermissions()
      ]);

      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData as any)?.data || [];
      const permsArray = Array.isArray(groupedPerms) ? groupedPerms : (groupedPerms as any)?.data || [];

      setRoles(rolesArray);
      setPermissions(permsArray);

      if (rolesArray.length > 0) {
        const userRoleNames = Array.isArray(user?.roles) ? user.roles.map((r: string) => r.toLowerCase()) : [];
        const matchedRole = rolesArray.find((r: Role) => userRoleNames.includes(r.name?.toLowerCase()));
        setSelectedRole(matchedRole || rolesArray[0]);
      }
    } catch (error: any) {
      console.error("Failed to fetch roles", error);
      toast.error(error.message || "Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadRolePermissions = useCallback(async (roleId: number) => {
    try {
      setIsPermissionsLoading(true);
      const roleData = await getRole(roleId);
      const permissionsList = roleData?.permissions || (roleData as any)?.data || [];
      const ids = Array.isArray(permissionsList)
        ? permissionsList.map((p: any) => p.permission?.id || p.permission_id || p.id).filter(Boolean)
        : [];
      setSelectedPermissions(ids);
    } catch (error: any) {
      console.error("Failed to load permissions", error);
      toast.error("Failed to load role permissions");
    } finally {
      setIsPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    }
  }, [selectedRole, loadRolePermissions]);

  const handleToggle = async (permId: number) => {
    if (!selectedRole || isSaving) return;

    const isRemoving = selectedPermissions.includes(permId);
    const newSelected = isRemoving
      ? selectedPermissions.filter((id) => id !== permId)
      : [...selectedPermissions, permId];

    // Optimistically update UI
    setSelectedPermissions(newSelected);

    try {
      setIsSaving(true);
      await updateRolePermissions(selectedRole.id, {
        permissions: newSelected.map((id) => ({ id })),
      });
      toast.success(isRemoving ? "Permission removed" : "Permission granted", {
        duration: 2000,
        position: "top-right"
      });
    } catch (error) {
      console.error("Failed to update permissions", error);
      toast.error("Failed to update permission");
      // Rollback on error
      setSelectedPermissions(selectedPermissions);
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic Structure Handlers
  const handleCreateModule = async () => {
    if (!newModuleData.id || !newModuleData.label) {
      toast.error("Module ID and Label are required");
      return;
    }
    try {
      setIsStructLoading(true);
      await createModule(newModuleData);
      toast.success("Module added successfully!");
      setIsModuleModalOpen(false);
      setNewModuleData({ id: "", label: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add module");
    } finally {
      setIsStructLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    if (!newPermData.name || !newPermData.moduleId) {
      toast.error("Permission name is required");
      return;
    }
    try {
      setIsStructLoading(true);
      await createPermissionStruct({
        permission_name: newPermData.name,
        key_name: `${newPermData.moduleId}.${newPermData.name.toLowerCase()}`,
        moduleId: newPermData.moduleId,
        description: `Can ${newPermData.name} ${newPermData.moduleId}`
      });
      toast.success("Permission added!");
      setIsPermModalOpen(false);
      setNewPermData({ name: "", moduleId: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add permission");
    } finally {
      setIsStructLoading(false);
    }
  };

  const openPermModal = (moduleId: string) => {
    setNewPermData({ name: "", moduleId });
    setIsPermModalOpen(true);
  };

  const handleDeleteModule = async () => {
    if (!deleteModuleTarget) return;
    try {
      await deleteModule(deleteModuleTarget);
      toast.success("Module deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete module");
    } finally {
      setDeleteModuleTarget(null);
    }
  };

  const handleDeletePermission = async () => {
    if (!deletePermTarget) return;
    try {
      await deletePermissionStruct(deletePermTarget);
      toast.success("Permission deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete permission");
    } finally {
      setDeletePermTarget(null);
    }
  };

  const handleSyncHierarchy = async () => {
    setShowSyncConfirm(false);
    try {
      setIsStructLoading(true);
      await seedHierarchy();
      toast.success("Hierarchy synchronized successfully! 🚀");
      fetchData();
    } catch (error) {
      toast.error("Failed to sync hierarchy");
    } finally {
      setIsStructLoading(false);
    }
  };

  const STANDARD_ACTIONS = ["View", "Create", "Edit", "Delete", "Import", "Export"];

  // Calculate dynamic actions from data
  const dynamicActions = Array.from(
    new Set(
      permissions.flatMap((m: any) =>
        (Array.isArray(m.actions) ? m.actions : []).map((a: any) =>
          a.action ? a.action.charAt(0).toUpperCase() + a.action.slice(1).toLowerCase() :
            a.permission_name ? a.permission_name.charAt(0).toUpperCase() + a.permission_name.slice(1).toLowerCase() :
              ""
        )
      )
    )
  ).filter(Boolean) as string[];

  // Merge and sort: standard first, then others alphabetically
  const ACTIONS = [
    ...STANDARD_ACTIONS,
    ...dynamicActions.filter(a => !STANDARD_ACTIONS.includes(a)).sort()
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isSuperAdminRole = (role: Role | null) => 
    role?.name?.toLowerCase() === 'super admin' || role?.name?.toLowerCase() === 'superadmin';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define system roles and their specific action permissions across modules.
          </p>
        </div>
        <Button onClick={() => navigate('/system-settings/roles/new')} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Roles List */}
        {isSidebarOpen && (
          <div className="xl:col-span-4 border border-border/80 rounded-lg overflow-hidden bg-card shadow-sm flex flex-col">
            <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between">
              <h4 className="text-[12px] font-medium text-foreground">Available Roles</h4>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          <div className="divide-y divide-gray-100/80 dark:divide-gray-800 overflow-y-auto max-h-[700px]">
            {roles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No roles yet. Create one to get started.
              </div>
            ) : (
              roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 flex items-center justify-between transition-all duration-200 group ${
                    selectedRole?.id === role.id 
                      ? 'bg-primary/10/60 border-l-4 border-primary' 
                      : 'border-l-4 border-transparent hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Shield className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      selectedRole?.id === role.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate transition-colors ${
                        selectedRole?.id === role.id ? 'text-primary-900 dark:text-primary-300' : 'text-foreground'
                      }`}>{role.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{role.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      selectedRole?.id === role.id ? 'bg-primary/5 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border group-hover:border-gray-300 dark:group-hover:border-gray-600'
                    }`}>
                      <Users className="w-3.5 h-3.5" /> {role.user_count ?? 0}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        )}

        {/* Permissions Panel */}
        <div className={`${isSidebarOpen ? 'xl:col-span-8' : 'xl:col-span-12'} border border-border/80 rounded-lg bg-card shadow-sm p-6 flex flex-col transition-all duration-300`}>
          {!selectedRole ? (
            <div className="relative flex flex-col items-center justify-center h-[500px] text-muted-foreground border-2 border-dashed border-border rounded-lg m-6 bg-muted/50">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="absolute top-4 left-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <div className="w-16 h-16 flex items-center justify-center mb-4 text-gray-300 dark:text-gray-600">
                <Shield className="w-8 h-8" />
              </div>
              <p className="text-base font-semibold text-foreground">No Role Selected</p>
              <p className="text-sm mt-1">Choose a role from the list to view or manage permissions</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  {!isSidebarOpen && (
                    <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="p-2 -ml-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      title="Expand sidebar"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                  <Shield className="w-6 h-6 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="text-[12px] font-medium text-foreground">{selectedRole.name}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedRole.description || 'System Role'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={isManageMode ? "primary" : "outline"}
                    className={`gap-2 transition-all ${isManageMode ? 'bg-primary hover:bg-primary/95 text-white shadow-sm' : 'shadow-sm'}`}
                    onClick={() => setIsManageMode(!isManageMode)}
                  >
                    <Settings2 className="w-4 h-4" />
                    {isManageMode ? "Finish Editing" : "Manage Matrix"}
                  </Button>
                  {isManageMode && (
                    <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-lg border border-border shadow-inner">
                      <button 
                        onClick={handleSyncHierarchy} 
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-card rounded-sm transition-all"
                      >
                        Restore Defaults
                      </button>
                      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                      <button 
                        onClick={() => setIsModuleModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary hover:bg-primary/10 rounded-sm transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Module
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-foreground">Permissions Matrix</p>
                  {isSuperAdminRole(selectedRole) && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-sm border border-amber-200/60 dark:border-amber-800/60">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Super Admins have full access
                    </div>
                  )}
                </div>
                
                {isPermissionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 flex-1">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">Loading permission matrix...</p>
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground flex-1 border-2 border-dashed border-border rounded-lg bg-muted/30">
                    <AlertCircle className="w-10 h-10 mb-3 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No permissions found</p>
                    <p className="text-xs mt-1 text-muted-foreground">Click 'Manage Matrix' to add modules and actions</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
                    <Table className="min-w-[800px] border-collapse">
                      <TableHeader className="bg-muted border-b border-border">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="px-4 py-3 sticky left-0 bg-muted z-10 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/70 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#374151]">
                            Module / Feature
                          </TableHead>
                          {ACTIONS.map((action) => (
                            <TableHead key={action} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              <span className="inline-block px-2.5 py-0.5 bg-card border border-border rounded-full text-[10px] font-bold text-foreground uppercase tracking-wider shadow-sm">
                                {action}
                              </span>
                            </TableHead>
                          ))}
                          {isManageMode && (
                            <TableHead className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Config
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissions.map((moduleItem: any) => (
                          <TableRow key={moduleItem.module} className="hover:bg-muted/50 transition-colors group">
                            <TableCell className="px-4 py-3 sticky left-0 bg-card group-hover:bg-muted/50 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#374151] transition-colors border-r border-border/70">
                              <div className="flex items-center justify-between group/mod pr-2">
                                <div className="flex items-start gap-3">
                                    <Component className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                                  <div>
                                    <span className="block text-sm font-bold text-foreground">{moduleItem.label}</span>
                                    <span className="block text-[11px] font-medium text-muted-foreground mt-0.5 tracking-wide">{moduleItem.module}</span>
                                  </div>
                                </div>
                                {isManageMode && (
                                  <button
                                    onClick={() => setDeleteModuleTarget(moduleItem.module)}
                                    className="opacity-0 group-hover/mod:opacity-100 mini-icon-btn-reject"
                                    title="Delete Module"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            {ACTIONS.map((action) => {
                              const permsArray = Array.isArray(moduleItem.actions) ? moduleItem.actions : [];
                              const permission = permsArray.find(
                                (p: any) =>
                                  p?.action?.toLowerCase() === action.toLowerCase() ||
                                  p?.permission_name?.toLowerCase() === action.toLowerCase() ||
                                  p?.key_name?.split('.').pop()?.toLowerCase() === action.toLowerCase()
                              );

                              if (!permission) {
                                return <TableCell key={action} className="px-4 py-3 bg-muted/50/30"></TableCell>;
                              }

                              const isSuperAdmin = isSuperAdminRole(selectedRole);
                              const isChecked = isSuperAdmin || selectedPermissions.includes(permission.id);
                              const isDisabled = isSaving || isSuperAdmin;

                              return (
                                <TableCell key={action} className="px-4 py-3 text-center group/cell relative">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <label className="relative flex items-center justify-center cursor-pointer group/cb">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggle(permission.id)}
                                        disabled={isDisabled}
                                        className="peer sr-only"
                                      />
                                      <div className={`w-5 h-5 rounded-sm transition-all duration-200 flex items-center justify-center
                                        ${isChecked
                                          ? "bg-primary text-white shadow-[0_0_0_2px_rgba(79,70,229,0.2)] scale-110"
                                          : "bg-card border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:shadow-sm"}
                                        ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                                      `}>
                                        {isChecked && (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-in zoom-in duration-200" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                    </label>
                                    {isManageMode && !isSuperAdmin && (
                                      <button
                                        onClick={() => setDeletePermTarget(permission.id)}
                                        className="absolute top-1/2 -translate-y-1/2 -right-2 opacity-0 group-hover/cell:opacity-100 mini-icon-btn-reject"
                                        title="Delete Action"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                            {isManageMode && (
                              <TableCell className="px-4 py-3 text-right">
                                <button
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary-100 dark:hover:bg-primary/20 rounded-md transition-colors border border-primary/10"
                                  onClick={() => openPermModal(moduleItem.module)}
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add
                                </button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Module Modal */}
      <Dialog
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title="Add New Permission Module"
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Module ID (Keyword)</label>
            <input
              type="text"
              placeholder="e.g. inventory_management"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background text-foreground"
              value={newModuleData.id}
              onChange={(e) => setNewModuleData({ ...newModuleData, id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">This will be used for permission keys (e.g. module.action)</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Module Label (Display Name)</label>
            <input
              type="text"
              placeholder="e.g. Inventory"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background text-foreground"
              value={newModuleData.label}
              onChange={(e) => setNewModuleData({ ...newModuleData, label: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsModuleModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-foreground"
            >
              Cancel
            </button>
            <Button
              onClick={handleCreateModule}
              disabled={isStructLoading}
              className="gap-2"
            >
              {isStructLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isStructLoading ? "Adding..." : "Add Module"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Permission Modal */}
      <Dialog
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={`Add Permission to ${newPermData.moduleId}`}
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Action Name</label>
            <input
              type="text"
              placeholder="e.g. approve, export"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background text-foreground"
              value={newPermData.name}
              onChange={(e) => setNewPermData({ ...newPermData, name: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsPermModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-foreground"
            >
              Cancel
            </button>
            <Button
              onClick={handleCreatePermission}
              disabled={isStructLoading}
              className="gap-2"
            >
              {isStructLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isStructLoading ? "Adding..." : "Add Permission"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmationDialog
        isOpen={deleteModuleTarget !== null}
        title="Delete Module?"
        description="Are you sure? This will delete all permissions within this module. This action cannot be undone."
        onConfirm={handleDeleteModule}
        onClose={() => setDeleteModuleTarget(null)}
        variant="danger"
        confirmText="Delete Module"
        cancelText="Cancel"
      />

      <ConfirmationDialog
        isOpen={deletePermTarget !== null}
        title="Delete Permission?"
        description="Are you sure you want to delete this permission action?"
        onConfirm={handleDeletePermission}
        onClose={() => setDeletePermTarget(null)}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmationDialog
        isOpen={showSyncConfirm}
        title="Sync Permission Hierarchy?"
        description="This will synchronize the permission matrix with the standard hierarchy. Existing modules will be updated. This cannot be undone."
        onConfirm={handleSyncHierarchy}
        onClose={() => setShowSyncConfirm(false)}
        variant="warning"
        confirmText="Sync Now"
        cancelText="Cancel"
      />
    </div>
  );
}


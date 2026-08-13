import { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  ArrowLeft,
  Loader2,
  Info
} from "lucide-react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole
} from '@/features/rbac/services/roles';
import type { Role } from '@/features/rbac/services/roles';
import {
  getPermissions,
  assignPermissionsToRole,
  getAssignedPermissionsForRole
} from '@/features/rbac/services/permissions';
import type { Permission } from '@/features/rbac/services/permissions';
import { toast } from "sonner";
import { Permission as RBACPermission } from '@/shared/types/rbac';
import { RoleGate } from '@/features/auth/components/RoleGate';

export function RolesPermissions() {
  const navigate = useOrgNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Selection/Modal states
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });

  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        getRoles(),
        getPermissions()
      ]);
      setRoles(rolesData);
      setAllPermissions(permissionsData);

      if (rolesData.length > 0 && !selectedRole) {
        handleSelectRole(rolesData[0]);
      }
    } catch (error) {
      console.error("Failed to fetch roles/permissions", error);
      toast.error("Failed to load roles and permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);
    try {
      const assigned = await getAssignedPermissionsForRole(role.id);
      // assigned is usually an array of permission objects
      setRolePermissions(assigned.map((p: any) => p.id));
    } catch (error) {
      console.error("Failed to fetch role permissions", error);
    }
  };

  const handleCreateRole = async () => {
    if (!roleForm.name) {
      toast.error("Role name is required");
      return;
    }
    const formattedRole = {
      ...roleForm,
      name: capitalizeFirstLetter(roleForm.name),
      description: capitalizeFirstLetter(roleForm.description)
    };
    try {
      if (isEditingRole && selectedRole) {
        await updateRole(selectedRole.id, formattedRole);
        toast.success("Role updated successfully");
      } else {
        await createRole(formattedRole);
        toast.success("Role created successfully");
      }
      setShowRoleModal(false);
      fetchInitialData();
    } catch (error) {
      toast.error("Failed to save role");
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    try {
      await deleteRole(id);
      toast.success("Role deleted successfully");
      fetchInitialData();
    } catch (error) {
      toast.error("Failed to delete role");
    }
  };

  const togglePermission = (permissionId: number) => {
    setRolePermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      setIsSavingPermissions(true);
      await assignPermissionsToRole(selectedRole.id, rolePermissions);
      toast.success("Permissions updated successfully");
    } catch (error) {
      toast.error("Failed to update permissions");
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RoleGate permissions={[RBACPermission.MANAGE_SYSTEM_SETTINGS]}>
      <div className="p-6 max-w-7xl mr-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-primary/95 rounded-sm transition-colors group">
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Roles & Permissions
              </h1>
              <p className="text-muted-foreground text-sm">Manage system access levels and feature permissions</p>
            </div>
          </div>
          <Button onClick={() => {
            setIsEditingRole(false);
            setRoleForm({ name: "", description: "" });
            setShowRoleModal(true);
          }} className="gap-2">
            <Plus className="w-4 h-4" /> Add New Role
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="h-full">
              <CardHeader className="pb-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {filteredRoles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-all border-l-4 ${selectedRole?.id === role.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-transparent"
                      }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{role.name}</span>
                        {selectedRole?.id === role.id && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{role.description}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRole(role);
                          setIsEditingRole(true);
                          setRoleForm({ name: role.name, description: role.description });
                          setShowRoleModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded-sm transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-sm transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Role Permissions Editor */}
          <div className="lg:col-span-8">
            {selectedRole ? (
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                  <div>
                    <CardTitle className="text-xl">{selectedRole.name} Permissions</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{selectedRole.description}</p>
                  </div>
                  <Button
                    onClick={handleSavePermissions}
                    className="gap-2"
                    disabled={isSavingPermissions}
                  >
                    {isSavingPermissions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Permissions Grouped by Prefix (e.g., employee.*, leave.*) */}
                    {Object.entries(
                      allPermissions.reduce((acc: any, p) => {
                        const prefix = p.permission_name.split('.')[0] || 'other';
                        if (!acc[prefix]) acc[prefix] = [];
                        acc[prefix].push(p);
                        return acc;
                      }, {})
                    ).map(([group, permissions]: [string, any]) => (
                      <div key={group} className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-primary rounded-full" />
                          {capitalizeFirstLetter(group)} Management
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {permissions.map((p: Permission) => (
                            <div
                              key={p.id}
                              onClick={() => togglePermission(p.id)}
                              className={`flex items-center gap-3 p-3 rounded-sm border transition-all cursor-pointer ${rolePermissions.includes(p.id)
                                ? "bg-primary/10 border-primary-200 ring-1 ring-primary-200"
                                : "hover:border-gray-300 border-border"
                                }`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${rolePermissions.includes(p.id)
                                ? "bg-primary border-primary"
                                : "border-gray-300"
                                }`}>
                                {rolePermissions.includes(p.id) && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{p.permission_name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-muted rounded-sm border-2 border-dashed border-border">
                <Lock className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No Role Selected</h3>
                <p className="text-muted-foreground text-center max-w-xs mt-2">
                  Select a role from the left sidebar to view and manage its permissions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-sm animate-in zoom-in duration-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{isEditingRole ? "Edit Role" : "Create New Role"}</CardTitle>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-1.5 hover:bg-muted rounded-sm transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Role Name</label>
                  <input
                    type="text"
                    placeholder="e.g., HR Manager"
                    className="w-full px-4 py-2 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: capitalizeFirstLetter(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <textarea
                    placeholder="What can this role do?"
                    rows={3}
                    className="w-full px-4 py-2 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: capitalizeFirstLetter(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-sm text-xs">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  You'll be able to assign specific module permissions after creating the role.
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowRoleModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleCreateRole}>
                    {isEditingRole ? "Save Changes" : "Create Role"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RoleGate>
  );
}


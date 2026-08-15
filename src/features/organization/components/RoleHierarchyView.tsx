import React, { useState, useEffect } from "react";
import { getRoles, createRole, type Role } from '@/features/rbac/services/roles';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { Loader2, Search, ShieldCheck, Users, Plus, X, Info } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";

interface RoleHierarchyViewProps {
  isReadOnly: boolean;
  hideSidebar?: boolean;
}

const getInitials = (first?: string, last?: string, username?: string) => {
  const a = (first?.[0] || "").toUpperCase();
  const b = (last?.[0] || "").toUpperCase();
  if (a || b) return `${a}${b}`;
  return (username?.[0] || "?").toUpperCase();
};

const getAvatarBg = (name: string) => {
  const palette = [
    "bg-primary",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

// Deduplicate roles by lowercase name (same role can exist per-org or with org_id null),
// merging their mapped employees and counts.
const dedupeRoles = (roles: Role[]): Role[] => {
  const map = new Map<string, Role>();
  for (const role of roles || []) {
    const key = (role.name || "").toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...role, employees: [...(role.employees || [])] });
      continue;
    }
    const existingIds = new Set((existing.employees || []).map((e) => e.user_id));
    const merged = [...(existing.employees || [])];
    for (const emp of role.employees || []) {
      if (!existingIds.has(emp.user_id)) {
        existingIds.add(emp.user_id);
        merged.push(emp);
      }
    }
    existing.employees = merged;
    existing.user_count = (existing.user_count || 0) + (role.user_count || 0);
  }
  return Array.from(map.values());
};

const fetchRoles = async (): Promise<Role[]> => {
  const data = await getRoles();
  return dedupeRoles(data || []);
};

export const RoleHierarchyView: React.FC<RoleHierarchyViewProps> = ({
  isReadOnly,
  hideSidebar = false,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [isSavingRole, setIsSavingRole] = useState(false);

  const fetchRolesList = async () => {
    try {
      const data = await fetchRoles();
      setRoles(data || []);
    } catch (error) {
      console.error("Failed to fetch roles", error);
      toast.error("Failed to fetch roles");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesList();
  }, []);

  const filteredRoles = roles.filter((role) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      role.name.toLowerCase().includes(q) ||
      (role.description || "").toLowerCase().includes(q) ||
      (role.employees || []).some((emp) =>
        `${emp.first_name || ""} ${emp.last_name || ""} ${emp.user?.username || ""}`.toLowerCase().includes(q)
      )
    );
  });

  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    setIsSavingRole(true);
    try {
      await createRole({
        name: capitalizeFirstLetter(roleForm.name.trim()),
        description: capitalizeFirstLetter(roleForm.description.trim()),
      });
      toast.success("Role created successfully");
      setShowRoleModal(false);
      setRoleForm({ name: "", description: "" });
      setIsLoading(true);
      await fetchRolesList();
    } catch (error: any) {
      console.error("Failed to create role", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to create role");
    } finally {
      setIsSavingRole(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Role Hierarchy
          </h3>
          <p className="text-[12px] leading-4 text-muted-foreground mt-0.5">
            Roles define access levels (e.g. Manager, Admin). Employees mapped to a role appear below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search role or employee..."
              className="w-full sm:w-56 pl-10 pr-3 h-10 text-[13px] leading-5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card shadow-sm"
            />
          </div>
          {!isReadOnly && (
            <Button
              onClick={() => {
                setRoleForm({ name: "", description: "" });
                setShowRoleModal(true);
              }}
              className="h-10 gap-2 font-bold"
            >
              <Plus className="w-4 h-4" />
              Add New Role
            </Button>
          )}
        </div>
      </div>

      {filteredRoles.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
            <ShieldCheck className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-[14px] leading-5 font-medium text-muted-foreground">No roles found</p>
          <p className="text-[11px] text-gray-400 font-medium mt-1">
            {searchQuery ? "Try a different search term" : "Roles will appear here once they are created"}
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${hideSidebar ? "" : "lg:grid-cols-2"}`}>
          {filteredRoles.map((role) => {
            const employees = role.employees || [];
            return (
              <Card key={role.id} className="shadow-sm border-border">
                <CardHeader className="pt-4 pb-4 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-[14px] font-bold text-foreground truncate capitalize">
                          {capitalizeFirstLetter(role.name)}
                        </CardTitle>
                        {role.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{role.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-bold border border-primary-100 shadow-sm shrink-0" title={`${employees.length} employees mapped`}>
                      <Users className="w-3 h-3" />
                      {employees.length}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-sm animate-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Create New Role</CardTitle>
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
                <Button className="flex-1" onClick={handleCreateRole} disabled={isSavingRole}>
                  {isSavingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Role"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RoleHierarchyView;

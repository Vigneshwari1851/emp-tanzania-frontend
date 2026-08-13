import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Loader2, Plus, Pencil, Trash2, Check, X, Users, Shield,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { toast } from 'sonner';
import {
  getUserTypes, createUserType, updateUserType, deleteUserType,
  getModules, getAssignedModules, updateAssignedModules,
  type UserType, type Module,
} from '../services/user-types';

export function UserTypesTab() {
  const navigate = useOrgNavigate();
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUt, setSelectedUt] = useState<UserType | null>(null);
  const [assignedModuleIds, setAssignedModuleIds] = useState<string[]>([]);
  const [draftModuleIds, setDraftModuleIds] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<UserType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectUserType = async (ut: UserType) => {
    setSelectedUt(ut);
    try {
      const ids = await getAssignedModules(ut.id);
      const arr = Array.isArray(ids) ? ids : [];
      setAssignedModuleIds(arr);
      setDraftModuleIds([...arr]);
    } catch {
      setAssignedModuleIds([]);
      setDraftModuleIds([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uts, mods] = await Promise.all([getUserTypes(), getModules()]);
      const utsArray = Array.isArray(uts) ? uts : [];
      setUserTypes(utsArray);
      setModules(Array.isArray(mods) ? mods : []);
      
      // Auto-select first user type by default
      if (utsArray.length > 0) {
        selectUserType(utsArray[0]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load user types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleModule = (moduleId: string) => {
    setDraftModuleIds(prev =>
      prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId]
    );
  };

  const saveModules = async () => {
    if (!selectedUt) return;
    setSavingModules(true);
    try {
      await updateAssignedModules(selectedUt.id, draftModuleIds);
      setAssignedModuleIds([...draftModuleIds]);
      toast.success('Module access updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update modules');
    } finally {
      setSavingModules(false);
    }
  };

  const openCreate = () => {
    navigate('/system-settings/user-types/new');
  };

  const openEdit = (ut: UserType) => {
    navigate(`/system-settings/user-types/edit/${ut.id}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteUserType(deleteConfirm.id);
      toast.success('User type deleted');
      if (selectedUt?.id === deleteConfirm.id) {
        setSelectedUt(null);
        setAssignedModuleIds([]);
        setDraftModuleIds([]);
      }
      setDeleteConfirm(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete user type');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">User Types</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define system-level user categories that control module visibility and access scope.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Create User Type
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* User Types List */}
        <div className="xl:col-span-2 border border-border rounded-lg overflow-hidden bg-card">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {userTypes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No user types yet. Create one to get started.
              </div>
            ) : (
              userTypes.map(ut => (
                <div
                  key={ut.id}
                  onClick={() => selectUserType(ut)}
                  className={`w-full text-left p-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                    selectedUt?.id === ut.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Shield className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ut.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{ut.system_key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" /> {ut._count?.user_details ?? 0}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(ut); }}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors outline-none"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(ut); }}
                      className="p-1 text-muted-foreground hover:text-rose-600 transition-colors outline-none"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Module Assignment Panel */}
        <div className="xl:col-span-3 border border-border rounded-lg bg-card p-6">
          {!selectedUt ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Shield className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select a user type to manage its module access</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h4 className="text-[12px] font-medium text-foreground">{selectedUt.name}</h4>
                <p className="text-xs text-muted-foreground">System key: {selectedUt.system_key}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedUt.description || 'No description'}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Module Access</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Select which modules this user type can access. Users assigned to this type will only see
                  the checked modules in their sidebar.
                </p>

                {modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No modules found. Seed your module list first.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {modules.map(mod => {
                      const checked = draftModuleIds.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? 'border-primary/30 bg-primary/10'
                              : 'border-border bg-card hover:bg-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            onChange={() => toggleModule(mod.id)}
                          />
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            checked
                              ? 'bg-primary border-primary'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {checked && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-foreground">{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {modules.length > 0 && (
                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                    <Button
                      onClick={saveModules}
                      disabled={savingModules}
                      className="gap-2"
                    >
                      {savingModules && <Loader2 className="w-4 h-4 animate-spin" />}
                      {savingModules ? 'Saving...' : 'Save Module Access'}
                    </Button>
                    {assignedModuleIds.join(',') !== draftModuleIds.join(',') && (
                      <button
                        onClick={() => setDraftModuleIds([...assignedModuleIds])}
                        className="text-sm text-muted-foreground hover:text-gray-600 dark:hover:text-gray-400 underline"
                      >
                        Reset changes
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User Type">
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
            This action cannot be undone.
          </p>
          {deleteConfirm && (deleteConfirm._count?.user_details ?? 0) > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {deleteConfirm._count?.user_details} user(s) are currently assigned to this user type.
              The delete will be blocked until they are reassigned.
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-foreground"
            >
              Cancel
            </button>
            <Button onClick={handleDelete} disabled={deleting} variant="danger" className="gap-2">
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

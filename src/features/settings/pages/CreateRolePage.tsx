import { useState } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';

import { Loader2, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import { createRole } from '@/features/rbac/services/roles';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';

export function CreateRolePage() {
  const navigate = useOrgNavigate();

  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Role Name is required');
      return;
    }
    setSaving(true);
    try {
      await createRole({
        name: form.name,
        description: form.description,
        status: true
      });
      toast.success('Role created successfully!');
      navigate('/system-settings', { state: { activeTab: 'roles' } });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setShowCancelConfirm(true)}
          className="icon-circle-btn animate-in fade-in-50 duration-200"
          title="Back to Settings"
        >
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          Create New Role
        </h1>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5 md:w-1/2">
            <label className="text-sm font-semibold text-foreground">Role Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-background text-foreground"
              placeholder="e.g. Finance Manager"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-background text-foreground"
            placeholder="Briefly describe this role's responsibilities"
          />
        </div>

        <div className="flex items-start gap-2 p-3 bg-primary/5 text-primary text-xs rounded-lg border border-primary/20">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Roles define access privileges and actions that users can perform across different modules in the system.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setShowCancelConfirm(true)}
            className="px-6"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="px-6 gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Role
          </Button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={showCancelConfirm}
      title="Discard New Role?"
      message="Are you sure you want to leave? The role you are creating will not be saved."
      confirmLabel="Discard"
      cancelLabel="Keep Editing"
      confirmColor="red"
      onConfirm={() => {
        setShowCancelConfirm(false);
        navigate('/system-settings', { state: { activeTab: 'roles' } });
      }}
      onCancel={() => setShowCancelConfirm(false)}
    />
    </>
  );
}

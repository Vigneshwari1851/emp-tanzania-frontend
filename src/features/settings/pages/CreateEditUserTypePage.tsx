import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import { getUserTypeById, createUserType, updateUserType } from '../services/user-types';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';

export function CreateEditUserTypePage() {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({ name: '', system_key: '', description: '' });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const fetchUserType = async () => {
        try {
          const data = await getUserTypeById(Number(id));
          setForm({
            name: data.name,
            system_key: data.system_key,
            description: data.description || ''
          });
        } catch (error) {
          toast.error("Failed to load user type details");
          navigate('/system-settings');
        } finally {
          setLoading(false);
        }
      };
      fetchUserType();
    }
  }, [id, isEditing, navigate]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.system_key.trim()) {
      toast.error('Name and System Key are required');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && id) {
        await updateUserType(Number(id), form);
        toast.success('User type updated');
      } else {
        await createUserType(form);
        toast.success('User type created');
      }
      navigate('/system-settings', { state: { activeTab: 'user-types' } });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save user type');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          {isEditing ? 'Edit User Type' : 'Create User Type'}
        </h1>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-background text-foreground"
              placeholder="e.g. Super Admin"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">System Key <span className="text-red-500">*</span></label>
            <input
              value={form.system_key}
              onChange={e => setForm(f => ({ ...f, system_key: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-background text-foreground"
              placeholder="e.g. SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE"
              disabled={isEditing}
            />
            <p className="text-xs text-muted-foreground">Unique system identifier (auto-capitalized)</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-background text-foreground"
            placeholder="Brief description of this user type"
          />
        </div>

        <div className="flex items-start gap-2 p-3 bg-primary/5 text-primary text-xs rounded-lg border border-primary/20">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>User types classify users at the system level (e.g. Super Admin, Admin, Manager, Employee).</p>
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
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={showCancelConfirm}
      title={isEditing ? "Discard User Type Changes?" : "Discard New User Type?"}
      message="Are you sure you want to leave? Any unsaved changes will be lost."
      confirmLabel="Discard"
      cancelLabel="Keep Editing"
      confirmColor="red"
      onConfirm={() => {
        setShowCancelConfirm(false);
        navigate('/system-settings', { state: { activeTab: 'user-types' } });
      }}
      onCancel={() => setShowCancelConfirm(false)}
    />
    </>
  );
}

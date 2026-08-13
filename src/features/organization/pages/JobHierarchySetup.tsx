import React, { useState, useEffect } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight,
  Crown, Briefcase, Check, Loader2, Sparkles, ArrowRight,
  Users, X, Pencil
} from "lucide-react";
import { createDesignation, updateDesignation, getDesignations, deleteDesignation, type DesignationNode } from "../services/designations";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";
import Select from "@/shared/components/ui/Select";

// Suggested executive roles
const SUGGESTIONS = [
  { name: "Chief Executive Officer", code: "CEO", description: "Top executive responsible for overall company operations" },
  { name: "Managing Director", code: "MD", description: "Oversees operations and implements company strategy" },
  { name: "Chief Financial Officer", code: "CFO", description: "Manages financial planning, risk, and reporting" },
  { name: "Chief Operating Officer", code: "COO", description: "Oversees daily business operations" },
  { name: "Chief Technology Officer", code: "CTO", description: "Leads technology vision and engineering" },
  { name: "Chief Marketing Officer", code: "CMO", description: "Drives marketing and brand strategy" },
  { name: "Chief People Officer", code: "CPO", description: "Leads HR, talent, and culture initiatives" },
  { name: "VP Engineering", code: "VPE", description: "Heads the engineering division" },
  { name: "VP Sales", code: "VPS", description: "Leads sales strategy and team" },
  { name: "VP Finance", code: "VPF", description: "Supports CFO in financial management" },
  { name: "Director of HR", code: "DHR", description: "Manages human resources operations" },
];

interface LocalRole {
  tempId: string;
  designation_name: string;
  designation_code: string;
  description: string;
  parent_designation_id: number | null;
  parentTempId: string | null;
  saved?: boolean;
  savedId?: number;
}

// Recursive mini chart node
function ChartNode({ role, allRoles, depth = 0 }: { role: LocalRole; allRoles: LocalRole[]; depth?: number }) {
  const children = allRoles.filter(r => r.parentTempId === role.tempId);
  const isRoot = depth === 0;
  return (
    <div className="flex flex-col items-center">
      <div className={`relative px-4 py-2.5 border rounded-xl text-center shadow-sm min-w-[130px] max-w-[160px] transition-all ${
        isRoot
          ? "bg-gradient-to-b from-primary-600 to-primary-700 border-primary-500 text-white"
          : depth === 1
          ? "bg-white dark:bg-card border-primary-200 dark:border-primary-800 text-foreground"
          : "bg-slate-50 border-slate-200 text-foreground"
      }`}>
        {isRoot && <span className="text-[9px] mb-1 block opacity-80 font-bold uppercase tracking-widest">Executive</span>}
        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
          isRoot ? "bg-white/20 text-white" : "bg-primary-100 text-primary-700"
        }`}>{role.designation_code}</span>
        <p className={`text-[11px] font-bold mt-1 leading-tight ${isRoot ? "text-white" : "text-foreground"}`}>
          {role.designation_name.length > 20 ? role.designation_name.slice(0, 18) + "…" : role.designation_name}
        </p>
        {role.saved && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </div>
      {children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-[2px] h-5 bg-slate-300" />
          <div className="flex gap-4 relative items-start">
            {children.length > 1 && (
              <div className="absolute top-0 left-[calc(50%-1px)] right-[calc(50%-1px)] h-[2px] bg-slate-300" style={{ left: "25px", right: "25px" }} />
            )}
            {children.map((child, idx) => (
              <div key={child.tempId} className="flex flex-col items-center relative">
                {children.length > 1 && (
                  <div className={`absolute top-0 h-[2px] bg-slate-300 ${idx === 0 ? "left-1/2 right-0" : idx === children.length - 1 ? "left-0 right-1/2" : "left-0 right-0"}`} />
                )}
                <div className="w-[2px] h-5 bg-slate-300" />
                <ChartNode role={child} allRoles={allRoles} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function JobHierarchySetup() {
  const navigate = useOrgNavigate();
  const [roles, setRoles] = useState<LocalRole[]>([]);
  const [savedRoles, setSavedRoles] = useState<DesignationNode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [parentTempId, setParentTempId] = useState<string | null>(null);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDesignations();
        setSavedRoles(data);
        // Map existing saved designations as local roles with saved=true
        const mapped: LocalRole[] = data.map(d => ({
          tempId: `saved-${d.id}`,
          designation_name: d.designation_name,
          designation_code: d.designation_code,
          description: d.description || "",
          parent_designation_id: d.parent_designation_id || null,
          parentTempId: d.parent_designation_id ? `saved-${d.parent_designation_id}` : null,
          saved: true,
          savedId: d.id,
        }));
        setRoles(mapped);
      } catch {
        // no existing designations
      } finally {
        setIsLoadingExisting(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setName(""); setCode(""); setDescription(""); setParentTempId(null); setEditingTempId(null); setShowForm(false);
  };

  const addSuggestion = (s: typeof SUGGESTIONS[0]) => {
    const tempId = `local-${Date.now()}`;
    setRoles(prev => [...prev, {
      tempId,
      designation_name: s.name,
      designation_code: s.code,
      description: s.description,
      parent_designation_id: null,
      parentTempId: null,
      saved: false,
    }]);
    toast.success(`"${s.name}" added to hierarchy`);
  };

  const handleAddCustom = async () => {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return; }
    if (editingTempId) {
      const editing = roles.find(r => r.tempId === editingTempId);
      // If it's a saved role, call the update API
      if (editing?.saved && editing.savedId) {
        try {
          setIsSaving(true);
          const parentRole = roles.find(r => r.tempId === parentTempId);
          const parentId = parentRole?.savedId || null;
          await updateDesignation(editing.savedId, {
            designation_name: name.trim(),
            designation_code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
            parent_designation_id: parentId,
          });
          setRoles(prev => prev.map(r => r.tempId === editingTempId
            ? { ...r, designation_name: name.trim(), designation_code: code.trim().toUpperCase(), description: description.trim(), parentTempId }
            : r));
          toast.success("Role updated successfully!");
        } catch (err: any) {
          toast.error(err.message || "Failed to update role");
        } finally {
          setIsSaving(false);
        }
      } else {
        // Unsaved — just update local state
        setRoles(prev => prev.map(r => r.tempId === editingTempId
          ? { ...r, designation_name: name.trim(), designation_code: code.trim().toUpperCase(), description: description.trim(), parentTempId }
          : r));
      }
    } else {
      setRoles(prev => [...prev, {
        tempId: `local-${Date.now()}`,
        designation_name: name.trim(),
        designation_code: code.trim().toUpperCase(),
        description: description.trim(),
        parent_designation_id: null,
        parentTempId,
        saved: false,
      }]);
    }
    resetForm();
  };

  const handleEdit = (role: LocalRole) => {
    setEditingTempId(role.tempId);
    setName(role.designation_name);
    setCode(role.designation_code);
    setDescription(role.description);
    setParentTempId(role.parentTempId);
    setShowForm(true);
  };

  const [deleteTargetRole, setDeleteTargetRole] = useState<LocalRole | null>(null);

  const handleRemove = (role: LocalRole) => {
    setDeleteTargetRole(role);
  };

  const confirmRemoveDesignation = async () => {
    if (!deleteTargetRole) return;
    const role = deleteTargetRole;
    if (role.saved && role.savedId) {
      try {
        await deleteDesignation(role.savedId);
        setRoles(prev => prev.filter(r => r.tempId !== role.tempId));
        toast.success("Designation deleted");
      } catch { toast.error("Failed to delete"); }
    } else {
      setRoles(prev => prev.filter(r => r.tempId !== role.tempId && r.parentTempId !== role.tempId));
    }
    setDeleteTargetRole(null);
  };

  const handleSaveAll = async () => {
    const unsaved = roles.filter(r => !r.saved);
    if (!unsaved.length) { toast.info("All roles are already saved"); return; }
    setIsSaving(true);
    // Sort: roots first, then children
    const sorted = [...unsaved].sort((a, b) => (a.parentTempId ? 1 : 0) - (b.parentTempId ? 1 : 0));
    const tempIdToSavedId: Record<string, number> = {};
    // populate existing saved ids
    roles.filter(r => r.saved && r.savedId).forEach(r => { tempIdToSavedId[r.tempId] = r.savedId!; });

    let successCount = 0;
    for (const role of sorted) {
      try {
        const parentId = role.parentTempId ? (tempIdToSavedId[role.parentTempId] || null) : null;
        const created = await createDesignation({
          designation_name: role.designation_name,
          designation_code: role.designation_code,
          description: role.description || undefined,
          parent_designation_id: parentId,
        });
        tempIdToSavedId[role.tempId] = created.id;
        setRoles(prev => prev.map(r => r.tempId === role.tempId ? { ...r, saved: true, savedId: created.id } : r));
        successCount++;
      } catch (err: any) {
        toast.error(`Failed to save "${role.designation_name}": ${err.message || "error"}`);
      }
    }
    setIsSaving(false);
    if (successCount > 0) toast.success(`${successCount} role${successCount > 1 ? "s" : ""} saved successfully!`);
  };

  const unsavedCount = roles.filter(r => !r.saved).length;
  const rootRoles = roles.filter(r => !r.parentTempId);
  const usedSuggestions = new Set(roles.map(r => r.designation_code));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors border-none bg-transparent">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary-500" />
              <h1 className="text-[22px] font-bold text-foreground">Job Hierarchy Setup</h1>
              <span className="text-[11px] font-bold bg-primary-100 text-primary-700 border border-primary-200 px-2.5 py-0.5 rounded-full">New Company</span>
            </div>
            <p className="text-muted-foreground text-[13px] mt-0.5">
              Define your executive and management roles before creating departments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
            {unsavedCount > 0 && (
              <Button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 gap-2 font-bold rounded-[7px] border-none shadow-md"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save {unsavedCount} Role{unsavedCount > 1 ? "s" : ""}
              </Button>
            )}
            <Button
              onClick={() => navigate("/org-setup/add-department")}
              className="bg-primary hover:bg-[#4548D4] text-white h-10 px-5 gap-2 font-bold rounded-[7px] border-none shadow-md"
            >
              Next: Add Departments <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/organisation-structure")}
              className="h-10 px-5 gap-2 font-bold rounded-[7px] border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100"
            >
              Manage Roles Later
            </Button>
          </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        {["Define Executive Roles", "Create Departments", "Add Teams & Assign Managers"].map((step, i) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${i === 0 ? "bg-primary-600 text-white" : "bg-muted text-muted-foreground"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-white text-primary-600" : "bg-border text-muted-foreground"}`}>{i + 1}</span>
              {step}
            </div>
            {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
        {/* LEFT: Role Builder */}
        <div className="space-y-5">
          {/* Quick Add Suggestions */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-[13px] font-bold text-foreground">Quick Add — Common Executive Roles</h3>
              <span className="text-[10px] text-muted-foreground font-medium">Click to add</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.code}
                  disabled={usedSuggestions.has(s.code)}
                  onClick={() => addSuggestion(s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                    usedSuggestions.has(s.code)
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                      : "bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100"
                  }`}
                >
                  {usedSuggestions.has(s.code) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {s.code}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Role Form */}
          {showForm ? (
            <div className="bg-card border-2 border-primary-300 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-foreground">{editingTempId ? "Edit Role" : "Add Custom Role"}</h3>
                <button onClick={resetForm} className="p-1 hover:bg-muted rounded border-none bg-transparent text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-foreground">Role Name <span className="text-red-500">*</span></label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Chief Executive Officer"
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-foreground">Code <span className="text-red-500">*</span></label>
                  <input
                    value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CEO"
                    maxLength={8}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-card uppercase"
                  />
                </div>
              </div>
              <Select
                value={parentTempId || ""}
                onChange={(val) => setParentTempId(val || null)}
                placeholder="None (Top Level)"
                label="Reports To"
                options={[
                  { value: "", label: "None (Top Level)" },
                  ...roles.filter(r => r.tempId !== editingTempId).map(r => ({
                    value: r.tempId,
                    label: `${r.designation_name} (${r.designation_code})`
                  }))
                ]}
              />
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-foreground">Description</label>
                <input
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Brief role description..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCustom} className="bg-primary hover:bg-[#4548D4] text-white h-9 px-5 text-[12px] font-bold rounded-[7px] border-none gap-1.5">
                  <Check className="w-3.5 h-3.5" /> {editingTempId ? "Update Role" : "Add Role"}
                </Button>
                <Button onClick={resetForm} variant="outline" className="h-9 px-4 text-[12px] font-bold rounded-[7px]">Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-border rounded-xl text-[13px] font-semibold text-muted-foreground hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/50 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Custom Role
            </button>
          )}

          {/* Roles List */}
          {isLoadingExisting ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
          ) : roles.length === 0 ? (
            <div className="bg-muted/30 border border-dashed border-border rounded-xl p-10 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-muted-foreground">No roles added yet.</p>
              <p className="text-[12px] text-muted-foreground mt-1">Use Quick Add above or add a custom role to get started.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[12px] font-bold text-foreground">{roles.length} Role{roles.length !== 1 ? "s" : ""} Defined</span>
                <span className="text-[11px] text-muted-foreground">{unsavedCount} unsaved</span>
              </div>
              <div className="divide-y divide-border">
                {roles.map(role => (
                  <div key={role.tempId} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-extrabold text-[10px] shrink-0 border border-primary-200">
                      {role.designation_code.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-foreground truncate">{role.designation_name}</span>
                        {role.saved
                          ? <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Saved</span>
                          : <span className="text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">Pending</span>
                        }
                      </div>
                      {role.parentTempId && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Reports to: {roles.find(r => r.tempId === role.parentTempId)?.designation_name || "—"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(role)} className="p-1.5 hover:bg-primary-50 text-primary-500 rounded-lg border-none bg-transparent" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleRemove(role)} className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg border-none bg-transparent" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Live Chart Preview */}
        <div className="xl:sticky xl:top-6 space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-primary-50 to-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary-500" />
              <span className="text-[13px] font-bold text-foreground">Live Hierarchy Preview</span>
              <span className="ml-auto text-[11px] text-muted-foreground font-medium">Updates in real-time</span>
            </div>
            <div
              className="p-6 min-h-[320px] flex items-start justify-center overflow-auto"
              style={{ backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)", backgroundSize: "20px 20px" }}
            >
              {roles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center mb-3">
                    <Crown className="w-7 h-7 text-primary-300" />
                  </div>
                  <p className="text-[12px] font-semibold text-muted-foreground">Your hierarchy will appear here</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Add roles from the left to see the chart</p>
                </div>
              ) : (
                <div className="flex gap-8 flex-wrap justify-center">
                  {rootRoles.map(root => (
                    <ChartNode key={root.tempId} role={root} allRoles={roles} depth={0} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-[12px] text-primary-800 leading-relaxed space-y-2">
            <p className="font-bold text-primary-900 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> How this works</p>
            <p>• Roles with <strong>no parent</strong> appear at the top (CEO/MD level)</p>
            <p>• Child roles are connected below their parent via reporting lines</p>
            <p>• <span className="bg-emerald-200 text-emerald-800 px-1 rounded font-bold">Saved</span> roles are live in the system; <span className="bg-amber-200 text-amber-800 px-1 rounded font-bold">Pending</span> roles need to be saved</p>
            <p>• After saving, proceed to <strong>Add Departments</strong> where you'll link departments under this hierarchy</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTargetRole}
        title="Delete Designation"
        message={`Are you sure you want to delete designation "${deleteTargetRole?.designation_name || 'this role'}"? Child roles will be detached.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="red"
        onConfirm={confirmRemoveDesignation}
        onCancel={() => setDeleteTargetRole(null)}
      />
    </div>
  );
}

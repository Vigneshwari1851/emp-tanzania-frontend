import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import {
  Sparkles, Plus, Shield, Workflow, ToggleLeft, ToggleRight,
  Trash2, CheckCircle2,
  Banknote, TrendingUp, Layers, Clock, Edit, Target
} from 'lucide-react';
import * as loanConfig from '../services/loan-config';

interface LoanType {
  id: number; name: string; code: string; category: string; description?: string;
  minAmount: number; maxAmount: number; interestRate: number; repaymentMethod: string;
  maxTenure: number; installments: number; requiresDocuments: boolean; isActive: boolean;
  sortOrder: number; eligibilityRules: EligibilityRule[]; approvalWorkflow: WorkflowStep[];
  _count?: { applications: number };
  department?: { id: number; department_name: string } | null;
  designation?: { id: number; designation_name: string } | null;
  branch?: { id: number; branch_name: string } | null;
  role?: { id: number; role_name: string } | null;
  organization?: { id: number; entity_name: string } | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  maxApplicationsPerPeriod?: number | null;
  period?: string;
  department_id?: number | null;
  designation_id?: number | null;
  branch_id?: number | null;
  role_id?: number | null;
}

interface EligibilityRule {
  id?: number; ruleType: string; ruleValue: string; isActive: boolean;
}

interface WorkflowStep {
  id?: number; stepOrder: number; roleName: string; isRequired: boolean;
}

const RULE_TYPES = [
  { value: 'employment_type', label: 'Employment Type', placeholder: 'e.g. Permanent, Contract', multi: true },
  { value: 'min_service_months', label: 'Min Service Period (months)', placeholder: 'e.g. 12', multi: false },
  { value: 'min_salary', label: 'Minimum Salary', placeholder: 'e.g. 30000', multi: false },
  { value: 'max_salary', label: 'Maximum Salary', placeholder: 'e.g. 200000', multi: false },
  { value: 'max_active_loans', label: 'Max Active Loans of This Type', placeholder: 'e.g. 1', multi: false },
  { value: 'confirmation_required', label: 'Requires Confirmation', placeholder: 'true or false', multi: false },
  { value: 'departments', label: 'Allowed Departments (IDs)', placeholder: 'e.g. 1,2,3', multi: false },
  { value: 'designations', label: 'Allowed Designations (IDs)', placeholder: 'e.g. 1,2,3', multi: false },
  { value: 'locations', label: 'Allowed Locations', placeholder: 'e.g. Mumbai, Delhi', multi: true },
];

const DEFAULT_WORKFLOW_ROLES = ['MANAGER', 'HR', 'FINANCE'];

export function LoanTypeConfig() {
  const { currencySymbol } = useCurrency();
  const navigate = useOrgNavigate();
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Rules state
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [editingRules, setEditingRules] = useState<EligibilityRule[]>([]);
  const [rulesLoanTypeId, setRulesLoanTypeId] = useState<number | null>(null);

  // Workflow state
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowStep[]>([]);
  const [workflowLoanTypeId, setWorkflowLoanTypeId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [types, statsData] = await Promise.all([
        loanConfig.getLoanTypes(),
        loanConfig.getLoanTypeStats()
      ]);
      setLoanTypes(types || []);
      setStats(statsData);
    } catch { toast.error('Failed to load loan types'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Type CRUD ────────────────────────────────────────────────────────

  const handleToggle = async (id: number) => {
    try { await loanConfig.toggleLoanType(id); fetchData(); }
    catch { toast.error('Failed to toggle'); }
  };

  // ─── Rules ────────────────────────────────────────────────────────────

  const openRulesModal = (lt: LoanType) => {
    setRulesLoanTypeId(lt.id);
    setEditingRules(lt.eligibilityRules.length > 0
      ? lt.eligibilityRules.map(r => ({ ruleType: r.ruleType, ruleValue: r.ruleValue, isActive: r.isActive }))
      : []);
    setIsRulesModalOpen(true);
  };

  const addRule = () => {
    setEditingRules([...editingRules, { ruleType: 'employment_type', ruleValue: '', isActive: true }]);
  };

  const updateRule = (idx: number, field: string, value: any) => {
    const updated = [...editingRules];
    (updated[idx] as any)[field] = value;
    setEditingRules(updated);
  };

  const removeRule = (idx: number) => {
    setEditingRules(editingRules.filter((_, i) => i !== idx));
  };

  const saveRules = async () => {
    if (!rulesLoanTypeId) return;
    try {
      await loanConfig.updateEligibilityRules(rulesLoanTypeId, editingRules);
      toast.success('Eligibility rules updated');
      setIsRulesModalOpen(false);
      fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save rules'); }
  };

  // ─── Workflow ─────────────────────────────────────────────────────────

  const openWorkflowModal = (lt: LoanType) => {
    setWorkflowLoanTypeId(lt.id);
    setEditingWorkflow(lt.approvalWorkflow.length > 0
      ? lt.approvalWorkflow.map(s => ({ stepOrder: s.stepOrder, roleName: s.roleName, isRequired: s.isRequired }))
      : []);
    setIsWorkflowModalOpen(true);
  };

  const addWorkflowStep = () => {
    setEditingWorkflow([...editingWorkflow, { stepOrder: editingWorkflow.length + 1, roleName: '', isRequired: true }]);
  };

  const updateWorkflowStep = (idx: number, field: string, value: any) => {
    const updated = [...editingWorkflow];
    (updated[idx] as any)[field] = value;
    setEditingWorkflow(updated);
  };

  const removeWorkflowStep = (idx: number) => {
    const updated = editingWorkflow.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setEditingWorkflow(updated);
  };

  const saveWorkflow = async () => {
    if (!workflowLoanTypeId) return;
    try {
      await loanConfig.updateApprovalWorkflow(workflowLoanTypeId, editingWorkflow);
      toast.success('Approval workflow updated');
      setIsWorkflowModalOpen(false);
      fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save workflow'); }
  };

  const renderPolicyBadges = (lt: LoanType): string[] => {
    const badges: string[] = [];
    if (lt.department?.department_name) badges.push(lt.department.department_name);
    if (lt.designation?.designation_name) badges.push(lt.designation.designation_name);
    if (lt.branch?.branch_name) badges.push(lt.branch.branch_name);
    if (lt.role?.role_name) badges.push(lt.role.role_name);
    if (lt.period && lt.period !== 'Lifetime') badges.push(lt.period);
    if (lt.effectiveDate) badges.push(`Effective: ${lt.effectiveDate.split('T')[0]}`);
    if (lt.expiryDate) badges.push(`Expires: ${lt.expiryDate.split('T')[0]}`);
    return badges;
  };

  return (
    <div className="flex-1 pb-12">
      {/* Inline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Loan & Advance Policies Setup</h2>
          <p className="text-xs text-muted-foreground">Configure loan policies with targeting, eligibility rules, and approval workflows</p>
        </div>
        <button onClick={() => navigate('/loans-advances/config/create')}
          className="bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 text-sm w-fit">
          <Plus className="w-4 h-4" /> Add Loan Type
        </button>
      </div>

      <div className="mt-6">
        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Layers className="h-5 w-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground">
                {stats.totalTypes}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  Total Types
                </span>
              </div>
            </div>

            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-emerald-600">
                {stats.activeTypes}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  Active
                </span>
              </div>
            </div>

            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Banknote className="h-5 w-5 text-purple-600 shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground">
                {stats.loanCount}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  Loan Types
                </span>
              </div>
            </div>

            <div className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-amber-600 shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground">
                {stats.advanceCount}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  Advance Types
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Types List */}
        <div className="space-y-4">
          {loanTypes.length === 0 && !loading ? (
            <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
              <Layers className="mx-auto size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-bold text-foreground">No loan types configured</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Loan Policy" to create your first policy</p>
            </div>
          ) : loanTypes.map(lt => {
            const policyBadges = renderPolicyBadges(lt);
            return (
            <div key={lt.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${lt.category === 'LOAN' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {lt.category === 'LOAN' ? <Banknote className="size-5" /> : <TrendingUp className="size-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{lt.name}</p>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted text-muted-foreground">{lt.code}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${lt.category === 'LOAN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{lt.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currencySymbol}{Number(lt.minAmount).toLocaleString()} — {currencySymbol}{Number(lt.maxAmount).toLocaleString()} &middot; {lt.repaymentMethod} &middot; {lt.maxTenure}mo &middot; {lt.interestRate}% interest
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground"><Shield className="inline size-3 mr-0.5" />{lt.eligibilityRules.length} rules</span>
                      <span className="text-[10px] text-muted-foreground"><Workflow className="inline size-3 mr-0.5" />{lt.approvalWorkflow.length} steps</span>
                      {lt._count && <span className="text-[10px] text-muted-foreground"><Clock className="inline size-3 mr-0.5" />{lt._count.applications} applications</span>}
                    </div>
                    {policyBadges.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Target className="size-3 text-primary-500" />
                        {policyBadges.map((badge, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-50 text-primary-700">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/loans-advances/config/edit/${lt.id}`)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit">
                    <Edit className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* ─── Eligibility Rules Modal ─────────────────────────────────── */}
      {isRulesModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-card rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-card flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Shield className="size-4 text-primary" /> Eligibility Rules
              </h3>
              <button 
                onClick={() => setIsRulesModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {editingRules.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No rules configured. All employees are eligible.</div>
              ) : editingRules.map((rule, idx) => {
                const ruleMeta = RULE_TYPES.find(r => r.value === rule.ruleType);
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                    <select value={rule.ruleType} onChange={e => updateRule(idx, 'ruleType', e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg text-xs font-bold bg-card flex-shrink-0 w-48">
                      {RULE_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                    </select>
                    <input value={rule.ruleValue} onChange={e => updateRule(idx, 'ruleValue', e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-card"
                      placeholder={ruleMeta?.placeholder || 'Value'} />
                    <button onClick={() => removeRule(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg flex-shrink-0">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
              <button onClick={addRule}
                className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2">
                <Plus className="size-3" /> Add Rule
              </button>
              <button onClick={saveRules}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                Save Eligibility Rules
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ─── Approval Workflow Modal ──────────────────────────────────── */}
      {isWorkflowModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-card rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-card flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Workflow className="size-4 text-primary" /> Approval Workflow
              </h3>
              <button 
                onClick={() => setIsWorkflowModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {editingWorkflow.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No workflow steps. Applications are auto-approved.</div>
              ) : editingWorkflow.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                  <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black flex-shrink-0">{step.stepOrder}</div>
                  <select value={step.roleName} onChange={e => updateWorkflowStep(idx, 'roleName', e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-bold bg-card">
                    <option value="">Select Role</option>
                    {DEFAULT_WORKFLOW_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    <input type="checkbox" checked={step.isRequired} onChange={e => updateWorkflowStep(idx, 'isRequired', e.target.checked)}
                      className="rounded border-slate-300 text-primary-600" />
                    Required
                  </label>
                  <button onClick={() => removeWorkflowStep(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg flex-shrink-0">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <button onClick={addWorkflowStep}
                className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2">
                <Plus className="size-3" /> Add Step
              </button>
              <button onClick={saveWorkflow}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                Save Approval Workflow
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

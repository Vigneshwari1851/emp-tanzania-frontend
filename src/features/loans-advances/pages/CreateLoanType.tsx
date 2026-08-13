import React, { useState, useEffect, useCallback } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import {
  Sparkles, ArrowLeft, Save, Banknote, TrendingUp, Target, Calendar,
  Shield, Workflow, Plus, Trash2
} from 'lucide-react';
import { getDepartments, type Department } from '@/features/organization/services/departments';
import { getRoles, type Role } from '@/features/rbac/services/roles';
import * as loanConfig from '../services/loan-config';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';

const PERIOD_OPTIONS = ['Lifetime', 'Monthly', 'Quarterly', 'Annually'];

const inputCls = "w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card";

const initialFormData = {
  name: '', code: '', category: 'LOAN', description: '', minAmount: '', maxAmount: '',
  interestRate: '0', repaymentMethod: 'EMI', maxTenure: '12', installments: '1',
  requiresDocuments: false, sortOrder: '0',
  department_id: '', designation_id: '', branch_id: '', role_id: '',
  effectiveDate: '', expiryDate: '', maxApplicationsPerPeriod: '', period: 'Lifetime'
};

export function CreateLoanType() {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const { currencySymbol } = useCurrency();

  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [depts, rols, orgs] = await Promise.all([
        getDepartments().catch(() => []),
        getRoles().catch(() => []),
        import('@/features/organization/services/organizations').then(m => m.getOrganizations()).catch(() => []),
      ]);
      setDepartments(Array.isArray(depts) ? depts : []);
      setRoles(Array.isArray(rols) ? rols : []);
      const normalizedOrgs = Array.isArray(orgs) ? orgs : (orgs ? [orgs] : []);
      const allBranches: any[] = [];
      const allDesignations: any[] = [];
      normalizedOrgs.forEach((org: any) => {
        const brs = org.branches || org.branch || [];
        if (Array.isArray(brs)) allBranches.push(...brs);
        const desigs = org.designations || [];
        if (Array.isArray(desigs)) allDesignations.push(...desigs);
      });
      setBranches(allBranches);
      setDesignations(allDesignations);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchReferenceData();
    if (id) {
      setLoading(true);
      loanConfig.getLoanTypeById(Number(id))
        .then((lt: any) => {
          setFormData({
            name: lt.name || '', code: lt.code || '', category: lt.category || 'LOAN',
            description: lt.description || '',
            minAmount: String(lt.minAmount ?? ''), maxAmount: String(lt.maxAmount ?? ''),
            interestRate: String(lt.interestRate ?? '0'), repaymentMethod: lt.repaymentMethod || 'EMI',
            maxTenure: String(lt.maxTenure ?? '12'), installments: String(lt.installments ?? '1'),
            requiresDocuments: lt.requiresDocuments || false, sortOrder: String(lt.sortOrder ?? '0'),
            department_id: lt.department_id ? String(lt.department_id) : '',
            designation_id: lt.designation_id ? String(lt.designation_id) : '',
            branch_id: lt.branch_id ? String(lt.branch_id) : '',
            role_id: lt.role_id ? String(lt.role_id) : '',
            effectiveDate: lt.effectiveDate ? lt.effectiveDate.split('T')[0] : '',
            expiryDate: lt.expiryDate ? lt.expiryDate.split('T')[0] : '',
            maxApplicationsPerPeriod: lt.maxApplicationsPerPeriod ? String(lt.maxApplicationsPerPeriod) : '',
            period: lt.period || 'Lifetime'
          });
        })
        .catch(() => { toast.error('Failed to load loan type'); navigate('/loans-advances?tab=policies'); })
        .finally(() => setLoading(false));
    }
  }, [id, fetchReferenceData, navigate]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) { toast.error('Name and code are required'); return; }
    try {
      setSaving(true);
      if (id) {
        await loanConfig.updateLoanType(Number(id), formData);
        toast.success('Loan policy updated');
      } else {
        await loanConfig.createLoanType(formData);
        toast.success('Loan policy created');
      }
      navigate('/loans-advances?tab=policies');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading loan type...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-3.5 mb-6">
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none"
          title="Back to Policies Setup"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {id ? 'Edit Loan Policy' : 'Create Loan Policy'}
        </h1>
      </div>

      <div className="w-full mt-8">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">

          {/* ── Basic Information ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Banknote className="size-4 text-primary" /> Basic Information
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Name *</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls} placeholder="e.g. Personal Loan" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Code *</label>
                <input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className={`${inputCls} uppercase`} placeholder="e.g. PL001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className={inputCls}>
                  <option value="LOAN">Loan</option>
                  <option value="ADVANCE">Advance</option>
                </select>
              </div>
              {/* <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Repayment Method</label>
                <select value={formData.repaymentMethod} onChange={e => setFormData({ ...formData, repaymentMethod: e.target.value })}
                  className={inputCls}>
                  <option value="EMI">EMI (Monthly Installments)</option>
                  <option value="SALARY_DEDUCTION">Salary Deduction</option>
                  <option value="ONE_TIME">One-time Adjustment</option>
                </select>
              </div> */}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                className={`${inputCls} resize-none h-16`} placeholder="Brief description of this loan type" />
            </div>
          </div>

          {/* ── Amount & Tenure ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <TrendingUp className="size-4 text-primary" /> Amount & Tenure
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Min Amount ({currencySymbol})</label>
                <input type="number" value={formData.minAmount} onChange={e => setFormData({ ...formData, minAmount: e.target.value })}
                  className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Max Amount ({currencySymbol})</label>
                <input type="number" value={formData.maxAmount} onChange={e => setFormData({ ...formData, maxAmount: e.target.value })}
                  className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Interest Rate (%)</label>
                <input type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({ ...formData, interestRate: e.target.value })}
                  className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Max Tenure (mo)</label>
                <input type="number" value={formData.maxTenure} onChange={e => setFormData({ ...formData, maxTenure: e.target.value })}
                  className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Installments</label>
                <input type="number" value={formData.installments} onChange={e => setFormData({ ...formData, installments: e.target.value })}
                  className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer">
                <input type="checkbox" checked={formData.requiresDocuments} onChange={e => setFormData({ ...formData, requiresDocuments: e.target.checked })}
                  className="rounded border-slate-300 text-primary-600" />
                Requires Documents
              </label>
            </div>
          </div>

          {/* ── Policy Targeting ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Target className="size-4 text-primary" /> Policy Targeting
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Department</label>
                <select value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                  className={inputCls}>
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{(d as any).department_name || (d as any).name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Designation</label>
                <select value={formData.designation_id} onChange={e => setFormData({ ...formData, designation_id: e.target.value })}
                  className={inputCls}>
                  <option value="">All Designations</option>
                  {designations.map(d => (
                    <option key={d.id} value={d.id}>{d.designation_name || d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Branch / Location</label>
                <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                  className={inputCls}>
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name || b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Role</label>
                <select value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                  className={inputCls}>
                  <option value="">All Roles</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">Leave all fields empty to make this available to all employees.</p>
          </div>

          {/* ── Policy Period & Limits ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Calendar className="size-4 text-primary" /> Policy Period & Limits
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Effective Date</label>
                <StandardDatePicker value={formData.effectiveDate} onChange={date => setFormData({ ...formData, effectiveDate: date })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Expiry Date</label>
                <StandardDatePicker value={formData.expiryDate} onChange={date => setFormData({ ...formData, expiryDate: date })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Application Limit Period</label>
                <select value={formData.period} onChange={e => setFormData({ ...formData, period: e.target.value })}
                  className={inputCls}>
                  {PERIOD_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Max Applications per Period</label>
                <input type="number" value={formData.maxApplicationsPerPeriod} onChange={e => setFormData({ ...formData, maxApplicationsPerPeriod: e.target.value })}
                  className={inputCls} placeholder="Unlimited" />
              </div>
            </div>
          </div>

          {/* ── Save / Cancel Buttons ── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-card hover:bg-muted text-foreground font-semibold rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? 'Saving...' : (id ? 'Update Policy' : 'Save Policy')}
            </button>
          </div>

        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title={id ? "Discard Loan Policy Changes?" : "Discard New Loan Policy?"}
        message="Are you sure you want to cancel? Any loan policy details entered in this form will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelConfirm(false);
          navigate('/loans-advances?tab=policies');
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

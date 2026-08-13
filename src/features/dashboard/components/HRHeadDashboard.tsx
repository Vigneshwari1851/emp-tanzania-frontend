import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Users, Briefcase, TrendingUp, UserMinus, UserPlus,
  FileText, Target, AlertTriangle, DollarSign,
  ChevronRight, Crown, BarChart3, CheckCircle2,
  Clock, Zap, Award, Activity, Loader2
} from 'lucide-react';
import axiosInstance from '@/shared/services/axiosInstance';
import { getEmployees } from '@/features/employees/services/employees';
import { getDepartments } from '@/features/organization/services/departments';

const quickActions = [
  { label: "Approve offer letter", icon: FileText, color: "text-primary-500 bg-primary/10", path: "/recruitment" },
  { label: "View org report", icon: BarChart3, color: "text-emerald-500 bg-emerald-50", path: "/reports" },
  { label: "Set KPI targets", icon: Target, color: "text-amber-500 bg-amber-50", path: "/performance" },
  { label: "View alerts", icon: AlertTriangle, color: "text-rose-500 bg-rose-50", path: "/alerts" },
  { label: "Payroll summary", icon: DollarSign, color: "text-sky-500 bg-sky-50", path: "/payroll" },
  { label: "Headcount plan", icon: UserPlus, color: "text-purple-500 bg-purple-50", path: "/recruitment" },
];

const badgeStyles: Record<string, string> = {
  'b-green': 'bg-emerald-50 text-emerald-700',
  'b-amber': 'bg-amber-50 text-amber-700',
  'b-red': 'bg-rose-50 text-rose-700',
};

export function HRHeadDashboard() {
  const navigate = useOrgNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getEmployees().catch(() => [] as any[]),
      getDepartments().catch(() => []),
      axiosInstance.get('/payroll/runs').then(r => r.data.data || []).catch(() => []),
      axiosInstance.get('/leaves/pending').then(r => r.data.data || []).catch(() => []),
    ]).then(([emps, depts, payroll, leaves]) => {
      if (cancelled) return;
      setEmployees(emps);
      setDepartments(depts);
      setPayrollRuns(payroll);
      setPendingLeaves(leaves);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totalHeadcount = employees.length;
  const activeEmployees = employees.filter((e: any) => e.status !== false && e.status !== 'inactive');
  const deptGroups = departments.map((d: any) => {
    const count = employees.filter((e: any) => {
      const deptId = e.details?.department_id || e.department_id;
      return deptId === d.id;
    }).length;
    return { ...d, count };
  });
  const maxDeptCount = Math.max(...deptGroups.map((d: any) => d.count), 1);

  const genderCounts: Record<string, number> = {};
  employees.forEach((e: any) => {
    const g = e.details?.gender || 'Unknown';
    genderCounts[g] = (genderCounts[g] || 0) + 1;
  });
  const totalGendered = Object.values(genderCounts).reduce((a, b) => a + b, 0) || 1;
  const malePct = Math.round(((genderCounts['Male'] || 0) / totalGendered) * 100);
  const femalePct = Math.round(((genderCounts['Female'] || 0) / totalGendered) * 100);
  const otherPct = 100 - malePct - femalePct;

  const pendingLeaveCount = pendingLeaves.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              +{activeEmployees.length} <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Total headcount</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{totalHeadcount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{activeEmployees.length} active</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <UserMinus className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              {pendingLeaveCount} pending <Clock className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Pending approvals</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{pendingLeaveCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Leaves · expenses · docs</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              {departments.length} depts <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Departments</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{departments.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{employees.filter((e: any) => !e.details?.department_id).length} unassigned</p>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              {payrollRuns.length} runs <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Payroll runs</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">{payrollRuns.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Last: {payrollRuns[0]?.month || 'N/A'}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-4 h-0.5 rounded-full bg-gradient-to-r from-primary-500 to-purple-500" /> Quick actions
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {quickActions.map((a, i) => (
            <div
              key={i}
              onClick={() => navigate(a.path)}
              className="bg-card rounded-lg border border-border/70 shadow-sm p-5 flex flex-col items-center gap-2.5 hover:border-primary-200 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.color} dark:bg-transparent shadow-sm group-hover:shadow-sm transition-all group-hover:scale-110`}>
                <a.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-slate-600 text-center leading-tight font-medium">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Headcount by department</h3>
            <span className="text-[11px] font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline transition-colors">Full breakdown</span>
          </div>
          {deptGroups.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-6">No department data available</p>
          ) : (
            <div className="space-y-3">
              {deptGroups.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground w-20 flex-shrink-0 truncate">{d.department_name || d.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(d.count / maxDeptCount) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground w-8 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-2 bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Gender diversity</h3>
          </div>
          <div className="flex items-center justify-center h-28">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                {malePct > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#4338ca" strokeWidth="14"
                    strokeDasharray={`${malePct * 2.513} ${100 * 2.513}`} strokeLinecap="round" />
                )}
                {femalePct > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#db2777" strokeWidth="14"
                    strokeDasharray={`${femalePct * 2.513} ${100 * 2.513}`} strokeDashoffset={`-${malePct * 2.513}`} strokeLinecap="round" />
                )}
                {otherPct > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#9ca3af" strokeWidth="14"
                    strokeDasharray={`${otherPct * 2.513} ${100 * 2.513}`} strokeDashoffset={`-${(malePct + femalePct) * 2.513}`} strokeLinecap="round" />
                )}
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary" /> Male {malePct}%</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded bg-pink-600" /> Female {femalePct}%</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-400" /> Others {otherPct}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Policy & compliance tracker</h3>
            <span className="text-[11px] font-medium text-primaryhover:text-blue-700 cursor-pointer no-underline transition-colors">Review all</span>
          </div>
          <div className="space-y-0">
            {[
              { label: "POSH training completion", value: "94%", badge: "On track", badgeColor: "b-green" },
              { label: "PF filing — May 2025", value: "", badge: "Filed", badgeColor: "b-green" },
              { label: "ESIC compliance", value: "", badge: "Compliant", badgeColor: "b-green" },
              { label: "Gratuity provisions", value: "", badge: "Review due", badgeColor: "b-amber" },
              { label: "Appraisal cycle Q2", value: "", badge: "Starts in 5 days", badgeColor: "b-red" },
              { label: "Background check pending", value: `${employees.filter((e: any) => !e.details?.certifications).length} employees`, badge: "", badgeColor: "" },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-border/20 last:border-0">
                <span className="text-[12px] text-slate-600">{c.label}</span>
                <span className="text-[12px] font-medium text-foreground flex items-center gap-2">
                  {c.value && <span className="text-muted-foreground">{c.value}</span>}
                  {c.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeStyles[c.badgeColor] || 'bg-muted/50 text-slate-600'}`}>
                      {c.badge}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border/80 shadow-sm p-5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-medium leading-6 text-foreground flex items-center gap-2">Critical alerts</h3>
          </div>
          <div className="space-y-0">
            {[
              { priority: "info", text: `${totalHeadcount} employees across ${departments.length} departments`, time: "Live", meta: "Org overview", metaColor: "text-primary" },
              { priority: "medium", text: `${pendingLeaveCount} pending leave requests`, time: "Needs attention", meta: "Pending", metaColor: "text-amber-600" },
              { priority: "success", text: `${deptGroups.filter((d: any) => d.count > 0).length} departments with active headcount`, time: "Auto", meta: "Info", metaColor: "text-emerald-600" },
              { priority: "info", text: `Payroll has ${payrollRuns.length} completed runs`, time: "Auto", meta: "Payroll", metaColor: "text-primary" },
              { priority: "medium", text: `${employees.filter((e: any) => !e.details?.emergency_contact).length} employees missing emergency contact`, time: "Review needed", meta: "Compliance", metaColor: "text-amber-600" },
            ].map((a, i) => (
              <div key={i} className="flex gap-2.5 py-2.5 border-b border-slate-50 dark:border-border/20 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  a.priority === 'high' ? 'bg-rose-500' : a.priority === 'medium' ? 'bg-amber-500' : a.priority === 'success' ? 'bg-emerald-500' : 'bg-primary-500'
                }`} />
                <div>
                  <p className="text-[12px] text-foreground leading-relaxed">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.time} · <span className={a.metaColor}>{a.meta}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useParams } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { getAllLeavePolicies, getMyRequests } from '@/features/leaves/services/leaves';
import { toast } from "sonner";

export function LeavePolicyView() {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const [policy, setPolicy] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;

    const toastId = toast.loading("Generating PDF document...");

    try {
      const element = documentRef.current;
      // Temporarily hide things if needed (though we're capturing only the ref)
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${policy.policy_name}_Policy.pdf`);

      toast.success("Policy downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Please try again.", { id: toastId });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [policiesRes, leavesRes] = await Promise.all([
          getAllLeavePolicies(),
          getMyRequests(),
        ]);

        const allPolicies = policiesRes.data || [];
        const foundPolicy = allPolicies.find((p: any) => String(p.id) === id);

        if (foundPolicy) {
          setPolicy(foundPolicy);
        } else {
          toast.error("Policy not found");
          navigate("/leave-management");
        }

        setLeaves(leavesRes.data || []);
      } catch (error) {
        console.error("Error fetching policy:", error);
        toast.error("Failed to load policy details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!policy) return null;

  const totalDays = Number(policy.days_per_year || 0);
  const carryForward = policy.carry_forward_days || 0;
  const accrualRate = policy.accrual_rate || 'N/A';
  const isPaid = policy.leave_category === 'paid';
  const policyColor = policy.leave_color || 'blue';

  const colorMap: Record<string, string> = {
    blue: '#3b82f6', red: '#ef4444', green: '#22c55e', purple: '#a855f7',
    pink: '#ec4899', primary: '#6366f1', amber: '#f59e0b', teal: '#14b8a6',
    orange: '#f97316', yellow: '#eab308', cyan: '#06b6d4',
  };
  const accentColor = colorMap[policyColor] || '#3b82f6';

  const usedDays = leaves
    .filter((l: any) => l.status?.toUpperCase() === 'APPROVED' && String(l.leave_policy_id) === String(policy.id))
    .reduce((sum: number, l: any) => sum + Number(l.duration || l.days || 0), 0);
  const balance = Math.max(0, totalDays - usedDays);

  return (
    <div className="h-full bg-muted flex flex-col">
      {/* Top Navigation Bar */}
      <div className="sticky top-[-1rem] z-20 bg-card border-b border-border py-3 flex items-center justify-between shadow-sm no-print mx-[-1.5rem] px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/leave-management")}
            className="icon-circle-btn"
          >
            <ArrowLeft />
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-sm font-semibold text-foreground">Leave Type Document: {policy.policy_name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {policy.document_url && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary text-primary hover:bg-primary/10"
              onClick={() => window.open(policy.document_url, '_blank')}
            >
              <Download className="w-4 h-4" />
              Download Official Document
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/95"
            onClick={handleDownloadPDF}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="flex-1 overflow-y-auto py-8 px-4">
        <div
          ref={documentRef}
          className="mx-auto bg-card relative print:shadow-none print:m-0"
          style={{
            maxWidth: '800px',
            boxShadow: '0 4px 25px rgba(0,0,0,0.05)',
            borderRadius: '4px',
            padding: '64px 80px',
            minHeight: '1000px',
          }}
        >
          {/* Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            style={{ opacity: 0.025, fontSize: 100, fontWeight: 800, letterSpacing: 12, color: '#64748b', transform: 'rotate(-25deg)' }}
          >
            OFFICIAL LEAVE TYPE
          </div>

          {/* Color Accent Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 rounded-l"
            style={{ backgroundColor: accentColor }}
          />

          {/* Document Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <div
                className="w-16 h-16 rounded-sm flex items-center justify-center mb-4"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-foreground  leading-none">
                {policy.policy_name}
              </h2>
              <p className="text-xs text-muted-foreground mt-3 font-semibold tracking-[0.2em]">
                Employee Benefits & Leave Types • Vol. {new Date().getFullYear()}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                  isPaid
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {isPaid ? '● PAID LEAVE' : '● UNPAID LEAVE'}
              </span>
              <p className="text-[10px] text-muted-foreground mt-3 font-medium">Ref: HR/LP-{String(policy.id).padStart(3, '0')}</p>
            </div>
          </div>

          {/* Table of Contents Look-alike bar */}
          <div className="h-0.5 w-full bg-muted mb-10" />

          {/* Content sections */}
          <div className="space-y-10">
            {/* 1. Purpose */}
            <section>
              <h3 className="flex items-center gap-3 text-sm font-bold  mb-3" style={{ color: accentColor }}>
                <span className="w-6 h-6 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: `${accentColor}15` }}>01</span>
                Purpose
              </h3>
              <p className="text-[15px] text-slate-600 leading-relaxed indent-8">
                The purpose of this document is to facilitate effective administration and management of {policy.policy_name.toLowerCase()} for eligible employees.
                {policy.description ? ` ${policy.description}` : ' This document outlines the procedures, benefits, and responsibilities governing the use of this leave type within the organization.'}
              </p>
            </section>

            {/* 2. Scope */}
            <section>
              <h3 className="flex items-center gap-3 text-sm font-bold  mb-3" style={{ color: accentColor }}>
                <span className="w-6 h-6 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: `${accentColor}15` }}>02</span>
                Scope
              </h3>
              <p className="text-[15px] text-slate-600 leading-relaxed">
                This policy applies strictly to all employees currently on the payroll. The administration and final approval of such leave requests remain at the sole discretion of the management. No claims can be made beyond what is explicitly documented herein.
              </p>
            </section>

            {/* 3. Eligibility */}
            <section>
              <h3 className="flex items-center gap-3 text-sm font-bold  mb-3" style={{ color: accentColor }}>
                <span className="w-6 h-6 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: `${accentColor}15` }}>03</span>
                Eligibility Guidelines
              </h3>
              <div className="bg-muted/50 border-l-4 rounded-r-lg p-5" style={{ borderColor: accentColor }}>
                <ul className="space-y-3">
                  {[
                    "All permanent employees are eligible for this leave after completing their notice period.",
                    "Probationary employees may apply only under exceptional circumstances.",
                    "Contractual staff are governed by the terms specified in their respective contracts.",
                    "Leave balance is calculated on a pro-rata basis from the date of joining."
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-foreground">
                      <span className="font-bold shrink-0" style={{ color: accentColor }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 4. Entitlement Table */}
            <section>
              <h3 className="flex items-center gap-3 text-sm font-bold  mb-4" style={{ color: accentColor }}>
                <span className="w-6 h-6 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: `${accentColor}15` }}>04</span>
                Entitlement Framework
              </h3>
              <div className="border border-border rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-6 py-3 text-left font-semibold text-black text-sm">Parameter</th>
                      <th className="px-6 py-3 text-left font-semibold text-black text-sm">Detailed Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { l: "Annual Quota", v: `${totalDays} Days per Year` },
                      { l: "Carry Forward Limit", v: Number(carryForward) > 0 ? `Up to ${carryForward} Days` : "Not Applicable" },
                      { l: "Accrual Rate", v: `${accrualRate} ${accrualRate !== 'N/A' ? 'Days/Month' : ''}` },
                      { l: "Compensation", v: isPaid ? "Paid (Full Basic Salary)" : "Unpaid Leave" },
                      { l: "Current Usage", v: `${usedDays} Days Taken` },
                      { l: "Residual Balance", v: `${balance} Days`, h: true }
                    ].map((row, i) => (
                      <tr key={i} className={row.h ? "bg-muted/50/80" : ""}>
                        <td className="px-6 py-3 text-muted-foreground font-medium">{row.l}</td>
                        <td className={`px-6 py-3 font-semibold ${row.h ? "text-lg underline underline-offset-4 decoration-2" : "text-foreground"}`} style={{ color: row.h ? accentColor : undefined }}>
                          {row.v}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Rules */}
            <section>
              <h3 className="flex items-center gap-3 text-sm font-bold  mb-3" style={{ color: accentColor }}>
                <span className="w-6 h-6 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: `${accentColor}15` }}>05</span>
                Governance Rules
              </h3>
              <div className="space-y-4 text-[14px] text-slate-600">
                <p>
                  1. Leave must be filed at least 15 days in advance for planned absences exceeding 3 days.
                </p>
                <p>
                  2. {Number(carryForward) > 0 ? `Unused leave up to ${carryForward} days will be credited to the next cycle.` : "Unused leave will lapse at the end of the calendar year and won't be encashed."}
                </p>
                <p>
                  3. Management reserves the right to cancel approved leaves in case of critical business requirements.
                </p>
              </div>
            </section>
          </div>

          {/* Document Footer */}
          <div className="mt-20 pt-8 border-t border-border flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-bold er">Approved Electronic Document</p>
              <p className="text-[10px] text-muted-foreground">Ver: 1.0.4 • HRMS System-Generated</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1">Digitally Signed By</p>
              <div className="h-8 flex items-center justify-end">
                <span className="italic text-lg text-muted-foreground">Chief Human Resources Officer</span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-2 ">Page 1 of 1 • Official Copy</p>
            </div>
          </div>
        </div>
      </div>
      {/* Print-specific Styles */}
      <style>{`
        @media print {
          .sticky, .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
          }
          .overflow-y-auto {
            overflow: visible !important;
          }
          div[style*="max-width: 800px"] {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 20px !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
      `}</style>
    </div>
  );
}


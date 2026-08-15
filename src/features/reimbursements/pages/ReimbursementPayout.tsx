import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import type { EmployeeClaim } from './ReimbursementModule';
import * as payrollService from '@/features/payroll/services/payroll';

interface PaymentFormState {
  method: 'Payroll' | 'Bank Transfer' | 'Cash' | 'UPI' | 'Other';
  reference: string;
  integrateWithPayroll: boolean;
}

const initialPaymentForm: PaymentFormState = {
  method: 'Bank Transfer',
  reference: '',
  integrateWithPayroll: false,
};

export function ReimbursementPayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const [claim, setClaim] = useState<EmployeeClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(initialPaymentForm);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const loadClaim = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const allClaims = await payrollService.getAllClaims();
        
        let found = Array.isArray(allClaims) ? allClaims.find((bc: any) => {
          const bcIdStr = String(bc.id);
          return bcIdStr === id || 
                 `clm-db-${bc.id}` === id || 
                 `CLM-2026-${String(bc.id).padStart(3, '0')}` === id ||
                 `CLM-${String(bc.id).padStart(4, '0')}` === id ||
                 id.includes(bcIdStr);
        }) : null;

        if (found) {
          const deptName = found.user?.details?.department?.department_name || found.department || 'General';
          const firstName = found.user?.details?.first_name || '';
          const lastName = found.user?.details?.last_name || '';
          const empName = found.employeeName || `${firstName} ${lastName}`.trim() || found.user?.username || 'Unknown';
          const claimIdNum = Number(found.dbId || found.id || 0);

          const normalized: EmployeeClaim = {
            id: found.id || `clm-db-${claimIdNum}`,
            dbId: claimIdNum,
            claimNumber: found.claimNumber || `CLM-2026-${String(claimIdNum).padStart(3, '0')}`,
            employeeId: found.employeeId || `EMP-${found.user_id || 0}`,
            employeeName: empName,
            department: String(deptName),
            policyId: found.policyId || '',
            policyName: found.policyName || found.type || 'General',
            submitDate: found.submitDate || (found.expense_date ? new Date(found.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            amount: Number(found.amount || 0),
            currency: found.currency || 'INR',
            status: found.status || 'Pending Finance Approval',
            items: found.items || [{ id: `item-${claimIdNum}`, description: found.description || '', category: found.type || '', amount: Number(found.amount || 0), date: found.expense_date ? new Date(found.expense_date).toISOString().split('T')[0] : '', receiptUrl: found.proof_url || undefined, receiptName: found.proof_url ? (found.proof_url.split('/').pop() || 'Receipt') : undefined }],
            comments: found.comments || [],
            history: found.history || []
          };
          setClaim(normalized);
        } else {
          setClaim(null);
        }
      } catch (error) {
        console.error('Unable to load reimbursement claim:', error);
        toast.error('Failed to load payout details.');
      } finally {
        setLoading(false);
      }
    };

    loadClaim();
  }, [id]);

  const processClaimPayment = async () => {
    const isPayrollRoute = paymentForm.method === 'Payroll';

    if (!isPayrollRoute && !paymentForm.reference.trim()) {
      toast.error('Please enter a payment transaction reference number');
      return;
    }

    if (!claim?.dbId) {
      toast.error('Claim is not available for payment.');
      return;
    }

    try {
      if (isPayrollRoute) {
        await payrollService.updateClaimPaymentMode(claim.dbId, 'Salary Payroll');
      } else {
        await payrollService.processClaimPayment(claim.dbId, {
          payment_reference: paymentForm.reference,
          payment_date: new Date().toISOString().split('T')[0],
          payment_mode: paymentForm.method,
        });
      }

      const nextStatus = isPayrollRoute ? 'Pending Payroll' as const : 'Paid' as const;
      const detailsText = isPayrollRoute
        ? `Tagged for payroll disbursement in ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} salary cycle`
        : `Paid via ${paymentForm.method}. Ref: ${paymentForm.reference}`;

      setClaim(prev => prev ? {
        ...prev,
        status: nextStatus,
        paymentDetails: isPayrollRoute ? undefined : {
          method: paymentForm.method,
          reference: paymentForm.reference,
          paidDate: new Date().toISOString().split('T')[0],
        },
        history: [
          ...prev.history,
          {
            action: isPayrollRoute ? 'Sent to Payroll' : 'Payment Completed',
            user: 'Finance Admin',
            role: 'Finance',
            date: new Date().toISOString().split('T')[0],
            details: detailsText,
          },
        ],
      } : prev);

      toast.success(isPayrollRoute ? 'Claim sent to Payroll! It will be included in the next salary cycle.' : 'Direct payment recorded and logged successfully!');
    } catch (error) {
      console.error('Failed to process payout:', error);
      toast.error('Failed to record payment.');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pb-12">
      <div className="py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Reimbursements</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Record Payout Details</h1>
            <p className="text-sm text-slate-500 mt-1">Approve ledger status and log bank reference</p>
          </div>
          <button
            onClick={() => navigate('/reimbursements')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hub
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">Loading payout details…</div>
        ) : !claim ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-700 shadow-sm">
            Claim could not be found. Please return to the reimbursements hub.
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Select Payout Route</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, method: 'Payroll', integrateWithPayroll: true }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      paymentForm.method === 'Payroll'
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-slate-200 bg-card hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark className="w-4 h-4 text-violet-600" />
                      <span className="text-xs font-extrabold text-slate-800">Payroll Integration</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Add to next salary cycle. Employee gets it with their payslip.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, method: 'Bank Transfer', integrateWithPayroll: false }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      paymentForm.method !== 'Payroll'
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-card hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-extrabold text-slate-800">Direct Payout</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Pay immediately via bank transfer, UPI, or cash.</p>
                  </button>
                </div>
              </div>

              {paymentForm.method !== 'Payroll' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Payment Method</label>
                    <select
                      value={paymentForm.method}
                      onChange={e => setPaymentForm(prev => ({ ...prev, method: e.target.value as PaymentFormState['method'] }))}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-card"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash Payout</option>
                      <option value="Other">Other Gateway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                      Transaction Reference / UTR Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UTR89327498"
                      value={paymentForm.reference}
                      onChange={e => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </>
              )}

              {paymentForm.method === 'Payroll' && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex gap-3 text-xs">
                  <Landmark className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-violet-800 block">Payroll Integration Mode</span>
                    <p className="text-violet-600 mt-1">This claim will be tagged as <strong>"Pending Payroll"</strong> and the reimbursement amount will be automatically added as an earning line item in the employee's next payslip when you run payroll.</p>
                    <p className="text-violet-500 mt-1">No manual reference number is needed — the payroll run will auto-generate a reference (e.g., PAYROLL-[ID]).</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={processClaimPayment}
                className={`font-bold px-5 py-2.5 rounded-lg shadow transition ${
                  paymentForm.method === 'Payroll'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {paymentForm.method === 'Payroll' ? '📋 Send to Payroll' : '💰 Mark as Paid'}
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={showCancelConfirm}
        onConfirm={() => navigate('/reimbursements')}
        onCancel={() => setShowCancelConfirm(false)}
        title="Discard changes?"
        message="Are you sure you want to cancel? Any unsaved changes will be lost."
        confirmLabel="Discard"
        cancelLabel="Continue editing"
        confirmColor="red"
      />
    </div>
  );
}

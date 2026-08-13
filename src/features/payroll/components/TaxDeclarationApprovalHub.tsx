import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { RejectReasonDialog } from '@/shared/components/ui/RejectReasonDialog';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Building2, 
  Search, 
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import * as payrollService from '../services/payroll';

interface PendingDeclaration {
  id: number;
  user_id: number;
  section: string;
  instrument: string;
  amount: number;
  status: string;
  financial_year: string;
  proof_url?: string;
  submitted_on: string;
  remarks?: string;
  user?: {
    username: string;
    email: string;
    details?: {
      first_name?: string;
      last_name?: string;
      department?: { department_name?: string };
    };
  };
}

export const TaxDeclarationApprovalHub: React.FC<{ userRole?: string }> = () => {
  const params = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const targetId = params.id || searchParams.get('id');

  const [items, setItems] = useState<PendingDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');
  const [remarksInput, setRemarksInput] = useState<Record<number, string>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (targetId) {
      setSearchTerm(targetId);
    }
  }, [targetId]);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getPendingTaxDeclarations();
      setItems(data || []);
    } catch (err: any) {
      toast.error('Failed to load pending tax declarations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      setProcessingId(id);
      const remarks = remarksInput[id] || '';
      await payrollService.approveTaxDeclaration(id, remarks);
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          const sUpper = (item.status || '').toUpperCase();
          let nextStatus = 'Approved';
          if (sUpper.includes('MANAGER')) nextStatus = 'Pending HR Approval';
          else if (sUpper.includes('HR')) nextStatus = 'Pending Finance Approval';
          else nextStatus = 'Approved';
          return { ...item, status: nextStatus };
        }
        return item;
      }));
      toast.success('Tax declaration status updated successfully!');
      fetchPending();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const [rejectItem, setRejectItem] = useState<{ id: number; title: string } | null>(null);

  const handleRejectSubmit = async (id: number, reason: string) => {
    try {
      setProcessingId(id);
      await payrollService.rejectTaxDeclaration(id, reason);
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'Rejected' } : item));
      toast.success('Tax declaration rejected');
      fetchPending();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const empName = `${item.user?.details?.first_name || ''} ${item.user?.details?.last_name || ''} ${item.user?.username || ''}`.toLowerCase();
    const matchSearch = item.id.toString() === searchTerm.trim() || item.id.toString().includes(searchTerm.trim()) || empName.includes(searchTerm.toLowerCase()) || item.section.toLowerCase().includes(searchTerm.toLowerCase()) || item.instrument.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSection = filterSection === 'ALL' || item.section === filterSection;
    return matchSearch && matchSection;
  });

  const getBadgeStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('MANAGER')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('HR')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s.includes('FINANCE')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-bold text-primary">Tax Declarations Verification Hub</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            3-Stage Approval Pipeline: Manager Review → HR Verification → Finance TDS Approval
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPending} disabled={loading} className="gap-2 text-xs font-bold cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employee or section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', '80C', '80D', '80E', '80CCD', 'HRA'].map((sec) => (
              <button
                key={sec}
                onClick={() => setFilterSection(sec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  filterSection === sec
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-border'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading pending tax declarations...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
            <p className="text-sm font-bold text-foreground">No pending declarations in your queue</p>
            <p className="text-xs text-muted-foreground">All submitted tax declarations have been verified for this stage.</p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {filteredItems.map((item) => {
              const empName = `${item.user?.details?.first_name || ''} ${item.user?.details?.last_name || ''}`.trim() || item.user?.username || 'Employee';
              const dept = item.user?.details?.department?.department_name || 'General';

              return (
                <div key={item.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-foreground text-sm">{empName}</span>
                        <span className="text-xs text-muted-foreground">({item.user?.email})</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {dept}</span>
                        <span>•</span>
                        <span>Submitted on {new Date(item.submitted_on).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>FY {item.financial_year}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.section} · {item.instrument}</p>
                        <p className="text-lg font-black text-primary-600 dark:text-primary-400">₹{Number(item.amount).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {item.proof_url && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={item.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary/10 dark:hover:bg-primary/20 text-primary-700 dark:text-primary text-xs font-bold rounded-lg border border-primary-200 dark:border-primary/30 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Uploaded Proof Document
                      </a>
                    </div>
                  )}

                  {/* Verification Controls */}
                  {String(item.status || '').toUpperCase().includes('APPROVED') && !String(item.status || '').toUpperCase().includes('PENDING') ? (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Fully Approved & Locked in TDS Engine
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRejectItem({ id: item.id, title: `${item.section} - ${item.instrument}` })}
                        disabled={processingId === item.id}
                        className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium cursor-pointer"
                      >
                        Revoke Approval
                      </Button>
                    </div>
                  ) : String(item.status || '').toUpperCase().includes('REJECTED') ? (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-700 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <XCircle className="w-4 h-4 text-rose-600" /> Request Rejected
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApprove(item.id)}
                        disabled={processingId === item.id}
                        className="text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium cursor-pointer"
                      >
                        Re-open & Approve
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Add review comment or approval note (optional)..."
                        value={remarksInput[item.id] || ''}
                        onChange={(e) => setRemarksInput({ ...remarksInput, [item.id]: e.target.value })}
                        className="w-full sm:flex-1 px-3 py-1.5 text-xs border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item.id)}
                          disabled={processingId === item.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 px-4 cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectItem({ id: item.id, title: `${item.section} - ${item.instrument}` })}
                          disabled={processingId === item.id}
                          className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold text-xs gap-1 px-4 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <RejectReasonDialog
        isOpen={!!rejectItem}
        onClose={() => setRejectItem(null)}
        onConfirm={(reason) => {
          if (rejectItem) {
            handleRejectSubmit(rejectItem.id, reason);
            setRejectItem(null);
          }
        }}
        title="Reject Tax Declaration"
        description={`Please state the reason for rejecting ${rejectItem?.title || 'this declaration'}.`}
      />
    </Card>
  );
};

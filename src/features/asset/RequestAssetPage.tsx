import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { Textarea } from '@/shared/components/ui/payroll-lib/textarea';
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  ClipboardList,
  Clock
} from 'lucide-react';

export function RequestAssetPage() {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState<any[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initialize with state if provided
  const prefilled = location.state || {};
  const [requestType, setRequestType] = useState(prefilled.type || 'NEW');
  const [categoryId, setCategoryId] = useState('');
  const [specificAssetId, setSpecificAssetId] = useState(prefilled.assetId?.toString() || '');
  const [reason, setReason] = useState('');
  const [subCategory, setSubCategory] = useState(''); // E.g., Issue Type, Condition
  const [priority, setPriority] = useState('MEDIUM');

  // Reset subCategory when requestType changes
  useEffect(() => {
    setSubCategory('');
  }, [requestType]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setInitialLoading(true);
      const [categoriesRes, assignmentsRes] = await Promise.all([
        api.get('/assets/categories'),
        api.get('/assignments/my-assets')
      ]);
      setCategories(categoriesRes.data.data);
      setAssignedAssets(assignmentsRes.data.data.filter((a: any) => a.status === 'ACTIVE'));
    } catch (err) {
      toast.error('Failed to load required data');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error('Please provide a justification');
      return;
    }
    if (requestType === 'NEW' && !categoryId) {
      toast.error('Please select an asset category');
      return;
    }
    if ((requestType === 'REPAIR' || requestType === 'REPLACEMENT') && !specificAssetId) {
      toast.error('Please select the asset');
      return;
    }

    try {
      setLoading(true);
      await api.post('/assets/requests', {
        requestType,
        assetCategoryId: requestType === 'NEW' ? Number(categoryId) : undefined,
        specificAssetId: requestType !== 'NEW' ? Number(specificAssetId) : undefined,
        reason,
        subCategory,
        priority
      });
      toast.success('Requisition submitted successfully');
      navigate('/my-assets');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 font-poppins">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Initializing requisition portal...</p>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 w-full max-w-full mx-auto animate-in fade-in duration-500 bg-muted/30 min-h-screen font-poppins">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/my-assets')}
            className="hover:bg-muted rounded-full text-muted-foreground transition-colors h-10 w-10 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center justify-center shrink-0 text-primary">
            <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Asset Requisition</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Submit a request for equipment procurement or maintenance</p>
          </div>
          </div>
        </div>

      <div className="w-full max-w-full mx-auto mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Main Form Area ──────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            <Card className="rounded-sm shadow-sm border border-border bg-card overflow-hidden">
              <CardHeader className="bg-muted border-b border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">Request Details</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-1">
                      Please provide accurate information to expedite your request.
                    </CardDescription>
                  </div>
                  <ClipboardList className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">

                  {/* Step 1: Configuration */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request Type</label>
                        <Select value={requestType} onValueChange={setRequestType}>
                          <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW" className="text-sm">New Procurement</SelectItem>
                            <SelectItem value="REPAIR" className="text-sm">Service & Repair</SelectItem>
                            <SelectItem value="REPLACEMENT" className="text-sm">Asset Replacement</SelectItem>
                            <SelectItem value="RETURN" className="text-sm">Decommission (Return)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority Level</label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW" className="text-sm">Low - No Immediate Impact</SelectItem>
                            <SelectItem value="MEDIUM" className="text-sm">Medium - Standard</SelectItem>
                            <SelectItem value="HIGH" className="text-sm">High - Operational Impact</SelectItem>
                            <SelectItem value="URGENT" className="text-sm font-semibold text-red-600 dark:text-red-400">Urgent - Critical Requirement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Dynamic Asset Selection & Categorization */}
                  <div className="space-y-6">
                    {requestType === 'NEW' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desired Asset Category</label>
                          <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()} className="text-sm">
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Procurement Type</label>
                          <Select value={subCategory} onValueChange={setSubCategory}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Select requirement type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="New Hire Allocation" className="text-sm">New Hire Allocation</SelectItem>
                              <SelectItem value="Project Requirement" className="text-sm">Project Requirement</SelectItem>
                              <SelectItem value="Role Upgrade" className="text-sm">Role Upgrade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {requestType === 'REPAIR' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Asset for Repair</label>
                          <Select value={specificAssetId} onValueChange={setSpecificAssetId}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Identify your equipment..." />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedAssets.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-xs italic">No active assets assigned to you</div>
                              ) : assignedAssets.map(a => (
                                <SelectItem key={a.asset.id} value={a.asset.id.toString()} className="text-sm">
                                  {a.asset.name} ({a.asset.asset_code || a.asset.serial_number})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Issue Type</label>
                          <Select value={subCategory} onValueChange={setSubCategory}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Categorize the issue..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Hardware Failure" className="text-sm">Hardware Failure (Boot, Screen, Battery)</SelectItem>
                              <SelectItem value="Software/OS Issue" className="text-sm">Software / OS Issue</SelectItem>
                              <SelectItem value="Physical Damage" className="text-sm">Physical Damage (Spill, Drop)</SelectItem>
                              <SelectItem value="Network/Connectivity" className="text-sm">Network / Connectivity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {requestType === 'REPLACEMENT' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Asset to Replace</label>
                          <Select value={specificAssetId} onValueChange={setSpecificAssetId}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Identify your equipment..." />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedAssets.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-xs italic">No active assets assigned to you</div>
                              ) : assignedAssets.map(a => (
                                <SelectItem key={a.asset.id} value={a.asset.id.toString()} className="text-sm">
                                  {a.asset.name} ({a.asset.asset_code || a.asset.serial_number})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason for Replacement</label>
                          <Select value={subCategory} onValueChange={setSubCategory}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Why is replacement needed?..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="End of Lifecycle/Outdated" className="text-sm">End of Lifecycle / Outdated</SelectItem>
                              <SelectItem value="Beyond Repair" className="text-sm">Damaged (Beyond Repair)</SelectItem>
                              <SelectItem value="Lost or Stolen" className="text-sm">Lost or Stolen</SelectItem>
                              <SelectItem value="Performance/Specs Upgrade" className="text-sm">Performance / Specs Upgrade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {requestType === 'RETURN' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Asset to Return</label>
                          <Select value={specificAssetId} onValueChange={setSpecificAssetId}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Identify your equipment..." />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedAssets.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-xs italic">No active assets assigned to you</div>
                              ) : assignedAssets.map(a => (
                                <SelectItem key={a.asset.id} value={a.asset.id.toString()} className="text-sm">
                                  {a.asset.name} ({a.asset.asset_code || a.asset.serial_number})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Return Condition</label>
                          <Select value={subCategory} onValueChange={setSubCategory}>
                            <SelectTrigger className="h-10 border-border rounded-sm focus:ring-2 focus:ring-primary bg-card text-sm text-foreground">
                              <SelectValue placeholder="Current condition of asset..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Fully Functional" className="text-sm">Fully Functional / Good Condition</SelectItem>
                              <SelectItem value="Minor Wear & Tear" className="text-sm">Minor Wear & Tear</SelectItem>
                              <SelectItem value="Damaged/Not Working" className="text-sm">Damaged / Not Working</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Justification */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {requestType === 'NEW' && 'Business Justification'}
                      {requestType === 'REPAIR' && 'Issue Details & Steps to Reproduce'}
                      {requestType === 'REPLACEMENT' && 'Additional Context & Requirements'}
                      {requestType === 'RETURN' && 'Reason for Return & Handover Notes'}
                    </label>
                    <Textarea 
                      value={reason} 
                      onChange={e => setReason(e.target.value)}
                      placeholder={
                        requestType === 'NEW' ? "Explain why this procurement is needed for your role or project..." :
                        requestType === 'REPAIR' ? "Describe the exact issue, error messages, and when it started..." :
                        requestType === 'REPLACEMENT' ? "Provide details on why the current asset is insufficient and what specs you need..." :
                        "Provide any relevant details about the return process or asset condition..."
                      }
                      className="min-h-[120px] border-border rounded-sm focus:ring-2 focus:ring-primary p-3 text-sm bg-card text-foreground"
                    />
                    <p className="text-[11px] text-muted-foreground mt-2 font-medium italic">
                      {requestType === 'NEW' || requestType === 'REPLACEMENT' ? 'Detailed justification speeds up the manager and IT approval process.' : 'Clear details help the IT support team resolve your request faster.'}
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-6 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Secure Submission Active
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/my-assets')}
                        className="h-10 px-4 font-semibold text-muted-foreground hover:bg-muted"
                      >
                        Cancel
                      </Button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-8 shadow-sm border-none rounded-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Requisition"}
                      </button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* ── Contextual Sidebar ───────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-sm shadow-sm border border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-sm text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Asset Requisition Policy
                </h3>
                <div className="space-y-4 text-[11px] text-muted-foreground leading-relaxed font-medium">
                  <p>
                    Employees may submit asset requisition requests for official business purposes including equipment procurement, replacement, software access, or maintenance support through the Employee Experience Portal.
                  </p>
                  <p>
                    All requests must include valid business justification and are subject to manager and IT approval based on company policies and budget availability.
                  </p>
                  <p>
                    Company-issued assets remain organizational property and must be used responsibly, securely, and only for authorized work purposes.
                  </p>
                  <div>
                    <p className="mb-1 text-foreground font-semibold">Employees are responsible for:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>proper handling of assets</li>
                      <li>reporting damage or issues immediately</li>
                      <li>returning assets during resignation, transfer, or replacement</li>
                    </ul>
                  </div>
                  <p className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded border border-amber-100 dark:border-amber-900/50 flex gap-2 items-start">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Unauthorized usage, negligence, or loss of company assets may lead to disciplinary action.</span>
                  </p>
                  <p>
                    All asset requests, approvals, allocations, maintenance activities, and returns shall be tracked and audited within the system for operational and compliance purposes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

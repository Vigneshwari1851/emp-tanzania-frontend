import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/payroll-lib/textarea';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Check, X, Loader2, Package } from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';

export function AssetRequestsList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: string;
    requestId: number | null;
  }>({ isOpen: false, action: '', requestId: null });
  const [modalNotes, setModalNotes] = useState('');
  const [modalAssetId, setModalAssetId] = useState('');

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['asset-requests', statusFilter],
    queryFn: async () => {
      const response = await api.get('/assets/requests', { params: { status: statusFilter } });
      return response.data.data;
    }
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, action, notes, assignedAssetId }: any) => {
      return api.put(`/assets/requests/${id}`, { action, notes, assignedAssetId });
    },
    onSuccess: () => {
      toast.success('Request processed');
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  });

  const handleAction = (id: number, action: string) => {
    setModalState({ isOpen: true, action, requestId: id });
    setModalNotes('');
    setModalAssetId('');
  };

  const confirmAction = () => {
    if (!modalState.requestId) return;
    
    if (modalState.action === 'FULFILL' && !modalAssetId) {
      toast.error('Asset ID is required to fulfill a request');
      return;
    }

    processMutation.mutate({
      id: modalState.requestId,
      action: modalState.action,
      notes: modalNotes,
      assignedAssetId: modalState.action === 'FULFILL' ? Number(modalAssetId) : undefined
    });
    setModalState({ isOpen: false, action: '', requestId: null });
  };

  const requests = requestsData || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <Select
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          placeholder="All Statuses"
          options={[
            { value: "", label: "All Statuses" },
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
            { value: "FULFILLED", label: "Fulfilled" },
          ]}
        />
      </div>

      <Card className="rounded-lg shadow-sm border border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-24 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground">
                No asset requests found.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/80 border-b border-border text-xs text-muted-foreground font-medium">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold text-sm text-black">Employee</th>
                    <th className="px-5 py-3.5 font-semibold text-sm text-black">Request Type</th>
                    <th className="px-5 py-3.5 font-semibold text-sm text-black">Details</th>
                    <th className="px-5 py-3.5 font-semibold text-sm text-black">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold text-sm text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-card">
                  {requests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-muted/50">
                      <td className="px-5 py-4 text-sm">
                        <div className="font-semibold text-foreground">
                          {req.user?.details?.first_name} {req.user?.details?.last_name}
                        </div>
                        <div className="text-muted-foreground text-xs">{req.user?.email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium">
                        {req.request_type}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {req.reason}
                        {req.specific_asset && <div className="text-xs font-mono text-muted-foreground mt-1">{req.specific_asset.asset_code}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider
                          ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            req.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                            req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                            'bg-emerald-100 text-emerald-700'}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {req.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-emerald-600 hover:bg-emerald-50" onClick={() => handleAction(req.id, 'APPROVE')}>
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => handleAction(req.id, 'REJECT')}>
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                        {req.status === 'APPROVED' && (
                          <Button size="sm" className="bg-primary hover:bg-primary/95 text-white" onClick={() => handleAction(req.id, 'FULFILL')}>
                            <Package className="w-4 h-4 mr-1" /> Fulfill (Assign Asset)
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ isOpen: false, action: '', requestId: null })} 
        title={modalState.action === 'FULFILL' ? 'Assign Asset' : modalState.action === 'REJECT' ? 'Reject Request' : 'Approve Request'}
      >
        <div className="space-y-4 py-4">
          {modalState.action === 'FULFILL' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Asset ID to Assign</label>
              <Input 
                type="number" 
                placeholder="Enter Asset ID..." 
                value={modalAssetId} 
                onChange={(e) => setModalAssetId(e.target.value)} 
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
              <Textarea 
                placeholder="Add any additional context..." 
                value={modalNotes} 
                onChange={(e) => setModalNotes(e.target.value)} 
                className="min-h-[100px]"
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setModalState({ isOpen: false, action: '', requestId: null })}>
              Cancel
            </Button>
            <Button 
              className={modalState.action === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-primary hover:bg-primary/95 text-white'}
              onClick={confirmAction}
              disabled={processMutation.isPending}
            >
              {processMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {modalState.action === 'REJECT' ? 'Confirm Rejection' : modalState.action === 'FULFILL' ? 'Fulfill Request' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

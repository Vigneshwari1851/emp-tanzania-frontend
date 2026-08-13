import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/payroll-lib/dialog';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { Textarea } from '@/shared/components/ui/payroll-lib/textarea';
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RequestAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignedAssets: any[];
}

export function RequestAssetModal({ isOpen, onClose, onSuccess, assignedAssets }: RequestAssetModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [requestType, setRequestType] = useState('NEW');
  const [categoryId, setCategoryId] = useState('');
  const [specificAssetId, setSpecificAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Reset form
      setRequestType('NEW');
      setCategoryId('');
      setSpecificAssetId('');
      setReason('');
      setPriority('MEDIUM');
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories');
      setCategories(res.data.data);
    } catch (err) {
      toast.error('Failed to load asset categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error('Please provide a reason');
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
        priority
      });
      toast.success('Request submitted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request IT Asset</DialogTitle>
          <DialogDescription>
            Submit a request for a new asset, or ask for repairs/replacements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New Asset</SelectItem>
                <SelectItem value="REPAIR">Repair Existing</SelectItem>
                <SelectItem value="REPLACEMENT">Replace Existing</SelectItem>
                <SelectItem value="RETURN">Return Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestType === 'NEW' ? (
            <div className="space-y-2">
              <Label>Asset Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Asset</Label>
              <Select value={specificAssetId} onValueChange={setSpecificAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your asset" />
                </SelectTrigger>
                <SelectContent>
                  {assignedAssets.map(a => (
                    <SelectItem key={a.asset.id} value={a.asset.id.toString()}>
                      {a.asset.name} ({a.asset.asset_code || a.asset.serial_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason / Details</Label>
            <Textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              placeholder="Why do you need this asset? If repair, describe the issue..."
              rows={4}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/95">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

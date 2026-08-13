import React, { useState } from 'react';
import { X, RefreshCcw, Loader2, AlertCircle } from 'lucide-react';
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';

interface ReturnAssetModalProps {
  assetId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReturnAssetModal: React.FC<ReturnAssetModalProps> = ({ assetId, isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');

  if (!isOpen || assetId === null) return null;

  const handleReturn = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/assignments/${assetId}/return`, { remarks });
      toast.success('Asset returned successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to return asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-lg shadow-sm w-full max-w-md overflow-hidden flex flex-col border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2.5 text-amber-600">
            <RefreshCcw size={20} className="animate-spin-slow" />
            <h3 className="text-lg font-bold text-foreground">Return Asset</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-sm">
            <AlertCircle size={20} className="shrink-0 text-amber-600" />
            <p>You are about to log this asset as returned. Its status will be updated to **AVAILABLE** immediately.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Remarks / Return Condition</label>
            <textarea
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm min-h-[100px]"
              placeholder="e.g. Returned in excellent condition, minor scratch on bottom case..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        <div className="p-5 bg-muted flex items-center justify-end gap-3 border-t border-border">
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm text-gray-600 font-bold hover:text-foreground hover:bg-muted rounded-lg transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleReturn}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 shadow-sm shadow-amber-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnAssetModal;

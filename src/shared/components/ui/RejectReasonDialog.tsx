import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface RejectReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  description?: string;
}

export function RejectReasonDialog({ isOpen, onClose, onConfirm, title, description }: RejectReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      toast.warning(title || "Rejection Reason Required");
    }
  }, [isOpen, title]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError(true);
      return;
    }
    toast.error(`Rejection submitted: ${reason.trim()}`);
    onConfirm(reason.trim());
    setReason("");
    setError(false);
  };

  const handleClose = () => {
    toast.info("Rejection cancelled");
    setReason("");
    setError(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card rounded-lg shadow-sm w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rose-50 rounded-full">
            <AlertCircle className="w-5 h-5 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{title || "Rejection Reason"}</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{description || "Please provide a reason for rejecting this request."}</p>

        <textarea
          autoFocus
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(false); }}
          placeholder="Enter rejection reason..."
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all resize-none min-h-[100px] ${
            error
              ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
              : "border-border focus:ring-primary/20 focus:border-primary"
          }`}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleConfirm(); }}
        />
        {error && <p className="text-xs text-red-500 mt-1.5 font-medium">Please enter a reason.</p>}

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-muted rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-lg transition-all shadow-sm shadow-rose-200"
          >
            Reject Request
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default RejectReasonDialog;

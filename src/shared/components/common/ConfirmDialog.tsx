import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "red" | "green" | "blue";
  onConfirm: () => void;
  onCancel: () => void;
}

const colorMap = {
  red: "bg-red-600 hover:bg-red-700",
  green: "bg-emerald-600 hover:bg-emerald-700",
  blue: "bg-primary hover:bg-primary/70",
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "red",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md border border-border px-8 py-10">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-sm transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-sm transition-colors ${colorMap[confirmColor]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

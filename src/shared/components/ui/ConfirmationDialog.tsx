import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  extraActions?: React.ReactNode
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "Do you really want to delete these records? This process cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = 'danger',
  extraActions
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (isOpen) {
      const toastTitle = typeof title === 'string' ? title : "Confirmation Required";
      if (variant === 'danger') toast.warning(toastTitle);
      else if (variant === 'warning') toast.warning(toastTitle);
      else toast.info(toastTitle);
    }
  }, [isOpen, title, variant]);

  if (!isOpen) return null

  const handleConfirmAction = () => {
    const toastTitle = typeof title === 'string' ? title : "Action";
    toast.success(`${toastTitle} confirmed`);
    onConfirm();
  };

  const handleCloseAction = () => {
    toast.info("Action cancelled");
    onClose();
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger': return <AlertCircle className="w-6 h-6 text-red-600" />
      case 'warning': return <AlertCircle className="w-6 h-6 text-amber-600" />
      default: return <AlertCircle className="w-6 h-6 text-blue-600" />
    }
  }

  const getIconBg = () => {
    switch (variant) {
      case 'danger': return 'bg-red-50'
      case 'warning': return 'bg-amber-50'
      default: return 'bg-blue-50'
    }
  }

  const getConfirmBtnClass = () => {
    switch (variant) {
      case 'danger': return 'bg-red-600 hover:bg-red-700'
      case 'warning': return 'bg-amber-600 hover:bg-amber-700'
      default: return 'bg-primary text-primary-foreground hover:bg-primary/90'
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 bg-black/60 animate-in fade-in duration-200 backdrop-blur-sm">
      <div
        className="bg-card rounded-[12px] shadow-sm w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Content Area */}
        <div className="p-6 pb-6 flex gap-5 items-start">
          {/* Status Icon */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getIconBg()}`}>
            {getIcon()}
          </div>

          <div className="flex-1">
            <h3 className="text-[14px] font-medium text-foreground mb-2 font-sans tracking-tight">
              {title}
            </h3>
            <p className="text-gray-600 text-[12px] leading-relaxed font-normal">
              {description}
            </p>
          </div>

          <button
            onClick={handleCloseAction}
            className="absolute right-5 top-5 p-1.5 text-gray-300 hover:text-muted-foreground hover:bg-muted rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-muted w-full" />

        {/* Footer Area */}
        <div className="px-5 py-4 flex justify-end gap-3 bg-muted/30">
          <button
            onClick={handleCloseAction}
            className="px-4 h-10 bg-card border border-border hover:bg-muted text-foreground rounded-sm font-bold text-[14px] transition-all"
          >
            {cancelText}
          </button>
          {extraActions}
          <button
            onClick={handleConfirmAction}
            className={`px-4 h-10 text-white rounded-sm font-bold text-[14px] transition-all shadow-sm ${getConfirmBtnClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

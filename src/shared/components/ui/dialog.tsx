import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { toast } from "sonner"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string // e.g., 'max-w-md', 'max-w-4xl'
  fullScreen?: boolean
}

export function Dialog({ isOpen, onClose, title, children, maxWidth = 'max-w-md', fullScreen = false }: DialogProps) {
  React.useEffect(() => {
    if (isOpen && title) {
      toast.info(title);
    }
  }, [isOpen, title]);

  if (!isOpen) return null

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 ${fullScreen ? 'p-0' : 'p-4'}`} onClick={onClose}>
      <div
        className={`bg-card shadow-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-border ${fullScreen ? 'h-full max-h-[100dvh] rounded-none max-w-none' : `${maxWidth} max-h-[90vh] rounded-lg`}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

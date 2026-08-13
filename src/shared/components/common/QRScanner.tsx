import React, { useState, useEffect } from 'react';
import { X, QrCode, Loader2, Play } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (scannedCode: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const [manualCode, setManualCode] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    // Add event listener to close modal on Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSimulate = (codeToScan: string) => {
    setIsSimulating(true);
    setTimeout(() => {
      onScanSuccess(codeToScan);
      setIsSimulating(false);
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSimulate(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <QrCode className="text-blue-500 animate-pulse" size={24} />
            <div>
              <h3 className="font-bold text-base">Virtual QR Scanner</h3>
              <p className="text-[10px] text-muted-foreground">Scan or simulate asset barcode</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-muted-foreground hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Scanner Viewfinder Box */}
        <div className="p-8 flex flex-col items-center justify-center bg-slate-950/80">
          <div className="relative w-64 h-64 border-2 border-slate-700 rounded-lg overflow-hidden flex items-center justify-center bg-black">
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-md"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-md"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-md"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-md"></div>

            {/* Scan animation line */}
            <div className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-sm shadow-blue-500/50 animate-scan z-10"></div>

            {isSimulating ? (
              <div className="flex flex-col items-center gap-3 text-blue-400">
                <Loader2 size={36} className="animate-spin" />
                <p className="text-xs font-semibold animate-pulse">Decoding asset code...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground text-center px-4">
                <QrCode size={48} className="opacity-30" />
                <p className="text-xs font-medium">Position asset code inside the guide</p>
              </div>
            )}
          </div>
        </div>

        {/* Simulation Controls & Manual Input */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 space-y-5">
          <div>
            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Simulate Scan</span>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                disabled={isSimulating}
                onClick={() => handleSimulate('SN-DEMO-001')}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play size={12} className="text-blue-500" />
                SN-DEMO-001
              </button>
              <button 
                type="button"
                disabled={isSimulating}
                onClick={() => handleSimulate('SN-DEMO-002')}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play size={12} className="text-blue-500" />
                SN-DEMO-002
              </button>
            </div>
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <form onSubmit={handleManualSubmit}>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Manual Code Input</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                disabled={isSimulating}
                className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 disabled:opacity-50"
                placeholder="Enter Serial or Code..." 
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!manualCode.trim() || isSimulating}
                className="px-5 py-2 bg-primary hover:bg-primary/80 disabled:bg-slate-800 disabled:text-muted-foreground text-white text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                Simulate
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

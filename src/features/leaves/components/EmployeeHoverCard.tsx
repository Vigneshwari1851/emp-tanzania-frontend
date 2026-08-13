import { useState, useEffect, useRef } from "react";
import { getLeaveHistory } from '@/features/leaves/services/leaves';

interface EmployeeHoverCardProps {
  userId: number;
  children: React.ReactNode;
  policies: any[];
}

export function EmployeeHoverCard({ userId, children, policies }: EmployeeHoverCardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, side: 'top' });
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isVisible && !data) {
      setLoading(true);
      getLeaveHistory({ user_id: userId, limit: 100 })
        .then(res => {
          const history = res.data?.data || res.data || [];
          const approved = history.filter((h: any) => h.status === "APPROVED");
          const totalDays = approved.reduce((sum: number, h: any) => sum + (h.duration || h.days || 0), 0);
          
          const totalEntitled = policies.reduce((sum, p) => sum + Number(p.days_per_year || 0), 0);
          const remaining = Math.max(0, totalEntitled - totalDays);
          
          setData({ 
            recentHistory: history.slice(0, 3), 
            totalDays,
            remaining,
            totalEntitled
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isVisible, userId, data, policies]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipHeight = 300; // Expected max height
      const tooltipWidth = 300;
      
      // Horizontal positioning
      let left = rect.left + rect.width / 2;
      if (left + tooltipWidth / 2 > viewportWidth - 20) left = viewportWidth - tooltipWidth / 2 - 20;
      if (left - tooltipWidth / 2 < 20) left = tooltipWidth / 2 + 20;

      // Vertical positioning (Smart Side)
      let side = 'top';
      let top = rect.top - 8;
      
      if (rect.top < tooltipHeight + 40) {
        // Show below if not enough space at top
        top = rect.bottom + 8;
        side = 'bottom';
      }

      setCoords({ top, left, side });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150); // Small 150ms delay for "hover bridge"
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="w-full">
        {children}
      </div>

      {isVisible && (
        <div 
          className="fixed z-[9999]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            transform: coords.side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <div className={`w-72 bg-card rounded-lg shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-border p-4 ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-200 font-sans ${coords.side === 'top' ? 'slide-in-from-bottom-3 origin-bottom' : 'slide-in-from-top-3 origin-top'}`}>
            {/* Minimal Accent bar */}
            <div className={`absolute left-0 right-0 h-1 bg-primary ${coords.side === 'top' ? 'top-0 rounded-t-xl' : 'bottom-0 rounded-b-xl'}`}></div>
            
            {loading ? (
               <div className="flex flex-col items-center justify-center py-8 gap-3">
                 <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full font-sans"></div>
                 <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest animate-pulse font-sans">Syncing Overview</span>
               </div>
            ) : data ? (
              <div className="space-y-4 font-sans">
                 <div className="flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">YTD Record</p>
                      <p className="text-xl font-semibold text-foreground mt-1.5">{data.totalDays} <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-tight">days</span></p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">Remaining</p>
                      <p className="text-xl font-semibold text-primary mt-1.5">{data.remaining} <span className="text-primary-200 text-[10px] font-medium uppercase tracking-tight">days</span></p>
                   </div>
                 </div>

                 <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden border border-border/30">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(79,70,229,0.3)]" 
                      style={{ width: `${Math.min(100, (data.totalDays / (data.totalEntitled || 1)) * 100)}%` }}
                    ></div>
                 </div>

                 <div className="space-y-3 pt-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tighter flex items-center justify-between opacity-50">
                      LEAVE TIMELINE
                      <span className="h-[1px] bg-muted flex-1 ml-3"></span>
                    </p>
                    <div className="space-y-2.5">
                      {data.recentHistory.map((h: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground leading-tight">
                                  {new Date(h.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold bg-muted px-1 rounded border border-border">
                                  {h.duration || h.days || 0} day
                                </span>
                              </div>
                              <span className="text-[9px] text-muted-foreground uppercase font-medium mt-0.5">{h.leave_policy?.policy_name || h.leave_policy?.name || 'Leave'}</span>
                            </div>
                           <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-tighter border ${
                             h.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                             h.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                             'bg-amber-50 text-amber-700 border-amber-100'
                           }`}>
                             {h.status}
                           </span>
                        </div>
                      ))}
                      {data.recentHistory.length === 0 && <p className="text-xs text-center py-2 text-gray-300 font-medium">No prior records</p>}
                    </div>
                 </div>
                 
              </div>
            ) : null}
          </div>
          
          {/* Enhanced Pointer Arrow */}
          <div 
            className={`absolute w-3.5 h-3.5 bg-card border border-border rotate-45 shadow-sm transform -translate-x-1/2 left-1/2 ${
              coords.side === 'top' ? 'bottom-[-7px] border-t-0 border-l-0' : 'top-[-7px] border-b-0 border-r-0'
            }`}
          ></div>
        </div>
      )}
    </div>
  );
}


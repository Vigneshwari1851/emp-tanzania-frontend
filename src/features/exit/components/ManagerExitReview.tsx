import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Search, Users, Clock, CheckCircle, 
  XCircle, Calendar, FileText, X, Check, MessageSquare,
  Shield, Info, CheckCircle2, ChevronRight, Eye, Filter
} from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import { EXIT_STATUS } from './InitiateExitForm';
import { Button } from '@/shared/components/ui/button';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { Loader2 as Spinner } from 'lucide-react';

interface ManagerExitReviewProps {
  requests: any[];
  onBack: () => void;
  onRefresh: () => void;
  onSelectRequest: (request: any) => void;
}

const ManagerExitReview: React.FC<ManagerExitReviewProps> = ({ requests, onBack, onRefresh, onSelectRequest }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('All Status');
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [negotiatingId, setNegotiatingId] = useState<string | null>(null);
  const [proposedLwd, setProposedLwd] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      setIsUpdating(id);
      const response = await axiosInstance.put(`/exit/${id}/status`, { status });
      if (response.data.success) {
        toast.success(`Request updated successfully`);
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update request status');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleNegotiate = async (id: string) => {
    if (!proposedLwd) {
      toast.error('Please select a proposed Last Working Day');
      return;
    }
    try {
      setIsUpdating(id);
      const response = await axiosInstance.put(`/exit/${id}/negotiate-lwd`, { proposed_lwd: proposedLwd });
      if (response.data.success) {
        toast.success('Negotiation proposal sent successfully');
        setNegotiatingId(null);
        setProposedLwd('');
        onRefresh();
      }
    } catch (error) {
      console.error('Error negotiating:', error);
      toast.error('Failed to send negotiation proposal');
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.user?.details?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.user?.details?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.user?.details?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const statusMap: any = {
      'Pending': EXIT_STATUS.PENDING_ACCEPTANCE,
      'Negotiating': EXIT_STATUS.NEGOTIATION_PENDING,
      'Accepted': EXIT_STATUS.RESIGNATION_ACCEPTED,
      'Offboarding': EXIT_STATUS.OFFBOARDING,
      'Rejected': EXIT_STATUS.REJECTED
    };
    
    const matchesStatus = activeStatus === 'All Status' || req.status === statusMap[activeStatus];
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Requests', value: requests.length, icon: Users, color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-100' },
    { label: 'Pending Review', value: requests.filter(r => r.status === EXIT_STATUS.PENDING_ACCEPTANCE).length, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100' },
    { label: 'Negotiating', value: requests.filter(r => r.status === EXIT_STATUS.NEGOTIATION_PENDING).length, icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-100' },
    { label: 'Accepted', value: requests.filter(r => [EXIT_STATUS.RESIGNATION_ACCEPTED, EXIT_STATUS.OFFBOARDING, EXIT_STATUS.CLEARANCE].includes(r.status)).length, icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-[130px]"
          >
            {/* 1st: Icon */}
            <div className={`w-9 h-9 rounded-lg ${stat.bgColor} border flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>

            {/* 2nd: Integer value, 3rd: Text Label */}
            <div className="flex flex-col">
              <p className="text-2xl font-black text-foreground tracking-tight leading-none">{stat.value}</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-card p-4 rounded-lg border border-border shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition-all text-xs placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setShowFilterPopover(!showFilterPopover)}
            className={`toolbar-filter-btn-with-text relative ${showFilterPopover || activeStatus !== 'All Status' ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
            title="Filter Requests"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 15"
              fill="currentColor"
              className="w-4 h-4 text-foreground"
            >
              <path d="M15.8,2H6.9C6.7,0.7,5.4-0.2,4,0.1C3,0.3,2.2,1,2,2H0.2C0.1,2,0,2.1,0,2.3v0.5 C0,2.9,0.1,3,0.2,3H2C2.3,4.4,3.6,5.2,5,5c1-0.2,1.8-1,1.9-2h8.8C15.9,3,16,2.9,16,2.8V2.3C16,2.1,15.9,2,15.8,2z M4.5,4 C3.7,4,3,3.3,3,2.5S3.7,1,4.5,1S6,1.7,6,2.5S5.3,4,4.5,4z" />
              <path d="M15.8,12H8.9C8.7,10.7,7.4,9.8,6,10.1c-1,0.2-1.8,1-1.9,1.9H0.2C0.1,12,0,12.1,0,12.3v0.5 C0,12.9,0.1,13,0.2,13h3.8C4.3,14.4,5.6,15.2,7,15c1-0.2,1.8-1,1.9-1.9h6.8c0.1,0,0.2-0.1,0.2-0.2v-0.5C16,12.1,15.9,12,15.8,12z M6.5,14C5.7,14,5,13.3,5,12.5S5.7,11,6.5,11S8,12.5S7.3,14,6.5,14z" />
              <path d="M0,7.3v0.5C0,7.9,0.1,8,0.2,8h8.8c0.3,1.4,1.6,2.2,2.9,1.9c1-0.2,1.8-1,1.9-1.9h1.8 C15.9,8,16,7.9,16,7.8V7.3C16,7.1,15.9,7,15.8,7h-1.8c-0.3-1.3-1.6-2.2-2.9-1.9C10,5.3,9.2,6,9.1,7H0.2C0.1,7,0,7.1,0,7.3z M10,7.5 C10,6.7,10.7,6,11.5,6S13,6.7,13,7.5S12.3,9,11.5,9S10,8.3,10,7.5z" />
            </svg>
            <span>Filter</span>
            {activeStatus !== 'All Status' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
            )}
          </button>

          {showFilterPopover && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl shadow-xl border border-border p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Filter by Status</span>
                </div>
                {activeStatus !== 'All Status' && (
                  <button
                    type="button"
                    onClick={() => setActiveStatus('All Status')}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {[
                  { value: "All Status", label: "All Status" },
                  { value: "Pending", label: "Pending Approval" },
                  { value: "Negotiating", label: "Negotiating LWD" },
                  { value: "Accepted", label: "Accepted" },
                  { value: "Offboarding", label: "In Offboarding" },
                  { value: "Rejected", label: "Rejected" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setActiveStatus(opt.value);
                      setShowFilterPopover(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all ${
                      activeStatus === opt.value
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {activeStatus === opt.value && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3.5">
        {filteredRequests.map((request) => (
          <div 
            key={request.id} 
            onClick={() => onSelectRequest(request)}
            className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-sm transition-all duration-200 group cursor-pointer"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm overflow-hidden flex-shrink-0">
                  {request.user?.details?.profile_picture ? (
                    <img src={getProfilePictureUrl(request.user.details.profile_picture) || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${request.user?.details?.first_name?.[0] || ''}${request.user?.details?.last_name?.[0] || ''}`
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-foreground leading-tight">
                      {`${request.user?.details?.first_name || ''} ${request.user?.details?.last_name || ''}`.trim()}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      request.status === EXIT_STATUS.PENDING_ACCEPTANCE ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      request.status === EXIT_STATUS.NEGOTIATION_PENDING ? 'bg-teal-50 text-teal-600 border-teal-100' :
                      [EXIT_STATUS.RESIGNATION_ACCEPTED, EXIT_STATUS.OFFBOARDING].includes(request.status) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {request.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {(typeof request.user?.details?.designation === 'string' ? request.user?.details?.designation : request.user?.details?.designation?.designation_name) || request.user?.details?.role?.role_name || 'Team Member'} • {request.user?.details?.department?.department_name || (typeof request.user?.details?.department === 'string' ? request.user?.details?.department : 'Department')}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold text-muted-foreground">Last Day: <span className="text-foreground">{new Date(request.last_working_day).toLocaleDateString()}</span></span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold text-muted-foreground">Reason: <span className="text-foreground">{request.primary_reason}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="flex items-center gap-3 self-end lg:self-center" onClick={(e) => e.stopPropagation()}>
                <Button 
                  className="px-5 h-10 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  onClick={() => onSelectRequest(request)}
                >
                  <Eye className="w-4 h-4" />
                  <span>View & Review</span>
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-lg py-16 text-center">
            <div className="w-14 h-14 bg-muted/50 border border-border rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No requests pending review</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">All employee exits in your team have been reviewed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerExitReview;

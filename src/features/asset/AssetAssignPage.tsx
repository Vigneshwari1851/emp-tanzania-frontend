import React, { useState } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Loader2, Check, Send, AlertCircle, ChevronLeft, ChevronRight, Hash, Briefcase, Package } from 'lucide-react';
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';


const AssetAssignPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState('');

  // Fetch asset details
  const { data: asset, isLoading: isLoadingAsset } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const res = await api.get(`/assets/${id}`);
      return res.data.data || res.data;
    }
  });

  // Fetch employees
  const { data: employeesResponse, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees-list', searchTerm, page],
    queryFn: async () => {
      const response = await api.get('/employees', {
        params: { search: searchTerm, limit: 10, page }
      });
      return response.data;
    }
  });

  const rawData = employeesResponse?.data;
  const employees = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : []);
  const meta = rawData?.meta || employeesResponse?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const assignMutation = useMutation({
    mutationFn: async (data: { assetId: number, userId: string, issueDate: string, returnDate?: string }) => {
      return api.post('/assignments/assign', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset assigned successfully!');
      navigate('/assets');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to assign asset');
    }
  });

  const handleAssign = () => {
    if (!selectedUserId || !id) return;

    if (returnDate && new Date(returnDate) < new Date(issueDate)) {
      toast.error('Expected return date cannot be earlier than issue date');
      return;
    }

    assignMutation.mutate({ 
      assetId: parseInt(id), 
      userId: selectedUserId,
      issueDate,
      returnDate
    });
  };

  if (isLoadingAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (asset?.status !== 'AVAILABLE') {
    return (
      <div className="max-w-md mx-auto text-center py-20 font-poppins">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Asset Not Available</h2>
        <p className="text-sm text-muted-foreground mb-8 font-medium">This asset is currently {asset?.status.toLowerCase()} and cannot be assigned.</p>
        <button 
          onClick={() => navigate('/assets')} 
          className="h-10 px-6 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg shadow-sm transition-all text-sm cursor-pointer group"
        >
          Go Back to Assets
        </button>
      </div>
    );
  }


  return (
    <div className="w-full font-poppins space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors h-10 w-10 shrink-0 flex items-center justify-center border border-transparent group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-foreground" />
          </button>
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Package className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Assign Asset</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Assign custody of <span className="text-primary font-semibold">{asset?.name}</span> ({asset?.serial_number})
            </p>
          </div>
        </div>
      </div>
 
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left Column: Search & List */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="bg-card rounded-lg border border-border shadow-sm p-6 min-h-[600px] flex flex-col space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                1. Select Employee
              </h3>
              <span className="text-xs text-muted-foreground font-normal">Select a custodian from the corporate directory</span>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                className="w-full pl-11 pr-4 h-11 bg-muted/50 border border-border rounded-lg focus:border-primary focus:ring-4 focus:ring-primary-50/20 focus:outline-none transition-all text-xs placeholder:text-muted-foreground font-normal"
                placeholder="Search employee by name, email, or department..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
 
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {isLoadingEmployees ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-3">
                  <Loader2 className="animate-spin text-primary w-8 h-8" />
                  <p className="text-xs font-normal text-muted-foreground">Finding employees...</p>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-24 text-muted-foreground bg-muted/50/30 rounded-lg border border-dashed border-border/60 max-w-lg mx-auto w-full mt-8">
                  <p className="font-normal text-foreground text-xs">No matching employees found</p>
                  <p className="text-xs text-muted-foreground mt-1 font-normal">Try searching for a different name or email</p>
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-sm font-semibold text-black pb-3 pl-2">Employee</th>
                          <th className="text-sm font-semibold text-black pb-3">Department & Team</th>
                          <th className="text-sm font-semibold text-black pb-3">Role</th>
                          <th className="text-sm font-semibold text-black pb-3 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {employees.map((emp: any) => {
                          const isSelected = selectedUserId === emp.id.toString();
                          return (
                            <tr 
                              key={emp.id}
                              onClick={() => setSelectedUserId(emp.id.toString())}
                              className={`group cursor-pointer transition-all duration-150 ${
                                isSelected 
                                  ? 'bg-primary/10/30' 
                                  : 'hover:bg-muted/50/50'
                              }`}
                            >
                              <td className="py-3 pl-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-normal text-xs transition-all ${
                                    isSelected ? 'bg-primary text-white shadow-sm' : 'bg-muted text-slate-600 group-hover:bg-slate-200/50'
                                  }`}>
                                    {emp.details?.first_name?.[0] || emp.username?.[0] || 'U'}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-normal text-foreground leading-tight truncate max-w-[150px]">
                                      {emp.details?.first_name} {emp.details?.last_name || ''}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-[150px]">{emp.email}</span>
                                  </div>
                                </div>
                              </td>
                              
                              <td className="py-3">
                                <span className="text-xs font-normal text-muted-foreground">
                                  {[emp.details?.department?.department_name, emp.details?.team?.team_name].filter(Boolean).join(' / ') || 'General'}
                                </span>
                              </td>
                              
                              <td className="py-3">
                                {emp.details?.role?.role_name ? (
                                  <span className="text-[10px] font-normal text-primary bg-primary/10 border border-primary-100/30 px-2 py-0.5 rounded-lg capitalize whitespace-nowrap">
                                    {emp.details.role.role_name.toLowerCase()}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-normal text-muted-foreground">—</span>
                                )}
                              </td>
                              
                              <td className="py-3 text-right pr-2">
                                <div className="flex items-center justify-end">
                                  {isSelected ? (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-normal text-[#4F46E5] bg-primary/10 border border-primary-100/50 px-2.5 py-0.5 rounded-full">
                                      <Check size={10} className="stroke-[3]" /> Selected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10px] font-normal text-muted-foreground group-hover:text-white transition-colors bg-transparent group-hover:bg-muted border border-transparent group-hover:border-border/50 px-2.5 py-0.5 rounded-full">
                                      Select
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {meta.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-5 mt-6 border-t border-border">
                      <span className="text-md font-semibold text-muted-foreground">
                        Page {meta.page} of {meta.totalPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={meta.page === 1}
                          className="p-2 rounded-lg border border-border text-slate-600 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                          disabled={meta.page === meta.totalPages}
                          className="p-2 rounded-lg border border-border text-slate-600 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Summary & Confirm */}
        <div className="w-full xl:w-[420px]">
          <div className="bg-card p-6 rounded-lg border border-border shadow-sm sticky top-8 space-y-6">
            <h3 className="text-base font-semibold text-foreground pb-3 border-b border-border">
              Assignment Details
            </h3>
            
            <div className="space-y-5">
              {/* Asset Summary */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6 font-poppins space-y-6">
                <h3 className="text-base font-semibold text-foreground pb-3 border-b border-border flex items-center gap-2">
                  <Package size={18} className="text-primary" /> Selected Asset
                </h3>
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border/50 shadow-sm flex items-center justify-center">
                    {asset?.image_url ? (
                      <img 
                        src={getProfilePictureUrl(asset.image_url) || ''} 
                        alt={asset?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={24} className="text-muted-foreground opacity-70" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[12px] font-medium text-foreground leading-tight">
                      {asset?.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-normal leading-none capitalize">
                      {typeof asset?.category === 'string' 
                        ? asset.category.toLowerCase() 
                        : (asset?.category?.category_name || asset?.category?.name || 'Uncategorized').toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                      <Briefcase size={13} className="text-muted-foreground" /> Brand & Model
                    </span>
                    <span className="text-xs font-normal text-foreground text-right truncate max-w-[200px]">
                      {[asset?.brand, asset?.model].filter(Boolean).join(' • ') || 'Standard Issue'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                      <Hash size={13} className="text-muted-foreground" /> Serial Number
                    </span>
                    <span className="text-xs font-normal text-foreground font-mono text-right truncate max-w-[200px]">
                      {asset?.serial_number}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-muted-foreground" /> Value / Cost
                    </span>
                    <span className="text-xs font-normal text-foreground text-right truncate max-w-[200px]">
                      {asset?.cost ? formatCurrency(asset.cost) : '—'}
                    </span>
                  </div>

                  {/* Dynamic Specifications List */}
                  {(() => {
                    let specsObj: Record<string, any> = {};
                    try {
                      if (asset?.specifications) {
                        specsObj = typeof asset.specifications === 'string' 
                          ? JSON.parse(asset.specifications) 
                          : asset.specifications;
                      }
                    } catch (e) {
                      console.error(e);
                    }
                    
                    const hasSpecs = Object.keys(specsObj).length > 0;
                    if (!hasSpecs) return null;
                    
                    return (
                      <>
                        {Object.entries(specsObj).slice(0, 6).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center py-1">
                            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5 capitalize">
                              <Check size={13} className="text-muted-foreground" /> {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-normal text-foreground text-right truncate max-w-[200px]">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
  
              {/* Target Employee Summary Removed as requested */}  
              {/* Date Pickers */}
              <div className="space-y-4 bg-muted/50 border border-border p-4 rounded-lg">
                <div>
                  <label className="text-xs font-normal text-muted-foreground mb-1.5 block">Issue Date</label>
                  <ModernDatePicker
                    value={issueDate}
                    onChange={(date) => setIssueDate(date)}
                    placeholder="Select Issue Date"
                  />
                </div>
                <div>
                  <label className="text-xs font-normal text-muted-foreground mb-1.5 block">Expected Return (Optional)</label>
                  <ModernDatePicker
                    value={returnDate}
                    onChange={(date) => setReturnDate(date)}
                    placeholder="Select Expected Return Date"
                  />
                </div>
              </div>
  
              {/* Submission Controls */}
              <div className="pt-2 space-y-2">
                <button 
                  onClick={handleAssign}
                  disabled={!selectedUserId || assignMutation.isPending}
                  className={`w-full h-11 font-normal text-xs flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer ${
                    !selectedUserId || assignMutation.isPending
                    ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-sm border-none'
                  }`}
                >
                  {assignMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Complete Assignment
                </button>
                <button 
                  onClick={() => navigate('/assets')}
                  className="w-full py-2 text-xs text-muted-foreground font-normal hover:text-slate-600 transition-colors cursor-pointer group"
                >
                  Cancel and Return
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAssignPage;



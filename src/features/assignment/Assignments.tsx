import React, { useState, useMemo } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Box, Clock, Loader2, Plus, BellRing, CheckCircle2, Search, Filter, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import api from '@/shared/services/axiosInstance';
import ReturnAssetModal from '@/shared/components/common/ReturnAssetModal';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/payroll-lib/tabs';
import { AssetRequestsList } from '../asset/components/AssetRequestsList';
import { toast } from 'sonner';

const Assignments: React.FC = () => {
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  const [returnAssetId, setReturnAssetId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await api.get('/assignments');
      return response.data.data || response.data;
    }
  });

  const requestReturnMutation = useMutation({
    mutationFn: async (assetId: number) => api.post(`/assignments/${assetId}/request-return`),
    onSuccess: () => {
      toast.success('Return request sent to employee');
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: () => {
      toast.error('Failed to request return');
    }
  });

  const handleRequestReturn = (assetId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    requestReturnMutation.mutate(assetId);
  };

  const handleConfirmReturn = (assetId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setReturnAssetId(assetId); // Opens the modal for remarks and final confirmation
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100/50">Active</span>;
      case 'RETURN_REQUESTED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100/50">Return Requested</span>;
      case 'RETURN_ACCEPTED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100/50">Ready to Confirm</span>;
      case 'RETURNED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100/50">Returned</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border/50 capitalize">{status.toLowerCase()}</span>;
    }
  };

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    let filtered = assignments;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a: any) => 
        a.asset?.name?.toLowerCase().includes(q) || 
        a.asset?.serial_number?.toLowerCase().includes(q) ||
        a.user?.username?.toLowerCase().includes(q) ||
        a.user?.details?.first_name?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter((a: any) => a.status === statusFilter);
    }
    
    return filtered;
  }, [assignments, searchQuery, statusFilter]);

  const totalAssignments = filteredAssignments.length;
  const totalPages = Math.ceil(totalAssignments / itemsPerPage) || 1;
  
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Asset Assignments</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Monitor and manage all assigned assets</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-64 pl-9 pr-4 h-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-card shadow-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 rounded-lg border font-semibold text-sm flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none ${
                showFilters 
                  ? 'bg-primary/10 border-primary-200 text-primary' 
                  : 'bg-card border-border hover:bg-muted text-foreground'
              }`}
            >
              <Filter size={18} className={showFilters ? "text-primary" : "text-muted-foreground"} /> Filter
            </button>
            <button 
              onClick={() => navigate('/assets/assignment/new')}
              className="h-10 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-lg shadow-sm transition-all text-sm flex items-center justify-center gap-2 flex-1 sm:flex-none group"
            >
              <Plus size={16} /> Assign Assets
            </button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="mb-6 bg-card border border-border shadow-sm p-1 rounded-lg w-full grid grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <span>All Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2">
            <BellRing className="w-4 h-4" />
            <span>Asset Requests</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">
          {showFilters && (
        <div className="bg-muted border border-border p-4 sm:p-5 rounded-lg flex flex-wrap gap-4 items-end transition-all">
          <div className="w-full sm:w-64">
            <Select
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
              placeholder="All Statuses"
              label="Status"
              options={[
                { value: "", label: "All Statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "RETURN_REQUESTED", label: "Return Requested" },
                { value: "RETURN_ACCEPTED", label: "Ready to Confirm" },
                { value: "RETURNED", label: "Returned" },
              ]}
            />
          </div>

          <div>
            <button
              onClick={() => {
                setStatusFilter('');
                setCurrentPage(1);
              }}
              disabled={!statusFilter}
              className="h-[38px] border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed bg-card text-foreground font-semibold px-4 rounded-sm shadow-sm text-xs transition-colors flex items-center justify-center"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      <Card className="rounded-lg shadow-sm border border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Loading assignments...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground font-medium">
                No assignments found.
              </div>
            ) : (
              <>
                {/* Desktop View: Table */}
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-muted/80 border-b border-border">
                      <tr>
                        <th className="px-5 py-3.5 text-left text-sm font-semibold text-black" style={{ width: '30%' }}>Asset</th>
                        <th className="px-5 py-3.5 text-left text-sm font-semibold text-black" style={{ width: '25%' }}>Assigned To</th>
                        <th className="px-5 py-3.5 text-left text-sm font-semibold text-black" style={{ width: '15%' }}>Issue Date</th>
                        <th className="px-5 py-3.5 text-left text-sm font-semibold text-black" style={{ width: '15%' }}>Status</th>
                        <th className="px-5 py-3.5 text-left text-sm font-semibold text-black" style={{ width: '15%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-100">
                      {paginatedAssignments.map((assignment: any) => (
                        <tr key={assignment.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10/50 border border-primary-100/50 text-primary rounded-lg flex items-center justify-center">
                                <Box size={18} />
                              </div>
                              <div>
                                <div className="font-medium text-foreground text-sm leading-tight">{assignment.asset?.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">SN: <span className="font-mono">{assignment.asset?.serial_number}</span></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                              <User size={14} className="text-muted-foreground" /> 
                              {assignment.user?.details?.first_name 
                                ? `${assignment.user.details.first_name} ${assignment.user.details.last_name || ''}`.trim()
                                : assignment.user?.username || assignment.user?.email}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                              <Clock size={14} className="text-muted-foreground" /> 
                              {new Date(assignment.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {getStatusBadge(assignment.status)}
                          </td>
                          <td className="px-5 py-4">
                            {assignment.status === 'ACTIVE' && (
                              <button 
                                className="h-8 bg-card border border-border hover:bg-muted text-foreground font-semibold px-3 rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                                onClick={(e) => handleRequestReturn(assignment.asset.id, e)}
                                disabled={requestReturnMutation.isPending}
                              >
                                <BellRing size={13} className="text-muted-foreground" /> Request Return
                              </button>
                            )}
                            {assignment.status === 'RETURN_REQUESTED' && (
                              <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                <Loader2 size={13} className="animate-spin" /> Waiting for User
                              </span>
                            )}
                            {assignment.status === 'RETURN_ACCEPTED' && (
                              <button 
                                className="h-8 bg-primary/10 border border-primary-100 hover:bg-primary-100 text-primary font-semibold px-3 rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-all"
                                onClick={(e) => handleConfirmReturn(assignment.asset.id, e)}
                              >
                                <CheckCircle2 size={13} /> Confirm Return
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {paginatedAssignments.map((assignment: any) => (
                    <div key={assignment.id} className="p-4 hover:bg-muted/50 transition-colors space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10/50 border border-primary-100/50 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                            <Box size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm leading-tight">{assignment.asset?.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">SN: <span className="font-mono">{assignment.asset?.serial_number}</span></div>
                          </div>
                        </div>
                        {getStatusBadge(assignment.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-muted/50/50 p-3 rounded-lg border border-border/50">
                        <div>
                          <span className="text-muted-foreground font-medium block">Assigned To</span>
                          <div className="flex items-center gap-1.5 text-foreground font-semibold mt-0.5">
                            <User size={12} className="text-muted-foreground" />
                            <span className="truncate">
                              {assignment.user?.details?.first_name 
                                ? `${assignment.user.details.first_name} ${assignment.user.details.last_name || ''}`.trim()
                                : assignment.user?.username || assignment.user?.email}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium block">Issue Date</span>
                          <div className="flex items-center gap-1.5 text-foreground font-semibold mt-0.5">
                            <Clock size={12} className="text-muted-foreground" />
                            <span>{new Date(assignment.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        {assignment.status === 'ACTIVE' && (
                          <button 
                            className="w-full px-4 py-2 bg-card border border-border hover:bg-muted text-foreground font-bold rounded-lg shadow-sm text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            onClick={(e) => handleRequestReturn(assignment.asset.id, e)}
                            disabled={requestReturnMutation.isPending}
                          >
                            <BellRing size={14} className="text-muted-foreground" /> Request Return
                          </button>
                        )}
                        {assignment.status === 'RETURN_REQUESTED' && (
                          <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 w-full justify-center bg-amber-50 py-2 rounded-lg border border-amber-100/30">
                            <Loader2 size={13} className="animate-spin" /> Waiting for User
                          </span>
                        )}
                        {assignment.status === 'RETURN_ACCEPTED' && (
                          <button 
                            className="w-full px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold rounded-lg shadow-sm shadow-primary-50 text-xs flex items-center justify-center gap-2 transition-all"
                            onClick={(e) => handleConfirmReturn(assignment.asset.id, e)}
                          >
                            <CheckCircle2 size={14} /> Confirm Return
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {!isLoading && filteredAssignments.length > 0 && (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-card rounded-lg shadow-sm border mt-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto justify-between lg:justify-start">
            <p className="text-sm text-muted-foreground font-medium text-center sm:text-left">
              Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span>{" "}
              to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, totalAssignments)}</span> of{" "}
              <span className="text-foreground">{totalAssignments}</span>{" "}
              assignments
            </p>
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 pl-0 sm:pl-4 border-border w-full sm:w-auto justify-center sm:justify-start">
              <Select
                value={String(itemsPerPage)}
                onChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}
                label="Rows per page:"
                options={[
                  { value: "5", label: "5" },
                  { value: "10", label: "10" },
                  { value: "20", label: "20" },
                  { value: "50", label: "50" },
                ]}
              />
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 w-full lg:w-auto justify-center">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1 mx-2 overflow-x-auto max-w-[180px] sm:max-w-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex items-center gap-1 shrink-0">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 min-w-[32px] px-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
                        currentPage === page
                          ? "bg-primary text-white shadow-sm"
                          : "text-gray-600 hover:bg-muted"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <ReturnAssetModal 
        assetId={returnAssetId} 
        isOpen={!!returnAssetId} 
        onClose={() => setReturnAssetId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          queryClient.invalidateQueries({ queryKey: ['assets'] });
        }}
      />
        </TabsContent>
        
        <TabsContent value="requests">
          <AssetRequestsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Assignments;

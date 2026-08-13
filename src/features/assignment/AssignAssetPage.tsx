import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Loader2, Check, ChevronLeft, ChevronRight, Package, CheckCircle2, Circle } from 'lucide-react';
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';

const AssignAssetPage: React.FC = () => {
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeePage, setEmployeePage] = useState(1);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetPage, setAssetPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setEmployeePage(1);
  }, [employeeSearch]);

  useEffect(() => {
    setAssetPage(1);
  }, [assetSearch]);

  // Fetch employees
  const { data: employeesResponse, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees-list', employeeSearch, employeePage],
    queryFn: async () => {
      const response = await api.get('/employees', {
        params: { search: employeeSearch, limit: 10, page: employeePage }
      });
      return response.data;
    }
  });

  const rawData = employeesResponse?.data;
  const employees = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : []);
  const meta = rawData?.meta || employeesResponse?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const totalEmployeePages = meta.totalPages || Math.ceil((meta.total || 0) / 10) || 1;

  // Fetch available assets
  const { data: assetsResponse, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['assets-available', assetSearch, assetPage],
    queryFn: async () => {
      const response = await api.get('/assets', {
        params: { search: assetSearch, status: 'AVAILABLE', limit: 15, page: assetPage }
      });
      return response.data;
    }
  });

  const rawAssets = assetsResponse?.data?.assets || assetsResponse?.data || [];
  const assets = Array.isArray(rawAssets) ? rawAssets.filter((a: any) => a.status === 'AVAILABLE') : [];
  const totalAssetPages = assetsResponse?.data?.totalPages || 1;

  const assignMutation = useMutation({
    mutationFn: async (data: { assetIds: number[], userId: string, issueDate: string }) => {
      return api.post('/assignments/assign', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assets assigned successfully!');
      navigate('/assets/assignment');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to assign assets');
    }
  });

  const handleAssign = () => {
    if (!selectedUserId) {
      toast.error('Please select an employee');
      return;
    }
    if (selectedAssetIds.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    assignMutation.mutate({ 
      assetIds: selectedAssetIds, 
      userId: selectedUserId.toString(),
      issueDate
    });
  };

  const toggleAssetSelection = (id: number) => {
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full font-poppins flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            onClick={() => navigate('/assets/assignment')}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors h-10 w-10 shrink-0 flex items-center justify-center border border-transparent group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-foreground" />
          </button>
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Package className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Assign Assets</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Select an employee and choose multiple assets to assign</p>
          </div>
          </div>
        
        <div className="flex items-center gap-3">
          <StandardDatePicker
            value={issueDate}
            onChange={setIssueDate}
            className="w-48"
          />
          <button 
            onClick={handleAssign}
            disabled={!selectedUserId || selectedAssetIds.length === 0 || assignMutation.isPending}
            className="h-10 px-6 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-lg shadow-sm transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirm Assignment
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex items-start gap-4 flex-1 min-h-0">
        
        {/* Left Pane: Employees */}
        <div className="w-[450px] flex-shrink-0 bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50">
            <h3 className="font-semibold text-foreground text-sm mb-3">Select Employee</h3>
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingEmployees ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : employees.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-8">No employees found</div>
            ) : (
              employees.map((emp: any) => {
                const isSelected = selectedUserId === emp.id;
                const initials = (emp.details?.first_name?.[0] || emp.username?.[0] || 'U').toUpperCase();
                
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedUserId(emp.id)}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${
                      isSelected ? 'bg-primary/10 border-primary-100 border' : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                      isSelected ? 'bg-primary text-white' : 'bg-muted text-gray-600'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${isSelected ? 'text-primary-900' : 'text-foreground'}`}>
                        {emp.details?.first_name ? `${emp.details.first_name} ${emp.details.last_name || ''}` : emp.username}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono bg-muted px-1.5 rounded text-gray-600">{emp.details?.employee_id || `ID-${emp.id}`}</span>
                        <span>•</span>
                        <span>{emp.details?.team?.team_name || emp.details?.department?.department_name || emp.email}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalEmployeePages > 1 && (
            <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground font-medium">Page {employeePage} of {totalEmployeePages}</span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setEmployeePage(p => Math.max(1, p - 1))}
                  disabled={employeePage === 1}
                  className="p-1.5 rounded-sm text-muted-foreground hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setEmployeePage(p => Math.min(totalEmployeePages, p + 1))}
                  disabled={employeePage === totalEmployeePages}
                  className="p-1.5 rounded-sm text-muted-foreground hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Assets */}
        <div className="flex-1 bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50 flex justify-between items-end">
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3">Select Available Assets</h3>
              <div className="relative w-72">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search assets by name or serial..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
            
            <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary-100">
              {selectedAssetIds.length} Asset{selectedAssetIds.length !== 1 && 's'} Selected
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingAssets ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : assets.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-12">No available assets found</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {assets.map((asset: any) => {
                  const isSelected = selectedAssetIds.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => toggleAssetSelection(asset.id)}
                      className={`relative border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm flex gap-3 items-center ${
                        isSelected ? 'border-primary-500 bg-primary/10/30 shadow-sm' : 'border-border bg-card hover:border-gray-300'
                      }`}
                    >
                      <div className="absolute top-3 right-3">
                        {isSelected ? (
                          <CheckCircle2 size={18} className="text-primary fill-primary-50" />
                        ) : (
                          <Circle size={18} className="text-gray-300" />
                        )}
                      </div>
                      
                      {/* Left: Product Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border/50 flex-shrink-0">
                        {asset.image_url ? (
                          <img 
                            src={getProfilePictureUrl(asset.image_url) || ''} 
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={24} className="text-muted-foreground opacity-70" />
                        )}
                      </div>
                      
                      {/* Right: Details */}
                      <div className="flex flex-col flex-1 min-w-0 pr-5">
                        <h4 className="text-[12px] font-medium text-foreground leading-tight mb-1 truncate">{asset.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2 truncate">
                          {typeof asset.category === 'string' ? asset.category : (asset.category?.name || 'Asset')} • SN: {asset.serial_number}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-sm mt-auto">
            <span className="text-xs text-muted-foreground font-medium">Page {assetPage} of {totalAssetPages}</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setAssetPage(p => Math.max(1, p - 1))}
                disabled={assetPage === 1}
                className="p-1.5 rounded-sm text-muted-foreground hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setAssetPage(p => Math.min(totalAssetPages, p + 1))}
                disabled={assetPage === totalAssetPages}
                className="p-1.5 rounded-sm text-muted-foreground hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignAssetPage;


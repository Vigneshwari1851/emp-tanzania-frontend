import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Search, Plus, Filter, UserPlus, Loader2, RotateCcw, ChevronLeft, ChevronRight, Laptop } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import Select from "@/shared/components/ui/Select";
import { TablePaginationFooter } from '@/shared/components/ui/TablePaginationFooter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/shared/services/axiosInstance';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';
import { Button } from '@/shared/components/ui/button';
import QRScanner from '@/shared/components/common/QRScanner';
import { Card, CardContent } from '@/shared/components/ui/card';
import ReturnAssetModal from '@/shared/components/common/ReturnAssetModal';
import { useAuth } from '@/shared/context/AuthContext';
import { toast } from 'sonner';

const AssetList: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const {} = useAuth();
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [returnAssetId, setReturnAssetId] = useState<number | null>(null);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) setSearchTerm(q);
  }, [searchParams]);

  const handleScanSuccess = async (scannedCode: string) => {
    setIsScannerOpen(false);
    try {
      const response = await api.get('/assets', { params: { search: scannedCode } });
      const assets = response.data.data.assets;
      
      if (assets && assets.length > 0) {
        toast.success('Asset identified!');
        navigate(`/assets/${assets[0].id}`);
      } else {
        toast.error(`No asset found with serial number: ${scannedCode}`);
      }
    } catch (error) {
      toast.error('Scan lookup failed. Please try again.');
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
    setSearchParams(prev => {
      if (val) prev.set('search', val);
      else prev.delete('search');
      return prev;
    });
  };

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories and locations for filters
  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const res = await api.get('/assets/categories');
      return res.data.data || res.data;
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: async () => {
      const res = await api.get('/assets/locations');
      return res.data.data || res.data;
    }
  });

  // Assets list useQuery
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', searchTerm, currentPage, itemsPerPage, statusFilter, categoryFilter, locationFilter],
    queryFn: async () => {
      const response = await api.get('/assets', {
        params: { 
          search: searchTerm, 
          page: currentPage, 
          limit: itemsPerPage,
          status: statusFilter || undefined,
          categoryId: categoryFilter || undefined,
          locationId: locationFilter || undefined
        }
      });
      return response.data.data;
    }
  });

  const assets = data?.assets || [];
  const totalPages = data?.totalPages || 0;
  const totalAssets = data?.totalAssets || 0;

  const handleEdit = (asset: any) => {
    navigate(`/assets/edit/${asset.id}`);
  };







  const handleAssign = (asset: any) => {
    navigate(`/assets/assign/${asset.id}`);
  };

  const handleReturn = (id: number) => {
    setReturnAssetId(id);
  };

  if (error) return <div className="p-8 text-error">Error loading assets.</div>;

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Laptop className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Asset Management</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Track and manage your organization's assets</p>
          </div>
        </div>
        <button 
          className="h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-4 shadow-sm border-none rounded-sm flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => navigate('/assets/add')}
        >
          <Plus size={18} /> Add Asset
        </button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:max-w-md relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2 bg-card border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm placeholder:text-muted-foreground" 
            placeholder="Search assets by name, serial..." 
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`h-10 border font-medium px-4 rounded-sm shadow-sm flex items-center justify-center gap-2 text-sm transition-all w-full sm:w-auto ${
              showFilters 
                ? 'bg-primary/10 border-primary-200 text-primary' 
                : 'bg-card border-border hover:bg-muted text-foreground'
            }`}
          >
            <Filter size={18} className={showFilters ? "text-primary" : "text-muted-foreground"} /> Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-muted/50 border border-border p-4 sm:p-5 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end transition-all">
          <div>
            <Select
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
              placeholder="All Statuses"
              label="Status"
              options={[
                { value: "", label: "All Statuses" },
                { value: "AVAILABLE", label: "Available" },
                { value: "ASSIGNED", label: "Assigned" },
                { value: "MAINTENANCE", label: "Maintenance" },
                { value: "DISPOSED", label: "Disposed" },
              ]}
            />
          </div>

          <div>
            <Select
              value={categoryFilter}
              onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
              placeholder="All Categories"
              label="Category"
              options={[
                { value: "", label: "All Categories" },
                ...(categories?.map((cat: any) => ({ value: String(cat.id), label: cat.name })) || []),
              ]}
            />
          </div>

          <div>
            <Select
              value={locationFilter}
              onChange={(val) => { setLocationFilter(val); setCurrentPage(1); }}
              placeholder="All Locations"
              label="Location"
              options={[
                { value: "", label: "All Locations" },
                ...(locations?.map((loc: any) => ({ value: String(loc.id), label: loc.name })) || []),
              ]}
            />
          </div>

          <div>
            <button
              onClick={() => {
                setStatusFilter('');
                setCategoryFilter('');
                setLocationFilter('');
                setCurrentPage(1);
              }}
              disabled={!statusFilter && !categoryFilter && !locationFilter}
              className="w-full h-10 border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed bg-card text-foreground font-semibold px-4 rounded-sm shadow-sm text-xs transition-colors flex items-center justify-center"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* ── Assets Table ───────────────────────────────────────── */}
      <Card className="rounded-sm shadow-sm border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-semibold text-muted-foreground">Loading assets...</p>
              </div>
            ) : (
              <>
                {/* Desktop View: Table */}
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black" style={{ width: '25%' }}>Asset</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black" style={{ width: '15%' }}>Serial Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black" style={{ width: '15%' }}>Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black" style={{ width: '15%' }}>Purchase Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black" style={{ width: '10%' }}>Cost</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black" style={{ width: '10%' }}>Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-black" style={{ width: '10%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {assets.map((asset: any) => (
                        <tr 
                          key={asset.id} 
                          className="hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => handleEdit(asset)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0 shadow-sm">
                                {asset.image_url ? (
                                  <img 
                                    src={getProfilePictureUrl(asset.image_url) || ''} 
                                    alt={asset.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                                    {asset.name?.substring(0, 2).toUpperCase() || 'AS'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <Link 
                                  to={`/assets/edit/${asset.id}`} 
                                  className="font-normal text-foreground text-sm block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {asset.name}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{asset.serial_number}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{asset.category?.name || 'Uncategorized'}</td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground font-medium">
                            {asset.purchase_price ? formatCurrency(asset.purchase_price) : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              asset.status === 'AVAILABLE' 
                                ? 'bg-green-100 text-green-700' 
                                : asset.status === 'ASSIGNED'
                                  ? 'bg-blue-100 text-blue-700'
                                  : asset.status === 'MAINTENANCE'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-muted text-foreground'
                            }`}>
                              {asset.status === 'AVAILABLE' ? 'Available' : asset.status === 'ASSIGNED' ? 'Assigned' : asset.status === 'MAINTENANCE' ? 'Maintenance' : 'Disposed'}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {asset.status === 'AVAILABLE' && (
                                <button 
                                  className="p-1.5 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200 rounded text-emerald-600 transition-colors flex items-center gap-1 text-xs font-semibold"
                                  onClick={() => handleAssign(asset)}
                                  title="Assign"
                                >
                                  <UserPlus size={14} /> Assign
                                </button>
                              )}
                              {asset.status === 'ASSIGNED' && (
                                <button 
                                  className="p-1.5 hover:bg-amber-50 border border-amber-100 hover:border-amber-200 rounded text-amber-600 transition-colors flex items-center gap-1 text-xs font-semibold"
                                  onClick={() => handleReturn(asset.id)}
                                  title="Return Asset"
                                >
                                  <RotateCcw size={14} /> Return
                                </button>
                              )}
                              {asset.status !== 'AVAILABLE' && asset.status !== 'ASSIGNED' && (
                                <span className="text-muted-foreground text-xs italic">N/A</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {assets.map((asset: any) => (
                    <div 
                      key={asset.id} 
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer space-y-4"
                      onClick={() => handleEdit(asset)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0 shadow-sm">
                            {asset.image_url ? (
                              <img 
                                src={getProfilePictureUrl(asset.image_url) || ''} 
                                alt={asset.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                                {asset.name?.substring(0, 2).toUpperCase() || 'AS'}
                              </div>
                            )}
                          </div>
                          <div>
                            <Link 
                              to={`/assets/edit/${asset.id}`} 
                              className="font-semibold text-foreground text-sm block hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {asset.name}
                            </Link>
                            <span className="text-xs text-muted-foreground font-medium block mt-0.5">{asset.category?.name || 'Uncategorized'}</span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          asset.status === 'AVAILABLE' 
                            ? 'bg-green-100 text-green-700' 
                            : asset.status === 'ASSIGNED'
                              ? 'bg-blue-100 text-blue-700'
                              : asset.status === 'MAINTENANCE'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-muted text-foreground'
                        }`}>
                          {asset.status === 'AVAILABLE' ? 'Available' : asset.status === 'ASSIGNED' ? 'Assigned' : asset.status === 'MAINTENANCE' ? 'Maintenance' : 'Disposed'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-muted/50/50 p-3 rounded-lg border border-border/50">
                        <div>
                          <span className="text-muted-foreground font-medium block">Serial Number</span>
                          <span className="text-foreground font-bold mt-0.5 block truncate">{asset.serial_number || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium block">Purchase Price</span>
                          <span className="text-foreground font-extrabold mt-0.5 block">
                            {asset.purchase_price ? formatCurrency(asset.purchase_price) : 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2 border-t border-border/60 pt-2 mt-0.5">
                          <span className="text-muted-foreground font-medium block">Purchase Date</span>
                          <span className="text-foreground font-semibold mt-0.5 block">
                            {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                        {asset.status === 'AVAILABLE' && (
                          <button 
                            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-bold shadow-sm shadow-emerald-50"
                            onClick={() => handleAssign(asset)}
                          >
                            <UserPlus size={14} /> Assign Asset
                          </button>
                        )}
                        {asset.status === 'ASSIGNED' && (
                          <button 
                            className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-bold shadow-sm shadow-amber-50"
                            onClick={() => handleReturn(asset.id)}
                          >
                            <RotateCcw size={14} /> Return Asset
                          </button>
                        )}
                        {asset.status !== 'AVAILABLE' && asset.status !== 'ASSIGNED' && (
                          <span className="text-muted-foreground text-xs italic">No actions available</span>
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
      {!isLoading && assets.length > 0 && (
        <div className="mt-4">
          <TablePaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={itemsPerPage}
            totalRecords={totalAssets}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
            itemLabel="assets"
          />
        </div>
      )}

      {isScannerOpen && (
        <QRScanner 
          onScanSuccess={handleScanSuccess}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      <ReturnAssetModal 
        assetId={returnAssetId} 
        isOpen={!!returnAssetId} 
        onClose={() => setReturnAssetId(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}
      />
    </div>
  );
};

export default AssetList;

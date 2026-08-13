import React from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, History as HistoryIcon, Loader2, ShieldCheck, Clock } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import api from '@/shared/services/axiosInstance';


const formatActionType = (type: string) => {
  if (!type) return 'Status Update';
  switch (type.toUpperCase()) {
    case 'CREATE': return 'Asset Created';
    case 'UPDATE': return 'Specifications Updated';
    case 'STATUS_CHANGE': return 'Status Changed';
    case 'ASSIGN': return 'Custody Assigned';
    case 'UNASSIGN': return 'Asset Returned';
    case 'MAINTENANCE': return 'Sent to Maintenance';
    case 'DISPOSE': return 'Asset Disposed';
    default: return type.replace(/_/g, ' ');
  }
};

const AssetDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const { formatCurrency } = useCurrency();

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const res = await api.get(`/assets/${id}`);
      return res.data.data || res.data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (error || !asset) return <div className="p-8 text-red-500 font-poppins">Asset not found.</div>;

  return (
    <div className="w-full font-poppins space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/assets')}
            className="h-10 bg-card border border-border hover:bg-muted text-foreground font-bold px-4 rounded-sm shadow-sm flex items-center gap-2 transition-all group"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground leading-tight">{asset.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border capitalize ${
                asset.status === 'AVAILABLE' 
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800' 
                  : 'text-primary bg-primary/10 border-primary-100'
              }`}>
                {asset.status.toLowerCase()}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-muted-foreground font-mono text-xs">SN: {asset.serial_number}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate(`/assets/edit/${asset.id}`)}
            className="h-10 bg-card border border-border hover:bg-muted text-foreground font-bold px-4 rounded-sm shadow-sm flex items-center gap-2 transition-all group"
          >
            <Edit2 size={16} /> Edit Asset
          </button>
          {asset.status === 'AVAILABLE' && (
            <button 
              onClick={() => navigate(`/assets/assign/${asset.id}`)}
              className="h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold px-4 shadow-sm border-none rounded-sm flex items-center gap-2 transition-all group"
            >
              <ShieldCheck size={16} /> Assign
            </button>
          )}
        </div>
      </div>
 
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Main Content (Left) */}
        <div className="flex-1 w-full space-y-6">
          <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="text-primary" size={18} /> Technical Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50/50 border border-border rounded-lg">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Category</div>
                <div className="text-sm font-semibold text-foreground mt-1 leading-tight">{asset.category?.name}</div>
              </div>
              <div className="p-4 bg-muted/50/50 border border-border rounded-lg">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Current Location</div>
                <div className="text-sm font-semibold text-foreground mt-1 leading-tight">{asset.location?.name}</div>
              </div>
              <div className="p-4 bg-muted/50/50 border border-border rounded-lg">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Purchase Date</div>
                <div className="text-sm font-semibold text-foreground mt-1 leading-tight">
                  {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'Not Recorded'}
                </div>
              </div>
              <div className="p-4 bg-muted/50/50 border border-border rounded-lg">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Asset Value</div>
                <div className="text-sm font-semibold text-foreground mt-1 leading-tight">
                  {asset.purchase_price ? formatCurrency(asset.purchase_price) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Specifications Viewer Card */}
          {asset.specifications && (() => {
            const specs = typeof asset.specifications === 'string' ? JSON.parse(asset.specifications) : asset.specifications;
            
            // Check if specifications is completely empty (no keys)
            if (!specs || Object.keys(specs).length === 0) return null;

            // Formatted key-value labels mapper
            const formatSpecKey = (key: string) => {
              return key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase())
                .replace('Imei', 'IMEI')
                .replace('Mac', 'MAC')
                .replace('Sim', 'SIM')
                .replace('Ip', 'IP')
                .replace('Os', 'OS');
            };

            return (
              <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="text-primary" size={18} /> Category-Specific Attributes ({asset.category?.name})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(specs).map(([key, val]: any) => {
                    if (!val) return null;
                    return (
                      <div key={key} className="p-4 bg-muted/50/50 border border-border rounded-lg flex justify-between items-center">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{formatSpecKey(key)}</div>
                        <div className="text-sm font-semibold text-foreground leading-tight">{String(val)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
 
          {/* Assignment Info */}
          {asset.status === 'ASSIGNED' && asset.assignments?.[0] && (
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-sm rotate-3">
                    {asset.assignments[0].user?.details?.first_name?.[0] || 'U'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white w-5 h-5 rounded-full shadow-sm"></div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-[11px] font-medium text-primary uppercase tracking-wider mb-1">Current Custodian</div>
                  <div className="text-lg font-semibold text-foreground leading-tight">
                    {asset.assignments[0].user?.details?.first_name} {asset.assignments[0].user?.details?.last_name}
                  </div>
                  <div className="text-muted-foreground font-medium">{asset.assignments[0].user?.email}</div>
                  <div className="mt-6 flex flex-wrap justify-center md:justify-start items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-muted-foreground" />
                      <span className="text-sm font-normal text-foreground">Assigned on: {new Date(asset.assignments[0].issue_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/assets/assign/${asset.id}`)}
                  className="h-10 bg-card border border-border hover:bg-muted text-foreground font-bold px-4 rounded-sm shadow-sm flex items-center gap-2 transition-all group"
                >
                  Manage Assignment
                </button>
              </div>
            </div>
          )}
        </div>
 
        {/* Sidebar: Real History (Right) */}
        <div className="w-full xl:w-[380px] space-y-6">
          <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6 font-poppins">
            <h4 className="text-[12px] font-medium text-foreground pb-4 border-b border-border flex items-center gap-2">
              <HistoryIcon size={18} className="text-primary" /> Asset Audit Trail
            </h4>
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-muted">
              {asset.history?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground italic text-sm">No history records found.</div>
              ) : (
                asset.history?.map((log: any, idx: number) => (
                  <div key={log.id} className="relative pl-8">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                      idx === 0 ? 'bg-primary' : 'bg-muted'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-card animate-pulse' : 'bg-slate-400'}`}></div>
                    </div>
                    <div className="text-sm font-semibold text-gray-950">{formatActionType(log.action_type || log.action)}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{log.new_value || log.details || `Asset ${asset.name} updated`}</div>
                    <div className="text-[10px] font-bold text-muted-foreground mt-2 flex items-center gap-2">
                      <span className="bg-muted/50 px-2 py-0.5 rounded border border-border">{log.changed_by?.details ? `${log.changed_by.details.first_name || ''} ${log.changed_by.details.last_name || ''}`.trim() : (log.changed_by?.username || 'System')}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link to="/history" className="block text-center mt-6 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors">
              View Full Organization History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailPage;

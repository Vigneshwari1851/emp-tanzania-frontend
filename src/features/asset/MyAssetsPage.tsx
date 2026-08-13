import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { Card, CardContent } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import {
    Plus, Laptop, Wrench, RefreshCw, Package,
    History, Download, ExternalLink, HardDrive,
    Monitor, Smartphone, Headphones, CheckCircle2, Loader2
} from 'lucide-react';
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';

interface AssignedAsset {
    id: number;
    asset_id: number;
    status: string;
    assignment_date: string;
    asset: {
        id: number;
        name: string;
        serial_number: string;
        asset_code?: string;
        category: {
            name: string;
        };
        model?: string;
        manufacturer?: string;
    };
    issue_date: string;
}

interface AssetRequest {
    id: number;
    request_type: 'NEW' | 'REPAIR' | 'REPLACEMENT' | 'RETURN';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    sub_category?: string;
    notes?: string;
    created_at: string;
    specific_asset?: {
        id: number;
        name: string;
        asset_code?: string;
    };
}

export function MyAssetsPage() {
    const [assignedAssets, setAssignedAssets] = useState<AssignedAsset[]>([]);
    const [requests, setRequests] = useState<AssetRequest[]>([]);
    const [activeTab, setActiveTab] = useState('gear');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const navigate = useOrgNavigate();

    const fetchMyData = async () => {
        try {
            const [assignmentsRes, requestsRes] = await Promise.all([
                api.get('/assignments/my-assets'),
                api.get('/assets/requests')
            ]);

            setAssignedAssets(assignmentsRes.data.data.filter((a: any) => a.status === 'ACTIVE' || a.status === 'RETURN_REQUESTED'));
            setRequests(requestsRes.data.data);
        } catch (err: any) {
            toast.error('Failed to load your assets');
        }
    };

    useEffect(() => {
        fetchMyData();
    }, []);

    const handleAcceptReturn = async (assetId: number) => {
        try {
            setActionLoading(assetId);
            await api.post(`/assignments/${assetId}/accept-return`);
            toast.success('Return request acknowledged');
            fetchMyData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to accept return');
        } finally {
            setActionLoading(null);
        }
    };



    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
            case 'APPROVED': return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
            case 'REJECTED': return 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
            case 'FULFILLED': return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60';
            default: return 'bg-muted text-foreground border-border';
        }
    };

    const getCategoryIcon = (category: string) => {
        const c = category.toLowerCase();
        if (c.includes('laptop') || c.includes('computer')) return <Monitor className="w-6 h-6" />;
        if (c.includes('phone') || c.includes('mobile')) return <Smartphone className="w-6 h-6" />;
        if (c.includes('audio') || c.includes('head')) return <Headphones className="w-6 h-6" />;
        if (c.includes('drive') || c.includes('storage')) return <HardDrive className="w-6 h-6" />;
        return <Laptop className="w-6 h-6" />;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40';
            case 'HIGH': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40';
            case 'MEDIUM': return 'text-primary bg-primary/10';
            default: return 'text-muted-foreground bg-muted';
        }
    };

    return (
        <div className="w-full">
            <PageHeader
                title="My Assets"
                description="Manage your assigned corporate equipment and service requests"
                icon={<Laptop className="size-8" />}
                action={
                    <Button
                        onClick={() => navigate('/my-assets/request')}
                        className="gap-2 h-10 bg-primary hover:bg-primary/95 text-white"
                    >
                        <Plus className="w-4 h-4" />
                        New Requisition
                    </Button>
                }
            />

            {/* ── Tabs Navigation ────────────────────────────────────── */}
            <Tabs defaultValue="gear" className="w-full" onValueChange={setActiveTab} value={activeTab}>
                <div className="flex border-b border-border mb-6">
                    <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
                        <TabsTrigger
                            value="gear"
                            className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-muted-foreground hover:text-foreground transition-all bg-transparent shadow-none -mb-px text-xs flex items-center gap-2"
                        >
                            <Package className="w-4 h-4" />
                            <span>My Gear</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="requests"
                            className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-muted-foreground hover:text-foreground transition-all bg-transparent shadow-none -mb-px text-xs flex items-center gap-2"
                        >
                            <Wrench className="w-4 h-4" />
                            <span>Service Requests</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="gear" className="mt-0">
                    <Card className="rounded-sm shadow-sm border border-border overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] border-collapse">
                                    <thead className="bg-muted border-b border-border">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-black tracking-wider w-12"></th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Asset</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Category</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Identification</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Issue Date</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-black tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                        {assignedAssets.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                                    No active assets assigned to your profile.
                                                </td>
                                            </tr>
                                        ) : (
                                            assignedAssets.map(assignment => (
                                                <tr key={assignment.id} className="hover:bg-muted transition-colors">
                                                    <td className="pl-6 pr-3 py-4">
                                                        <div className="p-2 bg-primary/10 text-primary rounded-sm">
                                                            {getCategoryIcon(assignment.asset.category.name)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-foreground text-sm">{assignment.asset.name}</p>
                                                                    {assignment.status === 'RETURN_REQUESTED' && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                                            Return Requested
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">{assignment.asset.manufacturer} {assignment.asset.model}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-sm text-foreground">{assignment.asset.category.name}</span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-medium text-muted-foreground uppercase">Code:</span>
                                                                <span className="text-xs font-mono text-foreground">{assignment.asset.asset_code || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-medium text-muted-foreground uppercase">S/N:</span>
                                                                <span className="text-xs font-mono text-foreground">{assignment.asset.serial_number}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-sm text-gray-600">
                                                            {new Date(assignment.issue_date).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {assignment.status === 'RETURN_REQUESTED' ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 text-amber-600 border-amber-200 hover:bg-amber-50 font-medium"
                                                                    onClick={() => handleAcceptReturn(assignment.asset.id)}
                                                                    disabled={actionLoading === assignment.asset.id}
                                                                >
                                                                    {actionLoading === assignment.asset.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                                                    Acknowledge Return
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-primary hover:text-primary hover:bg-primary/10 font-medium"
                                                                        onClick={() => navigate('/my-assets/request', { state: { assetId: assignment.asset.id, type: 'REPAIR' } })}
                                                                    >
                                                                        Repair
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-gray-600 hover:text-foreground hover:bg-muted font-medium"
                                                                    >
                                                                        Upgrade
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="requests">
                    <Card className="rounded-sm shadow-sm border border-border overflow-hidden">
                        <div className="p-6 border-b border-border bg-card">
                            <h3 className="text-lg font-semibold text-foreground">Service Requests</h3>
                            <p className="text-sm text-muted-foreground mt-1">View and track your equipment maintenance and support tickets</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] border-collapse">
                                <thead className="bg-muted border-b border-border">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-black tracking-wider">Reference</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Request Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Asset</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-black tracking-wider">Submitted</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {requests.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No service requests found.</td>
                                        </tr>
                                    ) : (
                                        requests.map(request => (
                                            <tr key={request.id} className="hover:bg-muted transition-colors">
                                                <td className="px-6 py-4 font-medium text-primary text-sm">REQ-{request.id.toString().padStart(5, '0')}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`p-1.5 rounded-sm ${getPriorityColor(request.priority)}`}>
                                                                {request.request_type === 'NEW' ? <Plus className="w-3.5 h-3.5" /> :
                                                                    request.request_type === 'REPAIR' ? <Wrench className="w-3.5 h-3.5" /> :
                                                                        <RefreshCw className="w-3.5 h-3.5" />}
                                                            </span>
                                                            <span className="text-sm font-medium text-foreground">{request.request_type}</span>
                                                        </div>
                                                        {request.sub_category && (
                                                            <span className="text-xs text-muted-foreground pl-8">{request.sub_category}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {request.specific_asset ? (
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">{request.specific_asset.name}</p>
                                                            <p className="text-xs text-muted-foreground">{request.specific_asset.asset_code}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground italic">General</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                                                        {request.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-muted-foreground">
                                                    {new Date(request.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="h-10" /> {/* Spacer */}
        </div>
    );
}


import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { usePayroll } from '../context/PayrollContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Textarea } from '@/shared/components/ui/payroll-lib/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { ArrowLeft, Save, Receipt, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCurrency } from '@/shared/hooks/useCurrency';

export default function ReimbursementTypeForm() {
    const { currencySymbol } = useCurrency();
    const navigate = useOrgNavigate();
    const { id } = useParams();
    const { addReimbursementType, updateReimbursementType, reimbTypes, groups } = usePayroll();

    const [form, setForm] = useState({
        name: '',
        limit: 0,
        frequency: 'Monthly',
        description: '',
        payroll_group_id: 'all'
    });

    const [isLoading] = useState(false);

    useEffect(() => {
        if (id && reimbTypes.length > 0) {
            const rt = reimbTypes.find(r => r.id === id);
            if (rt) {
                setForm({
                    name: rt.type,
                    limit: rt.limit,
                    frequency: rt.period,
                    description: rt.label,
                    payroll_group_id: rt.payrollGroupId || 'all'
                });
            }
        }
    }, [id, reimbTypes]);

    const handleSubmit = async () => {
        if (!form.name) {
            toast.error('Reimbursement name is required');
            return;
        }

        // Duplicate Check - Simple Group-based check
        const isDuplicateMember = reimbTypes.some(r => 
            r.type.toLowerCase() === form.name.trim().toLowerCase() && 
            r.id !== id &&
            (r.payrollGroupId || 'all') === form.payroll_group_id
        );

        if (isDuplicateMember) {
            toast.error(`Reimbursement type "${form.name}" for this group already exists.`);
            return;
        }
        
        try {
            const data = {
                type: form.name,
                label: form.description || form.name,
                limit: form.limit,
                period: form.frequency,
                payroll_group_id: form.payroll_group_id === 'all' ? null : form.payroll_group_id
            };
            
            if (id) {
                await updateReimbursementType(id, data);
            } else {
                await addReimbursementType(data);
            }
            toast.success(id ? 'Reimbursement updated' : 'Reimbursement created');
            navigate('/payroll/setup');
        } catch (error) {
            toast.error('Failed to save reimbursement type');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 text-left">
                <button onClick={() => navigate(-1)} className="icon-circle-btn">
                    <ArrowLeft />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">{id ? 'Edit Reimbursement Setup' : 'Add Reimbursement Setup'}</h1>
                    <p className="text-muted-foreground text-sm">Configure allowance limits based on Payroll Groups</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-primary-100 shadow-sm">
                    <CardHeader className="text-left border-b border-gray-50 bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-50 rounded-lg">
                                <Receipt className="size-5 text-violet-600" />
                            </div>
                            <div>
                                <CardTitle>Basic Configuration</CardTitle>
                                <CardDescription>Enter the type name and maximum claimable amount</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 text-left">
                        <div className="space-y-2">
                            <Label>Reimbursement Name</Label>
                            <Input 
                                placeholder="e.g. Broadband Allowance" 
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Max Limit ({currencySymbol})</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={form.limit === 0 ? '' : form.limit}
                                    onChange={(e) => setForm({ ...form, limit: e.target.value === '' ? 0 : Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <Select 
                                    value={form.frequency}
                                    onValueChange={(val) => setForm({ ...form, frequency: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                                        <SelectItem value="Annually">Annually</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description / Policy</Label>
                            <Textarea 
                                placeholder="Short description of what expenses are covered..." 
                                className="min-h-[100px]"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary-100 shadow-sm overflow-hidden">
                    <CardHeader className="text-left border-b border-gray-50 bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <MapPin className="size-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle>Target Criteria</CardTitle>
                                <CardDescription>Map this setup to a specific group</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5 text-left">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Building2 className="size-3 text-muted-foreground" />
                                Target Payroll Group
                            </Label>
                            <Select 
                                value={form.payroll_group_id} 
                                onValueChange={(val) => setForm({ ...form, payroll_group_id: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Groups" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Groups</SelectItem>
                                    {groups.map(group => (
                                        <SelectItem key={group.id} value={group.id.toString()}>{group.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground font-normal mt-1 italic">Note: Only employees in this group will be able to claim this reimbursement.</p>
                        </div>

                        <div className="mt-8 pt-6 border-t font-bold space-y-3">
                            <Button className="w-full h-11" onClick={handleSubmit}>
                                <Save className="size-4 mr-2" />
                                {id ? 'Update Setup' : 'Save Setup'}
                            </Button>
                            <Button variant="outline" className="w-full h-11" onClick={() => navigate(-1)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

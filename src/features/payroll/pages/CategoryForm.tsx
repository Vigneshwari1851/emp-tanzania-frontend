import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { usePayroll } from '../context/PayrollContext';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { toast } from 'sonner';

export default function CategoryForm() {
    const navigate = useOrgNavigate();
    const { id } = useParams();
    const { addCategory, updateCategory, categories } = usePayroll();

    const [form, setForm] = useState({
        name: '',
        frequency: 'Monthly',
        payDay: '1st of Month',
        status: true
    });
    const [customPayDay, setCustomPayDay] = useState('');

    // 👉 If edit mode
    useEffect(() => {
        if (id) {
            const cat = categories.find(c => c.id === id);
            if (cat) {
                const isCustom = !['1st of Month', '7th of Month', '15th of Month', 'Last Day of Month'].includes(cat.payDay);
                setForm({
                    name: cat.name,
                    frequency: cat.frequency,
                    payDay: isCustom ? 'Custom' : cat.payDay,
                    status: cat.status
                });
                if (isCustom) setCustomPayDay(cat.payDay);
            }
        }
    }, [id, categories]);

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            toast.error('Category name required');
            return;
        }

        // Duplicate Check
        const isDuplicateToken = categories.some(c => 
            c.name.toLowerCase() === form.name.trim().toLowerCase() && c.id !== id
        );

        if (isDuplicateToken) {
            toast.error(`Category "${form.name}" already exists.`);
            return;
        }

        try {
            if (!categories) {
                toast.error('Payroll data is still loading. Please try again in a moment.');
                return;
            }

            const payload = {
                ...form,
                payDay: form.payDay === 'Custom' ? customPayDay : form.payDay
            };

            if (form.payDay === 'Custom' && !customPayDay.trim()) {
                toast.error('Please enter a custom pay day');
                return;
            }

            if (id) {
                await updateCategory(id, payload);
            } else {
                await addCategory(payload);
            }
            toast.success(id ? 'Category updated' : 'Category created');
            navigate('/payroll/setup');
        } catch (error: any) {
            console.error("Submission error:", error);
            const msg = error.response?.data?.message || error.message || 'Failed to save category';
            toast.error(msg);
        }
    };

    return (
        <div className="w-full py-6">

            {/* FULL PAGE CARD */}
            <div className="w-full bg-card border border-border rounded-lg shadow-sm">

                {/* HEADER */}
                <div className="px-6 py-4 border-b bg-muted/50 rounded-t-xl">
                    <h2 className="text-xl font-semibold text-foreground">
                        {id ? 'Edit Category' : 'Add Category'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage payment category details
                    </p>
                </div>

                {/* FORM BODY */}
                <div className="p-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Category Name */}
                        <div className="space-y-2">
                            <Label>Category Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Enter category name"
                            />
                        </div>

                        {/* Frequency */}
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
                                    <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                                    <SelectItem value="Annually">Annually</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pay Day */}
                        <div className="space-y-2">
                            <Label>Pay Day</Label>
                            <Select
                                value={form.payDay}
                                onValueChange={(val) => setForm({ ...form, payDay: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1st of Month">1st of Month</SelectItem>
                                    <SelectItem value="7th of Month">7th of Month</SelectItem>
                                    <SelectItem value="15th of Month">15th of Month</SelectItem>
                                    <SelectItem value="Last Day of Month">Last Day of Month</SelectItem>
                                    <SelectItem value="Custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>

                            {form.payDay === 'Custom' && (
                                <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <Input 
                                        placeholder="e.g. 10th of every month" 
                                        value={customPayDay}
                                        onChange={(e) => setCustomPayDay(e.target.value)}
                                        className="border-primary-200 focus:border-primary"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                                <span className="text-sm text-gray-600">
                                    Active Category
                                </span>
                                <input
                                    type="checkbox"
                                    checked={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.checked })}
                                />
                            </div>
                        </div>

                    </div>

                    {/* ACTIONS */}
                    <div className="flex justify-end gap-3 pt-6 mt-6 border-t font-bold">
                        <Button variant="outline" onClick={() => navigate(-1)} className="h-11 px-8">
                            Cancel
                        </Button>
                        <Button className="h-11 px-8" onClick={handleSubmit}>
                            {id ? 'Update Category' : 'Create Category'}
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
}
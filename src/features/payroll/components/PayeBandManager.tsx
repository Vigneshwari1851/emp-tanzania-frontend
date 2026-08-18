import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { toast } from 'sonner';
import { getPayeBands, savePayeBands, type PayeBand } from '../services/statutory';

const DEFAULT_BANDS: PayeBand[] = [
    { upper_limit: 270000, rate: 0 },
    { upper_limit: 520000, rate: 0.08 },
    { upper_limit: 760000, rate: 0.20 },
    { upper_limit: 1000000, rate: 0.25 },
    { upper_limit: null, rate: 0.30 },
];

export default function PayeBandManager() {
    const [bands, setBands] = useState<PayeBand[]>(DEFAULT_BANDS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        loadBands();
    }, []);

    const loadBands = async () => {
        try {
            const data = await getPayeBands();
            if (data && data.length > 0) {
                // Normalize: backend returns { upper_limit, rate } — ensure sorted
                const sorted = [...data].sort((a, b) => {
                    const aVal = a.upper_limit ?? Infinity;
                    const bVal = b.upper_limit ?? Infinity;
                    return aVal - bVal;
                });
                setBands(sorted);
            }
        } catch {
            toast.error('Failed to load PAYE bands');
        } finally {
            setLoading(false);
        }
    };

    const validate = (input: PayeBand[]): string[] => {
        const errs: string[] = [];
        if (input.length === 0) {
            errs.push('At least one tax band is required');
            return errs;
        }

        const sorted = [...input].sort((a, b) => {
            const aVal = a.upper_limit ?? Infinity;
            const bVal = b.upper_limit ?? Infinity;
            return aVal - bVal;
        });

        const nullBands = sorted.filter(b => b.upper_limit === null || b.upper_limit === undefined);
        if (nullBands.length !== 1) {
            errs.push('Exactly one band must have no upper limit (the top tax bracket)');
        }

        if (sorted[0].upper_limit !== null && sorted[0].upper_limit !== undefined && sorted[0].upper_limit! <= 0) {
            errs.push('First band upper limit must be greater than 0');
        }

        for (const band of sorted) {
            if (band.rate < 0 || band.rate > 1) {
                errs.push(`Invalid rate ${(band.rate * 100).toFixed(1)}%. Must be between 0% and 100%`);
            }
        }

        // Check no negative upper limits (except null)
        for (let i = 0; i < sorted.length; i++) {
            const b = sorted[i];
            if (b.upper_limit !== null && b.upper_limit !== undefined && b.upper_limit < 0) {
                errs.push(`Band ${i + 1}: upper limit cannot be negative`);
            }
        }

        // Check no overlapping ranges
        for (let i = 0; i < sorted.length - 1; i++) {
            const curr = sorted[i];
            const next = sorted[i + 1];
            if (curr.upper_limit !== null && curr.upper_limit !== undefined &&
                next.upper_limit !== null && next.upper_limit !== undefined) {
                if (curr.upper_limit! >= next.upper_limit!) {
                    errs.push(`Band overlap: TZS ${curr.upper_limit} overlaps with TZS ${next.upper_limit}`);
                }
            }
        }

        // Check rates non-decreasing
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].rate < sorted[i - 1].rate) {
                errs.push(`Tax rates must be non-decreasing. Band ${i + 1} rate (${(sorted[i].rate * 100).toFixed(1)}%) is lower than band ${i} (${(sorted[i - 1].rate * 100).toFixed(1)}%)`);
            }
        }

        return errs;
    };

    const addBand = () => {
        // Insert before the last (null) band
        const lastBand = bands[bands.length - 1];
        const secondLast = bands.length >= 2 ? bands[bands.length - 2] : null;

        const prevUpper = secondLast?.upper_limit ?? 0;
        const newUpper = prevUpper + 200000; // default gap of 200k

        const newBands = [...bands];
        // Insert before last
        newBands.splice(newBands.length - 1, 0, {
            upper_limit: newUpper,
            rate: 0.15, // default mid-range rate
        });
        setBands(newBands);
        setErrors([]);
    };

    const removeBand = (index: number) => {
        // Don't allow removing the last (null) band
        if (bands[index].upper_limit === null || bands[index].upper_limit === undefined) {
            toast.error('Cannot remove the top tax bracket');
            return;
        }
        const newBands = bands.filter((_, i) => i !== index);
        setBands(newBands);
        setErrors([]);
    };

    const updateBand = (index: number, field: 'upper_limit' | 'rate', rawValue: string) => {
        const newBands = [...bands];
        if (field === 'upper_limit') {
            if (rawValue === '' || rawValue === 'null') {
                newBands[index] = { ...newBands[index], upper_limit: null };
            } else {
                const num = parseFloat(rawValue);
                newBands[index] = { ...newBands[index], upper_limit: isNaN(num) ? 0 : num };
            }
        } else {
            // rate: accept percentage input (e.g., 30) and store as decimal (0.30)
            const num = parseFloat(rawValue);
            newBands[index] = { ...newBands[index], rate: isNaN(num) ? 0 : num / 100 };
        }
        setBands(newBands);
        setErrors([]);
    };

    const handleSave = async () => {
        const validationErrors = validate(bands);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            validationErrors.forEach(e => toast.error(e));
            return;
        }

        setSaving(true);
        try {
            await savePayeBands(bands);
            toast.success('PAYE bands saved successfully');
            setErrors([]);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to save PAYE bands';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                    <p className="font-medium">Tanzania Progressive PAYE Tax Bands</p>
                    <p className="mt-1">
                        Monthly taxable income is taxed progressively across each band.
                        The top band (no upper limit) applies to all income above the previous band's threshold.
                        Changes apply to all future payroll calculations for this organization.
                    </p>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    {errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-red-700">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{err}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-600">
                            <th className="py-2 px-3 font-medium w-12">#</th>
                            <th className="py-2 px-3 font-medium">Upper Limit (TZS)</th>
                            <th className="py-2 px-3 font-medium">Tax Rate (%)</th>
                            <th className="py-2 px-3 font-medium w-20">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bands.map((band, i) => {
                            const isTopBand = band.upper_limit === null || band.upper_limit === undefined;
                            return (
                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                                    <td className="py-2 px-3">
                                        {isTopBand ? (
                                            <span className="px-3 py-1.5 text-gray-500 italic text-xs">
                                                No upper limit
                                            </span>
                                        ) : (
                                            <Input
                                                type="number"
                                                value={band.upper_limit ?? ''}
                                                onChange={(e) => updateBand(i, 'upper_limit', e.target.value)}
                                                className="w-full max-w-[180px]"
                                                min={0}
                                                step={1000}
                                            />
                                        )}
                                    </td>
                                    <td className="py-2 px-3">
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="number"
                                                value={(band.rate * 100).toFixed(1)}
                                                onChange={(e) => updateBand(i, 'rate', e.target.value)}
                                                className="w-24"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                            />
                                            <span className="text-gray-500">%</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-3">
                                        {!isTopBand && (
                                            <button
                                                onClick={() => removeBand(i)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Remove band"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBand}
                    className="gap-1.5"
                >
                    <Plus className="h-4 w-4" />
                    Add Band
                </Button>
                <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-1.5"
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {saving ? 'Saving...' : 'Save PAYE Bands'}
                </Button>
            </div>
        </div>
    );
}

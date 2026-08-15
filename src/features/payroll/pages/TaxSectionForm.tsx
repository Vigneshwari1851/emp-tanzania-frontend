import { useState, useEffect, useRef } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { usePayroll } from '../context/PayrollContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { Badge } from '@/shared/components/ui/payroll-lib/badge';
import { ArrowLeft, Save, Landmark, X, Pencil, FileText, DollarSign, Layers } from 'lucide-react';
import { toast } from 'sonner';

import { useCurrency } from '@/shared/hooks/useCurrency';

interface DefaultSection {
    code: string;
    label: string;
    limit: number;
    instruments: string[];
}

const COUNTRY_TAX_SECTIONS: Record<string, DefaultSection[]> = {
    'india': [
        { code: '80C', label: 'Savings & Investments', limit: 150000, instruments: ['PPF', 'ELSS', 'LIC Premium', 'Home Loan Principal', 'Tuition Fees', 'NSC', 'Tax Saver FD', 'Sukanya Samriddhi', 'ULIP'] },
        { code: '80CCD(1B)', label: 'NPS Contribution', limit: 50000, instruments: ['NPS – Tier I'] },
        { code: '80D', label: 'Health Insurance', limit: 50000, instruments: ['Health Insurance (Self/Family)', 'Health Insurance (Parents)', 'Preventive Health Check-up'] },
        { code: '80E', label: 'Education Loan Interest', limit: 0, instruments: ['Education Loan Interest'] },
        { code: '24B', label: 'Home Loan Interest', limit: 200000, instruments: ['Home Loan Interest'] },
        { code: '80G', label: 'Charitable Donations', limit: 0, instruments: ['PM Relief Fund', 'Approved Institutions', 'Other Donations'] },
        { code: '80TTA', label: 'Savings Bank Interest', limit: 10000, instruments: ['Savings Bank Interest'] },
        { code: '80GG', label: 'Rent Paid (No HRA)', limit: 0, instruments: ['Rent Paid'] },
        { code: '10(13A)', label: 'HRA Exemption', limit: 0, instruments: ['House Rent Allowance'] },
    ],
    'usa': [
        { code: '401(k)', label: '401(k) Contributions', limit: 23500, instruments: ['401(k) – Traditional', '401(k) – Roth'] },
        { code: 'IRA', label: 'IRA Contributions', limit: 7000, instruments: ['Traditional IRA', 'Roth IRA', 'SEP IRA'] },
        { code: 'HSA', label: 'Health Savings Account', limit: 4150, instruments: ['HSA – Individual', 'HSA – Family'] },
        { code: 'FSA', label: 'Flexible Spending Account', limit: 3200, instruments: ['Health FSA', 'Dependent Care FSA'] },
        { code: 'SLI', label: 'Student Loan Interest', limit: 2500, instruments: ['Student Loan Interest'] },
        { code: 'MI', label: 'Mortgage Interest', limit: 0, instruments: ['Mortgage Interest Deduction'] },
        { code: 'CHARITY', label: 'Charitable Contributions', limit: 0, instruments: ['Cash Donations', 'Non-Cash Donations'] },
    ],
    'singapore': [
        { code: 'CPF', label: 'CPF Contributions', limit: 0, instruments: ['CPF – Employee', 'CPF – Employer'] },
        { code: 'EIR', label: 'Earned Income Relief', limit: 0, instruments: ['Earned Income Relief'] },
        { code: 'CFR', label: 'Course Fees Relief', limit: 5500, instruments: ['Course Fees'] },
        { code: 'NSR', label: 'NSman Relief', limit: 0, instruments: ['NSman Relief'] },
        { code: 'SRS', label: 'Supplementary Retirement Scheme', limit: 15300, instruments: ['SRS Contribution'] },
    ],
    'uae': [
        { code: 'N/A', label: 'No Income Tax', limit: 0, instruments: [] },
    ],
    'uk': [
        { code: 'ISA', label: 'ISA Allowance', limit: 20000, instruments: ['Cash ISA', 'Stocks & Shares ISA', 'Lifetime ISA'] },
        { code: 'Pension', label: 'Pension Contributions', limit: 60000, instruments: ['Workplace Pension', 'Personal Pension', 'SIPP'] },
        { code: 'GIFTAID', label: 'Gift Aid', limit: 0, instruments: ['Gift Aid Donations'] },
        { code: 'MA', label: 'Marriage Allowance', limit: 1260, instruments: ['Marriage Allowance'] },
        { code: 'SLI', label: 'Student Loan Interest', limit: 0, instruments: ['Student Loan Repayment'] },
    ],
    'tanzania': [
        { code: 'PR', label: 'Personal Relief', limit: 0, instruments: ['Personal Relief'] },
        { code: 'IR', label: 'Insurance Relief', limit: 0, instruments: ['Life Insurance', 'Health Insurance'] },
        { code: 'MIR', label: 'Mortgage Interest Relief', limit: 0, instruments: ['Mortgage Interest'] },
        { code: 'DPR', label: 'Disabled Person Relief', limit: 0, instruments: ['Disability Certificate'] },
    ],
};

export default function TaxSectionForm() {
    const { currencySymbol, country } = useCurrency();
    const navigate = useOrgNavigate();
    const { id } = useParams();
    const { addTaxSection, updateTaxSection, taxSections } = usePayroll();
    const tagInputRef = useRef<HTMLInputElement>(null);

    const countryKey = (country || 'india').toLowerCase();
    const defaults = COUNTRY_TAX_SECTIONS[countryKey] || COUNTRY_TAX_SECTIONS['india'];

    const [form, setForm] = useState({
        code: '',
        label: '',
        limit: 0,
    });
    const [instruments, setInstruments] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isCustomCode, setIsCustomCode] = useState(false);

    useEffect(() => {
        if (id) {
            const section = taxSections.find(s => s.id === id);
            if (section) {
                setForm({
                    code: section.section,
                    label: section.label,
                    limit: section.limit,
                });
                setInstruments(section.instruments || []);
                const isKnown = defaults.some(d => d.code === section.section);
                setIsCustomCode(!isKnown);
            }
        }
    }, [id, taxSections, countryKey]);

    const handleCodeSelect = (code: string) => {
        if (code === '__custom__') {
            setIsCustomCode(true);
            setForm({ code: '', label: '', limit: 0 });
            setInstruments([]);
            return;
        }
        setIsCustomCode(false);
        const match = defaults.find(d => d.code === code);
        if (match) {
            setForm({ code: match.code, label: match.label, limit: match.limit });
            setInstruments(match.instruments);
        }
    };

    const addTag = (value?: string) => {
        const raw = (value ?? tagInput).trim();
        if (!raw) return;
        const newTags = raw.split(',').map(t => t.trim()).filter(t => t.length > 0 && !instruments.includes(t));
        if (newTags.length > 0) setInstruments(prev => [...prev, ...newTags]);
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setInstruments(prev => prev.filter(t => t !== tag));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
        if (e.key === 'Backspace' && !tagInput && instruments.length > 0) {
            removeTag(instruments[instruments.length - 1]);
        }
    };

    const handleSubmit = async () => {
        if (!form.code || !form.label) {
            toast.error('Code and Label are required');
            return;
        }

        const isDuplicateMember = taxSections.some(s =>
            s.section.toLowerCase() === form.code.trim().toLowerCase() && s.id !== id
        );

        if (isDuplicateMember) {
            toast.error(`Tax Section "${form.code}" already exists.`);
            return;
        }

        try {
            const data = {
                section: form.code,
                label: form.label,
                limit: form.limit,
                instruments,
            };

            if (id) {
                await updateTaxSection(id, data);
            } else {
                await addTaxSection(data);
            }
            toast.success(id ? 'Tax section updated' : 'Tax section created');
            navigate('/payroll/setup');
        } catch (error) {
            toast.error('Failed to save tax section');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-2 text-left">
                <button onClick={() => navigate(-1)} className="icon-circle-btn">
                    <ArrowLeft />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">{id ? 'Edit Tax Section' : 'Add Tax Section'}</h1>
                    <p className="text-muted-foreground text-sm">Configure investment limits and eligible instruments for tax declaration</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-primary-100 shadow-sm">
                        <CardHeader className="text-left border-b border-gray-50 bg-muted/30">
                            <CardTitle className="text-lg">Section Details</CardTitle>
                            <CardDescription>Enter the legal code and annual exemption limits</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4 text-left">
                            <div className="space-y-2">
                                <Label>Section Code</Label>
                                <Select
                                    value={isCustomCode ? '__custom__' : form.code}
                                    onValueChange={handleCodeSelect}
                                >
                                    <SelectTrigger className="bg-card">
                                        <SelectValue placeholder="Select a default section..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {defaults.map((d) => (
                                            <SelectItem key={d.code} value={d.code}>
                                                <span className="font-bold">{d.code}</span>
                                                <span className="ml-2 text-muted-foreground text-xs">— {d.label}</span>
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="__custom__">
                                            <span className="flex items-center gap-1.5"><Pencil className="size-3" /> Custom Section</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {isCustomCode && (
                                    <Input
                                        placeholder="e.g. 80D"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        className="mt-2"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Display Label</Label>
                                <Input
                                    placeholder="e.g. Medical Insurance"
                                    value={form.label}
                                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Annual Limit ({currencySymbol})</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">{currencySymbol}</span>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        className={`${currencySymbol.length > 2 ? 'pl-14' : currencySymbol.length > 1 ? 'pl-10' : 'pl-8'} bg-muted border-border focus:bg-card transition-all`}
                                        value={form.limit === 0 ? '' : form.limit}
                                        onChange={(e) => setForm({ ...form, limit: e.target.value === '' ? 0 : Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary-100 shadow-sm">
                        <CardHeader className="text-left border-b border-gray-50 bg-muted/30">
                            <CardTitle className="text-lg">Eligible Instruments</CardTitle>
                            <CardDescription>Define the investment instruments allowed under this section</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4 text-left">
                            <div
                                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex flex-wrap gap-2 cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                                onClick={() => tagInputRef.current?.focus()}
                            >
                                {instruments.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                                            className="hover:text-rose-500 transition-colors"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    ref={tagInputRef}
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={() => { if (tagInput.trim()) addTag(); }}
                                    placeholder={instruments.length === 0 ? 'Type and press comma to add instruments...' : 'Add more...'}
                                    className="flex-1 min-w-[140px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Type an instrument name and press <kbd className="px-1 py-0.5 rounded border bg-muted text-[9px] font-mono">,</kbd> or <kbd className="px-1 py-0.5 rounded border bg-muted text-[9px] font-mono">Enter</kbd> to add. Press <kbd className="px-1 py-0.5 rounded border bg-muted text-[9px] font-mono">Backspace</kbd> on empty field to remove last.</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="text-left border-b border-gray-50 bg-primary/10/50 rounded-t-lg">
                            <CardTitle className="text-base font-bold text-primary-900">Summary Review</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4 text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                                    <FileText className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Section</p>
                                    <p className="font-bold text-foreground">{form.code || '—'}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-muted border border-border space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Label</span>
                                    <span className="font-bold text-foreground">{form.label || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Annual Limit</span>
                                    <span className="font-bold text-primary">{currencySymbol}{form.limit.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                                    <span className="text-muted-foreground font-medium">Instruments</span>
                                    <Badge variant="outline" className="font-bold">{instruments.length}</Badge>
                                </div>
                            </div>

                            {instruments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {instruments.slice(0, 6).map((ins) => (
                                        <span key={ins} className="text-[10px] bg-card border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-600 font-medium">{ins}</span>
                                    ))}
                                    {instruments.length > 6 && (
                                        <span className="text-[10px] text-muted-foreground font-medium">+{instruments.length - 6} more</span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2 pt-0">
                            <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/95 py-6 text-base font-bold shadow-sm shadow-primary-100" disabled={!form.code || !form.label}>
                                <Save className="size-5 mr-2" />
                                {id ? 'Update Section' : 'Save Section'}
                            </Button>
                            <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
                                Discard Changes
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

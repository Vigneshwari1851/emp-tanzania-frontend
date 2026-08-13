import React, { useState, useEffect } from 'react';

import { 
  ArrowLeft, 
  Save, 
  Check, 
  CreditCard,
  Target,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/components/ui/payroll-lib/card";
import { Button } from "@/shared/components/ui/payroll-lib/button";
import { Input } from "@/shared/components/ui/payroll-lib/input";
import { Label } from "@/shared/components/ui/payroll-lib/label";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/payroll-lib/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/shared/components/ui/payroll-lib/select";
import { usePayroll, type SalaryComponent } from '../context/PayrollContext';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';

// Acronym / Synonym normalization dictionary
const ALIAS_MAP: Record<string, string[]> = {
  "house rent allowance": ["hra", "house rent allowance"],
  "hra": ["hra", "house rent allowance"],
  "basic salary": ["basic", "basic pay", "basic salary"],
  "basic": ["basic", "basic pay", "basic salary"],
  "provident fund": ["pf", "provident fund", "epf"],
  "pf": ["pf", "provident fund", "epf"],
  "dearness allowance": ["da", "dearness allowance"],
  "da": ["da", "dearness allowance"],
  "special allowance": ["sa", "special allowance"],
  "sa": ["sa", "special allowance"],
  "medical allowance": ["ma", "medical allowance"],
  "conveyance allowance": ["ca", "conveyance allowance"]
};

/**
 * Checks if an entered component name conflicts with existing component names or aliases.
 */
export const checkDuplicateComponentName = (
  inputName: string,
  existingComponents: Array<{ id?: string | number; name: string }>,
  currentEditingId?: string | number
): string | null => {
  const normalizedInput = inputName.trim().toLowerCase();

  if (!normalizedInput) return null;

  // Filter out the component currently being edited (if in edit mode)
  const activeComponents = existingComponents.filter(
    (c) => c.id !== currentEditingId
  );

  // Get all normalized aliases for the input name
  const inputAliases = ALIAS_MAP[normalizedInput] || [normalizedInput];

  for (const component of activeComponents) {
    const existingNameNormalized = component.name.trim().toLowerCase();
    const existingAliases = ALIAS_MAP[existingNameNormalized] || [existingNameNormalized];

    // 1. Direct Case-Insensitive Match
    if (existingNameNormalized === normalizedInput) {
      return `A component with the name "${component.name}" already exists.`;
    }

    // 2. Alias / Acronym Match (e.g., "HRA" vs "House Rent Allowance")
    const hasAliasConflict = inputAliases.some((alias) =>
      existingAliases.includes(alias)
    );

    if (hasAliasConflict) {
      return `A component matching "${inputName}" already exists as "${component.name}".`;
    }
  }

  return null; // No duplicate found
};

interface EditSalaryComponentProps {
  componentId?: string | null;
  onBack: () => void;
}

export const EditSalaryComponent: React.FC<EditSalaryComponentProps> = ({ componentId: id, onBack }) => {
  const { salaryComponents, addSalaryComponent, updateSalaryComponent } = usePayroll();
  const { currencySymbol } = useCurrency();
  
  const [formData, setFormData] = useState<Partial<SalaryComponent>>({
    name: '',
    type: 'earning',
    calculationType: 'fixed',
    value: 0,
    isTaxable: false,
    isStatutory: false,
  });

  useEffect(() => {
    if (id) {
      const existing = salaryComponents.find(c => c.id === id);
      if (existing) {
        setFormData(existing);
      } else {
        toast.error('Component not found');
        onBack();
      }
    } else {
      const params = new URLSearchParams(''); // Removed URL search params since it's embedded
      const name = params.get('name') || '';
      const type = params.get('type') || 'earning';
      const calculationType = params.get('calculationType') || 'fixed';
      const value = params.get('value') ? Number(params.get('value')) : 0;
      const isTaxable = params.get('isTaxable') === 'true';
      const isStatutory = params.get('isStatutory') === 'true';
      
      setFormData({
        name,
        type: type as 'earning' | 'deduction',
        calculationType: calculationType as 'fixed' | 'percentage',
        value,
        isTaxable,
        isStatutory
      });
    }
  }, [id, salaryComponents, onBack]);

  const handleSave = async () => {
    if (!formData.name) return toast.error('Name is required');

    // Duplicate Check
    const duplicateError = checkDuplicateComponentName(formData.name, salaryComponents, id || undefined);
    if (duplicateError) {
      return toast.error(duplicateError);
    }

    try {
      if (id) {
        const res = await updateSalaryComponent(id, formData);
        if (res && (res as any)._pendingChange) {
          toast.success((res as any).message || 'Edit submitted for approval.');
        } else {
          toast.success('Salary component updated successfully');
        }
      } else {
        const newComponent: SalaryComponent = {
          ...formData as SalaryComponent,
          id: Date.now().toString(),
        };
        await addSalaryComponent(newComponent);
        toast.success('Salary component added to library');
      }
      onBack();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save salary component');
    }
  };

  const existingComponent = id ? salaryComponents.find(c => c.id === id) : null;
  const isDefaultComponent = !!existingComponent?.isDefault;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-2 text-left">
        <button 
          onClick={() => onBack()}
          className="icon-circle-btn"
        >
          <ArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{id ? 'Edit Component' : 'Add New Component'}</h1>
          <p className="text-muted-foreground text-sm">Define how this salary component should be calculated and categorized</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-primary/20 dark:border-primary/40 shadow-sm">
            <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30">
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Fundamental settings for this salary component</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="name">Component Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Basic Salary, HRA, Medical" 
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Component Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(val: string) => setFormData({ ...formData, type: val as 'earning' | 'deduction' })}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="earning" className="font-medium text-emerald-600 dark:text-emerald-400">Earning</SelectItem>
                      <SelectItem value="deduction" className="font-medium text-rose-600 dark:text-rose-400">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Calculation Method</Label>
                  <Select 
                    value={formData.calculationType} 
                    onValueChange={(val: string) => setFormData({ ...formData, calculationType: val as 'fixed' | 'percentage' })}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount ({currencySymbol})</SelectItem>
                      <SelectItem value="percentage">Percentage (%) of Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Default Value ({formData.calculationType === 'fixed' ? currencySymbol : '%'})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">
                    {formData.calculationType === 'fixed' ? currencySymbol : '%'}
                  </span>
                  <Input 
                    id="value"
                    type="number"
                    min={0}
                    className={`${formData.calculationType === 'fixed' && currencySymbol.length > 1 ? "pl-12" : "pl-8"} bg-muted border-border focus:bg-card transition-all`}
                    placeholder="0"
                    value={formData.value === 0 ? '' : formData.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormData({ ...formData, value: Math.max(0, val) });
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  This values serves as the default suggestion when creating salary structures.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 dark:border-primary/40 shadow-sm">
            <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-muted/30">
              <CardTitle className="text-lg">Governance & Taxes</CardTitle>
              <CardDescription>Regulatory settings for this component</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-left">
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-50 dark:border-border bg-muted/50 hover:bg-card hover:shadow-sm transition-all group">
                <div className="flex gap-4">
                  <div className="p-3 bg-card rounded-lg group-hover:bg-primary/10 transition-colors shadow-sm">
                    <Target className="size-5 text-primary" />
                  </div>
                  <div>
                    <Label className="font-semibold block mb-1">Is this component Taxable?</Label>
                    <p className="text-xs text-muted-foreground">Determine if this amount should be considered for TDS calculation</p>
                  </div>
                </div>
                <Switch 
                  checked={formData.isTaxable} 
                  onCheckedChange={(val: boolean) => setFormData({ ...formData, isTaxable: val })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-50 dark:border-border bg-muted/50 hover:bg-card hover:shadow-sm transition-all group">
                <div className="flex gap-4">
                  <div className="p-3 bg-card rounded-lg group-hover:bg-primary/10 transition-colors shadow-sm">
                    <Check className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <Label className="font-semibold block mb-1">Is this a Statutory component?</Label>
                    <p className="text-xs text-muted-foreground">Enable this for PF, ESI, PT and other legal deductions</p>
                  </div>
                </div>
                <Switch 
                  checked={formData.isStatutory} 
                  onCheckedChange={(val: boolean) => setFormData({ ...formData, isStatutory: val })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="text-left border-b border-gray-50 dark:border-border bg-primary/5 rounded-t-lg">
              <CardTitle className="text-base font-bold text-primary">Summary Review</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-left">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${formData.type === 'earning' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'}`}>
                    {formData.type === 'earning' ? <DollarSign className="size-5" /> : <CreditCard className="size-5" />}
                 </div>
                 <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Type</p>
                    <p className="font-bold text-foreground capitalize">{formData.type}</p>
                 </div>
              </div>

              <div className="p-4 rounded-lg bg-muted border border-border space-y-3">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Calculation</span>
                   <span className="font-bold text-foreground">{formData.calculationType}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Default Value</span>
                   <span className="font-bold text-primary">{formData.calculationType === 'fixed' ? currencySymbol : ''}{formData.calculationType === 'fixed' && currencySymbol.length > 1 ? ' ' : ''}{formData.value}{formData.calculationType === 'percentage' ? '%' : ''}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                   <span className="text-muted-foreground font-medium">Taxable Status</span>
                   <Badge variant={formData.isTaxable ? "default" : "outline"} className={formData.isTaxable ? "bg-primary" : "text-muted-foreground"}>
                      {formData.isTaxable ? 'YES' : 'NO'}
                   </Badge>
                 </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-0">
               {isDefaultComponent && (
                 <div className="w-full rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-medium px-3 py-2 mb-1 text-center">
                   This is a default component. Changes will be submitted for admin approval.
                 </div>
               )}
               <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/95 py-6 text-base font-bold shadow-sm shadow-primary/20">
                  <Save className="size-5 mr-2" />
                  {isDefaultComponent ? 'Submit for Approval' : (id ? 'Update Component' : 'Create Component')}
               </Button>
               <Button variant="outline" onClick={() => onBack()} className="w-full">
                  Discard Changes
               </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

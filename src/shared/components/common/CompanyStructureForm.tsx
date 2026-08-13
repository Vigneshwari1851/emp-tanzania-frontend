import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export interface CompanyLegalData {
  companyName?: string;
  companyType?: string;
  legalAddress?: {
    street?: string;
    city?: string;
    country?: string;
  };
  taxRegistrationNumbers?: {
    pan?: string;
    ein?: string;
    gst?: string;
    tan?: string;
    cin?: string;
    pfNumber?: string;
    esiNumber?: string;
    ptNumber?: string;
  };
}

interface CompanyStructureFormProps {
  initialData: CompanyLegalData;
  onSave: (data: CompanyLegalData) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

export const CompanyStructureForm: React.FC<CompanyStructureFormProps> = ({
  initialData,
  onSave,
  isSaving,
  canEdit
}) => {
  const [data, setData] = useState<CompanyLegalData>(initialData || {});

  const handleChange = (section: keyof CompanyLegalData, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  const handleEntityChange = (field: keyof CompanyLegalData, value: string) => {
    setData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-8">
      {/* 1. Legal Entity Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Legal Entity Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Company Legal Name</label>
            <input
              value={data.companyName || ""}
              onChange={(e) => handleEntityChange("companyName", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Company Type</label>
            <input
              value={data.companyType || ""}
              onChange={(e) => handleEntityChange("companyType", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Legal Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Legal Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-foreground">Street Address</label>
            <input
              value={data.legalAddress?.street || ""}
              onChange={(e) => handleChange("legalAddress", "street", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">City</label>
            <input
              value={data.legalAddress?.city || ""}
              onChange={(e) => handleChange("legalAddress", "city", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Country</label>
            <input
              value={data.legalAddress?.country || ""}
              onChange={(e) => handleChange("legalAddress", "country", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Tax Registration Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Tax Registration Numbers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">PAN (India)</label>
            <input
              value={data.taxRegistrationNumbers?.pan || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "pan", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">EIN (USA)</label>
            <input
              value={data.taxRegistrationNumbers?.ein || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "ein", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">GST Registration</label>
            <input
              value={data.taxRegistrationNumbers?.gst || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "gst", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">TAN (India)</label>
            <input
              value={data.taxRegistrationNumbers?.tan || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "tan", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">CIN (Corporate ID)</label>
            <input
              value={data.taxRegistrationNumbers?.cin || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "cin", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">PF Number (India)</label>
            <input
              value={data.taxRegistrationNumbers?.pfNumber || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "pfNumber", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">ESI Number (India)</label>
            <input
              value={data.taxRegistrationNumbers?.esiNumber || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "esiNumber", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">PT Number (India)</label>
            <input
              value={data.taxRegistrationNumbers?.ptNumber || ""}
              onChange={(e) => handleChange("taxRegistrationNumbers", "ptNumber", e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-3 py-2 border rounded-sm focus:ring-2 focus:ring-primary disabled:bg-muted bg-card"
            />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => onSave(data)}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/95 text-white px-10"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      )}
    </div>
  );
};

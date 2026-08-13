import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { getCustomFields, type CustomField } from '@/features/settings/services/settings';
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";

export function CustomFieldsTab() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setIsLoading(true);
      const data = await getCustomFields();
      setFields(data);
    } catch (error) {
      console.error("Failed to fetch custom fields", error);
      toast.error("Failed to load custom fields");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Custom Fields</CardTitle>
        <Button className="gap-2 h-10">
          <Plus className="w-4 h-4" /> Add Field
        </Button>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-60">
            <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-muted-foreground font-medium">No custom fields configured</p>
            <p className="text-sm text-muted-foreground">Add fields to support organization-specific data</p>
          </div>
        ) : (
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium text-foreground">{field.label}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{field.module}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{field.type}</TableCell>
                    <TableCell className="text-muted-foreground">{field.required ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          className="mini-icon-btn"
                          title="Edit"
                        >
                          <Edit2 />
                        </button>
                        <button
                          className="mini-icon-btn-reject"
                          title="Delete"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

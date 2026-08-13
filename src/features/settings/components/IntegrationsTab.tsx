import { useState, useEffect } from "react";
import { Switch } from "@/shared/components/ui/switch"; 
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { getIntegrations, updateIntegration, type Integration } from '@/features/settings/services/settings';
import { toast } from "sonner";

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const data = await getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error("Failed to fetch integrations", error);
      toast.error("Failed to load integrations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    try {
      await updateIntegration(id, { status: !currentStatus });
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: !currentStatus } : i));
      toast.success(`Integration ${!currentStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error("Failed to update integration");
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {integrations.map((integration) => (
        <Card key={integration.id}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-sm">
                <ExternalLink className="w-6 h-6 text-primary" />
              </div>
              <Switch
                checked={integration.status}
                onCheckedChange={() => handleToggle(integration.id, integration.status)}
              />
            </div>
            <CardTitle className="mt-4">{integration.name}</CardTitle>
            <CardDescription>Connect your workflow with {integration.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="w-full h-10 text-sm font-medium text-primary hover:text-primary hover:bg-primary/10"
            >
              Configure Settings
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

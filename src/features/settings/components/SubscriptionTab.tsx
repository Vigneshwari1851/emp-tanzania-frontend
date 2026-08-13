import React, { useState, useEffect } from "react";
import { useAuth } from "@/shared/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/shared/services/axiosInstance";
import { toast } from "sonner";
import { Crown, Package } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function SubscriptionTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = (user as any)?.tenantId || 1;

  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [overridesState, setOverridesState] = useState<Record<number, boolean>>({});

  // 1. Fetch all editions
  const { data: editions = [] } = useQuery({
    queryKey: ["editions-all"],
    queryFn: async () => {
      const res = await axios.get("/edition/all");
      return (res.data?.data ?? res.data) as any[];
    },
  });

  // 2. Fetch all modules
  const { data: allModules = [] } = useQuery({
    queryKey: ["modules-all"],
    queryFn: async () => {
      const res = await axios.get("/edition/modules");
      return (res.data?.data ?? res.data) as any[];
    },
  });

  // 3. Fetch current tenant subscription
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["tenant-subscription", tenantId],
    queryFn: async () => {
      try {
        const res = await axios.get(`/edition/tenant/${tenantId}/subscription`);
        return (res.data?.data ?? res.data) as any;
      } catch {
        return null;
      }
    },
    enabled: !!tenantId,
    retry: false,
  });

  // Initialize state when subscription/modules load
  useEffect(() => {
    // Only initialize if we haven't selected an edition yet (prevents background refetches from wiping unsaved changes)
    if (subscription && allModules.length > 0 && selectedEditionId === null) {
      setSelectedEditionId(Number(subscription.edition.id));
      
      const baseIds = subscription.edition.modules?.map((m: any) => Number(m.featureModuleId)) || [];
      const initialOverrides: Record<number, boolean> = {};
      
      // Default modules state based on selected edition defaults
      allModules.forEach((mod: any) => {
        initialOverrides[Number(mod.id)] = baseIds.includes(Number(mod.id));
      });
      
      // Apply saved overrides from database
      subscription.overrides?.forEach((ov: any) => {
        initialOverrides[Number(ov.featureModule.id)] = Boolean(ov.enabled);
      });
      
      setOverridesState(initialOverrides);
    }
  }, [subscription, allModules, selectedEditionId]);

  // When selectedEditionId changes, reset toggles to that edition's defaults
  const handleEditionChange = (editionId: number) => {
    const numericEditionId = Number(editionId);
    setSelectedEditionId(numericEditionId);
    
    const edition = editions.find((e: any) => Number(e.id) === numericEditionId);
    if (edition) {
      const baseIds = edition.modules?.map((m: any) => Number(m.featureModuleId)) || [];
      const updated: Record<number, boolean> = {};
      allModules.forEach((mod: any) => {
        updated[Number(mod.id)] = baseIds.includes(Number(mod.id));
      });
      setOverridesState(updated);
    } else {
      console.warn(`Edition with id ${numericEditionId} not found in editions array`, editions);
    }
  };

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const overridesArray = Object.entries(overridesState).map(([moduleId, enabled]) => ({
        featureModuleId: Number(moduleId),
        enabled,
      }));
      const payload = { editionId: selectedEditionId, overrides: overridesArray };
      const res = await axios.put(`/edition/tenant/${tenantId}/subscription`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Subscription updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["tenant-subscription", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-modules", tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update subscription");
    },
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading subscription details...</div>;

  if (!subscription) return (
    <div className="p-8 space-y-4">
      <h2 className="text-xl font-semibold">Tenant Subscription</h2>
      <p className="text-muted-foreground">No subscription configured. Seed the editions and tenant tables, or contact the administrator.</p>
    </div>
  );

  const handleToggleOverride = (moduleId: number) => {
    setOverridesState((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-4xl">
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Tenant Subscription</h2>
        <p className="text-muted-foreground font-medium text-sm">
          Manage the active pricing tier and custom module overrides for this tenant.
        </p>
      </div>

      {/* Select Edition */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Active Plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {editions.map((edition: any) => {
            const isSelected = selectedEditionId === edition.id;
            return (
              <div
                key={edition.id}
                onClick={() => handleEditionChange(edition.id)}
                className={`cursor-pointer p-5 rounded-lg border-2 transition-all duration-200 flex flex-col items-start gap-2 ${
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Crown className={`w-5 h-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <h4 className={`font-bold ${isSelected ? "text-primary-900 dark:text-primary-300" : "text-foreground"}`}>{edition.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">Tier</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module Toggles */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Add-on Modules</h3>
        <p className="text-xs text-muted-foreground pb-2">
          Toggle any feature on or off for this tenant. All modules start with the base edition's defaults.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allModules.map((module: any) => {
            const isActive = overridesState[module.id] || false;
            return (
              <div
                key={module.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  isActive ? "bg-card border-primary/20 shadow-sm" : "bg-muted border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <h4 className={`font-semibold text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{module.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{module.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleOverride(module.id)}
                  className={`relative w-10 h-5.5 rounded-full p-1 transition-colors duration-300 outline-none ${
                    isActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-card shadow-sm transition-transform duration-300 transform ${isActive ? "translate-x-4.5" : "translate-x-0"}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-6 border-t border-border flex justify-end">
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="bg-primary hover:bg-primary/95 text-white font-medium px-6 py-2 rounded-lg"
        >
          {updateMutation.isPending ? "Saving..." : "Save Subscription Changes"}
        </Button>
      </div>
    </div>
  );
}

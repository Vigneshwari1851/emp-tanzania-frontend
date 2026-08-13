import React, { useState, useEffect } from "react";
import { Laptop, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ModuleConfigTab() {
  const [assetTrackingEnabled, setAssetTrackingEnabled] = useState<boolean>(true);

  // Initialize status from localStorage
  useEffect(() => {
    const isEnabled = localStorage.getItem("asset_tracking_enabled") !== "false";
    setAssetTrackingEnabled(isEnabled);
  }, []);

  const handleToggle = () => {
    const nextState = !assetTrackingEnabled;
    setAssetTrackingEnabled(nextState);
    localStorage.setItem("asset_tracking_enabled", String(nextState));

    // Dispatch custom event for real-time sidebar & page updates
    window.dispatchEvent(new Event("module-config-updated"));

    if (nextState) {
      toast.success("Asset Tracking System has been enabled successfully!", {
        description: "The Asset Management module, sidebar menus, and offboarding integrations are now active.",
        className: "bg-emerald-50 text-emerald-900 border-emerald-100",
      });
    } else {
      toast.info("Asset Tracking System has been disabled.", {
        description: "The Asset Management module and corresponding offboarding components have been hidden.",
        className: "bg-amber-50 text-amber-900 border-amber-100",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Tab Header */}
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Module Configuration</h2>
        <p className="text-muted-foreground font-medium text-sm">
          Enable or disable core system modules dynamically to match client organization needs.
        </p>
      </div>

      {/* Grid of Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset Tracking Module Switch Card */}
        <div 
          onClick={handleToggle}
          className={`flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-lg border transition-all duration-300 cursor-pointer group hover:shadow-sm ${
            assetTrackingEnabled 
              ? "bg-card border-primary-100 shadow-sm ring-1 ring-primary-50"
              : "bg-muted/50 border-border"
          }`}
        >
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3.5 rounded-lg transition-all duration-300 ${
              assetTrackingEnabled 
                ? "bg-primary/10 text-primary group-hover:scale-105" 
                : "bg-muted text-muted-foreground"
            }`}>
              <Laptop className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[16px] text-foreground">Asset Tracking System</h3>
                {assetTrackingEnabled && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold text-primary bg-primary/10 rounded-full flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-sm">
                Manage your IT hardware inventory, assign assets to team members, track serial numbers, and automate asset recovery lists during offboarding.
              </p>
            </div>
          </div>

          {/* Premium Toggle Switch */}
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button
              aria-label="Toggle Asset Tracking"
              className={`relative w-12 h-6.5 rounded-full p-1 transition-colors duration-300 outline-none focus:ring-2 focus:ring-primary/20 ${
                assetTrackingEnabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <div 
                className={`w-4.5 h-4.5 rounded-full bg-card shadow-sm transition-transform duration-300 transform ${
                  assetTrackingEnabled ? "translate-x-5.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dummy/Disabled Future Modules */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-lg border border-border bg-muted/30 opacity-60 relative overflow-hidden">
          <span className="absolute top-3 right-3 text-[9px] font-bold bg-gray-200 dark:bg-gray-700 text-muted-foreground px-2.5 py-0.5 rounded-full">
            Coming Soon
          </span>
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-lg bg-muted text-muted-foreground">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-[16px] text-muted-foreground">Recruitment & ATS</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-sm">
                Publish job openings to job boards, screen resume payloads, coordinate interviews, and manage candidate pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

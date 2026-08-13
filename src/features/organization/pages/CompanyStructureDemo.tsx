import React, { useState } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { ArrowLeft, Play, Eye, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DepartmentHierarchyView } from "../components/DepartmentHierarchyView";
import { OrgSetupGuidedTour } from "../components/OrgSetupGuidedTour";

export function CompanyStructureDemo() {
  const navigate = useOrgNavigate();
  const [demoMode, setDemoMode] = useState<"tour" | "populated" | "blank">("tour");
  const [showTourModal, setShowTourModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Guided Tour Modal */}
      <OrgSetupGuidedTour
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        isFirstTime={true}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/org-setup")}
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-all group border-none bg-transparent"
          >
            <ArrowLeft className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </button>
          <div>
            <h1 className="text-[24px] font-semibold text-foreground">Demo Sandbox</h1>
            <p className="text-muted-foreground mt-1 text-[14px] leading-5 font-medium">
              Test and preview the guided tour, hierarchy views, and blank canvas onboarding.
            </p>
          </div>
        </div>

        {/* Mode Toggle Switch */}
        <div className="flex items-center p-1 bg-muted rounded-lg border border-border shadow-sm">
          <Button
            variant="ghost"
            onClick={() => setDemoMode("tour")}
            className={`px-4 h-9 text-[12px] font-bold rounded-md transition-all border-none ${
              demoMode === "tour"
                ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4 mr-1.5" /> Guided Tour
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDemoMode("populated")}
            className={`px-4 h-9 text-[12px] font-bold rounded-md transition-all border-none ${
              demoMode === "populated"
                ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-4 h-4 mr-1.5" /> Populated Hierarchy
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDemoMode("blank")}
            className={`px-4 h-9 text-[12px] font-bold rounded-md transition-all border-none ${
              demoMode === "blank"
                ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="w-4 h-4 mr-1.5" /> Blank Canvas
          </Button>
        </div>
      </div>

      {/* Render the selected view */}
      <div className="border border-border/80 rounded-xl p-6 bg-card shadow-sm">
        {demoMode === "tour" ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-10 h-10 text-amber-500" />
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-[20px] font-bold text-foreground mb-2">Org Setup Guided Tour</h2>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Walk through the 6-step onboarding experience that new users see when setting up their organization for the first time.
              </p>
            </div>
            <Button
              onClick={() => setShowTourModal(true)}
              className="h-11 px-8 text-[13px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-none shadow-lg gap-2 rounded-xl"
            >
              <Sparkles className="w-4 h-4" />
              Launch Guided Tour
            </Button>
            <p className="text-[11px] text-muted-foreground">
              This tour auto-launches for first-time users on the Org Setup page.
            </p>
          </div>
        ) : demoMode === "populated" ? (
          <div>
            <div className="mb-4 bg-primary-50/50 border border-primary-100 rounded-lg p-3">
              <p className="text-[12px] text-primary-800 leading-relaxed">
                👉 <strong>Populated Canvas:</strong> Shows the live organization chart from CEO/MD down to departments.
              </p>
            </div>
            <DepartmentHierarchyView isReadOnly={false} demoBlank={false} />
          </div>
        ) : (
          <div>
            <div className="mb-4 bg-amber-50/50 border border-amber-100 rounded-lg p-3">
              <p className="text-[12px] text-amber-800 leading-relaxed">
                👉 <strong>Blank Canvas:</strong> Simulates the experience for a new company setting up from scratch.
              </p>
            </div>
            <DepartmentHierarchyView isReadOnly={false} demoBlank={true} />
          </div>
        )}
      </div>
    </div>
  );
}

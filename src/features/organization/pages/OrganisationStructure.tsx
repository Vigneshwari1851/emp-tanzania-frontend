import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { ArrowLeft, Settings2 } from "lucide-react";
import { DesignationSettingsForm } from "../components/DesignationSettingsForm";
import { usePermissions } from "@/features/rbac/hooks/usePermissions";
import { Permission } from "@/shared/types/rbac";

export function OrganisationStructure() {
  const { can } = usePermissions();
  const isReadOnly = !can(Permission.EDIT_DESIGNATIONS);
  const navigate = useOrgNavigate();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/org-setup")}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors border-none bg-transparent shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Global Designations</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wide flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE SYSTEM
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm font-medium flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 shrink-0" />
              Manage core job titles and their reporting structure
            </p>
          </div>
        </div>

      </div>


      {/* Core Canvas */}
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-6 lg:p-8 min-h-[500px]">
        <DesignationSettingsForm isReadOnly={isReadOnly} isGlobal={true} />
      </div>
    </div>
  );
}

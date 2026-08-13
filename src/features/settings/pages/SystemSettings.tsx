import { useState } from "react";
import {
  Shield,
  Database,
  Share2,
  Crown,
  Users,
  Settings,
  Building2
} from "lucide-react";
import { Button } from '@/shared/components/ui/button';
import { RolesPermissionsTab } from '@/features/settings/components/RolesPermissionsTab';
import { CustomFieldsTab } from '@/features/settings/components/CustomFieldsTab';
import { IntegrationsTab } from '@/features/settings/components/IntegrationsTab';
import { SubscriptionTab } from '@/features/settings/components/SubscriptionTab';
import { UserTypesTab } from '@/features/settings/components/UserTypesTab';
import { OrganizationManagementTab } from '@/features/settings/components/OrganizationManagementTab';

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState<"roles" | "subscription" | "fields" | "integrations" | "user-types" | "organizations">("organizations");

  const categories = [
    {
      id: "organizations",
      title: "Tenants",
      description: "Manage organizations",
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      disabled: false
    },
    {
      id: "roles",
      title: "Roles & Permissions",
      description: "Manage access levels and permissions",
      icon: Shield,
      color: "text-indigo-600 dark:text-indigo-400",
      disabled: false
    },
    {
      id: "subscription",
      title: "Subscription & Editions",
      description: "Manage plans and module access",
      icon: Crown,
      color: "text-violet-600 dark:text-violet-400",
      disabled: false
    },
    {
      id: "user-types",
      title: "User Types",
      description: "Define categories and module access",
      icon: Users,
      color: "text-sky-600 dark:text-sky-400",
      disabled: false
    },
    {
      id: "fields",
      title: "Custom Fields",
      description: "Configure dynamic data fields",
      icon: Database,
      color: "text-emerald-600 dark:text-emerald-400",
      disabled: true
    },
    {
      id: "integrations",
      title: "Integrations",
      description: "Connect third-party services",
      icon: Share2,
      color: "text-orange-600 dark:text-orange-400",
      disabled: true
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex items-center gap-4 sm:gap-5 mb-2">
        <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" />
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">System Settings</h1>
          <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Platform configuration and administrative tools</p>
        </div>
      </div>

      {/* Category Cards (Hub Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant="ghost"
            onClick={() => !cat.disabled && setActiveTab(cat.id as any)}
            disabled={cat.disabled}
            className={`relative flex flex-col items-center justify-start px-3 py-5 h-full rounded-lg border-2 transition-all group text-center whitespace-normal overflow-hidden focus-visible:outline-none ${cat.disabled
              ? "bg-muted border-border opacity-60 cursor-not-allowed"
              : activeTab === cat.id
                ? "bg-card border-primary "
                : "bg-card border-border/60 hover:border-border shadow-sm"
              }`}
          >
            {cat.disabled && (
              <span className="absolute top-3 right-3 text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
            <cat.icon className={`w-8 h-8 mb-3 shrink-0 transition-all duration-300 group-hover:scale-110 ${cat.disabled ? "text-muted-foreground" : cat.color}`} />
            <h3 className={`font-bold text-base leading-tight ${cat.disabled ? "text-muted-foreground" : "text-foreground"}`}>{cat.title}</h3>
            <p className={`text-xs mt-2 leading-relaxed px-1 line-clamp-2 break-words ${cat.disabled ? "text-gray-300 dark:text-gray-600" : "text-muted-foreground"}`}>{cat.description}</p>
          </Button>
        ))}
      </div>

      {/* Main Content Area (Tabs) */}
      <div className="min-h-[400px]">
        {activeTab === "organizations" && <OrganizationManagementTab />}
        {activeTab === "roles" && <RolesPermissionsTab />}
        {activeTab === "subscription" && <SubscriptionTab />}
        {activeTab === "fields" && <CustomFieldsTab />}
        {activeTab === "integrations" && <IntegrationsTab />}
        {activeTab === "user-types" && <UserTypesTab />}
      </div>
    </div>
  );
}


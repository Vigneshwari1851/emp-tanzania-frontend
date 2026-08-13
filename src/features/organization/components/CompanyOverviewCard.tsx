import { Building2, MapPin, Users, Calendar, Coins } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";

interface CompanyOverviewCardProps {
  companyData: any;
  totalEmployees: number;
}

export function CompanyOverviewCard({ companyData, totalEmployees }: CompanyOverviewCardProps) {
  if (!companyData) return null;

  const stats = [
    {
      icon: Building2,
      label: "Company Type",
      value: companyData.companyType || "Not Set",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: MapPin,
      label: "Office Locations",
      value: companyData.locations?.length || 0,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Users,
      label: "Total Employees",
      value: totalEmployees.toLocaleString(),
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: Calendar,
      label: "Pay Frequency",
      value: companyData.payFrequency || "Not Set",
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: Coins,
      label: "Currency",
      value: companyData.currency || "USD",
      color: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex items-center gap-3 min-w-0">
                <Icon className={`h-5 w-5 ${stat.color} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-4 text-muted-foreground truncate">{stat.label}</p>
                  <p className="font-semibold text-foreground truncate">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


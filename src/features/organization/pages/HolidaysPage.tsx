import React, { useEffect, useState } from "react";
import { getOrganizations } from "@/features/organization/services/organizations";
import { HolidaysTab } from "@/features/organization/components/HolidaysTab";
import { Loader2, Calendar } from "lucide-react";

export function HolidaysPage() {
  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getOrganizations()
      .then((orgRes) => {
        const org = Array.isArray(orgRes) ? orgRes[0] : (orgRes as any)?.data || orgRes;
        if (org) {
          setCompanyData({
            legalAddress: {
              country: org.country || "India"
            },
            workingCalendar: {
              publicHolidays: org.public_holidays || []
            }
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load holidays:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[8px] p-4 shadow-sm">
        <HolidaysTab
          companyData={companyData}
          setCompanyData={setCompanyData}
          isReadOnly={true}
        />
      </div>
    </div>
  );
}

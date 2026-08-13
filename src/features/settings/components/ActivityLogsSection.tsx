import { useState, useEffect } from "react";
import { Loader2, Calendar, User, Info } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/shared/components/ui/card";
import { getActivityLogs, type ActivityLog } from '@/features/settings/services/settings';
import Select from "@/shared/components/ui/Select";


export function ActivityLogsSection() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    module: "",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await getActivityLogs(filters);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch activity logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader className="border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity Logs</CardTitle>
        <div className="flex items-center gap-3">
          <Select value={filters.module} onChange={(val) => setFilters({ ...filters, module: val })} placeholder="All Modules" options={[{ value: "employee", label: "Employee" }, { value: "role", label: "Role" }, { value: "leave", label: "Leave" }]} />
          <Select value={filters.action} onChange={(val) => setFilters({ ...filters, action: val })} placeholder="All Actions" options={[{ value: "CREATE", label: "Create" }, { value: "UPDATE", label: "Update" }, { value: "DELETE", label: "Delete" }]} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No activity logs found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted transition-colors flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-sm ${log.action === 'CREATE' ? 'bg-green-50 text-green-600' :
                      log.action === 'DELETE' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                    }`}>
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">{log.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> {log.user?.details?.first_name} {log.user?.details?.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold  bg-muted text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                  {log.module}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

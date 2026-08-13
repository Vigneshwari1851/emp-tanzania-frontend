import * as React from "react";
import {
  Pencil,
  Trash2,
  Eye
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import type { Employee } from '@/features/employees/services/employees';

interface EmployeeListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string | number) => void;
  onView: (employee: Employee) => void;
  isLoading: boolean;
  currentUserRole: string;
  departments?: any[];
  selectedIds: Set<number | string>;
  onToggleSelect: (id: number | string) => void;
  onToggleSelectAll: () => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  onEdit,
  onDelete,
  onView,
  isLoading,
  currentUserRole,
  departments = [],
  selectedIds,
  onToggleSelect,
  onToggleSelectAll
}) => {
  const [hoveredRowId, setHoveredRowId] = React.useState<number | string | null>(null);

  const canManage = ["super admin", "admin", "hr manager"].includes(currentUserRole.toLowerCase());

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-24 bg-card rounded-lg border border-border shadow-sm">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary-50 border-t-primary-500 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-bold text-muted-foreground ">Syncing Workforce Data...</p>
      </div>
    );
  }

  const hasSelections = selectedIds.size > 0;

  const getStatusColor = (status: boolean) => {
    return status
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="bg-card rounded-[2rem] shadow-sm shadow-gray-100/50 border border-border overflow-hidden">
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 pr-3 py-5 w-14 text-left">
                {(hasSelections || hoveredRowId !== null) && (
                  <input
                    type="checkbox"
                    className="rounded-sm border-gray-300 text-primary focus:ring-primary h-5 w-5 cursor-pointer transition-all"
                    checked={employees.length > 0 && selectedIds.size === employees.length}
                    onChange={onToggleSelectAll}
                  />
                )}
              </TableHead>
              <TableHead className="px-6 py-5" style={{ width: '300px' }}>Member Identity</TableHead>
              <TableHead className="px-6 py-5" style={{ width: '160px' }}>Department</TableHead>
              <TableHead className="px-6 py-5" style={{ width: '180px' }}>Designation</TableHead>
              <TableHead className="px-6 py-5" style={{ width: '140px' }}>Workspace</TableHead>
              <TableHead className="px-6 py-5" style={{ width: '120px' }}>Availability</TableHead>
              <TableHead className="px-6 py-5">Onboarded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-sm flex items-center justify-center">
                      <Eye className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No workforce records found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => {
                const details = employee.details;
                const isHovered = hoveredRowId === employee.id;
                const isSelected = selectedIds.has(employee.id);
                const showCheckbox = isHovered || isSelected || hasSelections;
                const showActions = isHovered && !hasSelections;

                return (
                  <TableRow
                    key={employee.id}
                    className={`transition-all duration-200 cursor-pointer group ${isSelected ? 'bg-primary/10/40' : 'hover:bg-muted/50'}`}
                    onMouseEnter={() => setHoveredRowId(employee.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    onClick={() => onView(employee)}
                  >
                    <TableCell className="pl-6 pr-3 py-5" onClick={(e) => e.stopPropagation()}>
                      {showCheckbox ? (
                        <input
                          type="checkbox"
                          className="rounded-sm border-gray-300 text-primary focus:ring-primary h-5 w-5 cursor-pointer transition-all animate-in fade-in"
                          checked={isSelected}
                          onChange={() => onToggleSelect(employee.id)}
                        />
                      ) : (
                        <div className="w-5 h-5" />
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          {employee.profile_image ? (
                            <img src={employee.profile_image} alt={employee.first_name} className="w-11 h-11 rounded-sm object-cover shadow-sm" />
                          ) : (
                            <div className="h-11 w-11 rounded-sm bg-gradient-to-tr from-primary-500 to-violet-600 flex items-center justify-center text-white text-sm font-black shadow-sm shadow-primary-100 transition-transform group-hover:scale-105">
                              {employee.first_name?.charAt(0) || details?.first_name?.[0] || ''}{employee.last_name?.charAt(0) || details?.last_name?.[0] || ''}
                            </div>
                          )}
                          {employee.status && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>}
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-foreground hover:text-primary transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); onView(employee); }}>
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-[11px] font-bold text-muted-foreground  mt-0.5">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-bold text-foreground ">
                          {employee.department_name || "Unassigned"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-sm border border-slate-100 block truncate max-w-fit">
                        {(typeof details?.designation === 'string' ? details?.designation : details?.designation?.designation_name) || "No Role"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="text-xs font-bold text-muted-foreground truncate block ">
                        {details?.work_location || "Headquarters"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-black  border transition-all ${getStatusColor(employee.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${employee.status ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        {employee.status ? "Online" : "Away"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground er">
                          {employee.created_at ? new Date(employee.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}
                        </span>
                        {showActions && (
                          <div className="flex items-center gap-2 ml-4 animate-in slide-in-from-right-2 duration-300" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onView(employee)}
                              className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-sm transition-all shadow-sm"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => onEdit(employee)}
                                  className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-sm transition-all shadow-sm"
                                  title="Edit Records"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDelete(employee.id)}
                                  className="p-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-sm transition-all shadow-sm"
                                  title="Terminate Access"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  Activity,
  RefreshCw,
  ArrowUpDown,
  Info,
  ChevronDown,
  X,
} from "lucide-react";
import { auditService } from "../services/audit";
import Select from "@/shared/components/ui/Select";

interface AuditLogEntry {
  id: number;
  module: string;
  action: string;
  entityId: string;
  actorId: number;
  actorName: string;
  actorEmployeeId: string | null;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  createdAt: string;
}

const MODULE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PAYROLL: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  EMPLOYEE: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  LOANS: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  EXIT: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  ASSETS: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  LMS: { bg: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  SETTINGS: { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  ORGANIZATION: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  REIMBURSEMENT: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  AUTH: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary-500" },
  LEAVE: { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
  ATTENDANCE: { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  DOCUMENT_HUB: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  SURVEY: { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", text: "text-fuchsia-700 dark:text-fuchsia-300", dot: "bg-fuchsia-500" },
  RECRUITMENT: { bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  NEWS: { bg: "bg-lime-50 dark:bg-lime-950/30", text: "text-lime-700 dark:text-lime-300", dot: "bg-lime-500" },
  CHANGE_REQUESTS: { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  FEEDBACK: { bg: "bg-stone-50 dark:bg-stone-950/30", text: "text-stone-700 dark:text-stone-300", dot: "bg-stone-500" },
  EDITION: { bg: "bg-slate-50 dark:bg-slate-950/30", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
};

const DEFAULT_COLOR = { bg: "bg-muted", text: "text-foreground", dot: "bg-gray-500 dark:bg-gray-400" };

function getModuleColor(mod: string) {
  return MODULE_COLORS[mod?.toUpperCase()] || DEFAULT_COLOR;
}

function formatAction(action: string) {
  let formatted = action
    ?.replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || action;
  
  // Map "Branch" to "Location" to match UI terminology
  return formatted.replace(/\bBranch\b/g, "Location");
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  // Draft (pending) filter values — only committed to actual on Apply
  const [pendingModule, setPendingModule] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [searchText, setSearchText] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filterCardOpen, setFilterCardOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click — but skip if click is inside a Select portal (rendered in document.body)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Allow clicks inside Select portals (which render to document.body via createPortal)
      if (target.closest('[data-select-portal]')) return;
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setFilterCardOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, size };
      if (moduleFilter) params.module = moduleFilter;
      if (actionFilter) params.action = actionFilter;
      const res = await auditService.getLogs(params);
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, moduleFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  // Client-side search filter on top of backend filters
  const displayed = searchText
    ? logs.filter(
        (l) =>
          l.module?.toLowerCase().includes(searchText.toLowerCase()) ||
          l.action?.toLowerCase().includes(searchText.toLowerCase()) ||
          l.entityId?.toLowerCase().includes(searchText.toLowerCase()) ||
          l.actorName?.toLowerCase().includes(searchText.toLowerCase()) ||
          l.actorEmployeeId?.toLowerCase().includes(searchText.toLowerCase()) ||
          String(l.actorId).includes(searchText)
      )
    : logs;

  // Gather unique modules for filter dropdown
  const availableModules = [
    "PAYROLL",
    "EMPLOYEE",
    "LOANS",
    "EXIT",
    "ASSETS",
    "LMS",
    "SETTINGS",
    "AUTH",
    "SURVEY",
    "DOCUMENT_HUB",
    "RECRUITMENT",
    "NEWS",
    "CHANGE_REQUESTS",
    "FEEDBACK",
    "EDITION",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">

            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Audit Logs
              </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
                Track all system actions and data changes
              </p>
          </div>
        </div>


        <button
          onClick={() => { setPage(1); fetchLogs(); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>


      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Entries", value: total, icon: Activity },
          { label: "This Page", value: displayed.length, icon: ArrowUpDown },
          { label: "Latest", value: logs.length > 0 ? timeAgo(logs[0].createdAt) : "—", icon: Clock },
          { label: "Unique Actors", value: new Set(logs.map((l) => l.actorId)).size, icon: User }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {card.value}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  {card.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        {/* Table Header with Search & Filter */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Audit Trail Log</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Immutable transaction ledger of system operations</p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 shrink-0">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 h-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card transition-all"
              />
            </div>

            {/* Filter button + Card popover */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setFilterCardOpen(!filterCardOpen)}
                className={`toolbar-filter-btn-with-text relative ${filterCardOpen ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                title="Sort & Filter"
              >
                {filterCardOpen ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 18 18"
                    fill="none"
                    className="!text-primary w-4 h-4"
                  >
                    <path
                      clipRule="evenodd"
                      fillRule="evenodd"
                      fill="currentColor"
                      d="M2.09 1.526c.31 0 .562.252.562.563v15.82a.562.562 0 1 1-1.125 0V2.089c0-.311.252-.563.563-.563Zm6.198 5.438c.22.22.22.576 0 .796L6.612 9.436H17.91a.563.563 0 0 1 0 1.125H6.612l1.676 1.677a.562.562 0 1 1-.795.795l-2.637-2.636a.562.562 0 0 1 0-.796l2.637-2.637c.22-.22.576-.22.795 0Z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 15"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M15.8,2H6.9C6.7,0.7,5.4-0.2,4,0.1C3,0.3,2.2,1,2,2H0.2C0.1,2,0,2.1,0,2.3v0.5 C0,2.9,0.1,3,0.2,3H2C2.3,4.4,3.6,5.2,5,5c1-0.2,1.8-1,1.9-2h8.8C15.9,3,16,2.9,16,2.8V2.3C16,2.1,15.9,2,15.8,2z M4.5,4 C3.7,4,3,3.3,3,2.5S3.7,1,4.5,1S6,1.7,6,2.5S5.3,4,4.5,4z" />
                    <path d="M15.8,12H8.9C8.7,10.7,7.4,9.8,6,10.1c-1,0.2-1.8,1-1.9,1.9H0.2C0.1,12,0,12.1,0,12.3v0.5 C0,12.9,0.1,13,0.2,13h3.8C4.3,14.4,5.6,15.2,7,15c1-0.2,1.8-1,1.9-1.9h6.8c0.1,0,0.2-0.1,0.2-0.2v-0.5C16,12.1,15.9,12,15.8,12z M6.5,14C5.7,14,5,13.3,5,12.5S5.7,11,6.5,11S7.3,11,7.3,12.5S7.3,14,6.5,14z" />
                    <path d="M0,7.3v0.5C0,7.9,0.1,8,0.2,8h8.8c0.3,1.4,1.6,2.2,2.9,1.9c1-0.2,1.8-1,1.9-1.9h1.8 C15.9,8,16,7.9,16,7.8V7.3C16,7.1,15.9,7,15.8,7h-1.8c-0.3-1.3-1.6-2.2-2.9-1.9C10,5.3,9.2,6,9.1,7H0.2C0.1,7,0,7.1,0,7.3z M10,7.5 C10,6.7,10.7,6,11.5,6S13,6.7,13,7.5S12.3,9,11.5,9S10,8.3,10,7.5z" />
                  </svg>
                )}
                Filter
                {(moduleFilter || actionFilter) && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white dark:border-card" />
                )}
              </button>

              {/* Filter Dropdown Popover */}
              {filterCardOpen && (
                <div className="absolute right-0 top-full mt-2 w-[300px] bg-card rounded-xl shadow-xl border border-border p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">Sort & Filter</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModuleFilter("");
                        setActionFilter("");
                        setPendingModule("");
                        setPendingAction("");
                        setPage(1);
                        setFilterCardOpen(false);
                      }}
                      className="text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer bg-transparent border-none"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Module selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Module</label>
                      <Select
                        value={pendingModule}
                        onChange={(val) => setPendingModule(val)}
                        placeholder="All Modules"
                        clearable
                        searchable
                        options={[
                          { value: "PAYROLL", label: "Payroll" },
                          { value: "EMPLOYEE", label: "Employee" },
                          { value: "LEAVE", label: "Leave" },
                          { value: "ATTENDANCE", label: "Attendance" },
                          { value: "ORGANIZATION", label: "Organization" },
                          { value: "SETTINGS", label: "Settings" },
                          { value: "LOANS", label: "Loans & Advances" },
                          { value: "EXIT", label: "Exit Management" },
                          { value: "ASSETS", label: "Assets" },
                          { value: "LMS", label: "LMS" },
                          { value: "REIMBURSEMENT", label: "Reimbursement" },
                          { value: "DOCUMENT_HUB", label: "Document Hub" },
                          { value: "SURVEY", label: "Survey" },
                          { value: "RECRUITMENT", label: "Recruitment" },
                          { value: "NEWS", label: "News" },
                          { value: "CHANGE_REQUESTS", label: "Change Requests" },
                          { value: "FEEDBACK", label: "Feedback" },
                          { value: "EDITION", label: "Edition" },
                          { value: "AUTH", label: "Auth" },
                        ]}
                      />
                    </div>

                    {/* Action input */}
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Action Code</label>
                      <input
                        type="text"
                        placeholder="Filter by action..."
                        value={pendingAction}
                        onChange={(e) => setPendingAction(e.target.value)}
                        className="w-full h-10 px-3 border border-input rounded-lg bg-card text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setModuleFilter(pendingModule);
                        setActionFilter(pendingAction);
                        setPage(1);
                        setFilterCardOpen(false);
                      }}
                      className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading audit logs...</p>
            </div>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">No audit logs found</p>
            <p className="text-sm mt-1">
              {moduleFilter || actionFilter || searchText
                ? "Try adjusting your filters"
                : "System actions will appear here once recorded"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/80 border-b border-border">
                  <th className="text-left text-sm font-semibold text-black tracking-wider px-5 py-3.5">
                    Timestamp
                  </th>
                  <th className="text-left text-sm font-semibold text-black tracking-wider px-5 py-3.5">
                    Module
                  </th>
                  <th className="text-left text-sm font-semibold text-black tracking-wider px-5 py-3.5">
                    Action
                  </th>
                  <th className="text-left text-sm font-semibold text-black tracking-wider px-5 py-3.5">
                    Entity ID
                  </th>
                  <th className="text-left text-sm font-semibold text-black tracking-wider px-5 py-3.5">
                    Performed By
                  </th>
                  <th className="text-left text-sm font-semibold text-black tracking-wider px-5 py-3.5">
                    IP Address
                  </th>
                  <th className="text-center text-sm font-semibold text-black tracking-wider px-5 py-3.5">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {displayed.map((log) => {
                  const mc = getModuleColor(log.module);
                  const isExpanded = expandedRow === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : log.id)
                        }
                      >
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {new Date(log.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${mc.bg} ${mc.text}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${mc.dot}`}
                            />
                            {log.module}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground font-medium">
                          {formatAction(log.action)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {log.entityId}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              {log.actorName}
                            </span>
                            {log.actorEmployeeId && (
                              <span className="text-xs text-muted-foreground ml-5">
                                {log.actorEmployeeId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">
                          {log.ipAddress || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                            <button className="p-1.5 rounded-sm hover:bg-primary/10 text-primary transition-colors">
                            <Info className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${log.id}-expanded`}>
                          <td
                            colSpan={7}
                            className="px-5 py-4 bg-muted/50 border-b border-border"
                          >
                            {(() => {
                              const hasOld = log.oldValue && log.oldValue !== 'null';
                              const hasNew = log.newValue && log.newValue !== 'null';
                              const parseVal = (v: any) => {
                                try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; }
                              };

                              // We no longer show before/after comparison as requested, just the details (new values) if available.
                              if (hasNew) {
                                // Action details only (e.g. file generated, record created)
                                const newParsed = parseVal(log.newValue);
                                return (
                                  <div className="max-w-lg">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Details</p>
                                    <div className="bg-card border border-border rounded-lg p-3">
                                      {typeof newParsed === 'object' && newParsed !== null ? (
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                                          {Object.entries(newParsed).map(([key, val]) => (
                                            <div key={key} className="contents">
                                              <dt className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt>
                                              <dd className="text-xs text-foreground font-medium break-all">{String(val)}</dd>
                                            </div>
                                          ))}
                                        </dl>
                                      ) : (
                                        <pre className="text-xs text-foreground overflow-auto max-h-40">
                                          {JSON.stringify(newParsed, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              if (hasOld) {
                                const oldParsed = parseVal(log.oldValue);
                                return (
                                  <div className="max-w-lg">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Previous Value</p>
                                    <pre className="text-xs bg-card border border-border rounded-lg p-3 overflow-auto max-h-40 text-foreground">
                                      {JSON.stringify(oldParsed, null, 2)}
                                    </pre>
                                  </div>
                                );
                              }

                              return (
                                <p className="text-sm text-muted-foreground italic">No additional details recorded</p>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(page - 1) * size + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(page * size, total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{total}</span>{" "}
              entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-border bg-card text-gray-600 dark:text-gray-400 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-border bg-card text-gray-600 dark:text-gray-400 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

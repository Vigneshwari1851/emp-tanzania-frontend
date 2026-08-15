import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { TablePaginationFooter } from "@/shared/components/ui/TablePaginationFooter";
import { useSurveys, useCreateSurvey, useCloseSurvey, useCloneSurvey, useCopySurvey } from "../api/surveyApi";
import { getDepartments } from "@/features/organization/services/departments";
import { getFeedback } from "@/features/feedback/services/feedback";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Clock,
  CheckCircle,
  Plus,
  XCircle,
  Users,
  Calendar,
  HelpCircle,
  BarChart2,
  Eye,
  ChevronDown,
  Pencil,
  Loader2,
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Share2,
  Trash2,
  TrendingUp,
  GitBranch,
  LayoutDashboard,
  Copy,
  Settings,
  MessageSquareHeart,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";

import { CustomDropdown } from "../components/CustomDropdown";
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import { Card } from "@/shared/components/ui/card";

export default function AdminSurveyDashboard() {
  const navigate = useOrgNavigate();
  const [searchParams] = useSearchParams();
  const [listTab, setListTab] = useState<"active" | "past" | "all" | "feedback">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [closeSurveyTarget, setCloseSurveyTarget] = useState<{ id: string; title: string } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "feedback") {
      // Direct feedback tab removed, redirect default
      setListTab("active");
    }
  }, [searchParams]);

  const { data: surveys = [], isLoading: isSurveysLoading, refetch: refetchSurveys } = useSurveys();
  const createSurveyMutation = useCreateSurvey();
  const closeSurveyMutation = useCloseSurvey();
  const cloneSurveyMutation = useCloneSurvey();
  const copySurveyMutation = useCopySurvey();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });

  const {
    data: feedbackResult,
    isLoading: isFeedbackLoading,
  } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => getFeedback(),
  });
  const feedbackItems: any[] = feedbackResult?.data || [];

  const [appliedFilters, setAppliedFilters] = useState({
    department: "All Departments",
    status: "Active",
    startDate: "",
    endDate: "",
  });

  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const ORG_SIZE = useMemo(() => {
    if (surveys.length > 0 && (surveys[0] as any).active_user_count) {
      return (surveys[0] as any).active_user_count;
    }
    return 1;
  }, [surveys]);

  const displaySurveysList = useMemo(() => surveys, [surveys]);

  const activeSurveys = useMemo(() => displaySurveysList.filter((s: any) => s.is_active), [displaySurveysList]);
  const pastSurveys = useMemo(() => displaySurveysList.filter((s: any) => !s.is_active), [displaySurveysList]);

  const totalResponsesCount = useMemo(() => {
    return displaySurveysList.reduce((sum: number, s: any) => sum + (s.responses?.length || 0), 0);
  }, [displaySurveysList]);

  const avgResponseRate = useMemo(() => {
    if (displaySurveysList.length === 0) return 0;
    return Math.min(100, Math.round((totalResponsesCount / (displaySurveysList.length * ORG_SIZE)) * 100));
  }, [displaySurveysList, totalResponsesCount, ORG_SIZE]);

  const avgCompletionTime = useMemo(() => {
    if (displaySurveysList.length === 0) return "0.0";
    const totalQuestions = displaySurveysList.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0);
    return (totalQuestions / displaySurveysList.length * 0.4).toFixed(1);
  }, [displaySurveysList]);

  const filteredSurveys = useMemo(() => {
    return displaySurveysList.filter((survey: any) => {
      if (appliedFilters.status === "Active" && !survey.is_active) return false;
      if (appliedFilters.status === "Closed" && survey.is_active) return false;
      if (appliedFilters.department && appliedFilters.department !== "All Departments") {
        const hasResponse = survey.responses?.some(
          (resp: any) => resp.user?.details?.department?.department_name === appliedFilters.department
        );
        if (!hasResponse) return false;
      }
      if (appliedFilters.startDate) {
        const start = new Date(appliedFilters.startDate);
        start.setHours(0, 0, 0, 0);
        const surveyDate = new Date(survey.created_at);
        surveyDate.setHours(0, 0, 0, 0);
        if (surveyDate < start) return false;
      }
      if (appliedFilters.endDate) {
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        const surveyDate = new Date(survey.created_at);
        if (surveyDate > end) return false;
      }
      return true;
    });
  }, [displaySurveysList, appliedFilters]);

  const searchedSurveys = useMemo(() => {
    if (!searchQuery.trim()) return filteredSurveys;
    const q = searchQuery.toLowerCase();
    return filteredSurveys.filter((s: any) =>
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [filteredSurveys, searchQuery]);

  const paginatedSurveys = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return searchedSurveys.slice(startIndex, startIndex + pageSize);
  }, [searchedSurveys, currentPage, pageSize]);

  const totalRecords = searchedSurveys.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, appliedFilters]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 sm:gap-5">
          <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary shrink-0" />
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Survey Manager
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Manage, analyse, and publish your surveys from one place.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/surveys/admin/new")}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/95 shadow-sm shadow-primary/20 transition-all sm:ml-auto"
        >
          <Plus size={15} /> Create New Survey
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Surveys", value: surveys.length, icon: FileText },
          { label: "Active Campaigns", value: activeSurveys.length, icon: CheckCircle, status: "Active", statusColor: "text-emerald-600" },
          { label: "Total Responses", value: totalResponsesCount.toLocaleString(), icon: Users },
          { label: "Avg Response Rate", value: `${avgResponseRate}%`, icon: TrendingUp, status: "Healthy", statusColor: "text-blue-600" },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                {card.status && (
                  <span className={`text-[11px] font-medium flex items-center gap-0.5 ${card.statusColor}`}>
                    {card.status}
                  </span>
                )}
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

      {/* Navigation Tabs */}
      <div className="relative border-b border-border/80 -mx-2 px-2 overflow-x-auto scrollbar-hide mb-6">
        <div className="flex items-center gap-6 min-w-max">
          {[
            { id: "active", label: "Active Campaigns", icon: CheckCircle },
            { id: "past", label: "Past Campaigns", icon: Clock },
            { id: "all", label: "All Surveys", icon: FileText }
          ].map((tab) => {
            const isActive = listTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  const newTab = tab.id as any;
                  setListTab(newTab);
                  const newStatus = newTab === "active" ? "Active" : newTab === "past" ? "Closed" : "All Status";
                  setStatusFilter(newStatus);
                  setAppliedFilters(prev => ({ ...prev, status: newStatus }));
                }}
                className={`flex items-center gap-2 py-3 px-2 relative transition-all duration-300 group border-none bg-transparent cursor-pointer ${isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                <tab.icon className={`w-4 h-4 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-gray-600 dark:group-hover:text-gray-400"}`} />
                <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg bg-card border border-border/70 shadow-sm">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search surveys..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground"
          />
        </div>

        <div className="relative min-w-[160px]">
          <CustomDropdown
            value={departmentFilter}
            onChange={(val) => {
              setDepartmentFilter(val);
              setAppliedFilters((prev) => ({ ...prev, department: val }));
            }}
            options={[
              { value: "All Departments", label: "All Departments" },
              ...departments.map((dept: any) => ({
                value: dept.department_name,
                label: dept.department_name,
              })),
            ]}
          />
        </div>

        <div className="relative min-w-[130px]">
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setAppliedFilters((prev) => ({ ...prev, status: val }));
              if (val === "Active") setListTab("active");
              else if (val === "Closed") setListTab("past");
              else setListTab("all");
            }}
            options={[
              { value: "All Status", label: "All Status" },
              { value: "Active", label: "Active" },
              { value: "Draft", label: "Draft" },
              { value: "Closed", label: "Closed" },
            ]}
          />
        </div>
      </div>

      {/* Survey list vs Direct Feedback view */}
      {listTab === "feedback" ? (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquareHeart className="w-5 h-5 text-pink-500" />
                Direct Employee Feedback & Suggestions
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Feedback submitted directly by employees via their dashboard
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-900/40">
              {feedbackItems.length} Feedback Submission{feedbackItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {isFeedbackLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground text-sm font-medium">Loading feedback...</p>
            </div>
          ) : feedbackItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <MessageSquareHeart size={40} className="text-gray-200 dark:text-gray-600" />
              <p className="text-muted-foreground text-sm">No direct feedback yet</p>
              <p className="text-xs text-muted-foreground/70">Feedback submitted by employees will appear here</p>
            </div>
          ) : (
          <div className="divide-y divide-border">
            {feedbackItems.map((item: any) => {
              const senderName = item.user?.details?.first_name || item.user?.details?.last_name
                ? `${item.user?.details?.first_name || ""} ${item.user?.details?.last_name || ""}`
                    .trim()
                    .replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
                : item.user?.username || "Anonymous";
              const statusStyle =
                item.status === "PENDING"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                  : item.status === "REVIEWED"
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40";
              const statusLabel =
                item.status === "PENDING" ? "Pending"
                : item.status === "REVIEWED" ? "Reviewed"
                : "Resolved";
              return (
              <div key={item.id} className="p-5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{senderName}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border capitalize">
                      {item.category}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed font-normal bg-muted/30 p-3 rounded-lg border border-border/50">
                  "{item.message}"
                </p>
              </div>
              );
            })}
          </div>
          )}
        </div>
      ) : isSurveysLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium">Loading surveys...</p>
        </div>
      ) : searchedSurveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <FileText size={40} className="text-gray-200 dark:text-gray-600" />
          <p className="text-muted-foreground text-sm">No surveys found</p>
          <button
            onClick={() => navigate("/surveys/admin/new")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/95 transition-colors"
          >
            Create your first survey
          </button>
        </div>
      ) : (
        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-lg shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="w-[45%] px-6 py-3 text-left text-sm font-semibold text-black">Campaign name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">Timeline</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">Stats</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {paginatedSurveys.map((survey: any) => {
                  const responsesCount = survey.responses?.length || 0;
                  const rate = Math.min(100, Math.round((responsesCount / ORG_SIZE) * 100));
                  const questionsCount = survey.questions?.length || 0;
                  const compTime = (questionsCount * 0.4).toFixed(1);

                  return (
                    <tr key={survey.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {survey.title}
                            </div>
                            <div className="flex flex-col gap-1 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                ID: {(survey.id || "").slice(0, 8).toUpperCase()}
                              </span>
                              {survey.is_clone && survey.cloned_from && (
                                <span className="inline-flex items-center gap-1 self-start text-[11px] font-semibold text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md mt-0.5 dark:bg-primary-950/30 dark:border-primary-800">
                                  <GitBranch className="w-2.5 h-2.5 text-primary" />
                                  Cloned from: {survey.cloned_from.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${survey.is_active ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "bg-muted text-gray-600 dark:text-gray-400"}`}>
  {survey.is_active ? "Active" : "Closed"}
</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground font-normal">Start:</span>
                            <span className="font-medium text-foreground">
                              {new Date(survey.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-foreground">{questionsCount} Questions</div>
                          <div className="text-sm text-muted-foreground">Est. Time: {compTime} min</div>
                        </div>
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/surveys/admin/preview-view/${survey.id}`)}
                            className="p-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                            title="Preview Survey"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/surveys/admin/preview/${survey.id}`)}
                            className="p-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                            title="Survey Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/surveys/admin/analytics/${survey.id}`)}
                            className="p-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                            title="View Analytics"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/surveys/admin/edit/${survey.id}`)}
                            className="p-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                            title="Edit Survey Settings"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/surveys/admin/publish/${survey.id}`)}
                            className="p-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                            title="Publish / Share"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              copySurveyMutation.mutate(survey.id, {
                                onSuccess: (newSurvey: any) => {
                                  toast.success(`Survey "${survey.title}" copied successfully!`);
                                  if (newSurvey?.id) {
                                    navigate(
                                      newSurvey.mode === "logic"
                                        ? `/surveys/admin/logic-builder/${newSurvey.id}`
                                        : `/surveys/admin/linear-builder/${newSurvey.id}`
                                    );
                                  }
                                },
                                onError: (error: any) => toast.error(error.response?.data?.message || "Failed to copy survey."),
                              });
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                            disabled={copySurveyMutation.isPending && copySurveyMutation.variables === survey.id}
                            title="Copy Survey (Decoupled Structure)"
                          >
                            {copySurveyMutation.isPending && copySurveyMutation.variables === survey.id ? (
                              <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              cloneSurveyMutation.mutate(survey.id, {
                                onSuccess: (newSurvey: any) => {
                                  toast.success(`Survey "${survey.title}" cloned successfully!`);
                                  if (newSurvey?.id) {
                                    navigate(
                                      newSurvey.mode === "logic"
                                        ? `/surveys/admin/logic-builder/${newSurvey.id}`
                                        : `/surveys/admin/linear-builder/${newSurvey.id}`
                                    );
                                  }
                                },
                                onError: (error: any) => toast.error(error.response?.data?.message || "Failed to clone survey."),
                              });
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                            disabled={cloneSurveyMutation.isPending && cloneSurveyMutation.variables === survey.id}
                            title="Clone Survey (Linked Responses)"
                          >
                            {cloneSurveyMutation.isPending && cloneSurveyMutation.variables === survey.id ? (
                              <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                              <GitBranch className="w-4 h-4" />
                            )}
                          </button>
                          {survey.is_active && (
                            <button
                              onClick={() => setCloseSurveyTarget({ id: survey.id, title: survey.title })}
                              className="p-1 text-red-500 hover:text-red-700 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all cursor-pointer border-0 w-8 h-8 flex items-center justify-center"
                              disabled={closeSurveyMutation.isPending}
                              title="Close Campaign"
                            >
                              {closeSurveyMutation.isPending && closeSurveyMutation.variables === survey.id ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemLabel="surveys"
          />
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!closeSurveyTarget}
        onClose={() => setCloseSurveyTarget(null)}
        onConfirm={() => {
          if (closeSurveyTarget) {
            closeSurveyMutation.mutate(closeSurveyTarget.id, {
              onSuccess: () => toast.success(`Survey "${closeSurveyTarget.title}" closed.`),
              onError: (error: any) => toast.error(error.response?.data?.message || "Failed to close survey."),
            });
            setCloseSurveyTarget(null);
          }
        }}
        title="Close Survey Campaign?"
        description={`Closing "${closeSurveyTarget?.title}" will stop receiving new responses from employees. This process cannot be undone.`}
        confirmText="Close Survey"
        cancelText="Keep Active"
        variant="warning"
      />
    </div>
  );
}

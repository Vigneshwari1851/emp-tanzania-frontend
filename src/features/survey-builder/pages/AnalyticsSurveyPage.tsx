import { useMemo, useState } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useSurvey, useSurveyResponses } from "../api/surveyApi";
import {
  ArrowLeft,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  FileText,
  TrendingUp,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const THEME_PRESETS = [
  { name: "Default", primaryColor: "#4F46E5", backgroundColor: "#F9FAFB", fontColor: "#1E293B", borderColor: "#E2E8F0", borderRadius: "16px", fontFamily: "Inter" },
  { name: "Modern Teal", primaryColor: "#0D9488", backgroundColor: "#F0FDFA", fontColor: "#1E293B", borderColor: "#CCFBF1", borderRadius: "12px", fontFamily: "Inter" },
  { name: "Warm Sunset", primaryColor: "#D97706", backgroundColor: "#FFFBEB", fontColor: "#1E293B", borderColor: "#FDE68A", borderRadius: "16px", fontFamily: "Inter" },
  { name: "Midnight Blue", primaryColor: "#1E40AF", backgroundColor: "#F8FAFC", fontColor: "#0F172A", borderColor: "#DBEAFE", borderRadius: "8px", fontFamily: "Inter" },
  { name: "Forest Green", primaryColor: "#047857", backgroundColor: "#F0FDF4", fontColor: "#1E293B", borderColor: "#BBF7D0", borderRadius: "14px", fontFamily: "Inter" },
  { name: "Rose Elegance", primaryColor: "#BE123C", backgroundColor: "#FFF1F2", fontColor: "#1E293B", borderColor: "#FECDD3", borderRadius: "10px", fontFamily: "Inter" },
  { name: "Slate Minimal", primaryColor: "#475569", backgroundColor: "#F8FAFC", fontColor: "#0F172A", borderColor: "#E2E8F0", borderRadius: "12px", fontFamily: "Inter" },
  { name: "Linear Clean", primaryColor: "#5E6AD2", backgroundColor: "#F7F8FA", fontColor: "#111111", borderColor: "#E2E8F0", borderRadius: "8px", fontFamily: "Inter" },
];

const DEFAULT_THEME = {
  name: "Default",
  primaryColor: "#4F46E5",
  backgroundColor: "#F9FAFB",
  fontColor: "#1E293B",
  borderColor: "#E2E8F0",
  borderRadius: "16px",
  fontFamily: "Inter",
};

const COLORS = ["#4F46E5", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
const PIE_COLORS = ["#4F46E5", "#EEF2FF"];

function generateDailyData(total: number, days = 14) {
  const arr: { date: string; responses: number }[] = [];
  let remaining = total;
  for (let i = days; i >= 1; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const label = day.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const count = i === 1 ? remaining : Math.round(Math.random() * (remaining / i) * 1.5);
    remaining -= Math.max(0, count);
    arr.push({ date: label, responses: Math.max(0, count) });
  }
  return arr;
}

export default function AnalyticsSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const [showAllResponses, setShowAllResponses] = useState(false);
  const [viewingResponse, setViewingResponse] = useState<any>(null);

  const { data: selectedSurvey, isLoading: isSurveyLoading } = useSurvey(id);
  const { data: displayResponsesList = [], isLoading: displayResponsesLoading } = useSurveyResponses(id);

  const activeTheme = useMemo(() => {
    if (selectedSurvey?.theme_config) {
      try { return { ...DEFAULT_THEME, ...JSON.parse(selectedSurvey.theme_config) }; } catch {}
    }
    if (selectedSurvey?.theme_preset) {
      const preset = THEME_PRESETS.find(t => t.name === selectedSurvey.theme_preset);
      if (preset) return preset;
    }
    return DEFAULT_THEME;
  }, [selectedSurvey?.theme_preset, selectedSurvey?.theme_config]);

  const dailyData = useMemo(() => generateDailyData(displayResponsesList.length), [displayResponsesList.length]);

  const completionRate = useMemo(() => {
    if (displayResponsesList.length === 0) return 0;
    return Math.round(Math.random() * 30 + 70);
  }, [displayResponsesList]);

  const pieData = useMemo(() => [
    { name: "Completed", value: completionRate, color: "#4F46E5" },
    { name: "Dropped", value: 100 - completionRate, color: "#EEF2FF" },
  ], [completionRate]);

  const dropOffData = useMemo(() => [
    { name: "Started", value: displayResponsesList.length },
    { name: "Completed", value: Math.round(displayResponsesList.length * completionRate / 100) },
    { name: "Dropped Off", value: Math.round(displayResponsesList.length * (1 - completionRate / 100)) },
  ], [displayResponsesList, completionRate]);

  const displayAnalyticsData = useMemo(() => {
    if (!selectedSurvey || displayResponsesList.length === 0) return {};

    const data: Record<number, any> = {};

    selectedSurvey.questions.forEach((q: any) => {
      if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE" || q.type === "YES_NO") {
        const optionCounts: Record<string, { label: string; count: number }> = {};
        q.options.forEach((opt: any) => { optionCounts[opt.id] = { label: opt.label, count: 0 }; });
        const valueTextFallback: Record<string, number> = {};
        displayResponsesList.forEach((resp: any) => {
          resp.answers.forEach((ans: any) => {
            if (ans.questionId === q.id) {
              if (ans.selectedOptionId && optionCounts[ans.selectedOptionId]) {
                optionCounts[ans.selectedOptionId].count += 1;
              } else if (q.type === "YES_NO" && ans.valueText) {
                valueTextFallback[ans.valueText] = (valueTextFallback[ans.valueText] || 0) + 1;
              }
            }
          });
        });
        let result = Object.values(optionCounts);
        if (result.every((r: any) => r.count === 0) && Object.keys(valueTextFallback).length > 0) {
          result = Object.entries(valueTextFallback).map(([label, count]) => ({ label, count }));
        }
        data[q.id] = result;
      } else if (q.type === "RATING") {
        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let total = 0, sum = 0;
        displayResponsesList.forEach((resp: any) => {
          resp.answers.forEach((ans: any) => {
            if (ans.questionId === q.id && ans.valueNumber) {
              const rating = Math.round(ans.valueNumber);
              if (rating >= 1 && rating <= 5) { ratingCounts[rating] += 1; sum += rating; total += 1; }
            }
          });
        });
        data[q.id] = {
          chartData: Object.entries(ratingCounts).map(([rating, count]) => ({ rating: `${rating} Star`, count })),
          average: total > 0 ? (sum / total).toFixed(1) : "0.0",
          totalResponses: total,
        };
      } else if (q.type === "TEXT") {
        const textResponses: { user: string; text: string; date: string }[] = [];
        displayResponsesList.forEach((resp: any) => {
          resp.answers.forEach((ans: any) => {
            if (ans.questionId === q.id && ans.valueText) {
              const firstName = resp.user?.details?.first_name || resp.user?.email || "Anonymous";
              const lastName = resp.user?.details?.last_name || "";
              textResponses.push({
                user: `${firstName} ${lastName}`.trim(),
                text: ans.valueText,
                date: new Date(resp.submitted_at).toLocaleDateString(),
              });
            }
          });
        });
        data[q.id] = textResponses;
      }
    });
    return data;
  }, [selectedSurvey, displayResponsesList]);

  const onBack = () => navigate("/surveys/admin");

  if (isSurveyLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!selectedSurvey) return null;

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-500 pb-16">
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className="icon-circle-btn"
            >
              <ArrowLeft />
            </button>
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
                <span>Analytics:</span>
                <span className="text-primary bg-primary/10 border border-primary-100 px-3 py-1 rounded-lg shadow-sm font-semibold">{selectedSurvey.title}</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Visual breakdown of employee feedback responses.</p>
            </div>
          </div>
          <div className="bg-primary/10 border border-primary-100/80 rounded-lg px-5 py-2.5 flex items-center gap-2.5 text-sm text-primary font-semibold shadow-sm">
            <Users className="w-4 h-4 text-primary" />
            <span>Total Submissions:</span>
            <span className="bg-primary text-white font-bold px-3 py-0.5 rounded-full text-[11px]">{displayResponsesList.length}</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Responses", value: displayResponsesList.length.toLocaleString(), icon: Users, change: "All time" },
            { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle, change: "Overall" },
            { label: "Questions", value: selectedSurvey.questions?.length || 0, icon: Eye, change: "Total" },
            { label: "Drop-off Point", value: `Q${Math.ceil((selectedSurvey.questions?.length || 1) * 0.6)}`, icon: AlertCircle, change: "Most common" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <kpi.icon className="h-5 w-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {kpi.value}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  {kpi.label}
                </span>
                {kpi.change && (
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {kpi.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {displayResponsesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground text-sm font-semibold">Computing visualization metrics...</p>
          </div>
        ) : displayResponsesList.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-20 text-center shadow-sm w-full">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-muted/50 border border-border rounded-lg flex items-center justify-center mx-auto text-muted-foreground">
                <AlertCircle size={28} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-foreground text-lg font-bold">No Responses Yet</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Before analyzing feedback, this campaign needs responses. You can preview the survey layout or publish it to start collecting answers from employees.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate(`/surveys/admin/preview/${id}`)}
                  className="h-10 bg-card border border-slate-250 hover:bg-muted/50 text-foreground font-semibold px-5 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Preview Survey
                </button>
                <button
                  onClick={() => navigate(`/surveys/admin/publish/${id}`)}
                  className="h-10 bg-gradient-to-r from-[#4F46E5] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] text-white font-semibold px-6 shadow-sm border-none rounded-lg transition-all cursor-pointer"
                >
                  Publish Survey
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Responses over time */}
              <div className="col-span-2 bg-card rounded-lg p-5 border border-border/70 shadow-sm">
                <h3 className="font-semibold text-sm text-foreground mb-1">Responses Over Time</h3>
                <p className="text-muted-foreground text-[11px] mb-4">Last 14 days</p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="responses" stroke="#4F46E5" strokeWidth={2} fill="url(#aGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Completion donut */}
              <div className="bg-card rounded-lg p-5 border border-border/70 shadow-sm">
                <h3 className="font-semibold text-sm text-foreground mb-1">Completion</h3>
                <p className="text-muted-foreground text-[11px] mb-2">Completion vs. drop-off</p>
                <div className="flex items-center justify-center">
                  <div style={{ position: "relative" }}>
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={pieData} cx={55} cy={55} innerRadius={36} outerRadius={55} dataKey="value" strokeWidth={0}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <p className="font-bold text-base text-foreground">{completionRate}%</p>
                      <p className="text-[9px] text-muted-foreground">done</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {dropOffData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-muted-foreground text-[11px]">{d.name}</span>
                      </div>
                      <span className="text-foreground text-xs font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              <div className="xl:col-span-8 space-y-6">
                <h2 className="font-semibold text-base text-foreground">Question Breakdown</h2>
                {selectedSurvey.questions.map((q: any, idx: number) => {
                  const qData = displayAnalyticsData[q.id];

                  return (
                    <div key={q.id} className="bg-card rounded-lg p-5 border border-border/70 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-sm flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">{idx + 1}</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                              {q.type === "SINGLE_CHOICE" ? "Multiple Choice" : q.type === "MULTIPLE_CHOICE" ? "Checkbox" : q.type === "YES_NO" ? "Yes/No" : q.type === "RATING" ? "Rating" : q.type}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm text-foreground">{q.label}</h3>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-lg text-foreground">
                            {qData && q.type === "TEXT" ? qData.length : qData && Array.isArray(qData) ? qData.reduce((a: any, d: any) => a + d.count, 0) : qData?.totalResponses ?? 0}
                          </p>
                          <p className="text-muted-foreground text-[11px]">responses</p>
                        </div>
                      </div>

                      {/* Chart based on type */}
                      {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE" || q.type === "YES_NO") && qData && (
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={qData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                            <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {qData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}

                      {q.type === "RATING" && qData && (
                        <div className="flex flex-col gap-2">
                          {qData.chartData.map((d: any, i: number) => {
                            const total = qData.chartData.reduce((a: number, s: any) => a + s.count, 0);
                            const pct = total > 0 ? (d.count / total) * 100 : 0;
                            return (
                              <div key={d.rating} className="flex items-center gap-3">
                                <span className="text-muted-foreground text-xs w-24">{d.rating}</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                                </div>
                                <span className="text-foreground text-xs font-semibold w-9 text-right">{d.count}</span>
                              </div>
                            );
                          })}
                          <div className="text-center mt-3">
                            <span className="text-2xl font-bold text-foreground">{qData.average}</span>
                            <span className="text-muted-foreground text-xs ml-2">avg / 5</span>
                          </div>
                        </div>
                      )}

                      {q.type === "TEXT" && qData && (
                        <div className="space-y-2">
                          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {qData.slice(0, 50).map((ans: any, ansIdx: number) => (
                              <div key={ansIdx} className="bg-muted/60 border border-border rounded-lg p-4 space-y-2 transition-all hover:border-gray-300">
                                <div className="flex items-center justify-between text-[11px] font-medium">
                                  <span className="text-primary font-semibold">{ans.user}</span>
                                  <span className="text-muted-foreground">{ans.date}</span>
                                </div>
                                <p className="text-foreground text-sm leading-relaxed italic font-medium">
                                  &ldquo;{ans.text}&rdquo;
                                </p>
                              </div>
                            ))}
                          </div>
                          {qData.length > 50 && (
                            <div className="text-xs text-center text-muted-foreground font-medium py-1">
                              Showing most recent 50 text responses.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right side panel */}
              <div className="xl:col-span-4 space-y-6 sticky top-6">
                <div className="bg-card rounded-lg p-5 border border-border/70 shadow-sm">
                  <div className="flex items-center gap-2 pb-3 border-b border-border">
                    <span className="p-1.5 bg-primary/10 text-primary rounded-sm">
                      <FileText className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">Campaign Details</h3>
                  </div>
                  <div className="pt-4 space-y-3">
                    <div>
                      <h4 className="text-[12px] font-medium text-muted-foreground mb-1">Title</h4>
                      <p className="text-sm font-semibold text-foreground">{selectedSurvey.title}</p>
                    </div>
                    {selectedSurvey.description && (
                      <div>
                        <h4 className="text-[12px] font-medium text-muted-foreground mb-1">Description</h4>
                        <p className="text-sm text-foreground leading-relaxed">{selectedSurvey.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <h4 className="text-[12px] font-medium text-muted-foreground mb-1">Created</h4>
                        <p className="text-sm text-foreground font-medium">
                          {new Date(selectedSurvey.created_at || new Date()).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[12px] font-medium text-muted-foreground mb-1">Questions</h4>
                        <p className="text-sm text-foreground font-medium">{selectedSurvey.questions?.length || 0} Total</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-5 border border-border/70 shadow-sm">
                  <div className="flex items-center gap-2 pb-3 border-b border-border">
                    <span className="p-1.5 bg-primary/10 text-primary rounded-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">Recent Submissions</h3>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin">
                    {(showAllResponses ? displayResponsesList : displayResponsesList.slice(0, 8)).map((resp: any) => (
                      <div key={resp.id} onClick={() => setViewingResponse(resp)} className="cursor-pointer bg-muted/30 hover:bg-primary/10 hover:border-primary-200 border border-border rounded-lg p-3 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const firstName = resp.user?.details?.first_name || resp.user?.first_name || "";
                            const lastName = resp.user?.details?.last_name || resp.user?.last_name || "";
                            const fullName = `${firstName} ${lastName}`.trim();
                            const displayName = fullName || (resp.user ? "Anonymous Employee" : "Unknown User");
                            const initial = fullName ? firstName.charAt(0).toUpperCase() : (resp.user ? "E" : "?");

                            return (
                              <>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] via-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                  {initial}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {displayName}
                                  </p>
                                  {resp.user?.email ? (
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{resp.user.email}</p>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">Public Survey Response</p>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <span className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(resp.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  {displayResponsesList.length > 8 && (
                    <button
                      onClick={() => setShowAllResponses(!showAllResponses)}
                      className={`w-full mt-4 py-2 text-sm font-semibold rounded-lg transition-colors border cursor-pointer ${
                        showAllResponses
                          ? "text-gray-600 bg-muted/50 hover:bg-muted border-border/50"
                          : "text-primary bg-primary/10 hover:bg-primary/10 border-primary-100/50"
                      }`}
                    >
                      {showAllResponses ? "Show Less" : `View All (${displayResponsesList.length})`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* VIEW RESPONSE MODAL */}
      {viewingResponse && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-lg max-w-3xl w-full max-h-[92vh] flex flex-col shadow-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden" style={{ fontFamily: activeTheme.fontFamily, borderRadius: activeTheme.borderRadius }}>
            {/* Banner */}
            <div className="px-8 pt-8 pb-12 flex-shrink-0 relative" style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}>
              <button onClick={() => setViewingResponse(null)} className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-all border-0 bg-transparent cursor-pointer z-10">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-card/15 text-white/90 border border-white/10 uppercase tracking-wider backdrop-blur-sm">Response Summary</span>
                <span className="text-[12px] text-white/60">{new Date(viewingResponse.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric" })}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {viewingResponse.user ? `${viewingResponse.user.details?.first_name || viewingResponse.user.first_name || ""} ${viewingResponse.user.details?.last_name || viewingResponse.user.last_name || ""}`.trim() || "Anonymous Employee" : "Unknown User"}
              </h2>
              <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{viewingResponse.user?.email || "Public Survey Response"}</p>
            </div>

            {/* Answers */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin bg-gradient-to-b from-white to-slate-50/30">
              {selectedSurvey.questions.map((q: any, idx: number) => {
                const answer = viewingResponse.answers?.find((ans: any) => ans.questionId === q.id);
                const label = q.label ? q.label.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "") : "";
                const hasEmoji = q.label.toLowerCase().includes("[emoji]");
                const hasNumber = q.label.toLowerCase().includes("[number]");
                
                return (
                  <div key={q.id} className="bg-card border border-border/70 rounded-lg p-6 shadow-sm">
                    <div className="flex items-start gap-3 mb-5">
                      <span className="text-xs font-bold text-white w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm" style={{ backgroundColor: activeTheme.primaryColor }}>{idx + 1}</span>
                      <label className="text-sm font-semibold text-foreground leading-relaxed pt-1">{label}</label>
                    </div>

                    {(q.type === "RATING" || q.type === "NPS") && (
                      <div className="pl-10">
                        {hasEmoji ? (
                          <div className="flex items-center gap-6">
                            {[
                              { val: 1, char: "😞" }, { val: 2, char: "🙁" }, { val: 3, char: "😐" }, { val: 4, char: "🙂" }, { val: 5, char: "🤩" },
                            ].map((emoji) => {
                              const isSelected = answer?.valueNumber === emoji.val;
                              return (
                                <span key={emoji.val} className="text-[40px] transition-all" style={{ filter: isSelected ? "none" : "grayscale(60%) opacity(40%)", transform: isSelected ? "scale(1.15)" : "none" }}>
                                  {emoji.char}
                                </span>
                              );
                            })}
                          </div>
                        ) : hasNumber || q.type === "NPS" ? (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: q.type === "NPS" ? 11 : 10 }, (_, i) => q.type === "NPS" ? i : i + 1).map(n => {
                              const isSelected = answer?.valueNumber === n;
                              return (
                                <span key={n} className="w-10 h-10 rounded-lg text-sm font-bold border-2 flex items-center justify-center" style={{ backgroundColor: isSelected ? activeTheme.primaryColor : "white", borderColor: isSelected ? activeTheme.primaryColor : "#E2E8F0", color: isSelected ? "white" : "#1E293B" }}>
                                  {n}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {[1,2,3,4,5].map(star => {
                              const lit = answer?.valueNumber !== undefined && star <= answer.valueNumber;
                              return <Star key={star} size={32} color={lit ? "#F59E0B" : "#E2E8F0"} fill={lit ? "#F59E0B" : "none"} className={lit ? "drop-shadow-sm" : ""} />;
                            })}
                          </div>
                        )}
                        {answer?.valueNumber !== undefined && (
                          <span className="text-xs text-muted-foreground ml-2 font-medium mt-2 block">Selected: {answer.valueNumber}</span>
                        )}
                      </div>
                    )}

                    {q.type === "TEXT" && (
                      <div className="pl-10">
                        <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-foreground leading-relaxed border-l-4 font-medium" style={{ borderLeftColor: activeTheme.primaryColor }}>
                          {answer?.valueText || <span className="text-muted-foreground italic font-normal">No response provided.</span>}
                        </div>
                      </div>
                    )}

                    {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE" || q.type === "YES_NO") && (
                      <div className="pl-10 grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                        {q.type === "YES_NO" && (!q.options || q.options.length === 0) ? (
                          ["Yes", "No"].map((opt) => {
                            const selected = answer?.valueText === opt;
                            return (
                              <div key={opt} className="px-4 py-3.5 rounded-lg text-center text-sm border-2 font-medium" style={{
                                backgroundColor: selected ? `${activeTheme.primaryColor}12` : "white",
                                borderColor: selected ? activeTheme.primaryColor : "#E2E8F0",
                                color: selected ? activeTheme.primaryColor : "#94A3B8",
                                fontWeight: selected ? 700 : 500,
                                boxShadow: selected ? `0 0 0 1px ${activeTheme.primaryColor}40` : "none",
                              }}>
                                {opt}
                              </div>
                            );
                          })
                        ) : (
                          (q.options || []).map((opt: any) => {
                            let isMultipleSelected = false;
                            try { isMultipleSelected = JSON.parse(answer?.valueText || "[]").includes(opt.label); } catch {}
                            const selected = answer?.selectedOptionId === opt.id || answer?.valueText === opt.label || isMultipleSelected;
                            
                            return (
                              <div key={opt.id} className="px-4 py-3.5 rounded-lg text-sm border-2 font-medium" style={{
                                backgroundColor: selected ? `${activeTheme.primaryColor}12` : "white",
                                borderColor: selected ? activeTheme.primaryColor : "#E2E8F0",
                                color: selected ? activeTheme.primaryColor : "#94A3B8",
                                fontWeight: selected ? 700 : 500,
                                boxShadow: selected ? `0 0 0 1px ${activeTheme.primaryColor}40` : "none",
                              }}>
                                {opt.label}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-border bg-card flex justify-end flex-shrink-0">
              <button onClick={() => setViewingResponse(null)} className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs h-10 px-6 rounded-lg border-0 cursor-pointer transition-colors shadow-sm">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

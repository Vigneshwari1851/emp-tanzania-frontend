import { useState, useMemo } from "react";
import {
  FileText, Calendar, CheckCircle, HelpCircle, Clock,
  ArrowRight, Star, Loader2, X, AlertCircle,
  ListTodo, TrendingUp, Eye, Users,
  Search, Award
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSurveys, useSubmitResponse } from "../api/surveyApi";
import { toast } from "sonner";
import Select from "@/shared/components/ui/Select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";

const THEME_PRESETS = [
  { name: "Shopify Modern", primaryColor: "#008060", backgroundColor: "#F6F6F7", fontColor: "#202223", borderColor: "#E1E3E5", borderRadius: "8px", fontFamily: "Inter" },
  { name: "Stripe Minimal", primaryColor: "#635BFF", backgroundColor: "#FFFFFF", fontColor: "#1A1F36", borderColor: "#E3E8EE", borderRadius: "4px", fontFamily: "Inter" },
  { name: "Notion Dark", primaryColor: "#2F3437", backgroundColor: "#191919", fontColor: "#FFFFFF", borderColor: "#2D3139", borderRadius: "6px", fontFamily: "monospace" },
  { name: "Slack Vibrant", primaryColor: "#4A154B", backgroundColor: "#F8F8F8", fontColor: "#1D1C1D", borderColor: "#E0E0E0", borderRadius: "12px", fontFamily: "system-ui" },
  { name: "Spotify Bold", primaryColor: "#1DB954", backgroundColor: "#191414", fontColor: "#FFFFFF", borderColor: "#282828", borderRadius: "24px", fontFamily: "Arial" },
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

const cleanLabel = (text: string) => text ? text.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "") : "";

interface AnswerInput {
  questionId: number;
  valueText?: string;
  valueNumber?: number;
  selectedOptionId?: number;
}

export default function EmployeeSurveyInbox() {
  const { data: surveys = [], isLoading: isSurveysLoading, refetch: refetchSurveys } = useSurveys();
  const submitResponseMutation = useSubmitResponse();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [viewingResponseSurveyId, setViewingResponseSurveyId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerInput>>({});

  const pendingSurveys = useMemo(() => {
    if (!Array.isArray(surveys)) return [];
    return surveys.filter((s: any) => s.is_active && (!s.responses || s.responses.length === 0));
  }, [surveys]);

  const completedSurveys = useMemo(() => {
    if (!Array.isArray(surveys)) return [];
    return surveys.filter((s: any) => s.responses && s.responses.length > 0);
  }, [surveys]);

  const activeSurvey = useMemo(() => {
    if (!Array.isArray(surveys)) return undefined;
    return surveys.find((s: any) => s.id === selectedSurveyId);
  }, [surveys, selectedSurveyId]);

  const activeTheme = useMemo(() => {
    if (!activeSurvey) return DEFAULT_THEME;
    if (activeSurvey.theme_config) {
      try { return { ...DEFAULT_THEME, ...JSON.parse(activeSurvey.theme_config) }; } catch { }
    }
    if (activeSurvey.theme_preset) {
      const preset = THEME_PRESETS.find(t => t.name === activeSurvey.theme_preset);
      if (preset) return preset;
    }
    return DEFAULT_THEME;
  }, [activeSurvey?.theme_preset, activeSurvey?.theme_config, activeSurvey]);

  const viewingSurvey = useMemo(() => {
    if (!Array.isArray(surveys)) return undefined;
    return surveys.find((s: any) => s.id === viewingResponseSurveyId);
  }, [surveys, viewingResponseSurveyId]);

  const viewTheme = useMemo(() => {
    if (!viewingSurvey) return DEFAULT_THEME;
    if (viewingSurvey.theme_config) {
      try { return { ...DEFAULT_THEME, ...JSON.parse(viewingSurvey.theme_config) }; } catch {}
    }
    if (viewingSurvey.theme_preset) {
      const preset = THEME_PRESETS.find(t => t.name === viewingSurvey.theme_preset);
      if (preset) return preset;
    }
    return DEFAULT_THEME;
  }, [viewingSurvey?.theme_preset, viewingSurvey?.theme_config, viewingSurvey]);

  const visibleQuestions = useMemo(() => {
    if (!activeSurvey) return [];
    return activeSurvey.questions.filter((q: any) => {
      if (!q.parent_question_id || !q.trigger_option_id) return true;
      const parentAnswer = answers[q.parent_question_id];
      if (!parentAnswer) return false;
      return parentAnswer.selectedOptionId === q.trigger_option_id;
    });
  }, [activeSurvey, answers]);

  const isSubmissionValid = useMemo(() => {
    if (!activeSurvey) return false;
    return visibleQuestions.every((q: any) => {
      if (!q.required) return true;
      const ans = answers[q.id];
      if (!ans) return false;
      if (q.type === "TEXT" && (!ans.valueText || !ans.valueText.trim())) return false;
      if ((q.type === "RATING" || q.type === "NPS") && ans.valueNumber === undefined) return false;
      if (q.type === "SINGLE_CHOICE" || q.type === "YES_NO") {
        if (ans.selectedOptionId === undefined && !ans.valueText) return false;
      }
      if (q.type === "MULTIPLE_CHOICE") {
        try {
          const arr = JSON.parse(ans.valueText || "[]");
          if (arr.length === 0) return false;
        } catch {
          return false;
        }
      }
      return true;
    });
  }, [visibleQuestions, answers]);

  const completionRate = useMemo(() => {
    if (surveys.length === 0) return 0;
    return Math.round((completedSurveys.length / surveys.length) * 100);
  }, [surveys, completedSurveys]);

  const estTimeNeeded = useMemo(() => {
    return pendingSurveys.reduce((acc: number, s: any) => acc + (s.questions?.length || 0) * 0.4, 0);
  }, [pendingSurveys]);

  const searchedSurveys = useMemo(() => {
    const source = surveys;
    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source.filter((s: any) =>
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [surveys, searchQuery]);

  const handleOpenSurvey = (surveyId: string) => { setSelectedSurveyId(surveyId); setAnswers({}); };
  const handleCloseSurvey = () => { setSelectedSurveyId(null); setAnswers({}); };
  const handleViewResponse = (surveyId: string) => setViewingResponseSurveyId(surveyId);
  const handleAnswerChange = (questionId: number, update: Partial<AnswerInput>) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...(prev[questionId] || { questionId }), ...update } }));
  };

  const handleSubmitSurvey = async () => {
    if (!selectedSurveyId || !activeSurvey) return;
    if (!isSubmissionValid) { toast.error("Please answer all mandatory (starred) questions before submitting."); return; }
    try {
      await submitResponseMutation.mutateAsync({ surveyId: selectedSurveyId, answers: Object.values(answers) });
      toast.success("Survey submitted successfully! Thank you for your feedback.");
      handleCloseSurvey();
      refetchSurveys();
    } catch { toast.error("Failed to submit survey. Please try again."); }
  };

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-500 pb-16">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-primary/10 border border-primary-100 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Surveys</h1>
            <p className="text-muted-foreground mt-1">Participate in active surveys and help shape our workspace.</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pending Surveys", value: pendingSurveys.length, icon: ListTodo },
          { label: "Completed", value: completedSurveys.length, icon: CheckCircle },
          { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp },
          { label: "Est. Time Left", value: estTimeNeeded > 0 ? `${estTimeNeeded.toFixed(0)} min` : "0 min", icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <stat.icon className="w-5 h-5 text-primary shrink-0" />
            </div>
            <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {stat.value}
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border/70 rounded-lg px-3 py-2 shadow-sm">
          <Users className="w-3.5 h-3.5 text-primary-400" />
          <span>{surveys.length} total campaigns</span>
        </div>
      </div>

      {/* Survey table */}
      {isSurveysLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium">Loading surveys...</p>
        </div>
      ) : searchedSurveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <HelpCircle size={40} className="text-slate-200" />
          <p className="text-muted-foreground text-sm font-medium">No Surveys Found</p>
          <p className="text-muted-foreground text-xs">No surveys assigned to you or matching your search.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchedSurveys.map((survey: any) => {
                  const questionsCount = survey.questions?.length || 0;
                  const estTime = (questionsCount * 0.4).toFixed(1);
                  const response = survey.responses?.[0];
                  const submittedDate = response ? new Date(response.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
                  const isCompleted = !!response;

                  return (
                    <TableRow key={survey.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate max-w-[280px]">
                              {survey.title}
                            </div>
                            {survey.description && (
                              <div className="text-sm text-muted-foreground mt-0.5 truncate max-w-[280px]">
                                {survey.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {isCompleted ? "Completed" : "Pending"}
                        </span>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground font-normal">
                              {isCompleted && submittedDate ? `Submitted: ${submittedDate}` : `Created: ${new Date(survey.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-foreground">{questionsCount} Questions</div>
                          <div className="text-sm text-muted-foreground">Est. Time: {estTime} min</div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isCompleted ? (
                            <Button
                              onClick={() => handleOpenSurvey(survey.id)}
                              className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm border-0 cursor-pointer transition-all active:scale-95"
                            >
                              Take Survey <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleViewResponse(survey.id)}
                              variant="ghost"
                              className="text-primary-600 hover:bg-primary-50/50 text-xs font-semibold h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border-0 shadow-none hover:shadow-none"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary-500" /> View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
      )}

      {/* TAKE SURVEY MODAL */}
      {selectedSurveyId && activeSurvey && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-card rounded-lg max-w-3xl w-full max-h-[92vh] flex flex-col shadow-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
            style={{ fontFamily: activeTheme.fontFamily, borderRadius: activeTheme.borderRadius }}
          >
            {/* Survey Banner */}
            <div
              className="px-8 pt-8 pb-12 flex-shrink-0 relative"
              style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}
            >
              <button onClick={handleCloseSurvey} className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-all border-0 bg-transparent cursor-pointer z-10">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-card/15 text-white/90 border border-white/10 uppercase tracking-wider backdrop-blur-sm">Active Survey</span>
                <span className="text-[12px] text-white/60">{visibleQuestions.length} question{visibleQuestions.length !== 1 ? "s" : ""}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{activeSurvey.title}</h2>
              <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{activeSurvey.description}</p>
            </div>

            {/* Progress Section */}
            <div className="px-8 py-5 bg-muted/50 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Survey Progress</span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: activeTheme.primaryColor, backgroundColor: `${activeTheme.primaryColor}18` }}
                >
                  {Object.keys(answers).length} of {visibleQuestions.length} answered
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${visibleQuestions.length > 0 ? (Object.keys(answers).length / visibleQuestions.length) * 100 : 0}%`,
                    background: `linear-gradient(90deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}bb)`,
                  }}
                />
              </div>
            </div>

            {/* Questions */}
            <div
              className="p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin"
              style={{ background: `linear-gradient(180deg, ${activeTheme.backgroundColor}, ${activeTheme.backgroundColor}dd)` }}
            >
              {visibleQuestions.length === 0
                ? <div className="text-center py-16 text-muted-foreground text-sm">No questions match current conditions.</div>
                : visibleQuestions.map((q: any, idx: number) => {
                    const label = cleanLabel(q.label);
                    const hasEmoji = q.label.toLowerCase().includes("[emoji]");
                    const hasNumber = q.label.toLowerCase().includes("[number]");
                    const isStar = !hasEmoji && !hasNumber;
                    return (
                      <div
                        key={q.id}
                        className="bg-card border shadow-sm hover:shadow-sm transition-shadow p-6"
                        style={{ borderColor: activeTheme.borderColor, borderRadius: activeTheme.borderRadius }}
                      >
                        <div className="flex items-start gap-3 mb-5">
                          <span
                            className="text-xs font-bold text-white w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                            style={{ backgroundColor: activeTheme.primaryColor, borderRadius: `calc(${activeTheme.borderRadius} - 4px)` }}
                          >{idx + 1}</span>
                          <label className="text-sm font-semibold leading-relaxed pt-1" style={{ color: activeTheme.fontColor }}>
                            {label}{q.required && <span className="text-rose-500 ml-1">*</span>}
                          </label>
                        </div>

                        {/* RATING */}
                        {q.type === "RATING" && (
                          <div className="pl-10">
                            {hasEmoji ? (
                              <div className="flex flex-col items-center gap-4 w-full py-6 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                                <div className="flex items-center gap-6">
                                  {[
                                    { val: 1, char: "😞" }, { val: 2, char: "🙁" }, { val: 3, char: "😐" }, { val: 4, char: "🙂" }, { val: 5, char: "🤩" },
                                  ].map((emoji) => {
                                    const isSelected = answers[q.id]?.valueNumber === emoji.val;
                                    return (
                                      <button key={emoji.val} type="button" onClick={() => handleAnswerChange(q.id, { valueNumber: emoji.val })}
                                        className="transition-all hover:scale-110 duration-200 cursor-pointer border-0 bg-transparent drop-shadow-sm hover:drop-shadow-sm flex items-center justify-center"
                                        style={{ filter: isSelected ? "none" : "grayscale(80%) opacity(50%)", transform: isSelected ? "scale(1.15)" : "none" }}>
                                        <span className="text-[48px] leading-none" style={{ fontSize: "48px" }}>{emoji.char}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {answers[q.id]?.valueNumber !== undefined && (
                                  <span className="text-xs font-bold px-3 py-1 rounded-lg border" style={{ color: activeTheme.fontColor, borderColor: activeTheme.borderColor, backgroundColor: activeTheme.backgroundColor }}>
                                    {["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"][(answers[q.id].valueNumber as number) - 1]} selected
                                  </span>
                                )}
                              </div>
                            ) : hasNumber ? (
                              <div className="flex flex-col items-center gap-4 w-full py-6 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                                <div className="flex flex-nowrap items-center gap-2 w-full justify-center overflow-x-auto py-2">
                                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                                    const isSelected = answers[q.id]?.valueNumber === n;
                                    return (
                                      <button key={n} type="button" onClick={() => handleAnswerChange(q.id, { valueNumber: n })}
                                        className="w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer flex-shrink-0 flex items-center justify-center"
                                        style={{ backgroundColor: isSelected ? activeTheme.primaryColor : "transparent", borderColor: isSelected ? activeTheme.primaryColor : activeTheme.borderColor, color: isSelected ? "white" : activeTheme.fontColor }}>
                                        {n}
                                      </button>
                                    );
                                  })}
                                </div>
                                {answers[q.id]?.valueNumber !== undefined && (
                                  <span className="text-xs font-bold px-3 py-1 rounded-lg border" style={{ color: activeTheme.fontColor, borderColor: activeTheme.borderColor, backgroundColor: activeTheme.backgroundColor }}>
                                    Score: {answers[q.id].valueNumber} / 10 Selected
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-4 w-full py-4 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                                <div className="flex items-center gap-3">
                                  {[1,2,3,4,5].map(star => {
                                    const answerValue = answers[q.id]?.valueNumber;
                                    const lit = answerValue !== undefined && star <= answerValue;
                                    return (
                                      <button key={star} type="button" onClick={() => handleAnswerChange(q.id, { valueNumber: star })} className="border-0 bg-transparent cursor-pointer transition-transform hover:scale-110">
                                        <Star size={36} color={lit ? "#F59E0B" : activeTheme.borderColor} fill={lit ? "#F59E0B" : "none"} />
                                      </button>
                                    );
                                  })}
                                </div>
                                {answers[q.id]?.valueNumber !== undefined && (
                                  <span className="text-sm font-semibold" style={{ color: activeTheme.fontColor }}>{answers[q.id]?.valueNumber} / 5</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* NPS */}
                        {q.type === "NPS" && (
                          <div className="pl-10">
                            <div className="flex flex-col gap-4 w-full p-5 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                              <div className="flex flex-nowrap gap-1.5 justify-center overflow-x-auto py-2">
                                {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                                  const isSelected = answers[q.id]?.valueNumber === score;
                                  return (
                                    <button key={score} type="button" onClick={() => handleAnswerChange(q.id, { valueNumber: score })}
                                      className="w-10 h-10 rounded-lg text-sm font-bold transition-all border cursor-pointer flex-shrink-0"
                                      style={{ background: isSelected ? activeTheme.primaryColor : "transparent", color: isSelected ? "#fff" : activeTheme.fontColor, border: `2px solid ${isSelected ? activeTheme.primaryColor : "transparent"}`, borderColor: isSelected ? activeTheme.primaryColor : activeTheme.borderColor }}>
                                      {score}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[11px] font-medium opacity-50" style={{ color: activeTheme.fontColor }}>Not likely</span>
                                <span className="text-[11px] font-medium opacity-50" style={{ color: activeTheme.fontColor }}>Very likely</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TEXT */}
                        {q.type === "TEXT" && (
                          <div className="pl-10">
                            {q.label.toLowerCase().includes("[short]") || (!q.label.toLowerCase().includes("[long]") && q.label.toLowerCase().includes("short")) ? (
                              <input type="text" value={answers[q.id]?.valueText || ""} onChange={e => handleAnswerChange(q.id, { valueText: e.target.value })}
                                placeholder="Write your honest feedback here..."
                                className="w-full border rounded-lg px-4 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground font-medium"
                                style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor, color: activeTheme.fontColor }}
                              />
                            ) : (
                              <textarea value={answers[q.id]?.valueText || ""} onChange={e => handleAnswerChange(q.id, { valueText: e.target.value })}
                                placeholder="Write your honest feedback here..." rows={4}
                                className="w-full border rounded-lg px-4 py-3.5 text-sm outline-none resize-none transition-all placeholder:text-muted-foreground"
                                style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor, color: activeTheme.fontColor }}
                              />
                            )}
                          </div>
                        )}

                        {/* SINGLE_CHOICE / MULTIPLE_CHOICE / YES_NO */}
                        {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE" || q.type === "YES_NO") && (
                          <div className="pl-10">
                            {q.type === "SINGLE_CHOICE" && q.label.toLowerCase().includes("dropdown") ? (
                              <Select value={answers[q.id]?.valueText || ""} onChange={val => {
                                const opt = q.options?.find((o: any) => o.label === val);
                                handleAnswerChange(q.id, { valueText: val, selectedOptionId: opt?.id });
                              }} placeholder="Select an option..." options={(q.options || []).map((opt: any) => ({ value: opt.label, label: opt.label }))} />
                            ) : q.type === "MULTIPLE_CHOICE" ? (
                              <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                                {(q.options || []).map((opt: any) => {
                                  let currentArr: string[] = [];
                                  try { currentArr = JSON.parse(answers[q.id]?.valueText || "[]"); } catch {}
                                  const selected = currentArr.includes(opt.label);
                                  return (
                                    <button key={opt.id} type="button" onClick={() => {
                                      const next = selected ? currentArr.filter(o => o !== opt.label) : [...currentArr, opt.label];
                                      handleAnswerChange(q.id, { valueText: JSON.stringify(next) });
                                    }}
                                      className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-left text-sm transition-all border-0 cursor-pointer w-full"
                                      style={{ background: selected ? `${activeTheme.primaryColor}12` : (activeTheme.inputBackgroundColor || activeTheme.backgroundColor), border: `2px solid ${selected ? activeTheme.primaryColor : activeTheme.borderColor}`, color: selected ? activeTheme.primaryColor : activeTheme.fontColor }}>
                                      <div className="w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0" style={{ borderColor: selected ? activeTheme.primaryColor : activeTheme.borderColor, background: selected ? activeTheme.primaryColor : "transparent" }}>
                                        {selected && <CheckCircle size={11} color="#fff" />}
                                      </div>
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (q.type === "YES_NO" || q.type === "SINGLE_CHOICE") ? (
                              <div className={`grid gap-2.5 ${q.type === "YES_NO" ? "grid-cols-2 max-w-xs" : "grid-cols-1 sm:grid-cols-2"}`}>
                                {q.type === "YES_NO" && (!q.options || q.options.length === 0) ? (
                                  ["Yes", "No"].map((opt) => {
                                    const selected = answers[q.id]?.valueText === opt;
                                    return (
                                      <button key={opt} type="button" onClick={() => handleAnswerChange(q.id, { valueText: opt })}
                                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg text-center text-sm transition-all border-0 cursor-pointer w-full"
                                        style={{ background: selected ? `${activeTheme.primaryColor}12` : (activeTheme.inputBackgroundColor || activeTheme.backgroundColor), border: `2px solid ${selected ? activeTheme.primaryColor : activeTheme.borderColor}`, color: selected ? activeTheme.primaryColor : activeTheme.fontColor, fontWeight: selected ? 600 : 400 }}>
                                        {opt}
                                      </button>
                                    );
                                  })
                                ) : (
                                  (q.options || []).map((opt: any) => {
                                    const selected = answers[q.id]?.selectedOptionId === opt.id;
                                    return (
                                      <button key={opt.id} type="button" onClick={() => handleAnswerChange(q.id, { selectedOptionId: opt.id, valueText: opt.label })}
                                        className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-left text-sm transition-all border-0 cursor-pointer w-full"
                                        style={{ background: selected ? `${activeTheme.primaryColor}12` : (activeTheme.inputBackgroundColor || activeTheme.backgroundColor), border: `2px solid ${selected ? activeTheme.primaryColor : activeTheme.borderColor}`, color: selected ? activeTheme.primaryColor : activeTheme.fontColor, fontWeight: selected ? 600 : 400 }}>
                                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: selected ? activeTheme.primaryColor : activeTheme.borderColor }}>
                                          {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeTheme.primaryColor }} />}
                                        </div>
                                        {opt.label}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-border bg-card flex items-center justify-between gap-4 flex-shrink-0">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Fields marked with <span className="text-rose-500 font-medium">*</span> are required
              </span>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleCloseSurvey}
                  className="text-slate-600 border-border hover:bg-muted text-xs h-10 px-5 rounded-lg">
                  Cancel
                </Button>
                <Button
                  disabled={!isSubmissionValid || submitResponseMutation.isPending}
                  onClick={handleSubmitSurvey}
                  className="text-white text-xs h-10 px-6 rounded-lg flex items-center gap-2 shadow-sm active:scale-95 transition-all border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: activeTheme.primaryColor }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${activeTheme.primaryColor}cc`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = activeTheme.primaryColor; }}>
                  {submitResponseMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Submit Feedback
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RESPONSE MODAL */}
      {viewingResponseSurveyId && viewingSurvey && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-card rounded-lg max-w-3xl w-full max-h-[92vh] flex flex-col shadow-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
            style={{ fontFamily: viewTheme.fontFamily, borderRadius: viewTheme.borderRadius }}
          >
            {/* Banner */}
            <div
              className="px-8 pt-8 pb-12 flex-shrink-0 relative"
              style={{ background: `linear-gradient(135deg, ${viewTheme.primaryColor}, ${viewTheme.primaryColor}dd)` }}
            >
              <button onClick={() => setViewingResponseSurveyId(null)} className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-all border-0 bg-transparent cursor-pointer z-10">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-card/15 text-white/90 border border-white/10 uppercase tracking-wider backdrop-blur-sm">Response Summary</span>
                <span className="text-[12px] text-white/60">{new Date(viewingSurvey.responses?.[0]?.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{viewingSurvey.title}</h2>
              <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{viewingSurvey.description}</p>
            </div>

            {/* Answers */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin bg-gradient-to-b from-white to-slate-50/30">
              {viewingSurvey.questions.map((q: any, idx: number) => {
                const answer = viewingSurvey.responses?.[0]?.answers?.find((ans: any) => ans.questionId === q.id);
                const label = cleanLabel(q.label);
                const hasEmoji = q.label.toLowerCase().includes("[emoji]");
                const hasNumber = q.label.toLowerCase().includes("[number]");
                return (
                  <div key={q.id} className="bg-card border border-border/70 rounded-lg p-6 shadow-sm">
                    <div className="flex items-start gap-3 mb-5">
                      <span className="text-xs font-bold text-white w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm" style={{ backgroundColor: viewTheme.primaryColor }}>{idx + 1}</span>
                      <label className="text-sm font-semibold text-foreground leading-relaxed pt-1">{label}</label>
                    </div>

                    {q.type === "RATING" && (
                      <div className="pl-10">
                        {hasEmoji ? (
                          <div className="flex items-center gap-6">
                            {[
                              { val: 1, char: "😢" },
                              { val: 2, char: "🙁" },
                              { val: 3, char: "😐" },
                              { val: 4, char: "🙂" },
                              { val: 5, char: "😄" },
                            ].map((emoji) => {
                              const isSelected = answer?.valueNumber === emoji.val;
                              return (
                                <span key={emoji.val} className="text-4xl transition-all"
                                  style={{
                                    filter: isSelected ? "none" : "grayscale(60%) opacity(40%)",
                                    transform: isSelected ? "scale(1.25)" : "none",
                                  }}
                                >{emoji.char}</span>
                              );
                            })}
                          </div>
                        ) : hasNumber ? (
                          <div className="flex flex-wrap gap-2">
                            {[1,2,3,4,5,6,7,8,9,10].map(n => {
                              const isSelected = answer?.valueNumber === n;
                              return (
                                <span key={n} className="w-10 h-10 rounded-lg text-sm font-bold border-2 flex items-center justify-center"
                                  style={{
                                    backgroundColor: isSelected ? viewTheme.primaryColor : "white",
                                    borderColor: isSelected ? viewTheme.primaryColor : "#E2E8F0",
                                    color: isSelected ? "white" : "#1E293B",
                                  }}
                                >{n}</span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {[1,2,3,4,5].map(star => {
                              const lit = answer?.valueNumber !== undefined && star <= answer.valueNumber;
                              return <Star key={star} className={`w-8 h-8 ${lit ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />;
                            })}
                          </div>
                        )}
                        {answer?.valueNumber !== undefined && (
                          <span className="text-xs text-muted-foreground ml-2 font-medium">({answer.valueNumber}/5)</span>
                        )}
                      </div>
                    )}

                    {q.type === "TEXT" && (
                      <div className="pl-10">
                        <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-foreground leading-relaxed border-l-4" style={{ borderLeftColor: viewTheme.primaryColor }}>
                          {answer?.valueText || <span className="text-muted-foreground italic">No response provided.</span>}
                        </div>
                      </div>
                    )}

                    {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE" || q.type === "YES_NO") && (
                      <div className={`pl-10 grid gap-2.5 ${q.type === "YES_NO" ? "grid-cols-2 max-w-xs" : "grid-cols-1 sm:grid-cols-2"}`}>
                        {q.options.map((opt: any) => {
                          const selected = q.type === "MULTIPLE_CHOICE"
                            ? ((JSON.parse(answer?.valueText || "[]") as string[]) ?? []).includes(opt.label)
                            : answer?.selectedOptionId === opt.id;
                          return (
                            <div key={opt.id} className="px-4 py-3.5 rounded-lg text-sm border-2 font-medium" style={{
                              backgroundColor: selected ? `${viewTheme.primaryColor}12` : "white",
                              borderColor: selected ? viewTheme.primaryColor : "#E2E8F0",
                              color: selected ? viewTheme.primaryColor : "#94A3B8",
                              fontWeight: selected ? 600 : 500,
                              boxShadow: selected ? `0 0 0 1px ${viewTheme.primaryColor}40` : "none",
                            }}>
                              {opt.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-border bg-card flex justify-end flex-shrink-0">
              <Button onClick={() => setViewingResponseSurveyId(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-10 px-6 rounded-lg border-0 cursor-pointer">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

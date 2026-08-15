import { useState, useEffect } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useSurvey, useUpdateSurvey } from "../api/surveyApi";
import { CheckCircle2, Star, RotateCcw, Loader2, FileText, X, ArrowLeft, Award, Palette, Save, ThumbsUp, ThumbsDown, Settings } from "lucide-react";
import { toast } from "sonner";
import Select from "@/shared/components/ui/Select";

interface AnswerMap {
  [questionId: number]: string | string[] | number;
}

const THEME_PRESETS = [
  { name: "Shopify Modern", primaryColor: "#008060", backgroundColor: "#F6F6F7", inputBackgroundColor: "#FFFFFF", fontColor: "#202223", borderColor: "#E1E3E5", borderRadius: "8px", fontFamily: "Inter" },
  { name: "Stripe Minimal", primaryColor: "#635BFF", backgroundColor: "#FFFFFF", inputBackgroundColor: "#F8FAFC", fontColor: "#1A1F36", borderColor: "#E3E8EE", borderRadius: "4px", fontFamily: "Inter" },
  { name: "Notion Dark", primaryColor: "#2F3437", backgroundColor: "#191919", inputBackgroundColor: "#2D3139", fontColor: "#FFFFFF", borderColor: "#2D3139", borderRadius: "6px", fontFamily: "monospace" },
  { name: "Slack Vibrant", primaryColor: "#4A154B", backgroundColor: "#F8F8F8", inputBackgroundColor: "#FFFFFF", fontColor: "#1D1C1D", borderColor: "#E0E0E0", borderRadius: "12px", fontFamily: "system-ui" },
  { name: "Spotify Bold", primaryColor: "#1DB954", backgroundColor: "#191414", inputBackgroundColor: "#282828", fontColor: "#FFFFFF", borderColor: "#282828", borderRadius: "24px", fontFamily: "Arial" },
  { name: "Linear Clean", primaryColor: "#5E6AD2", backgroundColor: "#F7F8FA", inputBackgroundColor: "#FFFFFF", fontColor: "#111111", borderColor: "#E2E8F0", borderRadius: "8px", fontFamily: "Inter" },
];

export default function PreviewViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const { data: survey, isLoading } = useSurvey(id);
  const updateSurveyMutation = useUpdateSurvey();
  const cleanLabel = (text: string) => text ? text.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "") : "";

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [done, setDone] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [activeTab, setActiveTab] = useState<"styling" | "branding">("styling");
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [theme, setTheme] = useState({
    name: "Linear Clean",
    primaryColor: "#4F46E5",
    backgroundColor: "#FFFFFF",
    inputBackgroundColor: "#F8FAFC",
    fontColor: "#1E293B",
    borderColor: "#E2E8F0",
    borderRadius: "16px",
    fontFamily: "Inter",
  });

  useEffect(() => {
    if (survey) {
      if (survey.theme_config) {
        try {
          const parsed = JSON.parse(survey.theme_config);
          setTheme((prev) => ({ ...prev, ...parsed }));
        } catch { /* ignore */ }
      } else if (survey.theme_preset) {
        const preset = THEME_PRESETS.find(t => t.name === survey.theme_preset);
        if (preset) {
          setTheme(preset);
        }
      }
    }
  }, [survey]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!survey) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Survey not found.</p>
      </div>
    );
  }

  const questions = survey.questions || [];

  function isQuestionVisible(qIdx: number): boolean {
    const q = questions[qIdx];
    if (!q || !q.parent_question_id) return true;
    const parentQ = questions.find((pq: any) => pq.id === q.parent_question_id);
    if (!parentQ) return true;
    const parentAnswer = answers[parentQ.id];
    if (parentAnswer === undefined) return false;
    if (!q.trigger_option_id) return true;
    const triggerOpt = (parentQ.options || []).find((o: any) => o.id === q.trigger_option_id);
    if (!triggerOpt) return false;
    return Array.isArray(parentAnswer) ? parentAnswer.includes(triggerOpt.label) : parentAnswer === triggerOpt.label;
  }

  function resetSurvey() {
    setAnswers({});
    setDone(false);
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 min-h-screen bg-muted/50">
        <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-primary/10">
          <FileText size={28} className="text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base text-foreground">No questions to preview</p>
          <p className="text-muted-foreground text-xs mt-1">Add questions in the builder first.</p>
        </div>
        <button
          onClick={() => navigate(`/surveys/admin`)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/95 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  function autoFillAllQuestions() {
    const newAnswers: AnswerMap = {};
    questions.forEach((q: any) => {
      let autoVal: any = "";
      if (q.type === "YES_NO") {
        autoVal = Math.random() > 0.5 ? "Yes" : "No";
      } else if (q.type === "RATING") {
        autoVal = Math.floor(Math.random() * 5) + 1;
      } else if (q.type === "NPS") {
        autoVal = Math.floor(Math.random() * 11);
      } else if (q.type === "SINGLE_CHOICE") {
        const opts = q.options || [];
        if (opts.length > 0) {
          autoVal = opts[Math.floor(Math.random() * opts.length)].label;
        } else {
          autoVal = "Yes";
        }
      } else if (q.type === "MULTIPLE_CHOICE") {
        const opts = q.options || [];
        if (opts.length > 0) {
          autoVal = [opts[Math.floor(Math.random() * opts.length)].label];
        } else {
          autoVal = ["Option 1"];
        }
      } else if (q.type === "TEXT") {
        autoVal = "Autofilled testing response.";
      }
      newAnswers[q.id] = autoVal;
    });
    setAnswers(newAnswers);
  }

  async function handleSaveTheme() {
    if (!id) return;
    try {
      const isPreset = THEME_PRESETS.some(p => p.name === theme.name);
      if (isPreset) {
        await updateSurveyMutation.mutateAsync({ id, data: { theme_preset: theme.name, theme_config: null, title: survey.title } });
      } else {
        await updateSurveyMutation.mutateAsync({ id, data: { theme_preset: "Custom", theme_config: JSON.stringify(theme), title: survey.title } });
      }
      toast.success("Theme saved!");
    } catch {
      toast.error("Failed to save theme");
    }
  }

  const visibleQuestions = questions.filter((_: any, i: number) => isQuestionVisible(i));

  const Q_TYPE_LABELS_LOCAL: Record<string, string> = {
    TEXT: "Text Questions",
    SINGLE_CHOICE: "Multiple Choice",
    MULTIPLE_CHOICE: "Checkboxes",
    RATING: "Ratings",
    YES_NO: "Yes/No Options",
    NPS: "NPS Scale",
  };

  if (done) {
    return (
      <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans text-foreground w-full overflow-y-auto">
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/surveys/admin`)}
                className="icon-circle-btn"
                title="Back"
              >
                <ArrowLeft />
              </button>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30">
                  Preview Complete
                </span>
                <h1 className="text-xl font-bold text-foreground mt-1">Responses Review</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetSurvey}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold bg-muted text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-0 cursor-pointer shadow-sm"
              >
                <RotateCcw size={12} /> Restart
              </button>
              <button
                type="button"
                onClick={() => navigate(`/surveys/admin/preview/${id}`)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary-100 transition-all border-0 cursor-pointer shadow-sm"
              >
                <Settings size={12} /> Settings
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-lg border border-border/80 shadow-sm overflow-hidden">
              <div className="h-40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 relative flex items-end p-6">
                <div className="w-20 h-20 rounded-full bg-card p-1 shadow-sm translate-y-12 shrink-0 border border-border">
                  <div className="w-full h-full rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                    <CheckCircle2 size={36} />
                  </div>
                </div>
              </div>
              <div className="p-8 pt-16">
                <h2 className="font-extrabold text-2xl text-foreground">All done!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium mt-2">
                  You have reviewed all questions and provided responses for this survey preview.
                </p>

                <div className="space-y-4 max-h-[400px] overflow-y-auto mt-8 pt-6 border-t border-border pr-1">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 text-left">Your Responses</h3>
                  {visibleQuestions.map((q: any) => {
                    const ans = answers[q.id];
                    if (ans === undefined) return null;
                    return (
                      <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/50 rounded-lg border border-border text-left gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary-100/30 dark:border-primary-800/30 uppercase tracking-wider">
                            {Q_TYPE_LABELS_LOCAL[q.type] || q.type}
                          </span>
                          <p className="text-xs font-bold text-foreground mt-1">{cleanLabel(q.label)}</p>
                        </div>
                        <span className="text-xs font-semibold bg-card border border-border px-3.5 py-2 rounded-lg text-foreground max-w-[240px] truncate text-left sm:text-right">
                          {Array.isArray(ans) ? ans.join(", ") : String(ans)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans text-foreground w-full overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/surveys/admin`)}
              className="icon-circle-btn"
              title="Back"
            >
              <ArrowLeft />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md border border-primary-100 dark:border-primary-800">
                  <Award size={10} /> Survey View
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-100/50 dark:border-primary-900/30 uppercase tracking-wider">Preview</span>
              </div>
              <h1 className="text-xl font-bold text-foreground mt-0.5">{survey.title || "Untitled Survey"}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowThemePanel(!showThemePanel)}
              className={`${showThemePanel ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" : "bg-muted border-border text-muted-foreground"} h-10 px-4 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-1.5 border cursor-pointer text-xs`}
            >
              <Palette size={13} />
              {showThemePanel ? "Hide Theme" : "Theme"}
            </button>
            <button
              onClick={() => navigate(`/surveys/admin/preview/${id}`)}
              className="h-10 px-4 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-1.5 border cursor-pointer text-xs bg-muted text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-border"
            >
              <Settings size={13} /> Settings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Main viewport */}
            <div className="flex-1 w-full max-w-4xl mx-auto">
            <div
              className="overflow-hidden border shadow-sm shadow-slate-100/50"
              style={{
                borderColor: theme.borderColor,
                borderRadius: theme.borderRadius === "9999px" ? "24px" : theme.borderRadius,
                fontFamily: theme.fontFamily === "monospace" ? "Courier New, monospace" : theme.fontFamily,
              }}
            >
              {/* Browser chrome */}
              <div className="bg-muted/50 border-b border-border px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-card border border-border px-3 py-1 rounded-full">
                  Respondent Preview
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={autoFillAllQuestions}
                    className="text-[9px] font-bold text-primary-500 bg-primary/10 hover:bg-primary-100 dark:hover:bg-primary-900/30 px-2 py-1 rounded-lg border border-primary-100 dark:border-primary-800 transition-colors cursor-pointer"
                  >
                    Auto Fill
                  </button>
                </div>
              </div>

              {/* Viewport */}
              <div
                className="p-8 md:p-12 space-y-10 min-h-[460px] transition-all duration-300"
                style={{
                  backgroundColor: theme.backgroundColor,
                  color: theme.fontColor,
                  fontFamily: theme.fontFamily === "monospace" ? "Courier New, monospace" : theme.fontFamily,
                }}
              >
                {/* Brand header */}
                {showLogo && (
                  <div className="flex justify-start items-center pb-4 border-b animate-fade-in transition-all duration-300" style={{ borderColor: `${theme.borderColor}50` }}>
                    <div className="flex items-center gap-2">
                      {logoImage ? (
                        <img src={logoImage} alt="Brand Logo" className="w-7 h-7 object-contain rounded-lg" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs tracking-wider" style={{ backgroundColor: theme.primaryColor }}>
                          XP
                        </div>
                      )}
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: theme.fontColor }}>
                        {survey.title || "Enterprise"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress */}
                {(() => {
                  const answeredCount = visibleQuestions.filter((q: any) => {
                    const a = answers[q.id];
                    return a !== undefined && a !== null && a !== "";
                  }).length;
                  const pct = visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0;
                  return (
                    <div className="space-y-2 pb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: theme.fontColor }}>
                          {answeredCount} of {visibleQuestions.length} answered
                        </span>
                        <span className="text-xs font-bold" style={{ color: theme.primaryColor }}>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.borderColor}60` }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: theme.primaryColor }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Questions */}
                {visibleQuestions.map((q: any, idx: number) => {
                  const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "";
                  return (
                    <div key={q.id}
                      className="rounded-lg p-6 transition-all duration-300 border"
                      style={{
                        backgroundColor: theme.backgroundColor,
                        borderColor: isAnswered ? `${theme.primaryColor}25` : `${theme.borderColor}70`,
                        boxShadow: isAnswered ? `0 0 0 1px ${theme.primaryColor}10` : "none",
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{
                            color: theme.primaryColor,
                            backgroundColor: `${theme.primaryColor}12`,
                          }}>
                            Q{idx + 1}
                          </span>
                          {q.required && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-sm">*Required</span>
                          )}
                        </div>
                        {isAnswered ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={13} /> Answered
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium" style={{ color: `${theme.fontColor}40` }}>Pending</span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold leading-relaxed mb-5" style={{ color: theme.fontColor }}>
                        {cleanLabel(q.label) || "Untitled question"}
                      </h2>

                      <div className="space-y-4">
                        {/* Text input */}
                        {q.type === "TEXT" && (
                          (q.label.toLowerCase().includes("[short]") || (!q.label.toLowerCase().includes("[long]") && q.label.toLowerCase().includes("short"))) ? (
                            <input
                              type="text"
                              placeholder="Type your answer here..."
                              value={(answers[q.id] as string) ?? ""}
                              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                              className="w-full px-4 py-3.5 text-sm outline-none focus:bg-card focus:ring-4 focus:ring-opacity-10 transition-all font-medium border"
                              style={{
                                backgroundColor: theme.inputBackgroundColor || theme.backgroundColor,
                                borderRadius: theme.borderRadius,
                                borderColor: theme.borderColor,
                                color: theme.fontColor,
                                fontFamily: "inherit",
                              }}
                            />
                          ) : (
                            <textarea
                              rows={5}
                              placeholder="Type your answer here..."
                              value={(answers[q.id] as string) ?? ""}
                              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                              className="w-full px-4 py-3.5 text-sm outline-none resize-none focus:bg-card focus:ring-4 focus:ring-opacity-10 transition-all font-medium border"
                              style={{
                                backgroundColor: theme.inputBackgroundColor || theme.backgroundColor,
                                borderRadius: theme.borderRadius,
                                borderColor: theme.borderColor,
                                color: theme.fontColor,
                                fontFamily: "inherit",
                              }}
                            />
                          )
                        )}

                        {/* Single Choice */}
                        {q.type === "SINGLE_CHOICE" && (
                          q.label.toLowerCase().includes("dropdown") ? (
                            <Select
                              value={(answers[q.id] as string) ?? ""}
                              onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                              placeholder="Select an option..."
                              options={(q.options || []).map((opt: any) => ({ value: opt.label, label: opt.label }))}
                            />
                          ) : (
                            <div className="flex flex-col gap-3 w-full">
                              {(q.options || []).map((opt: any) => {
                                const isSelected = answers[q.id] === opt.label;
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => setAnswers({ ...answers, [q.id]: opt.label })}
                                    className="flex items-center gap-3 px-5 py-4 text-left transition-all text-sm cursor-pointer border-0 w-full"
                                    style={{
                                      background: isSelected ? `${theme.primaryColor}12` : `${theme.primaryColor}03`,
                                      border: `2px solid ${isSelected ? theme.primaryColor : theme.borderColor}`,
                                      color: isSelected ? theme.primaryColor : theme.fontColor,
                                      fontWeight: isSelected ? 600 : 500,
                                      borderRadius: theme.borderRadius,
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    <div
                                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-solid"
                                      style={{
                                        borderColor: isSelected ? theme.primaryColor : theme.borderColor,
                                        background: isSelected ? `${theme.primaryColor}10` : "#fff"
                                      }}
                                    >
                                      {isSelected && (
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                                      )}
                                    </div>
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          )
                        )}

                        {/* Multiple Choice */}
                        {q.type === "MULTIPLE_CHOICE" && (
                          <div className="flex flex-col gap-3 w-full">
                            {(q.options || []).map((opt: any) => {
                              const selected = ((answers[q.id] as string[]) ?? []).includes(opt.label);
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    const prev = (answers[q.id] as string[]) ?? [];
                                    const next = selected ? prev.filter((o) => o !== opt.label) : [...prev, opt.label];
                                    setAnswers({ ...answers, [q.id]: next });
                                  }}
                                  className="flex items-center gap-3 px-5 py-4 text-left text-sm transition-all cursor-pointer border-0 w-full"
                                  style={{
                                    background: selected ? `${theme.primaryColor}12` : `${theme.primaryColor}03`,
                                    border: `2px solid ${selected ? theme.primaryColor : theme.borderColor}`,
                                    color: selected ? theme.primaryColor : theme.fontColor,
                                    fontWeight: selected ? 600 : 500,
                                    borderRadius: theme.borderRadius,
                                    fontFamily: "inherit",
                                  }}
                                >
                                  <div
                                    className="w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 border-solid"
                                    style={{
                                      borderColor: selected ? theme.primaryColor : theme.borderColor,
                                      background: selected ? theme.primaryColor : "#fff"
                                    }}
                                  >
                                    {selected && <CheckCircle2 size={11} color="#fff" />}
                                  </div>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Yes/No */}
                        {q.type === "YES_NO" && (
                          q.label.toLowerCase().includes("thumbs") ? (
                            <div className="flex gap-4 w-full justify-center py-4 border rounded-lg" style={{ borderColor: theme.borderColor, borderRadius: theme.borderRadius, backgroundColor: theme.inputBackgroundColor || theme.backgroundColor }}>
                              {[
                                { label: "Thumbs Up", icon: ThumbsUp, color: "#10B981" },
                                { label: "Thumbs Down", icon: ThumbsDown, color: "#EF4444" }
                              ].map((opt) => {
                                const isSelected = answers[q.id] === opt.label;
                                const IconComp = opt.icon;
                                return (
                                  <button
                                    key={opt.label}
                                    onClick={() => setAnswers({ ...answers, [q.id]: opt.label })}
                                    className="flex flex-col items-center justify-center p-6 w-28 h-28 border-2 transition-all duration-300 cursor-pointer bg-card"
                                    style={{
                                      borderColor: isSelected ? opt.color : theme.borderColor,
                                      borderRadius: theme.borderRadius,
                                      color: isSelected ? opt.color : "#94A3B8",
                                      transform: isSelected ? "scale(1.08)" : "none",
                                      boxShadow: isSelected ? `0 8px 30px ${opt.color}15` : "none",
                                    }}
                                  >
                                    <IconComp size={36} className="transition-transform duration-300" style={{ transform: isSelected ? "scale(1.15)" : "none" }} />
                                    <span className="text-xs font-semibold mt-2.5 text-muted-foreground">{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex gap-4 w-full">
                              {["Yes", "No"].map((opt) => {
                                const isSelected = answers[q.id] === opt;
                                return (
                                  <button
                                    key={opt}
                                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold transition-all cursor-pointer border-0"
                                    style={{
                                      background: isSelected ? `${theme.primaryColor}12` : `${theme.primaryColor}03`,
                                      border: `2px solid ${isSelected ? theme.primaryColor : theme.borderColor}`,
                                      color: isSelected ? theme.primaryColor : theme.fontColor,
                                      borderRadius: theme.borderRadius,
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          )
                        )}

                        {/* Rating */}
                        {q.type === "RATING" && (
                          q.label.toLowerCase().includes("emoji") ? (
                            <div
                              className="flex flex-col items-center justify-center gap-4 w-full py-6 border transition-all duration-300"
                              style={{
                                backgroundColor: theme.inputBackgroundColor || theme.backgroundColor,
                                borderColor: theme.borderColor,
                                borderRadius: theme.borderRadius,
                              }}
                            >
                              <div className="flex items-center gap-6">
                                {[
                                  { val: 1, char: "😞" },
                                  { val: 2, char: "🙁" },
                                  { val: 3, char: "😐" },
                                  { val: 4, char: "🙂" },
                                  { val: 5, char: "🤩" },
                                ].map((emoji) => {
                                  const isSelected = answers[q.id] === emoji.val;
                                  return (
                                    <button
                                      key={emoji.val}
                                      onClick={() => setAnswers({ ...answers, [q.id]: emoji.val })}
                                      className="transition-all hover:scale-110 duration-200 cursor-pointer border-0 bg-transparent"
                                      style={{
                                        filter: isSelected ? "none" : "grayscale(80%) opacity(50%)",
                                        transform: isSelected ? "scale(1.15)" : "none",
                                      }}
                                    >
                                      <span className="text-[48px] leading-none">{emoji.char}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {answers[q.id] && (
                                <span className="text-xs font-bold px-3 py-1 rounded-lg border" style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                                  {["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"][(answers[q.id] as number) - 1]} selected
                                </span>
                              )}
                            </div>
                          ) : q.label.toLowerCase().includes("number") ? (
                            <div
                              className="flex flex-col items-center justify-center gap-4 w-full py-6 border transition-all duration-300"
                              style={{
                                backgroundColor: theme.inputBackgroundColor || theme.backgroundColor,
                                borderColor: theme.borderColor,
                                borderRadius: theme.borderRadius,
                              }}
                            >
                              <div className="flex flex-nowrap items-center justify-center gap-2 w-full overflow-x-auto py-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                  const isSelected = answers[q.id] === num;
                                  return (
                                    <button
                                      key={num}
                                      onClick={() => setAnswers({ ...answers, [q.id]: num })}
                                      className="w-10 h-10 text-xs font-bold transition-all border cursor-pointer flex items-center justify-center"
                                      style={{
                                        background: isSelected ? theme.primaryColor : `${theme.primaryColor}05`,
                                        borderColor: isSelected ? theme.primaryColor : theme.borderColor,
                                        color: isSelected ? "#fff" : theme.fontColor,
                                        borderRadius: theme.borderRadius === "9999px" ? "9999px" : "10px",
                                      }}
                                    >
                                      {num}
                                    </button>
                                  );
                                })}
                              </div>
                              {answers[q.id] && (
                                <span className="text-xs font-bold px-3 py-1 rounded-lg border" style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                                  Score: {answers[q.id]} / 10 Selected
                                </span>
                              )}
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center gap-3 w-full py-4 border transition-all duration-300"
                              style={{
                                backgroundColor: theme.inputBackgroundColor || theme.backgroundColor,
                                borderColor: theme.borderColor,
                                borderRadius: theme.borderRadius,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setAnswers({ ...answers, [q.id]: star })}
                                    className="transition-transform hover:scale-110 cursor-pointer border-0 bg-transparent"
                                  >
                                    <Star
                                      size={38}
                                      color={(answers[q.id] as number) >= star ? "#F59E0B" : theme.borderColor}
                                      fill={(answers[q.id] as number) >= star ? "#F59E0B" : "none"}
                                    />
                                  </button>
                                ))}
                              </div>
                              {answers[q.id] && (
                                <span className="text-xs font-bold px-3 py-1 rounded-lg border" style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                                  {answers[q.id]} / 5 Stars Selected
                                </span>
                              )}
                            </div>
                          )
                        )}

                        {/* NPS */}
                        {q.type === "NPS" && (
                          <div
                            className="flex flex-col gap-3 w-full p-5 border transition-all duration-300"
                            style={{
                              backgroundColor: theme.inputBackgroundColor || theme.backgroundColor,
                              borderColor: theme.borderColor,
                              borderRadius: theme.borderRadius,
                            }}
                          >
                            <div className="flex flex-nowrap gap-1.5 justify-center overflow-x-auto py-2">
                              {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                                const isSelected = answers[q.id] === score;
                                return (
                                  <button
                                    key={score}
                                    onClick={() => setAnswers({ ...answers, [q.id]: score })}
                                    className="w-10 h-10 text-xs font-bold transition-all cursor-pointer border-0 shadow-sm"
                                    style={{
                                      background: isSelected ? theme.primaryColor : `${theme.primaryColor}03`,
                                      color: isSelected ? "#fff" : theme.fontColor,
                                      border: `2px solid ${isSelected ? theme.primaryColor : theme.borderColor}`,
                                      borderRadius: theme.borderRadius === "9999px" ? "9999px" : "12px",
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    {score}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex justify-between px-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ color: theme.fontColor }}>Not likely</span>
                              <span className="text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ color: theme.fontColor }}>Very likely</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Submit bar */}
                {(() => {
                  const answeredCount = visibleQuestions.filter((q: any) => {
                    const a = answers[q.id];
                    return a !== undefined && a !== null && a !== "";
                  }).length;
                  return (
                    <div className="sticky bottom-0 z-10 -mx-8 -mb-8 px-8 pb-8 pt-6" style={{
                      background: `linear-gradient(to top, ${theme.backgroundColor} 70%, transparent)`,
                    }}>
                      <div className="flex items-center justify-between p-4 rounded-lg border shadow-sm" style={{
                        backgroundColor: theme.backgroundColor,
                        borderColor: theme.borderColor,
                      }}>
                        <span className="text-xs font-medium" style={{ color: theme.fontColor }}>
                          <span className="font-bold">{answeredCount}</span> of {visibleQuestions.length} answered
                        </span>
                        <button
                          onClick={() => setDone(true)}
                          className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold text-white transition-all border-0 shadow-sm hover:opacity-90 active:scale-[0.97]"
                          style={{
                            backgroundColor: theme.primaryColor,
                            color: "#fff",
                            borderRadius: theme.borderRadius,
                            boxShadow: `0 8px 16px -3px ${theme.primaryColor}30`,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Submit Preview
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Theme editor sidebar */}
          {showThemePanel && (
            <div className="w-80 shrink-0 space-y-6">
              <div className="bg-muted p-1 rounded-lg border border-border flex gap-1 shadow-inner">
                <button
                  onClick={() => setActiveTab("styling")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "styling"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-transparent"
                  }`}
                >
                  <Palette size={13} /> Styling
                </button>
                <button
                  onClick={() => setActiveTab("branding")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "branding"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-transparent"
                  }`}
                >
                  <Award size={13} /> Branding
                </button>
              </div>

              <div className="bg-card rounded-lg border border-border/80 shadow-sm shadow-slate-100/50 p-5 space-y-5">
                {activeTab === "styling" ? (
                  <>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Quick Themes</span>
                      <div className="grid grid-cols-2 gap-2">
                        {THEME_PRESETS.map((preset) => {
                          const isSelected = theme.name === preset.name;
                          return (
                            <button
                              key={preset.name}
                              onClick={() => setTheme(preset)}
                              className={`flex items-center gap-2 p-2.5 bg-muted/50 hover:bg-muted/50 rounded-lg transition-all cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-300 text-left w-full ${isSelected ? "border-0 shadow-sm" : "border border-border"}`}
                              style={isSelected ? {
                                borderColor: theme.primaryColor,
                                boxShadow: `0 0 0 1px ${theme.primaryColor}20`,
                              } : undefined}
                            >
                              <div className="flex gap-0.5 shrink-0">
                                <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: preset.primaryColor }} />
                                <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: preset.backgroundColor }} />
                              </div>
                              <span className="truncate">{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Custom Colors</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Primary</label>
                          <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                            <input type="color" value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, name: "Custom", primaryColor: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0" />
                            <input type="text" value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, name: "Custom", primaryColor: e.target.value })} className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 dark:text-slate-300 uppercase" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Background</label>
                          <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                            <input type="color" value={theme.backgroundColor} onChange={(e) => setTheme({ ...theme, name: "Custom", backgroundColor: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0" />
                            <input type="text" value={theme.backgroundColor} onChange={(e) => setTheme({ ...theme, name: "Custom", backgroundColor: e.target.value })} className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 dark:text-slate-300 uppercase" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Font Color</label>
                          <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                            <input type="color" value={theme.fontColor} onChange={(e) => setTheme({ ...theme, name: "Custom", fontColor: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0" />
                            <input type="text" value={theme.fontColor} onChange={(e) => setTheme({ ...theme, name: "Custom", fontColor: e.target.value })} className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 dark:text-slate-300 uppercase" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Border</label>
                          <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                            <input type="color" value={theme.borderColor} onChange={(e) => setTheme({ ...theme, name: "Custom", borderColor: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0" />
                            <input type="text" value={theme.borderColor} onChange={(e) => setTheme({ ...theme, name: "Custom", borderColor: e.target.value })} className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 dark:text-slate-300 uppercase" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Input Bg</label>
                          <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                            <input type="color" value={theme.inputBackgroundColor || "#F8FAFC"} onChange={(e) => setTheme({ ...theme, name: "Custom", inputBackgroundColor: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0" />
                            <input type="text" value={theme.inputBackgroundColor || "#F8FAFC"} onChange={(e) => setTheme({ ...theme, name: "Custom", inputBackgroundColor: e.target.value })} className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 dark:text-slate-300 uppercase" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Corner Style</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: "Flat", value: "0px" },
                          { label: "Subtle", value: "4px" },
                          { label: "Slightly", value: "8px" },
                          { label: "Moderate", value: "12px" },
                          { label: "Rounded", value: "16px" },
                          { label: "Full", value: "9999px" },
                        ].map((rad) => {
                          const isSelected = theme.borderRadius === rad.value;
                          return (
                            <button
                              key={rad.value}
                              onClick={() => setTheme({ ...theme, name: "Custom", borderRadius: rad.value })}
                              className={`py-1.5 px-2.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${isSelected ? "text-white" : "bg-muted text-muted-foreground border-border"}`}
                              style={isSelected ? {
                                backgroundColor: theme.primaryColor,
                                borderColor: theme.primaryColor,
                              } : undefined}
                            >
                              {rad.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Font Family</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: "Arial", value: "Arial" },
                          { label: "Inter", value: "Inter" },
                          { label: "Georgia", value: "Georgia" },
                          { label: "Courier", value: "monospace" },
                          { label: "System UI", value: "system-ui" },
                        ].map((f) => {
                          const isSelected = theme.fontFamily === f.value;
                          return (
                            <button
                              key={f.value}
                              onClick={() => setTheme({ ...theme, name: "Custom", fontFamily: f.value })}
                              className={`py-1.5 px-2.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${isSelected ? "text-white" : "bg-muted text-muted-foreground border-border"}`}
                              style={isSelected ? {
                                backgroundColor: theme.primaryColor,
                                borderColor: theme.primaryColor,
                                fontFamily: f.value === "monospace" ? "Courier New, monospace" : f.value,
                              } : {
                                fontFamily: f.value === "monospace" ? "Courier New, monospace" : f.value,
                              }}
                            >
                              {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <label className="text-xs font-bold text-foreground block">Show brand logo</label>
                        <span className="text-[10px] text-muted-foreground">Display header logo block</span>
                      </div>
                      <button
                        onClick={() => setShowLogo(!showLogo)}
                        className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer border-0 ${showLogo ? "" : "bg-muted border border-border"}`}
                        style={showLogo ? { background: theme.primaryColor } : undefined}
                      >
                        <div
                          className="w-4 h-4 rounded-full bg-card absolute top-1 transition-transform"
                          style={{ transform: showLogo ? "translateX(20px)" : "translateX(4px)" }}
                        />
                      </button>
                    </div>

                    {showLogo && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Upload Logo</span>
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border hover:border-slate-300 dark:hover:border-slate-600 bg-muted/50 hover:bg-muted transition-colors rounded-lg cursor-pointer text-center group">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-foreground">
                              {logoImage ? "Change Logo" : "Choose Logo File"}
                            </span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">PNG, JPG, SVG</span>
                            <input type="file" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setLogoImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }} className="hidden" />
                          </label>
                          {logoImage && (
                            <button onClick={() => setLogoImage(null)} className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-0">
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={handleSaveTheme}
                  disabled={updateSurveyMutation.isPending}
                  className="w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all border-0 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Save size={12} /> {updateSurveyMutation.isPending ? "Saving..." : "Save Theme"}
                </button>

                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Answered:</span>
                    <span className="font-bold text-foreground">{Object.keys(answers).length} / {questions.length}</span>
                  </div>
                  <button
                    onClick={resetSurvey}
                    className="w-full py-2.5 rounded-lg text-xs font-bold text-muted-foreground bg-muted hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-0 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <RotateCcw size={12} /> Restart Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

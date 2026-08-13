import { useState, useEffect } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useSurvey, useUpdateSurvey } from "../api/surveyApi";
import { CheckCircle2, Star, RotateCcw, Loader2, FileText, X, ArrowLeft, ClipboardList, Play, Activity, Info, Settings, Zap, Check, AlertCircle, Palette, Award, Save, ThumbsUp, ThumbsDown } from "lucide-react";
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

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const { data: survey, isLoading } = useSurvey(id);
  const updateSurveyMutation = useUpdateSurvey();
  const cleanLabel = (text: string) => text ? text.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "") : "";

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [done, setDone] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(true);
  const [bypassValidation, setBypassValidation] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [activeTab, setActiveTab] = useState<"styling" | "branding">("styling");
  const [brandUrl, setBrandUrl] = useState("mycompany.com");
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
  return triggerOpt ? parentAnswer === triggerOpt.label : false;
}

  function resetSurvey() {
    setStarted(false);
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

  const typeCounts = questions.reduce((acc: Record<string, number>, q: any) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  const Q_TYPE_LABELS_LOCAL: Record<string, string> = {
    TEXT: "Text Questions",
    SINGLE_CHOICE: "Multiple Choice",
    MULTIPLE_CHOICE: "Checkboxes",
    RATING: "Ratings",
    YES_NO: "Yes/No Options",
    NPS: "NPS Scale",
  };

  // Dynamic predictive diagnostic formulas
  const totalSeconds = questions.reduce((acc: number, q: any) => {
    if (q.type === "TEXT") return acc + 30;
    if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") return acc + 10;
    if (q.type === "YES_NO") return acc + 5;
    if (q.type === "RATING" || q.type === "NPS") return acc + 8;
    return acc + 10;
  }, 0);
  const estMins = Math.max(1, Math.ceil(totalSeconds / 60));

  const textCount = typeCounts["TEXT"] || 0;
  const reqCount = questions.filter((q: any) => q.required).length;

  // Expected Completion Rate: Start at 99%, drop off based on length, required fields, and text inputs
  const rawCompletion = 99 - (questions.length * 1.2) - (textCount * 2.5) - (reqCount * 0.8);
  const completionRate = Math.max(50, Math.min(99, Math.round(rawCompletion)));

  // Cognitive Fatigue Risk: based on quantity and density of text inputs
  const fatigueScore = Math.min(100, Math.round((questions.length * 3.5) + (textCount * 14)));
  let fatigueLevel = "Low";
  let fatigueColor = "text-emerald-600";
  let fatigueBg = "bg-emerald-500";
  if (fatigueScore >= 35 && fatigueScore < 70) {
    fatigueLevel = "Medium";
    fatigueColor = "text-amber-500";
    fatigueBg = "bg-amber-500";
  } else if (fatigueScore >= 70) {
    fatigueLevel = "High";
    fatigueColor = "text-rose-500";
    fatigueBg = "bg-rose-500";
  }

  // Engagement Score
  const uniqueTypes = Object.keys(typeCounts).length;
  let engagementLevel = "High";
  if (uniqueTypes >= 3 && fatigueScore < 50) {
    engagementLevel = "Very High";
  } else if (uniqueTypes <= 1 || fatigueScore >= 75) {
    engagementLevel = "Medium";
  }

  // Start screen
  if (!started) {
    return (
      <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans text-foreground w-full overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="icon-circle-btn animate-in fade-in duration-200"
                title="Back"
              >
                <ArrowLeft />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 border border-primary-100/50 dark:border-primary-900/30">
                    Preview Environment
                  </span>
                </div>
                <h1 className="text-xl font-bold text-foreground mt-1">Preview Survey</h1>
              </div>
            </div>
          </div>

          {/* Content area: Two Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full animate-in fade-in duration-300">
            
            {/* Left Column (Main Card + Questions Timeline) */}
            <div className="lg:col-span-2 space-y-6 w-full">
              {/* Survey Header & Details */}
              <div className="bg-card rounded-lg border border-border/80 shadow-sm overflow-hidden">
                {/* Banner Header */}
                <div className="h-40 bg-primary relative flex items-end p-6">
                  <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-card/20 backdrop-blur-md text-white border border-white/10">
                    Preview Mode
                  </div>
                  
                  {/* Icon Overlay */}
                  <div className="w-20 h-20 rounded-lg bg-card p-1 shadow-sm translate-y-12 shrink-0 border border-border">
                    <div className="w-full h-full rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary-100">
                      <ClipboardList size={32} />
                    </div>
                  </div>
                </div>
                
                <div className="p-8 pt-16 space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                      {survey.title || "Untitled Survey"}
                    </h2>
                    {survey.description ? (
                      <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                        {survey.description}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm italic font-medium">
                        No description provided for this survey.
                      </p>
                    )}
                  </div>

                  {/* Survey Metadata Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-border">
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Created On</span>
                      <span className="text-xs font-bold text-foreground">{survey.created_at ? new Date(survey.created_at).toLocaleDateString() : "Just now"}</span>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Questions</span>
                      <span className="text-xs font-bold text-foreground">{questions.length} Fields</span>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Flow Mode</span>
                      <span className="text-xs font-bold text-foreground capitalize">{survey.mode || "linear"}</span>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Responses</span>
                      <span className="text-xs font-bold text-foreground">0 (Pre-production)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Predictive Analytics & Respondent Journey Map Card */}
              <div className="bg-card rounded-lg border border-border/80 shadow-sm p-6 space-y-6">
                <h3 className="text-sm font-bold text-foreground pb-3 border-b border-border uppercase tracking-wider">
                  Predictive Analytics & Respondent Journey
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Visual Journey Map */}
                  <div className="space-y-4">
                    <h4 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Respondent Journey Flow</h4>
                    <div className="relative pl-6 border-l-2 border-primary-100 space-y-5">
                      <div className="relative">
                        <div className="absolute -left-8 top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                        <p className="text-xs font-bold text-foreground">Survey Initiation</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Standard entry screen with instructions.</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-8 top-0.5 w-4 h-4 rounded-full bg-cyan-500 border-4 border-white shadow-sm" />
                        <p className="text-xs font-bold text-foreground">Core Questionnaire ({questions.length} questions)</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Core survey options, text feedback, and choice controls.</p>
                      </div>
                      {survey.mode === "conditional" ? (
                        <div className="relative">
                          <div className="absolute -left-8 top-0.5 w-4 h-4 rounded-full bg-violet-500 border-4 border-white shadow-sm" />
                          <p className="text-xs font-bold text-foreground">Conditional Branches Activated</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Subsequent questions load dynamically based on active rules.</p>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="absolute -left-8 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                          <p className="text-xs font-bold text-foreground">Linear progression flow</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Consistent step-by-step traversal for all participants.</p>
                        </div>
                      )}
                      <div className="relative">
                        <div className="absolute -left-8 top-0.5 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm" />
                        <p className="text-xs font-bold text-foreground">Completion & Verification</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Answers summarized, validation resolved, and submit logs generated.</p>
                      </div>
                    </div>
                  </div>

                  {/* Cognitive Load & Insights */}
                  <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-border">
                    <h4 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Predictive Diagnostics</h4>
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                          <span>Expected Completion Rate</span>
                          <span className="text-emerald-600">{completionRate}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                          <span>Cognitive Fatigue Risk</span>
                          <span className={fatigueColor}>{fatigueLevel}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${fatigueBg} rounded-full transition-all duration-500`} style={{ width: `${fatigueScore}%` }} />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-3 text-center">
                        <div className="p-2.5 bg-card rounded-lg border border-border shadow-sm">
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Est. Time</span>
                          <span className="text-xs font-extrabold text-foreground">~{estMins} min</span>
                        </div>
                        <div className="p-2.5 bg-card rounded-lg border border-border shadow-sm">
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Engagement</span>
                          <span className="text-xs font-extrabold text-foreground">{engagementLevel}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Configuration & Actions */}
            <div className="space-y-6">
              
              {/* Play/Control panel */}
              <div className="bg-card rounded-lg border border-border/80 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Test Controller
                  </h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                </div>

                {/* Status information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-primary-500 shrink-0 shadow-sm">
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Testing State</p>
                      <p className="text-xs font-bold text-foreground">Ready to Initialize</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-primary-500 shrink-0 shadow-sm">
                      <Settings size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Flow Engine</p>
                      <p className="text-xs font-bold text-foreground capitalize">{survey.mode || "linear"} Branching</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStarted(true)}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/95 active:scale-98 transition-all flex items-center justify-center gap-2 border-0 cursor-pointer shadow-sm shadow-primary-100 hover:shadow-primary-200"
                >
                  Start Survey Test <Play size={14} className="fill-white" />
                </button>
              </div>

              {/* Developer Testing Settings (Mocks & Switches) */}
              <div className="bg-card rounded-lg border border-border/80 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground pb-2 border-b border-border uppercase tracking-wider">
                  Dev Console Configurations
                </h3>
                
                <div className="space-y-4 pt-1">
                  {/* Theme Customizer Switch */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground block">Theme Customizer</label>
                      <span className="text-[10px] text-muted-foreground">Shows live styling & branding editor</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowThemePanel(!showThemePanel)}
                      className="w-10 h-6 rounded-full transition-colors relative cursor-pointer border-0"
                      style={{ background: showThemePanel ? "#4F46E5" : "#E2E8F0" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-card absolute top-1 transition-transform"
                        style={{ transform: showThemePanel ? "translateX(20px)" : "translateX(4px)" }}
                      />
                    </button>
                  </div>

                  {/* Bypass Validation Switch */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground block">Bypass Required Fields</label>
                      <span className="text-[10px] text-muted-foreground">Allows skipping required questions</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBypassValidation(!bypassValidation)}
                      className="w-10 h-6 rounded-full transition-colors relative cursor-pointer border-0"
                      style={{ background: bypassValidation ? "#4F46E5" : "#E2E8F0" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-card absolute top-1 transition-transform"
                        style={{ transform: bypassValidation ? "translateX(20px)" : "translateX(4px)" }}
                      />
                    </button>
                  </div>

                </div>
              </div>

              {/* Test Guidelines */}
              <div className="bg-card rounded-lg border border-border/80 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground pb-3 border-b border-border uppercase tracking-wider flex items-center gap-2">
                  <Info size={16} className="text-primary-500" /> Guidelines
                </h3>
                <ul className="space-y-3.5">
                  <li className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                      1
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                      This is a preview environment. Responses submitted here will not be recorded in database analytics.
                    </p>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                      2
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                      Conditional logic skips or reveals questions live based on your choices.
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Done screen
  if (done) {
    return (
      <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans text-foreground w-full overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="icon-circle-btn"
                title="Back"
              >
                <ArrowLeft />
              </button>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30">
                  Verification Success
                </span>
                <h1 className="text-xl font-bold text-foreground mt-1">Preview Completed</h1>
              </div>
            </div>
          </div>

          {/* Content area: Two Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full animate-in fade-in duration-300">
            
            {/* Left Column: Success Message & Answers Summary Report */}
            <div className="lg:col-span-2 space-y-6 w-full">
              <div className="bg-card rounded-lg border border-border/80 shadow-sm overflow-hidden">
                <div className="h-40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 relative flex items-end p-6">
                  {/* Icon Overlay */}
                  <div className="w-20 h-20 rounded-full bg-card p-1 shadow-sm translate-y-12 shrink-0 border border-border">
                    <div className="w-full h-full rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 size={36} />
                    </div>
                  </div>
                </div>
                
                <div className="p-8 pt-16">
                  <div className="space-y-3">
                    <h2 className="font-extrabold text-2xl text-foreground">All done!</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                      Thank you for completing the survey preview. You have verified all conditional logic, triggers, options, and validations successfully.
                    </p>
                  </div>

                  {/* Live answers summary report */}
                  <div className="space-y-4 max-h-[350px] overflow-y-auto mt-8 pt-6 border-t border-border pr-1">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 text-left">Your Test Responses</h3>
                    {questions.map((q: any) => {
                      const ans = answers[q.id];
                      if (ans === undefined) return null;
                      return (
                        <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/50 rounded-lg border border-border text-left gap-4 hover:border-slate-350 transition-colors">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary-100/30 uppercase tracking-wider">
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

                  <div className="flex items-center gap-3 pt-6 mt-8 border-t border-border w-full">
                    <button
                      type="button"
                      onClick={resetSurvey}
                      className="flex items-center gap-1.5 h-10 px-5 rounded-xl text-xs font-semibold bg-muted text-slate-600 hover:bg-slate-205 transition-all border-0 cursor-pointer shadow-sm hover:shadow active:scale-95"
                    >
                      <RotateCcw size={14} /> Restart Test
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/surveys/admin/publish/${id}`)}
                      className="flex items-center gap-1.5 h-10 px-6 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/95 transition-all border-0 cursor-pointer shadow-sm shadow-primary-100 hover:shadow-primary-200 active:scale-95"
                    >
                      <CheckCircle2 size={14} /> Publish Survey
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border/80 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground pb-3 border-b border-border uppercase tracking-wider">
                  Next Steps
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed font-medium">
                    If the flow looks good, proceed to <strong className="text-primary font-semibold">Publish Survey</strong> to configure scheduling and target audience controls.
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed font-medium">
                    You can still return to the survey builder to add more questions or modify logic triggers.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  const visibleQuestions = questions.filter((_: any, i: number) => isQuestionVisible(i));

  return (
    <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans text-foreground w-full overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="icon-circle-btn"
              title="Back"
            >
              <ArrowLeft />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] text-primary-650 dark:text-primary-400 font-bold tracking-wider uppercase">
                <Award size={13} />
                <span>EmpXP Survey previewer</span>
              </div>
              <h1 className="text-xl font-bold text-foreground mt-0.5 flex items-center gap-2">
                <span>{survey.title || "Untitled Survey"}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 border border-primary-100 text-primary font-medium">Previewing</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowThemePanel(!showThemePanel)}
              className="h-10 px-4 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 border cursor-pointer text-xs"
              style={{
                background: showThemePanel ? "#EEF2FF" : "#F8FAFC",
                borderColor: showThemePanel ? "#C7D2FE" : "#E2E8F0",
                color: showThemePanel ? "#4338CA" : "#475569"
              }}
            >
              <Settings size={14} className={showThemePanel ? "animate-spin" : ""} style={{ animationDuration: "3s" }} />
              {showThemePanel ? "Hide Theme Editor" : "Show Theme Editor"}
            </button>

            <button
              onClick={() => navigate(-1)}
              className="h-10 px-4 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 border bg-red-50 hover:bg-red-100 text-red-600 border-red-100 hover:border-red-200 cursor-pointer text-xs"
            >
              <X size={14} /> Exit Preview
            </button>
          </div>
        </div>

      {/* Content area: Split screen workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Side: Respondent Experience Mockup Viewport */}
        <div className={showThemePanel ? "lg:col-span-8 xl:col-span-9 space-y-6 w-full" : "lg:col-span-12 space-y-6 w-full"}>
          <div 
            className="overflow-hidden w-full transition-all duration-300 border shadow-sm shadow-slate-100/50"
            style={{
              borderColor: theme.borderColor,
              borderRadius: theme.borderRadius === "9999px" ? "24px" : theme.borderRadius,
              fontFamily: theme.fontFamily === "monospace" ? "Courier New, monospace" : theme.fontFamily,
            }}
          >
            {/* Device Browser Header */}
            <div className="bg-muted/50 border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-card border border-border px-3 py-1 rounded-full">
                Respondent Preview Viewport
              </span>
            </div>

            {/* Viewport content */}
            <div 
              className="survey-viewport-content p-8 md:p-12 space-y-10 min-h-[460px] transition-all duration-300"
              style={{
                backgroundColor: theme.backgroundColor,
                color: theme.fontColor,
                fontFamily: theme.fontFamily === "monospace" ? "Courier New, monospace" : theme.fontFamily,
              }}
            >
              
              {/* Optional brand logo header */}
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
              
              {/* Overall progress */}
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

              {/* Question cards */}
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
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-sm">*Required</span>
                      )}
                    </div>
                    {isAnswered ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#10B981" }}>
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

                  {/* MCQ / Single Choice */}
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

                  {/* Checkbox / Multiple Choice */}
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
                                className="transition-all hover:scale-110 duration-200 cursor-pointer border-0 bg-transparent drop-shadow-sm hover:drop-shadow-sm flex items-center justify-center"
                                style={{
                                  filter: isSelected ? "none" : "grayscale(80%) opacity(50%)",
                                  transform: isSelected ? "scale(1.15)" : "none",
                                }}
                              >
                                <span className="text-[48px] leading-none" style={{ fontSize: "48px" }}>
                                  {emoji.char}
                                </span>
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
                      className="flex flex-col gap-3 w-full p-5 border transition-all duration-300 rounded-lg"
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

          {/* Sticky submit bar */}
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

        {/* Right Side: Live Theme Customizer Sidebar Panel */}
        {showThemePanel && (
          <div className="lg:col-span-4 xl:col-span-3 space-y-6 w-full shrink-0">
            {/* Customizer Tabs Header */}
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

            {/* Theme Customizer Card */}
            <div className="bg-card rounded-lg border border-border/80 shadow-sm shadow-slate-100/50 p-5 space-y-5">
              {activeTab === "styling" ? (
                <>
                  {/* Presets Grid */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Quick Themes</span>
                    <div className="grid grid-cols-2 gap-2">
                      {THEME_PRESETS.map((preset) => {
                        const isSelected = theme.name === preset.name;
                        return (
                          <button
                            key={preset.name}
                            onClick={() => setTheme(preset)}
                            className="flex items-center gap-2 p-2.5 bg-muted/50 border hover:bg-muted/50 rounded-lg transition-all cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-400 text-left w-full"
                            style={{
                              borderColor: isSelected ? theme.primaryColor : "#E2E8F0",
                              boxShadow: isSelected ? `0 0 0 1px ${theme.primaryColor}20` : "none",
                            }}
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

                  {/* Custom Colors */}
                  <div className="space-y-3 pt-3 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Custom Colors</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Primary Color</label>
                        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                          <input 
                            type="color" 
                            value={theme.primaryColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", primaryColor: e.target.value })}
                            className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0"
                          />
                          <input 
                            type="text" 
                            value={theme.primaryColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", primaryColor: e.target.value })}
                            className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Background</label>
                        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                          <input 
                            type="color" 
                            value={theme.backgroundColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", backgroundColor: e.target.value })}
                            className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0"
                          />
                          <input 
                            type="text" 
                            value={theme.backgroundColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", backgroundColor: e.target.value })}
                            className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Font Color</label>
                        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                          <input 
                            type="color" 
                            value={theme.fontColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", fontColor: e.target.value })}
                            className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0"
                          />
                          <input 
                            type="text" 
                            value={theme.fontColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", fontColor: e.target.value })}
                            className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Border Color</label>
                        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                          <input 
                            type="color" 
                            value={theme.borderColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", borderColor: e.target.value })}
                            className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0"
                          />
                          <input 
                            type="text" 
                            value={theme.borderColor} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", borderColor: e.target.value })}
                            className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Input Bg Color</label>
                        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1.5 rounded-lg">
                          <input 
                            type="color" 
                            value={theme.inputBackgroundColor || "#F8FAFC"} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", inputBackgroundColor: e.target.value })}
                            className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0"
                          />
                          <input 
                            type="text" 
                            value={theme.inputBackgroundColor || "#F8FAFC"} 
                            onChange={(e) => setTheme({ ...theme, name: "Custom", inputBackgroundColor: e.target.value })}
                            className="bg-transparent border-0 outline-none text-[10px] font-mono w-full text-slate-600 uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corner Style (Border Radius) */}
                  <div className="space-y-2 pt-3 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Corner Style</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "Flat", value: "0px" },
                        { label: "Subtle", value: "4px" },
                        { label: "Slightly", value: "8px" },
                        { label: "Moderate", value: "12px" },
                        { label: "Rounded", value: "16px" },
                        { label: "Fully Rounded", value: "9999px" },
                      ].map((rad) => {
                        const isSelected = theme.borderRadius === rad.value;
                        return (
                          <button
                            key={rad.value}
                            onClick={() => setTheme({ ...theme, name: "Custom", borderRadius: rad.value })}
                            className="py-1.5 px-2.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? theme.primaryColor : "#F8FAFC",
                              borderColor: isSelected ? theme.primaryColor : "#E2E8F0",
                              color: isSelected ? "#fff" : "#475569",
                            }}
                          >
                            {rad.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div className="space-y-2 pt-3 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Font Family</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "Arial", value: "Arial" },
                        { label: "Inter", value: "Inter" },
                        { label: "Georgia (Serif)", value: "Georgia" },
                        { label: "Courier (Mono)", value: "monospace" },
                        { label: "System UI", value: "system-ui" },
                      ].map((f) => {
                        const isSelected = theme.fontFamily === f.value;
                        return (
                          <button
                            key={f.value}
                            onClick={() => setTheme({ ...theme, name: "Custom", fontFamily: f.value })}
                            className="py-1.5 px-2.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? theme.primaryColor : "#F8FAFC",
                              borderColor: isSelected ? theme.primaryColor : "#E2E8F0",
                              color: isSelected ? "#fff" : "#475569",
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
                  {/* Branding Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <label className="text-xs font-bold text-foreground block">Show brand logo</label>
                      <span className="text-[10px] text-muted-foreground">Display header logo block</span>
                    </div>
                    <button
                      onClick={() => setShowLogo(!showLogo)}
                      className="w-10 h-6 rounded-full transition-colors relative cursor-pointer border-0"
                      style={{ background: showLogo ? theme.primaryColor : "#E2E8F0" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-card absolute top-1 transition-transform"
                        style={{ transform: showLogo ? "translateX(20px)" : "translateX(4px)" }}
                      />
                    </button>
                  </div>

                  {/* Logo Upload & Preview */}
                  {showLogo && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Upload Logo Image</span>
                        <div className="flex gap-2 items-center">
                          <label className="flex-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-border hover:border-slate-350 bg-muted/50 hover:bg-muted transition-colors rounded-lg cursor-pointer text-center group">
                            <span className="text-[11px] font-bold text-slate-600 group-hover:text-foreground">
                              {logoImage ? "Change Logo Image" : "Choose Logo File"}
                            </span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">PNG, JPG, SVG supported</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setLogoImage(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                              className="hidden" 
                            />
                          </label>
                          
                          {logoImage && (
                            <button
                              onClick={() => setLogoImage(null)}
                              className="px-3.5 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-750 font-bold text-xs border-0 transition-colors cursor-pointer shrink-0"
                              title="Clear uploaded logo"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Logo Preview</span>
                        <div className="p-4 bg-muted/50 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3">
                          {logoImage ? (
                            <img src={logoImage} alt="Uploaded logo preview" className="max-h-16 max-w-[120px] object-contain rounded-lg shadow-sm" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-black text-base shadow-sm" style={{ backgroundColor: theme.primaryColor }}>
                              XP
                            </div>
                          )}
                          <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest bg-card border border-border px-2 py-0.5 rounded-full">
                            {logoImage ? "Custom Uploaded Logo" : "Default Initials Logo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Save Theme */}
              <button
                onClick={handleSaveTheme}
                disabled={updateSurveyMutation.isPending}
                className="w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all border-0 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Save size={12} /> {updateSurveyMutation.isPending ? "Saving..." : "Save Theme"}
              </button>

              {/* Reset Session & Validation controls */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Answers Saved:</span>
                  <span className="font-bold text-foreground">{Object.keys(answers).length} / {questions.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Bypass validations:</span>
                  <button
                    onClick={() => setBypassValidation(!bypassValidation)}
                    className="text-[9px] font-bold uppercase bg-muted hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-border cursor-pointer"
                  >
                    {bypassValidation ? "Active" : "Strict"}
                  </button>
                </div>

                <button
                  onClick={resetSurvey}
                  className="w-full py-2.5 rounded-lg text-xs font-bold text-muted-foreground bg-muted hover:bg-slate-200 transition-all border-0 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
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
  );
}

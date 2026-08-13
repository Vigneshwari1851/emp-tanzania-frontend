import { useState, useEffect, useMemo } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadPublicSurvey, submitPublicResponse } from "../api/publicSurveyApi";
import { ChevronRight, CheckCircle2, Star, Loader2, FileText, AlertCircle, Lock, LogIn, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/shared/context/AuthContext";
import Select from "@/shared/components/ui/Select";

const THEME_PRESETS = [
  { name: "Shopify Modern", primaryColor: "#008060", backgroundColor: "#F6F6F7", inputBackgroundColor: "#FFFFFF", fontColor: "#202223", borderColor: "#E1E3E5", borderRadius: "8px", fontFamily: "Inter" },
  { name: "Stripe Minimal", primaryColor: "#635BFF", backgroundColor: "#FFFFFF", inputBackgroundColor: "#F8FAFC", fontColor: "#1A1F36", borderColor: "#E3E8EE", borderRadius: "4px", fontFamily: "Inter" },
  { name: "Notion Dark", primaryColor: "#2F3437", backgroundColor: "#191919", inputBackgroundColor: "#2D3139", fontColor: "#FFFFFF", borderColor: "#2D3139", borderRadius: "6px", fontFamily: "monospace" },
  { name: "Slack Vibrant", primaryColor: "#4A154B", backgroundColor: "#F8F8F8", inputBackgroundColor: "#FFFFFF", fontColor: "#1D1C1D", borderColor: "#E0E0E0", borderRadius: "12px", fontFamily: "system-ui" },
  { name: "Spotify Bold", primaryColor: "#1DB954", backgroundColor: "#191414", inputBackgroundColor: "#282828", fontColor: "#FFFFFF", borderColor: "#282828", borderRadius: "24px", fontFamily: "Arial" },
  { name: "Linear Clean", primaryColor: "#5E6AD2", backgroundColor: "#F7F8FA", inputBackgroundColor: "#FFFFFF", fontColor: "#111111", borderColor: "#E2E8F0", borderRadius: "8px", fontFamily: "Inter" },
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

interface AnswerMap {
  [questionId: number]: string | string[] | number;
}

export default function TakeSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const { isAuthenticated } = useAuth();
  const cleanLabel = (text: string) => text ? text.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "") : "";
  const { data: survey, isLoading } = useQuery({
    queryKey: ["public-survey", id],
    queryFn: () => loadPublicSurvey(id!),
    enabled: !!id,
  });

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);

  const activeTheme = useMemo(() => {
    if (survey?.theme_config) {
      try {
        return { ...DEFAULT_THEME, ...JSON.parse(survey.theme_config) };
      } catch { /* fall through to preset or default */ }
    }
    if (survey?.theme_preset) {
      const preset = THEME_PRESETS.find(t => t.name === survey.theme_preset);
      if (preset) return preset;
    }
    return DEFAULT_THEME;
  }, [survey?.theme_preset, survey?.theme_config]);

  const needsPassword = survey?.access === "password" && survey?.survey_password && !passwordUnlocked;

  useEffect(() => {
    if (survey && !survey.is_active) {
      setError("This survey is currently closed.");
    } else if (survey && survey.access === "private" && !isAuthenticated) {
      setError("login_required");
    } else {
      setError("");
    }
  }, [survey, isAuthenticated]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{ color: activeTheme.primaryColor }} /></div>;
  }

  if (!survey) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Survey not found.</p>
      </div>
    );
  }

  // Private survey requires login — show login prompt
  if (error === "login_required") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-muted/50">
        <div className="rounded-lg overflow-hidden w-full max-w-[440px] shadow-sm" style={{ backgroundColor: activeTheme.backgroundColor, border: `1px solid ${activeTheme.borderColor}` }}>
          <div className="h-1" style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}cc)` }} />
          <div className="p-8 flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}>
              <Lock size={26} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold" style={{ color: activeTheme.fontColor }}>{survey.title}</h1>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: activeTheme.fontColor }}>This is a private survey. Please log in with your employee account to participate.</p>
            </div>
            <button
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
              style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}
            >
              <LogIn size={16} />
              Log In to Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-muted/50">
        <div className="rounded-lg p-8 text-center w-full max-w-[520px] shadow-sm" style={{ backgroundColor: activeTheme.backgroundColor, border: `1px solid ${activeTheme.borderColor}` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="font-bold text-[22px]" style={{ color: activeTheme.fontColor }}>Survey Unavailable</h2>
          <p className="text-sm mt-2" style={{ color: activeTheme.fontColor }}>{error}</p>
        </div>
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
    console.log('[TakeSurvey] visibility check:', {
      childId: q.id, childLabel: q.label?.slice(0, 30),
      parentId: parentQ.id, parentAnswer,
      triggerOptId: q.trigger_option_id,
      triggerOptFound: !!triggerOpt,
      triggerOptLabel: triggerOpt?.label,
      match: triggerOpt ? parentAnswer === triggerOpt.label : 'N/A'
    });
    return triggerOpt ? parentAnswer === triggerOpt.label : false;
  }

  async function handleSubmit() {
    if (!id) return;
    setSubmitting(true);
    try {
      const payload = {
        surveyId: id,
        answers: Object.entries(answers).map(([qId, value]) => {
          const q = questions.find((q: any) => String(q.id) === qId);
          const questionId = Number(qId);
          if (q?.type === "RATING" || q?.type === "NPS") {
            return { questionId, valueNumber: value as number };
          }
          if (q?.type === "MULTIPLE_CHOICE") {
            return { questionId, valueText: JSON.stringify(value) };
          }
          if (q?.type === "SINGLE_CHOICE" || q?.type === "YES_NO") {
            const opt = q.options?.find((o: any) => o.label === value);
            return { questionId, valueText: value as string, selectedOptionId: opt?.id };
          }
          return { questionId, valueText: value as string };
        }),
      };
      await submitPublicResponse(id, payload.answers);
      setDone(true);
    } catch {
      toast.error("Failed to submit survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetSurvey() {
    setStarted(false);
    setAnswers({});
    setDone(false);
  }

  const visibleQuestions = questions.filter((_: any, i: number) => isQuestionVisible(i));

  // Password gate
  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-6 bg-muted/50">
        <div className="rounded-lg overflow-hidden w-full max-w-[440px] shadow-sm" style={{ backgroundColor: activeTheme.backgroundColor, border: `1px solid ${activeTheme.borderColor}` }}>
          <div className="h-1" style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}cc)` }} />
          <div className="p-8 flex flex-col gap-5">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto" style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}>
              <Lock size={26} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold" style={{ color: activeTheme.fontColor }}>This survey is protected</h1>
              <p className="text-sm mt-1" style={{ color: activeTheme.fontColor }}>Enter the password to continue.</p>
            </div>
            <input
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { if (passwordInput === survey.survey_password) { setPasswordUnlocked(true); } else { setPasswordError("Incorrect password."); } } }}
              type="password"
              placeholder="Enter survey password..."
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none bg-muted/80 border border-border/70 text-foreground"
              style={{ borderColor: activeTheme.borderColor }}
            />
            {passwordError && <p className="text-red-500 text-xs -mt-2">{passwordError}</p>}
            <button
              onClick={() => { if (passwordInput === survey.survey_password) { setPasswordUnlocked(true); } else { setPasswordError("Incorrect password."); } }}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}
            >
              Unlock Survey
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-6 bg-muted/50">
        <div className="rounded-lg overflow-hidden w-full max-w-5xl shadow-sm" style={{ backgroundColor: activeTheme.backgroundColor, border: `1px solid ${activeTheme.borderColor}` }}>
          <div className="h-1" style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}cc)` }} />
          <div className="p-8 flex flex-col gap-5">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}>
              <FileText size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight leading-tight" style={{ color: activeTheme.fontColor }}>
                {survey.title || "Untitled Survey"}
              </h1>
              {survey.description && (
                <p className="text-sm mt-2 leading-relaxed" style={{ color: activeTheme.fontColor }}>{survey.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4 py-4 border-t border-b" style={{ borderColor: activeTheme.borderColor }}>
              <div className="text-center">
                <p className="font-bold text-xl" style={{ color: activeTheme.fontColor }}>{questions.length}</p>
                <p className="text-xs" style={{ color: activeTheme.fontColor }}>Questions</p>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: activeTheme.borderColor }} />
              <div className="text-center">
                <p className="font-bold text-xl" style={{ color: activeTheme.fontColor }}>~{Math.max(1, Math.ceil(questions.length * 0.5))} min</p>
                <p className="text-xs" style={{ color: activeTheme.fontColor }}>Est. time</p>
              </div>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)` }}
            >
              Start Survey <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done / Thank you screen
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-muted/50 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[80px]" style={{ backgroundColor: activeTheme.primaryColor }} />

        <div className="animate-in fade-in zoom-in-95 duration-700 rounded-[28px] p-10 text-center w-full max-w-md shadow-sm relative overflow-hidden" style={{ backgroundColor: activeTheme.backgroundColor, border: `1px solid ${activeTheme.borderColor}` }}>
          {/* Top glowing bar */}
          <div className="absolute top-0 left-0 w-full h-2" style={{ background: `linear-gradient(90deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}88)` }} />
          
          <div className="relative z-10">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-[8px]" style={{ backgroundColor: `${activeTheme.primaryColor}15`, borderColor: `${activeTheme.primaryColor}10` }}>
              <div className="animate-bounce mt-2">
                <CheckCircle2 size={48} style={{ color: activeTheme.primaryColor }} />
              </div>
            </div>
            
            <h2 className="font-extrabold text-3xl tracking-tight mb-3" style={{ color: activeTheme.fontColor }}>
              Awesome! 🎉
            </h2>
            
            <p className="text-[15px] font-medium leading-relaxed opacity-80 max-w-[280px] mx-auto mb-2" style={{ color: activeTheme.fontColor }}>
              Thank you for sharing your feedback. Your response has been securely recorded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  return (
    <div className="min-h-screen py-12 px-6 bg-muted/50">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Overall progress */}
        {(() => {
          const answeredCount = visibleQuestions.filter((q: any) => {
            const a = answers[q.id];
            return a !== undefined && a !== null && a !== "";
          }).length;
          const pct = visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0;
          return (
            <div className="rounded-lg p-5 shadow-sm border" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.backgroundColor }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: activeTheme.fontColor }}>
                  {answeredCount} of {visibleQuestions.length} answered
                </span>
                <span className="text-xs font-bold" style={{ color: activeTheme.primaryColor }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${activeTheme.primaryColor}15` }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: activeTheme.primaryColor }} />
              </div>
            </div>
          );
        })()}

        {/* Question cards */}
        {visibleQuestions.map((q: any, idx: number) => {
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "";
          return (
            <div key={q.id} className="rounded-lg p-6 shadow-sm border transition-all duration-300"
              style={{
                borderColor: isAnswered ? `${activeTheme.primaryColor}25` : activeTheme.borderColor,
                backgroundColor: activeTheme.backgroundColor,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{
                    color: activeTheme.primaryColor,
                    backgroundColor: `${activeTheme.primaryColor}12`,
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
                  <span className="text-[11px] font-medium" style={{ color: `${activeTheme.fontColor}40` }}>Pending</span>
                )}
              </div>

              <h2 className="text-lg font-bold leading-relaxed mb-5" style={{ color: activeTheme.fontColor }}>
                {cleanLabel(q.label) || "Untitled question"}
              </h2>

              <div className="space-y-4">
              {q.type === "TEXT" && (
                (q.label.toLowerCase().includes("[short]") || (!q.label.toLowerCase().includes("[long]") && q.label.toLowerCase().includes("short"))) ? (
                  <input
                    type="text"
                    placeholder="Type your answer here..."
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-lg text-sm outline-none transition-all font-medium border"
                    style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor, color: activeTheme.fontColor }}
                  />
                ) : (
                  <textarea
                    rows={4}
                    placeholder="Type your answer here..."
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none transition-all border"
                    style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor, color: activeTheme.fontColor }}
                  />
                )
              )}

              {q.type === "SINGLE_CHOICE" && (
                q.label.toLowerCase().includes("dropdown") ? (
                  <Select
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                    placeholder="Select an option..."
                    options={(q.options || []).map((opt: any) => ({ value: opt.label, label: opt.label }))}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {(q.options || []).map((opt: any) => {
                      const isOptSelected = answers[q.id] === opt.label;
                      return (
                        <button key={opt.id} onClick={() => setAnswers({ ...answers, [q.id]: opt.label })}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all text-sm border-0 cursor-pointer w-full"
                          style={{
                            background: isOptSelected ? `${activeTheme.primaryColor}12` : `${activeTheme.backgroundColor}`,
                            border: `2px solid ${isOptSelected ? activeTheme.primaryColor : activeTheme.borderColor}`,
                            color: isOptSelected ? activeTheme.primaryColor : activeTheme.fontColor,
                            fontWeight: isOptSelected ? 600 : 400,
                          }}
                        >
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: isOptSelected ? activeTheme.primaryColor : activeTheme.borderColor }}>
                            {isOptSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeTheme.primaryColor }} />}
                          </div>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {q.type === "MULTIPLE_CHOICE" && (
                <div className="flex flex-col gap-2">
                  {(q.options || []).map((opt: any) => {
                    const selected = ((answers[q.id] as string[]) ?? []).includes(opt.label);
                    return (
                      <button key={opt.id} onClick={() => { const prev = (answers[q.id] as string[]) ?? []; const next = selected ? prev.filter((o) => o !== opt.label) : [...prev, opt.label]; setAnswers({ ...answers, [q.id]: next }); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all border-0 cursor-pointer w-full"
                        style={{
                          background: selected ? `${activeTheme.primaryColor}12` : `${activeTheme.backgroundColor}`,
                          border: `2px solid ${selected ? activeTheme.primaryColor : activeTheme.borderColor}`,
                          color: selected ? activeTheme.primaryColor : activeTheme.fontColor,
                        }}
                      >
                        <div className="w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0" style={{ borderColor: selected ? activeTheme.primaryColor : activeTheme.borderColor, background: selected ? activeTheme.primaryColor : "transparent" }}>
                          {selected && <CheckCircle2 size={11} color="#fff" />}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "YES_NO" && (
                q.label.toLowerCase().includes("thumbs") ? (
                  <div className="flex gap-4 w-full justify-center py-4 rounded-lg border" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                    {[
                      { label: "Thumbs Up", icon: ThumbsUp, color: "#10B981" },
                      { label: "Thumbs Down", icon: ThumbsDown, color: "#EF4444" }
                    ].map((opt) => {
                      const isOptSelected = answers[q.id] === opt.label;
                      const IconComp = opt.icon;
                      return (
                        <button key={opt.label} onClick={() => setAnswers({ ...answers, [q.id]: opt.label })}
                          className="flex flex-col items-center justify-center p-6 w-28 h-28 border-2 transition-all duration-300 cursor-pointer rounded-lg"
                          style={{
                            borderColor: isOptSelected ? opt.color : activeTheme.borderColor,
                            color: isOptSelected ? opt.color : "#94A3B8",
                            transform: isOptSelected ? "scale(1.08)" : "none",
                            boxShadow: isOptSelected ? `0 8px 30px ${opt.color}15` : "none",
                          }}
                        >
                          <IconComp size={36} className="transition-transform duration-300" style={{ transform: isOptSelected ? "scale(1.15)" : "none" }} />
                          <span className="text-xs font-semibold mt-2.5" style={{ color: activeTheme.fontColor }}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {["Yes", "No"].map((opt) => {
                      const isOptSelected = answers[q.id] === opt;
                      return (
                        <button key={opt} onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm transition-all border-0 cursor-pointer"
                          style={{
                            background: isOptSelected ? `${activeTheme.primaryColor}12` : `${activeTheme.backgroundColor}`,
                            border: `2px solid ${isOptSelected ? activeTheme.primaryColor : activeTheme.borderColor}`,
                            color: isOptSelected ? activeTheme.primaryColor : activeTheme.fontColor,
                            fontWeight: isOptSelected ? 600 : 400,
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {q.type === "RATING" && (
                q.label.toLowerCase().includes("emoji") ? (
                  <div className="flex flex-col items-center justify-center gap-4 w-full py-6 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                    <div className="flex items-center gap-6">
                      {[
                        { val: 1, char: "😞" }, { val: 2, char: "🙁" }, { val: 3, char: "😐" }, { val: 4, char: "🙂" }, { val: 5, char: "🤩" },
                      ].map((emoji) => {
                        const isOptSelected = answers[q.id] === emoji.val;
                        return (
                          <button key={emoji.val} onClick={() => setAnswers({ ...answers, [q.id]: emoji.val })}
                            className="transition-all hover:scale-110 duration-200 cursor-pointer border-0 bg-transparent drop-shadow-sm hover:drop-shadow-sm flex items-center justify-center"
                            style={{
                              filter: isOptSelected ? "none" : "grayscale(80%) opacity(50%)",
                              transform: isOptSelected ? "scale(1.15)" : "none",
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
                      <span className="text-xs font-semibold px-3 py-1 rounded-lg border" style={{ borderColor: activeTheme.borderColor, color: activeTheme.fontColor }}>
                        {["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"][(answers[q.id] as number) - 1]} selected
                      </span>
                    )}
                  </div>
                ) : q.label.toLowerCase().includes("number") ? (
                  <div className="flex flex-col items-center justify-center gap-4 w-full py-6 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                    <div className="flex flex-nowrap items-center gap-2 w-full justify-center overflow-x-auto py-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const isOptSelected = answers[q.id] === num;
                        return (
                          <button key={num} onClick={() => setAnswers({ ...answers, [q.id]: num })}
                            className="w-10 h-10 text-xs font-bold transition-all border cursor-pointer flex items-center justify-center rounded-lg"
                            style={{
                              background: isOptSelected ? activeTheme.primaryColor : `${activeTheme.backgroundColor}`,
                              borderColor: isOptSelected ? activeTheme.primaryColor : activeTheme.borderColor,
                              color: isOptSelected ? "#fff" : activeTheme.fontColor,
                            }}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                    {answers[q.id] && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-lg border" style={{ borderColor: activeTheme.borderColor, color: activeTheme.fontColor }}>
                        Score: {answers[q.id]} / 10 Selected
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 w-full py-4 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                    <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setAnswers({ ...answers, [q.id]: star })} className="transition-transform hover:scale-110 border-0 bg-transparent cursor-pointer">
                        <Star size={36} color={(answers[q.id] as number) >= star ? "#F59E0B" : activeTheme.borderColor} fill={(answers[q.id] as number) >= star ? "#F59E0B" : "none"} />
                      </button>
                    ))}
                    {answers[q.id] && <span className="text-sm ml-2" style={{ color: activeTheme.fontColor }}>{answers[q.id]} / 5</span>}
                    </div>
                  </div>
                )
              )}

              {q.type === "NPS" && (
                <div className="flex flex-col gap-4 w-full p-5 border rounded-lg" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.inputBackgroundColor || activeTheme.backgroundColor }}>
                  <div className="flex flex-nowrap gap-1.5 justify-center overflow-x-auto py-2">
                    {Array.from({ length: 11 }, (_, i) => i).map((score) => (
                      <button key={score} onClick={() => setAnswers({ ...answers, [q.id]: score })}
                        className="w-10 h-10 rounded-lg text-sm font-medium transition-all border-0 cursor-pointer"
                        style={{
                          background: answers[q.id] === score ? activeTheme.primaryColor : `${activeTheme.backgroundColor}`,
                          color: answers[q.id] === score ? "#fff" : activeTheme.fontColor,
                          border: `2px solid ${answers[q.id] === score ? activeTheme.primaryColor : "transparent"}`,
                        }}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] font-medium opacity-50" style={{ color: activeTheme.fontColor }}>Not likely</span>
                    <span className="text-[11px] font-medium opacity-50" style={{ color: activeTheme.fontColor }}>Very likely</span>
                  </div>
                </div>
              )}
              </div>
            </div>
          );
        })}

        {/* Submit button */}
        <div className="sticky bottom-0 z-10 pb-2 -mx-6 px-6 pt-6 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
          <div className="flex items-center justify-between p-4 rounded-lg shadow-sm border" style={{ borderColor: activeTheme.borderColor, backgroundColor: activeTheme.backgroundColor }}>
            <span className="text-xs font-medium" style={{ color: activeTheme.fontColor }}>
              {(() => { const c = visibleQuestions.filter((q: any) => { const a = answers[q.id]; return a !== undefined && a !== null && a !== ""; }).length; return <><span className="font-bold">{c}</span> of {visibleQuestions.length} answered</>; })()}
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold text-white transition-all border-0 shadow-sm hover:opacity-90 active:scale-[0.97]"
              style={{
                background: submitting ? "#94A3B8" : `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.primaryColor}dd)`,
                borderRadius: activeTheme.borderRadius,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {submitting ? "Submitting..." : "Submit Survey"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

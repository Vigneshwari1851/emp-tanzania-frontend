import { useState, useEffect } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDepartments } from "@/features/organization/services/departments";
import {
  ArrowLeft, Sparkles, Loader2, LayoutDashboard, GitBranch,
  ChevronRight, FileText, Activity, CalendarDays
} from "lucide-react";
import { useCreateSurvey, useUpdateSurvey, useSurvey } from "../api/surveyApi";
import { toast } from "sonner";
import { ModernDatePicker } from "@/shared/components/ui/ModernDatePicker";
import { CustomDropdown } from "../components/CustomDropdown";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";

interface TemplateQuestion {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING" | "YES_NO" | "NPS";
  label: string;
  order: number;
  required?: boolean;
  options?: { label: string; value: string; order: number }[];
}

interface TemplateDef {
  label: string;
  category: string;
  desc: string;
  questions: TemplateQuestion[];
}

const TEMPLATES: TemplateDef[] = [
  {
    label: "Customer Satisfaction", category: "Customer",
    desc: "Measure CSAT scores and gather product feedback.",
    questions: [
      { type: "RATING", label: "How would you rate your overall satisfaction with our product?", order: 1, required: true },
      { type: "SINGLE_CHOICE", label: "How likely are you to recommend us to a colleague?", order: 2, required: true, options: [
        { label: "Very likely", value: "very_likely", order: 1 }, { label: "Likely", value: "likely", order: 2 }, { label: "Neutral", value: "neutral", order: 3 }, { label: "Unlikely", value: "unlikely", order: 4 }, { label: "Very unlikely", value: "very_unlikely", order: 5 },
      ]},
      { type: "MULTIPLE_CHOICE", label: "Which areas need improvement? (Select all that apply)", order: 3, options: [
        { label: "Customer support", value: "support", order: 1 }, { label: "Product features", value: "features", order: 2 }, { label: "Pricing", value: "pricing", order: 3 }, { label: "User experience", value: "ux", order: 4 },
      ]},
      { type: "TEXT", label: "Any additional feedback?", order: 4 },
    ],
  },
  {
    label: "Employee Pulse", category: "HR",
    desc: "Quarterly team engagement and wellbeing check.",
    questions: [
      { type: "RATING", label: "How engaged do you feel at work this quarter?", order: 1, required: true },
      { type: "YES_NO", label: "Do you feel your contributions are recognised?", order: 2, required: true },
      { type: "SINGLE_CHOICE", label: "Which area needs the most improvement?", order: 3, options: [
        { label: "Communication", value: "communication", order: 1 }, { label: "Workload balance", value: "workload", order: 2 }, { label: "Career growth", value: "growth", order: 3 }, { label: "Team collaboration", value: "collaboration", order: 4 },
      ]},
      { type: "TEXT", label: "What's one thing we could do better?", order: 4 },
    ],
  },
  {
    label: "Product NPS", category: "Product",
    desc: "Net Promoter Score with follow-up logic branching.",
    questions: [
      { type: "NPS", label: "How likely are you to recommend our product to a friend or colleague?", order: 1, required: true },
      { type: "TEXT", label: "What is the primary reason for your score?", order: 2, required: true },
      { type: "SINGLE_CHOICE", label: "Which product area matters most to you?", order: 3, options: [
        { label: "Performance", value: "performance", order: 1 }, { label: "Reliability", value: "reliability", order: 2 }, { label: "Ease of use", value: "ease_of_use", order: 3 }, { label: "Features", value: "features", order: 4 },
      ]},
    ],
  },
  {
    label: "Event Registration", category: "Events",
    desc: "Collect attendee preferences and session choices.",
    questions: [
      { type: "TEXT", label: "Full Name", order: 1, required: true },
      { type: "TEXT", label: "Email Address", order: 2, required: true },
      { type: "MULTIPLE_CHOICE", label: "Which sessions interest you?", order: 3, required: true, options: [
        { label: "Keynote", value: "keynote", order: 1 }, { label: "Workshop A", value: "workshop_a", order: 2 }, { label: "Workshop B", value: "workshop_b", order: 3 }, { label: "Networking", value: "networking", order: 4 },
      ]},
      { type: "YES_NO", label: "Will you require special accommodations?", order: 4, required: true },
    ],
  },
  {
    label: "Onboarding Check", category: "HR",
    desc: "New hire 30-day experience and needs assessment.",
    questions: [
      { type: "RATING", label: "How would you rate your onboarding experience?", order: 1, required: true },
      { type: "YES_NO", label: "Did you receive all necessary equipment on day one?", order: 2, required: true },
      { type: "SINGLE_CHOICE", label: "Which part of onboarding was most helpful?", order: 3, options: [
        { label: "Team introductions", value: "team_intros", order: 1 }, { label: "Training sessions", value: "training", order: 2 }, { label: "Documentation", value: "docs", order: 3 }, { label: "Buddy system", value: "buddy", order: 4 },
      ]},
      { type: "TEXT", label: "What additional support would help you settle in?", order: 4 },
    ],
  },
  {
    label: "Blank Survey", category: "General",
    desc: "Start from scratch with full customisation.",
    questions: [
      { type: "TEXT", label: "Your first question", order: 1 },
    ],
  },
];

export default function CreateSurveyPage() {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("All Departments");
  const [mode, setMode] = useState<"linear" | "logic">("linear");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [templateQuestions, setTemplateQuestions] = useState<TemplateQuestion[] | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const createSurveyMutation = useCreateSurvey();
  const updateSurveyMutation = useUpdateSurvey();

  const { data: existingSurvey, isLoading: isSurveyLoading } = useSurvey(id);
  const isEditMode = !!id;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });

  useEffect(() => {
    if (isEditMode && existingSurvey) {
      setTitle(existingSurvey.title || "");
      setDescription(existingSurvey.description || "");
      setTargetDepartment(existingSurvey.target_department || "All Departments");
      setMode(existingSurvey.mode || "linear");
      setStartDate(existingSurvey.start_date ? new Date(existingSurvey.start_date).toISOString().split('T')[0] : "");
      setEndDate(existingSurvey.end_date ? new Date(existingSurvey.end_date).toISOString().split('T')[0] : "");
      setTemplateQuestions(null);
    }
  }, [isEditMode, existingSurvey]);

  async function handleStartBuilding() {
    if (!title.trim()) {
      toast.error("Please enter a survey title.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate && new Date(startDate) < today) {
      toast.error("Start date must be in the future (today or later).");
      return;
    }

    if (endDate && new Date(endDate) < today) {
      toast.error("End date must be in the future (today or later).");
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("End date cannot be before the start date.");
      return;
    }

    try {
      const payload = {
        title,
        description: description || undefined,
        target_department: targetDepartment,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        questions: templateQuestions || [{
          type: "TEXT" as const,
          label: "Your question here",
          order: 1,
        }],
      };

      let surveyId = id;
      if (isEditMode && id) {
        const existingQuestions = existingSurvey?.questions?.map((q: any) => {
          // Convert parent_question_id from DB ID → ORDER number
          let parentOrder: number | undefined;
          let triggerIdx: number | undefined;
          if (q.parent_question_id) {
            const parentQ = existingSurvey.questions.find((pq: any) => pq.id === q.parent_question_id);
            if (parentQ) {
              parentOrder = parentQ.order;
              if (q.trigger_option_id && parentQ.options) {
                const oi = parentQ.options.findIndex((o: any) => o.id === q.trigger_option_id);
                if (oi >= 0) triggerIdx = oi;
              }
            }
          }
          return {
            id: q.id, type: q.type, label: q.label, order: q.order, required: q.required,
            parent_question_id: parentOrder,
            trigger_option_id: triggerIdx,
            options: q.options?.map((o: any) => ({ id: o.id, label: o.label, value: o.value, order: o.order })) || [],
          };
        }) || [];
        await updateSurveyMutation.mutateAsync({ id, data: { ...payload, questions: existingQuestions } });
        toast.success("Survey updated!");
      } else {
        const created = await createSurveyMutation.mutateAsync(payload);
        surveyId = created?.id;
        toast.success("Survey created!");
      }

      if (surveyId) {
        navigate(mode === "logic" ? `/surveys/admin/logic-builder/${surveyId}` : `/surveys/admin/linear-builder/${surveyId}`);
      }
    } catch (err: any) {
      const backendMessage = err.response?.data?.message;
      const backendErrors = err.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        const friendlyErrors = backendErrors.map(e => {
          let field = e.field || "";
          field = field.replace("body.", "");
          const match = field.match(/questions\.(\d+)\.(.+)/);
          if (match) {
            const idx = parseInt(match[1]) + 1;
            const subfield = match[2];
            if (subfield === "type") {
              return `Question ${idx}: The selected question type is not supported.`;
            }
            if (subfield === "label") {
              return `Question ${idx}: Question text/label is required.`;
            }
            return `Question ${idx} ${subfield} is invalid: ${e.message}`;
          }
          return `${field}: ${e.message}`;
        }).join(" | ");
        toast.error(friendlyErrors);
      } else {
        toast.error(backendMessage || "Something went wrong.");
      }
    }
  }

  const isPending = createSurveyMutation.isPending || updateSurveyMutation.isPending;

  if (isEditMode && isSurveyLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 bg-card border border-border rounded-lg shadow-sm">
        <div className="w-10 h-10 border-4 border-primary-650 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-sm font-semibold animate-pulse">Loading survey details...</p>
      </div>
    );
  }

  return (
    <div className="w-full font-sans space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="icon-circle-btn"
          >
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {isEditMode ? "Survey Settings" : "Create New Survey"} <Sparkles className="w-4 h-4 text-primary-500" />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              {isEditMode ? "Update your survey details and mode." : "Set up your survey before you start building."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Main Content Area */}
        <div className="flex-1 w-full space-y-6">
          {/* Survey Details Card */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <span className="p-1.5 text-primary">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="text-sm text-foreground font-bold">Survey Details</h3>
            </div>

            <div className="space-y-4">
              {existingSurvey && (existingSurvey.cloned_from_id || existingSurvey.is_clone) && (
                <div className="p-4 rounded-lg bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100/50 dark:border-primary-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="p-2 bg-primary-100 text-primary-600 rounded-md mt-0.5">
                      <GitBranch className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {existingSurvey.is_clone ? "Linked Clone" : "Decoupled Copy"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This survey was created by {existingSurvey.is_clone ? "cloning" : "copying"} an existing structure.
                      </p>
                    </div>
                  </div>
                  <div className="text-left md:text-right shrink-0 flex flex-col items-start md:items-end">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Origin ID:</span>
                      <span className="font-mono text-foreground select-all">{existingSurvey.cloned_from_id}</span>
                    </div>
                    {existingSurvey.cloned_from && (
                      <div className="text-[11px] font-medium text-primary-650 mt-1">
                        Source: "{existingSurvey.cloned_from.title}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Survey Name *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Employee Engagement Survey Q2"
                  className="w-full bg-card border border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the goal of this survey..."
                  rows={3}
                  className="w-full bg-card border border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all resize-none shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Target Department</label>
                  <MultiSelectDropdown
                    value={targetDepartment}
                    onChange={(val) => setTargetDepartment(val)}
                    options={[
                      { value: "All Departments", label: "All Departments" },
                      ...departments.map((dept: any) => ({
                        value: dept.department_name,
                        label: dept.department_name
                      }))
                    ]}
                    className="w-full h-10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Start Date</label>
                  <ModernDatePicker
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    placeholder="Select start date"
                    minDate={todayStr}
                    maxDate={endDate || undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">End Date</label>
                  <ModernDatePicker
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    placeholder="Select end date"
                    minDate={startDate || todayStr}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Templates Card */}
          {false && !isEditMode && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <span className="p-1.5 bg-primary/10 text-primary-650 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-sm text-foreground font-bold">Start from a Template</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => { setTitle(t.label); setDescription(t.desc); setTemplateQuestions(t.questions); }}
                    className="rounded-lg p-4 text-left transition-all bg-muted/50 border border-border hover:border-primary-500 hover:bg-primary/10 hover:shadow-sm cursor-pointer group"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-primary/10 dark:bg-primary/20 text-primary border border-primary-100/50 dark:border-primary-800/50 animate-in">
                      {t.category}
                    </span>
                    <p className="text-foreground text-sm font-bold mt-2.5 group-hover:text-primary transition-colors">{t.label}</p>
                    <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed font-medium">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Builder Mode Card */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <span className="p-1.5 text-primary-650">
                <Activity className="w-4 h-4" />
              </span>
              <h3 className="text-sm text-foreground font-bold">Builder Mode</h3>
            </div>
            {isEditMode && existingSurvey ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Builder mode is locked. This survey was started in <strong>{existingSurvey.mode === "logic" ? "Logic" : "Linear"}</strong> mode.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Choose a builder mode to get started. This cannot be changed after saving.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: "linear" as const, icon: LayoutDashboard, title: "Linear Mode", subtitle: "Form Builder", desc: "Build a straightforward question-by-question survey. Best for simple feedback forms, registrations, and polls.", features: ["Drag-and-drop question ordering", "All question types supported", "Fast to build & configure"] },
                { key: "logic" as const, icon: GitBranch, title: "Logic Mode", subtitle: "Flow Builder", desc: "Create branching surveys with conditional paths. Respondents see different questions based on their answers.", features: ["Visual node canvas", "Conditional branching rules", "Smart path visualization"] },
              ]).map((m) => {
                const isLocked = isEditMode && !!existingSurvey && mode !== m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setMode(m.key)}
                    className={`rounded-lg p-5 text-left transition-all border-2 border-solid flex flex-col ${
                      isLocked
                        ? "bg-muted border-border cursor-not-allowed opacity-60"
                        : mode === m.key
                          ? "bg-primary/10 border-primary-500 shadow-sm shadow-primary-100 cursor-pointer"
                          : "bg-muted/50 border-border hover:border-primary-300 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 flex items-center justify-center ${isLocked ? "text-slate-400" : mode === m.key ? "text-primary" : "text-muted-foreground"}`}>
                        <m.icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{m.title}</p>
                        <p className="text-xs text-muted-foreground font-semibold">{m.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1 font-medium">{m.desc}</p>
                    <ul className="flex flex-col gap-1.5 border-t border-border pt-3 w-full">
                      {m.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                          <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? "bg-slate-300 dark:bg-slate-600" : mode === m.key ? "bg-primary-500" : "bg-slate-400 dark:bg-slate-500"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isLocked && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span>🔒</span> Locked — switch to {m.key === "logic" ? "Logic" : "Linear"} mode to edit
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="h-10 bg-card border border-border hover:bg-muted/50 text-foreground font-semibold px-4 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStartBuilding}
              disabled={!title.trim() || isPending}
              className="h-10 bg-gradient-to-r from-[#4F46E5] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] text-white font-semibold px-6 shadow-sm border-none rounded-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : null}
              {isEditMode ? "Save & Continue" : "Start Building"}
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Sidebar Guidelines */}
        <div className="w-full xl:w-[380px] flex-shrink-0 space-y-6">
          <div className="bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white shadow-sm border-none rounded-lg p-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Sparkles size={18} /> Survey Guidelines
            </h3>
            <ul className="space-y-4 text-primary-50/90">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-card/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                <p className="text-sm">Provide a clear **Survey Name** and optional description to guide your respondents.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-card/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                <p className="text-sm">Set optional **Start & End dates** to automatically manage response collection windows.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-card/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                <p className="text-sm">Pick **Builder Mode**: Use Linear for simple forms; use Logic to define branch paths.</p>
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-sm p-6">
            <h4 className="text-[12px] font-medium text-foreground mb-3">Pro Tips</h4>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 border border-border rounded-lg text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                <span className="text-primary font-semibold">Tip:</span> Choose your builder mode carefully — it cannot be changed once the survey is saved. Start fresh if you need a different mode.
              </div>
              <div className="p-3 bg-muted/50 border border-border rounded-lg text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Templates:</span> Starting from a template pre-fills high-quality standard questions which you can edit afterwards.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title={isEditMode ? "Discard Survey Settings Changes?" : "Discard New Survey?"}
        message="Are you sure you want to cancel? Any survey configuration details entered will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelConfirm(false);
          navigate("/surveys/admin");
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

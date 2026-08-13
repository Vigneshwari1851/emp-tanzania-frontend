import { useState, useEffect, useRef } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useSurvey, useUpdateSurvey } from "../api/surveyApi";
import {
  Plus, Trash2, GripVertical, ToggleLeft, ToggleRight,
  Eye, CheckSquare, AlignLeft, Star, BarChart2, ChevronDown,
  ChevronUp, Save, Settings, ArrowLeft, List, Type, Loader2,
  ThumbsUp, ThumbsDown
} from "lucide-react";
import { toast } from "sonner";
import ChooseQuestionTypeModal from "../components/ChooseQuestionTypeModal";
import Select from "@/shared/components/ui/Select";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";

export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING" | "YES_NO" | "NPS";

interface OptionInput {
  label: string;
  value: string;
  order: number;
}

interface QuestionInput {
  id?: number;
  type: QuestionType;
  label: string;
  order: number;
  required: boolean;
  options: OptionInput[];
  parent_question_id?: number | null;
  trigger_option_id?: number | null;
}

const Q_TYPES: { type: QuestionType; label: string; icon: typeof Type; desc: string }[] = [
  { type: "TEXT", label: "Text", icon: AlignLeft, desc: "Open-ended answer" },
  { type: "SINGLE_CHOICE", label: "Multiple Choice", icon: List, desc: "Single select option" },
  { type: "MULTIPLE_CHOICE", label: "Checkbox", icon: CheckSquare, desc: "Multi-select options" },
  { type: "RATING", label: "Rating", icon: Star, desc: "1–5 star rating" },
  { type: "YES_NO", label: "Yes/No", icon: BarChart2, desc: "Binary choice" },
  { type: "NPS", label: "NPS", icon: BarChart2, desc: "0–10 score" },
];

const DEFAULT_OPTIONS: Record<QuestionType, string[]> = {
  TEXT: [],
  SINGLE_CHOICE: ["Option A", "Option B", "Option C"],
  MULTIPLE_CHOICE: ["Option A", "Option B", "Option C"],
  RATING: [],
  YES_NO: ["Yes", "No"],
  NPS: [],
};

const Q_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: "Text",
  SINGLE_CHOICE: "Multiple Choice",
  MULTIPLE_CHOICE: "Checkbox",
  RATING: "Rating",
  YES_NO: "Yes/No",
  NPS: "NPS",
};

export default function LinearBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const updateSurveyMutation = useUpdateSurvey();
  const { data: survey, isLoading } = useSurvey(id);

  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedType, setExpandedType] = useState<QuestionType | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [deleteQuestionIdTarget, setDeleteQuestionIdTarget] = useState<number | null>(null);

  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;
  const questionsRef = useRef<QuestionInput[]>([]);
  questionsRef.current = questions;

  useEffect(() => {
    if (survey && survey.mode === "logic") {
      navigate(`/surveys/admin/create/${id}`, { replace: true });
      toast.error("This survey uses Logic Builder. Switch to Logic Builder to edit.");
    }
  }, [survey, id, navigate]);

  useEffect(() => {
    if (survey?.questions) {
      const prevSelectedQ = selectedIdRef.current !== null ? questionsRef.current.find(q => q.id === selectedIdRef.current) : null;
      const prevOrder = prevSelectedQ ? prevSelectedQ.order : null;

      const mapped = survey.questions.map((q: any) => {
        let opts = q.options ? q.options.map((o: any) => ({ id: o.id, label: o.label, value: o.value, order: o.order })) : [];
        if (opts.length === 0 && q.type === "YES_NO") {
          if (q.label.toLowerCase().includes("thumbs")) {
            opts = [
              { label: "Thumbs Up", value: "thumbs_up", order: 1 },
              { label: "Thumbs Down", value: "thumbs_down", order: 2 }
            ];
          } else {
            opts = [
              { label: "Yes", value: "yes", order: 1 },
              { label: "No", value: "no", order: 2 }
            ];
          }
        }

        let parentOrder = null;
        let triggerOptIdx = null;

        if (q.parent_question_id) {
          const p = survey.questions.find((pq: any) => pq.id === q.parent_question_id);
          if (p) {
            parentOrder = p.order;
            if (q.trigger_option_id && p.options) {
              const oIndex = p.options.findIndex((o: any) => o.id === q.trigger_option_id);
              if (oIndex >= 0) triggerOptIdx = oIndex;
            }
          }
        }

        return {
          id: q.id,
          type: q.type,
          label: q.label,
          order: q.order,
          required: q.required,
          parent_question_id: parentOrder,
          trigger_option_id: triggerOptIdx,
          options: opts,
        };
      });
      setQuestions(mapped);

      if (prevOrder !== null) {
        const match = mapped.find((q: any) => q.order === prevOrder);
        if (match) {
          setSelectedId(match.id);
        }
      }
    }
  }, [survey]);

  useEffect(() => {
    if (!isLoading && !survey) navigate("/surveys/admin");
  }, [survey, isLoading]);

  const selected = questions.find((q) => q.id === selectedId);

  function triggerSave() {
    setSaveStatus("saving");
    setTimeout(() => setSaveStatus("saved"), 800);
  }

  function handleAddQuestion(type: QuestionType, subType?: string) {
    let defaultOpts = DEFAULT_OPTIONS[type] || [];
    let customLabel = `New ${Q_TYPE_LABELS[type]} Question`;

    if (subType === "short-text") {
      customLabel = "Short Answer Question";
    } else if (subType === "long-text") {
      customLabel = "Long Answer Question";
    } else if (subType === "yes-no") {
      defaultOpts = ["Yes", "No"];
      customLabel = "Yes / No Question";
    } else if (subType === "thumbs-up-down") {
      defaultOpts = ["Thumbs Up", "Thumbs Down"];
      customLabel = "Thumbs Up / Down Question [thumbs]";
    } else if (subType === "multiple-choice") {
      defaultOpts = ["Option A", "Option B", "Option C"];
      customLabel = "Multiple Choice Question";
    } else if (subType === "single-choice") {
      defaultOpts = ["Option A", "Option B", "Option C"];
      customLabel = "Single Choice Question";
    } else if (subType === "dropdown") {
      defaultOpts = ["Option 1", "Option 2", "Option 3"];
      customLabel = "Dropdown Question";
    } else if (subType === "star-rating") {
      customLabel = "Star Rating Question";
    } else if (subType === "emoji-scale") {
      customLabel = "Emoji Rating Question";
    } else if (subType === "number-rating") {
      customLabel = "Number Rating Scale";
    } else if (subType === "nps-score") {
      customLabel = "NPS Score Question";
    }

    const tempId = -Date.now() - Math.round(Math.random() * 1000);
    const newQ: QuestionInput = {
      id: tempId,
      type,
      label: customLabel,
      order: questions.length + 1,
      required: false,
      options: defaultOpts.map((label, i) => ({ label, value: label.toLowerCase().replace(/\s+/g, "_"), order: i + 1 })),
    };
    setQuestions([...questions, newQ]);
    setSelectedId(tempId);
    triggerSave();
  }

  function handleUpdateQuestion(qId: number, updates: Partial<QuestionInput>) {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, ...updates } : q)));
    triggerSave();
  }

  function handleDeleteQuestion(qId: number) {
    setQuestions(questions.filter((q) => q.id !== qId).map((q, i) => ({ ...q, order: i + 1 })));
    if (selectedId === qId) setSelectedId(null);
    triggerSave();
  }

  function handleDragStart(idx: number) {
    setDragIndex(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIndex(idx);
  }

  function handleDrop(toIdx: number) {
    if (dragIndex !== null && dragIndex !== toIdx) {
      const qs = [...questions];
      const [moved] = qs.splice(dragIndex, 1);
      qs.splice(toIdx, 0, moved);
      setQuestions(qs.map((q, i) => ({ ...q, order: i + 1 })));
      triggerSave();
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  async function handleSave() {
    if (!id) return;
    try {
      setSaveStatus("saving");
      const payload = {
        title: survey?.title || "",
        description: survey?.description || undefined,
        questions: questions.map((q) => ({
          id: q.id && q.id > 0 ? q.id : undefined,
          type: q.type,
          label: q.label,
          order: q.order,
          required: q.required,
          parent_question_id: q.parent_question_id || undefined,
          trigger_option_id: q.trigger_option_id !== null && q.trigger_option_id !== undefined ? q.trigger_option_id : undefined,
          options: q.options.length > 0 ? q.options : undefined,
        })),
      };
      await updateSurveyMutation.mutateAsync({ id, data: payload });
      toast.success("Survey saved!");
      setSaveStatus("saved");
    } catch {
      toast.error("Failed to save survey");
      setSaveStatus("saved");
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!survey) return null;

  return (
    <div className="h-full flex overflow-hidden" style={{ minHeight: "calc(100vh - 64px)" }}>
      {/* Left panel: Question library */}
      <div className="flex flex-col shrink-0 w-[220px] bg-card border-r border-border/70">
        <div className="p-4 shrink-0 border-b border-border flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Questions</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-white bg-primary-650 hover:bg-primary/95 transition-all cursor-pointer shadow-sm shadow-primary-600/10"
          >
            <Plus size={13} /> Add Question
          </button>
        </div>
        <div className="p-3 flex flex-col gap-1.5 overflow-y-auto flex-1">
          <p className="text-[10px] px-1 font-bold text-muted-foreground uppercase tracking-wider mb-1">Quick Add</p>
          {Q_TYPES.map((qt) => {
            const hasSubtypes = qt.type === "TEXT" || qt.type === "SINGLE_CHOICE" || qt.type === "RATING" || qt.type === "YES_NO";
            const isExpanded = expandedType === qt.type;
            
            return (
              <div key={qt.type} className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    if (hasSubtypes) {
                      setExpandedType(isExpanded ? null : qt.type);
                    } else {
                      handleAddQuestion(qt.type);
                      setExpandedType(null);
                    }
                  }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all hover:shadow-sm group bg-muted/80 border border-border/60 hover:border-primary-200 cursor-pointer w-full ${isExpanded ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isExpanded ? "bg-white dark:bg-slate-800" : "bg-primary/10"}`}>
                        <qt.icon size={13} className="text-primary" />
                      </div>
                    <div>
                      <p className="text-foreground text-xs font-semibold">{qt.label}</p>
                      <p className="text-muted-foreground text-[10px]">{qt.desc}</p>
                    </div>
                  </div>
                  {hasSubtypes && (
                    <ChevronDown size={14} className="text-muted-foreground transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }} />
                  )}
                </button>
                
                {hasSubtypes && isExpanded && (
                  <div className="pl-9 pr-1 py-1 flex flex-col gap-1.5 border-l-2 border-primary-100 dark:border-primary-800 ml-5 animate-fade-in">
                    {qt.type === "TEXT" && (
                      <>
                        <button
                          onClick={() => handleAddQuestion("TEXT", "short-text")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Short Text
                        </button>
                        <button
                          onClick={() => handleAddQuestion("TEXT", "long-text")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Long Text
                        </button>
                      </>
                    )}
                    {qt.type === "SINGLE_CHOICE" && (
                      <>
                        <button
                          onClick={() => handleAddQuestion("SINGLE_CHOICE", "single-choice")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Radio Buttons
                        </button>
                        <button
                          onClick={() => handleAddQuestion("SINGLE_CHOICE", "dropdown")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Dropdown Selector
                        </button>
                      </>
                    )}
                    {qt.type === "RATING" && (
                      <>
                        <button
                          onClick={() => handleAddQuestion("RATING", "star-rating")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Star Rating
                        </button>
                        <button
                          onClick={() => handleAddQuestion("RATING", "emoji-scale")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Emoji Scale
                        </button>
                        <button
                          onClick={() => handleAddQuestion("RATING", "number-rating")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          1-10 Scale
                        </button>
                      </>
                    )}
                    {qt.type === "YES_NO" && (
                      <>
                        <button
                          onClick={() => handleAddQuestion("YES_NO", "yes-no")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Standard Yes/No
                        </button>
                        <button
                          onClick={() => handleAddQuestion("YES_NO", "thumbs-up-down")}
                          className="text-left py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                          Thumbs Up / Down
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleSave}
            disabled={updateSurveyMutation.isPending}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save size={13} /> {updateSurveyMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={async () => { await handleSave(); navigate("/surveys/admin"); }}
            disabled={updateSurveyMutation.isPending}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all disabled:opacity-50 cursor-pointer"
          >
            Save for later
          </button>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 bg-muted hover:bg-gray-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Center: Question list */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F7FC] dark:bg-slate-900/50">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-card border-b border-border/70">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCancelConfirm(true)} className="icon-circle-btn">
              <ArrowLeft />
            </button>
            <div>
              <p className="font-semibold text-sm text-foreground">{survey?.title || "Untitled Survey"}</p>
              <p className="text-muted-foreground text-xs">{questions.length} question{questions.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs dark:text-slate-400" style={{ color: saveStatus === "saved" ? "#059669" : "#9CA3AF" }}>
              <Save size={12} />
              {saveStatus === "saved" ? "Saved" : "Saving..."}
            </div>
            <button
              onClick={() => navigate(`/surveys/admin/preview/${id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              <Eye size={12} /> Preview
            </button>
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto p-5">
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-primary/10">
                <Plus size={28} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold text-sm">No questions yet</p>
                <p className="text-muted-foreground text-xs mt-1">Click a question type on the left to add your first question.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id ?? idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  onClick={() => setSelectedId(q.id === selectedId ? null : (q.id ?? null))}
                  className={`rounded-lg cursor-pointer transition-all bg-card dark:bg-slate-800/60 ${selectedId !== q.id && dragOverIndex !== idx ? "border-2 border-black/7 dark:border-slate-700" : ""}`}
                  style={{
                    border: selectedId === q.id ? "2px solid #4F46E5" : dragOverIndex === idx ? "2px solid #A5B4FC" : undefined,
                    boxShadow: selectedId === q.id ? "0 0 0 3px rgba(79,70,229,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                    opacity: dragIndex === idx ? 0.5 : 1,
                  }}
                >
                  {/* Question header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="text-gray-300 dark:text-slate-600 cursor-grab"><GripVertical size={16} /></div>
                    <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 bg-primary/10">
                      <span className="text-primary text-[10px] font-bold">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-xs font-medium truncate">{q.label || "Untitled question"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-sm text-xs bg-muted text-muted-foreground">
                        {q.type === "TEXT" && q.label.toLowerCase().includes("short") ? "Short Text" :
                         q.type === "TEXT" ? "Long Text" :
                         q.type === "SINGLE_CHOICE" && q.label.toLowerCase().includes("dropdown") ? "Dropdown" :
                         q.type === "RATING" && q.label.toLowerCase().includes("emoji") ? "Emoji Scale" :
                         q.type === "RATING" && q.label.toLowerCase().includes("number") ? "1-10 Rating" :
                         Q_TYPE_LABELS[q.type] ?? q.type}
                      </span>
                      {q.required && <span className="px-1.5 py-0.5 rounded text-xs bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400">Required</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteQuestionIdTarget(q.id!); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="text-muted-foreground">{selectedId === q.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                    </div>
                  </div>

                  {/* Expanded editor */}
                  {selectedId === q.id && (
                    <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
                      <div className="pt-3">
                        <label className="text-muted-foreground text-xs font-medium block mb-1.5">Question Text</label>
                        <input
                          value={q.label.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "")}
                          onChange={(e) => {
                            const match = q.label.match(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i);
                            const suffix = match ? match[0] : "";
                            handleUpdateQuestion(q.id!, { label: e.target.value + suffix });
                          }}
                          className="w-full px-3 py-2 rounded-lg outline-none text-sm bg-muted/80 border border-border/70 text-foreground"
                        />
                      </div>
 
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Select value={q.type} onChange={(val) => {
                          const newType = val as QuestionType;
                          const defaultOpts = DEFAULT_OPTIONS[newType];
                          handleUpdateQuestion(q.id!, {
                            type: newType,
                            options: defaultOpts.map((label, i) => ({ label, value: label.toLowerCase().replace(/\s+/g, "_"), order: i + 1 })),
                          });
                        }} label="Type" options={Q_TYPES.map((t) => ({ value: t.type, label: t.label }))} />
 
                        {/* Subtype Dropdown */}
                        {(q.type === "TEXT" || q.type === "SINGLE_CHOICE" || q.type === "RATING" || q.type === "YES_NO") ? (
                          <Select
                            value={
                              q.type === "TEXT" && q.label.toLowerCase().includes("[short]") ? "short-text" :
                              q.type === "TEXT" && q.label.toLowerCase().includes("[long]") ? "long-text" :
                              q.type === "TEXT" && q.label.toLowerCase().includes("short") ? "short-text" :
                              q.type === "TEXT" ? "long-text" :
                              q.type === "SINGLE_CHOICE" && q.label.toLowerCase().includes("dropdown") ? "dropdown" :
                              q.type === "SINGLE_CHOICE" ? "single-choice" :
                              q.type === "RATING" && q.label.toLowerCase().includes("emoji") ? "emoji-scale" :
                              q.type === "RATING" && q.label.toLowerCase().includes("number") ? "number-rating" :
                              q.type === "RATING" ? "star-rating" :
                              q.type === "YES_NO" && q.label.toLowerCase().includes("thumbs") ? "thumbs-up-down" :
                              "yes-no"
                            }
                            onChange={(newSub) => {
                              let baseLabel = q.label.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "");
                              let suffix = "";
                              let newOptions = q.options;

                              if (newSub === "short-text") suffix = " [short]";
                              else if (newSub === "long-text") suffix = " [long]";
                              else if (newSub === "dropdown") suffix = " [dropdown]";
                              else if (newSub === "emoji-scale") suffix = " [emoji]";
                              else if (newSub === "number-rating") suffix = " [number]";
                              else if (newSub === "star-rating") suffix = " [star]";
                              else if (newSub === "thumbs-up-down") {
                                suffix = " [thumbs]";
                                if (q.type === "YES_NO") {
                                  newOptions = [
                                    { label: "Thumbs Up", value: "thumbs_up", order: 1 },
                                    { label: "Thumbs Down", value: "thumbs_down", order: 2 }
                                  ];
                                }
                              }
                              else if (newSub === "yes-no") {
                                suffix = " [yes-no]";
                                if (q.type === "YES_NO") {
                                  newOptions = [
                                    { label: "Yes", value: "yes", order: 1 },
                                    { label: "No", value: "no", order: 2 }
                                  ];
                                }
                              }
                              handleUpdateQuestion(q.id!, { label: baseLabel + suffix, options: newOptions });
                            }}
                            label="Subtype / Layout"
                            options={
                              q.type === "TEXT"
                                ? [{ value: "short-text", label: "Short Text" }, { value: "long-text", label: "Long Text" }]
                                : q.type === "SINGLE_CHOICE"
                                  ? [{ value: "single-choice", label: "Radio Buttons" }, { value: "dropdown", label: "Dropdown Selector" }]
                                  : q.type === "RATING"
                                    ? [{ value: "star-rating", label: "Star Rating" }, { value: "emoji-scale", label: "Emoji Scale" }, { value: "number-rating", label: "1-10 Scale" }]
                                    : [{ value: "yes-no", label: "Standard Buttons" }, { value: "thumbs-up-down", label: "Thumbs Up / Down" }]
                            }
                          />
                        ) : (
                          <div className="opacity-40 pointer-events-none">
                            <label className="text-muted-foreground text-xs font-medium block mb-1.5">Subtype / Layout</label>
                            <div className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-muted-foreground">None</div>
                          </div>
                        )}
 
                        <div>
                          <label className="text-muted-foreground text-xs font-medium block mb-1.5">Required</label>
                          <button
                            onClick={() => handleUpdateQuestion(q.id!, { required: !q.required })}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-muted/80 border border-border/70 w-full justify-center dark:text-slate-300"
                            style={{ color: q.required ? "#4F46E5" : "#6B7280" }}
                          >
                            {q.required ? <ToggleRight size={16} className="text-primary" /> : <ToggleLeft size={16} />}
                            {q.required ? "Required" : "Optional"}
                          </button>
                        </div>
                      </div>

                      {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
                        <div>
                          {q.type === "SINGLE_CHOICE" && q.label.toLowerCase().includes("dropdown") && (
                            <div className="mb-2 px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-800 text-[11px] text-primary font-medium flex items-center gap-1.5 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                              Styled as a Selection Dropdown Menu
                            </div>
                          )}
                          <label className="text-muted-foreground text-xs font-medium block mb-1.5">Options</label>
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input
                                  value={opt.label}
                                  onChange={(e) => {
                                    const newOpts = [...q.options];
                                    newOpts[oi] = { ...newOpts[oi], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                                    handleUpdateQuestion(q.id!, { options: newOpts });
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-lg outline-none text-sm bg-muted/80 border border-border/70 text-foreground"
                                />
                                <button
                                  onClick={() => handleUpdateQuestion(q.id!, { options: q.options.filter((_, i) => i !== oi) })}
                                  className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => handleUpdateQuestion(q.id!, { options: [...q.options, { label: `Option ${q.options.length + 1}`, value: `option_${q.options.length + 1}`, order: q.options.length + 1 }] })}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary"
                            >
                              <Plus size={11} /> Add option
                            </button>
                          </div>
                        </div>
                      )}

                      {q.type === "RATING" && (
                        <div className="flex flex-col gap-2 bg-muted/50 p-3 rounded-lg border border-border/50">
                          <label className="text-muted-foreground text-xs font-medium block">Rating Style Preview</label>
                          {q.label.toLowerCase().includes("emoji") ? (
                            <div className="flex flex-col gap-1">
                              <p className="text-muted-foreground text-[10px]">Emoji sentiment scale:</p>
                              <div className="flex gap-2.5 text-2xl py-1">
                                <span>😢</span><span>🙁</span><span>😐</span><span>🙂</span><span>😄</span>
                              </div>
                            </div>
                          ) : q.label.toLowerCase().includes("number") ? (
                            <div className="flex flex-col gap-1">
                              <p className="text-muted-foreground text-[10px]">Numeric scale (1–10):</p>
                              <div className="flex gap-1 flex-wrap">
                                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                  <span key={n} className="w-6 h-6 rounded bg-card border text-[10px] flex items-center justify-center font-bold text-muted-foreground">{n}</span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <p className="text-muted-foreground text-[10px]">Star rating scale (1–5):</p>
                              <div className="flex gap-1.5 text-amber-400">
                                <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {q.type === "NPS" && (
                        <p className="text-muted-foreground text-xs">Respondents will select a score from 0 to 10.</p>
                      )}

                      {q.type === "YES_NO" && (
                        <p className="text-muted-foreground text-xs">Respondents will choose Yes or No.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed text-sm transition-all border-border text-muted-foreground hover:border-primary-300 dark:hover:border-primary-600 hover:text-primary-500 dark:hover:text-primary-300 cursor-pointer"
              >
                <Plus size={15} /> Add Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Properties */}
      <div className="flex flex-col shrink-0 w-[260px] bg-card border-l border-border/70">
        <div className="p-4 shrink-0 border-b border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Properties</p>
        </div>

        {selected ? (
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
            <div className="rounded-lg p-3 flex items-center gap-2 bg-primary/10">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                {(() => {
                  const qt = Q_TYPES.find((t) => t.type === selected.type);
                  return qt ? <qt.icon size={14} className="text-white" /> : null;
                })()}
              </div>
              <div>
                <p className="font-semibold text-xs text-primary-900 dark:text-primary-300">{Q_TYPE_LABELS[selected.type]}</p>
                <p className="text-[11px] text-primary">{Q_TYPES.find((t) => t.type === selected.type)?.desc}</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-[11px] font-medium mb-1">QUESTION ID</p>
              <p className="text-muted-foreground text-[11px] font-mono">{selected.id}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-[11px] font-medium mb-1">VALIDATION</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-slate-300 text-xs">Required</span>
                  <button
                    onClick={() => handleUpdateQuestion(selected.id!, { required: !selected.required })}
                    className={selected.required ? "text-primary" : "text-gray-300 dark:text-slate-600"}
                  >
                    {selected.required ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </label>
              </div>
            </div>

            {/* Logic Branching */}
            <div>
              <p className="text-muted-foreground text-[11px] font-medium mb-1 uppercase tracking-wider">Logic Branching</p>
              <div className="space-y-3 bg-muted/50 p-3 rounded-lg border border-border">
                <Select
                  value={String(selected.parent_question_id ?? "")}
                  onChange={(val) => {
                    const v = val ? Number(val) : null;
                    handleUpdateQuestion(selected.id!, {
                      parent_question_id: v,
                      trigger_option_id: null
                    });
                  }}
                  placeholder="Always Show (No Condition)"
                  label="ONLY SHOW IF"
                  options={questions
                    .filter((q) => q.order < selected.order && (q.type === "SINGLE_CHOICE" || q.type === "YES_NO" || q.type === "MULTIPLE_CHOICE"))
                    .map((q) => ({ value: String(q.order), label: `Q${q.order}: ${q.label.slice(0, 24)}...` }))}
                />

                {selected.parent_question_id && (() => {
                  const parentQ = questions.find(q => q.order === selected.parent_question_id);
                  if (!parentQ) return null;
                  return (
                    <Select
                      value={String(selected.trigger_option_id ?? "")}
                      onChange={(val) => {
                        const v = val !== "" ? Number(val) : null;
                        handleUpdateQuestion(selected.id!, { trigger_option_id: v });
                      }}
                      placeholder="Select option..."
                      label="ANSWER EQUALS"
                      options={parentQ.options.map((opt, optIdx) => ({ value: String(optIdx), label: opt.label }))}
                    />
                  );
                })()}
              </div>
            </div>

            {(selected.type === "SINGLE_CHOICE" || selected.type === "MULTIPLE_CHOICE") && (
              <div>
                <p className="text-muted-foreground text-[11px] font-medium mb-1">OPTIONS ({selected.options.length})</p>
                <div className="flex flex-col gap-1">
                  {selected.options.map((o, i) => (
                    <div key={i} className="px-2 py-1 rounded-lg text-xs bg-muted text-gray-600 dark:text-slate-300">
                      {i + 1}. {o.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 bg-muted">
              <Settings size={20} className="text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-muted-foreground text-xs">Select a question to see its properties.</p>
          </div>
        )}
      </div>
      <ChooseQuestionTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(type, subType) => handleAddQuestion(type, subType)}
      />

      <ConfirmDialog
        open={showCancelConfirm}
        title="Exit Survey Builder?"
        message="Are you sure you want to exit? Any unsaved changes in your survey builder will be lost."
        confirmLabel="Exit"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelConfirm(false);
          navigate("/surveys/admin");
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />

      <ConfirmDialog
        open={deleteQuestionIdTarget !== null}
        title="Delete Question?"
        message="Are you sure you want to remove this question from the survey?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="red"
        onConfirm={() => {
          if (deleteQuestionIdTarget !== null) {
            handleDeleteQuestion(deleteQuestionIdTarget);
            setDeleteQuestionIdTarget(null);
          }
        }}
        onCancel={() => setDeleteQuestionIdTarget(null)}
      />
    </div>
  );
}

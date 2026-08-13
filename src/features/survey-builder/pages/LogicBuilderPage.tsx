import { useState, useEffect, useRef } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useSurvey, useUpdateSurvey } from "../api/surveyApi";
import {
  Plus, Trash2, Eye, Save, AlignLeft, List,
  CheckSquare, Star, BarChart2, Minus, ZoomIn, ZoomOut,
  GitBranch, Layers, LayoutGrid, ArrowLeft, Loader2, GripVertical,
  ChevronDown, ThumbsUp, ThumbsDown
} from "lucide-react";
import { toast } from "sonner";
import ChooseQuestionTypeModal from "../components/ChooseQuestionTypeModal";
import Select from "@/shared/components/ui/Select";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING" | "YES_NO" | "NPS";

interface OptionInput {
  id?: number;
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
  position?: { x: number; y: number };
}

interface LogicRule {
  id: string;
  fromId: string;
  toId: string;
  condition: "always" | "equals";
  value: string;
}

const NODE_W = 220;
const NODE_H = 130;
const CANVAS_W = 4000;
const CANVAS_H = 3000;

const Q_TYPES: { type: QuestionType; label: string; icon: typeof List }[] = [
  { type: "TEXT", label: "Text", icon: AlignLeft },
  { type: "SINGLE_CHOICE", label: "Multiple Choice", icon: List },
  { type: "MULTIPLE_CHOICE", label: "Checkbox", icon: CheckSquare },
  { type: "RATING", label: "Rating", icon: Star },
  { type: "YES_NO", label: "Yes/No", icon: BarChart2 },
  { type: "NPS", label: "NPS", icon: BarChart2 },
];

const TYPE_COLORS: Record<string, string> = {
  TEXT: "#6B7280", SINGLE_CHOICE: "#4F46E5", MULTIPLE_CHOICE: "#06B6D4",
  RATING: "#F59E0B", YES_NO: "#10B981", NPS: "#8B5CF6",
};

const Q_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: "Text", SINGLE_CHOICE: "Multiple Choice", MULTIPLE_CHOICE: "Checkbox",
  RATING: "Rating", YES_NO: "Yes/No", NPS: "NPS",
};

function uid() { return Math.random().toString(36).slice(2, 9); }

function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.abs(y2 - y1);
  const cp = Math.max(50, dy * 0.45);
  return `M ${x1} ${y1} C ${x1} ${y1 + cp}, ${x2} ${y2 - cp}, ${x2} ${y2}`;
}

export default function LogicBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const updateSurveyMutation = useUpdateSurvey();
  const { data: survey, isLoading } = useSurvey(id);

  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [rules, setRules] = useState<LogicRule[]>([]);
  const [pan, setPan] = useState({ x: 80, y: 60 });
  const [zoom, setZoom] = useState(0.85);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<{
    qId: string; startMX: number; startMY: number; startNX: number; startNY: number;
  } | null>(null);
  const [panStart, setPanStart] = useState<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "rules">("canvas");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [newRuleFrom, setNewRuleFrom] = useState("");
  const [newRuleTo, setNewRuleTo] = useState("");
  const [newRuleCond, setNewRuleCond] = useState<"always" | "equals">("always");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [expandedType, setExpandedType] = useState<QuestionType | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);
  const hasUnsavedRef = useRef(false);

  useEffect(() => {
    if (survey && survey.mode === "linear") {
      navigate(`/surveys/admin/create/${id}`, { replace: true });
      toast.error("This survey uses Linear Builder. Switch to Linear Builder to edit.");
    }
  }, [survey, id, navigate]);

  useEffect(() => {
    if (survey?.questions) {
      console.log('[LogicBuilder] survey.questions loaded:', survey.questions.length, 'questions');
      const mapped = survey.questions.map((q: any, idx: number) => {
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

        return {
          id: q.id,
          type: q.type,
          label: q.label,
          order: q.order,
          required: q.required,
          options: opts,
          position: q.position || { x: 120 + (idx % 4) * 260, y: 80 + Math.floor(idx / 4) * 200 },
          parent_question_id: q.parent_question_id ?? undefined,
          trigger_option_id: q.trigger_option_id ?? undefined,
        };
      });
      setQuestions(mapped);

      const rulesCount = survey.questions.filter((sq: any) => sq.parent_question_id != null).length;
      console.log('[LogicBuilder] questions with parent_question_id in API data:', rulesCount);

      // Reconstruct rules from saved parent_question_id / trigger_option_id
      const savedRules: LogicRule[] = [];
      for (const q of mapped) {
        if (!q.parent_question_id) continue;

        console.log(`[LogicBuilder] reconstructing rule for q.id=${q.id} parent_question_id=${q.parent_question_id}`);

        // Try matching by DB ID first, then fallback to ORDER number
        let parentQ = mapped.find((mq: any) => mq.id === q.parent_question_id);
        if (!parentQ) {
          parentQ = mapped.find((mq: any) => mq.order === q.parent_question_id);
          console.log(`[LogicBuilder] DB ID match failed, trying ORDER fallback: found=${!!parentQ}`);
        }
        if (!parentQ) {
          console.log(`[LogicBuilder] could not find parent for q.id=${q.id} parent_question_id=${q.parent_question_id}`);
          continue;
        }

        let condition: "always" | "equals" = "always";
        let value = "";
        if (q.trigger_option_id) {
          // Try matching by option DB ID first, then by index
          let opt = parentQ.options.find((o: any) => o.id === q.trigger_option_id);
          if (!opt) {
            opt = parentQ.options[q.trigger_option_id];
          }
          if (opt) { condition = "equals"; value = opt.value; }
        }
        savedRules.push({ id: `r-${uid()}`, fromId: String(parentQ.id), toId: String(q.id), condition, value });
      }
      console.log('[LogicBuilder] reconstructed rules:', savedRules.length);
      setRules(savedRules);
    }
  }, [survey]);

  useEffect(() => {
    if (!isLoading && !survey) navigate("/surveys/admin");
  }, [survey, isLoading]);

  // Mark unsaved changes when questions or rules change
  useEffect(() => {
    if (id && survey) {
      hasUnsavedRef.current = true;
      setSaveStatus("saving");
    }
  }, [questions, rules]);

  const selected = questions.find((q) => String(q.id) === selectedId);

  function triggerSave() {
    setSaveStatus("saving");
    setTimeout(() => setSaveStatus("saved"), 600);
  }

  function toCanvasCoords(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (connectingFrom) { setConnectingFrom(null); return; }
    if ((e.target as Element).closest(".node-el")) return;
    if ((e.target as Element).closest(".port-el")) return;
    setPanStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
    setSelectedId(null);
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (draggingNode) {
      const dx = (e.clientX - draggingNode.startMX) / zoom;
      const dy = (e.clientY - draggingNode.startMY) / zoom;
      setQuestions((prev) =>
        prev.map((q) =>
          String(q.id) === draggingNode.qId
            ? { ...q, position: { x: Math.max(0, draggingNode.startNX + dx), y: Math.max(0, draggingNode.startNY + dy) } }
            : q
        )
      );
    }
    if (panStart) {
      setPan({ x: panStart.px + (e.clientX - panStart.mx), y: panStart.py + (e.clientY - panStart.my) });
    }
  }

  function handleCanvasMouseUp() {
    setDraggingNode(null);
    setPanStart(null);
  }

  function handleNodeMouseDown(e: React.MouseEvent, q: QuestionInput) {
    e.stopPropagation();
    setSelectedId(String(q.id));
    setDraggingNode({
      qId: String(q.id),
      startMX: e.clientX,
      startMY: e.clientY,
      startNX: q.position?.x ?? 0,
      startNY: q.position?.y ?? 0,
    });
  }

  function handlePortMouseDown(e: React.MouseEvent, qId: string) {
    e.stopPropagation();
    if (connectingFrom === qId) {
      setConnectingFrom(null);
    } else {
      setConnectingFrom(qId);
      setSelectedId(qId);
    }
  }

  function handlePortMouseUp(e: React.MouseEvent, qId: string) {
    e.stopPropagation();
    if (connectingFrom && connectingFrom !== qId) {
      if (!rules.find((r) => r.fromId === connectingFrom && r.toId === qId)) {
        setRules((prev) => [...prev, { id: `r-${uid()}`, fromId: connectingFrom, toId: qId, condition: "always", value: "" }]);
        triggerSave();
      }
      setConnectingFrom(null);
    }
  }

  function handleWheel(e: React.WheelEvent) {
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.min(2, Math.max(0.25, z + delta)));
  }

  function handleAddQuestion(type: QuestionType, subType?: string) {
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = rect ? (rect.width / 2 - pan.x) / zoom : 300;
    const cy = rect ? (rect.height / 2 - pan.y) / zoom : 200;
    const newId = Date.now() + Math.floor(Math.random() * 1000);

    let defaultOpts: OptionInput[] = [];
    let customLabel = `New ${Q_TYPE_LABELS[type]} Question`;

    if (subType === "short-text") {
      customLabel = "Short Answer Question [short]";
    } else if (subType === "long-text") {
      customLabel = "Long Answer Question [long]";
    } else if (subType === "yes-no") {
      defaultOpts = [{ label: "Yes", value: "yes", order: 1 }, { label: "No", value: "no", order: 2 }];
      customLabel = "Yes / No Question";
    } else if (subType === "thumbs-up-down") {
      defaultOpts = [{ label: "Thumbs Up", value: "thumbs_up", order: 1 }, { label: "Thumbs Down", value: "thumbs_down", order: 2 }];
      customLabel = "Thumbs Up / Down Question [thumbs]";
    } else if (subType === "multiple-choice") {
      defaultOpts = [{ label: "Option A", value: "option_a", order: 1 }, { label: "Option B", value: "option_b", order: 2 }, { label: "Option C", value: "option_c", order: 3 }];
      customLabel = "Multiple Choice Question";
    } else if (subType === "single-choice") {
      defaultOpts = [{ label: "Option A", value: "option_a", order: 1 }, { label: "Option B", value: "option_b", order: 2 }, { label: "Option C", value: "option_c", order: 3 }];
      customLabel = "Single Choice Question";
    } else if (subType === "dropdown") {
      defaultOpts = [{ label: "Option 1", value: "option_1", order: 1 }, { label: "Option 2", value: "option_2", order: 2 }, { label: "Option 3", value: "option_3", order: 3 }];
      customLabel = "Dropdown Question [dropdown]";
    } else if (subType === "star-rating") {
      customLabel = "Star Rating Question";
    } else if (subType === "emoji-scale") {
      customLabel = "Emoji Rating Question [emoji]";
    } else if (subType === "number-rating") {
      customLabel = "Number Rating Scale [number]";
    } else if (subType === "nps-score") {
      customLabel = "NPS Score Question";
    } else {
      defaultOpts = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
        ? [{ label: "Option A", value: "option_a", order: 1 }, { label: "Option B", value: "option_b", order: 2 }, { label: "Option C", value: "option_c", order: 3 }]
        : type === "YES_NO"
          ? [{ label: "Yes", value: "yes", order: 1 }, { label: "No", value: "no", order: 2 }]
          : [];
    }

    const newQ: QuestionInput = {
      id: newId,
      type,
      label: customLabel,
      order: questions.length + 1,
      required: false,
      options: defaultOpts,
      position: { x: Math.max(0, cx - NODE_W / 2), y: Math.max(0, cy - NODE_H / 2) },
    };
    setQuestions([...questions, newQ]);
    setSelectedId(String(newId));
    triggerSave();
  }

  function handleDeleteQuestion(qId: string) {
    setQuestions((prev) => prev.filter((q) => String(q.id) !== qId));
    setRules((prev) => prev.filter((r) => r.fromId !== qId && r.toId !== qId));
    if (selectedId === qId) setSelectedId(null);
    triggerSave();
  }

  function handleUpdateQuestionProp(qId: string, updates: Partial<QuestionInput>) {
    setQuestions((prev) => prev.map((q) => {
      if (String(q.id) !== qId) return q;
      const merged = { ...q, ...updates };
      if (updates.type && updates.type !== q.type && (!merged.options || merged.options.length === 0)) {
        merged.options = updates.type === "SINGLE_CHOICE" || updates.type === "MULTIPLE_CHOICE"
          ? [{ label: "Option A", value: "option_a", order: 1 }, { label: "Option B", value: "option_b", order: 2 }, { label: "Option C", value: "option_c", order: 3 }]
          : updates.type === "YES_NO"
            ? [{ label: "Yes", value: "yes", order: 1 }, { label: "No", value: "no", order: 2 }]
            : [];
      } else if (updates.label && q.type === "YES_NO" && (!merged.options || merged.options.length === 0)) {
        if (updates.label.toLowerCase().includes("thumbs")) {
          merged.options = [{ label: "Thumbs Up", value: "thumbs_up", order: 1 }, { label: "Thumbs Down", value: "thumbs_down", order: 2 }];
        } else {
          merged.options = [{ label: "Yes", value: "yes", order: 1 }, { label: "No", value: "no", order: 2 }];
        }
      }
      return merged;
    }));
    triggerSave();
  }

  function handleAddOption(qId: string) {
    const q = questions.find((q) => String(q.id) === qId);
    if (!q) return;
    const newOpt = { label: `Option ${q.options.length + 1}`, value: `option_${q.options.length + 1}`, order: q.options.length + 1 };
    handleUpdateQuestionProp(qId, { options: [...q.options, newOpt] });
  }

  function handleOptionChange(qId: string, optIdx: number, label: string) {
    const q = questions.find((q) => String(q.id) === qId);
    if (!q) return;
    const newOpts = [...q.options];
    newOpts[optIdx] = { ...newOpts[optIdx], label, value: label.toLowerCase().replace(/\s+/g, "_") };
    handleUpdateQuestionProp(qId, { options: newOpts });
  }

  function handleDeleteOption(qId: string, optIdx: number) {
    const q = questions.find((q) => String(q.id) === qId);
    if (!q) return;
    handleUpdateQuestionProp(qId, { options: q.options.filter((_, i) => i !== optIdx) });
  }

  function handleAddRule() {
    if (!newRuleFrom || !newRuleTo) return;
    if (!rules.find((r) => r.fromId === newRuleFrom && r.toId === newRuleTo)) {
      setRules((prev) => [...prev, { id: `r-${uid()}`, fromId: newRuleFrom, toId: newRuleTo, condition: newRuleCond, value: newRuleValue }]);
      triggerSave();
    }
    setNewRuleFrom(""); setNewRuleTo(""); setNewRuleCond("always"); setNewRuleValue("");
  }

  function handleDeleteRule(ruleId: string) {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    triggerSave();
  }

  async function handleSave() {
    if (!id) return;

    console.log('[LogicBuilder] handleSave called, rules.length:', rules.length);

    // Build a lookup of original rules from the raw API data (DB ID -> ORDER).
    // Used as fallback ONLY when no local rules were reconstructed — this prevents
    // accidentally wiping existing rules when reconstruction fails (stale cache, etc.).
    const origLookup = new Map<number, { parentOrder: number; triggerOptIdx?: number }>();
    if (survey?.questions) {
      for (const sq of survey.questions) {
        const sqId = typeof sq.id === 'number' ? sq.id : undefined;
        if (sqId && sq.parent_question_id) {
          const parentInSurvey = survey.questions.find((pq: any) => pq.id === sq.parent_question_id);
          if (parentInSurvey) {
            let triggerOptIdx: number | undefined;
            if (sq.trigger_option_id && parentInSurvey.options) {
              const oi = parentInSurvey.options.findIndex((o: any) => o.id === sq.trigger_option_id);
              if (oi >= 0) triggerOptIdx = oi;
            }
            origLookup.set(sqId, { parentOrder: parentInSurvey.order, triggerOptIdx });
          }
        }
      }
    }
    console.log('[LogicBuilder] origLookup built:', origLookup.size, 'entries');

    // If the API has rules but none were reconstructed, warn user.
    // If they confirm, we save as-is (user wants to delete all rules).
    // If they cancel, we preserve original rules via origLookup fallback.
    let useOrigFallback = false;
    if (origLookup.size > 0 && rules.length === 0) {
      console.log('[LogicBuilder] API has rules but local rules empty — showing warning dialog');
      useOrigFallback = !window.confirm(
        "This survey has existing logic rules that could not be loaded. " +
        "Click OK to save without rules (removes them), or Cancel to keep them unchanged."
      );
      console.log('[LogicBuilder] user chose origFallback:', useOrigFallback);
    }

    try {
      setSaveStatus("saving");
      const questionsPayload = questions.map((q) => {
        const rule = rules.find((r) => String(r.toId) === String(q.id));
        let parentQuestionOrder: number | undefined;
        let triggerOptIdx: number | undefined;

        if (rule) {
          const fromQ = questions.find((fq) => String(fq.id) === rule.fromId);
          if (fromQ) {
            parentQuestionOrder = fromQ.order;
            if (rule.condition === "equals" && rule.value) {
              const idx = fromQ.options.findIndex((o) => o.value === rule.value);
              if (idx >= 0) triggerOptIdx = idx;
            }
          }
        } else if (useOrigFallback && typeof q.id === 'number' && origLookup.has(q.id)) {
          const orig = origLookup.get(q.id)!;
          parentQuestionOrder = orig.parentOrder;
          triggerOptIdx = orig.triggerOptIdx;
        }

        return {
          id: q.id,
          type: q.type,
          label: q.label,
          order: q.order,
          required: q.required,
          options: q.options.length > 0 ? q.options : undefined,
          parent_question_id: parentQuestionOrder,
          trigger_option_id: triggerOptIdx,
        };
      });
      const hasRules = questionsPayload.some((q) => q.parent_question_id != null);
      console.log('[LogicBuilder] questionsPayload rules count:', questionsPayload.filter((q) => q.parent_question_id != null).length, 'out of', questionsPayload.length);
      console.log('[LogicBuilder] saving payload first question with rule:', questionsPayload.find((q) => q.parent_question_id != null));
      await updateSurveyMutation.mutateAsync({
        id,
        data: { title: survey?.title || "", description: survey?.description || undefined, questions: questionsPayload } as any,
      });
      toast.success("Survey saved!");
      setSaveStatus("saved");
      console.log('[LogicBuilder] save completed successfully');
    } catch (err) {
      console.error('[LogicBuilder] save failed:', err);
      toast.error("Failed to save survey");
      setSaveStatus("saved");
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!survey) return null;

  // Live connection line
  let liveLinePath = "";
  if (connectingFrom && canvasRef.current) {
    const src = questions.find((q) => String(q.id) === connectingFrom);
    if (src) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x1 = (src.position?.x ?? 0) + NODE_W / 2;
      const y1 = (src.position?.y ?? 0) + NODE_H;
      const x2 = (mousePos.x - rect.left - pan.x) / zoom;
      const y2 = (mousePos.y - rect.top - pan.y) / zoom;
      liveLinePath = getBezierPath(x1, y1, x2, y2);
    }
  }

  const MM_W = 160;
  const MM_H = 100;
  const mmScaleX = MM_W / CANVAS_W;
  const mmScaleY = MM_H / CANVAS_H;

  return (
    <div className="h-full flex overflow-hidden" style={{ minHeight: "calc(100vh - 64px)" }}>
      {/* LEFT PANEL */}
      <div className="flex flex-col shrink-0 w-[200px] bg-card border-r border-border">
        <div className="p-4 border-b border-border flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Questions</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/95 transition-all cursor-pointer shadow-sm shadow-primary-600/10"
          >
            <Plus size={13} /> Add Question
          </button>
        </div>
        <div className="p-3 flex flex-col gap-1.5 overflow-y-auto flex-1">
          <p className="text-[10px] px-1 font-bold text-muted-foreground uppercase tracking-wider mb-1">Quick Add</p>
          {Q_TYPES.map((qt) => {
            const hasSubtypes = qt.type === "TEXT" || qt.type === "SINGLE_CHOICE" || qt.type === "RATING";
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
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all hover:shadow-sm bg-muted border border-border hover:border-primary-200 cursor-pointer w-full ${isExpanded ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-sm flex items-center justify-center shrink-0 ${isExpanded ? "bg-white dark:bg-slate-800" : ""}`} style={{ background: isExpanded ? undefined : `${TYPE_COLORS[qt.type]}18` }}>
                      <qt.icon size={12} color={TYPE_COLORS[qt.type]} />
                    </div>
                    <p className="text-foreground text-xs font-semibold">{qt.label}</p>
                  </div>
                  {hasSubtypes && (
                    <ChevronDown size={12} className="text-muted-foreground transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }} />
                  )}
                </button>
                
                {hasSubtypes && isExpanded && (
                  <div className="pl-8 pr-1 py-1 flex flex-col gap-1.5 border-l-2 border-primary-100 dark:border-primary-800 ml-4 animate-fade-in">
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

      {/* CENTER */}
      <div className="flex-1 flex flex-col overflow-hidden bg-primary/[0.02] dark:bg-slate-900/50">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCancelConfirm(true)} className="icon-circle-btn">
              <ArrowLeft />
            </button>
            <div className="flex items-center p-0.5 rounded-lg gap-0.5 bg-muted">
              <button
                onClick={() => setViewMode("canvas")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${viewMode === "canvas" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                style={{
                  color: viewMode === "canvas" ? "#4F46E5" : "#6B7280",
                }}
              >
                <Layers size={11} /> Canvas
              </button>
              <button
                onClick={() => setViewMode("rules")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${viewMode === "rules" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                style={{
                  color: viewMode === "rules" ? "#4F46E5" : "#6B7280",
                }}
              >
                <LayoutGrid size={11} /> Rules
              </button>
            </div>
            <span className="text-muted-foreground text-[11px]">{questions.length} nodes · {rules.length} connections</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs dark:text-slate-400" style={{ color: saveStatus === "saved" ? "#059669" : "#D97706" }}>
              {saveStatus === "saved" ? <><Save size={12} /> Saved</> : <><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Unsaved</>}
            </div>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
              <ZoomIn size={13} />
            </button>
            <span className="text-xs text-muted-foreground min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
              <ZoomOut size={13} />
            </button>
            <button
              onClick={() => navigate(`/surveys/admin/preview/${id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors cursor-pointer"
            >
              <Eye size={11} /> Preview
            </button>
          </div>
        </div>

        {viewMode === "canvas" ? (
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden bg-[#f8f8ff] dark:bg-slate-900"
            style={{ cursor: panStart ? "grabbing" : connectingFrom ? "crosshair" : "grab" }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
          >
            {/* Dot grid */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <defs>
                <pattern id="dot-grid-light" width={24 * zoom} height={24 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (24 * zoom)} y={pan.y % (24 * zoom)}>
                  <circle cx={1.5} cy={1.5} r={1} fill="rgba(79,70,229,0.12)" />
                </pattern>
                <pattern id="dot-grid-dark" width={24 * zoom} height={24 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (24 * zoom)} y={pan.y % (24 * zoom)}>
                  <circle cx={1.5} cy={1.5} r={1} fill="rgba(255,255,255,0.06)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dot-grid-light)" className="dark:hidden" />
              <rect width="100%" height="100%" fill="url(#dot-grid-dark)" className="hidden dark:block" />
            </svg>

            {/* World */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                position: "absolute",
                width: CANVAS_W,
                height: CANVAS_H,
              }}
            >
              {/* SVG connections layer */}
              <svg style={{ position: "absolute", inset: 0, width: CANVAS_W, height: CANVAS_H, overflow: "visible", pointerEvents: "none" }}>
                {rules.map((rule) => {
                  const from = questions.find((q) => String(q.id) === rule.fromId);
                  const to = questions.find((q) => String(q.id) === rule.toId);
                  if (!from || !to) return null;
                  const x1 = (from.position?.x ?? 0) + NODE_W / 2;
                  const y1 = (from.position?.y ?? 0) + NODE_H;
                  const x2 = (to.position?.x ?? 0) + NODE_W / 2;
                  const y2 = to.position?.y ?? 0;
                  const path = getBezierPath(x1, y1, x2, y2);
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2 - 10;
                  return (
                    <g key={rule.id}>
                      <path d={path} stroke={rule.condition === "equals" ? "#F59E0B" : "#A5B4FC"} strokeWidth={2.5} fill="none" strokeDasharray={rule.condition === "equals" ? "6 3" : "none"} />
                      {/* Arrow head */}
                      <circle cx={x2} cy={y2} r={5} fill={rule.condition === "equals" ? "#F59E0B" : "#4F46E5"} />
                      {rule.condition === "equals" && rule.value && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect x={-45} y={-12} width={90} height={24} rx={6} fill="#fff" className="dark:fill-slate-800" stroke="#FDE68A" strokeWidth={1} />
                          <text textAnchor="middle" y={5} fontSize={10} fill="#D97706" fontWeight={600}>= "{rule.value.slice(0, 14)}"</text>
                        </g>
                      )}
                      {rule.condition === "always" && (
                        <g transform={`translate(${midX}, ${midY + 8})`}>
                          <rect x={-28} y={-8} width={56} height={16} rx={4} fill="#EEF2FF" className="dark:fill-indigo-950/40" />
                          <text textAnchor="middle" y={4} fontSize={9} fill="#4F46E5">always</text>
                        </g>
                      )}
                    </g>
                  );
                })}
                {liveLinePath && (
                  <path d={liveLinePath} stroke="#4F46E5" strokeWidth={2.5} fill="none" strokeDasharray="6 4" opacity={0.6} />
                )}
              </svg>

              {/* Nodes */}
              {questions.map((q, idx) => {
                const qId = String(q.id);
                const isSelected = selectedId === qId;
                const typeColor = TYPE_COLORS[q.type] || "#6B7280";
                const TypeIcon = Q_TYPES.find((t) => t.type === q.type)?.icon ?? AlignLeft;
                const pos = q.position || { x: 200 + (idx % 4) * 260, y: 80 + Math.floor(idx / 4) * 200 };
                const hasRulesFrom = rules.filter((r) => r.fromId === qId).length;
                const hasRulesTo = rules.filter((r) => r.toId === qId).length;

                return (
                  <div
                    key={qId}
                    className="node-el absolute select-none"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      width: NODE_W,
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, q)}
                  >
                    {/* Input port (top) */}
                    <div
                      className={`port-el flex items-center justify-center absolute left-1/2 -translate-x-1/2 ${connectingFrom ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-white dark:bg-slate-800"}`}
                      style={{
                        top: -10,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: `2.5px solid ${hasRulesTo > 0 ? "#4F46E5" : "#C7D2FE"}`,
                        cursor: "crosshair",
                        zIndex: 20,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => handlePortMouseUp(e, qId)}
                    >
                      <div className="w-2 h-2 rounded-full dark:bg-slate-400" style={{ background: hasRulesTo > 0 ? "#4F46E5" : "#C7D2FE" }} />
                    </div>

                    {/* Node body */}
                    <div
                      className={`rounded-lg overflow-hidden bg-white dark:bg-slate-800 border-2 shadow-sm ${isSelected ? "" : "border-black/10 dark:border-slate-700"}`}
                      style={{
                        borderColor: isSelected ? "#4F46E5" : undefined,
                        boxShadow: isSelected
                          ? "0 0 0 3px rgba(79,70,229,0.15), 0 4px 20px rgba(0,0,0,0.12)"
                          : undefined,
                        transition: "box-shadow 0.15s, border-color 0.15s",
                      }}
                    >
                      {/* Color strip */}
                      <div style={{ height: 4, background: typeColor }} />

                      {/* Header */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFBFC] dark:bg-slate-800/80">
                        <div className="w-5 h-5 rounded-sm flex items-center justify-center shrink-0" style={{ background: `${typeColor}15` }}>
                          <TypeIcon size={10} color={typeColor} />
                        </div>
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                          Q{idx + 1} · {
                            q.type === "TEXT" && q.label.toLowerCase().includes("short") ? "Short Text" :
                            q.type === "TEXT" ? "Long Text" :
                            q.type === "SINGLE_CHOICE" && q.label.toLowerCase().includes("dropdown") ? "Dropdown" :
                            q.type === "RATING" && q.label.toLowerCase().includes("emoji") ? "Emoji Scale" :
                            q.type === "RATING" && q.label.toLowerCase().includes("number") ? "1-10 Rating" :
                            Q_TYPE_LABELS[q.type]
                          }
                        </span>
                      </div>

                      {/* Question text */}
                      <div className="px-3 py-2.5 min-h-[36px] flex items-center border-t border-black/4 dark:border-white/5">
                        <p className="text-foreground text-xs font-medium leading-relaxed line-clamp-2">
                          {q.label || "Untitled question"}
                        </p>
                      </div>

                      {/* Options preview for choice types */}
                      {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && q.options.length > 0 && (
                        <div className="px-3 pb-2 flex flex-wrap gap-1 border-t border-black/4 dark:border-white/5">
                          {q.options.slice(0, 3).map((o, oi) => (
                            <span key={oi} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: `${typeColor}10`, color: typeColor }}>
                              {o.label}
                            </span>
                          ))}
                          {q.options.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{q.options.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Output port (bottom) */}
                    <div
                      className="port-el flex items-center justify-center absolute left-1/2 -translate-x-1/2 cursor-crosshair bg-white dark:bg-slate-800"
                      style={{
                        bottom: -10,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: connectingFrom === qId ? "#4F46E5" : "",
                        border: `2.5px solid ${connectingFrom === qId ? "#4F46E5" : hasRulesFrom > 0 ? "#4F46E5" : "#C7D2FE"}`,
                        zIndex: 20,
                      }}
                      onMouseDown={(e) => handlePortMouseDown(e, qId)}
                      onMouseUp={(e) => handlePortMouseUp(e, qId)}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: connectingFrom === qId ? "#fff" : hasRulesFrom > 0 ? "#4F46E5" : "#C7D2FE" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {questions.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-primary/10">
                  <GitBranch size={28} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-semibold text-sm">No nodes yet</p>
                  <p className="text-muted-foreground text-xs mt-1">Add questions from the left panel to build your flow.</p>
                </div>
              </div>
            )}

            {/* Mini-map */}
            {questions.length > 0 && (
              <div
                className="absolute bottom-4 right-4 rounded-lg overflow-hidden bg-white/92 dark:bg-slate-800/90 border border-black/10 dark:border-slate-700 shadow-lg"
                style={{
                  width: MM_W, height: MM_H,
                }}
              >
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  {/* Viewport indicator */}
                  <div
                    style={{
                      position: "absolute",
                      left: (-pan.x / zoom) * mmScaleX,
                      top: (-pan.y / zoom) * mmScaleY,
                      width: ((canvasRef.current?.offsetWidth ?? 600) / zoom) * mmScaleX,
                      height: ((canvasRef.current?.offsetHeight ?? 400) / zoom) * mmScaleY,
                      border: "1.5px solid #4F46E5",
                      background: "rgba(79,70,229,0.06)",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Node dots */}
                  {questions.map((q) => {
                    const p = q.position || { x: 0, y: 0 };
                    return (
                      <div
                        key={`mm-${q.id}`}
                        style={{
                          position: "absolute",
                          left: p.x * mmScaleX,
                          top: p.y * mmScaleY,
                          width: NODE_W * mmScaleX,
                          height: NODE_H * mmScaleY,
                          background: TYPE_COLORS[q.type] || "#6B7280",
                          borderRadius: 2,
                          opacity: 0.7,
                        }}
                      />
                    );
                  })}
                  {/* Connection lines in minimap */}
                  <svg style={{ position: "absolute", inset: 0, width: MM_W, height: MM_H, pointerEvents: "none" }}>
                    {rules.map((rule) => {
                      const from = questions.find((q) => String(q.id) === rule.fromId);
                      const to = questions.find((q) => String(q.id) === rule.toId);
                      if (!from || !to) return null;
                      const x1 = ((from.position?.x ?? 0) + NODE_W / 2) * mmScaleX;
                      const y1 = ((from.position?.y ?? 0) + NODE_H) * mmScaleY;
                      const x2 = ((to.position?.x ?? 0) + NODE_W / 2) * mmScaleX;
                      const y2 = (to.position?.y ?? 0) * mmScaleY;
                      const dy = Math.abs(y2 - y1);
                      const cp = Math.max(10, dy * 0.3) * mmScaleY;
                      return (
                        <path
                          key={`mm-${rule.id}`}
                          d={`M ${x1} ${y1} C ${x1} ${y1 + cp}, ${x2} ${y2 - cp}, ${x2} ${y2}`}
                          stroke={rule.condition === "equals" ? "#F59E0B" : "#A5B4FC"}
                          strokeWidth={1.5}
                          fill="none"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RULES VIEW */
          <div className="flex-1 overflow-y-auto p-5">
            <div className="max-w-2xl mx-auto">
              <div className="rounded-lg overflow-hidden bg-card border border-border">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-semibold text-sm text-foreground">Logic Rules</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Define conditions that determine the survey path.</p>
                </div>

                {/* Add rule form */}
                <div className="p-4 flex flex-col gap-3 border-b border-border bg-muted/50">
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">Add Rule</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newRuleFrom} onChange={(val) => setNewRuleFrom(val)} placeholder="Select question" label="From" options={questions.map((q, i) => ({ value: String(q.id), label: `Q${i + 1}: ${(q.label || "").slice(0, 30)}` }))} />
                    <Select value={newRuleTo} onChange={(val) => setNewRuleTo(val)} placeholder="Select question" label="To" options={questions.map((q, i) => ({ value: String(q.id), label: `Q${i + 1}: ${(q.label || "").slice(0, 30)}` }))} />
                    <Select value={newRuleCond} onChange={(val) => setNewRuleCond(val as "always" | "equals")} label="Condition" options={[{ value: "always", label: "Always" }, { value: "equals", label: "Answer equals" }]} />
                    {newRuleCond === "equals" && (() => {
                      const srcQ = questions.find((q) => String(q.id) === newRuleFrom);
                      const hasOptions = srcQ && srcQ.options.length > 0;
                      if (!newRuleFrom) {
                        return <p className="text-muted-foreground text-[10px] italic">Select a source question first.</p>;
                      } else if (!hasOptions) {
                        return <p className="text-amber-600 text-[10px] italic">This question type has no options. Use a choice-type question (Multiple Choice, Checkbox, Yes/No).</p>;
                      }
                      return <Select value={newRuleValue} onChange={(val) => setNewRuleValue(val)} label="When answer is" placeholder="Select option..." options={srcQ!.options.map((o) => ({ value: o.value, label: o.label }))} />;
                    })()}
                  </div>
                  <button onClick={handleAddRule} className="self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-primary hover:bg-primary/95 transition-all cursor-pointer">
                    <Plus size={11} /> Add Rule
                  </button>
                </div>

                {/* Rule list */}
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {rules.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground text-xs">No rules yet. Add rules above or connect nodes on the canvas.</p>
                    </div>
                  ) : rules.map((rule) => {
                    const fromIdx = questions.findIndex((q) => String(q.id) === rule.fromId);
                    const toIdx = questions.findIndex((q) => String(q.id) === rule.toId);
                    const fromQ = questions[fromIdx];
                    const toQ = questions[toIdx];
                    return (
                      <div key={rule.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            Q{fromIdx + 1}: {(fromQ?.label || "—").slice(0, 20)}
                          </span>
                          <span className="text-muted-foreground text-[11px]">→</span>
                          {rule.condition === "equals" && (
                            <>
                              <span className="px-2 py-0.5 rounded text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">if "{rule.value}"</span>
                              <span className="text-muted-foreground text-[11px]">→</span>
                            </>
                          )}
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            Q{toIdx + 1}: {(toQ?.label || "—").slice(0, 20)}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteRule(rule.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-col shrink-0 w-[260px] bg-card border-l border-border">
        <div className="p-4 border-b border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {selected ? "Node Properties" : "Properties"}
          </p>
        </div>
        {selected ? (
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
            <div>
              <label className="text-muted-foreground text-xs font-medium block mb-1.5">Question Text</label>
              <textarea
                value={selected.label.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "")}
                onChange={(e) => {
                  const match = selected.label.match(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i);
                  const suffix = match ? match[0] : "";
                  handleUpdateQuestionProp(selectedId!, { label: e.target.value + suffix });
                }}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none bg-muted border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary-400 dark:focus:ring-primary-700"
              />
            </div>
            <Select value={selected.type} onChange={(val) => handleUpdateQuestionProp(selectedId!, { type: val as QuestionType })} label="Type" options={Q_TYPES.map((t) => ({ value: t.type, label: t.label }))} />
            
            {/* Subtype Dropdown */}
            {(selected.type === "TEXT" || selected.type === "SINGLE_CHOICE" || selected.type === "RATING" || selected.type === "YES_NO") && (
              <Select
                value={
                  selected.type === "TEXT" && selected.label.toLowerCase().includes("[short]") ? "short-text" :
                  selected.type === "TEXT" && selected.label.toLowerCase().includes("[long]") ? "long-text" :
                  selected.type === "TEXT" && selected.label.toLowerCase().includes("short") ? "short-text" :
                  selected.type === "TEXT" ? "long-text" :
                  selected.type === "SINGLE_CHOICE" && selected.label.toLowerCase().includes("dropdown") ? "dropdown" :
                  selected.type === "SINGLE_CHOICE" ? "single-choice" :
                  selected.type === "RATING" && selected.label.toLowerCase().includes("emoji") ? "emoji-scale" :
                  selected.type === "RATING" && selected.label.toLowerCase().includes("number") ? "number-rating" :
                  selected.type === "RATING" ? "star-rating" :
                  selected.type === "YES_NO" && selected.label.toLowerCase().includes("thumbs") ? "thumbs-up-down" :
                  "yes-no"
                }
                onChange={(newSub) => {
                  let baseLabel = selected.label.replace(/\s*\[(short|long|dropdown|emoji|number|star|thumbs)\]\s*$/i, "");
                  let suffix = "";
                  if (newSub === "short-text") suffix = " [short]";
                  else if (newSub === "long-text") suffix = " [long]";
                  else if (newSub === "dropdown") suffix = " [dropdown]";
                  else if (newSub === "emoji-scale") suffix = " [emoji]";
                  else if (newSub === "number-rating") suffix = " [number]";
                  else if (newSub === "star-rating") suffix = " [star]";
                  else if (newSub === "thumbs-up-down") suffix = " [thumbs]";
                  else if (newSub === "yes-no") suffix = " [yes-no]";
                  handleUpdateQuestionProp(selectedId!, { label: baseLabel + suffix });
                }}
                label="Subtype / Layout"
                options={
                  selected.type === "TEXT"
                    ? [{ value: "short-text", label: "Short Text" }, { value: "long-text", label: "Long Text" }]
                    : selected.type === "SINGLE_CHOICE"
                      ? [{ value: "single-choice", label: "Radio Buttons" }, { value: "dropdown", label: "Dropdown Selector" }]
                      : selected.type === "RATING"
                        ? [{ value: "star-rating", label: "Star Rating" }, { value: "emoji-scale", label: "Emoji Scale" }, { value: "number-rating", label: "1-10 Scale" }]
                        : [{ value: "yes-no", label: "Standard Buttons" }, { value: "thumbs-up-down", label: "Thumbs Up / Down" }]
                }
              />
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="logic-req"
                checked={selected.required}
                onChange={(e) => handleUpdateQuestionProp(selectedId!, { required: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-primary accent-primary-600 cursor-pointer"
              />
              <label htmlFor="logic-req" className="text-xs text-muted-foreground cursor-pointer">Required</label>
            </div>
            {(selected.type === "SINGLE_CHOICE" || selected.type === "MULTIPLE_CHOICE") && (
              <div>
                {selected.type === "SINGLE_CHOICE" && selected.label.toLowerCase().includes("dropdown") && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-primary/10 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-800 text-[10px] text-primary font-medium flex items-center gap-1.5 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                    Styled as a Selection Dropdown Menu
                  </div>
                )}
                <label className="text-muted-foreground text-xs font-medium block mb-1.5">Options</label>
                <div className="flex flex-col gap-1.5">
                  {selected.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-1.5">
                      <input
                        value={opt.label}
                        onChange={(e) => handleOptionChange(selectedId!, oi, e.target.value)}
                        className="flex-1 px-2 py-1 rounded-lg text-xs outline-none bg-muted border border-border text-foreground focus:border-primary"
                      />
                      <button onClick={() => handleDeleteOption(selectedId!, oi)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors cursor-pointer">
                        <Minus size={11} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => handleAddOption(selectedId!)} className="flex items-center gap-1 text-xs mt-1 text-primary hover:text-primary cursor-pointer">
                    <Plus size={10} /> Add option
                  </button>
                </div>
              </div>
            )}

            {selected.type === "RATING" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-medium block">Rating Style Preview</label>
                {selected.label.toLowerCase().includes("emoji") ? (
                  <div className="flex flex-col gap-1 bg-muted p-2 rounded-lg border border-border">
                    <p className="text-muted-foreground text-[10px]">Emoji sentiment scale:</p>
                    <div className="flex gap-1.5 text-xl">
                      <span>😢</span><span>🙁</span><span>😐</span><span>🙂</span><span>😄</span>
                    </div>
                  </div>
                ) : selected.label.toLowerCase().includes("number") ? (
                  <div className="flex flex-col gap-1 bg-muted p-2 rounded-lg border border-border">
                    <p className="text-muted-foreground text-[10px]">Numeric scale (1–10):</p>
                    <div className="flex gap-1 flex-wrap">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <span key={n} className="w-5 h-5 rounded bg-card border text-[9px] flex items-center justify-center font-bold text-muted-foreground">{n}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 bg-muted p-2 rounded-lg border border-border">
                    <p className="text-muted-foreground text-[10px]">Star rating scale (1–5):</p>
                    <div className="flex gap-1 text-amber-400">
                      <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs font-medium mb-1.5">Connections</p>
              {rules.filter((r) => r.fromId === selectedId || r.toId === selectedId).length === 0 ? (
                <p className="text-muted-foreground text-[11px]">Use the ● port below the node to connect to another node.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {rules.filter((r) => r.fromId === selectedId || r.toId === selectedId).map((r) => {
                    const isFrom = r.fromId === selectedId;
                    const other = questions.find((q) => String(q.id) === (isFrom ? r.toId : r.fromId));
                    const otherIdx = questions.findIndex((q) => String(q.id) === (isFrom ? r.toId : r.fromId));
                    return (
                      <div key={r.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted border border-border">
                        <span className="text-gray-600 dark:text-slate-300 text-[11px] font-medium">
                          {isFrom ? "→" : "←"} Q{otherIdx + 1}
                          {r.condition === "equals" && <span className="text-amber-600 ml-1">= {r.value}</span>}
                        </span>
                        <button onClick={() => handleDeleteRule(r.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors cursor-pointer">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => handleDeleteQuestion(selectedId!)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all cursor-pointer border border-red-100 dark:border-red-900"
              >
                <Trash2 size={13} /> Delete Question
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 bg-muted">
              <GitBranch size={20} className="text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-muted-foreground text-xs">Click a node to edit its properties.</p>
            {connectingFrom && (
              <div className="mt-4 px-3 py-2 rounded-lg text-xs text-center bg-primary/10 text-primary font-medium">
                Click another node's input ● to connect, or click canvas to cancel.
              </div>
            )}
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
        title="Exit Logic Builder?"
        message="Are you sure you want to exit? Any unsaved logic rules or branch configurations will be lost."
        confirmLabel="Exit"
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

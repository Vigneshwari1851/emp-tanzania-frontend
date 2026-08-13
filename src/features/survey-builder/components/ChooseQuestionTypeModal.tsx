import { useState } from "react";
import {
  X, Type, AlignLeft, CheckSquare, List, ToggleLeft, 
  ChevronDown, Star, Smile, BarChart2, Zap
} from "lucide-react";
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING" | "YES_NO" | "NPS";

interface SubtypeCard {
  id: string;
  label: string;
  desc: string;
  example: string;
  type: QuestionType;
  icon: any;
}

interface TabCategory {
  id: string;
  label: string;
  count: number;
  subtypes: SubtypeCard[];
}

interface ChooseQuestionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: QuestionType, subType?: string) => void;
}

export default function ChooseQuestionTypeModal({ isOpen, onClose, onSelect }: ChooseQuestionTypeModalProps) {
  const [activeTab, setActiveTab] = useState<string>("text-input");

  if (!isOpen) return null;

  const categories: TabCategory[] = [
    {
      id: "text-input",
      label: "Text Input",
      count: 2,
      subtypes: [
        {
          id: "short-text",
          label: "Short Text",
          desc: "Text field one-line answer",
          example: '"What is your job title?"',
          type: "TEXT",
          icon: Type,
        },
        {
          id: "long-text",
          label: "Long Text",
          desc: "Text field multi-line answer",
          example: '"What could we improve about your experience?"',
          type: "TEXT",
          icon: AlignLeft,
        },
      ],
    },
    {
      id: "choice",
      label: "Choice",
      count: 5,
      subtypes: [
        {
          id: "multiple-choice",
          label: "Multiple Choice",
          desc: "Select all that apply (checkboxes)",
          example: '"Which of these features have you used? (Select all that apply)"',
          type: "MULTIPLE_CHOICE",
          icon: CheckSquare,
        },
        {
          id: "single-choice",
          label: "Single Choice",
          desc: "Pick exactly one option (radio)",
          example: '"What is your primary reason for using this product?"',
          type: "SINGLE_CHOICE",
          icon: List,
        },
        {
          id: "yes-no",
          label: "Yes / No",
          desc: "Pick one, prefilled with Yes and No options",
          example: '"Are you satisfied with our product?"',
          type: "YES_NO",
          icon: ToggleLeft,
        },
        {
          id: "dropdown",
          label: "Dropdown",
          desc: "One option from a long list",
          example: '"Which country are you based in?"',
          type: "SINGLE_CHOICE",
          icon: ChevronDown,
        },
      ],
    },
    {
      id: "rating",
      label: "Rating",
      count: 3,
      subtypes: [
        {
          id: "star-rating",
          label: "Star Rating",
          desc: "Star-based rating scale (e.g. 1 - 5 stars)",
          example: '"How would you rate your overall experience?"',
          type: "RATING",
          icon: Star,
        },
        {
          id: "emoji-scale",
          label: "Emoji Scale",
          desc: "Emoji mood / sentiment scale",
          example: '"How are you feeling about the new dashboard?"',
          type: "RATING",
          icon: Smile,
        },
        {
          id: "number-rating",
          label: "Number Rating Scale",
          desc: "Numeric scale (e.g. 1 - 10)",
          example: '"On a scale of 1-10, how satisfied are you with our support?"',
          type: "RATING",
          icon: BarChart2,
        },
      ],
    },
    {
      id: "nps",
      label: "NPS",
      count: 1,
      subtypes: [
        {
          id: "nps-score",
          label: "NPS Score",
          desc: "0-10 likelihood to recommend",
          example: '"How likely are you to recommend us to a friend or colleague?"',
          type: "NPS",
          icon: BarChart2,
        },
      ],
    },
  ];

  const currentCategory = categories.find((c) => c.id === activeTab) || categories[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      {/* Modal Container Card */}
      <div className="bg-card rounded-lg w-full max-w-4xl shadow-sm border border-border/60 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Zap size={16} fill="currentColor" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Choose Question Type</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Header Selector */}
        <div className="px-8 py-4 bg-muted/50 border-b border-border flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
          {categories.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm shadow-primary-600/10"
                    : "bg-card text-slate-600 dark:text-slate-300 border-border hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {cat.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-sm font-extrabold ${
                    isActive ? "bg-primary/95 text-primary-100" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cards Grid Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCategory.subtypes.map((sub) => {
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    onSelect(sub.type, sub.id);
                    onClose();
                  }}
                  className="group rounded-lg p-5 text-left transition-all bg-card border border-border hover:border-primary-500 hover:shadow-sm hover:shadow-slate-100/50 dark:hover:shadow-slate-900/50 cursor-pointer flex flex-col justify-between min-h-[180px]"
                >
                  <div className="space-y-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {sub.label}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                        {sub.desc}
                      </p>
                    </div>
                  </div>

                  {/* Example block */}
                  <div className="mt-4 pt-3 border-t border-border w-full">
                    <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">Example</span>
                    <p className="text-[11px] text-muted-foreground italic mt-1 font-medium truncate">
                      {sub.example}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

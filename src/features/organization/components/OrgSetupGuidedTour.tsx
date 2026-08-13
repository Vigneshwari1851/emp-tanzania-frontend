import React, { useState } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Building2, Network, Users, MapPin,
  ArrowRight, ArrowLeft, X, Sparkles,
  CheckCircle2, ChevronRight, Rocket,
  Settings2, Briefcase, Globe, Calendar,
  DollarSign, Wallet, TrendingUp
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  visual: React.ReactNode;
  action?: { label: string; path: string };
}

interface OrgSetupGuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

export function OrgSetupGuidedTour({ isOpen, onClose, isFirstTime = false }: OrgSetupGuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useOrgNavigate();

  const steps: TourStep[] = [
    {
      icon: <Sparkles className="w-7 h-7 text-amber-500" />,
      title: "Welcome to Org Setup",
      subtitle: "Your organization blueprint starts here",
      description: "This guided tour will walk you through setting up your complete organizational structure — from legal entity details to department hierarchies and job designations.",
      tips: [
        "Complete each section in order for the smoothest experience",
        "You can save progress and return anytime",
        "All settings can be modified later as your organization evolves"
      ],
      visual: (
        <div className="relative">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Settings2 className="w-5 h-5" />, label: "Company Info", color: "from-blue-500 to-primary-600" },
              { icon: <Network className="w-5 h-5" />, label: "Job Hierarchy", color: "from-violet-500 to-purple-600" },
              { icon: <Building2 className="w-5 h-5" />, label: "Departments", color: "from-emerald-500 to-teal-600" },
              { icon: <DollarSign className="w-5 h-5" />, label: "Cost Centres", color: "from-amber-500 to-orange-600" },
              { icon: <Globe className="w-5 h-5" />, label: "Locations", color: "from-teal-500 to-cyan-600" },
              { icon: <Users className="w-5 h-5" />, label: "Employees", color: "from-rose-500 to-red-500" },
            ].map((item, i) => (
              <div key={i} className={`bg-gradient-to-br ${item.color} text-white rounded-xl p-3.5 flex items-center gap-3 shadow-lg transform hover:scale-105 transition-transform`}>
                <div className="bg-white/20 rounded-lg p-1.5">{item.icon}</div>
                <span className="text-[12px] font-bold">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 rounded-full px-2 py-0.5 text-[10px] font-bold animate-bounce shadow-md">
            START HERE
          </div>
        </div>
      )
    },
    {
      icon: <Settings2 className="w-7 h-7 text-blue-600" />,
      title: "Step 1: Company Information",
      subtitle: "Legal, tax, and identity details",
      description: "Begin by configuring your company's foundational information. This includes your legal entity name, registration numbers, tax identifiers, and company logo.",
      tips: [
        "Navigate to Org Settings → Legal & Tax tab",
        "Upload your company logo for branding across the platform",
        "Set your registered country to auto-configure tax fields (PAN, GSTIN for India, EIN for US, etc.)",
        "Choose your company type (Private Ltd, LLP, etc.)"
      ],
      visual: (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-primary-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="h-3 w-36 bg-foreground/10 rounded-full" />
              <div className="h-2 w-24 bg-foreground/5 rounded-full mt-2" />
            </div>
          </div>
          {["Company Name", "Registration No.", "Tax ID (PAN/EIN)", "Country"].map((field, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-[12px] text-muted-foreground font-medium">{field}</span>
              <div className={`h-2.5 rounded-full bg-gradient-to-r ${i < 2 ? "from-emerald-200 to-emerald-300 w-28" : "from-muted to-muted w-20"}`} />
            </div>
          ))}
        </div>
      ),
      action: { label: "Go to Company Settings", path: "/org-setup/settings" }
    },
    {
      icon: <Network className="w-7 h-7 text-violet-600" />,
      title: "Step 2: Job Hierarchy",
      subtitle: "Define your leadership & role structure",
      description: "Before creating departments, define the executive leadership layer. Start with your top-level roles (CEO, MD, Director) and build the reporting chain downward.",
      tips: [
        "Use the Setup Wizard for a guided experience",
        "Start with the CEO/MD as the root node",
        "Add management layers: VP → Director → Manager → Lead",
        "These designations become available when assigning employees"
      ],
      visual: (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-col items-center">
            {/* CEO */}
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg px-4 py-2 text-[12px] font-bold shadow-md flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px]">👤</div>
              CEO / Managing Director
            </div>
            <div className="w-px h-4 bg-violet-300" />
            {/* VPs */}
            <div className="flex gap-6">
              {["VP Engineering", "VP Sales", "VP Operations"].map((role, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-px h-3 bg-primary-300" />
                  <div className="bg-primary-100 text-primary-700 rounded-lg px-3 py-1.5 text-[11px] font-bold border border-primary-200 whitespace-nowrap">
                    {role}
                  </div>
                  <div className="w-px h-3 bg-primary-200" />
                  <div className="bg-blue-50 text-primaryrounded px-2 py-1 text-[10px] font-medium border border-blue-100">
                    Manager
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      action: { label: "Open Setup Wizard", path: "/org-setup/job-hierarchy-setup" }
    },
    {
      icon: <Building2 className="w-7 h-7 text-emerald-600" />,
      title: "Step 3: Departments & Teams",
      subtitle: "Build your organizational units",
      description: "Create departments that represent your organizational divisions. Each department can have teams, cost centers, and designated leadership.",
      tips: [
        "Navigate to Org Setup → Add Department",
        "Set department head from your existing designations",
        "Create teams within departments for granular management",
        "Assign cost centers for financial tracking"
      ],
      visual: (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
          {[
            { name: "Engineering", teams: 3, color: "bg-emerald-500", badge: "12 members" },
            { name: "Sales & Marketing", teams: 2, color: "bg-blue-500", badge: "8 members" },
            { name: "Human Resources", teams: 1, color: "bg-violet-500", badge: "5 members" },
          ].map((dept, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
              <div className={`w-2 h-8 rounded-full ${dept.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-foreground">{dept.name}</div>
                <div className="text-[11px] text-muted-foreground">{dept.teams} teams</div>
              </div>
              <span className="text-[10px] font-semibold bg-muted rounded-full px-2 py-0.5 text-muted-foreground">{dept.badge}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      ),
      action: { label: "Add First Department", path: "/org-setup/add-department" }
    },
    {
      icon: <DollarSign className="w-7 h-7 text-amber-600" />,
      title: "Step 4: Cost Centres",
      subtitle: "Financial tracking & budget allocation",
      description: "Define cost centres to track expenditures across your organization. Each department or function can be mapped to a cost centre for financial reporting and expense allocation.",
      tips: [
        "Go to Org Settings → Organizational tab → Cost Centres section",
        "Use codes like CC-100, CC-200 for easy identification",
        "Map cost centres to departments during department setup",
        "Budget allocation will be done by the Finance team later"
      ],
      visual: (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          {/* Cost centre list */}
          <div className="space-y-2">
            {[
              { code: "CC-100", name: "Engineering & Product", dept: "Engineering", color: "bg-emerald-500" },
              { code: "CC-200", name: "Sales & Marketing", dept: "Sales", color: "bg-blue-500" },
              { code: "CC-300", name: "People & Culture", dept: "HR", color: "bg-violet-500" },
              { code: "CC-400", name: "General & Admin", dept: "Operations", color: "bg-amber-500" },
            ].map((cc, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 group">
                <div className={`w-1.5 h-8 rounded-full ${cc.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">{cc.code}</span>
                    <span className="text-[12px] font-semibold text-foreground">{cc.name}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground font-medium">{cc.dept}</span>
              </div>
            ))}
          </div>
          {/* Budget note */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[11px] text-muted-foreground"><strong>Budgets</strong> will be assigned by Finance after setup</span>
          </div>
        </div>
      ),
      action: { label: "Setup Cost Centres", path: "/org-setup/settings" }
    },
    {
      icon: <Globe className="w-7 h-7 text-teal-600" />,
      title: "Step 5: Locations & Calendar",
      subtitle: "Geography and working schedule",
      description: "Configure your office locations, time zones, and working calendar. Set public holidays, work shifts, and attendance rules for each location.",
      tips: [
        "Add all office locations with addresses",
        "Set default work hours and shifts per location",
        "Configure public holidays for accurate leave calculations",
        "Define weekly off patterns (Mon-Fri, Mon-Sat, etc.)"
      ],
      visual: (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span className="text-[12px] font-bold text-foreground">Locations</span>
              </div>
              <div className="space-y-1.5">
                {["HQ - Mumbai", "Branch - Bangalore", "Remote"].map((loc, i) => (
                  <div key={i} className="text-[11px] bg-muted/50 rounded px-2 py-1 text-muted-foreground font-medium">{loc}</div>
                ))}
              </div>
            </div>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span className="text-[12px] font-bold text-foreground">Calendar</span>
              </div>
              <div className="space-y-1.5">
                {["Mon-Fri (9-6)", "12 Public Holidays", "Flexible Shifts"].map((item, i) => (
                  <div key={i} className="text-[11px] bg-muted/50 rounded px-2 py-1 text-muted-foreground font-medium">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      action: { label: "Configure Locations", path: "/org-setup/settings" }
    },
    {
      icon: <Rocket className="w-7 h-7 text-orange-500" />,
      title: "You're Ready to Go! 🎉",
      subtitle: "Your organization foundation is set",
      description: "Once you've completed these steps, your organization structure is ready. You can start adding employees, assigning them to departments, and managing operations.",
      tips: [
        "Add employees via Employee Management → Add Employee",
        "Assign designations and departments during onboarding",
        "Use the Organisation Structure page for real-time hierarchy view",
        "All settings remain editable — your structure grows with you"
      ],
      visual: (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-[16px] font-bold text-emerald-800">Setup Complete!</div>
            <div className="text-[12px] text-emerald-600 mt-1">Your organizational blueprint is ready for action</div>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            {["Legal ✓", "Hierarchy ✓", "Departments ✓", "Cost Centres ✓", "Locations ✓"].map((tag, i) => (
              <span key={i} className="bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-[11px] font-bold">{tag}</span>
            ))}
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-[720px] mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary-500 via-violet-500 to-purple-500 transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            {isFirstTime && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                FIRST TIME SETUP
              </span>
            )}
            <span className="text-[12px] text-muted-foreground font-semibold">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground border-none bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-foreground leading-tight">{step.title}</h2>
              <p className="text-[13px] text-muted-foreground font-medium mt-0.5">{step.subtitle}</p>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-foreground/80 mb-4">{step.description}</p>

          {/* Visual Preview */}
          <div className="mb-4">
            {step.visual}
          </div>

          {/* Tips */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 mb-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              💡 Key Tips
            </div>
            <ul className="space-y-1.5">
              {step.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/70 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full transition-all border-none cursor-pointer ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="h-9 px-4 text-[12px] font-bold gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}
            {step.action && (
              <Button
                variant="outline"
                onClick={() => { onClose(); navigate(step.action!.path); }}
                className="h-9 px-4 text-[12px] font-bold border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 gap-1.5"
              >
                {step.action.label}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
            {isLast ? (
              <Button
                onClick={onClose}
                className="h-9 px-5 text-[12px] font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-none shadow-md gap-1.5"
              >
                <Rocket className="w-3.5 h-3.5" />
                Let's Get Started
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="h-9 px-5 text-[12px] font-bold bg-primary hover:bg-primary/90 text-white border-none shadow-sm gap-1.5"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from "react-router-dom";
import { useSurvey, useUpdateSurvey, useShareSurvey } from "../api/surveyApi";
import {
  Link2, Code, Lock, Globe, Eye, Copy, Check, QrCode,
  Settings, ChevronRight, BarChart2, ArrowLeft, Loader2, Palette
} from "lucide-react";

const THEME_PRESETS = [
  { name: "Shopify Modern", primaryColor: "#008060", backgroundColor: "#F6F6F7", fontColor: "#202223", borderColor: "#E1E3E5", borderRadius: "8px", fontFamily: "Inter" },
  { name: "Stripe Minimal", primaryColor: "#635BFF", backgroundColor: "#FFFFFF", fontColor: "#1A1F36", borderColor: "#E3E8EE", borderRadius: "4px", fontFamily: "Inter" },
  { name: "Notion Dark", primaryColor: "#2F3437", backgroundColor: "#191919", fontColor: "#FFFFFF", borderColor: "#2D3139", borderRadius: "6px", fontFamily: "monospace" },
  { name: "Slack Vibrant", primaryColor: "#4A154B", backgroundColor: "#F8F8F8", fontColor: "#1D1C1D", borderColor: "#E0E0E0", borderRadius: "12px", fontFamily: "system-ui" },
  { name: "Spotify Bold", primaryColor: "#1DB954", backgroundColor: "#191414", fontColor: "#FFFFFF", borderColor: "#282828", borderRadius: "24px", fontFamily: "Arial" },
  { name: "Linear Clean", primaryColor: "#5E6AD2", backgroundColor: "#F7F8FA", fontColor: "#111111", borderColor: "#E2E8F0", borderRadius: "8px", fontFamily: "Inter" },
];
import { toast } from "sonner";

function QRCodeSimulation({ value }: { value: string }) {
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const grid: boolean[][] = Array.from({ length: 15 }, (_, r) =>
    Array.from({ length: 15 }, (_, c) => {
      const n = ((seed * (r * 17 + c * 13 + 7)) % 100);
      if (r < 3 && c < 3) return true;
      if (r < 3 && c > 11) return true;
      if (r > 11 && c < 3) return true;
      return n > 45;
    })
  );
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      {grid.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: 2 }}>
          {row.map((cell, c) => (
            <div
              key={c}
              style={{
                width: 8,
                height: 8,
                borderRadius: r < 3 && c < 3 ? 2 : r < 3 && c > 11 ? 2 : r > 11 && c < 3 ? 2 : 1,
                background: cell ? "#1F2937" : "transparent",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PublishPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useOrgNavigate();
  const { data: survey, isLoading } = useSurvey(id);
  const updateSurveyMutation = useUpdateSurvey();
  const shareSurveyMutation = useShareSurvey();

  const [access, setAccess] = useState<"public" | "private" | "password">("private");
  const [password, setPassword] = useState("");
  const [themePreset, setThemePreset] = useState("");
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load access/password/theme from survey data
  if (survey && !initialized) {
    setAccess(survey.access || "private");
    setPassword(survey.survey_password || "");
    setThemePreset(survey.theme_preset || "");
    setInitialized(true);
  }

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

  const basePath = import.meta.env.BASE_URL || "/";
  const shareUrl = `${window.location.origin}${basePath}surveys/take/${id}`.replace(/\/+/g, "/").replace(":/", "://");
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const isPublished = survey.is_active;

  function handleCopy(type: "link" | "embed") {
    navigator.clipboard.writeText(type === "link" ? shareUrl : embedCode).catch(() => {});
    setCopied(type);
    
    // Log the share action
    if (id) {
      shareSurveyMutation.mutate({ id, method: type });
    }

    setTimeout(() => setCopied(null), 2000);
    toast.success(`${type === "link" ? "Link" : "Embed code"} copied!`);
  }

  async function handlePublishToggle() {
    if (!id) return;
    try {
      await updateSurveyMutation.mutateAsync({ id, data: { is_active: !isPublished, title: survey.title } });
      toast.success(isPublished ? "Survey unpublished" : "Survey published!");
    } catch {
      toast.error("Failed to update survey status");
    }
  }

  async function saveThemePreset(preset: string) {
    setThemePreset(preset);
    if (!id) return;
    try {
      await updateSurveyMutation.mutateAsync({ id, data: { theme_preset: preset || null, title: survey.title } });
      toast.success("Theme saved!");
    } catch {
      toast.error("Failed to save theme");
    }
  }

  async function saveAccessSettings(newAccess: "public" | "private" | "password", newPassword?: string) {
    setAccess(newAccess);
    if (newPassword !== undefined) setPassword(newPassword);
    if (!id) return;
    try {
      await updateSurveyMutation.mutateAsync({ id, data: { access: newAccess, survey_password: newPassword ?? password, title: survey.title } });
      toast.success("Access settings saved!");
    } catch {
      toast.error("Failed to save access settings");
    }
  }

  const questionsCount = survey.questions?.length || 0;
  const responsesCount = survey.responses?.length || 0;
  const completionRate = responsesCount > 0 && questionsCount > 0
    ? Math.round((responsesCount / questionsCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-muted/40 overflow-y-auto">
      <div className="w-full px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(`/surveys/admin`)}
              className="icon-circle-btn"
            >
              <ArrowLeft />
            </button>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Publish Settings</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-10">Configure access and share your survey.</p>
        </div>

        {/* Status banner */}
        <div
          className={`rounded-lg p-5 mb-5 flex items-center justify-between ${isPublished ? "dark:!bg-emerald-950/40 dark:!border-emerald-800/50 dark:!bg-none" : "dark:bg-slate-800 dark:border-slate-700"}`}
          style={{
            background: isPublished ? "linear-gradient(135deg, #D1FAE5, #A7F3D0)" : "",
            border: `1px solid ${isPublished ? "#6EE7B7" : "rgba(0,0,0,0.07)"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPublished ? "dark:!bg-emerald-600" : "dark:bg-slate-700"}`}
              style={{ background: isPublished ? "#059669" : "" }}
            >
              {isPublished ? <Globe size={18} color="#fff" /> : <Lock size={18} className={isPublished ? "" : "text-slate-400 dark:text-slate-300"} />}
            </div>
            <div>
              <p className={`font-semibold text-sm ${isPublished ? "dark:!text-emerald-100" : "dark:!text-slate-200"}`} style={{ color: isPublished ? "#064E3B" : "" }}>
                {isPublished ? "Survey is Live" : "Survey is Not Published"}
              </p>
              <p className={`text-xs mt-0.5 ${isPublished ? "dark:!text-emerald-200" : "dark:!text-slate-400"}`} style={{ color: isPublished ? "#065F46" : "" }}>
                {isPublished
                  ? `${responsesCount} responses collected`
                  : "Publish to start collecting responses."
                }
              </p>
            </div>
          </div>
          <button
            onClick={handlePublishToggle}
            disabled={updateSurveyMutation.isPending}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 ${isPublished ? "dark:!bg-slate-900 dark:!text-slate-200 dark:!border-slate-600" : "dark:!bg-indigo-600"}`}
            style={{
              background: isPublished ? "#fff" : "linear-gradient(135deg, #4F46E5, #6366F1)",
              color: isPublished ? "#374151" : "#fff",
              border: isPublished ? "1px solid rgba(0,0,0,0.1)" : "none",
            }}
          >
            {updateSurveyMutation.isPending ? "Updating..." : isPublished ? "Unpublish" : "Publish Now"}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 flex flex-col gap-4">
            {/* Share link */}
            <div className="rounded-lg p-5 bg-card border border-border/70 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Link2 size={15} className="text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Share Link</h2>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg mb-3 bg-muted/80 border border-border/70">
                <p className="flex-1 text-muted-foreground text-xs truncate">{shareUrl}</p>
                <button
                  onClick={() => handleCopy("link")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${copied === "link" ? "dark:!bg-emerald-950/30 dark:!text-emerald-400" : "dark:!bg-primary dark:!text-white"}`}
                  style={{
                    background: copied === "link" ? "#D1FAE5" : "#4F46E5",
                    color: copied === "link" ? "#059669" : "#fff",
                  }}
                >
                  {copied === "link" ? <Check size={11} /> : <Copy size={11} />}
                  {copied === "link" ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Access settings */}
              <div className="flex flex-col gap-2">
                {([
                  { key: "public" as const, label: "Public", desc: "Anyone with the link can respond — no login required", icon: Globe },
                  { key: "private" as const, label: "Private", desc: "Only logged-in employees can respond", icon: Lock },
                  { key: "password" as const, label: "Password Protected", desc: "Respondents must enter a password", icon: Lock },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => saveAccessSettings(opt.key)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${access === opt.key ? "bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500" : "bg-gray-50 dark:bg-slate-800 dark:border-transparent"}`}
                    style={{
                      border: `1.5px solid ${access === opt.key ? "#4F46E5" : "transparent"}`,
                    }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${access === opt.key ? "border-primary" : "border-gray-300 dark:border-slate-600"}`}
                    >
                      {access === opt.key && <div className="w-3 h-3 rounded-full bg-primary" />}
                    </div>
                    <opt.icon size={13} className={access === opt.key ? "text-primary" : "text-gray-400 dark:text-slate-500"} />
                    <div>
                      <p className={`font-medium text-xs ${access === opt.key ? "text-indigo-700 dark:text-indigo-300" : "text-gray-600 dark:text-slate-300"}`}>{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
                {access === "password" && (
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => { if (password) saveAccessSettings("password", password); }}
                    type="password"
                    placeholder="Set survey password..."
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none mt-1 bg-muted/80 border border-border/70 text-foreground"
                  />
                )}
              </div>
            </div>

            {/* Embed code */}
            <div className="rounded-lg p-5 bg-card border border-border/70 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Code size={15} className="text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Embed Code</h2>
              </div>
              <div className="relative p-3 rounded-lg mb-3 bg-gray-900">
                <pre className="text-indigo-300 text-[11px] leading-relaxed overflow-auto m-0 whitespace-pre-wrap word-break-break-all">
                  {embedCode}
                </pre>
              </div>
              <button
                onClick={() => handleCopy("embed")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied === "embed" ? "dark:!bg-emerald-950/30 dark:!text-emerald-400" : "dark:!bg-indigo-950/30 dark:!text-indigo-300"}`}
                style={{
                  background: copied === "embed" ? "#D1FAE5" : "#EEF2FF",
                  color: copied === "embed" ? "#059669" : "#4F46E5",
                }}
              >
                {copied === "embed" ? <Check size={11} /> : <Copy size={11} />}
                {copied === "embed" ? "Copied!" : "Copy embed code"}
              </button>
            </div>
          </div>

          {/* QR Code panel */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="rounded-lg p-5 bg-card border border-border/70 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <QrCode size={15} className="text-primary" />
                <h2 className="font-semibold text-sm text-foreground">QR Code</h2>
              </div>
              <div className="flex items-center justify-center p-5 rounded-lg mb-3 bg-muted/80 border border-border/70">
                <QRCodeSimulation value={shareUrl} />
              </div>
              <p className="text-muted-foreground text-[11px] text-center">Scan to open on mobile</p>
              <p className="text-muted-foreground text-[11px] text-center mt-1 break-all">{shareUrl}</p>
            </div>


            {/* Quick links */}
            <div className="rounded-lg p-5 bg-card border border-border/70 shadow-sm">
              <h2 className="font-semibold text-sm text-foreground mb-3">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Preview Survey", icon: Eye, action: () => navigate(`/surveys/admin/preview/${id}`) },
                  { label: "View Analytics", icon: BarChart2, action: () => navigate(`/surveys/admin/analytics/${id}`) },
                  { label: "Edit Survey", icon: Settings, action: () => navigate(`/surveys/admin/edit/${id}`) },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon size={13} className="text-muted-foreground" />
                      {item.label}
                    </div>
                    <ChevronRight size={13} className="text-gray-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from '@/shared/context/AuthContext';
import {
  ShieldCheck,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  UserRound,
  FileCheck2,
  Loader2,
  Inbox,
  MessageSquareWarning,
  ArrowRight,
  CalendarDays,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import {
  getChangeRequestInbox,
  getMyChangeRequests,
  decideChangeRequest,
  CHANGE_FIELD_LABELS,
  formatChangeValue,
  type ChangeRequest,
} from '../services/changeRequests';

const STATUS_META: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING_MANAGER: { label: "Pending Manager", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  PENDING_HR: { label: "Pending HR", className: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", className: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
};

const getEmployeeName = (req: ChangeRequest): string => {
  const d = req.user?.details;
  const name = `${d?.first_name || ""} ${d?.last_name || ""}`
    .trim()
    .replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  return name || req.user?.username || `Employee #${req.user_id}`;
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING_MANAGER;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

function ChangeFields({
  changes,
  previous,
}: {
  changes: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
}) {
  const entries = Object.entries(changes || {}).filter(([key]) => key !== "_previous");
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No changes recorded.</p>;
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
      {entries.map(([key, value]) => {
        const oldValue = previous ? previous[key] : undefined;
        const hasOld = oldValue !== null && oldValue !== undefined && oldValue !== "";
        return (
          <div key={key} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground font-medium shrink-0">{CHANGE_FIELD_LABELS[key] || key.replace(/_/g, " ")}</span>
            <div className="flex items-center gap-2 text-right break-words max-w-[60%]">
              {hasOld && (
                <>
                  <span className="text-muted-foreground line-through">{formatChangeValue(oldValue)}</span>
                  <span className="text-muted-foreground/40">→</span>
                </>
              )}
              <span className="text-foreground font-semibold">{formatChangeValue(value)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChangeRequestHub() {
  const { user } = useAuth();
  const userRoleStr = (user?.role || '').toString().toUpperCase();
  const userRolesArr = (Array.isArray(user?.roles) ? user.roles : []).map((r: any) => String(r).toUpperCase());
  const allUserRoles = [userRoleStr, ...userRolesArr];
  const isManagerOrAdminRole = allUserRoles.some((r) => 
    ['ADMIN', 'SUPER_ADMIN', 'SUPER ADMIN', 'HR', 'HR_ADMIN', 'HR ADMIN', 'MANAGER', 'REPORTING MANAGER', 'CEO', 'SYSTEM ADMINISTRATOR'].includes(r)
  );
  
  const [inbox, setInbox] = useState<ChangeRequest[]>([]);
  const [mine, setMine] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"inbox" | "mine">("inbox");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [noteFor, setNoteFor] = useState<{ request: ChangeRequest; action: "reject" } | null>(null);
  const [noteText, setNoteText] = useState("");

  const hasManagerAccess = isManagerOrAdminRole || inbox.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxData, mineData] = await Promise.all([
        getChangeRequestInbox().catch(() => []),
        getMyChangeRequests().catch(() => [])
      ]);
      setInbox(inboxData);
      setMine(mineData);

      // Auto set tab if not a manager role and has no inbox items
      if (!isManagerOrAdminRole && inboxData.length === 0) {
        setTab("mine");
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to load change requests");
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAdminRole]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecision = async (request: ChangeRequest, action: "approve" | "reject", note?: string) => {
    setBusyId(request.id);
    try {
      const role = request.status === "PENDING_MANAGER" ? "manager" : "hr";
      await decideChangeRequest(request.id, { action, role, note });
      toast.success(
        action === "approve"
          ? request.status === "PENDING_MANAGER"
            ? "Approved — request forwarded to HR"
            : "Approved — changes applied to profile"
          : "Request rejected"
      );
      setNoteFor(null);
      setNoteText("");
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to process request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
      <PageHeader
        title="Profile Change Requests"
        description="Review employee profile change requests or track your own submissions."
        icon={<ShieldCheck className="w-5 h-5" />}
      />

      {hasManagerAccess && (
        <div className="mt-6 flex items-center gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === "inbox" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Inbox className="w-4 h-4" />
            Approval Inbox
            {inbox.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">{inbox.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === "mine" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Send className="w-4 h-4" />
            My Requests
            {mine.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">{mine.length}</span>
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </div>
      ) : tab === "inbox" ? (
        <div className="mt-6 space-y-4">
          {inbox.length === 0 ? (
            <EmptyState
              icon={<FileCheck2 className="w-10 h-10 text-muted-foreground" />}
              title="No pending approvals"
              description="Requests awaiting your approval will appear here."
            />
          ) : (
            inbox.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                busy={busyId === req.id}
                onApprove={() => handleDecision(req, "approve")}
                onReject={() => setNoteFor({ request: req, action: "reject" })}
                showActions
              />
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {mine.length === 0 ? (
            <EmptyState
              icon={<Send className="w-10 h-10 text-muted-foreground" />}
              title="No change requests"
              description="Changes you submit to your profile will appear here with their approval status."
            />
          ) : (
            mine.map((req) => (
              <RequestCard key={req.id} request={req} busy={false} onApprove={() => {}} onReject={() => {}} showActions={false} />
            ))
          )}
        </div>
      )}

      {noteFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setNoteFor(null)} />
          <div className="relative bg-card rounded-lg shadow-sm w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-50 rounded-full">
                <MessageSquareWarning className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Reject Request</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Provide a reason for rejecting {getEmployeeName(noteFor.request)}'s change request.
            </p>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[100px]"
            />
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => { setNoteFor(null); setNoteText(""); }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-muted rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision(noteFor.request, "reject", noteText.trim() || undefined)}
                disabled={busyId === noteFor.request.id}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-lg transition-all shadow-sm disabled:opacity-60"
              >
                {busyId === noteFor.request.id ? "Submitting..." : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  busy,
  onApprove,
  onReject,
  showActions,
}: {
  request: ChangeRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  showActions: boolean;
}) {
  const d = request.user?.details;
  const isManagerStage = request.status === "PENDING_MANAGER";
  return (
    <div className="rounded-[14px] border border-border bg-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserRound className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground flex items-center gap-2">
              {getEmployeeName(request)}
              <StatusBadge status={request.status} />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {d?.role?.role_name || "Employee"}
              {d?.department?.department_name ? ` • ${d.department.department_name}` : ""} •{" "}
              {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={busy}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {isManagerStage ? "Approve & Forward" : "Approve & Apply"}
            </Button>
          </div>
        )}
      </div>

      {request.manager_note && (
        <p className="mt-3 text-sm text-muted-foreground border-l-2 border-amber-300 pl-3">
          <span className="font-semibold text-amber-600">Manager note: </span>{request.manager_note}
        </p>
      )}
      {request.hr_note && (
        <p className="mt-3 text-sm text-muted-foreground border-l-2 border-rose-300 pl-3">
          <span className="font-semibold text-rose-600">HR note: </span>{request.hr_note}
        </p>
      )}

      <div className="mt-4">
        <ChangeFields changes={request.requested_changes} previous={request.requested_changes?._previous} />
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon}
      <p className="mt-4 font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Clock, CheckCircle2, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/shared/context/AuthContext';
import {
  getFeedback,
  submitFeedback,
  markFeedbackRead,
  updateFeedbackStatus,
  deleteFeedback,
} from '../services/feedback';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  REVIEWED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
};

export function FeedbackPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const userRoles = [...(user?.roles || []), user?.role].filter(Boolean) as string[];
  const normalizeRole = (r: string) => String(r).toUpperCase().replace(/[\s_]+/g, '');
  const isAdmin = userRoles.some(r => ['SUPERADMIN', 'ADMIN', 'HR'].includes(normalizeRole(r)));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feedback', statusFilter],
    queryFn: () => getFeedback({ limit: 50, status: statusFilter }),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { message: string; category: string }) => submitFeedback(payload.message, payload.category),
    onSuccess: () => {
      toast.success('Feedback submitted successfully!');
      setMessage('');
      setCategory('general');
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit feedback');
    },
  });

  const readMutation = useMutation({
    mutationFn: (id: number) => markFeedbackRead(id),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: number; status: string }) => updateFeedbackStatus(payload.id, payload.status),
    onSuccess: () => {
      toast.success('Feedback status updated');
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeedback(id),
    onSuccess: () => {
      toast.success('Feedback deleted');
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete feedback');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter your feedback message before sending.');
      return;
    }
    submitMutation.mutate({ message: message.trim(), category });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const senderName = (item: any) => {
    const d = item?.user?.details;
    if (d) {
      const name = `${d.first_name || ''} ${d.last_name || ''}`.trim();
      if (name) return name;
    }
    return item?.user?.username || item?.user?.email || `Employee #${item?.user_id}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-950 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Share your thoughts with the HR Management team.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</span>
          {['general', 'suggestion', 'complaint', 'appreciation', 'issue'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                category === c
                  ? 'bg-primary/10 text-primary border-primary-200 dark:border-primary-800'
                  : 'text-muted-foreground border-border hover:border-primary-200'
              }`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Write your feedback or suggestion here..."
          className="w-full p-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitMutation.isPending ? 'Sending...' : 'Send to HR Team'}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {isAdmin ? 'All Feedback' : 'Your Feedback'}
          {data ? ` (${data.total})` : ''}
        </h2>
        <div className="flex items-center gap-1">
          {[undefined, 'PENDING', 'REVIEWED', 'RESOLVED'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-primary/10 text-primary border-primary-200 dark:border-primary-800'
                  : 'text-muted-foreground border-border'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading feedback...</div>
      ) : data && data.data.length > 0 ? (
        <div className="space-y-3">
          {data.data.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (!item.is_read) readMutation.mutate(item.id);
              }}
              className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{senderName(item)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[item.status] || STATUS_STYLES.PENDING}`}>
                    {item.status}
                  </span>
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-rose-500" title="Unread" />
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={item.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => statusMutation.mutate({ id: item.id, status: e.target.value })}
                      className="px-2 py-1 rounded-md text-xs border border-border bg-card text-foreground focus:outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="REVIEWED">REVIEWED</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this feedback?')) deleteMutation.mutate(item.id);
                      }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{item.message}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(item.created_at)}
                {item.category && (
                  <>
                    <span className="mx-1">·</span>
                    <span className="capitalize">{item.category}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            {statusFilter ? (
              <XCircle className="w-6 h-6 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {statusFilter ? `No ${statusFilter.toLowerCase()} feedback` : 'No feedback yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter ? 'Try a different status filter.' : 'Submit your first feedback above.'}
          </p>
        </div>
      )}
    </div>
  );
}

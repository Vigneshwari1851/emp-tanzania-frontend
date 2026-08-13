import { useState, useMemo, useEffect } from "react";
import {
  Bell,
  Trash2,
  Calendar,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Search,
  Info,
  ChevronLeft,
  Mail,
  MailCheck
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useNotifications } from '@/shared/context/NotificationContext';
import RejectReasonDialog from '@/shared/components/ui/RejectReasonDialog';
import { useAuth } from '@/shared/context/AuthContext';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { handleLeaveAction } from '@/features/leaves/services/leaves';
import { getNotificationTargetUrl } from '@/features/notifications/utils/notificationTarget';
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  date: Date;
  isRead: boolean;
  metadata?: any;
  related_module?: string;
  related_id?: number;
}

export function Notifications() {
  const navigate = useOrgNavigate();
  const { 
    notifications: sourceNotifications, 
    clearAll, 
    clearNotification, 
    markAsRead, 
    markAllAsRead,
    unreadCount,
    updateNotificationMetadata 
  } = useNotifications();
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const notifications: Notification[] = useMemo(() => {
    return sourceNotifications.map(n => ({
      id: String(n.id),
      title: n.title,
      description: n.message,
      type: n.type || "system",
      date: new Date(n.created_at),
      isRead: n.is_read,
      metadata: n.metadata,
      related_module: n.related_module,
      related_id: n.related_id,
    }));
  }, [sourceNotifications]);

  // User role check for actions
  const userRoles = [...(user?.roles || []), user?.role].filter(Boolean) as string[];
  const normalizeRole = (r: string) => r.toUpperCase().replace(/[\s_]+/g, '');
  const isSuperAdmin = userRoles.some(r => normalizeRole(r) === 'SUPERADMIN');
  const isAdmin = userRoles.some(r => normalizeRole(r) === 'ADMIN');
  const isManager = userRoles.some(r => normalizeRole(r) === 'MANAGER');
  const isHR = userRoles.some(r => normalizeRole(r) === 'HR');
  const isManagerOrAdmin = isSuperAdmin || isAdmin || isManager || isHR;

  // Auto-select from URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && notifications.length > 0) {
      const found = notifications.find(n => n.id === id);
      if (found) {
        setSelectedNotification(found);
        if (!found.isRead) {
          markAsRead(Number(found.id));
        }
      }
    }
  }, [searchParams, notifications]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications.filter(n =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => b.date.getTime() - a.date.getTime());

    if (activeTab === 'new') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (activeTab === 'read') {
      filtered = filtered.filter(n => n.isRead);
    } else if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }

    return filtered;
  }, [notifications, searchQuery, activeTab]);

  // Synchronize selected notification with source data if it changes (Real-time update for detail view)
  useEffect(() => {
    if (selectedNotification) {
      const updated = notifications.find(n => n.id === selectedNotification.id);
      if (updated && (
        updated.isRead !== selectedNotification.isRead ||
        JSON.stringify(updated.metadata) !== JSON.stringify(selectedNotification.metadata)
      )) {
        setSelectedNotification(updated);
      }
    }
  }, [notifications, selectedNotification]);



  const handleDelete = () => {
    if (deleteId) {
      clearNotification(Number(deleteId));
      if (selectedNotification?.id === deleteId) {
        setSelectedNotification(null);
      }
      setDeleteId(null);
    }
  };

  const handleClearAll = () => {
    clearAll();
    setSelectedNotification(null);
    setShowClearModal(false);
  };

  const handleSelectNotification = (n: Notification) => {
    setSelectedNotification(n);
    if (!n.isRead) {
      markAsRead(Number(n.id));
    }
  };

  const handleApproveLeave = async () => {
    if (!selectedNotification?.metadata?.leave_id) return;
    setActionLoading(true);
    try {
      await handleLeaveAction(selectedNotification.metadata.leave_id, "APPROVED");
      toast.success("Leave request approved successfully");
      const numericId = Number(selectedNotification.id);
      updateNotificationMetadata(numericId, { status: "APPROVED" });
      setSelectedNotification(prev => prev ? { ...prev, metadata: { ...prev.metadata, status: "APPROVED" } } : null);
    } catch (error) {
      console.error("Error approving leave:", error);
      toast.error("Failed to approve leave request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectRequestId) return;
    setActionLoading(true);
    try {
      await handleLeaveAction(rejectRequestId, "REJECTED", reason);
      toast.success("Leave request rejected");
      const numericId = Number(selectedNotification?.id);
      updateNotificationMetadata(numericId, { status: "REJECTED" });
      setSelectedNotification(prev => prev ? { ...prev, metadata: { ...prev.metadata, status: "REJECTED" } } : null);
      setRejectRequestId(null);
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast.error("Failed to reject leave request");
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeIcon = (type: string, sizeClass: string = "w-5 h-5") => {
    const t = type.toLowerCase();
    if (t.includes('leave')) return <Calendar className={`${sizeClass} text-primary-500`} />;
    if (t.includes('performance')) return <TrendingUp className={`${sizeClass} text-emerald-500`} />;
    if (t.includes('system')) return <AlertCircle className={`${sizeClass} text-red-600`} />;
    if (t.includes('announcement')) return <Sparkles className={`${sizeClass} text-amber-500`} />;
    if (t.includes('message')) return <MessageSquare className={`${sizeClass} text-blue-500`} />;
    return <Bell className={`${sizeClass} text-primary-500`} />;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Today • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    return `${month} ${day} • ${time}`;
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden w-full min-w-0">
      {/* Header Area */}
      <PageHeader
        title="Notifications"
        description="Stay Updated With Your Latest Notifications"
        icon={<Bell className="size-8" />}
        action={
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-start sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => markAllAsRead()}
              className="group text-xs sm:text-sm font-bold text-primary hover:bg-primary/10 transition-all duration-300 gap-2 h-10 px-3 sm:px-4 flex-1 md:flex-none justify-center"
              disabled={unreadCount === 0}
            >
              <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Mark all as read
            </Button>
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            <Button
              variant="outline"
              onClick={() => setShowClearModal(true)}
              className="text-xs sm:text-sm font-bold text-red-500 dark:text-red-400 border-red-100 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all duration-300 gap-2 h-10 px-3 sm:px-4 shadow-sm shadow-red-50/50 dark:shadow-none flex-1 md:flex-none justify-center"
              disabled={notifications.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        }
      />

      {/* Split Layout */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden relative w-full">
        {/* Left Side: List */}
        <div className={`flex-1 flex flex-col bg-card rounded-md border border-border shadow-sm overflow-hidden min-w-0 ${selectedNotification ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center gap-4 sm:gap-6 px-2 shrink-0 w-max sm:w-auto">
                {[
                  { id: 'all', label: 'All', icon: Bell },
                  { id: 'new', label: 'New', icon: Sparkles },
                  { id: 'unread', label: 'Unread', icon: Mail },
                  { id: 'read', label: 'Read', icon: MailCheck }
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`group pt-2 pb-1 px-3 text-sm font-medium transition-colors border-b-2 h-10 hover:bg-transparent focus-visible:outline-none flex items-center gap-2 ${activeTab === tab.id ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <Icon className={`w-4 h-4 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="relative flex-1 w-full sm:max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'all' ? 'notifications' : activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {searchQuery ? "No matches found" : "All caught up!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-[200px]">
                  {searchQuery
                    ? `We couldn't find any notifications matching "${searchQuery}" in ${activeTab}.`
                    : `You don't have any ${activeTab === 'all' ? '' : activeTab} notifications at the moment.`}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleSelectNotification(n)}
                  className={`group relative flex items-center gap-4 py-3 px-4 hover:bg-primary/10 transition-all cursor-pointer ${selectedNotification?.id === n.id ? 'bg-primary/10 border-r-2 border-primary' : ''}`}
                >
                  <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    {getTypeIcon(n.type, "w-5 h-5")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className={`text-sm font-semibold truncate ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {n.title}
                      </h4>
                    </div>
                    <p className={`text-xs truncate ${n.isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                      {n.description}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1 inline-block">
                      {formatDate(n.date)}
                    </span>
                  </div>

                  {!n.isRead && (
                    <div className="shrink-0 flex items-center justify-center px-1">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm shadow-rose-200 dark:shadow-none" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Detail View */}
        <div className={`w-full md:w-[450px] flex flex-col bg-card rounded-md border border-border shadow-sm overflow-hidden shrink-0 ${selectedNotification ? 'flex' : 'hidden md:flex'}`}>
          {selectedNotification ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Detail Header */}
              <div className="p-6 border-b border-border flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedNotification(null)}
                    className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-primary rounded-md h-10 w-10 shrink-0"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    {getTypeIcon(selectedNotification.type, "w-6 h-6")}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground leading-tight truncate">{selectedNotification.title}</h2>
                    <span className="text-xs text-muted-foreground font-medium">{formatDate(selectedNotification.date)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(selectedNotification.id);
                  }}
                  className="h-10 w-10 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors p-0"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="bg-muted/50 rounded-md p-4 mb-4 border border-border">
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.description}
                  </p>
                </div>

                {/* Context Specific Content */}
                {selectedNotification.type === 'leave' && selectedNotification.metadata && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card border border-border p-4 rounded-md">
                        <span className="text-xs font-semibold text-primary block mb-1">Start Date</span>
                        <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                          <Calendar className="w-4 h-4 text-primary" />
                          {new Date(selectedNotification.metadata.start_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-card border border-border p-4 rounded-md">
                        <span className="text-xs font-semibold text-primary block mb-1">End Date</span>
                        <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                          <Calendar className="w-4 h-4 text-primary" />
                          {new Date(selectedNotification.metadata.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 p-4 rounded-md">
                      <span className="text-xs font-semibold text-primary-600/70 dark:text-primary-400/70 block mb-1">Leave Details</span>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Employee</span>
                          <span className="text-gray-900 dark:text-gray-100 font-semibold">{selectedNotification.metadata.employee_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Duration</span>
                          <span className="text-primary-600 dark:text-primary-400 font-bold bg-primary-50 dark:bg-primary-950/30 px-2 py-0.5 rounded-md text-xs">{selectedNotification.metadata.duration} Days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Policy Type</span>
                          <span className="text-gray-900 dark:text-gray-100 font-semibold">{selectedNotification.metadata.policy_name}</span>
                        </div>
                        {selectedNotification.metadata.reason && (
                          <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Reason</span>
                              </div>
                              <div className="bg-primary-50/20 dark:bg-primary-950/20 rounded-md p-3 border-l-2 border-primary-500/30">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                  {selectedNotification.metadata.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for Managers */}
                    {isManagerOrAdmin &&
                      (selectedNotification.type?.toLowerCase().includes('leave') ||
                        selectedNotification.related_module?.toLowerCase().includes('leave')) &&
                      selectedNotification.metadata?.status?.toUpperCase() === 'PENDING' && (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
      <Button
        variant="outline"
        className="flex-1 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-400 dark:hover:border-rose-700 hover:text-rose-700 dark:hover:text-rose-300 h-10 rounded-md text-sm font-semibold gap-2 transition-all justify-center"
        onClick={() => setRejectRequestId(selectedNotification?.metadata?.leave_id || null)}
        disabled={actionLoading}
      >
        <XCircle className="w-4 h-4" />
        Reject
      </Button>
      <Button
        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-md text-sm font-semibold gap-2 shadow-lg shadow-emerald-50 dark:shadow-none transition-all justify-center"
        onClick={handleApproveLeave}
        disabled={actionLoading}
      >
        <CheckCircle2 className="w-4 h-4" />
        Approve
      </Button>
    </div>
                      )}

                    {selectedNotification.metadata?.status && selectedNotification.metadata.status.toUpperCase() !== 'PENDING' && (
                      <div className={`p-4 rounded-md flex items-center justify-center gap-2 border-2 ${selectedNotification.metadata.status.toUpperCase() === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                        {selectedNotification.metadata.status.toUpperCase() === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        <span className="font-semibold text-sm">Request <span className="capitalize">{selectedNotification.metadata.status.toLowerCase()}</span></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Linking Support */}
                {(selectedNotification.related_module || selectedNotification.type === 'leave') && (
                  <div className="mt-8 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(getNotificationTargetUrl(selectedNotification, user))}
                      className="w-full flex items-center justify-between p-4 bg-primary-50/50 dark:bg-primary-950/20 hover:bg-primary-50 dark:hover:bg-primary-950/30 border border-primary-100 dark:border-primary-800 rounded-md transition-all group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-md flex items-center justify-center border border-primary-100 dark:border-primary-800 shadow-sm group-hover:scale-110 transition-transform">
                          <ExternalLink className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 block">View Source</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            Go to {selectedNotification.related_module === 'document' ? 'Documents' : selectedNotification.related_module === 'survey' ? 'Surveys' : (selectedNotification.related_module || 'module')}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400 dark:text-gray-500">
              <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-gray-200 dark:text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Select a Notification</h3>
              <p className="text-sm max-w-[240px]">Click on a notification from the list to view its detailed information and available actions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {(showClearModal || deleteId) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center shadow-inner">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {showClearModal ? "Clear All History" : "Delete Item"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-sm px-4">
                    {showClearModal
                      ? "This will permanently remove all notifications from your dashboard. This action cannot be reversed."
                      : "Are you sure you want to delete this notification? It will be permanently removed from your history."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowClearModal(false);
                      setDeleteId(null);
                    }}
                    className="flex-1 h-10 rounded-md text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={showClearModal ? handleClearAll : handleDelete}
                    className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold text-sm border-none shadow-lg shadow-rose-100 dark:shadow-none hover:shadow-rose-200 dark:hover:shadow-none transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Confirm {showClearModal ? "Clear" : "Delete"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <RejectReasonDialog
        isOpen={rejectRequestId !== null}
        onClose={() => setRejectRequestId(null)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}


import { useState, useEffect } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { NotificationItem } from "./NotificationItem";
import { type Notification as DropdownNotification } from './types';
import { Bell, X, CheckCheck } from "lucide-react";
import { useNotifications } from '@/shared/context/NotificationContext';
import { useAuth } from '@/shared/context/AuthContext';
import { getNotificationTargetUrl, handleNotificationNavigation } from '@/features/notifications/utils/notificationTarget';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const navigate = useOrgNavigate();
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  // Refresh notifications every time the dropdown opens
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Filter by activeTab first, sort by date, then take the top 5 most recent
  const filteredRawNotifications = notifications
    .filter(n => {
      if (activeTab === "unread") return !n.is_read;
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const filteredNotifications = filteredRawNotifications.map((n) => {
    let timestampStr = "Just now";
    try {
      const createdDate = new Date(n.created_at);
      const diffStr = Math.floor((new Date().getTime() - createdDate.getTime()) / 60000);

      if (diffStr > 1440) {
        timestampStr = createdDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) + ' • ' + createdDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } else if (diffStr > 60) {
        timestampStr = `${Math.floor(diffStr / 60)}h ago`;
      } else if (diffStr > 0) {
        timestampStr = `${diffStr}m ago`;
      } else {
        timestampStr = 'Just now';
      }
    } catch (e) { }

    return {
      id: String(n.id),
      type: n.type || "system",
      userName: "System",
      userInitials: "SYS",
      action: n.title,
      target: n.message,
      timestamp: timestampStr,
      isRead: n.is_read,
      createdAt: n.created_at
    } as DropdownNotification & { createdAt: string };
  });

  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      <div className="absolute right-[-120px] mt-3 w-[440px] bg-card rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-border flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
        {/* Header */}
        <div className="p-5 pb-1">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h2 className="text-lg font-semibold text-foreground leading-tight">Notifications</h2>
              <p className="text-sm font-medium text-muted-foreground mt-1">Stay Updated With Your Latest Notifications</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-primary/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg border border-border text-muted-foreground transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 mb-2">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                All
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${activeTab === 'all' ? 'bg-primary/10 text-primary border-primary-100 dark:border-primary-800' : 'bg-muted text-muted-foreground border-border'}`}>
                  {totalCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'unread' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${activeTab === 'unread' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900' : 'bg-muted text-muted-foreground border-border'}`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            {totalCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[520px] custom-scrollbar bg-muted/80 p-5 pt-3">
          {filteredNotifications.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredNotifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onMarkRead={(id) => {
                    markAsRead(Number(id));
                    const raw = notifications.find(n => n.id === Number(id));
                    handleNotificationNavigation(navigate, raw || {}, user);
                    onClose();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-[10px] border border-border shadow-sm mt-2">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-base font-semibold text-foreground">No {activeTab} notifications</p>
              <p className="text-xs text-muted-foreground mt-1">We'll let you know when something arrives</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/50 border-t border-border">
          <button
            onClick={() => {
              navigate("/notifications");
              onClose();
            }}
            className="w-full py-2.5 bg-card border border-border rounded-sm text-sm font-semibold text-foreground hover:bg-muted hover:text-primary hover:border-primary-100 dark:hover:border-primary-800 transition-all shadow-sm"
          >
            View All Notifications
          </button>
        </div>
      </div>
    </>
  );
};

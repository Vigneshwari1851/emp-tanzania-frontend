import * as React from "react";
import { type Notification } from './types';
import { FileIcon } from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead
}) => {
  const { isRead, userAvatar, userInitials, userName, action, target, timestamp, attachment, actions } = notification;

  const getStatusColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'new bookings':
      case 'new review':
      case 'new_barber':
      case 'join':
        return 'bg-emerald-500';
      case 'rescheduled':
      case 'shift reminder':
      case 'request':
        return 'bg-orange-500';
      default:
        return 'bg-primary-500';
    }
  };

  return (
    <div
      className={`relative flex gap-3.5 p-3 transition-all duration-200 bg-card rounded-lg border border-border/80 shadow-[0_2px_4px_rgba(0,0,0,0.02)] cursor-pointer hover:border-border hover:shadow-sm hover:scale-[1.01]`}
      onClick={() => onMarkRead(notification.id)}
    >
      {/* Avatar Section */}
      <div className="relative flex-shrink-0">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName}
            className="w-9 h-9 rounded-sm object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-sm bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold transition-colors">
            {userInitials || userName.charAt(0)}
          </div>
        )}

        {/* Status dot on Avatar - Only show for unread */}
        {!isRead && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${getStatusColor(action || '')} border-2 border-white dark:border-slate-800`} />
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="text-sm leading-tight font-semibold text-foreground">
            {target && target}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
            {action || 'Notification'}
          </span>
          <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
          <span className="text-[10px] text-muted-foreground font-medium">{timestamp}</span>
        </div>

        {/* Dynamic Content (Actions/Attachments) */}
        {actions && actions.length > 0 && (
          <div className="flex gap-2 mt-2.5">
            {actions.map((act: any, idx: number) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  act.onClick();
                }}
                className={`px-3 py-1.5 rounded-sm text-[10px] font-semibold transition-all active:scale-95 ${act.variant === 'primary'
                    ? "bg-primary text-white hover:bg-primary/95 shadow-sm"
                    : "bg-card text-foreground border border-border hover:bg-muted shadow-sm"
                  }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}

        {attachment && (
          <div className="mt-2.5 p-2 rounded-sm bg-muted/50 border border-border flex items-center gap-2.5 hover:border-border group/file transition-colors max-w-sm">
            <FileIcon className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-foreground truncate">{attachment.name}</p>
              {attachment.size && <p className="text-[9px] text-muted-foreground mt-0.5 font-medium uppercase tracking-tight">{attachment.size}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import { 
  Bell, Clock, Award, AlertCircle, ShieldAlert, 
  ArrowRight, Download, CheckCircle2, MoreHorizontal, Calendar 
} from 'lucide-react';
import { LmsNotificationType, LmsNotificationPriority } from '../api/lmsNotificationApi';
import type { LmsNotification } from '../api/lmsNotificationApi';
import { Button } from '@/shared/components/ui/button';

interface NotificationEventCardProps {
  notification: LmsNotification;
  onAction?: (notif: LmsNotification) => void;
  onMarkRead?: (notif: LmsNotification) => void;
}

export const NotificationEventCard: React.FC<NotificationEventCardProps> = ({ notification, onAction, onMarkRead }) => {
  const getIcon = () => {
    switch (notification.type) {
      case LmsNotificationType.ENROLLMENT: return <Bell className="text-primary" size={18} />;
      case LmsNotificationType.REMINDER: return <Clock className="text-amber-600" size={18} />;
      case LmsNotificationType.ESCALATION: return <ShieldAlert className="text-rose-600" size={18} />;
      case LmsNotificationType.COMPLETION: return <Award className="text-emerald-600" size={18} />;
      default: return <Bell className="text-gray-600" size={18} />;
    }
  };

  const getPriorityBadge = () => {
    const styles = {
      [LmsNotificationPriority.LOW]: 'bg-muted text-muted-foreground border-border',
      [LmsNotificationPriority.MEDIUM]: 'bg-blue-50 text-primaryborder-blue-100',
      [LmsNotificationPriority.HIGH]: 'bg-amber-50 text-amber-600 border-amber-100',
      [LmsNotificationPriority.CRITICAL]: 'bg-rose-50 text-rose-600 border-rose-100',
    };
    return (
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${styles[notification.priority]}`}>
        {notification.priority}
      </span>
    );
  };

  const getBgColor = () => {
    if (!notification.isRead) return 'bg-card border-primary-100 shadow-sm';
    return 'bg-muted/50 border-border opacity-80';
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-sm ${getBgColor()}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          notification.type === LmsNotificationType.ESCALATION ? 'bg-rose-50' : 
          notification.type === LmsNotificationType.COMPLETION ? 'bg-emerald-50' : 'bg-muted'
        }`}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-[12px] font-medium text-foreground truncate">{notification.title}</h4>
              {!notification.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {getPriorityBadge()}
              {!notification.isRead && onMarkRead && (
                 <button 
                   onClick={() => onMarkRead(notification)}
                   className="text-muted-foreground hover:text-primary transition-colors"
                   title="Mark as read"
                 >
                   <CheckCircle2 size={14} />
                 </button>
              )}
              <button className="text-muted-foreground hover:text-gray-600"><MoreHorizontal size={14} /></button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {notification.message}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
            {notification.dueDate && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                <Clock size={12} />
                Due: {new Date(notification.dueDate).toLocaleDateString()}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
              <Calendar size={12} />
              {new Date(notification.createdAt).toLocaleDateString()}
            </div>
            
            {notification.metadata?.score && (
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-sm">
                <CheckCircle2 size={12} />
                Score: {notification.metadata.score}%
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center gap-2">
            {notification.actionUrl && (
              <Button 
                onClick={() => onAction?.(notification)}
                variant="ghost" 
                className="h-8 rounded-lg text-[10px] font-black bg-primary/10 text-primary hover:bg-primary-100 flex items-center gap-2"
              >
                Launch Course <ArrowRight size={12} />
              </Button>
            )}
            {notification.metadata?.certificateUrl && (
              <Button 
                variant="ghost" 
                className="h-8 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-2"
              >
                Download Cert <Download size={12} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

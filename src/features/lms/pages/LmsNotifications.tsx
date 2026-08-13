import React, { useState, useEffect } from 'react';
import { 
  Bell, Filter, Search, CheckCircle2, AlertTriangle, 
  ChevronRight, Calendar, Settings, Mail
} from 'lucide-react';
import { useLmsNotifications, LmsNotificationType } from '../api/lmsNotificationApi';
import type { LmsNotification } from '../api/lmsNotificationApi';
import { NotificationEventCard } from '../components/NotificationEventCard';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { UserRole } from '@/shared/types/rbac';

import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';

export const LmsNotifications: React.FC = () => {
  const navigate = useOrgNavigate();
  const { user } = useAuth();
  const { notifications: initialNotifications, isLoading } = useLmsNotifications();
  const [notifications, setNotifications] = useState<LmsNotification[]>([]);
  const [filter, setFilter] = useState<LmsNotificationType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDismissAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleMarkRead = (notif: LmsNotification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === 'ALL' || n.type === filter;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full py-8 px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm shadow-primary-200">
                <Bell size={20} />
             </div>
             <h1 className="text-3xl font-black tracking-tight text-foreground">Learning Notifications</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium ml-13">Stay compliant and up-to-date with your assigned training tracks.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {user?.role === UserRole.SUPER_ADMIN && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/lms/notifications/settings')}
              className="rounded-lg font-bold text-xs h-10 border-border flex items-center gap-2 hover:bg-muted"
            >
              <Settings size={14} /> Notification Engine
            </Button>
          )}
          <Button 
            onClick={handleMarkAllRead}
            className="bg-gray-900 text-white font-black h-10 px-6 rounded-lg text-xs hover:bg-black transition-all shadow-sm"
          >
             Mark All Read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6">
           <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
              <h3 className="text-xs font-black text-muted-foreground tracking-widest uppercase">Filter Events</h3>
              <div className="space-y-1">
                 {[
                   { label: 'All Events', id: 'ALL', count: notifications.length },
                   { label: 'Enrollments', id: LmsNotificationType.ENROLLMENT, count: notifications.filter(n => n.type === LmsNotificationType.ENROLLMENT).length },
                   { label: 'Reminders', id: LmsNotificationType.REMINDER, count: notifications.filter(n => n.type === LmsNotificationType.REMINDER).length },
                   { label: 'Completions', id: LmsNotificationType.COMPLETION, count: notifications.filter(n => n.type === LmsNotificationType.COMPLETION).length },
                   { label: 'Escalations', id: LmsNotificationType.ESCALATION, count: notifications.filter(n => n.type === LmsNotificationType.ESCALATION).length },
                 ].map(item => (
                   <button
                     key={item.id}
                     onClick={() => setFilter(item.id as any)}
                     className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all ${
                       filter === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                     }`}
                   >
                     <span>{item.label}</span>
                     <span className={`px-2 py-0.5 rounded-sm text-[10px] ${
                       filter === item.id ? 'bg-primary-100 text-primary' : 'bg-muted text-muted-foreground'
                     }`}>{item.count}</span>
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Notification List */}
        <div className="lg:col-span-3 space-y-6">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                 <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by course or event title..." 
                    className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
                 />
              </div>
              <Button variant="outline" className="rounded-lg border-border h-12 px-6 flex items-center gap-2 text-xs font-bold bg-card">
                 <Calendar size={14} /> Date Range
              </Button>
           </div>

           {unreadCount > 0 && (
             <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-center gap-3">
                <AlertTriangle className="text-amber-500" size={18} />
                <p className="text-xs font-bold text-amber-900">You have {unreadCount} unread high-priority training alerts.</p>
                <Button onClick={handleDismissAll} variant="ghost" className="ml-auto text-amber-600 font-black text-[10px] hover:bg-amber-100/50">Dismiss All</Button>
             </div>
           )}

           <div className="space-y-4">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <NotificationEventCard 
                    key={notif.id} 
                    notification={notif} 
                    onMarkRead={handleMarkRead}
                    onAction={(n) => {
                      if (n.actionUrl) {
                        navigate(n.actionUrl);
                      }
                    }}
                  />
                ))
              ) : (
                <div className="py-20 text-center bg-muted rounded-[40px] border-2 border-dashed border-border">
                   <div className="w-20 h-20 bg-card rounded-lg shadow-sm flex items-center justify-center mx-auto mb-6 text-gray-300">
                      <Bell size={32} />
                   </div>
                   <h3 className="text-xl font-black text-foreground">All caught up!</h3>
                   <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto mt-2">No notifications found matching your current filter criteria.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

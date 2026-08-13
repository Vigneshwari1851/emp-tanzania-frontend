import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import axiosInstance from '@/shared/services/axiosInstance';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
  related_module?: string;
  related_id?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updateNotificationMetadata: (id: number, metadata: any) => Promise<void>;
  lastEvent: { event: string; data: any; timestamp: number } | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastEvent, setLastEvent] = useState<{ event: string, data: any, timestamp: number } | null>(null);
  const { user } = useAuth();
  const lastEventRef = useRef<{ event: string, data: any, timestamp: number } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/employee-api';

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/notifications?limit=50`);
      if (response.data.success && response.data.data) {
        const payloadData = response.data.data.data || response.data.data;
        if (Array.isArray(payloadData)) {
          setNotifications(payloadData);
        } else {
          setNotifications([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const updateNotificationMetadata = useCallback(async (id: number, metadata: any) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, metadata: { ...n.metadata, ...metadata } } : n
    ));
    try {
      await axiosInstance.patch(`/notifications/${id}/metadata`, { metadata });
    } catch (error) {
      console.error('Failed to update notification metadata on backend:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds for new notifications (covers cases where WebSocket misses events)
      const pollInterval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(pollInterval);
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!user || !token) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    let reconnectAttempts = 0;

    const connect = () => {
      if (!isMounted) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      let wsUrl: string;
      if (API_URL.startsWith('http')) {
        wsUrl = API_URL.replace(/\/employee-api\/?$/, "").replace(/^http[s]?/, wsProtocol);
      } else {
        wsUrl = `${wsProtocol}://${window.location.hostname}:5000`;
      }
      console.log(`Connecting to Notification WebSocket (Attempt ${reconnectAttempts + 1}) to: ${wsUrl}...`);
      ws = new WebSocket(`${wsUrl}?token=${token}`);

      ws.onopen = () => {
        console.log('Successfully connected to Notification WebSocket at:', wsUrl);
        reconnectAttempts = 0;
      };

      ws.onmessage = (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data);
          const eventType = payload.event;
          const notificationData = payload.data;
          
          if (['leave_request', 'leave_status', 'notification', 'exit_request', 'exit_request_hr', 'exit_request_update', 'lwd_negotiation'].includes(eventType)) {
            setNotifications(prev => {
              if (prev.some(n => n.id === notificationData.id)) return prev;
              return [notificationData, ...prev];
            });

            // FIX: Only update lastEvent if the event actually changed (avoid unnecessary re-renders)
            const newEvent = { event: eventType, data: notificationData, timestamp: Date.now() };
            if (!lastEventRef.current || lastEventRef.current.event !== eventType || lastEventRef.current.data?.id !== notificationData.id) {
              lastEventRef.current = newEvent;
              setLastEvent(newEvent);
            }

            toast(notificationData.title, {
              description: notificationData.message,
              icon: '🔔',
            });
          } else if (eventType === 'notification_update') {
            setNotifications(prev => prev.map(n => n.id === notificationData.id ? notificationData : n));
          }
        } catch (err) {
          console.error('Failed to parse websocket message', err);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket Error attempting to connect to ${wsUrl}:`, error);
      };

      ws.onclose = (event) => {
        console.log(`Disconnected from Notification WebSocket: code=${event.code}, reason=${event.reason || 'none'}. URL: ${wsUrl}`);
        if (isMounted) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts++;
          console.log(`Scheduling reconnect to ${wsUrl} in ${delay}ms...`);
          reconnectTimeout = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user, API_URL]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axiosInstance.patch(`/notifications/mark-all-read`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  }, []);

  const clearNotification = useCallback(async (id: number) => {
    try {
      await axiosInstance.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification', error);
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
  }, []);

  // FIX: Memoize unreadCount to avoid recalculating every render
  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  // FIX: Memoize context value to prevent unnecessary re-renders of all consumers
  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    refreshNotifications: fetchNotifications,
    updateNotificationMetadata,
    lastEvent
  }), [notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll, fetchNotifications, updateNotificationMetadata, lastEvent]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

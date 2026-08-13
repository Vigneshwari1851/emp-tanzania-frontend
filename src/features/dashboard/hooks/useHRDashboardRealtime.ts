import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/shared/context/NotificationContext';

const LEAVE_EVENTS = ['leave_request', 'leave_status', 'leave_action_processed'];

interface UseHRDashboardRealtimeOptions {
  onLeaveEvent?: () => void;
  pollCallbacks?: (() => void)[];
}

export function useHRDashboardRealtime({
  onLeaveEvent,
  pollCallbacks = [],
}: UseHRDashboardRealtimeOptions) {
  const { lastEvent } = useNotifications();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefetch = useCallback((fn: () => void, delay = 500) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, delay);
  }, []);

  useEffect(() => {
    if (!lastEvent || !onLeaveEvent) return;

    console.log('[HR Dashboard] WebSocket event:', lastEvent.event);

    if (LEAVE_EVENTS.includes(lastEvent.event)) {
      console.log('[HR Dashboard] Refetching leave data...');
      debouncedRefetch(onLeaveEvent);
    }
  }, [lastEvent, onLeaveEvent, debouncedRefetch]);

  useEffect(() => {
    if (pollCallbacks.length === 0) return;

    const interval = setInterval(() => {
      console.log('[HR Dashboard] Polling: refetching dashboard data');
      pollCallbacks.forEach(cb => cb());
    }, 30000);

    return () => clearInterval(interval);
  }, [pollCallbacks]);
}

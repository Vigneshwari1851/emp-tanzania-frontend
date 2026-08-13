import { useEffect } from 'react';

type RealtimeCallback = (data: { module: string, action: string, data?: any, timestamp: string }) => void;

export const useRealtime = (onUpdate: RealtimeCallback) => {
    useEffect(() => {
        const streamUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/realtime/stream`;
        const eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onUpdate(data);
            } catch (err) {
                console.error('Failed to parse realtime message', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('Realtime EventSource failed', err);
            // Browser automatically tries to reconnect SSE usually, but we log it
        };

        return () => {
            eventSource.close();
        };
    }, [onUpdate]);
};

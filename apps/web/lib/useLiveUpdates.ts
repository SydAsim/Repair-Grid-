"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL, getApiBaseUrl } from "./config";

export interface LiveNotificationEvent {
  type: string;
  mission_id?: string;
  report_id?: string;
  title?: string;
  message?: string;
  status?: string;
  timestamp: string;
}

export function useLiveUpdates(onEvent?: (evt: LiveNotificationEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<LiveNotificationEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<any>(null);

  const handleIncoming = useCallback((data: any) => {
    if (!data) return;
    const evt: LiveNotificationEvent = {
      type: data.type || data.eventType || "UPDATE",
      mission_id: data.mission_id || data.missionId,
      report_id: data.report_id || data.reportId,
      title: data.title || "RepairGrid Alert",
      message: data.message || data.status || "Status updated",
      status: data.status,
      timestamp: data.timestamp || new Date().toISOString(),
    };
    setLastEvent(evt);
    if (onEvent) {
      onEvent(evt);
    }
  }, [onEvent]);

  // Attempt WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      if (typeof window !== "undefined" && WS_BASE_URL && WS_BASE_URL.startsWith("ws")) {
        ws = new WebSocket(WS_BASE_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (messageEvent) => {
          try {
            const parsed = JSON.parse(messageEvent.data);
            handleIncoming(parsed);
          } catch (e) {
            console.warn("WS parse error:", e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      }
    } catch (wsErr) {
      console.warn("WebSocket init error, falling back to adaptive polling:", wsErr);
    }

    return () => {
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
    };
  }, [handleIncoming]);

  return {
    isConnected,
    lastEvent,
  };
}

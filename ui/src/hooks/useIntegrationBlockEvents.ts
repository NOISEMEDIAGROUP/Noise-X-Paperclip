import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LiveEvent } from "@paperclipai/shared";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to listen for integration block and recommendation events via WebSocket
 * and invalidate the relevant queries when events are received.
 */
export function useIntegrationBlockEvents(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!companyId) return;

    let closed = false;

    const connect = () => {
      if (closed) return;

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${protocol}://${window.location.host}/api/companies/${encodeURIComponent(companyId)}/events/ws`;

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onmessage = (message) => {
        const raw = typeof message.data === "string" ? message.data : "";
        if (!raw) return;

        let event: LiveEvent;
        try {
          event = JSON.parse(raw) as LiveEvent;
        } catch {
          return;
        }

        // Handle integration block events
        if (
          event.type === "integration_block.created" ||
          event.type === "integration_block.resolved"
        ) {
          // Invalidate the integration blocks query to refresh the list
          queryClient.invalidateQueries({
            queryKey: queryKeys.integrationBlocks(companyId),
          });
        }

        // Handle integration recommendation events
        if (event.type === "integration_recommendation.created") {
          // Invalidate the recommendations query to refresh the list
          queryClient.invalidateQueries({
            queryKey: queryKeys.integrationRecommendations(companyId),
          });
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (!closed) {
          reconnectTimerRef.current = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close(1000, "unmount");
        socketRef.current = null;
      }
    };
  }, [companyId, queryClient]);
}
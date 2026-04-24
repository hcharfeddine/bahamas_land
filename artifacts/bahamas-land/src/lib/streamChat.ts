import { useEffect, useRef, useState } from "react";

export type ChatMsg = {
  id: number;
  user: string;
  text: string;
  mod?: boolean;
  ts: number;
};

export type ViewerStats = { real: number; fake: number };

const MAX_LOCAL = 80;

function apiBase() {
  const base =
    (import.meta as unknown as { env?: { BASE_URL?: string } }).env
      ?.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("ogs_visitor_id");
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem("ogs_visitor_id", id);
    }
    return id;
  } catch {
    return `v_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function useStreamChat(enabled: boolean): {
  messages: ChatMsg[];
  viewers: ViewerStats;
  connected: boolean;
  send: (user: string, text: string) => Promise<{ ok: boolean; error?: string }>;
} {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [viewers, setViewers] = useState<ViewerStats>({ real: 0, fake: 0 });
  const [connected, setConnected] = useState(false);
  const visitorRef = useRef<string>("");

  useEffect(() => {
    visitorRef.current = getOrCreateVisitorId();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let cancelled = false;
    let retryTimer: number | null = null;

    const connect = () => {
      if (cancelled) return;
      const url = `${apiBase()}api/chat/stream?v=${encodeURIComponent(visitorRef.current)}`;
      try {
        es = new EventSource(url);
      } catch {
        retryTimer = window.setTimeout(connect, 4000);
        return;
      }

      es.addEventListener("open", () => setConnected(true));

      es.addEventListener("hello", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data);
          if (Array.isArray(data.messages)) {
            setMessages(data.messages.slice(-MAX_LOCAL));
          }
          if (data.viewers) setViewers(data.viewers);
        } catch {}
      });

      es.addEventListener("msg", (ev) => {
        try {
          const m = JSON.parse((ev as MessageEvent).data) as ChatMsg;
          setMessages((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev.slice(-(MAX_LOCAL - 1)), m];
          });
        } catch {}
      });

      es.addEventListener("viewers", (ev) => {
        try {
          setViewers(JSON.parse((ev as MessageEvent).data));
        } catch {}
      });

      es.addEventListener("error", () => {
        setConnected(false);
        es?.close();
        es = null;
        if (!cancelled) retryTimer = window.setTimeout(connect, 3500);
      });
    };

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      es?.close();
      es = null;
      setConnected(false);
    };
  }, [enabled]);

  const send = async (user: string, text: string) => {
    try {
      const res = await fetch(`${apiBase()}api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data?.error || `http_${res.status}` };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "network" };
    }
  };

  return { messages, viewers, connected, send };
}

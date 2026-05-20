import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured, RemoteCourtVerdict } from "@/lib/supabase";
import { useVerdicts, Verdict } from "@/lib/store";

export type SharedVerdict = Verdict & {
  status?: "pending" | "approved" | "rejected";
  pinned?: boolean;
};

const CACHE_TTL_MS     = 30 * 60 * 1000;
const FALLBACK_POLL_MS = 60 * 1000;

function remoteToLocal(r: RemoteCourtVerdict): SharedVerdict {
  return {
    id: r.id,
    username: r.username,
    text: r.text,
    verdict: r.verdict,
    timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    status: r.status,
    pinned: r.pinned,
  };
}

export function useSharedCourt() {
  const [localItems, setLocalItems] = useVerdicts();
  const [remoteItems, setRemoteItems] = useState<SharedVerdict[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const fetchRemote = useCallback(async (force = false) => {
    if (!supabase) return;
    const now = Date.now();
    if (!force && now - lastFetchRef.current < CACHE_TTL_MS) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("court_verdicts")
      .select("id,username,text,verdict,status,pinned,created_at")
      .eq("status", "approved")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) {
      console.warn("[court] fetch error", error);
      return;
    }
    lastFetchRef.current = Date.now();
    setRemoteItems((data || []).map(remoteToLocal));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    fetchRemote(true);
    const client = supabase;

    const channel = client
      .channel("court-verdicts-public")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "court_verdicts" },
        (payload) => {
          const item = payload.new as RemoteCourtVerdict;
          if (item.status !== "approved") return;
          const local = remoteToLocal(item);
          setRemoteItems((prev) => {
            if (!prev) return [local];
            const next = [local, ...prev];
            next.sort((a, b) => {
              if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
              return b.timestamp - a.timestamp;
            });
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "court_verdicts" },
        (payload) => {
          const item = payload.new as RemoteCourtVerdict;
          const local = remoteToLocal(item);
          setRemoteItems((prev) => {
            if (!prev) return prev;
            let next: SharedVerdict[];
            if (item.status === "approved") {
              const exists = prev.some((i) => i.id === item.id);
              next = exists
                ? prev.map((i) => (i.id === item.id ? local : i))
                : [local, ...prev];
            } else {
              next = prev.filter((i) => i.id !== item.id);
            }
            next.sort((a, b) => {
              if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
              return b.timestamp - a.timestamp;
            });
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "court_verdicts" },
        (payload) => {
          const id = (payload.old as { id?: string })?.id;
          if (id) setRemoteItems((prev) => prev ? prev.filter((i) => i.id !== id) : prev);
        }
      )
      .subscribe((status) => {
        const connected = status === "SUBSCRIBED";
        setRealtimeConnected(connected);
        if (connected) {
          fetchRemote(true);
        }
      });

    return () => {
      client.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [fetchRemote]);

  // Fallback polling when real-time is not connected
  useEffect(() => {
    if (!isSupabaseConfigured || realtimeConnected) return;
    const id = window.setInterval(() => fetchRemote(true), FALLBACK_POLL_MS);
    return () => window.clearInterval(id);
  }, [realtimeConnected, fetchRemote]);

  const submit = useCallback(
    async (item: { username: string; text: string; verdict: string }) => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("court_verdicts").insert({
          username: item.username,
          text: item.text,
          verdict: item.verdict,
          status: "pending",
          pinned: false,
        });
        if (error) {
          console.warn("[court] insert error", error);
          return { ok: false, pending: false, error: error.message };
        }
        return { ok: true, pending: true };
      }
      const newItem: SharedVerdict = {
        id: Math.random().toString(36).slice(2, 11),
        username: item.username,
        text: item.text,
        verdict: item.verdict,
        timestamp: Date.now(),
        status: "approved",
      };
      setLocalItems([newItem, ...localItems]);
      return { ok: true, pending: false };
    },
    [localItems, setLocalItems]
  );

  const items: SharedVerdict[] = isSupabaseConfigured ? (remoteItems || []) : localItems;

  return { items, loading, submit, isShared: isSupabaseConfigured };
}

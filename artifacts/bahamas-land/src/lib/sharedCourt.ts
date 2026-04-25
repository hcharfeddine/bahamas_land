import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured, RemoteCourtVerdict } from "@/lib/supabase";
import { useVerdicts, Verdict } from "@/lib/store";

export type SharedVerdict = Verdict & {
  status?: "pending" | "approved" | "rejected";
  pinned?: boolean;
};

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

  const fetchRemote = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("court_verdicts")
      .select("*")
      .eq("status", "approved")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) {
      console.warn("[court] fetch error", error);
      return;
    }
    setRemoteItems((data || []).map(remoteToLocal));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    fetchRemote();
    const client = supabase;
    const channel = client
      .channel("court-verdicts-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "court_verdicts" },
        () => fetchRemote()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [fetchRemote]);

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

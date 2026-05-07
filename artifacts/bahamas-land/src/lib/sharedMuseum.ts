import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured, RemoteMuseumItem } from "@/lib/supabase";
import { useMuseum, MuseumItem } from "@/lib/store";

export type SharedMuseumItem = MuseumItem & { status?: "pending" | "approved" | "rejected" };

const CACHE_TTL_MS = 5 * 60 * 1000;

function remoteToLocal(r: RemoteMuseumItem): SharedMuseumItem {
  return {
    id: r.id,
    username: r.username,
    caption: r.caption,
    image: r.image_url,
    label: r.label,
    respect: r.respect ?? 0,
    timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    status: r.status,
  };
}

export function useSharedMuseum() {
  const [localItems, setLocalItems] = useMuseum();
  const [remoteItems, setRemoteItems] = useState<SharedMuseumItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const fetchRemote = useCallback(async (force = false) => {
    if (!supabase) return;
    const now = Date.now();
    if (!force && now - lastFetchRef.current < CACHE_TTL_MS) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("museum_items")
      .select("id,username,caption,image_url,label,respect,status,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.warn("[museum] fetch error", error);
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
      .channel("museum-items-public")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "museum_items" },
        (payload) => {
          const item = payload.new as RemoteMuseumItem;
          if (item.status !== "approved") return;
          const local = remoteToLocal(item);
          setRemoteItems((prev) => (prev ? [local, ...prev] : [local]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "museum_items" },
        (payload) => {
          const item = payload.new as RemoteMuseumItem;
          const local = remoteToLocal(item);
          setRemoteItems((prev) => {
            if (!prev) return prev;
            if (item.status === "approved") {
              const exists = prev.some((i) => i.id === item.id);
              return exists
                ? prev.map((i) => (i.id === item.id ? local : i))
                : [local, ...prev];
            }
            return prev.filter((i) => i.id !== item.id);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "museum_items" },
        (payload) => {
          const id = (payload.old as { id?: string })?.id;
          if (id) setRemoteItems((prev) => prev ? prev.filter((i) => i.id !== id) : prev);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [fetchRemote]);

  const submit = useCallback(
    async (item: { username: string; caption: string; image: string | null; label: string }) => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("museum_items").insert({
          username: item.username,
          caption: item.caption,
          image_url: item.image,
          label: item.label,
          status: "pending",
        });
        if (error) {
          console.warn("[museum] insert error", error);
          return { ok: false, pending: false, error: error.message };
        }
        return { ok: true, pending: true };
      }
      const newItem: SharedMuseumItem = {
        id: Math.random().toString(36).slice(2, 11),
        username: item.username,
        caption: item.caption,
        image: item.image,
        label: item.label,
        respect: 0,
        timestamp: Date.now(),
        status: "approved",
      };
      setLocalItems([newItem, ...localItems]);
      return { ok: true, pending: false };
    },
    [localItems, setLocalItems]
  );

  const respect = useCallback(
    async (id: string) => {
      if (isSupabaseConfigured && supabase) {
        await supabase.rpc("respect_museum_item", { item_id: id });
        setRemoteItems((prev) =>
          prev ? prev.map((i) => (i.id === id ? { ...i, respect: i.respect + 1 } : i)) : prev
        );
        return;
      }
      setLocalItems(
        localItems.map((i) => (i.id === id ? { ...i, respect: i.respect + 1 } : i))
      );
    },
    [localItems, setLocalItems]
  );

  const items: SharedMuseumItem[] = isSupabaseConfigured ? (remoteItems || []) : localItems;

  return { items, loading, submit, respect, isShared: isSupabaseConfigured };
}

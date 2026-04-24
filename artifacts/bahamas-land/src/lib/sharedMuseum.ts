import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured, RemoteMuseumItem } from "@/lib/supabase";
import { useMuseum, MuseumItem } from "@/lib/store";

export type SharedMuseumItem = MuseumItem & { status?: "pending" | "approved" | "rejected" };

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

  const fetchRemote = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("museum_items")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.warn("[museum] fetch error", error);
      return;
    }
    setRemoteItems((data || []).map(remoteToLocal));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    fetchRemote();
    const client = supabase;
    const channel = client
      .channel("museum-items-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "museum_items" },
        () => fetchRemote()
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
        const { error } = await supabase.rpc("respect_museum_item", { item_id: id });
        if (error) {
          console.warn("[museum] respect error", error);
          await supabase
            .from("museum_items")
            .update({ respect: ((remoteItems?.find((i) => i.id === id)?.respect ?? 0) + 1) })
            .eq("id", id);
        }
        return;
      }
      setLocalItems(
        localItems.map((i) => (i.id === id ? { ...i, respect: i.respect + 1 } : i))
      );
    },
    [localItems, remoteItems, setLocalItems]
  );

  const items: SharedMuseumItem[] = isSupabaseConfigured ? (remoteItems || []) : localItems;

  return { items, loading, submit, respect, isShared: isSupabaseConfigured };
}

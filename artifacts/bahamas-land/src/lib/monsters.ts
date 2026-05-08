import { supabase, isSupabaseConfigured, type RemoteMonster } from "@/lib/supabase";
import { getStoredUsername, getStoredPin, hashPin } from "@/lib/players";

export const KICK_USERNAME_KEY = "ogs_v2_kick_username";

export function getPlayerKickUsername(): string | null {
  try { return localStorage.getItem(KICK_USERNAME_KEY) || null; } catch { return null; }
}

export function setPlayerKickUsername(ku: string | null): void {
  try {
    if (ku) localStorage.setItem(KICK_USERNAME_KEY, ku);
    else localStorage.removeItem(KICK_USERNAME_KEY);
  } catch { /* ignore */ }
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; reason: string };

export async function getMonster(kickUsername: string): Promise<RemoteMonster | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("monsters")
      .select("*")
      .eq("kick_username", kickUsername.toLowerCase().trim())
      .maybeSingle();
    if (error || !data) return null;
    return data as RemoteMonster;
  } catch { return null; }
}

export async function fetchTopMonsters(limit = 50): Promise<RemoteMonster[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("monsters")
      .select("id,kick_username,stage,hunger,mood,energy,level,personality,status,critical_ticks,last_updated_at,created_at,last_chat_at,chat_count")
      .neq("status", "dead")
      .order("level", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as RemoteMonster[];
  } catch { return []; }
}

export async function linkKickUsername(kickUsername: string): Promise<ApiResult<string>> {
  if (!supabase || !isSupabaseConfigured) return { ok: false, reason: "no_backend" };
  const username = getStoredUsername();
  const pin = getStoredPin();
  if (!username || !pin) return { ok: false, reason: "no_session" };

  const ku = kickUsername.trim().toLowerCase();
  if (ku.length < 2 || ku.length > 30) return { ok: false, reason: "bad_format" };
  if (!/^[a-z0-9_]+$/.test(ku)) return { ok: false, reason: "bad_format" };

  try {
    const pin_hash = await hashPin(username, pin);
    const { data, error } = await supabase.rpc("player_link_kick", {
      p_username: username,
      p_pin_hash: pin_hash,
      p_kick_username: ku,
    });
    if (error) return { ok: false, reason: error.message };
    if (!data?.ok) return { ok: false, reason: data?.reason || "unknown" };
    setPlayerKickUsername(ku);
    return { ok: true, data: ku };
  } catch { return { ok: false, reason: "network" }; }
}

export async function loadKickUsernameFromServer(): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  const username = getStoredUsername();
  const pin = getStoredPin();
  if (!username || !pin) return null;
  try {
    const pin_hash = await hashPin(username, pin);
    const { data } = await supabase.rpc("get_player_kick_username", {
      p_username: username,
      p_pin_hash: pin_hash,
    });
    if (data?.ok && data.kick_username) {
      setPlayerKickUsername(data.kick_username);
      return data.kick_username;
    }
    return null;
  } catch { return null; }
}

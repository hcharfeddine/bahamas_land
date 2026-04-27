import { ACHIEVEMENTS, getAllUnlocked } from "@/lib/achievements";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "ogs_reward_claim";
const ID_KEY = "ogs_visitor_id";

export type ClaimResult = {
  ok: boolean;
  citizenNumber?: number;
  total?: number;
  fullCount?: number;
  isTop100?: boolean;
  seed?: string;
  username?: string;
  claimedAt?: number;
  reason?: string;
  missing?: string[];
};

export type RewardStatus = {
  fullCount: number;
  top100Remaining: number;
  requiredCount?: number;
};

function ensureVisitorId(): string {
  let id = "";
  try { id = localStorage.getItem(ID_KEY) || ""; } catch { /* ignore */ }
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem(ID_KEY, id); } catch { /* ignore */ }
  }
  return id;
}

export function getStoredClaim(): ClaimResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeClaim(c: ClaimResult) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

/**
 * Returns IDs of "non-trivial" achievements that count toward the Top-100 reward.
 * The reward "oracle" achievement is excluded — it's the reward itself.
 */
export function rewardRequiredIds(): string[] {
  return ACHIEVEMENTS
    .filter((a) => a.id !== "oracle")
    .map((a) => a.id);
}

export function getProgress() {
  const unlocked = getAllUnlocked();
  const required = rewardRequiredIds();
  const have = required.filter((id) => unlocked[id]);
  return {
    have: have.length,
    total: required.length,
    missing: required.filter((id) => !unlocked[id]),
  };
}

function apiBase(): string {
  const base = (import.meta as any).env?.BASE_URL || "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

// ---------------------------------------------------------------------------
// CLAIM — Supabase RPC if configured, else local Vite middleware fallback
// ---------------------------------------------------------------------------
async function claimViaSupabase(
  visitorId: string,
  username: string,
  ids: string[],
): Promise<ClaimResult> {
  if (!supabase) return { ok: false, reason: "no_supabase" };
  const { data, error } = await supabase.rpc("claim_reward", {
    p_visitor_id: visitorId,
    p_username: username,
    p_achievements: ids,
  });
  if (error) return { ok: false, reason: error.message || "rpc_error" };
  return (data as ClaimResult) ?? { ok: false, reason: "empty_response" };
}

async function claimViaLocal(
  visitorId: string,
  username: string,
  ids: string[],
): Promise<ClaimResult> {
  try {
    const res = await fetch(`${apiBase()}/api/reward/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, username, achievements: ids }),
    });
    return (await res.json()) as ClaimResult;
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function claimReward(username: string): Promise<ClaimResult> {
  const visitorId = ensureVisitorId();
  const unlocked = getAllUnlocked();
  const required = rewardRequiredIds();
  const ids = required.filter((id) => unlocked[id]);

  if (ids.length < required.length) {
    return {
      ok: false,
      reason: "incomplete",
      missing: required.filter((id) => !unlocked[id]),
    };
  }

  const result = isSupabaseConfigured
    ? await claimViaSupabase(visitorId, username, ids)
    : await claimViaLocal(visitorId, username, ids);

  if (result.ok) storeClaim(result);
  return result;
}

// ---------------------------------------------------------------------------
// STATUS — Supabase RPC if configured, else local Vite middleware fallback
// ---------------------------------------------------------------------------
export async function fetchRewardStatus(): Promise<RewardStatus | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("reward_status");
    if (error || !data) return null;
    const d = data as { fullCount?: number | string; top100Remaining?: number | string; requiredCount?: number | string };
    return {
      fullCount: Number(d.fullCount) || 0,
      top100Remaining: Number(d.top100Remaining) || 0,
      requiredCount: d.requiredCount != null ? Number(d.requiredCount) : undefined,
    };
  }
  try {
    const res = await fetch(`${apiBase()}/api/reward/status`);
    const d = await res.json();
    return {
      fullCount: Number(d.fullCount) || 0,
      top100Remaining: Number(d.top100Remaining) || 0,
      requiredCount: d.requiredCount != null ? Number(d.requiredCount) : undefined,
    };
  } catch {
    return null;
  }
}

import { ACHIEVEMENTS, getAllUnlocked } from "@/lib/achievements";

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

  const base = (import.meta as any).env?.BASE_URL || "/";
  const apiBase = base.endsWith("/") ? base.slice(0, -1) : base;

  try {
    const res = await fetch(`${apiBase}/api/reward/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, username, achievements: ids }),
    });
    const data = (await res.json()) as ClaimResult;
    if (data.ok) storeClaim(data);
    return data;
  } catch (e) {
    return { ok: false, reason: "network" };
  }
}

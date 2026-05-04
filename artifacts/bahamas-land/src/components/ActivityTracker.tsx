import { useEffect } from "react";
import { useActivityTracker, trackCoins } from "@/lib/tracker";
import { useCoins } from "@/lib/store";
import { useAchievements, ACHIEVEMENTS, unlock } from "@/lib/achievements";

// ============================================================================
// ACTIVITY TRACKER
// ============================================================================
// Mounted globally. Watches location, click count, coin peak, and unlocks
// progression-style achievements (tourist, clicker, richman, ascended,
// completionist) without requiring the user to do anything special.
// ============================================================================

export function ActivityTracker() {
  useActivityTracker();
  const [coins] = useCoins();
  const { data, unlockedCount, total } = useAchievements();

  // Track peak coin balance for richman
  useEffect(() => {
    trackCoins(coins);
  }, [coins]);

  // Ascended: rank reaches Protected Class (mirrors Passport rank formula)
  useEffect(() => {
    // Lazy compute "rank" without re-importing — protected class threshold is 200 score
    // score = coins/100 + verdicts*5 + applause*0.5
    try {
      const verdictsRaw = window.localStorage.getItem("ogs_verdicts");
      const applauseRaw = window.localStorage.getItem("ogs_applause");
      const verdicts = verdictsRaw ? JSON.parse(verdictsRaw) : [];
      const applause = applauseRaw ? Number(JSON.parse(applauseRaw)) : 0;
      const score =
        coins / 100 +
        (Array.isArray(verdicts) ? verdicts.length : 0) * 5 +
        (Number.isFinite(applause) ? applause : 0) * 0.5;
      if (score >= 75) unlock("minister");
      if (score >= 200) unlock("ascended");
    } catch {
      /* ignore */
    }
  }, [coins]);

  // Completionist: every other achievement unlocked (oracle excluded — it's the reward itself)
  useEffect(() => {
    if (data["completionist"]) return;
    const missing = ACHIEVEMENTS
      .filter((a) => a.id !== "completionist" && a.id !== "oracle")
      .filter((a) => !data[a.id])
      .map((a) => a.id);
    if (missing.length === 0) {
      unlock("completionist");
    }
  }, [data]);

  return null;
}

// ============================================================================
// ACTIVITY TRACKER
// ============================================================================
// Persistent counters used to drive achievements that depend on long-term
// activity (number of pages visited, total clicks, peak NC, etc).
// ============================================================================

import { useEffect } from "react";
import { useLocation } from "wouter";
import { unlock } from "@/lib/achievements";

const VISITED_KEY = "ogs_visited_paths";
const CLICKS_KEY = "ogs_total_clicks";
const PEAK_COINS_KEY = "ogs_peak_coins";
const SPENT_KEY = "ogs_total_spent";

const PUBLIC_ROOMS = [
  "/",
  "/world",
  "/court",
  "/museum",
  "/library",
  "/bank",
  "/palace",
  "/arcade",
  "/stream",
  "/stocks",
  "/inbox",
  "/citizenship",
  "/news",
  "/passport",
  "/police",
];

function readSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

function readNum(key: string): number {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw ? Number(JSON.parse(raw)) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeNum(key: string, n: number) {
  try {
    window.localStorage.setItem(key, JSON.stringify(n));
  } catch {
    /* ignore */
  }
}

export function trackVisit(pathname: string) {
  const set = readSet(VISITED_KEY);
  set.add(pathname);
  writeSet(VISITED_KEY, set);
  if (set.size >= 3) unlock("tourist");
  const allVisited = PUBLIC_ROOMS.every((p) => set.has(p));
  if (allVisited) unlock("loyaltour");
}

export function trackClick() {
  const n = readNum(CLICKS_KEY) + 1;
  writeNum(CLICKS_KEY, n);
  if (n >= 50) unlock("clicker");
}

export function trackCoins(coins: number) {
  const peak = Math.max(readNum(PEAK_COINS_KEY), coins);
  writeNum(PEAK_COINS_KEY, peak);
  if (peak >= 10_000) unlock("richman");
}

export function trackSpend(amount: number) {
  if (amount <= 0) return;
  const total = readNum(SPENT_KEY) + amount;
  writeNum(SPENT_KEY, total);
  if (total >= 1_000) unlock("patriot");
}

export function getTotalSpent(): number {
  return readNum(SPENT_KEY);
}

export function useActivityTracker() {
  const [location] = useLocation();

  useEffect(() => {
    trackVisit(location);
  }, [location]);

  useEffect(() => {
    const onClick = () => trackClick();
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);
}

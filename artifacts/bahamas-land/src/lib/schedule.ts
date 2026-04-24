// ============================================================================
// President Nattoun's stream schedule
// ============================================================================
// Daily-deterministic schedule. Each calendar day produces the SAME single
// slot for every visitor.
//
//   - One slot per day, picked randomly from a category:
//       * "clips"    — clip compilation
//       * "chatting" — just chatting
//       * "kick"     — kick simulcast
//       * "t5athel"  — President is NOT streaming today, just send tips
//   - Outside that one slot the stream is CLOSED.
//   - On t5athel days there is no slot at all.
// ============================================================================

export type SlotCategory = "clips" | "chatting" | "kick" | "t5athel";

export type Slot = {
  startMin: number; // minutes since 00:00 local
  endMin: number;
  category: SlotCategory;
  label: string;
};

const CATEGORIES: SlotCategory[] = ["clips", "chatting", "kick", "t5athel"];

const CATEGORY_LABEL: Record<SlotCategory, string> = {
  clips: "CLIPS COMPILATION",
  chatting: "JUST CHATTING",
  kick: "KICK SIMULCAST",
  t5athel: "T5ATHELT — NO STREAM TODAY",
};

function dayKey(d: Date): number {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y * 10000 + m * 100 + day;
}

function makeRng(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getDayCategory(d: Date): SlotCategory {
  const rand = makeRng(dayKey(d));
  return CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
}

export function getSlotForDay(d: Date): Slot | null {
  const rand = makeRng(dayKey(d));
  // First random pick = category (must match getDayCategory order)
  const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];

  if (category === "t5athel") return null;

  // Single slot at a random time of day, ~25-45 min long
  const startHour = 8 + Math.floor(rand() * 14); // 08:00 – 21:59
  const startMin = Math.floor(rand() * 60);
  const dur = 25 + Math.floor(rand() * 21); // 25 – 45 min
  const start = startHour * 60 + startMin;
  const end = Math.min(24 * 60 - 1, start + dur);

  return {
    startMin: start,
    endMin: end,
    category,
    label: CATEGORY_LABEL[category],
  };
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatSlot(s: Slot): string {
  return `${fmt(s.startMin)}–${fmt(s.endMin)}`;
}

export type StreamStatus = {
  now: Date;
  live: boolean;
  trolling: boolean; // live in a non-"chatting" category (cosmetic flair)
  crashed: boolean; // T5ATHELT state (whole day OR slot already burned)
  category: SlotCategory; // today's chosen category
  current: Slot | null;
  next: { slot: Slot; minutesUntil: number; isToday: boolean } | null;
  slot: Slot | null; // today's single slot (null on t5athel days)
  slots: Slot[]; // back-compat — array form, length 0 or 1
};

// How long the President actually stays live before he gives up for the slot.
// The slot opens for this many seconds, then the stream "crashes" and shows
// T5ATHELT for the remainder of the slot window.
export const LIVE_DURATION_SEC = 60;

function findNextSlot(now: Date): {
  slot: Slot;
  minutesUntil: number;
  isToday: boolean;
} | null {
  const m = now.getHours() * 60 + now.getMinutes();
  const todaySlot = getSlotForDay(now);
  if (todaySlot && m < todaySlot.startMin) {
    return { slot: todaySlot, minutesUntil: todaySlot.startMin - m, isToday: true };
  }
  // Look ahead up to 7 days for the next slot
  for (let i = 1; i <= 7; i++) {
    const future = new Date(now);
    future.setDate(future.getDate() + i);
    const slot = getSlotForDay(future);
    if (slot) {
      const minutesUntil =
        (24 - now.getHours()) * 60 -
        now.getMinutes() +
        (i - 1) * 24 * 60 +
        slot.startMin;
      return { slot, minutesUntil, isToday: false };
    }
  }
  return null;
}

export function getStreamStatus(now: Date = new Date()): StreamStatus {
  const category = getDayCategory(now);
  const slot = getSlotForDay(now);
  const m = now.getHours() * 60 + now.getMinutes();
  const nowSec =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // T5ATHELT day — no stream all day, just send tips
  if (category === "t5athel" || !slot) {
    return {
      now,
      live: false,
      trolling: false,
      crashed: true,
      category: "t5athel",
      current: null,
      next: findNextSlot(now),
      slot: null,
      slots: [],
    };
  }

  let live = false;
  let crashed = false;
  let current: Slot | null = null;

  if (m >= slot.startMin && m < slot.endMin) {
    const slotStartSec = slot.startMin * 60;
    const sinceStart = nowSec - slotStartSec;
    if (sinceStart >= 0 && sinceStart < LIVE_DURATION_SEC) {
      live = true;
      current = slot;
    } else {
      crashed = true;
    }
  }

  let next: StreamStatus["next"] = null;
  if (!current) {
    next = findNextSlot(now);
  }

  return {
    now,
    live,
    trolling: live && current !== null && current.category !== "chatting",
    crashed,
    category,
    current,
    next,
    slot,
    slots: [slot],
  };
}

export function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

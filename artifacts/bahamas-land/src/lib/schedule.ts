// ============================================================================
// President Nattoun's stream schedule
// ============================================================================
// Daily-deterministic schedule. Each calendar day produces the same list of
// "live" slots so visitors agree on when the President is broadcasting.
//
//   - First slot every day is the OFFICIAL ADDRESS at 17:50 (35 min)
//   - Plus 2-3 RANDOM slots scattered across the day (deterministic per day)
//   - Outside of any slot the stream is CLOSED.
// ============================================================================

export type Slot = {
  startMin: number; // minutes since 00:00 local
  endMin: number;
  kind: "official" | "random";
  label: string;
};

export const MAIN_SLOT_HOUR = 17;
export const MAIN_SLOT_MIN = 50;
export const MAIN_SLOT_DURATION = 35;

const MAIN_SLOT_START = MAIN_SLOT_HOUR * 60 + MAIN_SLOT_MIN;
const MAIN_SLOT_END = MAIN_SLOT_START + MAIN_SLOT_DURATION;

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

function overlaps(a: Slot, b: Slot): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

const RANDOM_LABELS = [
  "EMERGENCY ADDRESS",
  "UNSCHEDULED RANT",
  "BREAD UPDATE",
  "RANDOM PRESS CONFERENCE",
  "OG COURT BROADCAST",
  "VIBE CHECK",
];

export function getSlotsForDay(d: Date): Slot[] {
  const seed = dayKey(d);
  const rand = makeRng(seed);

  const slots: Slot[] = [
    {
      startMin: MAIN_SLOT_START,
      endMin: MAIN_SLOT_END,
      kind: "official",
      label: "STATE OF THE UNION",
    },
  ];

  const extraCount = 2 + Math.floor(rand() * 2); // 2 or 3 extras
  let attempts = 0;
  while (slots.length < 1 + extraCount && attempts < 30) {
    attempts++;
    const startHour = 8 + Math.floor(rand() * 15); // 08:00 - 22:59
    const startMin = Math.floor(rand() * 60);
    const dur = 20 + Math.floor(rand() * 25); // 20 - 44 min
    const start = startHour * 60 + startMin;
    const end = Math.min(24 * 60 - 1, start + dur);
    const label = RANDOM_LABELS[Math.floor(rand() * RANDOM_LABELS.length)];
    const candidate: Slot = {
      startMin: start,
      endMin: end,
      kind: "random",
      label,
    };
    if (slots.some((s) => overlaps(s, candidate))) continue;
    slots.push(candidate);
  }

  return slots.sort((a, b) => a.startMin - b.startMin);
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatSlot(s: Slot): string {
  return `${fmt(s.startMin)}–${fmt(s.endMin)}`;
}

function minutesUntilFromList(
  nowMin: number,
  starts: number[],
): number | null {
  const future = starts.filter((s) => s > nowMin).sort((a, b) => a - b);
  if (future.length > 0) return future[0] - nowMin;
  return null;
}

export type StreamStatus = {
  now: Date;
  live: boolean;
  trolling: boolean; // live but in a random (non-official) slot
  current: Slot | null;
  next: { slot: Slot; minutesUntil: number; isToday: boolean } | null;
  slots: Slot[]; // today's slots
};

export function getStreamStatus(now: Date = new Date()): StreamStatus {
  const slots = getSlotsForDay(now);
  const m = now.getHours() * 60 + now.getMinutes();
  const current = slots.find((s) => m >= s.startMin && m < s.endMin) ?? null;

  let next: StreamStatus["next"] = null;
  if (!current) {
    const upcoming = minutesUntilFromList(
      m,
      slots.map((s) => s.startMin),
    );
    if (upcoming !== null) {
      const slot = slots.find((s) => s.startMin === m + upcoming)!;
      next = { slot, minutesUntil: upcoming, isToday: true };
    } else {
      // Next is tomorrow's official address
      const minutesUntilTomorrowMain = 24 * 60 - m + MAIN_SLOT_START;
      next = {
        slot: {
          startMin: MAIN_SLOT_START,
          endMin: MAIN_SLOT_END,
          kind: "official",
          label: "STATE OF THE UNION",
        },
        minutesUntil: minutesUntilTomorrowMain,
        isToday: false,
      };
    }
  }

  return {
    now,
    live: current !== null,
    trolling: current !== null && current.kind === "random",
    current,
    next,
    slots,
  };
}

export function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

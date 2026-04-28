// =============================================================================
// achievementImages.ts
//
// Maps each AchievementId to a generated President-Nattoun illustration.
// Images are loaded eagerly via Vite's `import.meta.glob` so missing files
// gracefully fall back to a stylized portrait card (no broken <img>s).
//
// Generated images live at: attached_assets/generated_images/ach_<id>.png
// =============================================================================

import nattounImg from "@assets/Nattoun_1777028672745.png";

// Vite eagerly imports every existing ach_*.png at build time.
// Note: the path is RELATIVE to this file. We map the resulting object into a
// flat lookup keyed by achievement id.
const generated = import.meta.glob<{ default: string }>(
  "../../../../attached_assets/generated_images/ach_*.png",
  { eager: true },
);

const lookup: Record<string, string> = {};
for (const [path, mod] of Object.entries(generated)) {
  const m = path.match(/ach_([^/]+)\.png$/);
  if (m && mod && (mod as { default: string }).default) {
    lookup[m[1]] = (mod as { default: string }).default;
  }
}

/**
 * Returns the AI-generated card image for an achievement, or `null` when no
 * image has been generated for that id yet (the UI then renders a stylized
 * fallback portrait card so the experience never has broken images).
 */
export function getAchievementImage(id: string): string | null {
  return lookup[id] ?? null;
}

/** Default Nattoun portrait used as the fallback art on cards without a generated image. */
export const fallbackPortrait = nattounImg;

/** True if an AI-generated portrait exists for this achievement. */
export function hasGeneratedImage(id: string): boolean {
  return Boolean(lookup[id]);
}

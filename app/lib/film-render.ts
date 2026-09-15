/**
 * Build-safe film rendering helpers.
 *
 * The actual browser editor lives in app/page.tsx. This compatibility module
 * intentionally has no FFmpeg package imports so old deployments containing
 * an obsolete app/lib/film-render.ts cannot break TypeScript builds.
 */
export type FilmClip = { url: string; durationSeconds?: number; id?: number };

export function createFilmPlan(clips: FilmClip[], targetMinutes = 1) {
  return {
    clips,
    targetMinutes: Math.max(1, Math.min(60, Number(targetMinutes) || 1)),
    targetSeconds: Math.max(1, Math.min(60, Number(targetMinutes) || 1)) * 60,
  };
}

export function getClipCount(minutes: number) {
  return Math.max(1, Math.round(Math.max(1, Math.min(60, Number(minutes) || 1)) * 12));
}

// Shared className strings for the right-cluster action-bar buttons, so the
// "in use" tool triggers and the Clear-all button render as pixel-identical
// blue-fill pills and can't drift apart.
//
// The base intentionally omits `bg-*` — the background lives in each state
// branch instead, so the active `bg-sky-600` wins. Two same-specificity `bg-*`
// classes on one element resolve by stylesheet order, not className order, so a
// base `bg-[var(--panel-background)]` would otherwise beat an active override.

export const TOOLBAR_TRIGGER_BASE =
  "relative inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"

/** Vibrant "in use" state — filled blue, white text (mirrors the Create button). */
export const TOOLBAR_TRIGGER_ACTIVE = "border-sky-600 bg-sky-600 text-white hover:bg-sky-500"

/**
 * Resting state — bordered panel pill. The border is a crisp sky/60 (not the
 * faint 30%-alpha `--panel-border`) so the pill's 34px box reads at the same
 * visual size as the solid-blue active pill; a faint edge on a near-white header
 * makes the resting button appear smaller than its filled-blue counterpart.
 */
export const TOOLBAR_TRIGGER_INACTIVE =
  "border-sky-500/60 bg-[var(--panel-background)] text-[var(--foreground)]/80 hover:border-sky-500 hover:text-[var(--foreground)]"

export const FLOORING_PRIMARY_ACCENT_CLASS_NAME = "bg-blue-500 text-black"

// Opaque panel/rail surface matching the list-view title tab (blue-500/15 composited over the page).
export const FLOORING_LIST_TINT_PANEL_CLASS_NAME = "bg-[#dce9fc]"

export const FLOORING_PRIMARY_ACCENT_INTERACTIVE_CLASS_NAME = `${FLOORING_PRIMARY_ACCENT_CLASS_NAME} hover:bg-blue-400`

export const FLOORING_ACTIVE_NAV_TAB_CLASS_NAME = [
  "rounded-full px-3 py-2 text-sm font-medium shadow-[0_0_12px_rgba(59,130,246,0.18)]",
  FLOORING_PRIMARY_ACCENT_CLASS_NAME,
].join(" ")

export const FLOORING_AVATAR_BUTTON_CLASS_NAME = [
  "flex items-center justify-center rounded-full font-bold transition-all duration-200 shadow-[0_0_6px_rgba(59,130,246,0.35)]",
  FLOORING_PRIMARY_ACCENT_INTERACTIVE_CLASS_NAME,
].join(" ")

export const FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME = [
  "rounded px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
  FLOORING_PRIMARY_ACCENT_INTERACTIVE_CLASS_NAME,
].join(" ")

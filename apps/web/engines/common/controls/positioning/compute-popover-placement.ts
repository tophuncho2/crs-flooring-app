import type { CSSProperties } from "react"

const DEFAULT_VIEWPORT_MARGIN_PX = 8
const DEFAULT_POPOVER_GAP_PX = 6
const DEFAULT_POPOVER_MAX_HEIGHT_PX = 320

export type PopoverPlacementOptions = {
  /** Cap on the popover height before it prefers flipping up. Defaults to 320. */
  maxHeight?: number
  /** Gap between the trigger and the popover. Defaults to 6. */
  gap?: number
  /** Margin kept from the viewport edges. Defaults to 8. */
  margin?: number
}

/**
 * Decide whether an anchored popover renders below or above its trigger. Flips
 * up when there isn't room below for the full max-height AND there's more room
 * above. Caps `maxHeight` to whatever space is available so the popover never
 * extends past the viewport on either side.
 *
 * Returns a `position: fixed` placement (`top` xor `bottom`, plus `maxHeight`);
 * callers supply the horizontal placement (`left`/width). Shared by
 * `AsyncRichDropdown` and `AnchoredPanel`.
 */
export function computePopoverPlacement(
  triggerRect: DOMRect,
  options: PopoverPlacementOptions = {},
): CSSProperties {
  const maxHeight = options.maxHeight ?? DEFAULT_POPOVER_MAX_HEIGHT_PX
  const gap = options.gap ?? DEFAULT_POPOVER_GAP_PX
  const margin = options.margin ?? DEFAULT_VIEWPORT_MARGIN_PX

  const spaceBelow = window.innerHeight - triggerRect.bottom - margin
  const spaceAbove = triggerRect.top - margin
  const openUp = spaceBelow < maxHeight + gap && spaceAbove > spaceBelow
  if (openUp) {
    return {
      bottom: window.innerHeight - triggerRect.top + gap,
      maxHeight: Math.max(0, Math.min(maxHeight, spaceAbove - gap)),
    }
  }
  return {
    top: triggerRect.bottom + gap,
    maxHeight: Math.max(0, Math.min(maxHeight, spaceBelow - gap)),
  }
}

import type { RefObject } from "react"

/**
 * Shared registry of open popover layers, in open order. Every popover
 * primitive that portals its panel to `document.body` (the `AnchoredPanel`
 * behind toolbar menus, plus the `AsyncRichDropdown` / `SelectDropdown` pickers)
 * registers here while open.
 *
 * The problem this solves: a nested popover (e.g. a picker opened *inside* a
 * toolbar menu) portals into a sibling DOM subtree, so the outer layer's
 * `containerRef`/`popoverRef` can't `contains()` it. Without a shared registry
 * the outer layer reads a click inside the inner popover as an "outside" click
 * and closes mid-selection. Each layer consults this registry so a click in a
 * *deeper* (later-opened) layer never closes a shallower one — regardless of
 * which popover primitive drew it.
 */
export type PopoverLayer = {
  containerRef: RefObject<HTMLElement | null>
  popoverRef: RefObject<HTMLElement | null>
}

const openLayers: PopoverLayer[] = []

/** Register a layer as open. Call the returned cleanup when it closes. */
export function registerPopoverLayer(layer: PopoverLayer): () => void {
  openLayers.push(layer)
  return () => {
    const index = openLayers.indexOf(layer)
    if (index >= 0) openLayers.splice(index, 1)
  }
}

/**
 * True when `target` landed inside `layer` itself or any layer opened after it
 * (its descendants). Layers call this from their outside-pointer handler and
 * close only when it returns false.
 */
export function isPointerInsideLayerOrDeeper(target: Node, layer: PopoverLayer): boolean {
  const index = openLayers.indexOf(layer)
  if (index < 0) return false
  for (let i = index; i < openLayers.length; i += 1) {
    const candidate = openLayers[i]
    if (
      candidate.containerRef.current?.contains(target) ||
      candidate.popoverRef.current?.contains(target)
    ) {
      return true
    }
  }
  return false
}

/**
 * True when `layer` is the most recently opened (topmost) layer. Used so Escape
 * dismisses one layer at a time — the open nested dropdown first, not the whole
 * menu underneath it.
 */
export function isTopmostPopoverLayer(layer: PopoverLayer): boolean {
  return openLayers.length > 0 && openLayers[openLayers.length - 1] === layer
}

/**
 * True when any popover layer is currently open. A container that is *not* itself
 * a registered layer (e.g. `RecordModal`) consults this so its own Escape handler
 * defers to an open nested dropdown — Escape closes the dropdown first, and only
 * a second Escape (registry now empty) closes the container.
 */
export function hasOpenPopoverLayer(): boolean {
  return openLayers.length > 0
}

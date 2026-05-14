// ScrollContract captures how the grid handles overflow + header pinning +
// horizontal scroll synchronization between header and body. Defaults are
// captured here so the Grid component reads them through `resolveScrollContract`
// instead of inlining literals.

export type ScrollContract = {
  noWrapHeaders?: boolean
  growToFitText?: boolean
  headerSticky?: boolean
  syncHorizontalScroll?: boolean
  // Opt-in: clip each cell to its CSS Grid track.
  //
  // Body rows: adds `min-w-0 overflow-hidden` to the cell shell so a long
  // unbreakable token cannot inflate its track past `preferredWidth` and
  // steal `fr` share from neighboring columns. Cell renderers (TextCell,
  // StaticFieldValue) already carry `truncate` on their inner text, so
  // ellipsis renders for free once the parent stops inflating.
  //
  // Headers: the label is moved into an inner `<span class="min-w-0
  // truncate">` (block-level flex item — `text-overflow: ellipsis` is
  // well-defined here in a way it is not on an anonymous text node inside
  // a flex parent). The full label is mirrored to `title` so a truncated
  // header is still discoverable on hover.
  //
  // Leave false for record-view sub-grids with editable inputs that should
  // grow to fit their content.
  clipColumnsToTrack?: boolean
}

export type ResolvedScrollContract = Required<ScrollContract>

export const DEFAULT_SCROLL_CONTRACT: ResolvedScrollContract = {
  noWrapHeaders: true,
  growToFitText: true,
  headerSticky: false,
  syncHorizontalScroll: true,
  clipColumnsToTrack: false,
}

export function resolveScrollContract(input?: ScrollContract): ResolvedScrollContract {
  return {
    noWrapHeaders: input?.noWrapHeaders ?? DEFAULT_SCROLL_CONTRACT.noWrapHeaders,
    growToFitText: input?.growToFitText ?? DEFAULT_SCROLL_CONTRACT.growToFitText,
    headerSticky: input?.headerSticky ?? DEFAULT_SCROLL_CONTRACT.headerSticky,
    syncHorizontalScroll:
      input?.syncHorizontalScroll ?? DEFAULT_SCROLL_CONTRACT.syncHorizontalScroll,
    clipColumnsToTrack:
      input?.clipColumnsToTrack ?? DEFAULT_SCROLL_CONTRACT.clipColumnsToTrack,
  }
}

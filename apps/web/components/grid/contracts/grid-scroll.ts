// ScrollContract captures how the grid handles overflow + header pinning +
// horizontal scroll synchronization between header and body. Defaults are
// captured here so the Grid component reads them through `resolveScrollContract`
// instead of inlining literals.

export type ScrollContract = {
  noWrapHeaders?: boolean
  growToFitText?: boolean
  headerSticky?: boolean
  syncHorizontalScroll?: boolean
}

export type ResolvedScrollContract = Required<ScrollContract>

export const DEFAULT_SCROLL_CONTRACT: ResolvedScrollContract = {
  noWrapHeaders: true,
  growToFitText: true,
  headerSticky: false,
  syncHorizontalScroll: true,
}

export function resolveScrollContract(input?: ScrollContract): ResolvedScrollContract {
  return {
    noWrapHeaders: input?.noWrapHeaders ?? DEFAULT_SCROLL_CONTRACT.noWrapHeaders,
    growToFitText: input?.growToFitText ?? DEFAULT_SCROLL_CONTRACT.growToFitText,
    headerSticky: input?.headerSticky ?? DEFAULT_SCROLL_CONTRACT.headerSticky,
    syncHorizontalScroll:
      input?.syncHorizontalScroll ?? DEFAULT_SCROLL_CONTRACT.syncHorizontalScroll,
  }
}

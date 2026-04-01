export type CategoryDeleteLinkState = {
  productLinks: number
}

export function isCategoryDeleteBlocked(state: CategoryDeleteLinkState): boolean {
  return state.productLinks > 0
}

export function getCategoryDeleteBlockedMessage(state: CategoryDeleteLinkState): string {
  if (state.productLinks > 0) {
    return "This category is linked to products and cannot be deleted"
  }

  return ""
}

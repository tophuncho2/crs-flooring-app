export type UnitOfMeasureDeleteLinkState = {
  categoryLinks: number
  serviceLinks: number
}

export function isUnitOfMeasureDeleteBlocked(state: UnitOfMeasureDeleteLinkState): boolean {
  return state.categoryLinks > 0 || state.serviceLinks > 0
}

export function getUnitOfMeasureDeleteBlockedMessage(state: UnitOfMeasureDeleteLinkState): string {
  if (state.categoryLinks > 0) {
    return "This unit of measure is linked to categories and cannot be deleted"
  }

  if (state.serviceLinks > 0) {
    return "This unit of measure is linked and cannot be deleted"
  }

  return ""
}

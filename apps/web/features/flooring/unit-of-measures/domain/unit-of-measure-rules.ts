export {
  isUnitOfMeasureDeleteBlocked,
  getUnitOfMeasureDeleteBlockedMessage,
  type UnitOfMeasureDeleteLinkState,
} from "@builders/domain"

export function normalizeUnitOfMeasureNameForUniqueness(value: string): string {
  return value.trim().toLowerCase()
}

export function isUnitOfMeasureNameConflict(exists: boolean): boolean {
  return exists
}

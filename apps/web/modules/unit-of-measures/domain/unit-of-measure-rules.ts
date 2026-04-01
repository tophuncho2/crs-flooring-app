export {
  isUnitOfMeasureDeleteBlocked,
  getUnitOfMeasureDeleteBlockedMessage,
  type UnitOfMeasureDeleteLinkState,
  normalizeUnitOfMeasureNameForUniqueness,
} from "@builders/domain"

export function isUnitOfMeasureNameConflict(exists: boolean): boolean {
  return exists
}

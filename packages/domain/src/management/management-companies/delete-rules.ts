export type ManagementCompanyDeleteLinkState = {
  propertyCount: number
}

export function isManagementCompanyDeleteBlocked(state: ManagementCompanyDeleteLinkState) {
  return state.propertyCount > 0
}

export function getManagementCompanyDeleteBlockedMessage(state: ManagementCompanyDeleteLinkState) {
  if (state.propertyCount > 0) {
    return "This management company has properties linked and cannot be deleted"
  }
  return ""
}

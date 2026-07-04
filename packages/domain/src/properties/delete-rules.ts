export type PropertyDeleteLinkState = {
  templateCount: number
}

export function isPropertyDeleteBlocked(state: PropertyDeleteLinkState) {
  return state.templateCount > 0
}

export function getPropertyDeleteBlockedMessage(state: PropertyDeleteLinkState) {
  if (state.templateCount > 0) {
    return "This property has templates linked and cannot be deleted"
  }
  return ""
}

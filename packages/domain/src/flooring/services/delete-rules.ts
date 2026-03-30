export type ServiceDeleteLinkState = {
  templateItems: number
  workOrderItems: number
}

export function isServiceDeleteBlocked(state: ServiceDeleteLinkState) {
  return state.templateItems > 0 || state.workOrderItems > 0
}

export function getServiceDeleteBlockedMessage(state: ServiceDeleteLinkState) {
  if (state.templateItems > 0 && state.workOrderItems > 0) {
    return "This service is linked to templates or work orders and cannot be deleted"
  }

  if (state.workOrderItems > 0) {
    return "This service is linked to work orders and cannot be deleted"
  }

  if (state.templateItems > 0) {
    return "This service is linked to templates and cannot be deleted"
  }

  return ""
}

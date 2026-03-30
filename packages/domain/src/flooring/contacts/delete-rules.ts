export type ContactDeleteLinkState = {
  templateAssignments: number
  workOrderAssignments: number
}

export function isContactDeleteBlocked(state: ContactDeleteLinkState) {
  return state.templateAssignments > 0 || state.workOrderAssignments > 0
}

export function getContactDeleteBlockedMessage(state: ContactDeleteLinkState) {
  if (state.templateAssignments > 0 && state.workOrderAssignments > 0) {
    return "This contact is linked to templates or work orders and cannot be deleted"
  }

  if (state.workOrderAssignments > 0) {
    return "This contact is linked to work orders and cannot be deleted"
  }

  if (state.templateAssignments > 0) {
    return "This contact is linked to templates and cannot be deleted"
  }

  return ""
}

export type JobTypeDeleteLinkState = {
  workOrderCount: number
  templateCount: number
}

export function isJobTypeDeleteBlocked(state: JobTypeDeleteLinkState) {
  return state.workOrderCount > 0 || state.templateCount > 0
}

export function getJobTypeDeleteBlockedMessage(state: JobTypeDeleteLinkState) {
  if (state.workOrderCount > 0 && state.templateCount > 0) {
    return "This job type is linked to work orders and templates and cannot be deleted"
  }
  if (state.workOrderCount > 0) {
    return "This job type is linked to work orders and cannot be deleted"
  }
  if (state.templateCount > 0) {
    return "This job type is linked to templates and cannot be deleted"
  }
  return ""
}

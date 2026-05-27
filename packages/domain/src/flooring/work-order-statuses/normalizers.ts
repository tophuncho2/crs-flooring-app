import type { WorkOrderStatusOption } from "./types.js"

export function normalizeWorkOrderStatusOption(status: {
  id: string
  name: string
}): WorkOrderStatusOption {
  return { id: status.id, name: status.name }
}

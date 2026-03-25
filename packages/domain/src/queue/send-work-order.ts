export type SendWorkOrderJob = {
  workOrderId: string
  triggeredByUserId: string
  deliveryChannel?: "email" | "external-sync"
}

export const SEND_WORK_ORDER_JOB = "send-work-order"

import {
  SEND_WORK_ORDER_JOB,
  SYNC_INVENTORY_JOB,
  TEMPLATE_TO_WORK_ORDER_JOB,
  type SendWorkOrderJob,
  type SyncInventoryJob,
  type TemplateToWorkOrderJob,
} from "@builders/domain"

export function createProcessorRegistry() {
  return {
    [SEND_WORK_ORDER_JOB]: async (job: SendWorkOrderJob) => ({
      status: "worker-runtime-not-enabled" as const,
      jobName: SEND_WORK_ORDER_JOB,
      payload: job,
    }),
    [SYNC_INVENTORY_JOB]: async (job: SyncInventoryJob) => ({
      status: "worker-runtime-not-enabled" as const,
      jobName: SYNC_INVENTORY_JOB,
      payload: job,
    }),
    [TEMPLATE_TO_WORK_ORDER_JOB]: async (job: TemplateToWorkOrderJob) => ({
      status: "worker-runtime-not-enabled" as const,
      jobName: TEMPLATE_TO_WORK_ORDER_JOB,
      payload: job,
    }),
  }
}

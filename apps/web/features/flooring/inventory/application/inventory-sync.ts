import { runUseCase } from "@/features/flooring/shared/application/run-use-case"
import type { SyncInventoryJob } from "@builders/domain"

export function runInventorySyncUseCase(job: SyncInventoryJob) {
  return runUseCase(async () => ({
    status: "sync-runtime-not-enabled" as const,
    workOrderId: job.workOrderId ?? null,
    importEntryId: job.importEntryId ?? null,
    reason: job.reason ?? "manual",
    triggeredByUserId: job.triggeredByUserId,
  }))
}

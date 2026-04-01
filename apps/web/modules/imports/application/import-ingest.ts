import { runUseCase } from "@/modules/shared/engines/common/application/run-use-case"
import { createImportEntryUseCase } from "@/modules/imports/application/import-entry"

export function runImportIngestUseCase(body: Record<string, unknown>) {
  return runUseCase(() => createImportEntryUseCase(body))
}

import { runUseCase } from "@/features/flooring/shared/application/run-use-case"
import { createImportEntryUseCase } from "@/features/flooring/imports/application/import-entry"

export function runImportIngestUseCase(body: Record<string, unknown>) {
  return runUseCase(() => createImportEntryUseCase(body))
}

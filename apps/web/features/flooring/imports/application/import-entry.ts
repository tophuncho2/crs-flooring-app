import { getImportFormOptions } from "@/features/flooring/imports/data/queries"
import {
  createImportEntry,
  normalizeImportEntry,
  removeImportEntryIfEmpty,
  updateImportEntry,
} from "@/features/flooring/imports/data/api"

export async function loadImportFormOptionsUseCase() {
  return getImportFormOptions()
}

export async function createImportEntryUseCase(body: Record<string, unknown>) {
  const created = await createImportEntry(body)
  return normalizeImportEntry(created)
}

export async function updateImportEntryUseCase(id: string, body: Record<string, unknown>) {
  const updated = await updateImportEntry(id, body)
  return normalizeImportEntry(updated)
}

export async function deleteImportEntryUseCase(id: string) {
  await removeImportEntryIfEmpty(id)
  return { ok: true as const }
}

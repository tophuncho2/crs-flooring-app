import { listUnitOfMeasures as listUnitOfMeasuresFromDb } from "@builders/db"
import { createAppError, parseRequiredString } from "@/server/http/api-helpers"

export function normalizeUnitOfMeasureInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw createAppError("Invalid request body")
  }

  return {
    name: parseRequiredString((body as Record<string, unknown>).name, "name"),
  }
}

export async function listUnitOfMeasures() {
  return listUnitOfMeasuresFromDb()
}

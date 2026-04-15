import { ServiceExecutionError } from "@builders/application"
import type { ServiceInput } from "@builders/application"
import { isValidUuid } from "@/server/http/api-helpers"

export function validateServiceInput(body: Record<string, unknown>): ServiceInput {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) {
    throw new ServiceExecutionError({
      code: "SERVICE_VALIDATION_FAILED",
      message: "name is required",
      status: 400,
      field: "name",
    })
  }

  const unitId = typeof body.unitId === "string" ? body.unitId.trim() : ""
  if (!unitId) {
    throw new ServiceExecutionError({
      code: "SERVICE_VALIDATION_FAILED",
      message: "unitId is required",
      status: 400,
      field: "unitId",
    })
  }
  if (!isValidUuid(unitId)) {
    throw new ServiceExecutionError({
      code: "SERVICE_VALIDATION_FAILED",
      message: "unitId must be a valid UUID",
      status: 400,
      field: "unitId",
    })
  }

  const baseCostRaw = typeof body.baseCost === "string" ? body.baseCost.trim() : ""
  if (!baseCostRaw) {
    throw new ServiceExecutionError({
      code: "SERVICE_VALIDATION_FAILED",
      message: "baseCost is required",
      status: 400,
      field: "baseCost",
    })
  }
  if (!/^-?\d+(\.\d+)?$/.test(baseCostRaw)) {
    throw new ServiceExecutionError({
      code: "SERVICE_VALIDATION_FAILED",
      message: "baseCost must be a valid number",
      status: 400,
      field: "baseCost",
    })
  }

  const notesRaw = typeof body.notes === "string" ? body.notes.trim() : ""
  const notes = notesRaw === "" ? null : notesRaw

  return { name, unitId, baseCost: baseCostRaw, notes }
}

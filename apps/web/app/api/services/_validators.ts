import { ServiceExecutionError } from "@builders/application"
import type { ServiceInput } from "@builders/application"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
  if (!UUID_PATTERN.test(unitId)) {
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

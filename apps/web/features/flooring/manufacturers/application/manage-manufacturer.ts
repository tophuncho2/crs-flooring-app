import { createAppError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { getManufacturerById } from "../data/queries"
import {
  createManufacturerPrimaryRecord,
  deleteManufacturerRecordById,
  getManufacturerDeleteState,
  manufacturerCompanyNameExists,
  updateManufacturerPrimaryRecord,
} from "../data/server-records"
import {
  isManufacturerCompanyNameConflict,
  isManufacturerDeleteBlocked,
  normalizeManufacturerCompanyNameForUniqueness,
} from "../domain/manufacturer-rules"
import { validateManufacturerForm } from "../validators"
import type { ManufacturerForm, ManufacturerRow } from "../domain/types"

function parseManufacturerForm(body: Record<string, unknown>): ManufacturerForm {
  return {
    companyName: parseRequiredString(body.companyName, "companyName"),
    agentName: parseOptionalString(body.agentName ?? body.name) ?? "",
    website: parseOptionalString(body.website) ?? "",
    phone: parseOptionalString(body.phone) ?? "",
    email: parseOptionalString(body.email) ?? "",
  }
}

async function assertManufacturerNameAvailable(companyName: string, currentId?: string) {
  if (isManufacturerCompanyNameConflict(await manufacturerCompanyNameExists(companyName, currentId))) {
    throw createAppError("Company name must be unique", {
      status: 409,
      field: "companyName",
    })
  }
}

export function validateUpdateManufacturerPrimarySectionInput(body: Record<string, unknown>) {
  const input = parseManufacturerForm(body)
  const validationError = validateManufacturerForm(input)
  if (validationError) {
    throw createAppError(validationError, { field: "companyName" })
  }

  return input
}

export async function createManufacturerRecord(input: ManufacturerForm): Promise<ManufacturerRow> {
  await assertManufacturerNameAvailable(normalizeManufacturerCompanyNameForUniqueness(input.companyName))
  return createManufacturerPrimaryRecord(input)
}

export async function replaceManufacturerPrimarySection(id: string, input: ManufacturerForm): Promise<ManufacturerRow> {
  await assertManufacturerNameAvailable(normalizeManufacturerCompanyNameForUniqueness(input.companyName), id)
  await updateManufacturerPrimaryRecord(id, input)
  return getManufacturerById(id)
}

export async function deleteManufacturerRecord(id: string) {
  const manufacturer = await getManufacturerDeleteState(id)
  if (!manufacturer) {
    throw createAppError("Manufacturer not found", { status: 404 })
  }

  if (isManufacturerDeleteBlocked(manufacturer._count.products)) {
    throw createAppError("This manufacturer has linked products and cannot be deleted", { status: 409 })
  }

  await deleteManufacturerRecordById(id)
  return { ok: true } as const
}

import { prisma } from "@builders/db"
import { createAppError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { normalizeManufacturer } from "../services"
import { normalizeManufacturerCompanyName, validateManufacturerForm } from "../validators"
import type { ManufacturerForm, ManufacturerRow } from "../domain/types"

const manufacturerInclude = {
  _count: { select: { products: true } },
} as const

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
  const existing = await prisma.flooringManufacturer.findFirst({
    where: {
      companyName: {
        equals: companyName,
        mode: "insensitive",
      },
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
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
  await assertManufacturerNameAvailable(normalizeManufacturerCompanyName(input.companyName))

  const manufacturer = await prisma.flooringManufacturer.create({
    data: {
      companyName: input.companyName.trim(),
      agentName: input.agentName.trim() || null,
      website: input.website.trim() || null,
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
    },
    include: manufacturerInclude,
  })

  return normalizeManufacturer(manufacturer)
}

export async function replaceManufacturerPrimarySection(id: string, input: ManufacturerForm): Promise<ManufacturerRow> {
  await assertManufacturerNameAvailable(normalizeManufacturerCompanyName(input.companyName), id)

  const manufacturer = await prisma.flooringManufacturer.update({
    where: { id },
    data: {
      companyName: input.companyName.trim(),
      agentName: input.agentName.trim() || null,
      website: input.website.trim() || null,
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
    },
    include: manufacturerInclude,
  })

  return normalizeManufacturer(manufacturer)
}

export async function deleteManufacturerRecord(id: string) {
  const linkedProducts = await prisma.flooringProduct.count({
    where: { manufacturerId: id },
  })

  if (linkedProducts > 0) {
    throw createAppError("This manufacturer has linked products and cannot be deleted", { status: 409 })
  }

  await prisma.flooringManufacturer.delete({ where: { id } })
  return { ok: true } as const
}

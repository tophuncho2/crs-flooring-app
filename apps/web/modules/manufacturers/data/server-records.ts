import { prisma } from "@builders/db"
import { normalizeManufacturer } from "../services"
import type { ManufacturerForm } from "../domain/types"

export async function manufacturerCompanyNameExists(normalizedCompanyName: string, currentId?: string) {
  const existing = await prisma.flooringManufacturer.findFirst({
    where: {
      companyName: {
        equals: normalizedCompanyName,
        mode: "insensitive",
      },
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(existing)
}

export async function getManufacturerDeleteState(id: string) {
  return prisma.flooringManufacturer.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  })
}

export async function updateManufacturerPrimaryRecord(id: string, input: ManufacturerForm) {
  await prisma.flooringManufacturer.update({
    where: { id },
    data: {
      companyName: input.companyName.trim(),
      agentName: input.agentName.trim() || null,
      website: input.website.trim() || null,
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
    },
  })
}

export async function createManufacturerPrimaryRecord(input: ManufacturerForm) {
  const manufacturer = await prisma.flooringManufacturer.create({
    data: {
      companyName: input.companyName.trim(),
      agentName: input.agentName.trim() || null,
      website: input.website.trim() || null,
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
    },
    include: { _count: { select: { products: true } } },
  })

  return normalizeManufacturer(manufacturer)
}

export async function deleteManufacturerRecordById(id: string) {
  await prisma.flooringManufacturer.delete({
    where: { id },
  })
}

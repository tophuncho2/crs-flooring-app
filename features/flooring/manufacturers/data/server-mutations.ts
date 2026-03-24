import { prisma } from "@/server/db/prisma"
import { createAppError } from "@/server/http/api-helpers"
import { normalizeManufacturer } from "../services"

type ManufacturerInput = {
  companyName: string
  agentName: string | null
  website: string | null
  phone: string | null
  email: string | null
}

const manufacturerInclude = {
  _count: { select: { products: true } },
} as const

export async function createManufacturer(input: ManufacturerInput) {
  const manufacturer = await prisma.flooringManufacturer.create({
    data: input,
    include: manufacturerInclude,
  })

  return normalizeManufacturer(manufacturer)
}

export async function updateManufacturer(id: string, input: ManufacturerInput) {
  const manufacturer = await prisma.flooringManufacturer.update({
    where: { id },
    data: input,
    include: manufacturerInclude,
  })

  return normalizeManufacturer(manufacturer)
}

export async function deleteManufacturer(id: string) {
  const linkedProducts = await prisma.flooringProduct.count({
    where: { manufacturerId: id },
  })

  if (linkedProducts > 0) {
    throw createAppError("This manufacturer has linked products and cannot be deleted", { status: 409 })
  }

  await prisma.flooringManufacturer.delete({ where: { id } })
  return { ok: true } as const
}

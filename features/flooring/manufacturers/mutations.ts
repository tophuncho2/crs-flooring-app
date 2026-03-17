import { prisma } from "@/server/db/prisma"

type ManufacturerInput = {
  name: string
  companyName: string | null
  website: string | null
  phone: string | null
  email: string | null
}

export async function createManufacturer(input: ManufacturerInput) {
  return prisma.flooringManufacturer.create({
    data: input,
    include: { _count: { select: { products: true } } },
  })
}

export async function updateManufacturer(id: string, input: ManufacturerInput) {
  return prisma.flooringManufacturer.update({
    where: { id },
    data: input,
    include: { _count: { select: { products: true } } },
  })
}

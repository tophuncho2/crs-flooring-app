import { prisma } from "@builders/db"

type ServiceInput = {
  name: string
  unitId: string
  baseCost: string | number
  notes: string | null
}

const serviceInclude = {
  unit: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      templateItems: true,
      workOrderItems: true,
    },
  },
} as const

export async function createService(input: ServiceInput) {
  return prisma.flooringService.create({
    data: input,
    include: serviceInclude,
  })
}

export async function updateService(id: string, input: ServiceInput) {
  return prisma.flooringService.update({
    where: { id },
    data: input,
    include: serviceInclude,
  })
}

export async function deleteService(id: string) {
  await prisma.flooringService.delete({
    where: { id },
  })
}

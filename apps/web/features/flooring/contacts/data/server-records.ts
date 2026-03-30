import { prisma } from "@builders/db"
import { normalizeContactDetail } from "../domain/services"
import type { ContactDetail, ContactType } from "../domain/types"

export async function createContactRecord(input: {
  name: string
  type: ContactType
}): Promise<ContactDetail> {
  const contact = await prisma.flooringContact.create({
    data: {
      name: input.name.trim(),
      type: input.type,
    },
    include: {
      _count: {
        select: {
          templateSalesReps: true,
          workOrderSalesReps: true,
        },
      },
    },
  })

  return normalizeContactDetail(contact)
}

export async function updateContactRecord(
  id: string,
  input: {
    name: string
    type: ContactType
  },
): Promise<ContactDetail> {
  const contact = await prisma.flooringContact.update({
    where: { id },
    data: {
      name: input.name.trim(),
      type: input.type,
    },
    include: {
      _count: {
        select: {
          templateSalesReps: true,
          workOrderSalesReps: true,
        },
      },
    },
  })

  return normalizeContactDetail(contact)
}

export async function getContactDeleteState(id: string) {
  return prisma.flooringContact.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          templateSalesReps: true,
          workOrderSalesReps: true,
        },
      },
    },
  })
}

export async function deleteContactRecordById(id: string) {
  await prisma.flooringContact.delete({
    where: { id },
  })
}

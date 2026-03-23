import { prisma } from "@/server/db/prisma"
import { createAppError } from "@/server/http/api-helpers"
import { normalizeContactDetail } from "../domain/services"
import type { ContactDetail, ContactType } from "../domain/types"

export async function createContact(input: {
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
          workOrderSalesReps: true,
        },
      },
    },
  })

  return normalizeContactDetail(contact)
}

export async function updateContact(
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
          workOrderSalesReps: true,
        },
      },
    },
  })

  return normalizeContactDetail(contact)
}

export async function deleteContact(id: string) {
  const linkedAssignments = await prisma.flooringWorkOrderSalesRep.count({
    where: { contactId: id },
  })

  if (linkedAssignments > 0) {
    throw createAppError("This contact is linked to work orders and cannot be deleted", { status: 409 })
  }

  await prisma.flooringContact.delete({
    where: { id },
  })
}

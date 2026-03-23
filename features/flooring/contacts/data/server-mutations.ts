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
          templateSalesReps: true,
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
          templateSalesReps: true,
          workOrderSalesReps: true,
        },
      },
    },
  })

  return normalizeContactDetail(contact)
}

export async function deleteContact(id: string) {
  const [linkedTemplateAssignments, linkedWorkOrderAssignments] = await Promise.all([
    prisma.flooringTemplateSalesRep.count({
      where: { contactId: id },
    }),
    prisma.flooringWorkOrderSalesRep.count({
      where: { contactId: id },
    }),
  ])

  if (linkedTemplateAssignments > 0 || linkedWorkOrderAssignments > 0) {
    throw createAppError("This contact is linked to templates or work orders and cannot be deleted", { status: 409 })
  }

  await prisma.flooringContact.delete({
    where: { id },
  })
}

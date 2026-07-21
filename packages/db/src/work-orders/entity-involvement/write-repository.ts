import type { Prisma } from "../../generated/prisma/client.js"
import type { WorkOrderEntityInvolvementForm } from "@builders/domain"

// Wire-input shape for entity-involvement writes. The user-supplied form carries
// the optional entity link + the free-text involvement type.
export type WriteWorkOrderEntityInvolvementInput = WorkOrderEntityInvolvementForm

export type ApplyWorkOrderEntityInvolvementsDiffInput = {
  workOrderId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added rows,
  // updatedBy on modified rows. A separate guarded param, never user input.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteWorkOrderEntityInvolvementInput }>
  modified: Array<{ id: string; input: WriteWorkOrderEntityInvolvementInput }>
  deleted: Array<{ id: string }>
}

export type ApplyWorkOrderEntityInvolvementsDiffResult = {
  tempIdMap: Record<string, string>
}

export async function applyWorkOrderEntityInvolvementsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyWorkOrderEntityInvolvementsDiffInput,
): Promise<ApplyWorkOrderEntityInvolvementsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.flooringWorkOrderEntityInvolvement.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.flooringWorkOrderEntityInvolvement.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        workOrderId: input.workOrderId,
        // Optional entity link — scalar FK on the unchecked createMany input
        // (null = unlinked). The form always carries entityId, so no tri-state.
        entityId: draft.input.entityId,
        involvementType: draft.input.involvementType ? draft.input.involvementType : null,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    // Unchecked update input so the scalar entityId FK is assignable directly
    // (mirrors the payments write repo). The form always carries entityId.
    const data: Prisma.FlooringWorkOrderEntityInvolvementUncheckedUpdateInput = {
      entityId: update.input.entityId,
      involvementType: update.input.involvementType ? update.input.involvementType : null,
      updatedBy: input.actorEmail,
    }
    await tx.flooringWorkOrderEntityInvolvement.update({ where: { id: update.id }, data })
  }

  // The updated list is read on the pool by the use case after commit.
  return { tempIdMap }
}

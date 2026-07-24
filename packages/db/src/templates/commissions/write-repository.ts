import type { Prisma } from "../../generated/prisma/client.js"
import { normalizePercent, type TemplateCommissionForm } from "@builders/domain"

// Wire-input shape for commission writes. The user-supplied form carries the
// optional entity link (the sales rep), the manual percent, and free-text notes.
export type WriteTemplateCommissionInput = TemplateCommissionForm

// Rate write boundary: blank → NULL, else canonical scale-3 percent string before
// Prisma coerces it to Decimal(6,3). Mirrors the template taxRate `toRate` helper.
function toRate(value: string): string | null {
  return value.trim() ? normalizePercent(value) : null
}

// Free-text column: blank → NULL, else the value.
function toText(value: string): string | null {
  return value.trim() ? value : null
}

export type ApplyTemplateCommissionsDiffInput = {
  templateId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added rows,
  // updatedBy on modified rows. A separate guarded param, never user input.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteTemplateCommissionInput }>
  modified: Array<{ id: string; input: WriteTemplateCommissionInput }>
  deleted: Array<{ id: string }>
}

export type ApplyTemplateCommissionsDiffResult = {
  tempIdMap: Record<string, string>
}

export async function applyTemplateCommissionsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyTemplateCommissionsDiffInput,
): Promise<ApplyTemplateCommissionsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.templateCommission.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.templateCommission.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        templateId: input.templateId,
        // Optional entity link — scalar FK on the unchecked createMany input
        // (null = unlinked). The form always carries entityId, so no tri-state.
        entityId: draft.input.entityId,
        percent: toRate(draft.input.percent),
        notes: toText(draft.input.notes),
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    // Unchecked update input so the scalar entityId FK is assignable directly
    // (mirrors the planned-payments write repo). The form always carries entityId.
    const data: Prisma.TemplateCommissionUncheckedUpdateInput = {
      entityId: update.input.entityId,
      percent: toRate(update.input.percent),
      notes: toText(update.input.notes),
      updatedBy: input.actorEmail,
    }
    await tx.templateCommission.update({ where: { id: update.id }, data })
  }

  // The updated list is read on the pool by the use case after commit.
  return { tempIdMap }
}

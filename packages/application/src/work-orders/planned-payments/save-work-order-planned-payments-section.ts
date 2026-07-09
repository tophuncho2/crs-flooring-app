import { randomUUID } from "node:crypto"
import {
  applyWorkOrderPlannedPaymentsDiff,
  withDatabaseTransaction,
  Prisma,
} from "@builders/db"
import {
  assignDraftIds,
  validateWorkOrderPlannedPaymentForm,
} from "@builders/domain"
import { WorkOrderPlannedPaymentExecutionError } from "./errors.js"
import type {
  SaveWorkOrderPlannedPaymentsSectionUseCaseInput,
  SaveWorkOrderPlannedPaymentsSectionUseCaseResult,
} from "./types.js"

export async function saveWorkOrderPlannedPaymentsSectionUseCase(
  input: SaveWorkOrderPlannedPaymentsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveWorkOrderPlannedPaymentsSectionUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("saveWorkOrderPlannedPaymentsSectionUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    for (const draft of input.diff.added) {
      const validationError = validateWorkOrderPlannedPaymentForm(draft.form)
      if (validationError) {
        throw new WorkOrderPlannedPaymentExecutionError({
          code: "WORK_ORDER_PLANNED_PAYMENT_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "tempId", ref: draft.tempId },
        })
      }
    }

    for (const update of input.diff.modified) {
      const validationError = validateWorkOrderPlannedPaymentForm(update.form)
      if (validationError) {
        throw new WorkOrderPlannedPaymentExecutionError({
          code: "WORK_ORDER_PLANNED_PAYMENT_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "id", ref: update.id },
        })
      }
    }

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    try {
      return await applyWorkOrderPlannedPaymentsDiff(c, {
        workOrderId: input.workOrderId,
        actorEmail,
        added: addedWithIds.map((draft) => ({
          id: draft.id,
          tempId: draft.tempId,
          input: { ...draft.form },
        })),
        modified: input.diff.modified.map((update) => ({
          id: update.id,
          input: { ...update.form },
        })),
        deleted: input.diff.deleted.map((d) => ({ id: d.id })),
      })
    } catch (error) {
      // A linked entity id that points at no row trips the FK (P2003). Optional
      // link, no pre-guard — the FK is the backstop.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new WorkOrderPlannedPaymentExecutionError({
          code: "WORK_ORDER_PLANNED_PAYMENT_LINK_INVALID",
          message: "Linked entity could not be found.",
          status: 400,
          field: "entityId",
        })
      }
      throw error
    }
  })
}

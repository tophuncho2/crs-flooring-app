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
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { isP2003, p2003FieldName } from "../../shared/prisma-errors.js"
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
  assertActorEmail(actorEmail, "saveWorkOrderPlannedPaymentsSectionUseCase")

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
      // A linked id (entity or payment purpose) that points at no row trips the
      // FK (P2003). Optional links, no pre-guard — the FK is the backstop.
      // Attribute the failure to the right field via the P2003 field_name.
      if (isP2003(error)) {
        const isPurpose = p2003FieldName(error)?.includes("paymentpurpose") ?? false
        throw new WorkOrderPlannedPaymentExecutionError({
          code: "WORK_ORDER_PLANNED_PAYMENT_LINK_INVALID",
          message: isPurpose
            ? "Linked payment purpose could not be found."
            : "Linked entity could not be found.",
          status: 400,
          field: isPurpose ? "paymentPurposeId" : "entityId",
        })
      }
      throw error
    }
  })
}

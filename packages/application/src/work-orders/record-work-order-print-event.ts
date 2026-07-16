import {
  createWorkOrderPrintEventRecord,
  getWorkOrderDocumentTypeDetailById,
} from "@builders/db"
import { assertActorEmail } from "../shared/assert-actor-email.js"

export type RecordWorkOrderPrintEventUseCaseInput = {
  workOrderId: string
  // The doc type the user printed under. `documentTypeName` is the label shown in
  // the selector — recorded as the durable snapshot even if the doc type is later
  // deleted.
  documentTypeId: string
  documentTypeName: string
}

/**
 * Append one work-order print event. Best-effort telemetry-style write (the
 * client fires it right before `window.print()`): if the doc type was deleted
 * between page load and the Print click, the event is still recorded with a null
 * `documentTypeId` and the client-provided name snapshot — the count is never
 * lost and never blocks the print. When the doc type still exists, its current
 * name is used as the authoritative snapshot.
 */
export async function recordWorkOrderPrintEventUseCase(
  input: RecordWorkOrderPrintEventUseCaseInput,
  actorEmail: string,
): Promise<{ ok: true }> {
  assertActorEmail(actorEmail, "recordWorkOrderPrintEventUseCase")

  const documentType = await getWorkOrderDocumentTypeDetailById(input.documentTypeId, {
    withNeighbors: false,
  })

  await createWorkOrderPrintEventRecord({
    workOrderId: input.workOrderId,
    documentTypeId: documentType ? documentType.id : null,
    documentTypeName: documentType ? documentType.name : input.documentTypeName,
    createdBy: actorEmail,
  })

  return { ok: true }
}

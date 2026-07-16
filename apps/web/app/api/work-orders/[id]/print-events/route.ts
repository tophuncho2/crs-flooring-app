import { recordWorkOrderPrintEventUseCase } from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateRecordWorkOrderPrintEventInput } from "../../_validators"

// Append one print/export event for a work order, keyed by the doc type printed.
// Fired by the print configurator's Print button right before window.print(); a
// fresh idempotency key per click means every print counts. Append-only ⇒ no OCC.
export const POST = createMutationRoute({
  scope: "work-orders.printEvent.record",
  route: "/api/work-orders/[id]/print-events",
  rateLimit: CRUD_CREATE,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateRecordWorkOrderPrintEventInput,
  useCase: ({ input, access, params }) =>
    recordWorkOrderPrintEventUseCase(
      {
        workOrderId: params.id,
        documentTypeId: input.documentTypeId,
        documentTypeName: input.documentTypeName,
      },
      access.user.email,
    ),
  telemetry: ({ params }) => ({
    action: "work-orders.printEvent.record",
    message: "Work order print event recorded",
    entityType: "flooringWorkOrder",
    entityId: params.id,
  }),
  status: 201,
  buildResponseBody: () => ({ ok: true as const }),
})

import { requestWorkOrderFileUseCase } from "@builders/application"
import { listWorkOrderFiles } from "@builders/db"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: WORK_ORDERS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/work-orders/[id]/files",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const files = await listWorkOrderFiles(workOrderId)
    return routeJson(access, { files })
  } catch (error) {
    return routeError(access, error)
  }
}

/**
 * POST /api/work-orders/[id]/files
 *
 * Producer route for the file-generation flow. Calls
 * `requestWorkOrderFileUseCase`, which inserts a FlooringWorkOrderFile
 * row at status QUEUED, marks the WO row QUEUED, and writes a
 * `flooring.work-order.file-generation.requested` outbox event. The
 * worker renders the PDF, uploads it to the bucket, and marks the
 * file COMPLETED.
 *
 * Returns 202 Accepted; the actual PDF render runs asynchronously.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "work-orders.files.request",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/files",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const workOrderId = parseUuidParam(rawId, "id")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.files.request",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const requestedBy = { userId: access.user.id, userEmail: access.user.email }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work-order file generation requested",
        action: "work-orders.files.request",
        route: "/api/work-orders/[id]/files",
        entityType: "flooringWorkOrder",
        entityId: workOrderId,
      },
      () => requestWorkOrderFileUseCase({ workOrderId, requestedBy }),
    )

    const responseBody = { file: result }
    await finalizeMutationReceipt({
      scope: "work-orders.files.request",
      access,
      mutation,
      responseStatus: 202,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 202 })
  } catch (error) {
    return routeError(access, error)
  }
}

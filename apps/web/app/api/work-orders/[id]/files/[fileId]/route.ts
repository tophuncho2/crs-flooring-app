import { deleteWorkOrderFileUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { getStorageEnvironment } from "@/server/platform/env"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>
}

/**
 * DELETE /api/work-orders/[id]/files/[fileId]
 *
 * Synchronous file delete. Calls `deleteWorkOrderFileUseCase`, which
 * reads the file row, asserts WO linkage, deletes the bucket object
 * (when fileKey is non-null) via `deleteBucketObject`, and removes the
 * row in a TX.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.files.delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/files/[fileId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, fileId: rawFileId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const fileId = parseUuidParam(rawFileId, "fileId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.files.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const storageEnv = getStorageEnvironment()

    await withMutationTelemetry(
      access,
      {
        message: "Work-order file deleted",
        action: "work-orders.files.delete",
        route: "/api/work-orders/[id]/files/[fileId]",
        entityType: "flooringWorkOrderFile",
        entityId: fileId,
      },
      () => deleteWorkOrderFileUseCase({ workOrderId, fileId, storageEnv }),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "work-orders.files.delete",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}

import { getWorkOrderFileById } from "@builders/db"
import { createBucketObjectPresignedUrl } from "@builders/lib"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { parseUuidParam } from "@/server/http/api-helpers"
import { getStorageEnvironment } from "@/server/platform/env"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>
}

/**
 * GET /api/work-orders/[id]/files/[fileId]/download
 *
 * Returns a short-lived presigned URL for downloading the rendered
 * PDF. The browser then fetches the bucket object directly. The URL
 * expires after 5 minutes (storage lib default).
 *
 * Asserts WO linkage + COMPLETED status before issuing the URL — files
 * still in QUEUED / WORKING / FAILED state have no `fileKey` to sign.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: WORK_ORDERS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/work-orders/[id]/files/[fileId]/download",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, fileId: rawFileId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const fileId = parseUuidParam(rawFileId, "fileId")

    const file = await getWorkOrderFileById(fileId)
    if (file.workOrderId !== workOrderId) {
      return routeJson(
        access,
        { error: "File does not belong to this work order" },
        { status: 404 },
      )
    }
    if (file.status !== "COMPLETED" || file.fileKey === null) {
      return routeJson(
        access,
        { error: `File is not ready for download (status: ${file.status})` },
        { status: 409 },
      )
    }

    const storageEnv = getStorageEnvironment()
    const url = await createBucketObjectPresignedUrl(storageEnv, file.fileKey)
    return routeJson(access, { url })
  } catch (error) {
    return routeError(access, error)
  }
}

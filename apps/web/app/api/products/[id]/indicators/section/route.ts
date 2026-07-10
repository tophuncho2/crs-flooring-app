import { saveIndicatorsSectionUseCase } from "@builders/application"
import { getProductById } from "@builders/db"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateIndicatorsSectionDiffInput } from "@/app/api/inventory-indicators/_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/products/[id]/indicators/section
 *
 * Atomic diff-save of the product record-view's Inventory Indicators section —
 * the sibling of the WO material-items section route. OCC is checked against the
 * parent product's `updatedAt`; the use case applies every edit + delete in one
 * transaction and returns the product's fresh indicator rows.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "products.indicators.section.replace",
      route: "/api/products/[id]/indicators/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const productId = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(
      body,
      validateIndicatorsSectionDiffInput,
      { requireExpectedUpdatedAt: true },
    )

    // OCC against the parent product's token. A missing product yields an empty
    // actual, which can't match the client's token → surfaces as a conflict.
    const product = await getProductById(productId)
    assertExpectedUpdatedAt({
      actualUpdatedAt: product?.updatedAt ?? "",
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { product },
      message: "Product changed before the indicators save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "products.indicators.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Inventory indicators section replaced",
        action: "products.indicators.section.replace",
        route: "/api/products/[id]/indicators/section",
        entityType: "flooringProduct",
        entityId: productId,
      },
      () => saveIndicatorsSectionUseCase({ productId, diff }, access.user.email),
    )

    const responseBody = { indicators: result.rows }
    await finalizeMutationReceipt({
      scope: "products.indicators.section.replace",
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

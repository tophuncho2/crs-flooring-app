import { getProductById } from "@/features/flooring/products/data/queries"
import { deleteProduct, updateProduct } from "@/features/flooring/products/mutations"
import { validateUpdateProductInput } from "@/features/flooring/products/validators"
import { requireRouteAccess, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "products" })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    return routeJson(access, { product: await getProductById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "products" })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const product = await updateProduct(id, validateUpdateProductInput(body))
    return routeJson(access, { product })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "products" })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    await deleteProduct(id)
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}

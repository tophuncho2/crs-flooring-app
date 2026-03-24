import { routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

export async function PATCH(request: Request) {
  const access = await applyRoutePolicy(request, { capability: "hotkeys.manage" })
  if (access instanceof Response) return access

  return routeJson(
    access,
    { error: "Hotkeys are managed in code and cannot be edited from the app." },
    { status: 405 },
  )
}

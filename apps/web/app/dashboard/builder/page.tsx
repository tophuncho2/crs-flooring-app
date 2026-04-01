import { redirect } from "next/navigation"
import { canAccessBuilderPanel } from "@/server/auth/access-control"
import { requireSessionUser } from "@/server/auth/session"
import BuilderUsersPanel from "@/modules/builder/components/users-panel"

export default async function BuilderPage() {
  const user = await requireSessionUser()

  if (!canAccessBuilderPanel(user.email, user.role)) {
    redirect("/dashboard/inventory")
  }

  return <BuilderUsersPanel />
}

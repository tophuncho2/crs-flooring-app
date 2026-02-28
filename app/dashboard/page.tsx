import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import UserMenu from "./user-menu"
import { redirect } from "next/navigation"
import ToolsMenu from "./tools-menu"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

if (!session) {
  redirect("/login")
}

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative">

      {/* Top Right Controls */}
<div className="absolute top-6 right-6 flex items-center gap-4">
  {(session.user.role === "BUILDER" ||
    session.user.role === "ADMIN") && (
    <ToolsMenu role={session.user.role} />
  )}

  <UserMenu
    email={session.user.email ?? ""}
    role={session.user.role}
  />
</div>

      {/* Page Content */}
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>
      </div>

    </div>
  )
}

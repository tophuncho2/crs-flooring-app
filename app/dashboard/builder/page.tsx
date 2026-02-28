import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function BuilderPage() {
  const session = await getServerSession(authOptions)

  // Not logged in
  if (!session) {
    redirect("/login")
  }

  // Logged in but not builder
  if (session.user.role !== "BUILDER") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold text-blue-400">
        Builder Control Panel
      </h1>

      <p className="mt-4">
        Welcome, {session.user.email}
      </p>
    </div>
  )
}
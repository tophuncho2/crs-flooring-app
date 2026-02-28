import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function ProductsPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/login")

  if (session.user.role !== "BUILDER" && session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold text-blue-400">
        Product Management
      </h1>
    </div>
  )
}
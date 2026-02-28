import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import LogoutButton from "./logout-button"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white space-y-4">
      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      <p className="text-blue-400">
        Logged in as: {session!.user?.email}
      </p>

      <LogoutButton />
    </div>
  )
}
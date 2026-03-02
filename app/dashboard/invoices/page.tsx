import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import InvoicesClient from "./invoices-client"

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "BUILDER" && user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return <InvoicesClient />
}

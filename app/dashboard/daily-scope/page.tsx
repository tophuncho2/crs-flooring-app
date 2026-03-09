import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DailyScopeClient from "./daily-scope-client"
import { isToolUnlocked } from "@/lib/tool-subscriptions"

type JobOption = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
}

export default async function DailyScopePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "daily-scope" }))) {
    redirect("/dashboard")
  }

  const jobs = await prisma.job.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      propertyName: true,
      contactName: true,
      contactNumber: true,
    },
  })

  const jobOptions: JobOption[] = jobs.map((job) => ({
    id: job.id,
    name: job.name,
    address: job.address,
    propertyName: job.propertyName,
    contactName: job.contactName,
    contactNumber: job.contactNumber,
  }))

  return <DailyScopeClient jobs={jobOptions} />
}

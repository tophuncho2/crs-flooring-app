import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import JobsClient from "./jobs-client"
import { getUserToolContext, isToolUnlocked } from "@/lib/tool-subscriptions"

type JobDto = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string
  assignedUserIds: string[]
  pendingExpenses: string
  createdAt: string
}

type UserOption = {
  id: string
  email: string
}

type ModuleButton = {
  slug: string
  name: string
  path: string
  isUnlocked: boolean
}

export default async function JobsPage() {
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

  const toolContext = await getUserToolContext({
    userId: user.id,
    role: user.role,
  })

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "jobs" }))) {
    redirect("/dashboard")
  }

  const [jobs, users] = await Promise.all([
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        propertyName: true,
        contactName: true,
        contactNumber: true,
        budget: true,
        createdAt: true,
        assignees: {
          select: {
            userId: true,
          },
        },
        pendingLaborPayments: {
          where: { status: "PENDING" },
          select: {
            price: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true },
    }),
  ])

  const initialJobs: JobDto[] = jobs.map((job) => ({
    id: job.id,
    name: job.name,
    address: job.address,
    propertyName: job.propertyName,
    contactName: job.contactName,
    contactNumber: job.contactNumber,
    budget: job.budget.toString(),
    assignedUserIds: job.assignees.map((assignee) => assignee.userId),
    pendingExpenses: job.pendingLaborPayments.reduce((sum, payment) => sum + Number(payment.price), 0).toFixed(2),
    createdAt: job.createdAt.toISOString(),
  }))

  const userOptions: UserOption[] = users.map((candidate) => ({
    id: candidate.id,
    email: candidate.email,
  }))

  const moduleButtons: ModuleButton[] = toolContext.tools.map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    path: tool.path,
    isUnlocked: tool.isUnlocked,
  }))

  return (
    <JobsClient
      initialJobs={initialJobs}
      users={userOptions}
      canUseTools={toolContext.canUseTools}
      moduleButtons={moduleButtons}
    />
  )
}

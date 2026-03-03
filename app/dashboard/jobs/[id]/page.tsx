import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import JobDetailClient from "./job-detail-client"

type RouteContext = {
  params: Promise<{ id: string }>
}

type UserOption = {
  id: string
  email: string
}

type VendorOption = {
  id: string
  companyName: string
}

type PendingPaymentRow = {
  id: string
  jobId: string
  vendorId: string
  price: string
  notes: string
  status: "PENDING" | "PAID"
  createdAt: string
  updatedAt: string
  vendorName: string
}

type ExpenseRow = {
  id: string
  jobId: string
  vendorId: string | null
  price: string
  notes: string
  expenseType: "LABOR" | "MATERIAL"
  createdAt: string
  updatedAt: string
  vendorName: string
}

type JobDetail = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string
  assignedUserIds: string[]
  pendingExpenses: string
}

export default async function JobDetailPage({ params }: RouteContext) {
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

  const { id } = await params

  const [job, vendors, users] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        propertyName: true,
        contactName: true,
        contactNumber: true,
        budget: true,
        assignees: {
          select: {
            userId: true,
          },
        },
        pendingLaborPayments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            jobId: true,
            vendorId: true,
            price: true,
            notes: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            vendor: {
              select: {
                companyName: true,
              },
            },
          },
        },
        expenses: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            jobId: true,
            vendorId: true,
            price: true,
            notes: true,
            expenseType: true,
            createdAt: true,
            updatedAt: true,
            vendor: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    }),
    prisma.vendor.findMany({
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true },
    }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true },
    }),
  ])

  if (!job) {
    notFound()
  }

  const pendingExpenses = job.pendingLaborPayments
    .filter((payment) => payment.status === "PENDING")
    .reduce((sum, payment) => sum + Number(payment.price), 0)
    .toFixed(2)

  const jobDetail: JobDetail = {
    id: job.id,
    name: job.name,
    address: job.address,
    propertyName: job.propertyName,
    contactName: job.contactName,
    contactNumber: job.contactNumber,
    budget: job.budget.toString(),
    assignedUserIds: job.assignees.map((assignee) => assignee.userId),
    pendingExpenses,
  }

  const pendingPayments: PendingPaymentRow[] = job.pendingLaborPayments.map((payment) => ({
    id: payment.id,
    jobId: payment.jobId,
    vendorId: payment.vendorId,
    price: payment.price.toString(),
    notes: payment.notes ?? "",
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    vendorName: payment.vendor.companyName,
  }))

  const expenses: ExpenseRow[] = job.expenses.map((expense) => ({
    id: expense.id,
    jobId: expense.jobId,
    vendorId: expense.vendorId,
    price: expense.price.toString(),
    notes: expense.notes ?? "",
    expenseType: expense.expenseType,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    vendorName: expense.vendor?.companyName ?? "",
  }))

  const vendorOptions: VendorOption[] = vendors.map((vendor) => ({
    id: vendor.id,
    companyName: vendor.companyName,
  }))

  const userOptions: UserOption[] = users.map((candidate) => ({
    id: candidate.id,
    email: candidate.email,
  }))

  return (
    <JobDetailClient
      job={jobDetail}
      users={userOptions}
      vendors={vendorOptions}
      initialPendingPayments={pendingPayments}
      initialExpenses={expenses}
    />
  )
}

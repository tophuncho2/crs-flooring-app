import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import ImportsClient from "./imports-client"

type ImportRow = {
  id: string
  importName: string
  importType: string
  status: string
  source: string
  notes: string
  createdAt: string
  updatedAt: string
}

export default async function FlooringImportsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "warehouse" }))) redirect("/dashboard")

  const entries = await prisma.flooringImportEntry.findMany({
    orderBy: [{ createdAt: "desc" }, { importName: "asc" }],
  })

  const initialImports: ImportRow[] = entries.map((entry) => ({
    id: entry.id,
    importName: entry.importName,
    importType: entry.importType,
    status: entry.status,
    source: entry.source ?? "",
    notes: entry.notes ?? "",
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }))

  return <ImportsClient initialImports={initialImports} />
}

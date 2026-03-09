import { readFile } from "node:fs/promises"
import path from "node:path"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SubcontractorAgreementsClient from "./subcontractor-agreements-client"
import { isToolUnlocked } from "@/lib/tool-subscriptions"

export default async function SubcontractorAgreementsPage() {
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

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "subcontractor-agreements" }))) {
    redirect("/dashboard")
  }

  const templatePath = path.join(process.cwd(), "lib", "templates", "subcontractor-agreement-template.html")
  const templateHtml = await readFile(templatePath, "utf8")

  return <SubcontractorAgreementsClient templateHtml={templateHtml} />
}

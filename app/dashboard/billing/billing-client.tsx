"use client"

import { useState } from "react"
import type { UserToolContext, ToolSlug } from "@/lib/tool-subscriptions"
import { toolCentsToDisplay } from "@/lib/tool-subscriptions"

type BillingClientProps = {
  initialContext: UserToolContext
}

type ApiResponse = {
  tools: BillingClientProps["initialContext"]["tools"]
  monthlyCostCents: number
}

type ErrorRow = { message?: string; error?: string }

export default function BillingClient({ initialContext }: BillingClientProps) {
  const [tools, setTools] = useState(initialContext.tools)
  const [monthlyCostCents, setMonthlyCostCents] = useState(initialContext.monthlyCostCents)
  const [message, setMessage] = useState("")
  const [isSaving, setIsSaving] = useState<string | null>(null)

  async function toggleTool(slug: ToolSlug, nextValue: boolean) {
    setIsSaving(slug)
    setMessage("")

    try {
      const response = await fetch("/api/account/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, isUnlocked: nextValue }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !(payload as ApiResponse).tools) {
        const error = payload as ErrorRow
        setMessage(error.error ?? error.message ?? "Unable to update tool access")
        return
      }

      const nextTools = (payload as ApiResponse).tools
      const nextCost = (payload as ApiResponse).monthlyCostCents

      setTools(nextTools)
      setMonthlyCostCents(nextCost)
      setMessage("Tool access updated")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update tool access")
    } finally {
      setIsSaving(null)
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-4xl">
      <h1 className="text-3xl font-bold">Billing &amp; Tool Access</h1>
      <p className="mt-2 text-sm text-[var(--foreground)]/75">Enable only the tools you need.</p>

      <section className="mt-6 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
        <p className="text-sm text-[var(--foreground)]/85">
          Monthly add-on total: <span className="font-semibold">{toolCentsToDisplay(monthlyCostCents)}</span>
        </p>
      </section>

      {message ? <p className="mt-3 text-sm text-[var(--foreground)]/85">{message}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <article
            key={tool.slug}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{tool.name}</h2>
                <p className="text-sm text-[var(--foreground)]/75">{tool.description}</p>
                <p className="mt-2 text-sm text-[var(--foreground)]/80">
                  Price: {toolCentsToDisplay(tool.monthlyPriceCents)}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tool.isUnlocked}
                  disabled={!tool.isActive || isSaving === tool.slug}
                  onChange={(event) => void toggleTool(tool.slug, event.target.checked)}
                />
                {tool.isUnlocked ? "On" : "Off"}
              </label>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

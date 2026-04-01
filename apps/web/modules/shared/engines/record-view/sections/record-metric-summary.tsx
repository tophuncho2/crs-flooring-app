"use client"

import { type ReactNode } from "react"

function getGridClass(metricCount: number, isHeader: boolean) {
  const base = isHeader
    ? "grid gap-3"
    : "grid gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] p-4"

  if (metricCount <= 1) return base
  if (metricCount === 2) return `${base} sm:grid-cols-2`
  return `${base} sm:grid-cols-3`
}

export function RecordMetricSummary({
  metrics,
  variant = "panel",
}: {
  metrics: Array<{ label: string; value: ReactNode }>
  variant?: "panel" | "header"
}) {
  const isHeader = variant === "header"

  return (
    <div className={getGridClass(metrics.length, isHeader)}>
      {metrics.map((metric) => (
        <div key={metric.label}>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">{metric.label}</p>
          <div className={`mt-1 font-semibold ${isHeader ? "text-base" : "text-lg"}`}>{metric.value}</div>
        </div>
      ))}
    </div>
  )
}

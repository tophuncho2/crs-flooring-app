import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordSummaryCard({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        "rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-4 py-3",
        className,
      )}
    >
      <p className="text-xs text-[var(--foreground)]/60">{label}</p>
      <div className="mt-1 font-medium">{children}</div>
    </div>
  )
}

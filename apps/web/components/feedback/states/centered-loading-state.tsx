"use client"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function CenteredLoadingState({
  label = "Loading...",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={joinClasses("flex min-h-[240px] items-center justify-center px-4 py-10", className)}>
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-4 text-sm text-[var(--foreground)]/75 shadow-sm">
        {label}
      </div>
    </div>
  )
}

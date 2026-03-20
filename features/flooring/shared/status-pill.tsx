"use client"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function StatusPill({
  label,
  toneClassName,
  className,
}: {
  label: string
  toneClassName: string
  className?: string
}) {
  return (
    <span
      className={joinClasses(
        "inline-flex min-w-[108px] items-center justify-center rounded-full border px-2 py-1 text-xs font-medium",
        toneClassName,
        className,
      )}
    >
      {label}
    </span>
  )
}

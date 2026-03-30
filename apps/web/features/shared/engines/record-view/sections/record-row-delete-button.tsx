import type { ButtonHTMLAttributes, ReactNode } from "react"
import { joinRecordSectionClasses } from "./record-section-tokens"

export function RecordRowDeleteButton({
  children = "Remove",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      {...props}
      className={joinRecordSectionClasses(
        "inline-flex min-h-[2.5rem] items-center justify-center whitespace-nowrap rounded-md border border-rose-500/30 px-2.5 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  )
}

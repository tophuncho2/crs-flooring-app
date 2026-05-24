import { type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export type TableBleedVariant = "dashboard" | "record" | "scoped"

function tableBleedClassName(variant: TableBleedVariant) {
  switch (variant) {
    case "dashboard":
      return "-mx-4 sm:-mx-5"
    case "record":
      return "-mx-5"
    case "scoped":
      return "-mx-4"
    default:
      return ""
  }
}

export function TableBleed({
  children,
  variant,
  className,
}: {
  children: ReactNode
  variant: TableBleedVariant
  className?: string
}) {
  return <div className={joinClasses("w-auto", tableBleedClassName(variant), className)}>{children}</div>
}

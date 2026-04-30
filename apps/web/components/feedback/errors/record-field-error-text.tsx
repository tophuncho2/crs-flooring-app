import type { ReactNode } from "react"

export function RecordFieldErrorText({ children }: { children: ReactNode }) {
  return <p className="text-xs text-rose-700">{children}</p>
}

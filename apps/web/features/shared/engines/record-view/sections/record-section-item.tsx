import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "./record-section-tokens"

export function RecordSectionItem({
  children,
  status,
  actions,
  nestedContent,
  className,
  bodyClassName,
  nestedContentClassName,
}: {
  children: ReactNode
  status?: ReactNode
  actions?: ReactNode
  nestedContent?: ReactNode
  className?: string
  bodyClassName?: string
  nestedContentClassName?: string
}) {
  return (
    <section
      className={joinRecordSectionClasses(
        "w-full overflow-hidden rounded-2xl border shadow-[0_8px_18px_rgba(0,0,0,0.08)]",
        RECORD_SECTION_BORDER_CLASS_NAME,
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      {(status || actions) ? (
        <div
          className={joinRecordSectionClasses(
            "flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-start lg:justify-between",
            RECORD_SECTION_BORDER_CLASS_NAME,
            RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
          )}
        >
          {status ? <div className="flex flex-wrap items-center gap-2">{status}</div> : <div />}
          {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <div className={joinRecordSectionClasses("min-w-full", bodyClassName)}>{children}</div>
      </div>
      {nestedContent ? (
        <div className={joinRecordSectionClasses("border-t", RECORD_SECTION_BORDER_CLASS_NAME, nestedContentClassName)}>
          {nestedContent}
        </div>
      ) : null}
    </section>
  )
}
